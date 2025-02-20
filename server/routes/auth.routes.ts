
import { Router } from "express";
import { storage } from "../storage";
import { insertUserSchema } from "@shared/schema";
import { requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/async";
import { logError, logInfo } from "../services/logger";

const router = Router();

router.post("/register", asyncHandler(async (req, res, next) => {
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

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

export default router;
