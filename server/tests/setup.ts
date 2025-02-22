import { db } from '../db';
import { users, classTemplates, classes, classWaitlist } from '../../shared/schema';
import '@jest/globals';

beforeAll(async () => {
  // Clear test data before each test suite
  await db.delete(classWaitlist);
  await db.delete(classes);
  await db.delete(classTemplates);
  await db.delete(users);
});

afterAll(async () => {
  // Clean up after all tests
  await db.delete(classWaitlist);
  await db.delete(classes);
  await db.delete(classTemplates);
  await db.delete(users);
});