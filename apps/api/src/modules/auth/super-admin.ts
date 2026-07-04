export function parseSuperAdminEmails(value: string | undefined): Set<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map((item) => normalizeEmail(item))
      .filter(Boolean),
  );
}

export function isSuperAdminEmail(
  email: string,
  configuredEmails: Set<string>,
): boolean {
  return configuredEmails.has(normalizeEmail(email));
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
