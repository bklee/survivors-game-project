import { Router } from 'express';
import { pool } from '../db/pool.js';
import { basicAuth } from '../middleware/basicAuth.js';

const router = Router();
router.use(basicAuth);

router.get('/dashboard.html', async (_req, res) => {
    try {
        const [
            dauR,
            wauR,
            d1R,
            topCharsR,
            avgSessionR,
            claimRateR,
            questR,
            adFunnelR,
            synergyR,
            newPlayerR,
        ] = await Promise.all([
            // 1. DAU (KST today)
            pool.query(`
                SELECT COUNT(DISTINCT player_id) AS dau
                FROM events
                WHERE event_type = 'session_start'
                  AND (created_at AT TIME ZONE 'Asia/Seoul')::date = (NOW() AT TIME ZONE 'Asia/Seoul')::date
            `),
            // 2. WAU
            pool.query(`
                SELECT COUNT(DISTINCT player_id) AS wau
                FROM events
                WHERE event_type = 'session_start'
                  AND created_at >= NOW() - INTERVAL '7 days'
            `),
            // 3. D1 retention
            pool.query(`
                WITH yday_new AS (
                  SELECT id FROM players
                  WHERE (created_at AT TIME ZONE 'Asia/Seoul')::date
                        = ((NOW() AT TIME ZONE 'Asia/Seoul') - INTERVAL '1 day')::date
                ),
                returned AS (
                  SELECT DISTINCT player_id FROM events
                  WHERE event_type='session_start'
                    AND (created_at AT TIME ZONE 'Asia/Seoul')::date
                        = (NOW() AT TIME ZONE 'Asia/Seoul')::date
                )
                SELECT
                  (SELECT COUNT(*) FROM yday_new) AS new_yday,
                  (SELECT COUNT(*) FROM yday_new y WHERE y.id IN (SELECT player_id FROM returned)) AS retained,
                  CASE WHEN (SELECT COUNT(*) FROM yday_new)=0 THEN 0
                       ELSE ROUND(100.0 *
                         (SELECT COUNT(*) FROM yday_new y WHERE y.id IN (SELECT player_id FROM returned))::numeric /
                         (SELECT COUNT(*) FROM yday_new), 1)
                  END AS d1_pct
            `),
            // 4. Top characters (last 7d)
            pool.query(`
                SELECT character_id, COUNT(*) AS runs, ROUND(AVG(score)) AS avg_score, ROUND(AVG(stage_reached)) AS avg_stage
                FROM leaderboard
                WHERE submitted_at >= NOW() - INTERVAL '7 days'
                GROUP BY character_id
                ORDER BY runs DESC
            `),
            // 5. Avg session duration (last 7d)
            pool.query(`
                SELECT ROUND(AVG(EXTRACT(EPOCH FROM (e2.created_at - e1.created_at)))) AS avg_sec
                FROM events e1
                JOIN LATERAL (
                  SELECT created_at FROM events e2
                  WHERE e2.player_id = e1.player_id
                    AND e2.event_type = 'session_end'
                    AND e2.created_at > e1.created_at
                    AND e2.created_at < e1.created_at + INTERVAL '2 hours'
                  ORDER BY e2.created_at ASC LIMIT 1
                ) e2 ON TRUE
                WHERE e1.event_type = 'session_start'
                  AND e1.created_at >= NOW() - INTERVAL '7 days'
            `),
            // 6. Daily reward claim rate (today)
            pool.query(`
                SELECT
                  (SELECT COUNT(*) FROM daily_rewards
                   WHERE claim_date = (NOW() AT TIME ZONE 'Asia/Seoul')::date) AS claims_today,
                  (SELECT COUNT(DISTINCT player_id) FROM events
                   WHERE event_type='session_start'
                     AND (created_at AT TIME ZONE 'Asia/Seoul')::date
                         = (NOW() AT TIME ZONE 'Asia/Seoul')::date) AS dau_today
            `),
            // 7. Quest completion (today)
            pool.query(`
                SELECT
                  COUNT(*) FILTER (WHERE qp.completed_at IS NOT NULL) AS completed,
                  COUNT(*) AS total_assigned
                FROM quests q
                LEFT JOIN quest_progress qp ON qp.quest_db_id = q.id
                WHERE q.assigned_date = (NOW() AT TIME ZONE 'Asia/Seoul')::date
            `),
            // 8. Ad funnel (last 7d)
            pool.query(`
                SELECT event_type, COUNT(*) AS cnt FROM events
                WHERE event_type IN ('ad_view', 'ad_skip', 'iap_funnel_view', 'iap_funnel_click', 'iap_funnel_complete')
                  AND created_at >= NOW() - INTERVAL '7 days'
                GROUP BY event_type
            `),
            // 9. Synergy discovery histogram (last 14d)
            pool.query(`
                SELECT payload->>'synergy_id' AS synergy_id, COUNT(*) AS discoveries
                FROM events
                WHERE event_type = 'synergy_discover'
                  AND created_at >= NOW() - INTERVAL '14 days'
                GROUP BY payload->>'synergy_id'
                ORDER BY discoveries DESC
                LIMIT 20
            `),
            // 10. New player trend (last 14d daily)
            pool.query(`
                SELECT (created_at AT TIME ZONE 'Asia/Seoul')::date AS day, COUNT(*) AS new_players
                FROM players
                WHERE created_at >= NOW() - INTERVAL '14 days'
                GROUP BY day
                ORDER BY day
            `),
        ]);

        const dau = dauR.rows[0];
        const wau = wauR.rows[0];
        const d1 = d1R.rows[0];
        const topChars = topCharsR.rows;
        const avgSession = avgSessionR.rows[0];
        const claimRate = claimRateR.rows[0];
        const quest = questR.rows[0];
        const adFunnel = adFunnelR.rows;
        const synergy = synergyR.rows;
        const newPlayers = newPlayerR.rows;

        const maxRuns =
            topChars.length > 0
                ? Math.max(...topChars.map((c: { runs: number }) => Number(c.runs)))
                : 1;
        const maxDiscoveries =
            synergy.length > 0
                ? Math.max(...synergy.map((s: { discoveries: number }) => Number(s.discoveries)))
                : 1;
        const maxNewPlayers =
            newPlayers.length > 0
                ? Math.max(...newPlayers.map((p: { new_players: number }) => Number(p.new_players)))
                : 1;

        const claimPct =
            claimRate.dau_today > 0
                ? Math.round((Number(claimRate.claims_today) / Number(claimRate.dau_today)) * 100)
                : 0;
        const questPct =
            quest.total_assigned > 0
                ? Math.round((Number(quest.completed) / Number(quest.total_assigned)) * 100)
                : 0;
        const avgSecNum = avgSession.avg_sec != null ? Number(avgSession.avg_sec) : null;
        const avgMinStr =
            avgSecNum != null ? `${Math.floor(avgSecNum / 60)}m ${avgSecNum % 60}s` : 'N/A';

        const adMap: Record<string, number> = {};
        for (const row of adFunnel) {
            adMap[row.event_type] = Number(row.cnt);
        }
        const adView = adMap['ad_view'] ?? 0;
        const adSkip = adMap['ad_skip'] ?? 0;
        const adSkipPct = adView > 0 ? Math.round((adSkip / adView) * 100) : 0;

        res.type('html').send(`<!doctype html>
<html lang="ko"><head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="60">
<title>Survivors Admin</title>
<style>
  body { font: 14px/1.4 -apple-system, sans-serif; padding: 24px; max-width: 1000px; margin: 0 auto; }
  h1, h2 { border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  table { border-collapse: collapse; margin: 8px 0 24px; }
  th, td { border: 1px solid #ccc; padding: 6px 12px; text-align: left; }
  th { background: #f4f4f4; }
  .metric { display: inline-block; padding: 12px 20px; border: 1px solid #ddd; border-radius: 8px; margin: 4px; }
  .metric .v { font-size: 24px; font-weight: 600; }
  .metric .l { font-size: 11px; color: #888; text-transform: uppercase; }
  .bar { display: inline-block; height: 12px; background: #5d9; vertical-align: middle; }
</style>
</head><body>
<h1>Survivors Admin Dashboard</h1>
<p>업데이트: ${new Date().toISOString()} (KST: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })})</p>

<h2>Cohort</h2>
<div class="metric"><div class="l">DAU</div><div class="v">${dau.dau}</div></div>
<div class="metric"><div class="l">WAU</div><div class="v">${wau.wau}</div></div>
<div class="metric"><div class="l">D1 Retention</div><div class="v">${d1.d1_pct}%</div></div>
<div class="metric"><div class="l">D1 New / Retained</div><div class="v">${d1.new_yday} / ${d1.retained}</div></div>

<h2>Engagement</h2>
<div class="metric"><div class="l">Avg Session</div><div class="v">${avgMinStr}</div></div>
<div class="metric"><div class="l">Daily Reward Claim</div><div class="v">${claimRate.claims_today} / ${claimRate.dau_today} (${claimPct}%)</div></div>
<div class="metric"><div class="l">Quest Completion</div><div class="v">${quest.completed} / ${quest.total_assigned} (${questPct}%)</div></div>

<h2>Top Characters (7d)</h2>
<table>
  <tr><th>Character</th><th>Runs</th><th>Avg Score</th><th>Avg Stage</th><th></th></tr>
  ${topChars
      .map(
          (c: { character_id: string; runs: number; avg_score: number; avg_stage: number }) => `<tr>
    <td>${escape(String(c.character_id))}</td>
    <td>${c.runs}</td>
    <td>${c.avg_score ?? 'N/A'}</td>
    <td>${c.avg_stage ?? 'N/A'}</td>
    <td><span class="bar" style="width:${Math.round((Number(c.runs) / maxRuns) * 200)}px"></span></td>
  </tr>`,
      )
      .join('')}
</table>

<h2>Ad Funnel (7d)</h2>
<table>
  <tr><th>Event</th><th>Count</th></tr>
  <tr><td>ad_view</td><td>${adView}</td></tr>
  <tr><td>ad_skip</td><td>${adSkip} (${adSkipPct}% skip rate)</td></tr>
  <tr><td>iap_funnel_view</td><td>${adMap['iap_funnel_view'] ?? 0}</td></tr>
  <tr><td>iap_funnel_click</td><td>${adMap['iap_funnel_click'] ?? 0}</td></tr>
  <tr><td>iap_funnel_complete</td><td>${adMap['iap_funnel_complete'] ?? 0}</td></tr>
</table>

<h2>Synergy Discovery (14d)</h2>
<table>
  <tr><th>Synergy</th><th>Discoveries</th><th></th></tr>
  ${synergy
      .map(
          (s: { synergy_id: string; discoveries: number }) => `<tr>
    <td>${escape(String(s.synergy_id ?? '(unknown)'))}</td>
    <td>${s.discoveries}</td>
    <td><span class="bar" style="width:${Math.round((Number(s.discoveries) / maxDiscoveries) * 200)}px"></span></td>
  </tr>`,
      )
      .join('')}
</table>

<h2>New Players (14d daily)</h2>
<table>
  <tr><th>Day</th><th>New Players</th><th></th></tr>
  ${newPlayers
      .map(
          (p: { day: string; new_players: number }) => `<tr>
    <td>${escape(String(p.day))}</td>
    <td>${p.new_players}</td>
    <td><span class="bar" style="width:${Math.round((Number(p.new_players) / maxNewPlayers) * 200)}px"></span></td>
  </tr>`,
      )
      .join('')}
</table>
</body></html>`);
    } catch (err) {
        console.error('[Admin] dashboard error:', err);
        res.status(500).json({ error: 'internal error' });
    }
});

export default router;

function escape(s: string): string {
    return s.replace(
        /[&<>"']/g,
        (c) =>
            (
                ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }) as Record<
                    string,
                    string
                >
            )[c]!,
    );
}
