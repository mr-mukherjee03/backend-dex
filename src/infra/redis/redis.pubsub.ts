// redis.pubsub.ts
import IORedis from "ioredis";
import { config } from "../../config";
import { OrderStatus } from "../../modules/orders/order.types";

export type OrderEvent = {
    orderId: string;
    status: OrderStatus;
    txHash?: string;
    error?: string;
    timestamp: string;
};

const CHANNEL_PREFIX = "order-events:";
export const orderEventChannel = (orderId: string) =>
    `${CHANNEL_PREFIX}${orderId}`;

// 🔹 Dedicated publisher connection
const pubRedis = new IORedis(config.REDIS_URL, {
    tls: { rejectUnauthorized: false },
    maxRetriesPerRequest: null,
});

// 🔹 Dedicated subscriber connection
const subRedis = new IORedis(config.REDIS_URL, {
    tls: { rejectUnauthorized: false },
    maxRetriesPerRequest: null,
});

pubRedis.on("connect", () => console.log("Redis publisher connected"));
subRedis.on("connect", () => console.log("Redis subscriber connected"));

pubRedis.on("error", console.error);
subRedis.on("error", console.error);

// -------- Publish --------
export async function publishOrderEvent(event: OrderEvent) {
    await pubRedis.publish(
        orderEventChannel(event.orderId),
        JSON.stringify(event)
    );
}

// -------- Subscribe --------
export async function subscribeToOrderEvents(
    orderId: string,
    handler: (event: OrderEvent) => void
) {
    const channel = orderEventChannel(orderId);

    await subRedis.subscribe(channel);

    subRedis.on("message", (ch, msg) => {
        if (ch !== channel) return;
        handler(JSON.parse(msg));
    });
}
