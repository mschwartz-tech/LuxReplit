/// <reference types="jest" />
import { beforeAll, afterAll, jest } from '@jest/globals';
import { db } from '../db';
import { users, classTemplates, classes, classWaitlist, members, gymMembershipPricing } from '../../shared/schema';

// Increase timeout for database operations
jest.setTimeout(30000);

beforeAll(async () => {
  try {
    // Clear test data in correct order (child tables first)
    await db.delete(classWaitlist);
    await db.delete(classes);
    await db.delete(classTemplates);
    await db.delete(members);
    await db.delete(users);
    await db.delete(gymMembershipPricing);
  } catch (error) {
    console.error('Error cleaning up test data:', error);
    throw error;
  }
});

afterAll(async () => {
  try {
    // Clean up test data
    await db.delete(classWaitlist);
    await db.delete(classes);
    await db.delete(classTemplates);
    await db.delete(members);
    await db.delete(users);
    await db.delete(gymMembershipPricing);

    // Close database connection pool
    await db.$client.end();
  } catch (error) {
    console.error('Error cleaning up test data:', error);
    throw error;
  }
});