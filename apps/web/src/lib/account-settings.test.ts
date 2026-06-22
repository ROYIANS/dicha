import { describe, expect, test } from 'vitest';
import {
  accountFormFromUser,
  makeGeneratedAvatarSeeds,
  suggestPasskeyName,
} from './account-settings';

describe('account settings helpers', () => {
  test('initializes editable account fields from the auth user', () => {
    const form = accountFormFromUser({
      id: 'user-1',
      email: 'royians@example.com',
      emailVerified: false,
      name: 'Roy',
      image: null,
      displayName: 'Royians',
      homeName: '温暖小窝',
      city: '成都',
      gender: '不限定',
      personalityArchetype: '整理型',
      coins: 88,
    });

    expect(form).toEqual({
      displayName: 'Royians',
      homeName: '温暖小窝',
      city: '成都',
      gender: '不限定',
      personalityArchetype: '整理型',
    });
  });

  test('falls back to user name for display name and keeps empty optional fields controlled', () => {
    const form = accountFormFromUser({
      id: 'user-2',
      email: 'life@example.com',
      emailVerified: true,
      name: 'Life',
      image: null,
      coins: 0,
    });

    expect(form).toEqual({
      displayName: 'Life',
      homeName: '',
      city: '',
      gender: '',
      personalityArchetype: '',
    });
  });

  test('creates stable generated avatar seeds from user identity fields', () => {
    const seeds = makeGeneratedAvatarSeeds({
      email: 'royians@example.com',
      displayName: 'Royians',
      homeName: '温暖小窝',
    });

    expect(seeds).toEqual([
      'royians@example.com',
      'Royians',
      '温暖小窝',
      'royians@example.com:beam',
      'royians@example.com:bauhaus',
      'royians@example.com:ring',
    ]);
  });

  test('suggests a readable passkey name with the current date', () => {
    const name = suggestPasskeyName(
      { displayName: 'Royians', email: 'royians@example.com' },
      new Date('2026-06-22T10:30:00+08:00'),
    );

    expect(name).toBe('Royians 的 Passkey · 2026-06-22');
  });
});
