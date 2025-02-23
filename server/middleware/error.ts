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
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || undefined,
    code: undefined as string | undefined
  };

  // Handle different error types
  if (err instanceof ZodError) {
    const validationError = fromZodError(err);
    errorResponse.status = 400;
    errorResponse.message = "Validation Error";
    errorResponse.details = validationError.details;
    errorResponse.code = 'VALIDATION_ERROR';
  } else if (err instanceof ValidationError) {
    errorResponse.status = 400;
    errorResponse.details = err.details;
    errorResponse.code = 'VALIDATION_ERROR';
  } else if (err instanceof AuthorizationError) {
    errorResponse.status = 403;
    errorResponse.code = 'AUTHORIZATION_ERROR';
  } else if (err instanceof NotFoundError) {
    errorResponse.status = 404;
    errorResponse.code = 'NOT_FOUND';
  } else if (err instanceof ConflictError) {
    errorResponse.status = 409;
    errorResponse.code = 'CONFLICT';
  } else if (err instanceof BusinessLogicError) {
    errorResponse.status = 422;
    errorResponse.code = 'BUSINESS_LOGIC_ERROR';
  }

  // Enhanced error logging
  logError(err.message || "Internal Server Error", {
    path: req.path,
    method: req.method,
    userId: (req.user as any)?.id,
    statusCode: errorResponse.status,
    errorCode: errorResponse.code,
    details: errorResponse.details,
    requestId: errorResponse.requestId,
    stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
    headers: req.headers,
    query: req.query,
    body: req.body
  });

  // Only include error details in development
  if (process.env.NODE_ENV === "production") {
    delete errorResponse.details;
    if (errorResponse.status === 500) {
      errorResponse.message = "Internal Server Error";
    }
  }

  res.status(errorResponse.status).json(errorResponse);
};