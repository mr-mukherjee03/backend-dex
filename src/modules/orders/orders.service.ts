import { Order } from './order.entity';
import { createMarketOrder } from './order.factory';
import { MarketOrderInput } from './order.types';
import { orderRepository } from './repository/order.repository';
import { orderQueue } from '../../infra/queue/bullmq.client';
import { logger } from '../../shared/logger';


export class OrdersService {
  async submitMarketOrder(input: MarketOrderInput): Promise<{ orderId: string }> {
    const order: Order = createMarketOrder(input);

    logger.info('Creating order in DB...');
    await orderRepository.create(order);
    logger.info({ orderId: order.id }, 'Order created in DB. Adding to queue...');

    try {
      const job = await orderQueue.add(
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
      logger.info({ jobId: job.id, orderId: order.id }, 'Job added to queue');
    } catch (err) {
      logger.error({ err }, 'Failed to add job to queue');
      throw err;
    }
    return { orderId: order.id };

  }
}

export const ordersService = new OrdersService();
