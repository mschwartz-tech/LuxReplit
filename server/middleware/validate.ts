import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { logError } from "../services/logger";

export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        logError("Request validation failed", {
          path: req.path,
          errors: validationError.details
        });
        return res.status(400).json({
          message: "Validation Error",
          details: validationError.details
        });
      }
      logError("Unexpected validation error", { error });
      return res.status(400).json({ message: "Invalid input" });
    }
  };
};