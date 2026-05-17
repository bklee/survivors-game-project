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
        },
    };
});
