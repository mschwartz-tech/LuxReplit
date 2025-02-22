import { beforeAll, afterAll } from '@jest/globals';
import { db } from '../db';
import { users, classTemplates, classes, classWaitlist, members } from '../../shared/schema';

beforeAll(async () => {
  // Clear test data in correct order (child tables first)
  await db.delete(classWaitlist);
  await db.delete(classes);
  await db.delete(classTemplates);
  await db.delete(members);  // Delete members before users
  await db.delete(users);
});

afterAll(async () => {
  // Clean up in correct order
  await db.delete(classWaitlist);
  await db.delete(classes);
  await db.delete(classTemplates);
  await db.delete(members);  // Delete members before users
  await db.delete(users);
});