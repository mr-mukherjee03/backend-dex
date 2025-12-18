import Fastify, { FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import path from 'path';
import fastifyStatic from '@fastify/static';
import ordersController from '../../modules/orders/orders.controller';
import { registerWs } from '../websocket/ws.server';

export function buildServer(): FastifyInstance {
  const server = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  server.register(websocket);
  server.register(registerWs);

  server.register(fastifyStatic, {
    root: path.join(process.cwd(), 'public'),
    prefix: '/',
  });

  server.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  server.register(ordersController, {
    prefix: '/api/orders',
  });

  return server;
}
