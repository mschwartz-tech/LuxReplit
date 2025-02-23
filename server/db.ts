import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { logError, logInfo } from './services/logger';

// Configure WebSocket for Neon's serverless driver
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Configure pool with proper settings for Neon serverless
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Reduced from 20 to prevent connection exhaustion
  idleTimeoutMillis: 0, // Disable idle timeout for serverless
  connectionTimeoutMillis: 5000, // Reduced timeout for faster failures
  maxUses: 5000, // Reduced from 7500 to prevent connection issues
  keepAlive: true, // Enable keepalive
  ssl: {
    rejectUnauthorized: true, // Ensure SSL verification
  }
});

// Add error handling for the pool
pool.on('error', (err, client) => {
  logError('Unexpected error on idle client', { error: err });
  // Don't exit process, attempt to recover
  if (client) {
    client.release(true); // Release with error
  }
});

// Initialize database connection with retry mechanism
export async function initializeDatabase(retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      try {
        logInfo('Testing database connection...');
        await client.query('SELECT NOW()');
        logInfo('Database connection successful');
        return;
      } finally {
        client.release();
      }
    } catch (error) {
      logError('Database connection attempt failed', { 
        error, 
        attempt: i + 1, 
        remainingAttempts: retries - i - 1 
      });
      if (i === retries - 1) {
        throw error;
      }
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, i), 10000)));
    }
  }
}

// Create db instance without waiting for initialization
export const db = drizzle(pool, { schema });

// Export function to ensure database is initialized
export async function ensureDatabaseInitialized() {
  await initializeDatabase();
}