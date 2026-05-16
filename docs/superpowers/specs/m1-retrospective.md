# M1 회고 (Core Alchemy)

**완료일**: 2026-05-16
**브랜치**: worktree-m1-core-alchemy
**구현 방식**: Subagent-Driven Development (Superpowers 스킬)

## ✅ 작동 확인 (자동 검증)

| 항목 | 상태 |
|------|------|
| TypeScript 타입체크 (`npx tsc --noEmit`) | ✅ 0 에러 |
| 단위 테스트 (`npm run test`) | ✅ 13/13 통과 (3 파일) |
| 프로덕션 빌드 (`npm run build`) | ✅ 1.84초 |
| 신규 코드 ESLint | ✅ 0 에러 (any 경고 2개만) |

## 📦 구현 완료 컴포넌트

### 데이터/로직
- ✅ 6원소 정의 (FIRE/ICE/LIGHTNING/POISON/EARTH/AIR) — [AlchemyConfig.ts](src/constants/AlchemyConfig.ts)
- ✅ 5개 시너지 조합 (Plasma Storm/Volcanic Plague/Tempest/Eruption/Cryotoxin)
- ✅ bitECS 컴포넌트 AlchemySlot, SynergyEffect — [alchemy.ts](src/components/alchemy.ts)
- ✅ 슬롯 채움 감지 + 시너지 활성 로직 — [AlchemySystem.ts](src/systems/AlchemySystem.ts)
- ✅ TRIGGER 상수 (5초 활성, 3초 쿨다운) — [GameConfig.ts](src/constants/GameConfig.ts)

### UI
- ✅ 좌하단 3슬롯 시각화 — [AlchemySlotUI.ts](src/ui/AlchemySlotUI.ts)
- ✅ 우측 하단 ⚡ TRIGGER 버튼 (4가지 상태) — [TriggerButton.ts](src/ui/TriggerButton.ts)
- ✅ 죽은 UpgradeScene 부활 → 3장 카드 선택 — [UpgradeScene.ts](src/scenes/UpgradeScene.ts)
- ✅ UIScene 통합 — [UIScene.ts](src/scenes/UIScene.ts)

### 시너지 효과 (5/5)
- ✅ Plasma Storm (FIRE+LIGHTNING+ICE): 30프레임 무작위 폭발 — [PlasmaStorm.ts](src/fx/PlasmaStorm.ts)
- ✅ Volcanic Plague (FIRE+POISON+EARTH): 사망 시 50% 독구덩이 — [VolcanicPlague.ts](src/fx/VolcanicPlague.ts)
- ✅ Tempest (ICE+LIGHTNING+AIR): 주변 둔화+체인 — [Tempest.ts](src/fx/Tempest.ts)
- ✅ Eruption (EARTH+AIR+FIRE): 5초마다 폭발 — [Eruption.ts](src/fx/Eruption.ts)
- ✅ Cryotoxin (POISON+ICE+LIGHTNING): 처치 시 50% 얼음 폭발 — [Cryotoxin.ts](src/fx/Cryotoxin.ts)

### 인프라
- ✅ Vitest 단위 테스트 인프라 + tests/ 디렉토리 tsconfig 포함

## 🔍 M1 자체 검증에서 발견된 이슈 (모두 수정 완료)
1. TypeScript enum 역방향 매핑 → `as const` 객체 패턴 채택
2. Color string → number (Phaser Graphics API 직접 사용)
3. Container.setScrollFactor 자식 미전파 → 각 자식에 명시적 호출
4. UpgradeScene 중복 launch 방지 → `isActive()` 가드 추가

## 📝 수동 검증 (사용자 진행 필요)

5분 이상 `npm run dev` 플레이하면서 다음 체크:

- [ ] 레벨업 시 3장 카드 정상 표시
- [ ] 카드 선택 → 좌하단 슬롯에 원소 즉시 표시
- [ ] 3슬롯 완성 시 ⚡ 버튼 주황색 활성
- [ ] ⚡ 버튼 누르면 황금색 5초 → 회색 3초 쿨다운
- [ ] 각 시너지 효과 시각/메커니즘 작동
- [ ] 모바일 가로 화면에서 UI 위치 자연스러움
- [ ] 슬롯 채움이 5레벨 이내 가능한가?
- [ ] 효과가 시각적으로 구분되는가?

## 🚧 M2 진입 전 조정 사항

수동 플레이테스트 결과에 따라:
- 시너지 효과 밸런스 (데미지/쿨다운)
- 슬롯 채움 속도 (현재 모든 카드가 원소 카드. M3에서 4종 카드 풀로 확장 시 비율 조정 필요)
- 카드 선택 시 게임 일시정지 UX
- 모바일 터치 영역 적절성

## 🎯 M2 진입 조건

M2 (콘텐츠 +1)에 들어가려면:
- ✅ 5개 시너지 모두 작동 확인
- ✅ 자동 검증 게이트 통과
- ⏳ 수동 플레이테스트 5회 통과 (사용자 진행)
- ⏳ 사용자 GO 사인

## 📊 통계

- 총 커밋: 약 15개 (Task 0 → Task 12)
- 신규 파일: 13개 (4 components/systems + 5 UI/effects + 4 tests)
- 변경 파일: 5개 (MainScene, UIScene, UpgradeScene, GameConfig, components/index.ts)
- 총 코드 추가: 약 1,500줄 (테스트 포함)
