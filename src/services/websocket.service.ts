// src/services/websocket.service.ts
import { useState, useEffect } from "react";
import { useAuthStore } from "../stores/auth";

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

// --- WebSocketClient 类 (保持逻辑不变) ---
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Map<
    string,
    ((message: WebSocketMessage) => void)[]
  > = new Map();
  private isConnected = false;
  private onStatusChange: ((status: boolean) => void) | null = null;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  connect() {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    try {
      this.ws = new WebSocket(`${this.url}?token=${this.token}`);

      this.ws.onopen = () => {
        console.log("WebSocket connected");
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.onStatusChange?.(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          this.handleMessage(message);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      this.ws.onclose = () => {
        console.log("WebSocket disconnected");
        this.isConnected = false;
        this.onStatusChange?.(false);
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
      );
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  private handleMessage(message: WebSocketMessage) {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => handler(message));
    }
  }

  on(type: string, handler: (message: WebSocketMessage) => void) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)?.push(handler);
  }

  off(type: string, handler: (message: WebSocketMessage) => void) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      this.messageHandlers.set(
        type,
        handlers.filter((h) => h !== handler),
      );
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.onStatusChange?.(false);
  }

  getConnectionStatus() {
    return this.isConnected;
  }

  setStatusListener(callback: (status: boolean) => void) {
    this.onStatusChange = callback;
  }
}

// --- 单例模式管理 ---
let wsClient: WebSocketClient | null = null;

// --- React 版 useWebSocket Hook ---
export const useWebSocket = () => {
  const { token } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (token) {
      const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:3000";
      if (!wsClient) {
        wsClient = new WebSocketClient(wsUrl, token);
        wsClient.connect();
      }

      setIsConnected(wsClient.getConnectionStatus());
      wsClient.setStatusListener((status) => setIsConnected(status));
    }

    // 注意：在 React 中通常不建议在 Hook 卸载时关闭全局单例连接
    // 除非你确定用户退出了系统
  }, [token]);

  return {
    getWebSocketClient: () => wsClient,
    isConnected,
  };
};

export const initializeWebSocket = (token: string) => {
  const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:3000";
  wsClient = new WebSocketClient(wsUrl, token);
  wsClient.connect();
  return wsClient;
};

export const disconnectWebSocket = () => {
  if (wsClient) {
    wsClient.disconnect();
    wsClient = null;
  }
};
