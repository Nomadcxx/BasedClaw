import { createServer, IncomingMessage, ServerResponse } from 'http';

export interface DispatchRequest {
  tier: string;
  task_description: string;
  agent?: string;
  model?: string;
}

export interface MockGateway {
  start: () => Promise<number>;
  stop: () => Promise<void>;
  getDispatchCalls: () => DispatchRequest[];
  clearCalls: () => void;
  port: number;
}

export function createMockGateway(): MockGateway {
  const dispatchCalls: DispatchRequest[] = [];
  let server: ReturnType<typeof createServer> | null = null;
  let port = 0;

  const handleRequest = (req: IncomingMessage, res: ServerResponse) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const url = req.url || '';

      if (url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }

      if (url === '/dispatch' && req.method === 'POST') {
        try {
          const data = JSON.parse(body) as DispatchRequest;
          dispatchCalls.push(data);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: true,
              session_id: `mock-session-${Date.now()}`,
              tier: data.tier,
              agent: data.agent || 'opencode',
            })
          );
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    });
  };

  return {
    get port() {
      return port;
    },

    start: () =>
      new Promise((resolve) => {
        server = createServer(handleRequest);
        server.listen(0, () => {
          const addr = server!.address();
          port = typeof addr === 'object' && addr ? addr.port : 0;
          resolve(port);
        });
      }),

    stop: () =>
      new Promise((resolve) => {
        if (server) {
          server.close(() => resolve());
        } else {
          resolve();
        }
      }),

    getDispatchCalls: () => [...dispatchCalls],

    clearCalls: () => {
      dispatchCalls.length = 0;
    },
  };
}
