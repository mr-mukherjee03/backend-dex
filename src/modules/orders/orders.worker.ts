import { Worker, Job } from 'bullmq';
console.log('[Worker] File Loaded');
import IORedis from 'ioredis';
import { redis } from '../../infra/redis/redis.client';
import { publishOrderEvent } from '../../infra/redis/redis.pubsub';
import { orderRepository } from './repository/order.repository';
import { OrderStatus } from './order.types';
import { dexAggregator } from '../dex/dex.aggregator';
import { logger } from '../../shared/logger';
import { config } from '../../config';

const CONCURRENCY = 10;

type OrderJob = {
  orderId: string;
};

const workerConnection = new IORedis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
});

workerConnection.on('connect', () => logger.info('Worker Redis connected'));
workerConnection.on('error', (err) => logger.error({ err }, 'Worker Redis error'));

const worker = new Worker<OrderJob>(
  'order-execution-v2',
  async (job: Job<OrderJob>) => {
    const { orderId } = job.data;
    /*
    console.log(`[Worker] Order job started: ${orderId}`);
    // throw new Error('FORCE FAIL DEBUG');
    */

    console.log(`[Worker] Order job started: ${orderId}`);

    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    try {
      order.transition(OrderStatus.ROUTING);
      await orderRepository.updateStatus(order.id, order.status);


      publishOrderEvent({
        orderId: order.id,
        status: order.status,
        timestamp: new Date().toISOString(),
      }).catch(err => logger.error({ err, orderId }, 'Failed to publish ROUTING event'));

      const bestQuote = await dexAggregator.getBestQuote({
        tokenIn: order.tokenIn,
        tokenOut: order.tokenOut,
        amountIn: order.amountIn,
      });

      order.acceptQuote(bestQuote);
      order.transition(OrderStatus.QUOTED);

      await orderRepository.updateStatus(order.id, order.status, {
        quotedAmountOut: bestQuote.amountOut,
        dex: bestQuote.dex,
      });

      publishOrderEvent({
        orderId: order.id,
        status: order.status,
        quote: bestQuote,
        timestamp: new Date().toISOString(),
      }).catch(err => logger.error({ err, orderId }, 'Failed to publish QUOTED event'));

      order.validateSlippage(bestQuote.amountOut);
      order.transition(OrderStatus.SUBMITTED);

      await orderRepository.updateStatus(order.id, order.status);

      publishOrderEvent({
        orderId: order.id,
        status: order.status,
        timestamp: new Date().toISOString(),
      }).catch(err => logger.error({ err, orderId }, 'Failed to publish SUBMITTED event'));

      const { txId } = await dexAggregator.executeSwap({
        dex: order.dex as 'raydium' | 'meteora',
        poolId: bestQuote.poolId,
        tokenIn: order.tokenIn,
        tokenOut: order.tokenOut,
        amountIn: order.amountIn,
        amountOutMin: bestQuote.amountOut
      });

      order.markConfirmed(txId);

      await orderRepository.updateStatus(order.id, order.status, {
        txHash: order.txHash!,
      });

      publishOrderEvent({
        orderId: order.id,
        status: order.status,
        txHash: order.txHash!,
        timestamp: new Date().toISOString(),
      }).catch(err => console.error('Failed to publish CONFIRMED event', err));

      console.log(`[Worker] Order confirmed: ${orderId}`);
      return { success: true };
    } catch (err: any) {

      order.markFailed(err?.message ?? 'unknown error');

      await orderRepository.updateStatus(order.id, order.status, {
        failureReason: order.failureReason!,
      });

      await publishOrderEvent({
        orderId: order.id,
        status: order.status,
        error: order.failureReason!,
        timestamp: new Date().toISOString(),
      });

      logger.error({ orderId, err }, 'Order failed');
      throw err;
    }
  },
  {
    connection: workerConnection,
    concurrency: CONCURRENCY,
    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);
export const orderWorker = worker;

orderWorker.on('ready', () => logger.info('Worker is ready to process jobs'));
orderWorker.on('error', (err) => logger.error({ err }, 'Worker error'));
orderWorker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'Job failed'));

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
