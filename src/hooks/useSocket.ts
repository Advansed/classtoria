import { useCallback, useEffect, useState } from 'react';
import {
  getSocketReadyState,
  socketAcquire,
  socketRelease,
  socketSend,
  socketSubscribeClose,
  socketSubscribeMessage,
  socketSubscribeOpen,
} from '../socketStore';

export type UseSocketOptions = {
  managed?: boolean;
  onMessage?: (data: string) => void;
};

export function useSocket(options: UseSocketOptions = {}) {
  const { managed = true, onMessage } = options;
  const [readyState, setReadyState] = useState(getSocketReadyState);

  useEffect(() => {
    if (!managed) {
      return;
    }
    socketAcquire();
    setReadyState(getSocketReadyState());
    return () => {
      socketRelease();
    };
  }, [managed]);

  useEffect(() => {
    setReadyState(getSocketReadyState());
    const unsubOpen = socketSubscribeOpen(() => {
      setReadyState(getSocketReadyState());
    });
    const unsubClose = socketSubscribeClose(() => {
      setReadyState(getSocketReadyState());
    });
    return () => {
      unsubOpen();
      unsubClose();
    };
  }, []);

  useEffect(() => {
    if (!onMessage) {
      return;
    }
    return socketSubscribeMessage(onMessage);
  }, [onMessage]);

  const connect = useCallback(() => {
    socketAcquire();
    setReadyState(getSocketReadyState());
  }, []);

  const disconnect = useCallback(() => {
    socketRelease();
    setReadyState(getSocketReadyState());
  }, []);

  const send = useCallback((data: string) => {
    socketSend(data);
  }, []);

  return {
    readyState,
    connected: readyState === WebSocket.OPEN,
    connecting: readyState === WebSocket.CONNECTING,
    connect,
    disconnect,
    send,
  };
}
