import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { API_BASE_URL, rotateTokens } from './api';
import { useAuth } from '../features/auth/authContext';

/** Server events (see backend/src/realtime.js). */
export type LiveEvent = 'odds' | 'matches:changed' | 'admin:changed' | 'permissions:changed' | 'config:changed';

let socket: Socket | null = null;
let tokenRef: string | null = null;

let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryDelay = 1000;

/**
 * One socket for the whole panel; the latest access token is sent on every
 * (re)connect. Socket.IO retries by itself when the server is unreachable,
 * but not when the server refuses the handshake — which is what an expired
 * access token gets (e.g. the panel was open across a backend restart). So a
 * refusal refreshes the token and tries again, backing off up to 30 s.
 */
function getSocket(token: string): Socket {
  tokenRef = token;
  if (!socket) {
    const live = io(API_BASE_URL.replace(/\/api\/?$/, ''), {
      transports: ['websocket'],
      auth: (cb) => cb({ token: tokenRef }),
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
    live.on('connect', () => {
      retryDelay = 1000;
    });
    live.on('connect_error', async () => {
      if (live.active || retryTimer) return; // unreachable: Socket.IO keeps retrying on its own
      if (tokenRef) {
        const fresh = await rotateTokens(tokenRef);
        if (fresh) tokenRef = fresh;
      }
      retryTimer = setTimeout(() => {
        retryTimer = null;
        if (socket === live) live.connect();
      }, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 30000);
    });
    socket = live;
  }
  return socket;
}

/** Closes the socket on sign-out. */
export function closeRealtime() {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  socket?.disconnect();
  socket = null;
  tokenRef = null;
}

/**
 * Calls `onChange` when any of `events` arrives — at most once per
 * `minIntervalMs` (odds can move every second; a page reload shouldn't).
 */
export function useLiveRefresh(events: LiveEvent[], onChange: () => void, minIntervalMs = 2000) {
  const { accessToken } = useAuth();
  const callback = useRef(onChange);
  callback.current = onChange;
  const key = events.join(',');

  useEffect(() => {
    if (!accessToken) return undefined;
    const live = getSocket(accessToken);
    let last = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const fire = () => {
      const wait = last + minIntervalMs - Date.now();
      if (wait <= 0) {
        last = Date.now();
        callback.current();
      } else if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          last = Date.now();
          callback.current();
        }, wait);
      }
    };
    const names = key.split(',') as LiveEvent[];
    names.forEach((name) => live.on(name, fire));
    // Anything pushed while the socket was down is missed: a reconnect refreshes too.
    let seenConnect = live.connected;
    const onConnect = () => {
      if (seenConnect) fire();
      seenConnect = true;
    };
    live.on('connect', onConnect);
    return () => {
      names.forEach((name) => live.off(name, fire));
      live.off('connect', onConnect);
      if (timer) clearTimeout(timer);
    };
  }, [accessToken, key, minIntervalMs]);
}
