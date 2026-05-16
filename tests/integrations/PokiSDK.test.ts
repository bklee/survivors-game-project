import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PokiSDK } from '../../src/integrations/PokiSDK';

describe('PokiSDK', () => {
    beforeEach(() => {
        // Reset
        (PokiSDK as any).initialized = false;
        delete (window as any).PokiSDK;
    });

    it('SDK 미로드 시 init은 경고만 — initialized false 유지', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        await PokiSDK.init();
        expect((PokiSDK as any).initialized).toBe(false);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });

    it('SDK 로드 시 init은 initialized true', async () => {
        (window as any).PokiSDK = {
            init: vi.fn().mockResolvedValue(undefined),
            gameLoadingStart: vi.fn(),
            gameLoadingFinished: vi.fn(),
            gameplayStart: vi.fn(),
            gameplayStop: vi.fn(),
            commercialBreak: vi.fn().mockResolvedValue(undefined),
            rewardedBreak: vi.fn().mockResolvedValue(true),
        };
        await PokiSDK.init();
        expect((PokiSDK as any).initialized).toBe(true);
        expect((window as any).PokiSDK.gameLoadingStart).toHaveBeenCalled();
    });

    it('rewardedBreak: SDK 없으면 dev 모드로 true', async () => {
        const result = await PokiSDK.rewardedBreak();
        expect(result).toBe(true);
    });

    it('rewardedBreak: SDK 있으면 SDK 결과 반환', async () => {
        (window as any).PokiSDK = {
            init: vi.fn().mockResolvedValue(undefined),
            gameLoadingStart: vi.fn(),
            gameLoadingFinished: vi.fn(),
            gameplayStart: vi.fn(),
            gameplayStop: vi.fn(),
            commercialBreak: vi.fn(),
            rewardedBreak: vi.fn().mockResolvedValue(false),
        };
        await PokiSDK.init();
        const result = await PokiSDK.rewardedBreak();
        expect(result).toBe(false);
    });
});
