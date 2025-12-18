import { FastifyInstance } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { ordersService } from './orders.service';

const MarketOrderSchema = Type.Object({
  tokenIn: Type.String({ minLength: 1 }),
  tokenOut: Type.String({ minLength: 1 }),
  amountIn: Type.Number({ exclusiveMinimum: 0 }),
  slippageBps: Type.Number({ minimum: 0, maximum: 10_000 }),
});

type MarketOrderBody = Static<typeof MarketOrderSchema>;

export default async function ordersController(server: FastifyInstance) {
  server.post<{
    Body: MarketOrderBody;
  }>(
    '/execute',
    {
      schema: {
        body: MarketOrderSchema,
        response: {
          200: Type.Object({
            orderId: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { tokenIn, tokenOut, amountIn, slippageBps } = request.body;

      const result = await ordersService.submitMarketOrder({
        tokenIn,
        tokenOut,
        amountIn,
        slippageBps,
      });

      return reply.code(200).send(result);
    }
  );
}
