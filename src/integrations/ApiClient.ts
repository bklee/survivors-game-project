import { Identity } from '../core/Identity';

// PWA 가 /survivors/ 에 서빙되는 환경: BASE_URL 이 '/survivors/' 라 API_BASE 가 /survivors/api 가 됨.
// dev 환경 (base '/'): /api 그대로.
// import.meta.env.VITE_API_BASE_URL 로 override 가능 (다른 환경 배포 시).
const API_BASE =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
    `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`;

export type EventType =
    | 'session_start'
    | 'session_end'
    | 'card_select'
    | 'character_select'
    | 'synergy_discover'
    | 'ad_view'
    | 'ad_skip'
    | 'iap_funnel_view'
    | 'iap_funnel_click'
    | 'iap_funnel_complete'
    | 'pwa_install'
    | 'daily_reward_claim';

export interface PlayerInfo {
    exists: boolean;
    no_ads_pass: boolean;
    total_essence?: number;
    created_at?: string;
    last_seen_at?: string;
}

export interface LeaderboardSubmit {
    score: number;
    character_id: string;
    stage_reached?: number;
    duration_seconds?: number;
}

export interface DailyRewardPreview {
    essence: number;
    coins: number;
}

export interface DailyRewardStatus {
    can_claim: boolean;
    next_day: number;
    streak_count: number;
    preview_reward: DailyRewardPreview;
    last_claimed_at: string | null;
    next_claim_available_at: string;
}

export interface DailyRewardClaimSuccess {
    ok: true;
    granted: DailyRewardPreview;
    streak_day: number;
    streak_count: number;
    total_essence: number;
}

export interface DailyRewardClaimFail {
    ok: false;
    error: string;
    next_claim_available_at?: string;
}

export type DailyRewardClaimResult = DailyRewardClaimSuccess | DailyRewardClaimFail;

interface QueuedEvent {
    event_type: EventType;
    payload?: Record<string, unknown>;
    device_id: string;
}

const FLUSH_INTERVAL_MS = 5_000;
const MAX_BATCH = 50;
const FETCH_TIMEOUT_MS = 4_000;

async function postJson(url: string, body: unknown): Promise<Response | null> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        return await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
    } catch (err) {
        console.warn('[ApiClient] POST failed:', url, err);
        return null;
    } finally {
        clearTimeout(t);
    }
}

export class ApiClient {
    private static queue: QueuedEvent[] = [];
    private static flushTimer: number | null = null;

    /** 플레이어 메타 + IAP 보유 조회. 네트워크 실패 시 exists:false 폴백. */
    static async getPlayer(deviceId?: string): Promise<PlayerInfo> {
        const id = deviceId ?? Identity.getDeviceId();
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        try {
            const r = await fetch(`${API_BASE}/player/${encodeURIComponent(id)}`, {
                signal: controller.signal,
            });
            if (!r.ok) return { exists: false, no_ads_pass: false };
            return (await r.json()) as PlayerInfo;
        } catch (err) {
            console.warn('[ApiClient] getPlayer failed:', err);
            return { exists: false, no_ads_pass: false };
        } finally {
            clearTimeout(t);
        }
    }

    static async submitLeaderboard(payload: LeaderboardSubmit): Promise<boolean> {
        const body = { ...payload, device_id: Identity.getDeviceId() };
        const r = await postJson(`${API_BASE}/leaderboard`, body);
        return !!r?.ok;
    }

    /** Daily Reward 상태 조회. 네트워크 실패 시 null (모달 표시하지 않음). */
    static async getDailyRewardStatus(deviceId?: string): Promise<DailyRewardStatus | null> {
        const id = deviceId ?? Identity.getDeviceId();
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        try {
            const r = await fetch(`${API_BASE}/daily-reward/${encodeURIComponent(id)}`, {
                signal: controller.signal,
            });
            if (!r.ok) return null;
            return (await r.json()) as DailyRewardStatus;
        } catch (err) {
            console.warn('[ApiClient] getDailyRewardStatus failed:', err);
            return null;
        } finally {
            clearTimeout(t);
        }
    }

    /** Daily Reward 청구. 성공/중복/네트워크 실패 모두 명시적 결과 반환. */
    static async claimDailyReward(): Promise<DailyRewardClaimResult | null> {
        const r = await postJson(`${API_BASE}/daily-reward/claim`, {
            device_id: Identity.getDeviceId(),
        });
        if (!r) return null;
        try {
            return (await r.json()) as DailyRewardClaimResult;
        } catch {
            return null;
        }
    }

    /** 이벤트는 즉시 전송하지 않고 큐에 적재 → 5초마다 / 50개 도달 시 flush. */
    static trackEvent(event_type: EventType, payload?: Record<string, unknown>): void {
        this.queue.push({
            event_type,
            payload,
            device_id: Identity.getDeviceId(),
        });
        if (this.queue.length >= MAX_BATCH) {
            void this.flush();
        } else {
            this.scheduleFlush();
        }
    }

    private static scheduleFlush(): void {
        if (this.flushTimer !== null) return;
        this.flushTimer = window.setTimeout(() => {
            this.flushTimer = null;
            void this.flush();
        }, FLUSH_INTERVAL_MS);
    }

    /** 명시적 flush — 큐를 비우고 서버에 전송. 실패 시 큐 유지 (재시도). */
    static async flush(): Promise<boolean> {
        if (this.queue.length === 0) return true;
        const batch = this.queue.splice(0, MAX_BATCH);
        const r = await postJson(`${API_BASE}/events`, { events: batch });
        if (!r?.ok) {
            // 실패 시 앞쪽으로 되돌림 (선입선출 유지)
            this.queue = [...batch, ...this.queue];
            return false;
        }
        return true;
    }

    /** 페이지 unload 등에서 호출 — sendBeacon 으로 best-effort 전송. */
    static flushBeacon(): void {
        if (this.queue.length === 0) return;
        const batch = this.queue.splice(0, this.queue.length);
        try {
            const blob = new Blob([JSON.stringify({ events: batch })], {
                type: 'application/json',
            });
            const ok = navigator.sendBeacon?.(`${API_BASE}/events`, blob);
            if (!ok) {
                // 실패 시 복구 (다음 라이프사이클에서 flush 시도)
                this.queue = [...batch, ...this.queue];
            }
        } catch (err) {
            console.warn('[ApiClient] sendBeacon failed:', err);
            this.queue = [...batch, ...this.queue];
        }
    }
}
