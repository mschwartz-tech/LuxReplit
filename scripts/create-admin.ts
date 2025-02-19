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

async function createAdmin() {
  const hashedPassword = await hashPassword("admin123");
  await db.insert(users).values({
    username: "admin",
    password: hashedPassword,
    role: "admin",
    email: "admin@example.com",
    name: "Admin User"
  });
  console.log("Admin user created successfully");
}

createAdmin().catch(console.error);
