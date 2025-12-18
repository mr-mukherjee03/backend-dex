import { Order } from './order.entity';
import { createMarketOrder } from './order.factory';
import { MarketOrderInput } from './order.types';
import { orderRepository } from './repository/order.repository';
import { orderQueue } from '../../infra/queue/bullmq.client';


export class OrdersService {
  async submitMarketOrder(input: MarketOrderInput): Promise<{ orderId: string }> {
    const order: Order = createMarketOrder(input);

    await orderRepository.create(order);
    await orderQueue.add(
      'execute',
      { orderId: order.id },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }
    );
    return { orderId: order.id };

  }
}

export const ordersService = new OrdersService();
