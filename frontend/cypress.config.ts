import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3001',
    allowCypressEnv: false,
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    retries: {
      runMode: 1,
      openMode: 0,
    },
    async setupNodeEvents(on) {
      // Log browser console output
      try {
        const logToOutput = await import('cypress-log-to-output');
        const install =
          'install' in logToOutput
            ? logToOutput.install
            : logToOutput.default?.install;

        install?.(on, (type: string, event: { level?: string }) => {
          // Only capture errors and warnings
          return type === 'console' && (event.level === 'error' || event.level === 'warning');
        });
      } catch {
        // Plugin not available, skip
      }

      on('task', {
        log(message: string) {
          console.log(message);
          return null;
        },
      });
    },
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },
})
