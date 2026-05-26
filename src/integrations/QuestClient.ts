import { Identity } from '../core/Identity';

const FETCH_TIMEOUT_MS = 4_000;

const API_BASE =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
    `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`;

export interface QuestStatus {
    quest_id: string;
    description_key: string;
    target_value: number;
    current_value: number;
    reward_essence: number;
    completed: boolean;
    claimed: boolean;
}

export interface QuestsResponse {
    date: string;
    quests: QuestStatus[];
    combo_bonus_coins: number;
    combo_claimed: boolean;
}

export interface ProgressUpdate {
    quest_id: string;
    current_value: number;
    completed: boolean;
}

export interface ProgressResponse {
    ok: true;
    updated: ProgressUpdate[];
    newly_completed_count: number;
}

export interface ClaimResponse {
    ok: boolean;
    error?: string;
    granted_essence?: number;
    combo_unlocked?: boolean;
    combo_bonus_coins?: number;
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response | null> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } catch (err) {
        console.warn('[QuestClient] fetch failed:', url, err);
        return null;
    } finally {
        clearTimeout(t);
    }
}

export class QuestClient {
    /** 오늘의 quest 목록 + progress 조회. 네트워크 실패 시 null. */
    static async fetchStatus(): Promise<QuestsResponse | null> {
        const id = Identity.getDeviceId();
        const r = await fetchWithTimeout(`${API_BASE}/quests/${encodeURIComponent(id)}/`);
        if (!r?.ok) return null;
        try {
            return (await r.json()) as QuestsResponse;
        } catch {
            return null;
        }
    }

    /** progress batch 전송. 실패 시 null (호출자가 재시도). */
    static async sendProgress(
        increments: { quest_id: string; delta: number }[],
    ): Promise<ProgressResponse | null> {
        if (increments.length === 0) return { ok: true, updated: [], newly_completed_count: 0 };
        // trailing slash: nginx 의 301 redirect 가 POST body 를 잃지 않도록 직접 매치.
        const r = await fetchWithTimeout(`${API_BASE}/quests/progress/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                device_id: Identity.getDeviceId(),
                increments,
            }),
        });
        if (!r?.ok) return null;
        try {
            return (await r.json()) as ProgressResponse;
        } catch {
            return null;
        }
    }

    /** quest 청구. 응답 ok/error 그대로 반환. */
    static async claim(quest_id: string): Promise<ClaimResponse | null> {
        const r = await fetchWithTimeout(`${API_BASE}/quests/claim/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ device_id: Identity.getDeviceId(), quest_id }),
        });
        if (!r) return null;
        try {
            return (await r.json()) as ClaimResponse;
        } catch {
            return null;
        }
    }
}
