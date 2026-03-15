/**
 * Pusher Circuit Breaker
 *
 * Implements circuit breaker pattern for graceful degradation when Pusher fails.
 * Prevents cascading failures by temporarily disabling Pusher after repeated errors.
 *
 * States:
 *   - CLOSED: Normal operation, all requests pass through
 *   - OPEN: Circuit tripped, all requests fail fast (no Pusher calls)
 *   - HALF_OPEN: Testing if service recovered, single test request allowed
 *
 * Thresholds:
 *   - FAILURE_THRESHOLD: 5 consecutive failures → open circuit
 *   - TIMEOUT_MS: 60000 (1 minute) → time before entering half-open state
 *
 * Algorithm:
 *   1. Track consecutive failures
 *   2. After 5 failures, open circuit for 1 minute
 *   3. After timeout, enter half-open state
 *   4. Test with single request in half-open
 *   5. Success → close circuit, reset counter
 *   6. Failure → reopen circuit for another minute
 *
 * Usage:
 *   const result = await executePusherWithCircuitBreaker(async () => {
 *     await pusher.trigger(channel, event, data);
 *   });
 *   if (!result.success) {
 *     console.error('Pusher failed:', result.error);
 *   }
 */

// ─── Constants ─────────────────────────────────────────────────────────────────

const FAILURE_THRESHOLD = 5; // Open circuit after 5 consecutive failures
const TIMEOUT_MS = 60_000; // 1 minute before testing recovery

// ─── Circuit State ─────────────────────────────────────────────────────────────

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: CircuitState;
}

// Global circuit state (in-memory, per-process)
let circuitState: CircuitBreakerState = {
  failures: 0,
  lastFailure: 0,
  state: 'closed',
};

// ─── Circuit Breaker Result ────────────────────────────────────────────────────

export interface CircuitBreakerResult {
  success: boolean;
  error?: string;
}

// ─── Helper Functions ──────────────────────────────────────────────────────────

function shouldAttemptRequest(): boolean {
  const now = Date.now();

  switch (circuitState.state) {
    case 'closed':
      return true; // Normal operation

    case 'open':
      // Check if timeout has elapsed
      if (now - circuitState.lastFailure >= TIMEOUT_MS) {
        console.log('[CircuitBreaker] Timeout elapsed, entering half-open state');
        circuitState.state = 'half-open';
        return true; // Allow test request
      }
      return false; // Circuit still open

    case 'half-open':
      return true; // Allow test request

    default:
      return true;
  }
}

function recordSuccess(): void {
  if (circuitState.state === 'half-open') {
    console.log('[CircuitBreaker] Test request succeeded, closing circuit');
  }

  circuitState.failures = 0;
  circuitState.state = 'closed';
}

function recordFailure(): void {
  circuitState.failures++;
  circuitState.lastFailure = Date.now();

  if (circuitState.failures >= FAILURE_THRESHOLD) {
    console.error(
      `[CircuitBreaker] Failure threshold reached (${circuitState.failures}/${FAILURE_THRESHOLD}), opening circuit`
    );
    circuitState.state = 'open';
  } else if (circuitState.state === 'half-open') {
    console.warn('[CircuitBreaker] Test request failed, reopening circuit');
    circuitState.state = 'open';
  } else {
    console.warn(
      `[CircuitBreaker] Failure recorded (${circuitState.failures}/${FAILURE_THRESHOLD})`
    );
  }
}

// ─── Core Circuit Breaker Function ─────────────────────────────────────────────

/**
 * Execute a Pusher operation with circuit breaker protection.
 * Wraps Pusher trigger calls to provide graceful degradation.
 *
 * @param operation - Async function that performs the Pusher operation
 * @returns Result indicating success or failure with error message
 */
export async function executePusherWithCircuitBreaker(
  operation: () => Promise<void>
): Promise<CircuitBreakerResult> {
  // Check if circuit allows request
  if (!shouldAttemptRequest()) {
    const timeRemaining = Math.ceil((TIMEOUT_MS - (Date.now() - circuitState.lastFailure)) / 1000);
    return {
      success: false,
      error: `Circuit breaker is open. Retry in ${timeRemaining}s`,
    };
  }

  try {
    // Execute the Pusher operation
    await operation();

    // Record success
    recordSuccess();

    return { success: true };
  } catch (err) {
    // Record failure
    recordFailure();

    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[CircuitBreaker] Pusher operation failed:', errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ─── Circuit State Inspection (for monitoring) ─────────────────────────────────

/**
 * Get current circuit breaker state for monitoring/debugging.
 *
 * @returns Current circuit state
 */
export function getCircuitState(): CircuitBreakerState {
  return { ...circuitState };
}

/**
 * Reset circuit breaker state (for testing or manual recovery).
 */
export function resetCircuitBreaker(): void {
  console.log('[CircuitBreaker] Manual reset');
  circuitState = {
    failures: 0,
    lastFailure: 0,
    state: 'closed',
  };
}
