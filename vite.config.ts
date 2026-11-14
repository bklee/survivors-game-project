import { defineConfig } from 'vite';

// Base path 분기:
//   - npm run build (production)        → base '/' (survivors.blocktalker.co.kr 서브도메인 루트)
//   - npm run build -- --mode gd        → base './' (GameDistribution CDN 호스팅용 zip)
//   - npm run dev                       → base '/' (localhost:3000/)
export default defineConfig(({ mode }) => {
    const base = mode === 'gd' ? './' : '/';
    return {
        base,
        server: {
            port: 3000,
            // dev 환경에서 /api/* 호출은 prod backend 로 proxy.
            proxy: {
                '/api': {
                    target: 'https://survivors.blocktalker.co.kr',
                    changeOrigin: true,
                    secure: true,
                    followRedirects: true,
                },
            },
        },
        build: {
            outDir: 'dist',
            assetsInlineLimit: 0,
            target: 'esnext',
            // 라이브러리별 chunk 분리 — 게임 코드 수정 시에도 라이브러리 chunk 는 캐시 유지.
            // Phaser 가 가장 큰 의존성 (~1MB 차지) 이라 별도 분리하면 효과 큼.
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        if (id.includes('node_modules')) {
                            if (id.includes('phaser')) return 'phaser';
                            if (id.includes('bitecs')) return 'bitecs';
                            if (id.includes('rot-js')) return 'rot-js';
                            return 'vendor';
                        }
                    },
                },
            },
        },
    };
});
