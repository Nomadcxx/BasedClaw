import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createMockGateway, MockGateway } from './gateway-mock';
import { createOcDelegateTool } from '../../src/tools/oc-delegate';
import { createWitDetectorHook } from '../../src/hooks/wit-detector';
import { detectWitTier, buildContextMessage } from '../../src/hooks/wit-detector';

describe('E2E: Full routing flow with gateway', () => {
  let gateway: MockGateway;
  let gatewayUrl: string;

  beforeAll(async () => {
    gateway = createMockGateway();
    const port = await gateway.start();
    gatewayUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await gateway.stop();
  });

  beforeEach(() => {
    gateway.clearCalls();
  });

  function createTestApi() {
    const hooks: any[] = [];
    const tools: any[] = [];

    return {
      hooks,
      tools,
      api: {
        registerHook: (events: string | string[], handler: any, opts?: any) => {
          hooks.push({ events: Array.isArray(events) ? events : [events], handler, opts });
        },
        registerTool: (config: any) => tools.push(config),
        getConfig: () => ({
          gateway_url: gatewayUrl,
          default_big_wit_agent: 'opencode',
        }),
      },
    };
  }

  describe('wit-detector hook', () => {
    it('should detect big-wit and inject context', () => {
      const mock = createTestApi();
      createWitDetectorHook(mock.api);

      const event = { prompt: 'This is a big-wit architecture task' };
      const result = mock.hooks[0].handler(event, {});

      expect(result.prependContext).toBeDefined();
      expect(result.prependContext).toContain('big-wit');
      expect(result.prependContext).toContain('TIER DETECTED');
    });

    it('should detect explicit override and include agent', () => {
      const detection = detectWitTier('!codex help me with this complex problem');

      expect(detection).not.toBeNull();
      expect(detection?.tier).toBe('big-wit');
      expect(detection?.agent).toBe('codex');
    });

    it('should not detect keywords inside code blocks', () => {
      const detection = detectWitTier('Here is code:\n```\nconst bigWit = true;\n```');

      expect(detection).toBeNull();
    });
  });

  describe('oc_delegate tool with gateway', () => {
    it('should generate big-wit dispatch instructions', async () => {
      const mock = createTestApi();
      createOcDelegateTool(mock.api, mock.api.getConfig);

      const tool = mock.tools[0];
      const result = await tool.execute('call-123', {
        tier: 'big-wit',
        task_description: 'Architect a distributed system',
      });

      const text = result.content[0].text;
      expect(text).toContain('[DELEGATION: big-wit]');
      expect(text).toContain('POST');
      expect(text).toContain('/dispatch');
      expect(text).toContain('Architect a distributed system');
    });

    it('should include explicit agent in big-wit dispatch', async () => {
      const mock = createTestApi();
      createOcDelegateTool(mock.api, mock.api.getConfig);

      const tool = mock.tools[0];
      const result = await tool.execute('call-456', {
        tier: 'big-wit',
        task_description: 'Complex debugging task',
        agent: 'codex',
      });

      const text = result.content[0].text;
      expect(text).toContain('Agent: codex');
      expect(text).toContain('"agent": "codex"');
    });

    it('should handle sub-wit internally without gateway call', async () => {
      const mock = createTestApi();
      createOcDelegateTool(mock.api, mock.api.getConfig);

      const tool = mock.tools[0];
      const result = await tool.execute('call-789', {
        tier: 'sub-wit',
        task_description: 'Fix a typo',
      });

      expect(gateway.getDispatchCalls()).toHaveLength(0);
      expect(result.content[0].text).toContain('answer directly');
    });

    it('should handle mid-wit internally without gateway call', async () => {
      const mock = createTestApi();
      createOcDelegateTool(mock.api, mock.api.getConfig);

      const tool = mock.tools[0];
      const result = await tool.execute('call-abc', {
        tier: 'mid-wit',
        task_description: 'Implement a feature',
      });

      expect(gateway.getDispatchCalls()).toHaveLength(0);
      expect(result.content[0].text).toContain('internal openclaw agent');
    });
  });

  describe('full flow: detection to dispatch', () => {
    it('should detect tier and generate dispatch instructions', async () => {
      const mock = createTestApi();
      createWitDetectorHook(mock.api);
      createOcDelegateTool(mock.api, mock.api.getConfig);

      const prompt = 'I need help with a big-wit architecture problem';
      const event = { prompt };
      const hookResult = mock.hooks[0].handler(event, {});

      expect(hookResult.prependContext).toContain('big-wit');

      const detection = detectWitTier(prompt);
      expect(detection?.tier).toBe('big-wit');

      const tool = mock.tools[0];
      const result = await tool.execute('flow-test', {
        tier: detection!.tier,
        task_description: prompt,
        agent: detection?.agent,
      });

      const text = result.content[0].text;
      expect(text).toContain('[DELEGATION: big-wit]');
      expect(text).toContain('/dispatch');
    });

    it('should handle !codex override end-to-end', async () => {
      const mock = createTestApi();
      createWitDetectorHook(mock.api);
      createOcDelegateTool(mock.api, mock.api.getConfig);

      const prompt = '!codex help me debug this complex issue';

      const detection = detectWitTier(prompt);
      expect(detection?.tier).toBe('big-wit');
      expect(detection?.agent).toBe('codex');

      const tool = mock.tools[0];
      const result = await tool.execute('codex-flow', {
        tier: detection!.tier,
        task_description: prompt,
        agent: detection?.agent,
      });

      const text = result.content[0].text;
      expect(text).toContain('Agent: codex');
      expect(text).toContain('[DELEGATION: big-wit]');
    });
  });
});
