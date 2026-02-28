import { describe, it, expect } from 'vitest';
import {
  detectWitTier,
  buildContextMessage,
  stripCodeBlocks,
} from '../src/hooks/wit-detector';
import {
  resolveModel,
  buildDelegationResponse,
  validateDelegationParams,
  ocDelegateHandler,
} from '../src/tools/oc-delegate';

describe('Production Tests', () => {
  describe('Keyword Detection', () => {
    const testCases = [
      { input: 'this is a sub-wit task', expected: 'sub-wit' },
      { input: 'give this to a big-wit', expected: 'big-wit' },
      { input: 'handle this mid-wit', expected: 'mid-wit' },
      { input: 'this is trivial', expected: 'sub-wit' },
      { input: 'this is complex', expected: 'big-wit' },
      { input: 'be careful here', expected: 'mid-wit' },
      { input: 'this is a quick question', expected: 'sub-wit' },
      { input: 'this is hard', expected: 'big-wit' },
      { input: 'deep debugging needed', expected: 'big-wit' },
      { input: 'simple fix', expected: 'sub-wit' },
      { input: 'focused implementation', expected: 'mid-wit' },
      { input: 'architect a solution', expected: 'big-wit' },
    ];

    testCases.forEach(({ input, expected }) => {
      it(`should detect "${expected}" from: "${input}"`, () => {
        const result = detectWitTier(input);
        expect(result).not.toBeNull();
        expect(result?.tier).toBe(expected);
      });
    });

    it('should return null for unmatched text', () => {
      const result = detectWitTier('just do this normally');
      expect(result).toBeNull();
    });
  });

  describe('Explicit Overrides', () => {
    it('!codex triggers big-wit with codex agent', () => {
      const result = detectWitTier('!codex fix the bug');
      expect(result).toEqual({ tier: 'big-wit', agent: 'codex' });
    });

    it('!cursor triggers big-wit with cursor-agent', () => {
      const result = detectWitTier('!cursor refactor this');
      expect(result).toEqual({ tier: 'big-wit', agent: 'cursor-agent' });
    });

    it('!opencode triggers big-wit with opencode agent', () => {
      const result = detectWitTier('!opencode implement feature');
      expect(result).toEqual({ tier: 'big-wit', agent: 'opencode' });
    });
  });

  describe('Code Block Handling', () => {
    it('ignores keywords inside code blocks', () => {
      const text = 'Text before ```big-wit keyword here``` text after';
      const result = detectWitTier(text);
      expect(result).toBeNull();
    });

    it('strips multi-line code blocks', () => {
      const text = `Before
\`\`\`
sub-wit
mid-wit
big-wit
\`\`\`
After`;
      const stripped = stripCodeBlocks(text);
      expect(stripped).not.toContain('sub-wit');
      expect(stripped).toContain('Before');
      expect(stripped).toContain('After');
    });
  });

  describe('Delegation Response Generation', () => {
    it('sub-wit returns answer directly instruction', () => {
      const response = buildDelegationResponse(
        'sub-wit',
        'What is 2+2?',
        'haiku-4.5',
        null,
        'http://localhost:18789'
      );
      expect(response).toContain('sub-wit');
      expect(response).toContain('answer directly');
      expect(response).toContain('haiku-4.5');
    });

    it('mid-wit returns spawn instruction', () => {
      const response = buildDelegationResponse(
        'mid-wit',
        'Write a test',
        'sonnet-4.6',
        null,
        'http://localhost:18789'
      );
      expect(response).toContain('mid-wit');
      expect(response.toLowerCase()).toContain('spawn');
      expect(response).toContain('sonnet-4.6');
    });

    it('big-wit returns gateway dispatch instruction', () => {
      const response = buildDelegationResponse(
        'big-wit',
        'Refactor module',
        'opus-4.6',
        'opencode',
        'http://localhost:18789'
      );
      expect(response).toContain('big-wit');
      expect(response).toContain('gateway');
      expect(response).toContain('opencode');
      expect(response).toContain('http://localhost:18789');
    });
  });

  describe('Model Resolution', () => {
    it('uses default model for sub-wit', () => {
      const model = resolveModel('sub-wit', {});
      expect(model).toBe('haiku-4.5');
    });

    it('uses default model for mid-wit', () => {
      const model = resolveModel('mid-wit', {});
      expect(model).toBe('sonnet-4.6');
    });

    it('uses default model for big-wit', () => {
      const model = resolveModel('big-wit', {});
      expect(model).toBe('opus-4.6');
    });

    it('uses config override when provided', () => {
      const model = resolveModel('mid-wit', {
        model_routing: { 'mid-wit': ['custom-model'] },
      });
      expect(model).toBe('custom-model');
    });

    it('uses explicit model param over config', () => {
      const model = resolveModel(
        'big-wit',
        { model_routing: { 'big-wit': ['config-model'] } },
        'explicit-model'
      );
      expect(model).toBe('explicit-model');
    });
  });

  describe('Validation', () => {
    it('rejects empty task_description', () => {
      expect(() =>
        validateDelegationParams({ tier: 'mid-wit', task_description: '' })
      ).toThrow();
    });

    it('rejects invalid tier', () => {
      expect(() =>
        validateDelegationParams({ tier: 'invalid', task_description: 'test' })
      ).toThrow();
    });

    it('rejects task_description over 10000 chars', () => {
      expect(() =>
        validateDelegationParams({
          tier: 'mid-wit',
          task_description: 'x'.repeat(10001),
        })
      ).toThrow();
    });

    it('accepts valid params', () => {
      expect(() =>
        validateDelegationParams({ tier: 'mid-wit', task_description: 'test' })
      ).not.toThrow();
    });
  });

  describe('Full Handler Flow', () => {
    it('handles sub-wit delegation', async () => {
      const result = await ocDelegateHandler(
        { tier: 'sub-wit', task_description: 'What is 2+2?' },
        { config: {} }
      );
      expect(result).toContain('sub-wit');
      expect(result).toContain('answer directly');
    });

    it('handles mid-wit delegation', async () => {
      const result = await ocDelegateHandler(
        { tier: 'mid-wit', task_description: 'Write a test' },
        { config: {} }
      );
      expect(result).toContain('mid-wit');
      expect(result.toLowerCase()).toContain('spawn');
    });

    it('handles big-wit delegation', async () => {
      const result = await ocDelegateHandler(
        { tier: 'big-wit', task_description: 'Refactor module' },
        { config: {} }
      );
      expect(result).toContain('big-wit');
      expect(result).toContain('gateway');
    });

    it('handles big-wit with explicit agent', async () => {
      const result = await ocDelegateHandler(
        { tier: 'big-wit', task_description: 'Fix bug', agent: 'codex' },
        { config: {} }
      );
      expect(result).toContain('codex');
    });

    it('handles custom gateway_url in config', async () => {
      const result = await ocDelegateHandler(
        { tier: 'big-wit', task_description: 'Test' },
        { config: { gateway_url: 'http://custom:9999' } }
      );
      expect(result).toContain('http://custom:9999');
    });
  });

  describe('Context Message Generation', () => {
    it('generates proper context for big-wit', () => {
      const msg = buildContextMessage({ tier: 'big-wit', agent: null });
      expect(msg).toContain('WIT-TIER DETECTED');
      expect(msg).toContain('big-wit');
      expect(msg).toContain('oc_delegate');
      expect(msg).toContain('Do NOT');
    });

    it('generates proper context for big-wit with agent', () => {
      const msg = buildContextMessage({ tier: 'big-wit', agent: 'codex' });
      expect(msg).toContain('codex');
    });

    it('generates proper context for sub-wit', () => {
      const msg = buildContextMessage({ tier: 'sub-wit', agent: null });
      expect(msg).toContain('sub-wit');
      expect(msg).toContain('trivial');
    });
  });
});
