import { useEffect, useRef, useCallback } from 'react';

interface WSMessage {
  type: 'item_updated' | 'item_added' | 'item_deleted' | 'list_updated';
  payload: unknown;
}

interface UseWebSocketOptions {
  listId: string;
  onMessage: (msg: WSMessage) => void;
  enabled?: boolean;
}

export function useWebSocket({ listId, onMessage, enabled = true }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retriesRef = useRef(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (!enabled) return;

    const workerUrl = import.meta.env.VITE_WORKER_URL || '';
    const workerHost = workerUrl ? new URL(workerUrl).host : window.location.host;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${workerHost}/api/v1/lists/${listId}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        retriesRef.current = 0;
        // Stop polling fallback if WebSocket connected
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        // Keep-alive ping every 30s
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 30000);
        ws.addEventListener('close', () => clearInterval(pingInterval));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WSMessage;
          onMessageRef.current(msg);
        } catch {
          // Ignore parse errors (e.g. 'pong')
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!enabled) return;

        // Exponential backoff reconnect
        const delay = Math.min(1000 * Math.pow(2, retriesRef.current), 30000);
        retriesRef.current++;

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);

        // Start polling fallback after first failure
        if (!pollingRef.current) {
          pollingRef.current = setInterval(() => {
            onMessageRef.current({ type: 'list_updated', payload: null });
          }, 10000);
        }
      };

      ws.onerror = () => {
        // Silently fall back to polling
        ws.close();
      };
    } catch {
      // WebSocket not supported or failed — use polling
      if (!pollingRef.current) {
        pollingRef.current = setInterval(() => {
          onMessageRef.current({ type: 'list_updated', payload: null });
        }, 10000);
      }
    }
  }, [listId, enabled]);

  useEffect(() => {
    if (!enabled) return;
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect, enabled]);
}
