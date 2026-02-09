// lib/gemini-api.ts

import { GoogleGenerativeAI, type GenerateContentRequest, type GenerateContentResult } from "@google/generative-ai";

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2000; // 2 second base delay

/**
 * Detects if an error is a 429 (RESOURCE_EXHAUSTED / quota exceeded) error.
 * Handles multiple error formats from the Gemini API.
 */
function isRateLimitError(error: Error | unknown): boolean {
  if (!error) return false;

  const errorStr = String(error);
  const errorObj = error as unknown as Record<string, unknown>;
  const message = (errorObj?.message as string | undefined)?.toLowerCase?.() || "";
  const status = errorObj?.status as number | undefined;

  return (
    message.includes("429") ||
    message.includes("503") ||
    message.includes("resource_exhausted") ||
    message.includes("quota") ||
    message.includes("overloaded") ||
    message.includes("service_unavailable") ||
    errorStr.includes("429") ||
    errorStr.includes("503") ||
    status === 429 ||
    status === 503 ||
    errorObj?.code === 8 || // RESOURCE_EXHAUSTED gRPC code
    (errorObj?.['google-rpc-error'] as Record<string, unknown> | undefined)?.code === 8
  );
}

/**
 * Calculates exponential backoff delay with jitter.
 * Returns: 1s, 2s, 4s, 8s with ±0-30% random jitter.
 */
function getBackoffDelay(attemptNumber: number): number {
  const exponentialDelay = BASE_DELAY_MS * Math.pow(2, attemptNumber);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
  return exponentialDelay + jitter;
}

/**
 * A robust wrapper around the Gemini API's generateContent method that implements
 * exponential backoff and retry logic for handling 429 (RESOURCE_EXHAUSTED) errors.
 * 
 * Behavior:
 * - Retry delays: ~1s → ~2s → ~4s → ~8s (exponential backoff with jitter)
 * - Non-429 errors are thrown immediately (no retry)
 * - After max retries exceeded, throws a user-friendly error
 * - Does not block event loop (uses async/await)
 *
 * @param ai The GoogleGenerativeAI instance
 * @param modelName The name of the model to use (e.g., "gemini-3-flash-preview")
 * @param request The request object for the generateContent method
 * @returns A promise that resolves with the GenerateContentResult
 * @throws {Error} If request fails after max retries or on non-retryable errors
 */
export async function generateContentWithRetry(
  ai: GoogleGenerativeAI,
  modelName: string,
  request: Omit<GenerateContentRequest, "model">
): Promise<GenerateContentResult> {
  for (let attemptNumber = 0; attemptNumber < MAX_RETRIES; attemptNumber++) {
    try {
      const model = ai.getGenerativeModel({ model: modelName });
      const response = await model.generateContent(request);
      
      // Success on first try
      if (attemptNumber === 0) {
        console.log("[Gemini API] ✓ Request successful on first attempt");
      } else {
        console.log(`[Gemini API] ✓ Request successful after ${attemptNumber} retry attempt(s)`);
      }
      
      return response;
    } catch (error: Error | unknown) {
      // Check if this is a rate limit error
      if (isRateLimitError(error)) {
        const delayMs = getBackoffDelay(attemptNumber);
        const delaySecs = (delayMs / 1000).toFixed(1);

        console.warn(
          `[Gemini API] ⚠ Rate limit exceeded (429). ` +
          `Attempt ${attemptNumber + 1}/${MAX_RETRIES}. ` +
          `Retrying in ${delaySecs}s...`
        );

        // Only wait if we have more retries left
        if (attemptNumber < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } else {
        // Non-429 errors should fail immediately
        const errorObj = error as unknown as Record<string, unknown>;
        console.error(`[Gemini API] ✗ Non-retryable error (${errorObj?.status || "unknown"}):`, errorObj?.message);
        throw error;
      }
    }
  }

  // All retries exhausted
  console.error(
    `[Gemini API] ✗ Max retries (${MAX_RETRIES}) exceeded. ` +
    `The API service is overloaded or quota has been exceeded.`
  );

  throw new Error(
    "The AI service is currently overloaded. Please try again in a few moments."
  );
}
