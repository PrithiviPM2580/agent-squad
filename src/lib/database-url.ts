const legacySslModes = new Set(["prefer", "require", "verify-ca"]);

export function normalizeDatabaseUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  const sslmode = url.searchParams.get("sslmode");

  if (sslmode && legacySslModes.has(sslmode.toLowerCase())) {
    url.searchParams.set("sslmode", "verify-full");
  }

  return url.toString();
}
