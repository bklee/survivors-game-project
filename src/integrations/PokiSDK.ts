declare global {
    interface Window {
        PokiSDK?: {
            init(): Promise<void>;
            gameLoadingStart(): void;
            gameLoadingFinished(): void;
            gameplayStart(): void;
            gameplayStop(): void;
            commercialBreak(): Promise<void>;
            rewardedBreak(): Promise<boolean>;
            happyTime?(intensity: number): void;
            setDebug?(value: boolean): void;
        };
    }
}

export class PokiSDK {
    private static initialized = false;

    static async init(): Promise<void> {
        if (this.initialized) return;
        if (!window.PokiSDK) {
            console.warn(
                '[Poki] SDK not loaded — running in non-Poki mode (local dev or Poki cdn blocked)',
            );
            return;
        }
        try {
            await window.PokiSDK.init();
            window.PokiSDK.gameLoadingStart();
            this.initialized = true;
            console.log('[Poki] initialized');
        } catch (e) {
            console.error('[Poki] init failed:', e);
        }
    }

    static gameLoadingFinished(): void {
        if (!this.initialized || !window.PokiSDK) return;
        window.PokiSDK.gameLoadingFinished();
    }

    /** 게임플레이 시작 — 광고 차단 시점 */
    static gameplayStart(): void {
        if (!this.initialized || !window.PokiSDK) return;
        window.PokiSDK.gameplayStart();
    }

    /** 게임플레이 종료 — 광고 표시 허용 */
    static gameplayStop(): void {
        if (!this.initialized || !window.PokiSDK) return;
        window.PokiSDK.gameplayStop();
    }

    /** 인터스티셜 광고 (게임 흐름 중단) */
    static async commercialBreak(): Promise<void> {
        if (!this.initialized || !window.PokiSDK) return;
        await window.PokiSDK.commercialBreak();
    }

    /** 보상형 광고 — 사용자가 명시적으로 시청 선택 (부활/2x XP/추가 카드 등) */
    static async rewardedBreak(): Promise<boolean> {
        if (!this.initialized || !window.PokiSDK) {
            // Poki 미통합 시 dev 모드 — 항상 성공 처리 (테스트 용이)
            console.log('[Poki] rewardedBreak (no-op in non-Poki mode → success)');
            return true;
        }
        try {
            return await window.PokiSDK.rewardedBreak();
        } catch (e) {
            console.error('[Poki] rewardedBreak failed:', e);
            return false;
        }
    }

    /** 게임이 잘 진행 중임을 알림 (Poki에 retention 신호) */
    static happyTime(intensity: number = 1): void {
        if (!this.initialized || !window.PokiSDK) return;
        window.PokiSDK.happyTime?.(intensity);
    }
}
