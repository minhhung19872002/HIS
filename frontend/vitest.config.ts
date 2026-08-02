import { defineConfig } from 'vitest/config';

// #212: unit-test harness — tách khỏi build prod (script test:unit riêng).
// happy-dom vì apiClient đụng window/localStorage khi import.
export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
