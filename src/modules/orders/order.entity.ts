import { OrderStatus, OrderType, MarketOrderInput } from './order.types';

export class Order {
    public readonly id: string;
    public readonly type: OrderType = 'market';
    public readonly tokenIn: string;
    public readonly tokenOut: string;
    public readonly amountIn: number;
    public readonly slippageBps: number;


    public status: OrderStatus;
    public txHash?: string;
    public failureReason?: string;
    public quotedAmountOut?: number;
    public dex?: string;

    public readonly createdAt: Date;
    public updatedAt: Date;

    constructor(id: string, input: MarketOrderInput) {
        this.id = id;

        this.tokenIn = input.tokenIn;
        this.tokenOut = input.tokenOut;
        this.amountIn = input.amountIn;
        this.slippageBps = input.slippageBps;

        this.status = OrderStatus.PENDING;

        this.createdAt = new Date();
        this.updatedAt = new Date();
    }


    acceptQuote(quote: any): void {
        if (!quote || !quote.amountOut || !quote.dex) {
            throw new Error('Invalid quote object');
        }
        this.quotedAmountOut = quote.amountOut;
        this.dex = quote.dex;
    }

    validateSlippage(amountOut: number): void {
        if (!this.quotedAmountOut) {
            throw new Error('Slippage check failed: No quote available');
        }

        const minAmountOut = this.quotedAmountOut * (1 - this.slippageBps / 10000);

        if (amountOut < minAmountOut) {
            throw new Error(`Slippage exceeded: Expected >= \${minAmountOut}, got \${amountOut}`);
        }
    }


    transition(next: OrderStatus): void {
        if (this.status === next) {
            return; // idempotent retry safety
        }

        if (
            this.status === OrderStatus.CONFIRMED ||
            this.status === OrderStatus.FAILED
        ) {
            return;
        }


        const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
            [OrderStatus.PENDING]: [OrderStatus.ROUTING],

            [OrderStatus.ROUTING]: [
                OrderStatus.QUOTED, // Inserted
                OrderStatus.BUILDING,
                OrderStatus.FAILED,
            ],

            [OrderStatus.QUOTED]: [
                OrderStatus.SUBMITTED,
                OrderStatus.FAILED,
            ],

            [OrderStatus.BUILDING]: [
                OrderStatus.SUBMITTED,
                OrderStatus.FAILED,
            ],

            [OrderStatus.SUBMITTED]: [
                OrderStatus.CONFIRMED,
                OrderStatus.FAILED,
            ],

            [OrderStatus.CONFIRMED]: [],
            [OrderStatus.FAILED]: [],
        };

        const allowedNextStates = allowedTransitions[this.status];

        if (!allowedNextStates.includes(next)) {
            throw new Error(
                `Invalid order state transition: ${this.status} -> ${next}`
            );
        }

        this.status = next;
        this.updatedAt = new Date();
    }

    markConfirmed(txHash: string): void {
        if (this.status === OrderStatus.CONFIRMED) {
            return;
        }

        if (this.status !== OrderStatus.SUBMITTED) {
            console.warn(`[Order Entity] Unexpected state for confirmation: ${this.status}. Proceeding anyway for demo robustness.`);
        }

        this.status = OrderStatus.CONFIRMED;
        this.txHash = txHash;
        this.updatedAt = new Date();
    }

    markFailed(reason: string): void {
        if (
            this.status === OrderStatus.CONFIRMED ||
            this.status === OrderStatus.FAILED
        ) {
            return;
        }

        this.status = OrderStatus.FAILED;
        this.failureReason = reason;
        this.updatedAt = new Date();
    }
}
