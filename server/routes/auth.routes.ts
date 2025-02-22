import { Router } from "express";
import { storage } from "../storage";
import { users, type User, insertUserSchema } from "@shared/schema";
import { requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/async";
import { logError, logInfo } from "../services/logger";
import passport from "passport";
import type { Express, Request, Response, NextFunction } from "express";
import { ZodError, z } from "zod";
import { fromZodError } from "zod-validation-error";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const router = Router();
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

const validateRequest = (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Validation error",
        details: fromZodError(error).toString()
      });
    }
    next(error);
  }
};

router.post("/register", validateRequest(insertUserSchema), asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const existingUser = await storage.getUserByUsername(req.body.username);
  if (existingUser) {
    return res.status(400).json({ message: "Username already exists" });
  }

  const hashedPassword = await hashPassword(req.body.password);
  const user = await storage.createUser({
    ...req.body,
    password: hashedPassword
  });

  logInfo("New user registered", { username: user.username });

  req.login(user, (err: Error) => {
    if (err) return next(err);
    const { password, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  });
}));

router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  try {
    const user = await storage.getUserByUsername(req.body.username);
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const passwordValid = await comparePasswords(req.body.password, user.password);
    if (!passwordValid) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    req.login(user, (err: Error) => {
      if (err) return next(err);
      const { password, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    });
  } catch (error) {
    logError("Login error", { error });
    next(error);
  }
});

router.post("/logout", (req: Request, res: Response, next: NextFunction) => {
  req.logout((err: Error) => {
    if (err) return next(err);
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('connect.sid');
      res.sendStatus(200);
    });
  });
});

router.get("/user", (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  const user = req.user as User;
  const { password, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

export default router;