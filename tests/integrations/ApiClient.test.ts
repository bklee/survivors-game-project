import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../../src/integrations/ApiClient';

const DEVICE_ID_KEY = 'survivors_device_id';
const FIXED_DEVICE_ID = 'test-device-12345678';

function resetApiClientState() {
    // private static 멤버 초기화 (테스트 격리)
    (ApiClient as unknown as { queue: unknown[]; flushTimer: number | null }).queue = [];
    (ApiClient as unknown as { queue: unknown[]; flushTimer: number | null }).flushTimer = null;
}

describe('ApiClient', () => {
    let fetchMock: ReturnType<typeof vi.fn>;
    let sendBeaconMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.useFakeTimers();
        resetApiClientState();
        localStorage.clear();
        localStorage.setItem(DEVICE_ID_KEY, FIXED_DEVICE_ID);

        fetchMock = vi.fn();
        global.fetch = fetchMock as unknown as typeof fetch;

        sendBeaconMock = vi.fn(() => true);
        (navigator as Navigator & { sendBeacon: typeof navigator.sendBeacon }).sendBeacon =
            sendBeaconMock as unknown as typeof navigator.sendBeacon;
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('getPlayer', () => {
        it('성공 시 서버 응답 그대로 반환', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ exists: true, no_ads_pass: true, total_essence: 99 }),
            });
            const result = await ApiClient.getPlayer();
            expect(result.exists).toBe(true);
            expect(result.no_ads_pass).toBe(true);
            expect(result.total_essence).toBe(99);
            expect(fetchMock).toHaveBeenCalledWith(
                expect.stringContaining(`/player/${FIXED_DEVICE_ID}`),
                expect.objectContaining({ signal: expect.any(AbortSignal) }),
            );
        });

        it('HTTP 에러 시 exists:false 폴백', async () => {
            fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
            const result = await ApiClient.getPlayer();
            expect(result).toEqual({ exists: false, no_ads_pass: false });
        });

        it('네트워크 에러 시 exists:false 폴백', async () => {
            fetchMock.mockRejectedValueOnce(new Error('network down'));
            const result = await ApiClient.getPlayer();
            expect(result).toEqual({ exists: false, no_ads_pass: false });
        });
    });

    describe('submitLeaderboard', () => {
        it('성공 시 true', async () => {
            fetchMock.mockResolvedValueOnce({ ok: true });
            const ok = await ApiClient.submitLeaderboard({
                score: 1000,
                character_id: 'knight',
                stage_reached: 5,
                duration_seconds: 600,
            });
            expect(ok).toBe(true);
            const [url, init] = fetchMock.mock.calls[0];
            expect(url).toContain('/leaderboard');
            expect(init.method).toBe('POST');
            const body = JSON.parse(init.body);
            expect(body).toMatchObject({
                device_id: FIXED_DEVICE_ID,
                score: 1000,
                character_id: 'knight',
            });
        });

        it('실패 시 false', async () => {
            fetchMock.mockRejectedValueOnce(new Error('boom'));
            const ok = await ApiClient.submitLeaderboard({ score: 100, character_id: 'wizard' });
            expect(ok).toBe(false);
        });
    });

    describe('trackEvent / flush', () => {
        it('단일 이벤트는 즉시 전송 안 함 (큐 적재)', () => {
            ApiClient.trackEvent('session_start', { stage: 1 });
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('5초 후 자동 flush', async () => {
            fetchMock.mockResolvedValueOnce({ ok: true });
            ApiClient.trackEvent('session_start');

            await vi.advanceTimersByTimeAsync(5000);

            expect(fetchMock).toHaveBeenCalledTimes(1);
            const body = JSON.parse(fetchMock.mock.calls[0][1].body);
            expect(body.events).toHaveLength(1);
            expect(body.events[0]).toMatchObject({
                event_type: 'session_start',
                device_id: FIXED_DEVICE_ID,
            });
        });

        it('50개 도달 시 즉시 flush (timer 대기 안 함)', async () => {
            fetchMock.mockResolvedValue({ ok: true });
            for (let i = 0; i < 50; i++) {
                ApiClient.trackEvent('session_start', { i });
            }
            // micro-task drain
            await vi.advanceTimersByTimeAsync(0);
            expect(fetchMock).toHaveBeenCalledTimes(1);
            const body = JSON.parse(fetchMock.mock.calls[0][1].body);
            expect(body.events).toHaveLength(50);
        });

        it('수동 flush: 큐 비어있으면 true 반환 + fetch 안 함', async () => {
            const ok = await ApiClient.flush();
            expect(ok).toBe(true);
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('서버 실패 시 큐 복원 + 재시도 가능', async () => {
            fetchMock.mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true });
            ApiClient.trackEvent('session_start', { attempt: 1 });

            const first = await ApiClient.flush();
            expect(first).toBe(false);

            // 큐에 이벤트가 다시 있음 → 다음 flush 호출 시 재전송
            const second = await ApiClient.flush();
            expect(second).toBe(true);
            expect(fetchMock).toHaveBeenCalledTimes(2);
            const body = JSON.parse(fetchMock.mock.calls[1][1].body);
            expect(body.events).toHaveLength(1);
        });

        it('네트워크 예외 시 큐 복원', async () => {
            fetchMock.mockRejectedValueOnce(new Error('offline'));
            ApiClient.trackEvent('session_start');

            const ok = await ApiClient.flush();
            expect(ok).toBe(false);

            // 큐 복원되었으므로 한 번 더 flush 호출 시 두 번째 fetch 시도
            fetchMock.mockResolvedValueOnce({ ok: true });
            const ok2 = await ApiClient.flush();
            expect(ok2).toBe(true);
        });
    });

    describe('flushBeacon', () => {
        it('큐 있으면 sendBeacon 호출', () => {
            ApiClient.trackEvent('session_end', { reason: 'death' });
            ApiClient.flushBeacon();
            expect(sendBeaconMock).toHaveBeenCalledTimes(1);
            const [url, blob] = sendBeaconMock.mock.calls[0];
            expect(url).toContain('/events');
            expect(blob).toBeInstanceOf(Blob);
        });

        it('큐 비어있으면 sendBeacon 안 부름', () => {
            ApiClient.flushBeacon();
            expect(sendBeaconMock).not.toHaveBeenCalled();
        });

        it('sendBeacon 실패(false) 시 큐 복원', () => {
            sendBeaconMock.mockReturnValueOnce(false);
            ApiClient.trackEvent('session_end');
            ApiClient.flushBeacon();
            // 큐 복원 확인: 다시 flushBeacon 호출 시 sendBeacon 한 번 더 시도
            sendBeaconMock.mockReturnValueOnce(true);
            ApiClient.flushBeacon();
            expect(sendBeaconMock).toHaveBeenCalledTimes(2);
        });
    });
});
