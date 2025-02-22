import { beforeAll, afterAll } from '@jest/globals';
import { db } from '../db';
import { cleanupTestData } from './utils/test-helpers';

// Increase timeout for database operations
jest.setTimeout(30000);

beforeAll(async () => {
  try {
    await cleanupTestData();
  } catch (error) {
    console.error('Error in test setup:', error);
    throw error;
  }
});

afterAll(async () => {
  try {
    await cleanupTestData();
    await db.$client.end();
  } catch (error) {
    console.error('Error in test teardown:', error);
    throw error;
  }
});