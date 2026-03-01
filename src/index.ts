import { createWitDetectorHook } from './hooks/wit-detector';
import { createOcDelegateTool, PluginConfig } from './tools/oc-delegate';
import { PLUGIN_ID, WIT_TIERS, WitTier } from './constants';
import { metrics } from './metrics';
import { validateConfig, getEffectiveConfig, generateConfigTemplate } from './config';
import { feedback } from './feedback';
import { detectWitTier } from './hooks/wit-detector';

export { metrics } from './metrics';
export type { TierMetrics } from './metrics';
export { validateConfig, getEffectiveConfig, generateConfigTemplate } from './config';
export type { ConfigValidation } from './config';
export { feedback } from './feedback';
export type { FeedbackEntry, FeedbackStats } from './feedback';

let generationCounter = 0;

export interface OmocPluginApi {
  registerHook: (events: string | string[], handler: (...args: any[]) => any, opts?: { priority?: number; name?: string }) => void;
  registerTool: (name: string, config: any) => void;
  getConfig?: () => PluginConfig;
  [key: string]: any;
}

function makeGuardedApi(
  api: OmocPluginApi,
  gen: number,
  getLatestGen: () => number
): OmocPluginApi {
  return {
    ...api,
    registerHook: (events: string | string[], handler: (...args: any[]) => any, opts?: any) => {
      const guardedHandler = (...args: any[]) => {
        if (gen !== getLatestGen()) {
          return null;
        }
        return handler(...args);
      };

      api.registerHook(events, guardedHandler, opts);
    },
    registerTool: (name: string, config: any) => {
      const guardedHandler = async (...args: any[]) => {
        if (gen !== getLatestGen()) {
          throw new Error(
            `Tool ${name} from generation ${gen} called but current generation is ${getLatestGen()}`
          );
        }
        return config.handler(...args);
      };

      api.registerTool(name, {
        ...config,
        handler: guardedHandler,
      });
    },
    getConfig: api.getConfig || (() => ({})),
  };
}

const plugin = {
  id: PLUGIN_ID,
  name: 'Basedclaw',
  description: '3-tier intelligence routing for openclaw (sub-wit/mid-wit/big-wit) - basedclaw fork',
  register(api: OmocPluginApi): void {
    const gen = ++generationCounter;
    const guardedApi = makeGuardedApi(api, gen, () => generationCounter);

    const getConfig = () => {
      if (typeof guardedApi.getConfig === 'function') {
        return guardedApi.getConfig() || {};
      }
      return {};
    };

    createWitDetectorHook(guardedApi);
    createOcDelegateTool(guardedApi, getConfig);

    guardedApi.registerTool('oc_metrics', {
      label: 'View Metrics',
      description: 'View basedclaw tier detection and dispatch metrics',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'Action to perform: "summary", "json", or "reset"',
          },
        },
        required: [],
      },
      async execute(_toolCallId: string, params: { action?: string }) {
        const action = params.action || 'summary';

        if (action === 'reset') {
          metrics.reset();
          return { content: [{ type: 'text', text: 'Metrics reset successfully.' }] };
        }

        if (action === 'json') {
          return { content: [{ type: 'text', text: JSON.stringify(metrics.getMetrics(), null, 2) }] };
        }

        return { content: [{ type: 'text', text: metrics.getSummary() }] };
      },
    });

    guardedApi.registerTool('oc_config', {
      label: 'View Configuration',
      description: 'View, validate, or get template for basedclaw configuration',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'Action: "show" (current effective config), "validate", or "template"',
          },
        },
        required: [],
      },
      async execute(_toolCallId: string, params: { action?: string }) {
        const action = params.action || 'show';
        const config = getConfig();

        if (action === 'template') {
          return { content: [{ type: 'text', text: generateConfigTemplate() }] };
        }

        if (action === 'validate') {
          const validation = validateConfig(config);
          const lines = [];
          lines.push(`Valid: ${validation.valid}`);
          if (validation.errors.length > 0) {
            lines.push(`\nErrors:\n${validation.errors.map((e) => `  - ${e}`).join('\n')}`);
          }
          if (validation.warnings.length > 0) {
            lines.push(`\nWarnings:\n${validation.warnings.map((w) => `  - ${w}`).join('\n')}`);
          }
          return { content: [{ type: 'text', text: lines.join('\n') }] };
        }

        const effective = getEffectiveConfig(config);
        return { content: [{ type: 'text', text: JSON.stringify(effective, null, 2) }] };
      },
    });

    guardedApi.registerTool('oc_feedback', {
      label: 'Tier Feedback',
      description: 'Record feedback on tier detection accuracy and view suggestions',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description:
              'Action: "record" (submit correction), "stats", "suggestions", "history", or "clear"',
          },
          prompt: {
            type: 'string',
            description: 'Original prompt (for record action)',
          },
          correct_tier: {
            type: 'string',
            description: 'Correct tier: sub-wit, mid-wit, or big-wit (for record action)',
          },
          reason: {
            type: 'string',
            description: 'Optional reason for correction',
          },
        },
        required: [],
      },
      async execute(
        _toolCallId: string,
        params: {
          action?: string;
          prompt?: string;
          correct_tier?: string;
          reason?: string;
        }
      ) {
        const action = params.action || 'stats';

        if (action === 'record') {
          if (!params.prompt || !params.correct_tier) {
            return {
              content: [{ type: 'text', text: 'Error: prompt and correct_tier are required for record action' }],
            };
          }

          if (!WIT_TIERS.includes(params.correct_tier as WitTier)) {
            return {
              content: [{ type: 'text', text: `Error: correct_tier must be one of: ${WIT_TIERS.join(', ')}` }],
            };
          }

          const detected = detectWitTier(params.prompt);
          const entry = feedback.record({
            originalPrompt: params.prompt,
            detectedTier: detected?.tier || null,
            correctedTier: params.correct_tier as WitTier,
            reason: params.reason,
          });

          return {
            content: [
              {
                type: 'text',
                text: `Feedback recorded:\n  ID: ${entry.id}\n  Detected: ${detected?.tier || 'none'}\n  Corrected to: ${params.correct_tier}`,
              },
            ],
          };
        }

        if (action === 'stats') {
          const stats = feedback.getStats();
          const lines = [
            `Total feedback: ${stats.totalFeedback}`,
            `Accuracy rate: ${(stats.accuracyRate * 100).toFixed(1)}%`,
            `Corrections by tier:`,
            `  sub-wit: ${stats.correctionsByTier['sub-wit']}`,
            `  mid-wit: ${stats.correctionsByTier['mid-wit']}`,
            `  big-wit: ${stats.correctionsByTier['big-wit']}`,
          ];
          return { content: [{ type: 'text', text: lines.join('\n') }] };
        }

        if (action === 'suggestions') {
          const suggestions = feedback.getSuggestions();
          return { content: [{ type: 'text', text: suggestions.join('\n') }] };
        }

        if (action === 'history') {
          const history = feedback.getHistory(10);
          if (history.length === 0) {
            return { content: [{ type: 'text', text: 'No feedback history.' }] };
          }
          const lines = history.map(
            (h) =>
              `[${h.timestamp.slice(0, 10)}] ${h.detectedTier || 'none'} -> ${h.correctedTier}: "${h.originalPrompt.slice(0, 50)}..."`
          );
          return { content: [{ type: 'text', text: lines.join('\n') }] };
        }

        if (action === 'clear') {
          feedback.clear();
          return { content: [{ type: 'text', text: 'Feedback history cleared.' }] };
        }

        return { content: [{ type: 'text', text: `Unknown action: ${action}` }] };
      },
    });
  },
};

export default plugin;
