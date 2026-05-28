import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdSDK } from '../../src/integrations/AdSDK';

describe('AdSDK', () => {
    beforeEach(() => {
        // Reset
        (AdSDK as any).initialized = false;
        delete (window as any).gdsdk;
    });

    it('SDK 미로드 시 init은 경고만 — initialized false 유지', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        await AdSDK.init();
        expect((AdSDK as any).initialized).toBe(false);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });

    it('SDK 로드 시 init은 initialized true', async () => {
        (window as any).gdsdk = {
            showAd: vi.fn().mockResolvedValue(undefined),
        };
        await AdSDK.init();
        expect((AdSDK as any).initialized).toBe(true);
    });

    it('rewardedBreak: SDK 없으면 noop 모드로 true', async () => {
        const result = await AdSDK.rewardedBreak();
        expect(result).toBe(true);
    });

    it('rewardedBreak: SDK 있으면 showAd("rewarded") 호출 후 true', async () => {
        (window as any).gdsdk = {
            showAd: vi.fn().mockResolvedValue(undefined),
        };
        await AdSDK.init();
        const result = await AdSDK.rewardedBreak();
        expect(result).toBe(true);
        expect((window as any).gdsdk.showAd).toHaveBeenCalledWith('rewarded');
    });

    it('rewardedBreak: showAd 실패 시 false 반환', async () => {
        (window as any).gdsdk = {
            showAd: vi.fn().mockRejectedValue(new Error('ad failed')),
        };
        await AdSDK.init();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = await AdSDK.rewardedBreak();
        expect(result).toBe(false);
        warn.mockRestore();
    });
});
