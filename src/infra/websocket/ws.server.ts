import '@fastify/websocket';
import { FastifyInstance } from 'fastify';
import IORedis from 'ioredis';
import type { RawData, WebSocket } from 'ws';
import { orderEventChannel } from '../redis/redis.pubsub';

export function registerWs(server: FastifyInstance) {
  server.get(
    '/ws',
    { websocket: true },
    (socket: WebSocket) => {

      const redisSub = new IORedis(process.env.REDIS_URL!);
      let subscribedChannel: string | null = null;

      socket.on('message', async (raw: RawData) => {
        try {
          const msg = JSON.parse(raw.toString());

          if (!msg.orderId || typeof msg.orderId !== 'string') {
            socket.send(JSON.stringify({ error: 'orderId is required' }));
            return;
          }

          if (subscribedChannel) {
            socket.send(JSON.stringify({ error: 'Already subscribed' }));
            return;
          }

          subscribedChannel = orderEventChannel(msg.orderId);
          await redisSub.subscribe(subscribedChannel);

          socket.send(
            JSON.stringify({
              status: 'subscribed',
              orderId: msg.orderId,
            })
          );
        } catch {
          socket.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      redisSub.on('message', (_channel, message) => {
        socket.send(message);
      });

      socket.on('close', async () => {
        if (subscribedChannel) {
          await redisSub.unsubscribe(subscribedChannel);
        }
        redisSub.disconnect();
      });
    }
  );
}
