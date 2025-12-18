import { Queue } from 'bullmq';
import { redis } from '../redis/redis.client';

export const orderQueue = new Queue('order-execution', {
  connection: redis,
});

export async function initQueue() {
  // BullMQ queues connect lazily
}
