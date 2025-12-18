import IORedis from "ioredis";
import { config } from "../../config";

export const redis = new IORedis(config.REDIS_URL, {
  tls: {
    rejectUnauthorized: false,
  },
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

redis.on("connect", () => {
  console.log("Redis connected");
});

redis.on("error", (err) => {
  console.error("Redis error", err);
});

export async function initRedis() {
  await redis.ping();
}
