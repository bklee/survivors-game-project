import { QuestClient } from '../integrations/QuestClient';

const FLUSH_INTERVAL_MS = 5_000;
const MAX_PENDING_QUESTS = 10;

// QuestTracker — 게임 이벤트(적 처치, 시너지 발견 등)를 delta 로 누적하여
// 5초 간격 또는 세션 종료 시 서버에 batch 전송.
//
// 의도: MainScene/시너지 시스템이 every-frame trackEvent 를 부르지 않도록
// 클라이언트 측에서 집계 (특히 enemy_killed 는 빈번).
export class QuestTracker {
    private static deltas: Map<string, number> = new Map();
    private static flushTimer: number | null = null;

    /** 1회 증분 — 같은 quest_id 누적. */
    static add(quest_id: string, delta = 1): void {
        if (delta <= 0) return;
        const prev = this.deltas.get(quest_id) ?? 0;
        this.deltas.set(quest_id, prev + delta);
        this.scheduleFlush();
    }

    /** stage 도달은 누적이 아니라 최대값. */
    static setMax(quest_id: string, value: number): void {
        const prev = this.deltas.get(quest_id) ?? 0;
        if (value > prev) {
            this.deltas.set(quest_id, value);
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

    /** 즉시 flush — 세션 종료, 일시정지 메뉴 진입 등에서 호출. */
    static async flush(): Promise<boolean> {
        if (this.deltas.size === 0) return true;

        const increments = Array.from(this.deltas.entries())
            .slice(0, MAX_PENDING_QUESTS)
            .map(([quest_id, delta]) => ({ quest_id, delta }));

        const r = await QuestClient.sendProgress(increments);
        if (!r) {
            // 실패 → 큐 유지 (다음 flush 에서 재전송)
            return false;
        }
        // 성공한 증분만 제거 (서버가 무시한 quest 도 큐에서 제거 — 다음날 fresh)
        for (const inc of increments) {
            const cur = this.deltas.get(inc.quest_id);
            if (cur === undefined) continue;
            if (cur <= inc.delta) {
                this.deltas.delete(inc.quest_id);
            } else {
                this.deltas.set(inc.quest_id, cur - inc.delta);
            }
        }
        return true;
    }

    /** 테스트/리셋용. */
    static reset(): void {
        this.deltas.clear();
        if (this.flushTimer !== null) {
            window.clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }
    }
}
