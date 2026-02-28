import { describe, it, expect } from 'vitest';
import {
  resolveModel,
  buildDelegationResponse,
  validateDelegationParams,
} from '../src/tools/oc-delegate';

describe('oc-delegate', () => {
  describe('resolveModel', () => {
    it('should return first model from default chain for sub-wit', () => {
      const model = resolveModel('sub-wit', {});
      expect(model).toBe('haiku-4.5');
    });

    it('should use config override when provided', () => {
      const config = {
        model_routing: {
          'mid-wit': ['custom-model', 'fallback-model'],
        },
      };
      const model = resolveModel('mid-wit', config);
      expect(model).toBe('custom-model');
    });

    it('should use explicit model param when provided', () => {
      const model = resolveModel('big-wit', {}, 'my-explicit-model');
      expect(model).toBe('my-explicit-model');
    });

    it('should prioritize explicit model over config override', () => {
      const config = {
        model_routing: {
          'big-wit': ['config-model'],
        },
      };
      const model = resolveModel('big-wit', config, 'explicit-model');
      expect(model).toBe('explicit-model');
    });

    it('should return first model from big-wit default chain', () => {
      const model = resolveModel('big-wit', {});
      expect(model).toBe('opus-4.6');
    });
  });

  describe('buildDelegationResponse', () => {
    it('should return instruction to answer directly for sub-wit', () => {
      const response = buildDelegationResponse(
        'sub-wit',
        'What is 2+2?',
        'haiku-4.5',
        null,
        'http://localhost:18789'
      );
      expect(response).toContain('sub-wit');
      expect(response).toContain('answer directly');
      expect(response.toLowerCase()).toContain('haiku-4.5');
    });

    it('should return sessions_spawn instruction for mid-wit', () => {
      const response = buildDelegationResponse(
        'mid-wit',
        'Write a test for constants',
        'sonnet-4.6',
        null,
        'http://localhost:18789'
      );
      expect(response).toContain('mid-wit');
      expect(response.toLowerCase()).toContain('spawn');
      expect(response).toContain('sonnet-4.6');
    });

    it('should return gateway dispatch instruction for big-wit', () => {
      const response = buildDelegationResponse(
        'big-wit',
        'Refactor the memory module',
        'opus-4.6',
        'opencode',
        'http://localhost:18789'
      );
      expect(response).toContain('big-wit');
      expect(response).toContain('gateway');
      expect(response).toContain('opencode');
      expect(response).toContain('http://localhost:18789');
    });

    it('should include agent in big-wit response when provided', () => {
      const response = buildDelegationResponse(
        'big-wit',
        'Fix bug',
        'opus-4.6',
        'codex',
        'http://localhost:18789'
      );
      expect(response).toContain('codex');
    });
  });

  describe('validateDelegationParams', () => {
    it('should accept valid params', () => {
      expect(() => {
        validateDelegationParams({
          tier: 'mid-wit',
          task_description: 'Do something',
        });
      }).not.toThrow();
    });

    it('should reject empty task_description', () => {
      expect(() => {
        validateDelegationParams({
          tier: 'mid-wit',
          task_description: '',
        });
      }).toThrow(/task_description/);
    });

    it('should reject invalid tier name', () => {
      expect(() => {
        validateDelegationParams({
          tier: 'invalid-tier' as any,
          task_description: 'Do something',
        });
      }).toThrow(/tier/);
    });

    it('should reject task_description over 10000 chars', () => {
      expect(() => {
        validateDelegationParams({
          tier: 'mid-wit',
          task_description: 'x'.repeat(10001),
        });
      }).toThrow(/10000/);
    });
  });
});
