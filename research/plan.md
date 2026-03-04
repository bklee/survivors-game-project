# Alchemist's Night: 구현 계획 (Implementation Plan)

## 1. 프로젝트 아키텍처 (Project Architecture)

성능과 모바일 호환성의 균형을 위해 **Phaser 3**를 메인 프레임워크로 사용하되, 대규모 스웜(10k+) 렌더링은 **Blitter API** 및 고밀도 Array 기반 ECS 매핑을 통해 최적화함.

---

## 2. 주요 구현 단계 (Detailed Milestones)

### Phase 1~5: 기반 구축 (Completed)

- [x] 개발 환경 (Vite + TS) 및 ECS (bit-ecs) 코어 설계 완료.
- [x] 가상 조이스틱 및 입력 시스템 구축.
- [x] 0x72 던전 타일셋 애셋 파이프라인 구축.

### Phase 6: 대규모 최적화 및 연출 강화 (Completed)

- [x] **스웜 최적화**: RenderSystem의 Map 룩업을 Array 룩업으로 교체 (1만개 엔티티 성능 확보).
- [x] **연금술 큐 고도화**: 시너지 레시피(폭발 가스, 초전도 등) 로직 완성.
- [x] **시각적 타격감(Juice)**: Hit Stop(ECS 연동), Screen Shake, Damage Numbers Pooling.

### Phase 7~8: 핵심 전투 루프 및 성장 (Completed)

- [x] **전투 충돌 시스템**: Spatial Hash 기반 고속 AABB 충돌 처리.
- [x] **무기 시스템**: Alchemy 조합 결과에 따른 투사체/장판 스폰 연동.
- [x] **적 AI 고도화**: 실시간 플레이어 추적(Tracking) 및 넉백 로직.
- [x] **경험치 및 레벨업**: XP Gems 드롭, 자석(Magnet) 효과, 레벨업 시퀀스.

### Phase 9~10: UI/UX 및 비주얼 개편 (Completed)

- [x] **HUD 구축**: 실시간 HP Bar, 연금술 큐 시각화.
- [x] **레벨업 드래프트**: UpgradeScene을 통한 무작위 스탯 강화 카드 선택.
- [x] **캐릭터 UI 개편**: Knight, Wizard, Elf 고유 비주얼(Series F) 및 전장 스프라이트 연동.
- [x] **연금술 도감**: 'E' 키를 통한 조합법 사전(RecipeScene) 구현.

### Phase 11: 환경 및 BGM (Completed)

- [x] **던전 오버홀**: 4000x4000 전체 월드 타일링 및 150개 이상의 소품(Crate, Skull, Column) 배치.
- [x] **BGM 루프**: 메인 테마 및 보스전 테마 자동 루프 및 상황별 전환 시스템.
- [x] **사망 연출**: 플레이어 사망 시 Vanishing 효과 및 GameOverScene 연동.

### Phase 12: 상호작용 및 환경 기믹 (Completed)

- [x] **함정 시스템**: 가시 함정(Spikes) 데미지 판정 연동 및 **폭발 화약통(Explosive Barrels)** 구현.
- [x] **인터랙티브 오브젝트**: 문(Door)과 이를 여는 레버(Lever) 시스템 구현.
- [x] **비밀 보물 방(Secret Rooms)**: 잠긴 문 뒤에 거대 보물(1000 XP)과 정예 오크 가드(Elite Guard) 배치.

### Phase 13: 디테일 폴리싱 및 전투 고도화 (Completed)

- [x] **클래스별 고유 공격**: Knight(검 휘두르기), Wizard(마법 탄환), Elf(화살) 클래스별 맞춤 공격 로직 구현.
- [x] **동적 비주얼 처리**: 캐릭터 및 몹 이동 방향에 따른 **Sprite Flipping (좌우 반전)** 적용.
- [x] **미니맵 시스템 (Minimap)**: 화면 우측 상단에 플레이어(흰 점)와 적(빨간 점) 위치를 추적하는 미니맵 UI 구현.
- [x] **적 웨이브 세분화**: Orc(탱커), Skeleton(스피드) 고유 스프라이트 및 애니메이션 적용 완료.

### Phase 14: 시스템 개편 및 밸런싱 (Completed)

- [x] **공격 자동화 (Auto-Attack)**: 마법 발동 시 매번 Spacebar를 누르는 대신, 쿨타임에 맞춰 근처 적을 자동으로 조준/공격하는 오토 시스템 구현.
- [x] **연금술 조합 로직 제거**: 게임 플레이 편의성과 난이도 조절을 위해 불필요했던 복잡한 연금술 큐 및 조합 시스템을 과감히 소거.
- [x] **스테이지별 몬스터 그룹핑 (Monster Grouping)**: 스테이지별로 고유한 몬스터 그룹 및 보스 출현.
  - **Undead**: Zombie, Necromancer, Skeleton (Boss: **Big Zombie**)
  - **Orc**: Orc Shaman, Orc Warrior (Boss: **Ogre**)
  - **Demon**: Chort, Imp (Boss: **Big Demon**)
- [x] **고퀄리티 개별 프레임 스프라이트**: GIF의 깨짐 문제를 해결하기 위해 개별 PNG 프레임(`assets/frames/`) 기반의 정밀 렌더링 시스템으로 전환.
- [x] **UI 시인성 강화**: 현재 스테이지 번호 표시 추가 및 레벨업 시 캐릭터의 상세 능력치(공격력, 속력, 쿨타임, 획득 반경) 시각화 시스템 구축.
- [x] **보스전 클리어 조건 확립**: 3판마다 등장하는 보스를 처치해야만 스테이지가 클리어되도록 핵심 게임 루프 강화.
- [x] **비주얼 연출 폴리싱 (No Flash & Shake)**: 공격 시나 피격 시 발생하는 과도한 화면 번쩍거리림(White Flash) 및 화면 흔들림(Screen Shake) 효과를 완전히 제거하여 시각적 피로도를 최소화함.
- [x] **BGM 스트리밍 최적화**: 선택창 및 전장에서 배경음악이 즉각적으로 재생될 수 있도록 HTML5 스트리밍 모드 도입.

### Phase 15: 최종 연출 및 로그북 (Next Sprint)

- [ ] **성장 로그북**: 각 스테이지별 클리어 시간 및 성취 스탯을 기록하는 히스토리 시스템.
- [ ] **원소 폭발 이펙트**: 각 공격 시 마법 속성에 따른 수천 개의 입자(Particle) 연출 고도화.

---

## 3. 핵심 시스템 상세 설계 (Deep System Design)

### A. 공간 해시 충돌 (Spatial Hash Collision)

수천 개의 엔티티 간 거리 계산을 방지하기 위해 64px 그리드 기반의 `SpatialHash`를 사용하여 근접한 적들만 검사함.

### B. 스테이지 비례 맵 생성 (Dynamic Scaling Map)

플레이어가 강해짐에 따라 전장도 스테이지당 10%씩 넓어지며, 셀룰러 오토마타 알고리즘을 통해 매번 새로운 지형을 자동 생성함.

---

*최종 업데이트: 2026-03-04*
*작성자: Antigravity*
