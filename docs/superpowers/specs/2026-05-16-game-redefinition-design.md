# Survivors Game: 정체성 재정립 & 상업화 디자인 명세

**문서 ID**: 2026-05-16-game-redefinition-design
**작성자**: hangup2(bkxx.2)
**작성일**: 2026-05-16
**상태**: 브레인스토밍 완료 → 구현 계획 작성 대기
**방법론**: Claude Code Superpowers `brainstorming` 스킬 (멀티 에이전트 디스커버리)

---

## 0. Executive Summary

### 한 줄 비전
> **"브라우저에서 즉시 시작해, 6원소를 조합해서 빌드를 짜는 10분짜리 모바일 액션. Magicka의 깊이 × Vampire Survivors의 중독성."**

### 핵심 결정 4가지
1. **장르 방향**: VS 빌드 다양성 부활 (잠자던 UpgradeScene/LevelUpUI/RecipeScene 코드 부활)
2. **빌드 엔진**: 연금술 6원소 × 3슬롯 = 20개 시너지 조합 (Phase 14에서 제거된 USP 재설계 부활)
3. **시장**: F2P 글로벌 모바일 PWA (Poki/CrazyGames 라이선싱 + No-Ads Pass IAP)
4. **개발 기간**: 24주 (6개월)

### 예상 결과 (성공 시)
- 30일 매출 $5,000+ / 90일 매출 $30,000+ / 12개월 다운로드 1M+

---

## 1. Vision Statement

### 게임 정체성 Pillars

| 차원 | 정의 |
|------|------|
| **장르 (5축)** | 던전 액션 40% / Survivors-like 30% / 빌드 RPG 20% / 모바일 캐주얼 10% |
| **핵심 차별화 (USP)** | 6원소(火氷雷毒地風) × 3슬롯 = 20개 시너지 조합 |
| **타겟 페르소나** | 1순위: VS·Brotato 클리어한 25~35세 모바일 게이머<br>2순위: Magicka·디아블로 팬, 캐주얼 5~15분 |
| **세션 길이 목표** | 10~15분/판 (출퇴근, 점심, 잠자기 직전) |
| **플랫폼 우선순위** | ① 모바일 웹 PWA → ② 데스크탑 웹 → ③ Steam (확장 옵션) |
| **수익 모델** | F2P + 광고(부활/2x XP) + IAP(No-Ads Pass ₩5,500, Character Pack ₩9,900) |
| **개발 기간** | 24주 (6개월) — 정식 런치 |
| **개발 명의** | hangup2(bkxx.2) |

### Anti-Identity (명확히 "아닌 것")
- ❌ Steam Premium 게임 (가격대 정당화 못 함)
- ❌ 카카오/네이버 한국 한정 (글로벌 시장 노림, 6개월 후 추가 옵션)
- ❌ PvP (코드 정체성과 무관)
- ❌ 24/7 라이브 게임 (1인 개발 가능 범위 초과)

### 디스커버리 발견 — 4개 에이전트 합성 결론
- **코드 진실**: 던전 크롤러 40% + VS 30% + 액션RPG 20% (마케팅의 "VS 클론"과 다름)
- **죽은 코드 3개**: UpgradeScene/LevelUpUI/RecipeScene이 어디서도 launch되지 않음
- **시장 빈틈**: 모바일 가로 모드 + 연금술 조합 = 경쟁작 부재
- **선언된 비전 미실현**: 영구 스킬트리, 유물, 도감 모두 research.md에만 존재

---

## 2. 연금술 시스템 핵심 메카닉 (USP)

### 6원소 정의

| 원소 | 색상 | 기본 효과 | 클래스 친화도 |
|------|------|-----------|---------------|
| 🔥 FIRE | 적 | DOT 화상 (3초간 5% HP) | Knight (불검) |
| ❄️ ICE | 청 | 적 이동속도 40% 둔화 | Wizard (얼음창) |
| ⚡ LIGHTNING | 황 | 인접 적 2명 체인 (50% 대미지) | Elf (전기화살) |
| ☠️ POISON | 녹 | DOT 중독 (5초간 3% HP) | 공통 |
| 🪨 EARTH | 갈 | 적 넉백 + 50ms 스턴 | Knight |
| 💨 AIR | 회 | 투사체 사거리 +30%, 회피 시 무적 100ms | Elf |

### 3슬롯 시스템 UI
```
화면 좌하단:
┌─────────────────────────┐
│  [🔥] [⚡] [❄️]  ⚡ TRIGGER │  ← 3슬롯 + 발동 버튼 (우측 하단)
└─────────────────────────┘
```

### 발동 방식 (반자동)
- **자동 활성**: 3슬롯 채워지면 시너지 자동 패시브 발동 (계속 적용)
- **TRIGGER 강화 (수동)**: 우측 하단 ⚡ 버튼 → 시너지 효과 2배 5초 지속
  - **쿨다운**: 효과 종료 후 3초 (즉, 5초 활성 + 3초 쿨 = 8초 사이클, 활성 비율 62.5%)
  - 쿨다운 중 UI 회색 + 카운트다운 표시
- **시각 피드백**: 슬롯 채워지면 화면 가장자리 광채 효과

### 20개 시너지 조합 (C(6,3) = 20)

| # | 조합 | 이름 | 효과 |
|---|------|------|------|
| 1 | 🔥⚡❄️ | Plasma Storm | 30프레임마다 화면 무작위 위치 번개 폭풍 (300 dmg) |
| 2 | 🔥☠️🪨 | Volcanic Plague | 적 사망 시 독구덩이 (5초, DOT 8%) |
| 3 | ❄️⚡💨 | Tempest | 플레이어 주변 회오리 (반경 200, 둔화+체인) |
| 4 | 🪨💨🔥 | Eruption | 5초마다 적 위치 폭발 (반경 100, 200 dmg) |
| 5 | ☠️❄️⚡ | Cryotoxin | 적 처치 시 50% 얼음 폭발 (반경 80) |
| 6-20 | (15개 추가) | M1에 5개 프로토타입 → M2에 15개 완성. 디자인 기준: 모든 6원소가 골고루 노출, 동일 효과 중복 없음, 시각적 인식 가능. | |

### 발견 사이클 (도감)
- 초기 UI: `???` 표시
- 첫 조합 시도 시 → 이름/효과 공개 + 도감 추가 + 정수 50개 보상

### 데이터 흐름 (bitECS)
```
LevelUp Event → UpgradeScene 부활 (3장 카드 생성)
              ↓
User selects card → AlchemySlot Component 업데이트
                  ↓
SpellSystem checks AlchemySlot[3] full → SynergyEffect Component 발동
                                       ↓
TriggerButton press → 강화 활성 (5초 타이머)
```

### 죽은 코드 부활 매핑
| 죽은 코드 | 새 역할 |
|----------|--------|
| [UpgradeScene.ts](src/scenes/UpgradeScene.ts) (110줄) | 3장 카드 선택 UI |
| [LevelUpUI.ts](src/ui/LevelUpUI.ts) (74줄) | 카드 hover/select 인터랙션 |
| [RecipeScene.ts](src/scenes/RecipeScene.ts) (56줄) | 도감(Codex) UI |

### 핵심 설계 결정
- **20개로 제한**: 4·5원소 조합은 깊이 함정. "코어 알케미" 원칙
- **반자동 ≠ 자동**: TRIGGER로 플레이어 에이전시 보존 (Phase 14 교훈)
- **즉시 피드백**: 슬롯 채워지면 화면 가장자리 광채

---

## 3. 빌드 사이클 & 메타 진행

### A. 단일 세션 사이클 (10~15분)
```
[적 처치] → [XP 획득] → [레벨업] → [3장 카드 UI, 0.8초 정지]
                                      ↓
                              [선택] → [슬롯/스탯 적용]
[5레벨마다] 무기 진화 카드 등장
[10레벨마다] 메가 카드 (4번째 슬롯 옵션 / 영구 유물)
```

### B. 카드 풀 (4 종류)
| 종류 | 비율 | 효과 |
|------|------|------|
| 원소 카드 (6종) | 40% | 빈 슬롯 장착 또는 원소 레벨업 |
| 스탯 카드 (4종) | 30% | DMG/SPD/CDR/픽업범위 +10~15% |
| 유물 카드 (12종) | 20% | 특수 효과 |
| 무기 진화 카드 (12종) | 10% | 조건 만족 시만 등장 |

### C. 무기 진화 (Evolution)
| 클래스 | 기본 | 진화체 1 | 진화체 2 | 조건 |
|--------|------|----------|----------|------|
| Knight | 검 | Inferno Blade | Frost Razor | 검 Lv5 + 🔥/❄️ 슬롯 |
| Wizard | 마법탄 | Thunder Orb | Plague Sphere | 마법탄 Lv5 + ⚡/☠️ |
| Elf | 화살 | Storm Volley | Earthshatter | 화살 Lv5 + 💨/🪨 |

### D. 메타 진행 (영구)
- **연금술 정수 (Essence)**: 영구 화폐
  - 사용처: 영구 스킬트리(3계열×10단계), 신규 캐릭터 해금(3종), 유물 영구 슬롯 확장(3→5)
- **캐릭터 (총 6종)**:
  - 기본 3종: Knight/Wizard/Elf
  - 정수 해금 3종: Necromancer(1,500정수) / Druid(3,000) / Engineer(5,000)
- **도감 (Codex)**: 20조합 발견 진행도, 발견 시 정수 50

### E. 모드
| 모드 | 세션 | 보상 | 해금 |
|------|------|------|------|
| 캠페인 | 10~15분 | 정수, XP | 시작 |
| 엔드리스 | 무한 | 정수 2배, 리더보드 | 캠페인 10스테이지 |
| 보스 러시 | 5~8분 | 유물 카드 보장 | 캠페인 15스테이지 |
| 데일리 챌린지 | 8~10분 | 시즌 화폐 | 캠페인 5스테이지 |

### F. 리텐션 설계
- **D1**: 데일리 챌린지 무료 + 광고 1회 추가
- **D7**: 신규 캐릭터 해금 (정수 1,500개 ≈ 7일 플레이)
- **D30**: 시즌 종료 → 신규 시즌 패스 + 신규 유물 6종

---

## 4. 모바일 PWA 인프라

### A. PWA 매니페스트 & 오프라인
- `manifest.json` (name, icons 192/512, fullscreen, landscape)
- 서비스 워커: 게임 코드/애셋 캐싱 → 0.5초 로딩, 오프라인 캠페인 가능
- 설치 프롬프트: 3스테이지 클리어 후 1회 권유
- 세이브: IndexedDB + Supabase Cloud Save

### B. 광고 통합 (수익 핵심)
- **우선순위 1**: Poki 라이선싱 ([SDK](https://developers.poki.com/))
  - 분배 ~60%, Poki 60M MAU 자동 노출
  - 예상 신작 첫 월 $500~3K → 안정화 $2K~10K
- **우선순위 2**: 2개월 후 CrazyGames 추가
- **광고 트리거 (UX 준수)**:
  - 부활 광고: 사망 시 1회 부활
  - 2x XP: 판 시작 선택적
  - 추가 카드: 레벨업 4번째 카드
  - 데일리 보너스: 1+1회 광고
- **금지**: 강제 광고, 게임 중간 인터럽트

### C. IAP (3종, 단순화)
| 상품 | 가격 | 내용 |
|------|------|------|
| No-Ads Pass | ₩5,500 | 광고 영구 제거 |
| Character Pack | ₩9,900 | 신규 3종 즉시 해금 |
| 시즌 스킨 패스 | ₩3,300/시즌 | 30일 화폐 + 독점 스킨 |

**결제**: **Lemon Squeezy** (Merchant of Record, 한국 법인 불필요)
- 수수료: 5% + $0.50/건
- 부가세·환불 자동 처리 (Stripe 한국 정식 미지원, MoR로 우회)
- 백업: Paddle, Polar.sh

### D. 클라우드 세이브 (Contabo 자체 호스팅)
- **인프라**: 기존 보유 Contabo 서버 활용 (추가 비용 0원)
- **DB**: PostgreSQL 도커 컨테이너
- **인증**: 자체 JWT (게스트 Device ID → 이메일/Google 가입 업그레이드)
- **저장**: 메타 진행/IAP 영수증(Lemon Squeezy 웹훅)/리더보드/분석 이벤트
- **백업**: cron + Contabo Object Storage
- **리더보드**: REST API (분당 1회 폴링, Realtime 불필요 → 단순 구조)

### E. 성능 목표
| 지표 | 목표 |
|------|------|
| FPS | 60fps @ 100 엔티티 |
| 로딩 | < 3초 (첫) / < 0.5초 (캐시) |
| 번들 | < 5MB 압축 |
| 메모리 | < 100MB peak |

### F. 모바일 입력
- 기존 [VirtualJoystick.ts](src/ui/VirtualJoystick.ts) 유지
- 신규 우측 하단 TRIGGER 버튼 (시너지 강화)
- 신규 좌측 하단 DASH 버튼

### G. 분석 (Telemetry)
- Google Analytics 4 + 자체 이벤트 (Supabase Functions)
- 이벤트: 세션 시작/종료, 사망, 카드 선택, 광고 시청, IAP 깔때기

### H. i18n
- 한국어/영어 동시
- 이후 일/중/스페인어 확장 구조

---

## 5. 콘텐츠 스코프 (런치 인벤토리)

### A. 캠페인 스테이지 (30, 10테마)
| 구간 | 테마 | 보스 | 환경 기믹 |
|------|------|------|----------|
| 1-3 | Undead | Skeleton Lord | 함정 가시 |
| 4-6 | Orc | Orc Warlord | 화약통, 비밀의 방 |
| 7-9 | Demon | Big Demon | 용암 구멍 |
| 10-12 | Ice | Frost Wraith | 미끄러짐 (신규) |
| 13-15 | Forest | Ancient Treant | 독구덩이 (신규) |
| 16-18 | Sky | Storm Eagle | 강풍 (신규) |
| 19-21 | Crystal | Crystal Golem | 반사 거울 (신규) |
| 22-24 | Void | Void Lord | 중력 변화 (신규) |
| 25-27 | Chaos | Chaos Bringer | 무작위 원소 폭발 |
| 28-30 | Final | Alchemist King | 모든 기믹 |

→ 신규 환경 기믹 6종 추가 (4→10)

### B. 캐릭터 (6, +3 신규)
| 캐릭터 | 무기 | 진화체 | 특징 | 해금 |
|--------|------|--------|------|------|
| Knight | 검 | Inferno/Frost | 근접 광역 | 시작 |
| Wizard | 마법탄 | Thunder/Plague | 원거리 | 시작 |
| Elf | 화살 | Storm/Earth | 빠른 속도 | 시작 |
| Necromancer (신규) | 영혼탄 | Soul Storm | 처치 시 좀비 소환 | 정수 1,500 |
| Druid (신규) | 가시 덩굴 | Tornado | Earth/Air 친화 | 정수 3,000 |
| Engineer (신규) | 포탑 | Mega Turret | 정적 방어 | 정수 5,000 |

### C. 적 (21종, +12 신규)
| 카테고리 | 종류 (개수) |
|---------|------|
| Undead | Skeleton, Zombie, Skeleton Mage, Skeleton Lord (4) |
| Orc | Orc, Orc Shaman, Orc Warlord (3) |
| Demon | Imp, Big Demon, Demon Wizard (3) |
| Ice/Void (신규) | Wraith, Ice Spirit, Void Stalker, Frost Wraith, Cryomancer (5) |
| Nature/Sky (신규) | Treant, Stormcaller, Sky Hawk, Forest Spirit (4) |
| Crystal/Chaos (신규) | Golem, Chaos Spawn (2) |

→ 총 21종 (= 4+3+3+5+4+2), 기존 9 + 신규 12

### D. 무기 & 유물
- **무기**: 6 기본 + 12 진화 = 18종
- **유물 12종**: Healing Crystal / Phoenix Feather / Time Crystal / Greed Pouch / Magnet Core / Berserker Belt / Mana Battery / Scout Helmet / Lucky Coin / Vampire Fang / Echo Boots / Alchemist Sigil

### E. 콘텐츠 볼륨 (현재 vs 런치)
| 항목 | 현재 | 런치 | 증가 |
|------|------|------|------|
| 스테이지 | 30 (3종) | 30 (10종) | 테마 +7 |
| 캐릭터 | 3 | 6 | +3 |
| 적 | 9 | 21 | +12 |
| 무기 | 3 (기본만) | 18 | +15 |
| 유물 | 0 | 12 | +12 |
| 시너지 | 0 | 20 | +20 |
| 환경 기믹 | 4 | 10 | +6 |

### F. 콘텐츠 생산 위험 & 대응
- 가장 큰 부담: 신규 적 12종 + 신규 캐릭터 3종 + 유물 12종
- 대응: 0x72 + Itch.io 무료 픽셀 애셋 + AI 보조 (Stable Diffusion)
- 단계적: 80% 컷오프 가능 (적 12→6, 캐릭터 3→1, 유물 12→8)

---

## 6. 24주 타임라인 + 리스크 + KPI

### A. 마일스톤
| M | 주차 | 산출물 | 검증 게이트 |
|---|------|--------|------------|
| M1 코어 알케미 | W1-4 | 6원소/3슬롯/5조합/UpgradeScene 부활 | 내부 플레이테스트 |
| M2 콘텐츠 +1 | W5-8 | 20조합 완성/무기 진화 12/Necromancer | 30분 플레이 5회 무이탈 |
| M3 메타 진행 | W9-12 | 정수/스킬트리/도감/캐릭터 5,6 | 7일 리텐션 시뮬레이션 |
| M4 수익화 + 인프라 | W13-16 | Poki SDK/PWA/광고 4종/IAP/Supabase | 외부 베타 20명 |
| M5 폴리싱 | W17-20 | 적 12종/기믹 6종/모드 4종/i18n | 디바이스 5종 호환 |
| M6 런치 준비 | W21-24 | 마케팅 자산/Poki 제출/소프트 런치 | **W24 Global Launch** |

### B. 리스크 & 대응 (R1-R7)
| # | 리스크 | 영향 | 대응 |
|---|--------|------|------|
| R1 | 24주 지연 (40%↑) | 시장 윈도우 | M3에 MVP 컷오프 옵션 |
| R2 | 연금술 학습곡선 | 이탈↑ | 5분 튜토리얼, 권장 슬롯 힌트 |
| R3 | Poki 거절 | 수익 -50% | CrazyGames 동시 제출/AdSense |
| R4 | 60fps 미달 | 리뷰 폭격 | M2 끝 프로파일링, 스폰 캡 |
| R5 | 콘텐츠 부족 | "VS 클론" 인식 | 0x72+Itch.io+AI 보조 |
| R6 | F2P 매출 미스 | 매출 0 | 시즌패스 도입, Premium 백업 |
| R7 | PWA 정책 변경 | 차단 | Capacitor 네이티브 래핑 |

### C. KPI (30일 / 90일 / 12개월)
| 지표 | 30일 목표 | 우수 | 위험 |
|------|----------|------|------|
| DAU | 1,000 | 5,000+ | <300 |
| D1 리텐션 | 35% | 50%+ | <20% |
| D7 리텐션 | 12% | 20%+ | <5% |
| 세션 길이 | 10분 | 12+ | <6 |
| 광고 시청 | 0.5회 | 1+ | <0.2 |
| 매출 (30일) | $5,000 | $20,000+ | <$1,000 |

90일: 누적 설치 100K+, MAU 30K+, 매출 $30K+, Poki Featured 1회+
12개월: 다운로드 1M+, ARPDAU ₩50+, 시즌 2, Steam 진출 평가

### D. 자원 / 비용
- 개발: **1인 100% 자체 제작** (hangup2(bkxx.2))
- 외주: **없음** (₩0)
- 아트 자체 제작 전략:
  - 0x72 던전 타일셋 + Itch.io 무료 픽셀 애셋 활용
  - AI 보조 (Stable Diffusion XL 픽셀 모델, AnyDream 등)
  - 신규 캐릭터 3종/적 12종은 본인 작업 (M2/M5에 분산)
- 사운드 자체 제작 전략:
  - 기존 [generate_sfx.py](generate_sfx.py) 확장
  - BGM은 Suno/Udio AI 음악 생성 (월 ~$10)
- 인프라 비용:
  - **Contabo 서버 기존 보유 → 추가 비용 0원**
  - 도메인/SSL: 기존
  - **Lemon Squeezy 수수료**: 5% + $0.50/건 (한국 법인 불필요)
  - 광고 SDK: 무료 (Poki/CrazyGames 분배)
  - AI 도구: ~$10~30/월 (Suno 등)
- **총 운영 비용**: 월 $30 이내

### E. 의존성
```
M1 → M2 ─→ M3 → M5 → M6
   └→ M4 ←─┘     ↑
                 └── M4 끝
```
M4(인프라)는 M1 후 M2와 병렬 가능 → 일정 단축 옵션

---

## 7. Open Questions / 향후 결정 사항

- [ ] 24주 동안 풀타임 vs 파트타임 — 일정 가중치
- [ ] AI 도구 구독 (Stable Diffusion 로컬 vs Replicate API, Suno Pro 등) 확정
- [ ] 한국 출시 시점 (6개월 후 vs 글로벌 동시)
- [ ] 도메인 변경 여부 (게임 정체성에 맞는 새 도메인?)
- [ ] 베타 테스터 풀 확보 방안 (Discord 커뮤니티?)
- [ ] Soft Launch 지역 선정 (필리핀? 베트남? — 모바일 F2P 검증 통상 시장)
- [ ] Contabo 서버 사양 확인 (PostgreSQL + 동시접속 부하 감당 가능?)
- [ ] Lemon Squeezy 가입 시 한국 거주자 요구사항 확인 (계좌/세금정보)

---

## 8. Decisions Log

| 일자 | 결정 | 근거 |
|------|------|------|
| 2026-05-16 | 장르: VS 빌드 다양성 부활 | 죽은 코드 3개를 살리는 가장 강력한 활용 |
| 2026-05-16 | 빌드 엔진: 연금술 6원소 부활 | Phase 14 제거된 USP 의도적 복권 |
| 2026-05-16 | 시장: F2P 글로벌 모바일 PWA | 4개 에이전트 분석 + 사용자 선택 |
| 2026-05-16 | 디자인: 접근법 B "코어 알케미" (24주) | 차별화/개발기간 가성비 최적 |
| 2026-05-16 | 인프라: Contabo 자체 호스팅 (PostgreSQL) | 기존 서버 활용, $25/월 절감, 운영 부담은 자체 감당 |
| 2026-05-16 | 콘텐츠 100% 자체 제작 (외주 0) | 본인 작업 + AI 보조 (Stable Diffusion, Suno/Udio) |
| 2026-05-16 | 결제: Lemon Squeezy (Merchant of Record) | Stripe 한국 정식 미지원, MoR로 한국 법인 없이 우회 |
| 2026-05-16 | 일정 24주 유지 + 80% 콘텐츠 컷오프 옵션 | 외주 없는 자체 제작 부담 흡수 위해 컷오프 카드 보유 |

---

## 9. 참조 자료

### 외부 시장 조사 (4개 에이전트 결과 기반)
- [How To Market A Game — 장르 사이클](https://howtomarketagame.com/2025/11/12/the-cycle-of-a-hit-genre/)
- [Survivor.io 월 $5M IAP](https://www.globalgamesforum.com/reports/how-survivor.io-continues-to-pull-in-5-million-a-month-three-years-later)
- [Halls of Torment 100만 카피](https://www.tweaktown.com/news/107495/)
- [Megabonk 2주 100만 카피](https://www.pcgamer.com/games/roguelike/vampire-survivors-like-megabonk-makes-megabucks/)
- [Poki Developer Guide](https://developers.poki.com/guide/monetization)
- [CrazyGames Developer Portal](https://developer.crazygames.com/)
- [Naavik — 웹 게이밍 반격](https://naavik.co/digest/web-gaming-strikes-back/)

### 프로젝트 내부 문서
- [research/plan.md](research/plan.md) — Phase 1-24 구현 계획
- [research/bug.md](research/bug.md) — 버그 트래커
- [research/research.md](research/research.md) — 기술 리서치
- [design/wall.md](design/wall.md) — 던전 벽 카디널 룰

### 핵심 코드 파일
- [src/main.ts](src/main.ts) — Phaser 부트스트랩
- [src/scenes/MainScene.ts](src/scenes/MainScene.ts) — 게임 루프 허브 (800줄)
- [src/scenes/UpgradeScene.ts](src/scenes/UpgradeScene.ts) — **부활 대상 1** (110줄)
- [src/ui/LevelUpUI.ts](src/ui/LevelUpUI.ts) — **부활 대상 2** (74줄)
- [src/scenes/RecipeScene.ts](src/scenes/RecipeScene.ts) — **부활 대상 3** (56줄, 도감으로 전환)
- [src/systems/SpellSystem.ts](src/systems/SpellSystem.ts) — 자동공격 (187줄)
- [src/systems/CombatSystem.ts](src/systems/CombatSystem.ts) — 데미지/XP (199줄)
- [src/systems/WaveSystem.ts](src/systems/WaveSystem.ts) — 스폰/보스 (361줄)
- [src/core/DungeonGenerator.ts](src/core/DungeonGenerator.ts) — 던전+비밀의방 (526줄)

---

*문서 완료일: 2026-05-16*

## 10. 구현 계획 분할 전략 (Plan Decomposition)

24주 전체를 단일 구현 계획으로 작성하기에는 범위가 크다. 다음과 같이 마일스톤별로 분할 작성을 권장한다:

| 단계 | 구현 계획 | 범위 |
|------|----------|------|
| 1차 | `2026-05-XX-m1-core-alchemy-plan.md` | M1: 6원소/3슬롯/5조합/UpgradeScene 부활 (W1-4) |
| 2차 | M1 완료 후 작성 | M2: 20조합 완성/무기 진화/Necromancer (W5-8) |
| 3차 | M2 완료 후 작성 | M3: 정수/스킬트리/도감 (W9-12) |
| 4차 | M3 완료 후 작성 | M4: Poki SDK/PWA/광고/Lemon Squeezy/Contabo (W13-16) |
| 5차 | M4 완료 후 작성 | M5: 폴리싱 (W17-20) |
| 6차 | M5 완료 후 작성 | M6: 런치 준비 (W21-24) |

**이유**:
- 각 마일스톤은 4주 단위로 검증 게이트 보유 → 자연스러운 분할
- M1 결과에 따라 M2 이후 조정 가능 (예: 5조합 플레이테스트 결과로 시너지 디자인 방향성 수정)
- 한 번에 24주 계획 작성하면 가정 누적으로 후반부가 부정확해짐

**writing-plans 스킬은 1차(M1)부터 시작**한다.

*다음 단계: writing-plans 스킬로 M1 (Core Alchemy) 4주 구현 계획 작성*

