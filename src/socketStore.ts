import { getClasstoriaWsUrl } from './api';

type MessageHandler = (data: string) => void;
type VoidHandler = () => void;

let socket: WebSocket | null = null;
let acquireCount = 0;

const messageHandlers = new Set<MessageHandler>();
const openHandlers = new Set<VoidHandler>();
const closeHandlers = new Set<VoidHandler>();

const pendingSend: string[] = [];

function flushPendingSend(): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }
  while (pendingSend.length > 0) {
    const chunk = pendingSend.shift();
    if (chunk !== undefined) {
      socket.send(chunk);
    }
  }
}

function notifyOpen(): void {
  openHandlers.forEach((h) => {
    h();
  });
}

function notifyClose(): void {
  closeHandlers.forEach((h) => {
    h();
  });
}

function attachListeners(instance: WebSocket): void {
  instance.onopen = () => {
    flushPendingSend();
    notifyOpen();
  };
  instance.onmessage = (ev: MessageEvent<string | Blob | ArrayBuffer>) => {
    const data =
      typeof ev.data === 'string' ? ev.data : String(ev.data);
    for (const h of Array.from(messageHandlers)) {
      h(data);
    }
  };
  instance.onclose = () => {
    socket = null;
    pendingSend.length = 0;
    notifyClose();
  };
}

function openSocketIfNeeded(): void {
  const needsNew =
    !socket ||
    socket.readyState === WebSocket.CLOSED ||
    socket.readyState === WebSocket.CLOSING;

  if (!needsNew) {
    return;
  }

  socket = new WebSocket(getClasstoriaWsUrl());
  attachListeners(socket);
}

export function socketAcquire(): void {
  acquireCount += 1;
  openSocketIfNeeded();
}

export function socketRelease(): void {
  acquireCount = Math.max(0, acquireCount - 1);
  if (acquireCount === 0 && socket) {
    socket.close();
    socket = null;
    pendingSend.length = 0;
    notifyClose();
  }
}

export function socketReset(): void {
  acquireCount = 0;
  if (socket) {
    socket.close();
    socket = null;
  }
  pendingSend.length = 0;
  notifyClose();
}

export function getSocketReadyState(): number {
  return socket?.readyState ?? WebSocket.CLOSED;
}

export function socketEnsureConnected(): void {
  if (acquireCount <= 0) {
    return;
  }
  const state = getSocketReadyState();
  if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
    return;
  }
  openSocketIfNeeded();
}

export function waitForSocketOpen(timeoutMs: number): Promise<void> {
  socketEnsureConnected();
  if (getSocketReadyState() === WebSocket.OPEN) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(new Error('WebSocket: таймаут подключения'));
    }, timeoutMs);

    const unsubOpen = socketSubscribeOpen(() => {
      if (settled || getSocketReadyState() !== WebSocket.OPEN) {
        return;
      }
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      resolve();
    });

    const unsubClose = socketSubscribeClose(() => {
      if (settled) {
        return;
      }
      if (getSocketReadyState() === WebSocket.CLOSED) {
        settled = true;
        window.clearTimeout(timer);
        cleanup();
        reject(new Error('WebSocket: соединение закрыто'));
      }
    });

    function cleanup(): void {
      unsubOpen();
      unsubClose();
    }
  });
}

export function socketSend(data: string): void {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(data);
    return;
  }
  if (socket?.readyState === WebSocket.CONNECTING) {
    pendingSend.push(data);
    return;
  }
}

export function socketSubscribeMessage(handler: MessageHandler): () => void {
  messageHandlers.add(handler);
  return () => {
    messageHandlers.delete(handler);
  };
}

export function socketSubscribeOpen(handler: VoidHandler): () => void {
  openHandlers.add(handler);
  return () => {
    openHandlers.delete(handler);
  };
}

export function socketSubscribeClose(handler: VoidHandler): () => void {
  closeHandlers.add(handler);
  return () => {
    closeHandlers.delete(handler);
  };
}
