import { Router } from "express";
import { storage } from "../storage";
import { insertUserSchema } from "@shared/schema";
import { requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/async";
import { logError, logInfo } from "../services/logger";
import type { Express, Request, Response, NextFunction } from "express";
import { ZodError, ZodSchema } from "zod";

const router = Router();

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ZodError) {
    logError("Validation error", { error: err });
    return res.status(400).json({ message: "Validation error", errors: err.issues });
  }
  logError("Internal server error", { error: err });
  return res.status(500).json({ message: "Internal server error" });
};

const validateRequest = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    next(error);
  }
};


router.post("/register", validateRequest(insertUserSchema), asyncHandler(async (req, res, next) => {
  const existingUser = await storage.getUserByUsername(req.body.username);
  if (existingUser) {
    return res.status(400).json({ message: "Username already exists" });
  }

  const user = await storage.createUser(req.body);
  logInfo("New user created", { userId: user.id });

  req.login(user, (err) => {
    if (err) return next(err);
    const { password, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  });
}));

router.post("/login", (req, res, next) => {
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ message: info?.message || "Invalid credentials" });
    }
    req.login(user, (err) => {
      if (err) return next(err);
      const { password, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    });
  })(req, res, next);
});

router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('session');
      res.sendStatus(200);
    });
  });
});

router.get("/user", (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  const { password, ...userWithoutPassword } = req.user;
  res.json(userWithoutPassword);
});

router.use(errorHandler);

export default router;