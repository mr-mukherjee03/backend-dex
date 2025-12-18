import IORedis from 'ioredis';
import { config } from '../../config';

export const redis = new IORedis(config.REDIS_URL, {

  maxRetriesPerRequest: null,

});

export async function initRedis() {
  await redis.ping();
}





