import Fastify, { FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
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

  server.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  server.register(ordersController, {
    prefix: '/api/orders',
  });

  return server;
}
