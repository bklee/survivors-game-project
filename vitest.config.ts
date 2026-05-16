import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom', // localStorage 지원 (MetaProgress 테스트)
        include: ['tests/**/*.test.ts'],
    },
});
