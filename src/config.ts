import { WIT_TIERS, WitTier, DEFAULT_TIER_MODELS, DEFAULT_BIG_WIT_AGENT } from './constants';
import { PluginConfig } from './tools/oc-delegate';

export interface ConfigValidation {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export function validateConfig(config: PluginConfig): ConfigValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config.gateway_url) {
    try {
      new URL(config.gateway_url);
    } catch {
      errors.push(`Invalid gateway_url: ${config.gateway_url}`);
    }
  }

  if (config.model_routing) {
    for (const tier of WIT_TIERS) {
      const models = config.model_routing[tier];
      if (models) {
        if (!Array.isArray(models)) {
          errors.push(`model_routing.${tier} must be an array`);
        } else if (models.length === 0) {
          warnings.push(`model_routing.${tier} is empty, will use defaults`);
        } else {
          for (const model of models) {
            if (typeof model !== 'string' || model.trim() === '') {
              errors.push(`Invalid model in model_routing.${tier}: ${model}`);
            }
          }
        }
      }
    }
  }

  if (config.default_big_wit_agent) {
    if (typeof config.default_big_wit_agent !== 'string') {
      errors.push('default_big_wit_agent must be a string');
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

export function getEffectiveConfig(userConfig: PluginConfig): {
  modelRouting: Record<WitTier, string[]>;
  gatewayUrl: string;
  defaultBigWitAgent: string;
} {
  const modelRouting: Record<WitTier, string[]> = { ...DEFAULT_TIER_MODELS };

  if (userConfig.model_routing) {
    for (const tier of WIT_TIERS) {
      const userModels = userConfig.model_routing[tier];
      if (userModels && userModels.length > 0) {
        modelRouting[tier] = userModels;
      }
    }
  }

  return {
    modelRouting,
    gatewayUrl: userConfig.gateway_url || 'http://localhost:18789',
    defaultBigWitAgent: userConfig.default_big_wit_agent || DEFAULT_BIG_WIT_AGENT,
  };
}

export function generateConfigTemplate(): string {
  return JSON.stringify(
    {
      model_routing: DEFAULT_TIER_MODELS,
      gateway_url: 'http://localhost:18789',
      default_big_wit_agent: DEFAULT_BIG_WIT_AGENT,
    },
    null,
    2
  );
}
