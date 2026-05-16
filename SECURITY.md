# 보안 가이드

## 시크릿/자격증명 관리

### 절대 git에 커밋하지 말 것

- SSH 개인키 (`.deploy_key`, `id_rsa`, `id_ed25519` 등)
- 평문 비밀번호 (`setup_key.exp`처럼 expect 스크립트에 하드코딩 금지)
- `.env*` 파일
- API 키, 토큰
- 결제 자격증명 (Stripe/Lemon Squeezy 시크릿 키)
- 데이터베이스 접속 정보

### 안전한 패턴

1. **환경변수 사용**: 자격증명은 `.env.deploy` 같은 별도 파일에 두고 `.gitignore`로 보호.
2. **템플릿 제공**: `.env.deploy.example` 파일로 필요한 변수 명세만 공유.
3. **로컬 보관**: SSH 키는 `~/.ssh/` 권한 600/400으로 보관, 프로젝트 디렉토리 안에 두지 말 것.
4. **키 회전**: 노출 의심 시 즉시 회전 (서버 authorized_keys 갱신).

### 시크릿 노출 발견 시 절차

1. **즉시 회전**: 노출된 키/비밀번호를 새 값으로 교체
2. **서버 정리**: `~/.ssh/authorized_keys`에서 기존 키 제거
3. **Git 추적 해제**: `git rm --cached <file>` + `.gitignore` 추가
4. **Git history 정리** (선택): `git filter-repo` 또는 `BFG`로 과거 커밋에서 제거
5. **GitHub repo 조치**: private이라도 협업자/토큰 노출 가능성 검토 후 필요시 repo 재생성

### 알려진 노출 이력 (2026-05-16)

**노출됨**:
- `.deploy_key` (SSH 개인키, GitHub bklee/survivors-game-project 추적됨)
- `setup_key.exp`의 root 비밀번호 평문 (`fconfig1034`)
- 서버 IP, 사용자, 경로

**조치**:
1. ✅ `git rm --cached` — 작업트리 유지하면서 추적 해제
2. ✅ `setup_key.exp` 작업트리에서도 삭제 (평문 비밀번호 위험)
3. ✅ `.gitignore` 보강 (`*.key`, `*_key`, `.deploy_key`, `.env*`, `setup_key.exp` 등)
4. ✅ `deploy.exp` 환경변수 패턴으로 재작성
5. ⏳ **사용자 수행 필요**:
   - 서버 root 비밀번호 변경 (`passwd`)
   - 서버 `~/.ssh/authorized_keys`에서 기존 deploy_key 제거
   - 새 SSH 키 페어 생성 후 서버에 등록
   - `.env.deploy` 파일 생성 + 새 자격증명 입력

## 인프라 자격증명 위치

| 자격증명 종류 | 안전한 보관 위치 |
|----------|----------------|
| SSH 키 | `~/.ssh/` (chmod 600) |
| 배포 환경변수 | 프로젝트 `.env.deploy` (gitignore) |
| Lemon Squeezy API | `.env` 또는 환경변수, 절대 코드에 |
| Supabase / Contabo DB | `.env`, 절대 코드에 |
| OAuth 비밀 | `.env`, 절대 코드에 |

## 새 SSH 키 생성 가이드

```bash
# 1. Ed25519 키 생성 (RSA보다 안전·빠름)
ssh-keygen -t ed25519 -f ~/.ssh/survivors_deploy_key -C "survivors-deploy"

# 2. 권한 설정
chmod 600 ~/.ssh/survivors_deploy_key
chmod 644 ~/.ssh/survivors_deploy_key.pub

# 3. 서버에 등록 (기존 키 제거 후)
ssh-copy-id -i ~/.ssh/survivors_deploy_key.pub root@your.server.com

# 4. 서버 authorized_keys에서 기존 키 라인 삭제
ssh root@your.server.com "vi ~/.ssh/authorized_keys"  # 노출된 키 라인 삭제

# 5. .env.deploy에 새 키 경로 기록
echo "DEPLOY_KEY=~/.ssh/survivors_deploy_key" >> .env.deploy
```

## 정기 점검

- 매 PR 머지 전: `git diff --name-only main..HEAD | xargs grep -l -E "password|secret|api[_-]key" 2>/dev/null` 으로 의심 파일 스캔
- 매 출시 전: 전체 자격증명 회전 검토
- 매 3개월: 사용 중인 자격증명 재확인 (사용 안 되는 것 폐기)
