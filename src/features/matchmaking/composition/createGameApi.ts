import type { ApiHandlerResponse, ApiRequest } from '@ankhorage/api';
import { createApiRuntime } from '@ankhorage/api';

import { getGameService } from './getGameService.ts';

const cookieName = 'chess_session';
const headers = { 'cache-control': 'private, no-store', 'content-type': 'application/json' };

/*** Expose exactly one Ankhorage API endpoint through the Next.js transport adapter. */
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
    handlers: {
      'game.read': (request: ApiRequest): ApiHandlerResponse => {
        const token = readToken(request.headers.cookie);
        return { headers, body: { match: token ? getGameService().snapshot(token) : null } };
      },
      'game.write': (request: ApiRequest): ApiHandlerResponse => {
        const { origin } = request.headers;
        const host = request.headers['x-forwarded-host'] ?? request.headers.host;
        if (origin && host && new URL(origin).host !== host)
          return { status: 403, headers, body: { error: 'Origin rejected' } };
        if (!isRecord(request.body) || typeof request.body.action !== 'string')
          return { status: 400, headers, body: { error: 'Invalid command' } };
        const service = getGameService();
        const token = readToken(request.headers.cookie);
        try {
          if (request.body.action === 'join') {
            const joined = service.join(token, request.body.template);
            return {
              headers: {
                ...headers,
                'set-cookie': `${cookieName}=${joined.token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
              },
              body: { match: joined.match },
            };
          }
          if (!token) return { status: 401, headers, body: { error: 'No session' } };
          const result = service.execute(
            token,
            request.body as Parameters<typeof service.execute>[1],
          );
          return {
            headers:
              request.body.action === 'leave'
                ? {
                    ...headers,
                    'set-cookie': `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
                  }
                : headers,
            body: { match: result },
          };
        } catch (error) {
          return {
            status: 409,
            headers,
            body: { error: error instanceof Error ? error.message : 'Invalid request' },
          };
        }
      },
    },
  });
}

/*** Return an opaque server-generated session token from an HTTP cookie header. */
function readToken(cookie: string | undefined): string | undefined {
  const raw = cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));
  const token = raw?.slice(cookieName.length + 1);
  return token && /^[a-f0-9-]{36}$/.test(token) ? token : undefined;
}

/*** Guard the boundary before interpreting untrusted request JSON. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
