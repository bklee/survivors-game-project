# M3 회고 (Meta Progression)

**완료일**: 2026-05-16
**브랜치**: feat+m3-meta-progression (worktree)
**구현 방식**: Subagent-Driven Development (Task 1~6 병렬 + 순차)

---

## 자동 검증 게이트

| 항목 | 상태 | 상세 |
|------|------|------|
| TypeScript | 통과 | 0 errors |
| Unit Tests | 통과 | 39/39 통과 (6 파일) |
| Build | 통과 | 1.82s |
| npm audit | 통과 | 0 vulnerabilities |

---

## 구현 완료

### 영구 진행 시스템 (Persistent Meta Progression)
- MetaProgress LocalStorage (essence / unlockedCharacters / skillTree / discoveredSynergies / relicSlots)
- 스킬트리 3계열 × 10단계 = 30 노드 (combat / survival / discovery)
- 게임 시작 시 globalStats 보너스 자동 적용 (applySkillTreeBonuses)
- Codex 시너지 도감 (4×5 그리드, 발견/미발견 표시)
- 시너지 발견 토스트 + 50 정수 보상 (AlchemySystem → MetaProgress.discoverSynergy)

### GameOver 정수 정산
- MainScene에 enemiesKilled / synergiesActivated 카운터 추가
- enemy_killed 이벤트마다 enemiesKilled++ 집계
- synergy_discovered 이벤트마다 synergiesActivated++ 집계
- 사망 시 GameOverScene에 { stage, enemiesKilled, synergiesActivated } 전달
- 정수 계산: `Math.floor((stage × 10 + enemies × 0.5 + synergies × 5) × (1 + discovery × 0.1))`
- GameOverScene UI에 "+N 정수 (총: M)" 황금색 텍스트 표시

### 유물 (Relic)
- 12 RELICS 정의 + Relic bitmask 컴포넌트
- RelicSystem 효과 적용 (passive / tick / on-kill / on-revive)
- UpgradeScene 유물 카드 통합 (relicSlots 한도)
- Phoenix Feather 부활 효과 (tryRevive)

### 신규 캐릭터
- Necromancer (1500 정수, 기존)
- Druid (3000 정수, wizard 프레임 + 녹색 tint)
- Engineer (5000 정수, wizard 프레임 + 회청색 tint)
- CharacterSelectScene 6 카드 2-row 그리드 + 잠금/해금 UI

---

## 통계

| 항목 | 수치 |
|------|------|
| 총 커밋 | 7 |
| 신규 파일 | 약 8 (MetaProgress, SkillTreeConfig, SkillTreeScene, RelicConfig, Relic 컴포넌트, RelicSystem, CodexScene) |
| 수정 파일 | 약 10 (AlchemySystem, UpgradeScene, MainScene, GameOverScene, RenderSystem, SpellSystem, CharacterConfig, CharacterSelectScene, TitleScene, UIScene, main.ts, PlayerStats) |

---

## 다음 단계 (M4 후보)

- 콘텐츠 폴리싱: Druid / Engineer 전용 무기 스프라이트, 시각 효과 차별화
- 통계 화면: 게임별 최고 스테이지, 총 적 처치, 시너지 발견율
- 상업화 진입 (P0 3건 결정 후 90일 MVP 계획)
