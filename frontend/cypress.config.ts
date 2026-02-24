import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3001',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    setupNodeEvents(on, config) {
      // Log browser console output
      try {
        const logToOutput = require('cypress-log-to-output');
        logToOutput.install(on, (type: string, event: any) => {
          // Only capture errors and warnings
          return type === 'console' && (event.level === 'error' || event.level === 'warning');
        });
      } catch (e) {
        // Plugin not available, skip
      }
    },
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },
})
