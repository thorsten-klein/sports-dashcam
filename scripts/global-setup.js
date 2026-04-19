const { spawn, execSync } = require('child_process');
const http = require('http');

let mjpegServer;

function killExistingOnPort(port) {
  // Kill any process already bound to the port so we always start fresh.
  // This prevents stale servers (e.g., from a previous interrupted run) from
  // being used instead of the current version of dummy-mjpeg-stream.py.
  try {
    const result = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (result) {
      const pids = result.split('\n').filter(Boolean);
      pids.forEach(pid => {
        try {
          process.kill(parseInt(pid, 10), 'SIGTERM');
        } catch (_) {}
      });
      // Give the processes a moment to exit and release the port
      const deadline = Date.now() + 2000;
      while (Date.now() < deadline) {
        try {
          execSync(`lsof -ti tcp:${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
          // Still something there — wait a bit
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
        } catch (_) {
          break; // lsof exited non-zero = nothing on the port
        }
      }
    }
  } catch (_) {
    // lsof not available or nothing on the port — continue
  }
}

async function waitForServer(port, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}/stream`, (res) => {
          res.destroy();
          resolve();
        });
        req.on('error', reject);
        req.setTimeout(1000, () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });
      return true;
    } catch (e) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  throw new Error('Server did not start in time');
}

module.exports = async function globalSetup() {
  console.log('Starting MJPEG test server...');

  // Always kill any stale server on port 8900 first so we use the current
  // version of dummy-mjpeg-stream.py, not a leftover from a previous run.
  killExistingOnPort(8900);

  mjpegServer = spawn('python3', ['./scripts/dummy-mjpeg-stream.py', '--port', '8900'], {
    stdio: 'pipe',
    detached: false
  });

  // Log server output
  mjpegServer.stdout.on('data', (data) => {
    console.log(`[MJPEG Server] ${data.toString().trim()}`);
  });

  mjpegServer.stderr.on('data', (data) => {
    console.error(`[MJPEG Server Error] ${data.toString().trim()}`);
  });

  // Wait for server to be ready
  await waitForServer(8900);

  // Store PID for teardown
  global.__MJPEG_SERVER__ = mjpegServer;

  console.log('MJPEG test server started and ready');
};
