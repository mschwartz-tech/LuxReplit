import { createLogger, format, transports } from 'winston';
import { logError, logInfo } from './logger';

// Create a specialized logger for meal plan operations
const mealPlanLogger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'logs/meal-plans-error.log', level: 'error' }),
    new transports.File({ filename: 'logs/meal-plans.log' })
  ]
});

export const logMealPlanError = (message: string, error: any, context?: Record<string, any>) => {
  // Log to both general and meal plan specific logs
  logError(message, { error, context });
  mealPlanLogger.error(message, {
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
    ...context
  });
};

export const logMealPlanInfo = (message: string, context?: Record<string, any>) => {
  // Log to both general and meal plan specific logs
  logInfo(message, context);
  mealPlanLogger.info(message, context);
};

export const logMealPlanValidation = (planId: number, validationErrors: any) => {
  mealPlanLogger.warn('Meal plan validation failed', {
    planId,
    validationErrors,
    timestamp: new Date().toISOString()
  });
};

export const logMealPlanGeneration = (trainerId: number, parameters: any, success: boolean, details?: any) => {
  mealPlanLogger.info('AI Meal Plan Generation', {
    trainerId,
    parameters,
    success,
    details,
    timestamp: new Date().toISOString()
  });
};

export const logMealPlanAssignment = (planId: number, memberId: number, success: boolean, details?: any) => {
  mealPlanLogger.info('Meal Plan Assignment', {
    planId,
    memberId,
    success,
    details,
    timestamp: new Date().toISOString()
  });
};
