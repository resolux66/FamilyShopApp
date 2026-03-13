export class ListDO implements DurableObject {
  private sessions: Set<WebSocket> = new Set();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/connect') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected WebSocket', { status: 426 });
      }
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.handleSession(server);
      return new Response(null, {
        status: 101,
        // @ts-ignore - CF Workers specific
        webSocket: client,
      });
    }

    if (url.pathname === '/notify' && request.method === 'POST') {
      const message = await request.json();
      this.broadcast(JSON.stringify(message));
      return new Response('ok');
    }

    return new Response('Not found', { status: 404 });
  }

  private handleSession(ws: WebSocket): void {
    // @ts-ignore - CF Workers specific
    ws.accept();
    this.sessions.add(ws);

    ws.addEventListener('close', () => {
      this.sessions.delete(ws);
    });

    ws.addEventListener('error', () => {
      this.sessions.delete(ws);
    });

    // Send ping to keep alive
    ws.addEventListener('message', (msg) => {
      if (msg.data === 'ping') {
        ws.send('pong');
      }
    });
  }

  private broadcast(message: string): void {
    const dead = new Set<WebSocket>();
    for (const ws of this.sessions) {
      try {
        ws.send(message);
      } catch {
        dead.add(ws);
      }
    }
    for (const ws of dead) {
      this.sessions.delete(ws);
    }
  }
}
