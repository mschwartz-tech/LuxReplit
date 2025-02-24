import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { logError } from "../services/logger";

// Custom error types
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

export class ConflictError extends Error {
  constructor(message: string = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class BusinessLogicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessLogicError';
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Log the error with full details
  logError(err.message || "Internal Server Error", {
    path: req.path,
    method: req.method,
    userId: (req.user as any)?.id,
    stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
    headers: req.headers,
    query: req.query,
    body: req.body
  });

  // Always set JSON content type for API routes
  if (req.path.startsWith('/api')) {
    res.setHeader('Content-Type', 'application/json');
  }

  // Prepare the error response
  const errorResponse = {
    message: err.message || "Internal Server Error",
    status: 500,
    path: req.path,
    timestamp: new Date().toISOString(),
  };

  // Handle different error types
  if (err instanceof ZodError) {
    const validationError = fromZodError(err);
    errorResponse.status = 400;
    errorResponse.message = validationError.message;
  } else if (err instanceof ValidationError) {
    errorResponse.status = 400;
  } else if (err instanceof AuthorizationError) {
    errorResponse.status = 403;
  } else if (err instanceof NotFoundError) {
    errorResponse.status = 404;
  } else if (err instanceof ConflictError) {
    errorResponse.status = 409;
  } else if (err instanceof BusinessLogicError) {
    errorResponse.status = 422;
  }

  // Hide internal error details in production
  if (process.env.NODE_ENV === "production" && errorResponse.status === 500) {
    errorResponse.message = "Internal Server Error";
  }

  // Always return JSON for API routes
  res.status(errorResponse.status).json(errorResponse);
};