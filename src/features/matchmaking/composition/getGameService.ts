import { randomUUID } from 'node:crypto';

import { createInProcessGameRepository } from '../adapters/inProcessGameRepository.ts';
import { createPostgresGameRepository } from '../adapters/postgresGameRepository.ts';
import { createGameService } from '../application/createGameService.ts';

type Service = ReturnType<typeof createGameService>;
const globalServices = globalThis as typeof globalThis & { __chessTestService?: Service };

/*** Keep one matchmaking authority per long-running Node process, including Next dev refreshes. */
export function getGameService(): Service {
  return (globalServices.__chessTestService ??= createGameService(
    process.env.DATABASE_URL
      ? createPostgresGameRepository(process.env.DATABASE_URL)
      : createInProcessGameRepository(),
    randomUUID,
  ));
}
