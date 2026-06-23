import { describe, expect, test } from 'vitest';
import { suggestEmailCompletions } from './email-suggestions';

describe('email suggestions', () => {
  test('suggests common domains after typing the local part', () => {
    expect(suggestEmailCompletions('roy')).toEqual([
      'roy@qq.com',
      'roy@163.com',
      'roy@126.com',
      'roy@gmail.com',
      'roy@outlook.com',
    ]);
  });

  test('filters suggestions by typed domain prefix', () => {
    expect(suggestEmailCompletions('roy@g')).toEqual(['roy@gmail.com']);
    expect(suggestEmailCompletions('roy@out')).toEqual(['roy@outlook.com']);
    expect(suggestEmailCompletions('roy@qq.co')).toEqual(['roy@qq.com']);
  });

  test('does not suggest without a local part or when the current value is already exact', () => {
    expect(suggestEmailCompletions('@')).toEqual([]);
    expect(suggestEmailCompletions('roy@qq.com')).toEqual([]);
  });
});
