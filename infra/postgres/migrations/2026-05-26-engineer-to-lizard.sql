-- PR #111 캐릭터 교체: engineer → lizard.
-- leaderboard 의 character_id, events payload 의 character_id 등 'engineer' 값을 'lizard' 로 치환.
-- 멱등 — UPDATE 가 두 번 실행되어도 결과 동일.

UPDATE leaderboard SET character_id = 'lizard' WHERE character_id = 'engineer';

-- events 의 payload (JSONB) 안에 character_id 필드가 있을 수 있는 경우 보강.
UPDATE events
SET payload = jsonb_set(payload, '{character_id}', '"lizard"')
WHERE payload->>'character_id' = 'engineer';
