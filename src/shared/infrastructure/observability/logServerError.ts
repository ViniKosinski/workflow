export function logServerError(event: string, error: unknown) {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  console.error(JSON.stringify({ level: "error", event, errorName, occurredAt: new Date().toISOString() }));
}
