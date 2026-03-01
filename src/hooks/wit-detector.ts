import {
  WIT_PATTERNS,
  EXPLICIT_OVERRIDES,
  WitTier,
} from '../constants';

export interface WitDetection {
  tier: WitTier;
  agent: string | null;
}

export function stripCodeBlocks(text: string): string {
  return text.replace(/```[\s\S]*?```/g, '');
}

export function detectWitTier(text: string): WitDetection | null {
  const strippedText = stripCodeBlocks(text);

  for (const [prefix, override] of Object.entries(EXPLICIT_OVERRIDES)) {
    if (strippedText.includes(prefix)) {
      return {
        tier: override.tier,
        agent: override.agent,
      };
    }
  }

  for (const [tier, pattern] of Object.entries(WIT_PATTERNS) as [WitTier, RegExp][]) {
    if (pattern.test(strippedText)) {
      return {
        tier,
        agent: null,
      };
    }
  }

  return null;
}

export function buildContextMessage(detection: WitDetection): string {
  const { tier, agent } = detection;

  if (agent) {
    return `[WIT-TIER DETECTED: ${tier} with agent=${agent}]
The user's request has been classified as ${tier} and should be dispatched to the ${agent} agent.
Use oc_delegate with tier="${tier}" and agent="${agent}" to dispatch this task.
Do NOT attempt to solve this directly.`;
  }

  if (tier === 'big-wit') {
    return `[WIT-TIER DETECTED: ${tier}]
The user's request has been classified as ${tier} (complex/hard task).
Use oc_delegate with tier="${tier}" to dispatch this task.
Do NOT attempt to solve this directly.`;
  }

  if (tier === 'mid-wit') {
    return `[WIT-TIER DETECTED: ${tier}]
The user's request has been classified as ${tier} (moderate task).
Use oc_delegate with tier="${tier}" to dispatch this task if appropriate.`;
  }

  return `[WIT-TIER DETECTED: ${tier}]
The user's request has been classified as ${tier} (trivial task).
You may answer this directly without delegation.`;
}

export interface HookEvent {
  messages: Array<{ role: string; content: string }>;
}

export interface HookContext {
  config?: any;
}

export interface HookResult {
  messages?: Array<{ role: string; content: string }>;
}

export function witDetectorHandler(
  event: HookEvent,
  ctx: HookContext
): HookResult | null {
  if (!event || !event.messages || event.messages.length === 0) {
    return null;
  }

  const lastMessage = event.messages[event.messages.length - 1];
  if (!lastMessage || lastMessage.role !== 'user' || !lastMessage.content) {
    return null;
  }

  const detection = detectWitTier(lastMessage.content);
  if (!detection) {
    return null;
  }

  const contextMessage = buildContextMessage(detection);
  const updatedMessages = [
    ...event.messages.slice(0, -1),
    {
      role: 'system',
      content: contextMessage,
    },
    lastMessage,
  ];

  return { messages: updatedMessages };
}

export function createWitDetectorHook(api: any): void {
  // openclaw registerHook signature: (events: string|string[], handler, opts?)
  // - events: event name(s) to listen for
  // - handler: function that receives (event, ctx) and returns modified event or null
  // - opts: optional { priority?: number, name?: string }
  api.registerHook(
    'before_prompt_build',
    (event: any, ctx: any) => {
      const prompt = event?.prompt || '';
      if (!prompt) {
        return event;
      }

      const detection = detectWitTier(prompt);
      if (!detection) {
        return event;
      }

      const contextMessage = buildContextMessage(detection);
      
      return {
        ...event,
        prependContext: contextMessage,
      };
    },
    { priority: 75, name: 'wit-detector' }
  );
}
