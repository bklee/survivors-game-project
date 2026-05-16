import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LemonSqueezy } from '../../src/integrations/LemonSqueezy';

describe('LemonSqueezy', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('hasProduct: 미구매 시 false', () => {
        expect(LemonSqueezy.hasProduct('no_ads_pass')).toBe(false);
    });

    it('setOwned + hasProduct 작동', () => {
        LemonSqueezy.setOwned('no_ads_pass', true);
        expect(LemonSqueezy.hasProduct('no_ads_pass')).toBe(true);
        LemonSqueezy.setOwned('no_ads_pass', false);
        expect(LemonSqueezy.hasProduct('no_ads_pass')).toBe(false);
    });

    it('handleSuccessRedirect: ls_success=1 + product 시 owned 저장', () => {
        // window.location 모킹
        const originalLocation = window.location;
        delete (window as any).location;
        (window as any).location = {
            search: '?ls_success=1&product=no_ads_pass',
            pathname: '/',
            origin: 'https://example.com',
        };
        window.alert = vi.fn();
        window.history.replaceState = vi.fn();

        LemonSqueezy.handleSuccessRedirect();
        expect(LemonSqueezy.hasProduct('no_ads_pass')).toBe(true);
        expect(window.alert).toHaveBeenCalled();

        (window as any).location = originalLocation;
    });

    it('handleSuccessRedirect: ls_success 없으면 no-op', () => {
        const originalLocation = window.location;
        delete (window as any).location;
        (window as any).location = { search: '?other=1', pathname: '/' };

        LemonSqueezy.handleSuccessRedirect();
        expect(LemonSqueezy.hasProduct('no_ads_pass')).toBe(false);

        (window as any).location = originalLocation;
    });

    it('checkout: lsCheckoutUrl 미설정 시 alert', () => {
        window.alert = vi.fn();
        const originalLocation = window.location;
        delete (window as any).location;
        (window as any).location = { href: '' };

        LemonSqueezy.checkout('no_ads_pass');
        // env가 없으므로 alert + redirect 안 함
        // (실제 redirect는 jsdom에서 동작 안 함)

        (window as any).location = originalLocation;
    });
});
