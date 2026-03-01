import { describe, it, expect } from 'vitest';
import { validateConfig, getEffectiveConfig, generateConfigTemplate } from '../src/config';
import { DEFAULT_TIER_MODELS, DEFAULT_BIG_WIT_AGENT } from '../src/constants';

describe('Config Validation', () => {
  describe('validateConfig', () => {
    it('should accept empty config', () => {
      const result = validateConfig({});
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid gateway_url', () => {
      const result = validateConfig({ gateway_url: 'http://localhost:18789' });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid gateway_url', () => {
      const result = validateConfig({ gateway_url: 'not-a-url' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid gateway_url');
    });

    it('should accept valid model_routing', () => {
      const result = validateConfig({
        model_routing: {
          'sub-wit': ['model-a', 'model-b'],
          'mid-wit': ['model-c'],
          'big-wit': ['model-d'],
        },
      });
      expect(result.valid).toBe(true);
    });

    it('should warn on empty model_routing array', () => {
      const result = validateConfig({
        model_routing: {
          'sub-wit': [],
        },
      });
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('model_routing.sub-wit is empty, will use defaults');
    });

    it('should reject non-array model_routing', () => {
      const result = validateConfig({
        model_routing: {
          'sub-wit': 'not-an-array' as any,
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('model_routing.sub-wit must be an array');
    });

    it('should reject empty string models', () => {
      const result = validateConfig({
        model_routing: {
          'big-wit': ['valid-model', ''],
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid model');
    });

    it('should reject non-string default_big_wit_agent', () => {
      const result = validateConfig({
        default_big_wit_agent: 123 as any,
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('default_big_wit_agent must be a string');
    });
  });

  describe('getEffectiveConfig', () => {
    it('should return defaults for empty config', () => {
      const effective = getEffectiveConfig({});
      expect(effective.modelRouting).toEqual(DEFAULT_TIER_MODELS);
      expect(effective.gatewayUrl).toBe('http://localhost:18789');
      expect(effective.defaultBigWitAgent).toBe(DEFAULT_BIG_WIT_AGENT);
    });

    it('should override with user config', () => {
      const effective = getEffectiveConfig({
        model_routing: {
          'big-wit': ['custom-opus'],
        },
        gateway_url: 'http://custom:9999',
        default_big_wit_agent: 'custom-agent',
      });

      expect(effective.modelRouting['big-wit']).toEqual(['custom-opus']);
      expect(effective.modelRouting['sub-wit']).toEqual(DEFAULT_TIER_MODELS['sub-wit']);
      expect(effective.gatewayUrl).toBe('http://custom:9999');
      expect(effective.defaultBigWitAgent).toBe('custom-agent');
    });

    it('should not override with empty arrays', () => {
      const effective = getEffectiveConfig({
        model_routing: {
          'sub-wit': [],
        },
      });
      expect(effective.modelRouting['sub-wit']).toEqual(DEFAULT_TIER_MODELS['sub-wit']);
    });
  });

  describe('generateConfigTemplate', () => {
    it('should return valid JSON template', () => {
      const template = generateConfigTemplate();
      const parsed = JSON.parse(template);

      expect(parsed.model_routing).toBeDefined();
      expect(parsed.gateway_url).toBeDefined();
      expect(parsed.default_big_wit_agent).toBeDefined();
    });

    it('should include all tiers in template', () => {
      const template = generateConfigTemplate();
      const parsed = JSON.parse(template);

      expect(parsed.model_routing['sub-wit']).toBeDefined();
      expect(parsed.model_routing['mid-wit']).toBeDefined();
      expect(parsed.model_routing['big-wit']).toBeDefined();
    });
  });
});
