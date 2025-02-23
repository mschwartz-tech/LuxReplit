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
import { rateLimit } from "express-rate-limit";

const router = Router();
const scryptAsync = promisify(scrypt);

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { message: "Too many login attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Enhanced password validation schema
const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

// Enhanced registration schema
const registrationSchema = insertUserSchema.extend({
  password: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

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

const validateRequest = (schema: z.ZodSchema) => asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    await schema.parseAsync(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Validation error",
        details: fromZodError(error).message
      });
    }
    next(error);
  }
});

router.post("/register", 
  validateRequest(registrationSchema), 
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { confirmPassword, ...userData } = req.body;

    const existingUser = await storage.getUserByUsername(userData.username);
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const existingEmail = await storage.getUserByEmail(userData.email);
    if (existingEmail) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await hashPassword(userData.password);
    const user = await storage.createUser({
      ...userData,
      password: hashedPassword
    });

    logInfo("New user registered", { username: user.username, role: user.role });

    req.login(user, (err: Error) => {
      if (err) return next(err);
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    });
}));

router.post("/login", 
  authLimiter,
  validateRequest(z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required")
  })),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await storage.getUserByUsername(req.body.username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      const passwordValid = await comparePasswords(req.body.password, user.password);
      if (!passwordValid) {
        logInfo("Failed login attempt", { username: req.body.username });
        return res.status(401).json({ message: "Invalid username or password" });
      }

      req.login(user, (err: Error) => {
        if (err) return next(err);
        const { password, ...userWithoutPassword } = user;

        // Set session expiry
        if (req.session) {
          req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours
        }

        logInfo("User logged in successfully", { username: user.username, role: user.role });
        res.status(200).json(userWithoutPassword);
      });
    } catch (error) {
      logError("Login error", { error });
      next(error);
    }
}));

router.post("/logout", asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(400).json({ message: "Not logged in" });
  }

  const username = (req.user as User).username;

  req.logout((err: Error) => {
    if (err) return next(err);
    req.session?.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('connect.sid');
      logInfo("User logged out", { username });
      res.sendStatus(200);
    });
  });
}));

router.get("/user", asyncHandler(async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as User;
  const { password, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
}));

// Password reset request
router.post("/forgot-password", 
  authLimiter,
  validateRequest(z.object({
    email: z.string().email("Invalid email address")
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const user = await storage.getUserByEmail(req.body.email);

    // Don't reveal if email exists or not
    res.json({ message: "If an account exists with that email, you will receive password reset instructions." });

    if (user) {
      // TODO: Implement actual password reset email sending
      logInfo("Password reset requested", { email: req.body.email });
    }
}));

export default router;