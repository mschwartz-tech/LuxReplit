
import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { logError } from "../services/logger";

export class ValidationError extends Error {
  constructor(public details: any[]) {
    super('Validation Error');
    this.name = 'ValidationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const errorResponse = {
    message: err.message || "Internal Server Error",
    status: err.status || err.statusCode || 500,
    details: undefined as any,
    path: req.path,
    timestamp: new Date().toISOString()
  };

  // Handle different error types
  if (err instanceof ZodError) {
    const validationError = fromZodError(err);
    errorResponse.status = 400;
    errorResponse.message = "Validation Error";
    errorResponse.details = validationError.details;
  } else if (err instanceof ValidationError) {
    errorResponse.status = 400;
    errorResponse.details = err.details;
  } else if (err instanceof AuthorizationError) {
    errorResponse.status = 403;
  } else if (err instanceof NotFoundError) {
    errorResponse.status = 404;
  }

  // Log the error
  logError(err.message || "Internal Server Error", {
    path: req.path,
    method: req.method,
    userId: (req.user as any)?.id,
    statusCode: errorResponse.status,
    details: errorResponse.details,
    stack: process.env.NODE_ENV !== "production" ? err.stack : undefined
  });

  res.status(errorResponse.status).json(errorResponse);
};
