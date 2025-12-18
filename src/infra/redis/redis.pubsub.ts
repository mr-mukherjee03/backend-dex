import IORedis from "ioredis";
import { config } from "../../config";
import { OrderStatus } from "../../modules/orders/order.types";
import { QuoteResult } from "../../modules/dex/interfaces/dex.interface";

export type OrderEvent = {
    orderId: string;
    status: OrderStatus;
    quote?: QuoteResult;
    txHash?: string;
    error?: string;
    timestamp: string;
};

const CHANNEL_PREFIX = "order-events:";
export const orderEventChannel = (orderId: string) =>
    `${CHANNEL_PREFIX}${orderId}`;

const isTls = config.REDIS_URL.startsWith('rediss://');

// 🔹 Dedicated publisher connection
const pubRedis = new IORedis(config.REDIS_URL, {
    ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
    maxRetriesPerRequest: null,
});

// 🔹 Dedicated subscriber connection
const subRedis = new IORedis(config.REDIS_URL, {
    ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
    maxRetriesPerRequest: null,
});

pubRedis.on("connect", () => console.log("Redis publisher connected"));
subRedis.on("connect", () => console.log("Redis subscriber connected"));

pubRedis.on("error", console.error);
subRedis.on("error", console.error);

// -------- Publish --------
export async function publishOrderEvent(event: OrderEvent) {
    const channel = orderEventChannel(event.orderId);
    console.log(`[PubSub] Publishing to ${channel}`, event);
    await pubRedis.publish(
        channel,
        JSON.stringify(event)
    );
}

// -------- Subscribe --------
export async function subscribeToOrderEvents(
    orderId: string,
    handler: (event: OrderEvent) => void
) {
    const channel = orderEventChannel(orderId);
    console.log(`[PubSub] Subscribing to ${channel}`);

    await subRedis.subscribe(channel);

    subRedis.on("message", (ch, msg) => {
        if (ch !== channel) return;
        handler(JSON.parse(msg));
    });
}
