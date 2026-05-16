import { Identity } from '../core/Identity';

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
        // 결제 완료 후 돌아올 URL
        url.searchParams.set(
            'checkout[success_url]',
            `${window.location.origin}/?ls_success=1&product=${productId}`,
        );
        window.location.href = url.toString();
    }

    /** 결제 완료 콜백 — LS success URL로 돌아왔을 때 */
    static handleSuccessRedirect(): void {
        const params = new URLSearchParams(window.location.search);
        if (params.get('ls_success') !== '1') return;

        const product = params.get('product');
        if (!product || !PRODUCTS[product]) return;

        // Phase 1: LocalStorage에 임시 저장
        // Phase 2: 서버 API로 webhook 기반 검증
        this.setOwned(product, true);
        alert(`결제 완료! ${PRODUCTS[product].name}가 적용됩니다.`);
        // URL 정리 (history)
        window.history.replaceState({}, '', window.location.pathname);
    }

    /** 제품 보유 여부 (Phase 1 — LocalStorage) */
    static hasProduct(productId: string): boolean {
        return localStorage.getItem(OWNED_KEY_PREFIX + productId) === 'true';
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
