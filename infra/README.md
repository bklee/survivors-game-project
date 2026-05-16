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

## Phase 2 후속 작업
- Node.js/Express 백엔드 API 컨테이너 추가 (`/api/leaderboard`, `/api/events`, `/api/ls-webhook` 등)
- Nginx reverse proxy + SSL (Let's Encrypt) — `games.blocktalker.co.kr/api/*` 라우팅
- Lemon Squeezy webhook signature 검증

## 모니터링 (Phase 2)
- Sentry 무료 티어 (5K events/월)
- 단기: `docker logs survivors-postgres` 확인
