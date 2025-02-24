import { Request, Response, NextFunction } from "express";
import { logError } from "../services/logger";

// Export isAuthenticated middleware
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  next();
};

// Role-based authentication middleware
export const requireRole = (roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !roles.includes((req.user as any)?.role)) {
    logError("Unauthorized access attempt", {
      userId: (req.user as any)?.id,
      role: (req.user as any)?.role,
      requiredRoles: roles
    });
    return res.status(403).json({ error: 'Forbidden. Insufficient permissions.' });
  }
  next();
};