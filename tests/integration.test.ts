import { describe, it, expect, vi } from 'vitest';
import plugin from '../src/index';
import { witDetectorHandler } from '../src/hooks/wit-detector';
import { ocDelegateHandler } from '../src/tools/oc-delegate';

const register = plugin.register.bind(plugin);

describe('integration', () => {
  function createMockApi() {
    const hooks: any[] = [];
    const tools: any[] = [];
    const config = {
      gateway_url: 'http://localhost:18789',
      default_big_wit_agent: 'opencode',
    };

    return {
      hooks,
      tools,
      config,
      api: {
        registerHook: (events: string | string[], handler: any, opts?: any) => {
          const eventArray = Array.isArray(events) ? events : [events];
          hooks.push({ events: eventArray, handler, opts });
        },
        registerTool: (toolOrName: any, toolConfig?: any) => {
          if (typeof toolOrName === 'object') {
            tools.push(toolOrName);
          } else {
            tools.push({ name: toolOrName, ...toolConfig });
          }
        },
        getConfig: () => config,
      },
    };
  }

  it('should register exactly 1 hook (before_prompt_build)', () => {
    const { api, hooks } = createMockApi();
    register(api);

    expect(hooks).toHaveLength(1);
    expect(hooks[0].events).toContain('before_prompt_build');
    expect(typeof hooks[0].handler).toBe('function');
    expect(hooks[0].opts?.name).toBe('wit-detector');
  });

  it('should register exactly 1 tool (oc_delegate)', () => {
    const { api, tools } = createMockApi();
    register(api);

    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('oc_delegate');
    expect(tools[0].description).toContain('wit-tier');
  });

  describe('full flow: keyword detection → tool dispatch', () => {
    it('should handle "give this to a big-wit" flow', () => {
      const event = {
        messages: [
          { role: 'user', content: 'give this to a big-wit' },
        ],
      };
      const ctx = { config: {} };

      const hookResult = witDetectorHandler(event, ctx);
      expect(hookResult).not.toBeNull();
      expect(hookResult?.messages).toBeDefined();
      const systemMsg = hookResult?.messages?.find((m) => m.role === 'system');
      expect(systemMsg?.content).toContain('big-wit');
      expect(systemMsg?.content).toContain('oc_delegate');
    });

    it('should handle "!codex fix this" override flow', async () => {
      const event = {
        messages: [
          { role: 'user', content: '!codex fix the auth bug' },
        ],
      };
      const ctx = { config: {} };

      const hookResult = witDetectorHandler(event, ctx);
      expect(hookResult).not.toBeNull();
      const systemMsg = hookResult?.messages?.find((m) => m.role === 'system');
      expect(systemMsg?.content).toContain('codex');

      const toolResult = await ocDelegateHandler(
        {
          tier: 'big-wit',
          task_description: 'fix the auth bug',
          agent: 'codex',
        },
        ctx
      );
      expect(toolResult).toContain('codex');
      expect(toolResult).toContain('gateway');
    });

    it('should handle text with no keywords (no hook activation)', () => {
      const event = {
        messages: [
          { role: 'user', content: 'just do it normally' },
        ],
      };
      const ctx = { config: {} };

      const hookResult = witDetectorHandler(event, ctx);
      expect(hookResult).toBeNull();
    });

    it('should still work when tool is called directly with explicit tier', async () => {
      const toolResult = await ocDelegateHandler(
        {
          tier: 'mid-wit',
          task_description: 'Write a test',
        },
        { config: {} }
      );
      expect(toolResult).toContain('mid-wit');
      expect(toolResult.toLowerCase()).toContain('spawn');
    });

    it('should handle keyword inside code block (no activation)', () => {
      const event = {
        messages: [
          {
            role: 'user',
            content: 'Here is code ```big-wit``` but not really',
          },
        ],
      };
      const ctx = { config: {} };

      const hookResult = witDetectorHandler(event, ctx);
      expect(hookResult).toBeNull();
    });
  });

  describe('hook functionality', () => {
    it('should add prependContext when keyword detected', () => {
      const mock = createMockApi();
      register(mock.api);

      const event = {
        prompt: 'test message big-wit',
      };

      const result = mock.hooks[0].handler(event, { config: {} });
      expect(result.prependContext).toBeDefined();
      expect(result.prependContext).toContain('big-wit');
    });
  });

  describe('config override', () => {
    it('should use custom model_routing from config', async () => {
      const config = {
        model_routing: {
          'mid-wit': ['custom-mid-model'],
        },
      };

      const toolResult = await ocDelegateHandler(
        {
          tier: 'mid-wit',
          task_description: 'Test task',
        },
        { config }
      );

      expect(toolResult).toContain('custom-mid-model');
    });

    it('should use custom gateway_url from config', async () => {
      const config = {
        gateway_url: 'http://custom-gateway:9999',
      };

      const toolResult = await ocDelegateHandler(
        {
          tier: 'big-wit',
          task_description: 'Test task',
        },
        { config }
      );

      expect(toolResult).toContain('http://custom-gateway:9999');
    });
  });
});
