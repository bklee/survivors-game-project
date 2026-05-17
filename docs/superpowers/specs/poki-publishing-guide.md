# Poki 게시 가이드

이 게임을 Poki 플랫폼에 제출 / 업데이트할 때 필요한 단계와 자체 점검 항목.

## 1. 빌드 명령

```bash
# Poki 전용 빌드 (base './' 상대경로, 출력: dist-poki/)
npm run build:poki

# zip 까지 한 번에 (survivors-poki.zip 생성)
npm run package:poki
```

자체 호스팅용 빌드 (`/survivors/` 절대 경로) 와 출력 디렉토리가 분리돼 있어 충돌 없음:
- `dist/` → games.blocktalker.co.kr/survivors/
- `dist-poki/` → Poki 플랫폼

## 2. 자체 점검 체크리스트

Poki 게시 신청 전에 확인:

| 항목 | 현재 상태 | 기준 |
|------|----------|------|
| 해상도 | ✅ 1280×720 (16:9) | 16:9 고정 또는 responsive |
| 메인 번들 크기 | ✅ ~1.65 MB (gzip 390 KB) | 5 MB 권장 한도 |
| zip 패키지 | ✅ ~9.4 MB | 50 MB 미만 |
| Poki SDK 통합 | ✅ `src/integrations/PokiSDK.ts` | `init`, `gameLoadingFinished`, `gameplayStart/Stop`, `commercialBreak`, `rewardedBreak` 사용 |
| 광고 호출 위치 | ✅ rewarded (부활/추가카드), interstitial (5스테이지마다) | 게임 흐름 자연스러운 break |
| 모바일 컨트롤 | ✅ 가상 조이스틱 (PlayerSystem touch 입력) | 터치 가능 |
| 다국어 | ✅ 한국어 + 영어 (localStorage 토글) | 영어 권장 |
| 가족 친화 콘텐츠 | ✅ 폭력 약간, 성인 X | 13+ |
| Service Worker | ✅ iframe 환경 자동 skip | Poki iframe 내에서 SW 충돌 방지 |
| 로딩 시간 | ⚠️ 첫 로드 시 1-2s (gzip 390KB) | 5초 미만 권장 |

## 3. 메타데이터 준비 (Poki dashboard 입력용)

### 게임 정보

| 필드 | 값 |
|------|---|
| **Title** | `Magicka Survivors` |
| **Studio** | `Blocktalker Studio` |
| **Genre** | Action / Roguelike / Survivor |
| **Tags** | survivor, roguelike, action, magic, retro, pixel |
| **Age rating** | 13+ |
| **Languages** | Korean, English |
| **Orientation** | Landscape |
| **Controls** | Keyboard (WASD/arrows + Shift dash) + Mobile (drag to move) |

### 설명 (영문)

```
A free-to-play action roguelike inspired by Vampire Survivors.

Pick one of six heroes and survive endless waves of monsters. Combine
three elemental orbs (Fire, Ice, Lightning, Poison, Earth, Air) to
discover 20+ powerful synergies. Earn essence to unlock new characters,
permanent skill upgrades, and rare relics.

Built with Phaser 3 + TypeScript + bitECS for buttery-smooth combat.
Pixel-art assets, dynamic boss fights, and procedurally generated
dungeons. Korean + English UI.
```

### 설명 (한글)

```
Vampire Survivors 영감을 받은 무료 액션 로그라이크.

6명의 영웅 중 하나를 골라 끝없이 밀려오는 몬스터의 파도를 견뎌내세요.
3개의 원소 구슬(불·얼음·번개·독·대지·바람)을 조합하여 20개 이상의
강력한 시너지를 발견하세요. 정수를 모아 새 캐릭터 해금, 영구 스킬
강화, 희귀 유물을 얻을 수 있습니다.

Phaser 3 + TypeScript + bitECS 기반의 부드러운 전투. 픽셀 아트, 동적
보스 전투, 절차적으로 생성된 던전. 한국어 + 영어 UI 지원.
```

### 썸네일 / 배너 (별도 준비)

| 자산 | 크기 | 용도 |
|------|------|------|
| Thumbnail | 1024×1024 PNG | Poki 게임 목록 카드 |
| Banner (가로) | 1920×1080 PNG | 상세 페이지 헤더 |
| Screenshots | 3~5 장 (1280×720) | 게임 플레이 모습 |

스크린샷 후보:
1. 시작 화면 (메뉴)
2. 캐릭터 선택
3. 전투 — 보스 등장
4. 시너지 발견 (도감)
5. 스킬 트리

## 4. Poki dashboard 제출 흐름

1. https://developers.poki.com → **Sign in**
2. **New Game** 또는 **Submit a game**
3. zip 업로드 (`survivors-poki.zip`)
4. 메타데이터 폼 작성 (위 정보)
5. **Submit for review**

검토 기간: 일반적으로 **1~3주**. 첫 제출은 길고, 업데이트는 짧음.

## 5. 검토 통과 후

- Poki 가 게임을 자체 도메인에 호스팅
- 광고 노출 → 자동 수익 분배 (개발자 ~50%)
- 매월 누적 $100 도달 시 정산
- Poki dashboard 에서 통계 확인 (DAU, 플레이 시간, 광고 수익)

## 6. 업데이트 배포

코드 변경 후 게임 갱신:
```bash
npm run package:poki   # 새 survivors-poki.zip 생성
```

Poki dashboard → 해당 게임 → **Update game** → 새 zip 업로드.
새 검토 거치지만 보통 1~3일 (마이너 업데이트는 더 짧음).

## 7. 흔한 거절 사유 + 대응

| 사유 | 대응 |
|------|------|
| 광고 호출이 게임플레이 중 발생 | gameplayStart/Stop 으로 게임 중 광고 차단 — 이미 적용 |
| 모바일에서 게임 진입 불가 | 터치 입력 미지원 — B1 PR 으로 해결 |
| 외부 링크 (자체 도메인 등) | TitleScene 의 🏠 Home 버튼은 외부 도메인 이동 — Poki 가 비허용할 수 있음. Poki 빌드에서는 숨겨야 할 수 있음 (후속) |
| 로딩 화면 누락 | BootScene + PokiSDK.gameLoadingFinished 호출 — 적용 |
| SDK 가이드라인 위반 | docs.poki.dev/sdk 재확인 |

## 8. 후속 개선 후보

- **Home 버튼 Poki 빌드에서 숨기기** — `import.meta.env.POKI_BUILD` 검사
- **번들 코드 스플릿** — Phaser 별도 chunk 로 분리해 첫 로드 단축
- **i18n 더 많은 언어 추가** — 일본어, 중국어, 스페인어
- **콘텐츠 정기 업데이트** — 캐릭터 / 시너지 / 보스 추가
