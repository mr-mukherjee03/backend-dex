
import { Connection } from '@solana/web3.js';
import { logger } from '../../shared/logger';
import { config } from '../../config';

export class SolanaClient {
    private connections: Connection[];

    constructor() {
        const rpcUrls = config.RPC_URLS;

        this.connections = rpcUrls.map(url => new Connection(url.trim(), 'confirmed'));

        logger.info({ count: this.connections.length }, 'Initialized Solana RPC connections');
    }

    private async getBestConnection(): Promise<Connection> {
        if (this.connections.length === 0) {
            throw new Error('No RPC connections available');
        }
        if (this.connections.length === 1) return this.connections[0]!;

        return this.connections[0]!;
    }

    public get connection(): Connection {
        return this.getConnection();
    }

    public getConnection(): Connection {
        if (this.connections.length === 0) {
            throw new Error('No RPC connections available');
        }
        const index = Math.floor(Math.random() * this.connections.length);
        return this.connections[index]!;
    }

    async getBalance(publicKey: any): Promise<number> {
        if (this.connections.length === 0) {
            throw new Error('No RPC connections available');
        }
        if (this.connections.length === 1) {
            return this.connections[0]!.getBalance(publicKey);
        }

        return Promise.any(
            this.connections.map(conn => conn.getBalance(publicKey))
        );
    }
}

export const solanaClient = new SolanaClient();
