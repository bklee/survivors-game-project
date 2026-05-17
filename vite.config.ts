import { defineConfig } from 'vite';

// Base path 분기:
//   - POKI_BUILD=1 npm run build → base './' (Poki 호스팅 — 도메인 path 가 동적)
//   - npm run build (production)  → base '/survivors/' (games.blocktalker.co.kr/survivors/)
//   - npm run dev                 → base '/' (localhost:3000/)
export default defineConfig(({ mode }) => {
    const isPoki = process.env.POKI_BUILD === '1';
    let base = '/';
    if (mode === 'production') {
        base = isPoki ? './' : '/survivors/';
    }
    return {
        base,
        server: {
            port: 3000,
        },
        build: {
            // Poki 빌드는 별도 디렉토리로 분리 (자체 호스팅과 충돌 방지)
            outDir: isPoki ? 'dist-poki' : 'dist',
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
