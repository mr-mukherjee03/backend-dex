# Order Execution Engine - Skeleton

This skeleton implements a modular architecture:
- modules/orders => business domain
- modules/dex => DEX adapters + aggregator
- infra => HTTP, WebSocket, Redis, Queue, DB clients
- shared => logger, utils

How to use:
1. Install Node.js and TypeScript
2. `npm init` and add TypeScript + Fastify + BullMQ + Redis deps
3. Implement infra client details and run `ts-node src/app.ts`
