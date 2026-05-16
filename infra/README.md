# Survivors Game 인프라 (Contabo)

## 구성
- **PostgreSQL 16** (Alpine, 컨테이너)
- **자동 백업** (24시간 주기, 7일 보관)
- 외부 노출: `127.0.0.1:5432` (localhost only)

## 사전 준비
1. Contabo VPS (Docker + docker-compose 설치)
2. 도메인 DNS: `games.blocktalker.co.kr` → Contabo 서버 IP

## 배포 단계

### 1. 코드 clone
```bash
git clone https://github.com/bklee/survivors-game-project.git
cd survivors-game-project/infra
```

### 2. 환경변수 설정
```bash
cp .env.example .env
chmod 600 .env
$EDITOR .env  # POSTGRES_PASSWORD를 강력한 값으로 설정
```

### 3. 컨테이너 기동
```bash
docker-compose up -d
docker-compose ps  # postgres + postgres_backup 둘 다 (healthy)
```

### 4. 초기 스키마 확인
```bash
docker-compose exec postgres psql -U survivors_app -d survivors -c '\dt'
# players, purchases, leaderboard, events 4개 테이블 확인
```

### 5. 백업 확인 (24시간 후)
```bash
ls -lh backups/
# dump_YYYYMMDD_HHMMSS.sql.gz 파일 생성 확인
```

## 백업 복구
```bash
gunzip -c backups/dump_20260516_120000.sql.gz | \
    docker-compose exec -T postgres psql -U survivors_app -d survivors
```

## 외부 접근 (보안)
PostgreSQL은 `127.0.0.1:5432`로만 노출됨. 외부 접속 차단.

**게임 백엔드 API**는 같은 Docker network 또는 같은 호스트에서 `localhost:5432`로 접속.
별도 컨테이너 (Phase 2에서 추가)에서 access.

## Phase 2: API + 외부 Reverse Proxy (NPM)

이 프로젝트는 **Nginx Proxy Manager (NPM)** 가 80/443 + SSL 을 담당하는 환경을 가정한다. docker-compose 는 postgres + api 만 띄우고, NPM 이 `games.blocktalker.co.kr/survivors/*` 와 `/survivors/api/*` 를 라우팅한다.

> 다른 reverse proxy 환경(Traefik, Caddy, 단독 nginx)이라면 같은 패턴으로 적용 — api 컨테이너의 `proxy` 외부 네트워크 이름만 조정.

### 1) 외부 네트워크 확인

```bash
# NPM 이 속한 네트워크 이름 (compose의 networks.proxy.name 과 일치해야 함)
docker inspect nginx-proxy-manager-app-1 \
    --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'
# 예: "proxy" — 우리 compose 는 'proxy' 를 기본 가정
```

다르면 `docker-compose.yml` 의 `networks.proxy` 또는 NPM 측을 맞춰주세요.

### 2) 게임 dist 배치

`game-blocktalker-static` (또는 동등한 정적 컨테이너) 가 마운트하는 디렉토리에 빌드 결과를 둔다. 본 프로젝트 기준 `/home/docker/games/survivors/dist/`:

```bash
# 로컬에서 빌드 후 rsync (deploy-stack.exp 가 이 단계를 자동화)
npm run build
rsync -avz --delete -e "ssh -i <key>" dist/ \
    <user>@<host>:/home/docker/games/survivors/dist/
```

### 3) API + Postgres 기동

```bash
cd /home/docker/games/survivors/infra
$EDITOR .env   # POSTGRES_PASSWORD, LS_WEBHOOK_SECRET, CORS_ORIGIN
chmod 600 .env
docker-compose up -d
docker-compose ps   # postgres, postgres_backup, api 모두 (healthy)
```

### 4) NPM Proxy Host 설정 (Web UI, one-time)

`https://nginx.blocktalker.co.kr/nginx/proxy` 접속 후 `games.blocktalker.co.kr` proxy host 편집:

- **Custom locations** 탭 → Add location
  - Location: `/survivors/api`
  - Scheme: `http`
  - Forward Hostname/IP: `survivors-api`
  - Forward Port: `3001`
- SSL 탭: 이미 도메인 cert 가 있으므로 추가 작업 없음

### 5) Health check

```bash
# 서버 내부
docker exec -it survivors-api wget -qO- http://localhost:3001/api/health

# 외부 (NPM 통과)
curl -fsS https://games.blocktalker.co.kr/survivors/api/health
# {"status":"ok","db":"connected","time":"..."}
```

### 6) LS Webhook URL

Lemon Squeezy dashboard → Webhooks → URL: `https://games.blocktalker.co.kr/survivors/api/ls-webhook`

## 모니터링 (Phase 2)

- Sentry 무료 티어 (5K events/월)
- 단기: `docker logs survivors-postgres` / `docker logs survivors-api`
- NPM 로그: `docker logs nginx-proxy-manager-app-1`
