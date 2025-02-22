import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "../server/db";
import { users } from "../shared/schema";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createTestUsers() {
  try {
    // Hash the password for all test users
    const hashedPassword = await hashPassword("password123");

    // Create admin test user
    const [adminUser] = await db.insert(users).values({
      username: "admin_test",
      password: hashedPassword,
      role: "admin",
      email: "admin_test@test.com",
      name: "Admin Test",
      createdAt: new Date()
    }).returning();
    console.log("Created admin user:", adminUser.username);

    // Create trainer test user
    const [trainerUser] = await db.insert(users).values({
      username: "trainer_test",
      password: hashedPassword,
      role: "trainer",
      email: "trainer_test@test.com",
      name: "Trainer Test",
      createdAt: new Date()
    }).returning();
    console.log("Created trainer user:", trainerUser.username);

    // Create member test user
    const [memberUser] = await db.insert(users).values({
      username: "member_test",
      password: hashedPassword,
      role: "user",
      email: "member_test@test.com",
      name: "Member Test",
      createdAt: new Date()
    }).returning();
    console.log("Created member user:", memberUser.username);

    console.log("All test users created successfully!");
  } catch (error) {
    console.error("Error creating test users:", error);
    throw error;
  }
}

// Run the script
createTestUsers().catch(console.error);
