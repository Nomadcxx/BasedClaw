import {
  WIT_TIERS,
  DEFAULT_TIER_MODELS,
  TIER_DISPATCH,
  DEFAULT_BIG_WIT_AGENT,
  WitTier,
} from '../constants';
import { metrics } from '../metrics';

export const OcDelegateSchema = {
  type: 'object',
  properties: {
    tier: {
      type: 'string',
      description: 'Intelligence tier for task delegation',
    },
    task_description: {
      type: 'string',
      description: 'Description of the task to delegate',
    },
    agent: {
      type: 'string',
      description: 'Override target agent (optional)',
    },
    model: {
      type: 'string',
      description: 'Override model selection (optional)',
    },
  },
  required: ['tier', 'task_description'],
};

export interface OcDelegateParams {
  tier: WitTier;
  task_description: string;
  agent?: string;
  model?: string;
}

export interface PluginConfig {
  model_routing?: {
    'sub-wit'?: string[];
    'mid-wit'?: string[];
    'big-wit'?: string[];
  };
  gateway_url?: string;
  default_big_wit_agent?: string;
}

export function validateDelegationParams(params: any): void {
  if (!params || typeof params !== 'object') {
    throw new Error('Invalid params object');
  }

  if (!params.task_description || typeof params.task_description !== 'string' || params.task_description.trim() === '') {
    throw new Error('task_description cannot be empty');
  }

  if (!WIT_TIERS.includes(params.tier)) {
    throw new Error(`Invalid tier: ${params.tier}. Must be one of: ${WIT_TIERS.join(', ')}`);
  }

  if (params.task_description.length > 10000) {
    throw new Error('task_description cannot exceed 10000 characters');
  }
}

export function resolveModel(
  tier: WitTier,
  config: PluginConfig,
  explicitModel?: string
): string {
  if (explicitModel) {
    return explicitModel;
  }

  if (config.model_routing && config.model_routing[tier]) {
    const modelChain = config.model_routing[tier];
    if (modelChain && modelChain.length > 0) {
      return modelChain[0];
    }
  }

  return DEFAULT_TIER_MODELS[tier][0];
}

export function buildDelegationResponse(
  tier: WitTier,
  task: string,
  model: string,
  agent: string | null,
  gatewayUrl: string
): string {
  const dispatchMode = TIER_DISPATCH[tier];

  if (tier === 'sub-wit' && dispatchMode === 'internal') {
    return `[DELEGATION: ${tier}]
Task classified as ${tier} (trivial).
Model: ${model}
Action: answer directly in the current session using ${model}-level quality.

Task: ${task}`;
  }

  if (tier === 'mid-wit' && dispatchMode === 'internal') {
    return `[DELEGATION: ${tier}]
Task classified as ${tier} (moderate).
Model: ${model}
Action: Spawn an internal openclaw agent session with model ${model}.

Suggested approach:
- Create a focused agent session
- Pass the task: "${task}"
- Monitor completion

Task: ${task}`;
  }

  if (tier === 'big-wit' && dispatchMode === 'gateway') {
    const targetAgent = agent || DEFAULT_BIG_WIT_AGENT;
    return `[DELEGATION: ${tier}]
Task classified as ${tier} (complex).
Model: ${model}
Agent: ${targetAgent}
Gateway: ${gatewayUrl}

Action: Dispatch via gateway API.
POST ${gatewayUrl}/dispatch
Body: {
  "agent": "${targetAgent}",
  "model": "${model}",
  "task": "${task}"
}

The gateway will return a session ID for monitoring.`;
  }

  return `[DELEGATION ERROR]
Unknown dispatch configuration for tier: ${tier}`;
}

export interface ToolParams {
  tier: WitTier;
  task_description: string;
  agent?: string;
  model?: string;
}

export async function ocDelegateHandler(
  params: ToolParams,
  ctx: { config?: PluginConfig }
): Promise<string> {
  validateDelegationParams(params);

  const config = ctx.config || {};
  const model = resolveModel(params.tier, config, params.model);
  const gatewayUrl = config.gateway_url || 'http://localhost:18789';
  const dispatchMode = TIER_DISPATCH[params.tier];

  metrics.recordDispatch(dispatchMode === 'gateway' ? 'gateway' : 'internal');

  if (dispatchMode === 'internal') {
    return buildDelegationResponse(
      params.tier,
      params.task_description,
      model,
      params.agent || null,
      gatewayUrl
    );
  }

  // big-wit: instruct the LLM to use sessions_spawn (built-in tool)
  const targetAgent = params.agent || DEFAULT_BIG_WIT_AGENT;
  return `[DELEGATION: ${params.tier}] → USE sessions_spawn
Task classified as ${params.tier} (complex). You MUST now call the \`sessions_spawn\` tool with these parameters:

\`\`\`json
{
  "agentId": "${targetAgent}",
  "model": "${model}",
  "label": "basedclaw:${params.tier}",
  "message": ${JSON.stringify(params.task_description)}
}
\`\`\`

After spawning, use \`subagents\` to monitor the session. Report the result when complete.`;
}

export function createOcDelegateTool(api: any, getConfig: () => PluginConfig): void {
  api.registerTool({
    name: 'oc_delegate',
    label: 'Delegate Task',
    description:
      'Delegate a task to the appropriate wit-tier agent. Use sub-wit for trivial, mid-wit for moderate, big-wit for complex tasks.',
    parameters: OcDelegateSchema,
    async execute(_toolCallId: string, params: ToolParams) {
      return {
        content: [{ type: 'text', text: await ocDelegateHandler(params, { config: getConfig() }) }],
      };
    },
  });
}
