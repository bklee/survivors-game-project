# M2 회고 (Content Plus)

**완료일**: 2026-05-16
**브랜치**: worktree-m2-content-plus (PR #5 머지됨)
**구현 방식**: Subagent-Driven Development + 즉시 UX hot fix 반복

## ✅ 자동 검증 게이트 통과

| 항목 | 상태 |
|------|------|
| TypeScript | ✅ 0 errors |
| Unit Tests | ✅ 24/24 통과 (4 files) |
| Build | ✅ ~1.9초 |
| npm audit | ✅ 0 vulnerabilities |

## 📦 구현 완료

### 데이터/로직
- ✅ SYNERGIES 5→20개 (C(6,3) 전체)
- ✅ 15개 신규 시너지 효과 (Aura/Tick-AOE/On-Death/Periodic/Targeted)
- ✅ WeaponEvolution 컴포넌트 + 12 EVOLUTIONS
- ✅ findEligibleEvolutions 매칭 헬퍼
- ✅ CardType enum (element/stat/evolution)

### 캐릭터
- ✅ Necromancer (4번째 캐릭터)
- ✅ Soul Bolt 완드 발사체 (단일 직선 비행)
- ✅ NecromancerSystem 좀비 소환 (10킬마다, 5초 지속)

### UX 개선 (사용자 피드백 반영)
- ✅ Alchemy 패널 visibility: MainScene 활성 시에만 표시
- ✅ CharacterSelectScene 4-카드 레이아웃 (1350→1050px)
- ✅ 시너지 활성 시 이름/설명 표시 (슬롯 옆 황금색)
- ✅ Necromancer 렌더링 (necromancer_f0~3 프레임 + 보라 tint)
- ✅ Necromancer 무기 → cleaver atlas (318, 128, 12, 30), wx=4
- ✅ Soul Bolt 벽 충돌 처리 (typeId=99 + PhysicsSystem)

## 🔍 M2 자체 검증에서 발견·수정한 이슈
1. lazy playerId binding (UIScene MainScene launch race)
2. Necromancer가 wizard 스프라이트 그대로 사용 → necromancer_f* 사용
3. Soul Bolt 3연쇄 폭발 → 단일 완드 발사체로 차별화
4. Soul Bolt 벽 통과 → PhysicsSystem 통합
5. Synergy id/name 불일치 → 매핑에 맞게 정리
6. weapon_baton_with_spikes (오우거 곤봉) → atlas cleaver(318, 128)

## 📊 통계

- 총 커밋: 약 25개
- 신규 파일: 19개 (15 시너지 효과 + EvolutionConfig + NecromancerSystem + weapon component + 테스트)
- 변경 파일: 12개 (Main/UI/Upgrade Scene, RenderSystem, SpellSystem, AssetLoader, CharacterConfig, CharacterSelectScene 등)
- 추가 코드: 약 1,800줄

## 🚧 M3 진입 전 권장 사항

### Critical
- **시너지 매직 넘버**: 각 효과 클래스의 `synergyIndex === N` 하드코딩을 static SYNERGY_ID + 인덱스 캐싱으로 일반화 (M3에서 시너지 추가 시 필수)

### Recommended
- **둔화 메커니즘 표준화**: Tempest/Cryotoxin/Whirlwind 등의 `Velocity *= 0.6` 누적 곱연산 → 1회 적용 또는 둔화 상태 마커 컴포넌트 도입
- **destroy 일관성**: 일회성 tween 효과 클래스도 destroy() 메서드 추가
- **시너지 매직 넘버 → SYNERGIES 인덱스 직접 사용**

## 🎯 M3 진입 조건

- ✅ 자동 검증 게이트 통과
- ✅ 사용자 수동 검증 (UX 폴리싱 4회 반복)
- ✅ PR #5 머지

## ➡️ M3 (Meta Progression) 다음 단계

디자인 스펙 Section 3.D 기준:
- 연금술 정수(Essence) 영구 화폐
- 영구 스킬트리 (3계열 × 10단계)
- 신규 캐릭터 잠금 해제 (Druid, Engineer)
- Codex 시스템 (시너지 도감, RecipeScene 재활용)
- 12종 유물(Relic) 시스템

