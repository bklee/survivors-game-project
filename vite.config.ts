import { defineConfig } from 'vite';

// production 빌드는 games.blocktalker.co.kr/survivors/ 에 서빙되므로 절대 base 필요.
// dev 모드는 localhost:3000/ 로 그대로.
export default defineConfig(({ mode }) => ({
    base: mode === 'production' ? '/survivors/' : '/',
    server: {
        port: 3000,
    },
    build: {
        assetsInlineLimit: 0,
        target: 'esnext',
    },
}));
