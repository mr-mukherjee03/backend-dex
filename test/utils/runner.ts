export async function test(name: string, fn: () => Promise<void>): Promise<boolean> {
    try {
        await fn();
        console.log(`TEST PASSED: ${name}`);
        return true;
    } catch (err: any) {
        console.error(`TEST FAILED: ${name}`);
        console.error(err.message);
        return false;
    }
}
