declare global {
    interface Window {
        gdsdk?: {
            showAd(type?: 'interstitial' | 'rewarded'): Promise<void>;
            preloadAd?(type: 'interstitial' | 'rewarded'): Promise<void>;
        };
        GD_OPTIONS?: Record<string, unknown>;
    }
}

export class AdSDK {
    private static initialized = false;

    static async init(): Promise<void> {
        if (this.initialized) return;
        if (!window.gdsdk) {
            console.warn('[AdSDK] GameDistribution SDK not loaded — noop mode');
            return;
        }
        // SDK 가 자체 init — wrapper 는 ready 만 체크
        this.initialized = true;
        console.log('[AdSDK] GameDistribution initialized');
    }

    static gameLoadingFinished(): void {
        // GD 는 자체 detect, no-op
    }

    static gameplayStart(): void {
        // GD 는 자체 detect
    }

    static gameplayStop(): void {
        // GD 는 자체 detect
    }

    /** 인터스티셜 광고 (게임 흐름 중단) */
    static async commercialBreak(): Promise<void> {
        if (!this.initialized || !window.gdsdk) return;
        try {
            await window.gdsdk.showAd('interstitial');
        } catch (e) {
            console.warn('[AdSDK] commercialBreak failed:', e);
        }
    }

    /** 보상형 광고 — 사용자가 명시적으로 시청 선택 (부활/추가 카드 등) */
    static async rewardedBreak(): Promise<boolean> {
        if (!this.initialized || !window.gdsdk) {
            console.log('[AdSDK] rewardedBreak (noop in non-publisher mode → success)');
            return true;
        }
        try {
            await window.gdsdk.showAd('rewarded');
            return true;
        } catch (e) {
            console.warn('[AdSDK] rewardedBreak failed (treating as no reward):', e);
            return false;
        }
    }
}
