
import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { fromZodError } from "zod-validation-error";

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
      if (error instanceof Error) {
        const validationError = fromZodError(error);
        return res.status(400).json({
          message: "Validation Error",
          details: validationError.details
        });
      }
      return res.status(400).json({ message: "Invalid input" });
    }
  };
};
