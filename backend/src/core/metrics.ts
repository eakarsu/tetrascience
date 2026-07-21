const startedAt = Date.now(); let requests = 0; let errors = 0; let totalDurationMs = 0;
export const metrics = {
  observe(durationMs: number, status: number) { requests += 1; totalDurationMs += durationMs; if (status >= 500) errors += 1; },
  snapshot() { return { uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000), requests, errors, averageDurationMs: requests ? Math.round(totalDurationMs / requests) : 0 }; },
};
