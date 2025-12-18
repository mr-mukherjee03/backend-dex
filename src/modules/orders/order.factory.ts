import { randomUUID } from 'crypto';
import { Order } from './order.entity';
import { MarketOrderInput } from './order.types';

export function createMarketOrder(input: MarketOrderInput): Order {
    if (input.amountIn <= 0) {
        throw new Error('amountIn must be > 0');
    }

    if (input.slippageBps < 0 || input.slippageBps > 10_000) {
        throw new Error('invalid slippage');
    }

    const orderId = randomUUID();
    return new Order(orderId, input);
}
