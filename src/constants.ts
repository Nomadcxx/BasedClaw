export const PLUGIN_ID = 'basedclaw';
export const TOOL_PREFIX = 'oc_';

export const WIT_TIERS = ['sub-wit', 'mid-wit', 'big-wit'] as const;
export type WitTier = typeof WIT_TIERS[number];

export const DEFAULT_TIER_MODELS: Record<WitTier, string[]> = {
  'sub-wit': ['haiku-4.5', 'gpt-5-mini', 'qwen3.5'],
  'mid-wit': ['sonnet-4.6', 'glm-5', 'deepseek-v3.2'],
  'big-wit': ['opus-4.6', 'gpt-5.3-codex', 'minimax-m2.5'],
};

export type DispatchMode = 'internal' | 'gateway';

export const TIER_DISPATCH: Record<WitTier, DispatchMode> = {
  'sub-wit': 'internal',
  'mid-wit': 'internal',
  'big-wit': 'gateway',
};

export const DEFAULT_BIG_WIT_AGENT = 'main';

export const WIT_PATTERNS: Record<WitTier, RegExp> = {
  'sub-wit': /\b(sub[- ]?wit|trivial|simple|quick)\b/i,
  'mid-wit': /\b(mid[- ]?wit|moderate|careful|focused)\b/i,
  'big-wit': /\b(big[- ]?wit|hard|complex|deep|architect)/i,
};

export interface ExplicitOverride {
  tier: WitTier;
  agent: string;
}

export const EXPLICIT_OVERRIDES: Record<string, ExplicitOverride> = {
  '!codex': { tier: 'big-wit', agent: 'main' },
  '!cursor': { tier: 'big-wit', agent: 'main' },
  '!opencode': { tier: 'big-wit', agent: 'main' },
};
