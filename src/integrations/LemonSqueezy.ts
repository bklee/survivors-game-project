import { Identity } from '../core/Identity';
import { ApiClient } from './ApiClient';

export interface PaymentProduct {
    id: string;
    name: string;
    priceKrw: number;
    lsCheckoutUrl: string;
}

export const PRODUCTS: Record<string, PaymentProduct> = {
    no_ads_pass: {
        id: 'no_ads_pass',
        name: 'No-Ads Pass',
        priceKrw: 5500,
        lsCheckoutUrl: import.meta.env.VITE_LS_NO_ADS_URL || '',
    },
};

const OWNED_KEY_PREFIX = 'survivors_ls_owned_';

export class LemonSqueezy {
    /** 결제 시작 — LS 호스팅 페이지로 리다이렉트 */
    static checkout(productId: string): void {
        const product = PRODUCTS[productId];
        if (!product?.lsCheckoutUrl) {
            console.error('[LS] Product not configured:', productId);
            alert('결제 준비 중입니다. 잠시 후 다시 시도해주세요.');
            return;
        }
        const deviceId = Identity.getDeviceId();
        const url = new URL(product.lsCheckoutUrl);
        // LS custom data 전달 — webhook에서 device_id 매칭용
        url.searchParams.set('checkout[custom][device_id]', deviceId);
        url.searchParams.set('checkout[custom][product_id]', productId);
        // 결제 완료 후 돌아올 URL — BASE_URL 반영 (/survivors/ 등 서브 path 대응)
        url.searchParams.set(
            'checkout[success_url]',
            `${window.location.origin}${import.meta.env.BASE_URL}?ls_success=1&product=${productId}`,
        );
        window.location.href = url.toString();
    }

    /** 결제 완료 콜백 — LS success URL로 돌아왔을 때 */
    static handleSuccessRedirect(): void {
        const params = new URLSearchParams(window.location.search);
        if (params.get('ls_success') !== '1') return;

        const product = params.get('product');
        if (!product || !PRODUCTS[product]) return;

        // 클라이언트 1차 마킹 (서버 webhook 이 진실의 원천 — 다음 refreshFromServer 에서 확정)
        this.setOwned(product, true);
        ApiClient.trackEvent('iap_funnel_complete', { product_id: product });
        alert(`결제 완료! ${PRODUCTS[product].name}가 적용됩니다.`);
        // URL 정리 (history)
        window.history.replaceState({}, '', window.location.pathname);
    }

    /** 제품 보유 여부 (LocalStorage 캐시 — 오프라인/실패 대비 빠른 경로) */
    static hasProduct(productId: string): boolean {
        return localStorage.getItem(OWNED_KEY_PREFIX + productId) === 'true';
    }

    /**
     * 서버에서 IAP 보유 상태를 동기화하여 LocalStorage 캐시를 갱신한다.
     * 게임 시작 시 1회 호출. 네트워크 실패 시 기존 캐시 유지.
     * No-Ads Pass 외 제품은 현재 LocalStorage 폴백만 사용.
     */
    static async refreshFromServer(): Promise<void> {
        try {
            const player = await ApiClient.getPlayer();
            if (player.exists) {
                this.setOwned('no_ads_pass', !!player.no_ads_pass);
            }
        } catch (err) {
            console.warn('[LS] refreshFromServer failed:', err);
        }
    }

    /** 보유 상태 설정 (테스트 + success redirect 용) */
    static setOwned(productId: string, owned: boolean): void {
        if (owned) {
            localStorage.setItem(OWNED_KEY_PREFIX + productId, 'true');
        } else {
            localStorage.removeItem(OWNED_KEY_PREFIX + productId);
        }
    }
}
