import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { sql } from 'drizzle-orm';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = (await scryptAsync(password, salt, 32)) as Buffer;
  return `${derivedKey.toString('hex')}.${salt.toString('hex')}`;
}

async function createTestUsers() {
  // First, clear existing test users
  await db.delete(users).where(sql`username LIKE ${'%_test'}`);

  // Create admin user
  const adminPassword = await hashPassword("password123");
  await db.insert(users).values({
    username: "admin_test",
    password: adminPassword,
    role: "admin",
    email: "admin@test.com",
    name: "Admin Test"
  });
  console.log("Admin user created successfully");

  // Create trainer user
  const trainerPassword = await hashPassword("password123");
  await db.insert(users).values({
    username: "trainer_test",
    password: trainerPassword,
    role: "trainer",
    email: "trainer@test.com",
    name: "Trainer Test"
  });
  console.log("Trainer user created successfully");

  // Create member user
  const memberPassword = await hashPassword("password123");
  await db.insert(users).values({
    username: "member_test",
    password: memberPassword,
    role: "user",
    email: "member@test.com",
    name: "Member Test"
  });
  console.log("Member user created successfully");
}

createTestUsers().catch(console.error);