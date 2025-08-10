import { exec } from 'child_process';

let serveProcess;

export default {
  e2e: {
    setupNodeEvents(on, config) {
      on('before:run', () => {
        serveProcess = exec('npx serve ./website -l 9000');
        console.log('Static server started with serve');
      });

      on('after:run', () => {
        if (serveProcess) {
          serveProcess.kill();
          console.log('Static server stopped');
        }
      });

      return config;
    },
  },
};
