import { logInfo, logError } from './logger';

type InitPhase = 'database' | 'routes' | 'vite';
type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

interface PhaseConfig {
  retries: number;
  timeout: number;
  critical: boolean;
}

const DEFAULT_PHASE_CONFIG: PhaseConfig = {
  retries: 3,
  timeout: 30000, // 30 seconds
  critical: true
};

const PHASE_CONFIGS: Record<InitPhase, PhaseConfig> = {
  database: { 
    ...DEFAULT_PHASE_CONFIG,
    timeout: 45000 // 45 seconds for database
  },
  routes: { 
    ...DEFAULT_PHASE_CONFIG,
    retries: 2 // Fewer retries for routes as they should work immediately
  },
  vite: { 
    retries: 2,
    timeout: 60000, // 60 seconds
    critical: false // Vite is non-critical
  }
};

class StartupManager {
  private phaseStatuses: Map<InitPhase, PhaseStatus> = new Map();
  private initPromises: Map<InitPhase, Promise<void>> = new Map();
  private cleanupHandlers: Map<InitPhase, (() => Promise<void>)[]> = new Map();

  constructor() {
    Object.keys(PHASE_CONFIGS).forEach(phase => {
      this.phaseStatuses.set(phase as InitPhase, 'pending');
      this.cleanupHandlers.set(phase as InitPhase, []);
    });
  }

  async initPhase(phase: InitPhase, initFn: () => Promise<void>): Promise<void> {
    const config = PHASE_CONFIGS[phase];
    let attempt = 0;

    while (attempt < config.retries) {
      try {
        this.phaseStatuses.set(phase, 'in_progress');
        logInfo(`Starting ${phase} initialization`, { 
          attempt: attempt + 1,
          maxRetries: config.retries,
          timeout: config.timeout,
          critical: config.critical
        });

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`${phase} initialization timed out after ${config.timeout}ms`)), config.timeout);
        });

        await Promise.race([initFn(), timeoutPromise]);

        this.phaseStatuses.set(phase, 'completed');
        logInfo(`${phase} initialization completed successfully`, {
          attempt: attempt + 1,
          duration: Date.now() - performance.now()
        });
        return;
      } catch (error) {
        attempt++;
        logError(`${phase} initialization attempt ${attempt} failed`, {
          error: error instanceof Error ? error.message : String(error),
          attempt,
          remainingAttempts: config.retries - attempt,
          stack: error instanceof Error ? error.stack : undefined
        });

        // Run cleanup handlers if any are registered
        if (this.cleanupHandlers.get(phase)?.length) {
          try {
            await Promise.all(this.cleanupHandlers.get(phase)!.map(handler => handler()));
          } catch (cleanupError) {
            logError(`Error during ${phase} cleanup`, {
              error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
            });
          }
        }

        if (attempt === config.retries) {
          this.phaseStatuses.set(phase, 'failed');
          if (config.critical) {
            throw new Error(`Critical phase ${phase} failed to initialize after ${config.retries} attempts`);
          } else {
            logError(`Non-critical phase ${phase} failed to initialize, continuing startup`);
            return;
          }
        }

        // Exponential backoff with jitter
        const backoffTime = Math.min(1000 * Math.pow(2, attempt) * (0.9 + Math.random() * 0.2), 10000);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
  }

  registerCleanup(phase: InitPhase, cleanup: () => Promise<void>) {
    const handlers = this.cleanupHandlers.get(phase) || [];
    handlers.push(cleanup);
    this.cleanupHandlers.set(phase, handlers);
  }

  getPhaseStatus(phase: InitPhase): PhaseStatus {
    return this.phaseStatuses.get(phase) || 'pending';
  }

  isPhaseComplete(phase: InitPhase): boolean {
    return this.getPhaseStatus(phase) === 'completed';
  }

  async waitForPhase(phase: InitPhase): Promise<void> {
    return this.initPromises.get(phase) || Promise.resolve();
  }

  getStartupSummary() {
    return {
      phases: Object.fromEntries(this.phaseStatuses.entries()),
      completedPhases: Array.from(this.phaseStatuses.entries())
        .filter(([_, status]) => status === 'completed')
        .map(([phase]) => phase),
      failedPhases: Array.from(this.phaseStatuses.entries())
        .filter(([_, status]) => status === 'failed')
        .map(([phase]) => phase)
    };
  }
}

export const startupManager = new StartupManager();