import { redis } from './redis.client';
import { OrderStatus } from '../../modules/orders/order.types';

export type OrderEvent = {
    orderId: string;
    status: OrderStatus;
    txHash?: string;
    error?: string;
    timestamp: string;
};

const CHANNEL_PREFIX = 'order-events:';

export const orderEventChannel = (orderId: string) => `${CHANNEL_PREFIX}${orderId}`;

export async function publishOrderEvent(event: any) {
    // Specific order channel, specific subscriber
    await redis.publish(orderEventChannel(event.orderId), JSON.stringify(event));
}

