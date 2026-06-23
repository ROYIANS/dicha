import type { UserDto } from '@dicha/shared';

export type AccountProfileForm = {
  displayName: string;
  homeName: string;
  city: string;
  gender: string;
  bio: string;
};

type SeedUser = Pick<UserDto, 'email'> &
  Partial<Pick<UserDto, 'displayName' | 'name' | 'homeName'>>;

export function accountFormFromUser(
  user: Partial<UserDto> & Pick<UserDto, 'email'>,
): AccountProfileForm {
  return {
    displayName: user.displayName ?? user.name ?? '',
    homeName: user.homeName ?? '',
    city: user.city ?? '',
    gender: user.gender ?? '',
    bio: user.bio ?? '',
  };
}

export function makeGeneratedAvatarSeeds(user: SeedUser): string[] {
  const primary = user.email.trim();
  const seeds = [
    primary,
    user.displayName?.trim(),
    user.homeName?.trim(),
    `${primary}:beam`,
    `${primary}:bauhaus`,
    `${primary}:ring`,
  ].filter((seed): seed is string => Boolean(seed));

  return Array.from(new Set(seeds));
}

export function suggestPasskeyName(
  user: Partial<Pick<UserDto, 'displayName' | 'name' | 'email'>>,
  date = new Date(),
): string {
  const owner = user.displayName?.trim() || user.name?.trim() || user.email?.split('@')[0] || '我的设备';
  const day = date.toISOString().slice(0, 10);
  return `${owner} 的 Passkey · ${day}`;
}

export function generatedAvatarMarker(seed: string): string {
  return `boring:beam:${encodeURIComponent(seed)}`;
}

export function parseGeneratedAvatarMarker(image: string | null | undefined): string | null {
  if (!image?.startsWith('boring:beam:')) return null;

  try {
    return decodeURIComponent(image.slice('boring:beam:'.length));
  } catch {
    return null;
  }
}
