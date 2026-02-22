/**
 * Polling-based wait utility for VS Code extension tests.
 * Replaces fixed setTimeout delays with condition-based waiting.
 */
export async function waitFor(
    predicate: () => boolean,
    timeoutMs = 5000,
    intervalMs = 50
): Promise<void> {
    const start = Date.now();
    while (!predicate()) {
        if (Date.now() - start > timeoutMs) {
            throw new Error(`waitFor timed out after ${timeoutMs}ms`);
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
}
