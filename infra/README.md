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

## Phase 2: API + Nginx + SSL 추가

### 1) 게임 dist 배치

PWA 빌드를 nginx 컨테이너가 서빙할 위치에 둔다:

```bash
# 호스트 (로컬 빌드 후 rsync) 또는 서버에서 직접
mkdir -p infra/nginx/dist
# 게임 빌드 결과 (dist/) 를 nginx/dist 로 복사
cp -r ../dist/* infra/nginx/dist/
```

### 2) SSL 인증서 최초 발급 (one-time)

Nginx HTTPS 설정이 cert 파일을 참조하므로 첫 기동 전에 cert 가 존재해야 한다. standalone 모드로 발급:

```bash
# 포트 80 비어있는 상태에서 실행
docker-compose run --rm --service-ports certbot certonly --standalone \
    -d games.blocktalker.co.kr \
    --email <YOUR_EMAIL> --agree-tos --no-eff-email
# 성공 시 ./certbot/conf/live/games.blocktalker.co.kr/ 에 fullchain.pem, privkey.pem 생성
```

### 3) 전체 스택 기동

```bash
docker-compose up -d
docker-compose ps   # postgres, postgres_backup, api, nginx, certbot 모두 (healthy)
```

### 4) Health check

```bash
curl https://games.blocktalker.co.kr/api/health
# {"status":"ok","db":"connected","time":"..."}
```

### 5) 자동 갱신

`certbot` 컨테이너가 12시간마다 `certbot renew --webroot` 실행 — 만료 30일 이내일 때만 갱신. 갱신 후 nginx 는 SIGHUP 또는 컨테이너 재시작 필요 (cronjob 또는 hook 추가 가능).

## 모니터링 (Phase 2)
- Sentry 무료 티어 (5K events/월)
- 단기: `docker logs survivors-postgres` / `docker logs survivors-api` / `docker logs survivors-nginx` 확인
