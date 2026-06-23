const COMMON_EMAIL_DOMAINS = [
  'qq.com',
  '163.com',
  '126.com',
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'foxmail.com',
  'yahoo.com',
  'yeah.net',
] as const;

export function suggestEmailCompletions(input: string, limit = 5): string[] {
  const value = input.trim();
  const atIndex = value.indexOf('@');
  if (!value || atIndex === 0 || value.indexOf('@', atIndex + 1) !== -1) return [];

  const localPart = atIndex === -1 ? value : value.slice(0, atIndex);
  const domainPrefix = atIndex === -1 ? '' : value.slice(atIndex + 1).toLowerCase();

  return COMMON_EMAIL_DOMAINS
    .filter((domain) => domain.startsWith(domainPrefix))
    .filter((domain) => domain !== domainPrefix)
    .slice(0, limit)
    .map((domain) => `${localPart}@${domain}`);
}
