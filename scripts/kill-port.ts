import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const PORT = 1420;

async function killPort(port: number): Promise<void> {
    try {
        console.log(`🔍 Checking for processes on port ${port}...`);

        // Windows: Use netstat to find and kill the process
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);

        if (!stdout.trim()) {
            console.log(`✅ Port ${port} is already free`);
            return;
        }

        // Extract PID from netstat output
        const lines = stdout.trim().split('\n');
        const pids = new Set<string>();

        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0') {
                pids.add(pid);
            }
        }

        if (pids.size === 0) {
            console.log(`✅ Port ${port} is already free`);
            return;
        }

        console.log(`⚠️  Found ${pids.size} process(es) using port ${port}`);

        for (const pid of pids) {
            try {
                await execAsync(`taskkill /F /PID ${pid}`);
                console.log(`✅ Killed process ${pid}`);
            } catch (error) {
                console.warn(`⚠️  Failed to kill process ${pid}:`, (error as Error).message);
            }
        }

        console.log(`✅ Port ${port} is now free`);
    } catch (error: any) {
        // Exit code 1 from findstr means no matches found = port is free
        if (error.code === 1) {
            console.log(`✅ Port ${port} is already free`);
        } else {
            console.error(`❌ Error checking port ${port}:`, error.message);
            process.exit(1);
        }
    }
}

// Run the script
killPort(PORT).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
