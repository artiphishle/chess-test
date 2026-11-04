import { randomUUID } from 'node:crypto';

import type { ApiHandlerResponse, ApiRequest } from '@ankhorage/api';
import { createApiRuntime } from '@ankhorage/api';

import { getGameService } from './getGameService.ts';

const cookieName = 'chess_session';
const headers = { 'cache-control': 'private, no-store', 'content-type': 'application/json' };

/*** Bind the chess HTTP operations to the portable Ankhorage API runtime. */
export function createGameApi() {
  return createApiRuntime({
    definition: {
      id: 'chess-test',
      origin: 'internal',
      protocol: 'rest',
      basePath: '/api',
      endpoints: {
        game: {
          id: 'game',
          kind: 'http',
          operations: {
            'game.read': {
              id: 'game.read',
              protocol: 'http',
              intent: 'read',
              method: 'GET',
              path: '/game',
            },
            'game.write': {
              id: 'game.write',
              protocol: 'http',
              intent: 'action',
              method: 'POST',
              path: '/game',
            },
          },
        },
      },
    },
    handlers: { 'game.read': readGame, 'game.write': writeGame },
  });
}

/*** Return only the session holder's authorized game snapshot. */
function readGame(request: ApiRequest): ApiHandlerResponse {
  const identity = readIdentity(request.headers);
  const service = getGameService();
  return {
    headers,
    body: { matches: identity ? service.games(identity) : [], lobby: service.lobby() },
  };
}

/*** Apply a validated session command, isolating HTTP details from match state. */
function writeGame(request: ApiRequest): ApiHandlerResponse {
  if (!isSameOrigin(request.headers))
    return { status: 403, headers, body: { error: 'Origin rejected' } };
  if (!isRecord(request.body) || typeof request.body.action !== 'string') {
    return { status: 400, headers, body: { error: 'Invalid command' } };
  }
  const tabId = readTabId(request.headers['x-chess-tab-id']);
  if (!tabId) return { status: 400, headers, body: { error: 'Missing tab identity' } };
  const service = getGameService();
  const browserId = readToken(request.headers.cookie);
  try {
    if (request.body.action === 'create' || request.body.action === 'join')
      return createOrJoinGame(service, browserId, tabId, request.body);
    if (!browserId) return { status: 401, headers, body: { error: 'No session' } };
    if (typeof request.body.matchId !== 'string' || !request.body.matchId) {
      return { status: 400, headers, body: { error: 'Missing match ID' } };
    }
    const match = service.execute(
      `${browserId}:${tabId}`,
      request.body.matchId,
      request.body as Parameters<typeof service.execute>[2],
    );
    return { headers, body: { match } };
  } catch (error) {
    return {
      status: 409,
      headers,
      body: { error: error instanceof Error ? error.message : 'Invalid request' },
    };
  }
}

/*** Create a public offer or claim a named waiting seat with cookie-scoped identity. */
function createOrJoinGame(
  service: ReturnType<typeof getGameService>,
  browserId: string | undefined,
  tabId: string,
  body: Record<string, unknown>,
): ApiHandlerResponse {
  const verifiedBrowserId = browserId ?? randomUUID();
  const identity = `${verifiedBrowserId}:${tabId}`;
  const joined =
    body.action === 'create'
      ? service.create(identity, body.template)
      : service.join(identity, typeof body.matchId === 'string' ? body.matchId : '');
  return {
    headers: browserId
      ? headers
      : {
          ...headers,
          'set-cookie': `${cookieName}=${verifiedBrowserId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
        },
    body: { match: joined.match },
  };
}

/*** Reject mismatched request origins without trusting arbitrary forwarded origins. */
function isSameOrigin(headers: ApiRequest['headers']): boolean {
  const { origin } = headers;
  const host = headers['x-forwarded-host'] ?? headers.host;
  if (!origin || !host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/*** Read an opaque server-generated session token from the HTTP Cookie header. */
function readToken(cookie: string | undefined): string | undefined {
  const raw = cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));
  const token = raw?.slice(cookieName.length + 1);
  return token && /^[a-f0-9-]{36}$/.test(token) ? token : undefined;
}

/*** Guard the HTTP boundary before interpreting untrusted JSON. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/*** Scope one anonymous player to a valid shared browser cookie and a unique tab identifier. */
function readIdentity(headerValues: ApiRequest['headers']): string | undefined {
  const browserId = readToken(headerValues.cookie);
  const tabId = readTabId(headerValues['x-chess-tab-id']);
  return browserId && tabId ? `${browserId}:${tabId}` : undefined;
}

/*** Reject missing, malformed or oversized tab identities at the HTTP boundary. */
function readTabId(value: string | undefined): string | undefined {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)
    ? value
    : undefined;
}
