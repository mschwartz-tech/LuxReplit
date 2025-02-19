import { createLogger, format, transports } from "winston";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

// Ensure logs directory exists
const logsDir = join(process.cwd(), "logs");
if (!existsSync(logsDir)) {
  mkdirSync(logsDir);
}

// Custom format for console output
const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "";
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Custom format for file output (without colors)
const fileFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.json()
);

// Create logger instance
const logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: fileFormat,
  transports: [
    // Write all logs to separate files
    new transports.File({ 
      filename: join(logsDir, "error.log"), 
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new transports.File({ 
      filename: join(logsDir, "combined.log"),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== "production") {
  logger.add(new transports.Console({
    format: consoleFormat,
  }));
}

// Utility functions for different log levels
export const logError = (error: Error | string, meta: object = {}) => {
  const errorObj = error instanceof Error ? {
    message: error.message,
    stack: error.stack,
    ...meta,
  } : { message: error, ...meta };
  
  logger.error(errorObj.message, errorObj);
};

export const logInfo = (message: string, meta: object = {}) => {
  logger.info(message, meta);
};

export const logWarning = (message: string, meta: object = {}) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta: object = {}) => {
  logger.debug(message, meta);
};

export default logger;
