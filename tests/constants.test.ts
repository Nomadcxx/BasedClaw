import { describe, it, expect } from 'vitest';
import {
  WIT_TIERS,
  DEFAULT_TIER_MODELS,
  TIER_DISPATCH,
  WIT_PATTERNS,
  EXPLICIT_OVERRIDES,
} from '../src/constants';

describe('constants', () => {
  it('should have exactly 3 wit tiers', () => {
    expect(WIT_TIERS).toHaveLength(3);
    expect(WIT_TIERS).toEqual(['sub-wit', 'mid-wit', 'big-wit']);
  });

  it('should have model chains for each tier with at least 1 model', () => {
    for (const tier of WIT_TIERS) {
      expect(DEFAULT_TIER_MODELS[tier]).toBeDefined();
      expect(DEFAULT_TIER_MODELS[tier].length).toBeGreaterThanOrEqual(1);
    }
  });

  it('should have dispatch mode for each tier', () => {
    for (const tier of WIT_TIERS) {
      expect(TIER_DISPATCH[tier]).toBeDefined();
      expect(['internal', 'gateway']).toContain(TIER_DISPATCH[tier]);
    }
  });

  describe('WIT_PATTERNS', () => {
    it('should match expected keywords for sub-wit', () => {
      expect('sub-wit task').toMatch(WIT_PATTERNS['sub-wit']);
      expect('this is trivial').toMatch(WIT_PATTERNS['sub-wit']);
      expect('simple fix').toMatch(WIT_PATTERNS['sub-wit']);
      expect('quick question').toMatch(WIT_PATTERNS['sub-wit']);
    });

    it('should match expected keywords for mid-wit', () => {
      expect('mid-wit task').toMatch(WIT_PATTERNS['mid-wit']);
      expect('moderate complexity').toMatch(WIT_PATTERNS['mid-wit']);
      expect('be careful here').toMatch(WIT_PATTERNS['mid-wit']);
      expect('focused implementation').toMatch(WIT_PATTERNS['mid-wit']);
    });

    it('should match expected keywords for big-wit', () => {
      expect('big-wit task').toMatch(WIT_PATTERNS['big-wit']);
      expect('this is hard').toMatch(WIT_PATTERNS['big-wit']);
      expect('complex refactor').toMatch(WIT_PATTERNS['big-wit']);
      expect('deep debugging').toMatch(WIT_PATTERNS['big-wit']);
      expect('architect a solution').toMatch(WIT_PATTERNS['big-wit']);
    });

    it('should not cross-match between tiers', () => {
      expect('big-wit task').not.toMatch(WIT_PATTERNS['sub-wit']);
      expect('trivial task').not.toMatch(WIT_PATTERNS['mid-wit']);
      expect('trivial task').not.toMatch(WIT_PATTERNS['big-wit']);
    });
  });

  describe('EXPLICIT_OVERRIDES', () => {
    it('should map !codex to big-wit tier with codex agent', () => {
      expect(EXPLICIT_OVERRIDES['!codex']).toEqual({
        tier: 'big-wit',
        agent: 'codex',
      });
    });

    it('should map !cursor to big-wit tier with cursor-agent', () => {
      expect(EXPLICIT_OVERRIDES['!cursor']).toEqual({
        tier: 'big-wit',
        agent: 'cursor-agent',
      });
    });

    it('should map !opencode to big-wit tier with opencode agent', () => {
      expect(EXPLICIT_OVERRIDES['!opencode']).toEqual({
        tier: 'big-wit',
        agent: 'opencode',
      });
    });

    it('should have all overrides pointing to big-wit tier', () => {
      for (const [key, override] of Object.entries(EXPLICIT_OVERRIDES)) {
        expect(override.tier).toBe('big-wit');
      }
    });
  });
});
