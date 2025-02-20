
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

// Configure pool with proper settings for Neon
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  maxUses: 7500,
});

// Add error handling for the pool
pool.on('error', (err, client) => {
  logError('Unexpected error on idle client', { error: err });
});

// Initialize database connection
export async function initializeDatabase() {
  try {
    const client = await pool.connect();
    try {
      logInfo('Testing database connection...');
      await client.query('SELECT NOW()');
      logInfo('Database connection successful');
    } finally {
      client.release();
    }
  } catch (error) {
    logError('Failed to initialize database', { error });
    throw error;
  }
}

export const db = drizzle(pool, { schema });
