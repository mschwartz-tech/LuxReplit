import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { logError } from "../services/logger";
import { ValidationError } from "./error";

export interface RouteValidation {
  params?: z.ZodSchema;
  query?: z.ZodSchema;
  body?: z.ZodSchema;
}

export const validateRoute = (validation: RouteValidation) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate URL parameters
      if (validation.params) {
        const parsed = validation.params.safeParse(req.params);
        if (!parsed.success) {
          throw new ValidationError(parsed.error.errors);
        }
        req.params = parsed.data;
      }

      // Validate query parameters
      if (validation.query) {
        const parsed = validation.query.safeParse(req.query);
        if (!parsed.success) {
          throw new ValidationError(parsed.error.errors);
        }
        req.query = parsed.data;
      }

      // Validate request body
      if (validation.body) {
        const parsed = validation.body.safeParse(req.body);
        if (!parsed.success) {
          throw new ValidationError(parsed.error.errors);
        }
        req.body = parsed.data;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Type-safe parameter extractor
export const extractParams = <T>(schema: z.ZodSchema<T>, params: any): T => {
  const result = schema.safeParse(params);
  if (!result.success) {
    throw new ValidationError(result.error.errors);
  }
  return result.data;
};

// Middleware factory for common validations
export const commonValidations = {
  requireId: (paramName: string = 'id') => {
    return validateRoute({
      params: z.object({
        [paramName]: z.string().regex(/^\d+$/).transform(Number)
      })
    });
  },

  requireQueryString: (paramName: string) => {
    return validateRoute({
      query: z.object({
        [paramName]: z.string().min(1)
      })
    });
  },

  requirePagination: () => {
    return validateRoute({
      query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
        limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10')
      })
    });
  }
};