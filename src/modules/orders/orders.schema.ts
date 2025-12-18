export const OrderSchema = {
  type: 'object',
  properties: {
    tokenIn: { type: 'string' },
    tokenOut: { type: 'string' },
    amount: { type: 'number' },
    orderType: { type: 'string' },
  },
  required: ['tokenIn', 'tokenOut', 'amount'],
};
