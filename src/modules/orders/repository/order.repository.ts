import { prisma } from '../../../infra/db/prisma.client';
import { Order } from '../order.entity';
import { OrderStatus } from '../order.types';
import { $Enums } from '@prisma/client';

function mapDbStatusToDomain(status: $Enums.OrderStatus): OrderStatus {
  return status as OrderStatus;
}


export class OrderRepository {
  async create(order: Order): Promise<void> {
    await prisma.order.create({
      data: {
        id: order.id,
        type: order.type,
        tokenIn: order.tokenIn,
        tokenOut: order.tokenOut,
        amountIn: order.amountIn,
        slippageBps: order.slippageBps,
        status: order.status as $Enums.OrderStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
  }

  async findById(id: string): Promise<Order | null> {
    const row = await prisma.order.findUnique({ where: { id } });
    if (!row) return null;

    const order = new Order(row.id, {
      tokenIn: row.tokenIn,
      tokenOut: row.tokenOut,
      amountIn: row.amountIn,
      slippageBps: row.slippageBps,
    });

    order.status = mapDbStatusToDomain(row.status);

    if (row.txHash !== null) {
      order.txHash = row.txHash;
    }

    if (row.failureReason !== null) {
      order.failureReason = row.failureReason;
    }

    if (row.quotedAmountOut !== null) {
      order.quotedAmountOut = row.quotedAmountOut;
    }

    if (row.dex !== null) {
      order.dex = row.dex;
    }

    order.updatedAt = row.updatedAt;
    return order;
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    data?: {
      txHash?: string;
      failureReason?: string;
      quotedAmountOut?: number;
      dex?: string;
    }
  ): Promise<void> {
    const updateData: {
      status: $Enums.OrderStatus;
      updatedAt: Date;
      txHash?: string | null;
      failureReason?: string | null;
      quotedAmountOut?: number | null;
      dex?: string | null;
    } = {
      status: status as $Enums.OrderStatus,
      updatedAt: new Date(),
    };

    if (data?.txHash !== undefined) {
      updateData.txHash = data.txHash;
    }

    if (data?.failureReason !== undefined) {
      updateData.failureReason = data.failureReason;
    }

    if (data?.quotedAmountOut !== undefined) {
      updateData.quotedAmountOut = data.quotedAmountOut;
    }

    if (data?.dex !== undefined) {
      updateData.dex = data.dex;
    }

    await prisma.order.update({
      where: { id },
      data: updateData,
    });
  }
}

export const orderRepository = new OrderRepository();
