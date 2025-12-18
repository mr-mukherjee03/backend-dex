import 'dotenv/config';
import { buildServer } from './infra/http/fastify';
import { initDb } from './infra/db/prisma.client';
import { initRedis } from './infra/redis/redis.client';
import './modules/orders/orders.worker';
import { initQueue } from './infra/queue/bullmq.client';

async function start() {
  const server = buildServer();

  await initDb();
  await initRedis();
  await initQueue();

  await server.listen({ port: Number(process.env.PORT) || 3000 });
}

start();
