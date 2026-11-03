import { createNextJsApiRoute } from '@ankhorage/api-nextjs';
import { createGameApi } from '../../../features/matchmaking/composition/createGameApi.ts';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const api=createGameApi();
export const GET=createNextJsApiRoute(api,'game.read');
export const POST=createNextJsApiRoute(api,'game.write');
