import { AsyncLocalStorage } from "node:async_hooks";

// Server-only: one id per incoming request, returned as X-Request-Id and written into
// security_events so a user-reported problem can be traced through the logs.
const store = new AsyncLocalStorage<{ requestId: string }>();

export function requestIdFor(request: Request) {
  const given = request.headers.get("x-request-id") ?? "";
  return /^[A-Za-z0-9._:-]{8,100}$/.test(given) ? given : (request.headers.get("x-vercel-id") ?? crypto.randomUUID());
}

export function withRequestId<T>(requestId: string, run: () => T): T {
  return store.run({ requestId }, run);
}

export function currentRequestId(): string | null {
  return store.getStore()?.requestId ?? null;
}
