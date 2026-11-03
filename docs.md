# Development and operating constraints

Run `bun install && bun run dev`, then open <http://localhost:3000>. Use **two different browser profiles**, each with its own cookie, to join an anonymous match. The first click on **Spielen** locks the first player's chosen template into the queue; the next player joins that template regardless of their own selection.

The supplied templates are 8×8 standard chess, 10×13 Choice Coins (six N/B coins per side, fixed ten pawns, edge rooks, queen and king), and 8×8 K+B+N vs K training. The editor offers Free, Knight/Bishop, Minor, Major, Promotion and custom coin option sets. Browser-saved templates are local to that browser; each match receives a server-validated independent snapshot.

The server-side match store is deliberately in-memory and process-local. **Do not deploy with multiple Next.js replicas or serverless functions expecting shared sessions.** A Redis/PostgreSQL-backed repository and distributed transactions are required before horizontal scaling. Server restart clears waiting and ongoing games. No authentication is required; random HttpOnly cookies identify anonymous players. Anonymous users can start unlimited sessions, so public deployment also needs rate limiting.

Game rules are independent of UI and transport. On a variable board castling uses an eligible home-rank king and an edge rook with a clear, safe corridor; pawns advance toward the opposing edge. Missing kings cannot be mated. Multiple kings on one side are supported and all must remain safe. Only standard chess pieces are currently represented. This app is intended to test nonstandard setups, not to reproduce standard FEN/PGN semantics on irregular boards.

Tests: `bun run test` runs domain and matchmaking **unit tests only**; `bun run check-types` runs TypeScript checking. Further validation includes `bun run lint`, `bun run knip:check`, `bun run format:check`, and `bun run build`.
