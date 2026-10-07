import { spawn, execSync } from 'child_process';

let serveProcess;
// Not 9000, so npm start can stay up while the tests run
const port = 9100;
const appUrl = 'http://localhost:' + port + '/';

// The specs fail wholesale if they start before the server answers
async function waitForServer() {
  for (let tries = 0; tries < 60; tries++) {
    try {
      await fetch(appUrl);
      return;
    } catch (err) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error('Static server did not start on ' + appUrl);
}

// A server left over from the last run would answer for a new one that never started
async function waitForPortFree() {
  for (let tries = 0; tries < 40; tries++) {
    try {
      await fetch(appUrl);
    } catch (err) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Port ' + port + ' is still in use');
}

// npx runs serve as a child of its own, so the whole tree has to go
function stopServer() {
  if (!serveProcess) { return; }
  if (process.platform === 'win32') {
    try { execSync(`taskkill /pid ${serveProcess.pid} /T /F`, { stdio: 'ignore' }); } catch (err) { /* already gone */ }
  } else {
    try { process.kill(-serveProcess.pid); } catch (err) { /* already gone */ }
  }
  serveProcess = null;
}

export default {
  e2e: {
    // Nothing here waits on an animation, and the apps' clocks are frozen in the tests
    waitForAnimations: false,
    env: { appUrl: 'localhost:' + port },
    setupNodeEvents(on, config) {
      on('before:run', async () => {
        await waitForPortFree();
        serveProcess = spawn('npx serve ./website -l ' + port + ' --no-port-switching', { shell: true, stdio: 'ignore', detached: process.platform !== 'win32' });
        await waitForServer();
        console.log('Static server started with serve');
      });

      on('after:run', () => {
        stopServer();
        console.log('Static server stopped');
      });

      return config;
    },
  },
};
