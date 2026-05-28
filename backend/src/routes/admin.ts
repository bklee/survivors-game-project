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

        // Chart.js 데이터 직렬화 — JSON.stringify 로 script injection 차단 후 </script> 시퀀스 추가 치환
        const safeJson = (v: unknown) => JSON.stringify(v).replace(/<\/script>/gi, '<\\/script>');

        const topCharsJson = safeJson(topChars);
        const adFunnelJson = safeJson(adFunnel);
        const newPlayersJson = safeJson(newPlayers);

        const kstNow = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

        res.type('html').send(`<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="60">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Survivors Admin</title>
  <!-- Bootstrap 5 -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
  <!-- Font Awesome 6 -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
  <!-- Google Fonts: Inter -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background: #f8f9fc; }

    /* Sidebar */
    #sidebar {
      width: 220px; min-height: 100vh;
      background: linear-gradient(180deg, #2c3e7a 0%, #1a2551 100%);
      position: fixed; top: 0; left: 0; z-index: 100;
    }
    #sidebar .sidebar-brand {
      padding: 1.5rem 1rem 1rem;
      color: #fff; font-size: 1rem; font-weight: 700;
      border-bottom: 1px solid rgba(255,255,255,.1);
      display: flex; align-items: center; gap: .5rem;
    }
    #sidebar .nav-link {
      color: rgba(255,255,255,.7); padding: .65rem 1rem;
      display: flex; align-items: center; gap: .6rem; font-size: .88rem;
    }
    #sidebar .nav-link:hover, #sidebar .nav-link.active {
      color: #fff; background: rgba(255,255,255,.1); border-radius: 4px;
    }
    #sidebar .nav-section {
      padding: .5rem 1rem .2rem;
      color: rgba(255,255,255,.4); font-size: .7rem; text-transform: uppercase; letter-spacing: .08em;
    }

    /* Main content */
    #main { margin-left: 220px; }

    /* Topbar */
    #topbar {
      height: 56px; background: #fff;
      border-bottom: 1px solid #e3e6f0;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 1.5rem;
      position: sticky; top: 0; z-index: 90;
    }
    #topbar h4 { margin: 0; font-size: 1rem; font-weight: 600; color: #3d4c6e; }
    #topbar .updated { font-size: .78rem; color: #888; }

    /* KPI Cards */
    .kpi-card {
      border: none; border-radius: 8px;
      border-left: 4px solid;
      box-shadow: 0 1px 4px rgba(0,0,0,.08);
    }
    .kpi-card .kpi-label { font-size: .7rem; text-transform: uppercase; font-weight: 600; letter-spacing: .06em; color: #888; }
    .kpi-card .kpi-value { font-size: 1.6rem; font-weight: 700; color: #2d3a5e; }
    .kpi-card .kpi-icon { font-size: 1.8rem; opacity: .25; }
    .border-left-primary { border-left-color: #4e73df !important; }
    .border-left-success { border-left-color: #1cc88a !important; }
    .border-left-info    { border-left-color: #36b9cc !important; }
    .border-left-warning { border-left-color: #f6c23e !important; }
    .border-left-secondary { border-left-color: #858796 !important; }

    /* Chart cards */
    .chart-card { border: none; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
    .chart-card .card-header {
      background: #fff; border-bottom: 1px solid #e3e6f0;
      font-size: .85rem; font-weight: 600; color: #3d4c6e;
      border-radius: 8px 8px 0 0 !important;
    }

    /* Table */
    .admin-table th { background: #f8f9fc; font-size: .78rem; text-transform: uppercase; letter-spacing: .05em; color: #666; }
    .admin-table td { font-size: .85rem; vertical-align: middle; }
  </style>
</head>
<body>

<!-- Sidebar -->
<nav id="sidebar">
  <div class="sidebar-brand">
    <i class="fa-solid fa-shield-halved"></i> Survivors Admin
  </div>
  <ul class="nav flex-column px-2 mt-2">
    <li class="nav-section">Main</li>
    <li class="nav-item">
      <a class="nav-link active" href="#"><i class="fa-solid fa-gauge-high fa-fw"></i> Dashboard</a>
    </li>
    <li class="nav-item">
      <a class="nav-link" href="#"><i class="fa-solid fa-chart-line fa-fw"></i> Analytics</a>
    </li>
    <li class="nav-item">
      <a class="nav-link" href="#"><i class="fa-solid fa-gear fa-fw"></i> Settings</a>
    </li>
  </ul>
</nav>

<!-- Main -->
<div id="main">
  <!-- Topbar -->
  <div id="topbar">
    <h4><i class="fa-solid fa-gauge-high me-2 text-primary"></i>Dashboard Overview</h4>
    <span class="updated"><i class="fa-regular fa-clock me-1"></i>업데이트: ${kstNow} KST</span>
  </div>

  <!-- Content -->
  <div class="container-fluid py-4 px-4">

    <!-- KPI 카드 4개 -->
    <div class="row g-3 mb-4">

      <!-- DAU -->
      <div class="col-md-3 col-sm-6">
        <div class="card kpi-card border-left-primary h-100 py-2">
          <div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <div class="kpi-label">DAU</div>
              <div class="kpi-value">${dau.dau ?? 0}</div>
            </div>
            <i class="fa-solid fa-users kpi-icon text-primary"></i>
          </div>
        </div>
      </div>

      <!-- WAU -->
      <div class="col-md-3 col-sm-6">
        <div class="card kpi-card border-left-success h-100 py-2">
          <div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <div class="kpi-label">WAU</div>
              <div class="kpi-value">${wau.wau ?? 0}</div>
            </div>
            <i class="fa-solid fa-user-group kpi-icon text-success"></i>
          </div>
        </div>
      </div>

      <!-- D1 Retention -->
      <div class="col-md-3 col-sm-6">
        <div class="card kpi-card border-left-info h-100 py-2">
          <div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <div class="kpi-label">D1 Retention</div>
              <div class="kpi-value">${d1.d1_pct ?? 0}%</div>
            </div>
            <i class="fa-solid fa-rotate kpi-icon text-info"></i>
          </div>
        </div>
      </div>

      <!-- New Players (today) — d1.new_yday = 어제 신규 = 오늘의 D0 cohort -->
      <div class="col-md-3 col-sm-6">
        <div class="card kpi-card border-left-warning h-100 py-2">
          <div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <div class="kpi-label">New Players (yday)</div>
              <div class="kpi-value">${d1.new_yday ?? 0}</div>
            </div>
            <i class="fa-solid fa-user-plus kpi-icon text-warning"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- 2행: Charts -->
    <div class="row g-3 mb-4">

      <!-- Top Characters Bar Chart -->
      <div class="col-lg-6">
        <div class="card chart-card h-100">
          <div class="card-header d-flex align-items-center gap-2">
            <i class="fa-solid fa-person-running text-primary"></i> Top Characters (7d)
          </div>
          <div class="card-body">
            ${
                topChars.length === 0
                    ? '<p class="text-muted text-center py-4">데이터 없음</p>'
                    : `<canvas id="topCharsChart" style="max-height:240px"></canvas>
            <table class="table table-sm admin-table mt-2 mb-0" aria-hidden="true">
              <thead><tr><th>Character</th><th class="text-end">Runs</th><th class="text-end">Avg Score</th></tr></thead>
              <tbody>
                ${topChars
                    .map(
                        (c: { character_id: string; runs: number; avg_score: number }) =>
                            `<tr><td>${escape(String(c.character_id))}</td><td class="text-end">${c.runs}</td><td class="text-end">${c.avg_score ?? 'N/A'}</td></tr>`,
                    )
                    .join('')}
              </tbody>
            </table>`
            }
          </div>
        </div>
      </div>

      <!-- Ad Funnel Doughnut -->
      <div class="col-lg-6">
        <div class="card chart-card h-100">
          <div class="card-header d-flex align-items-center gap-2">
            <i class="fa-solid fa-bullhorn text-warning"></i> Ad Funnel (7d)
          </div>
          <div class="card-body d-flex align-items-center justify-content-center">
            ${
                adFunnel.length === 0
                    ? '<p class="text-muted">데이터 없음</p>'
                    : '<canvas id="adFunnelChart" style="max-height:260px;max-width:260px"></canvas>'
            }
          </div>
        </div>
      </div>
    </div>

    <!-- 3행: New Player Trend + Synergy Discovery -->
    <div class="row g-3 mb-4">

      <!-- New Player Trend Line Chart -->
      <div class="col-lg-8">
        <div class="card chart-card h-100">
          <div class="card-header d-flex align-items-center gap-2">
            <i class="fa-solid fa-chart-line text-success"></i> New Player Trend (14d)
          </div>
          <div class="card-body">
            ${
                newPlayers.length === 0
                    ? '<p class="text-muted text-center py-4">데이터 없음</p>'
                    : '<canvas id="newPlayerChart" style="max-height:240px"></canvas>'
            }
          </div>
        </div>
      </div>

      <!-- Synergy Discovery Table -->
      <div class="col-lg-4">
        <div class="card chart-card h-100">
          <div class="card-header d-flex align-items-center gap-2">
            <i class="fa-solid fa-wand-sparkles text-info"></i> Synergy Discovery (14d)
          </div>
          <div class="card-body p-0" style="overflow-y:auto;max-height:300px">
            ${
                synergy.length === 0
                    ? '<p class="text-muted text-center py-4">데이터 없음</p>'
                    : `<table class="table table-sm table-hover admin-table mb-0">
                <thead><tr><th>Synergy</th><th class="text-end">Discoveries</th></tr></thead>
                <tbody>
                  ${synergy
                      .map(
                          (s: { synergy_id: string; discoveries: number }) =>
                              `<tr><td>${escape(String(s.synergy_id ?? '(unknown)'))}</td><td class="text-end">${s.discoveries}</td></tr>`,
                      )
                      .join('')}
                </tbody>
              </table>`
            }
          </div>
        </div>
      </div>
    </div>

    <!-- 4행: Engagement KPIs -->
    <div class="row g-3 mb-4">

      <!-- Avg Session Duration -->
      <div class="col-md-4">
        <div class="card kpi-card border-left-secondary h-100 py-2">
          <div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <div class="kpi-label">Avg Session (7d)</div>
              <div class="kpi-value">${avgMinStr}</div>
            </div>
            <i class="fa-regular fa-clock kpi-icon text-secondary"></i>
          </div>
        </div>
      </div>

      <!-- Daily Reward Claim Rate -->
      <div class="col-md-4">
        <div class="card chart-card h-100">
          <div class="card-header d-flex align-items-center gap-2">
            <i class="fa-solid fa-gift text-warning"></i> Daily Reward Claim (today)
          </div>
          <div class="card-body">
            <div class="d-flex justify-content-between mb-1">
              <small class="text-muted">${claimRate.claims_today ?? 0} / ${claimRate.dau_today ?? 0}</small>
              <small class="fw-bold">${claimPct}%</small>
            </div>
            <div class="progress" style="height:10px">
              <div class="progress-bar bg-warning" style="width:${claimPct}%" aria-valuenow="${claimPct}" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quest Completion -->
      <div class="col-md-4">
        <div class="card chart-card h-100">
          <div class="card-header d-flex align-items-center gap-2">
            <i class="fa-solid fa-list-check text-success"></i> Quest Completion (today)
          </div>
          <div class="card-body">
            <div class="d-flex justify-content-between mb-1">
              <small class="text-muted">${quest.completed ?? 0} / ${quest.total_assigned ?? 0}</small>
              <small class="fw-bold">${questPct}%</small>
            </div>
            <div class="progress" style="height:10px">
              <div class="progress-bar bg-success" style="width:${questPct}%" aria-valuenow="${questPct}" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div><!-- /container-fluid -->
</div><!-- /main -->

<!-- Bootstrap 5 JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<!-- Chart.js 4 -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
<script>
(function () {
  // Top Characters bar chart
  var topCharsData = ${topCharsJson};
  if (topCharsData.length > 0) {
    new Chart(document.getElementById('topCharsChart'), {
      type: 'bar',
      data: {
        labels: topCharsData.map(function(r) { return r.character_id; }),
        datasets: [{
          label: 'Runs',
          data: topCharsData.map(function(r) { return Number(r.runs); }),
          backgroundColor: '#4e73df',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  }

  // Ad Funnel doughnut
  var adFunnelData = ${adFunnelJson};
  if (adFunnelData.length > 0) {
    new Chart(document.getElementById('adFunnelChart'), {
      type: 'doughnut',
      data: {
        labels: adFunnelData.map(function(r) { return r.event_type; }),
        datasets: [{
          data: adFunnelData.map(function(r) { return Number(r.cnt); }),
          backgroundColor: ['#4e73df','#1cc88a','#36b9cc','#f6c23e','#e74a3b']
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }
      }
    });
  }

  // New Player Trend line chart
  var newPlayersData = ${newPlayersJson};
  if (newPlayersData.length > 0) {
    new Chart(document.getElementById('newPlayerChart'), {
      type: 'line',
      data: {
        labels: newPlayersData.map(function(r) { return String(r.day).slice(0, 10); }),
        datasets: [{
          label: 'New Players',
          data: newPlayersData.map(function(r) { return Number(r.new_players); }),
          borderColor: '#1cc88a', backgroundColor: 'rgba(28,200,138,.1)',
          fill: true, tension: .35, pointRadius: 4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  }
})();
</script>
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
