import { runRoutingTests } from './integration/routing.test';
import { runQueueTests } from './integration/queue.test';
import { runEntityTests } from './unit/entity.test';

async function main() {
    console.log('Starting Eterna Test Suite\n');
    let totalPassed = 0;

    totalPassed += await runEntityTests();
    totalPassed += await runRoutingTests();
    totalPassed += await runQueueTests();

    console.log(`Total Tests Passed: ${totalPassed}`);
    process.exit(0);
}

main().catch(err => {
    console.error('Fatal Test Error:', err);
    process.exit(1);
});
