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

### Phase 14: 최종 연출 및 수집 요소 (Next Sprint)
- [ ] **도감 수집 시스템**: 몬스터를 잡거나 조합을 할 때마다 레시피가 해금되어 도감에 체크 표시가 생기는 기능.
- [ ] **조합 성공 이펙트**: 연금술 조합 발동 시 화면 전체가 흔들리거나 원소 입자가 튀는 대규모 파티클 연출.
- [ ] **사운드 리소스 실제 연동**: 준비된 오디오 엔진에 실제 `.mp3` 파일들을 연결하여 타격감 극대화.

---

## 3. 핵심 시스템 상세 설계 (Deep System Design)

### A. 공간 해시 충돌 (Spatial Hash Collision)
수천 개의 엔티티 간 거리 계산을 방지하기 위해 64px 그리드 기반의 `SpatialHash`를 사용하여 근접한 적들만 검사함.

### B. 연금술 조합 알고리즘 (Recipe Matcher)
큐에 담긴 원소 리스트의 부분 집합(Subset)을 검사하여 가장 긴(고급) 레시피를 우선적으로 발동함.

---

*최종 업데이트: 2026-03-03*
*작성자: Antigravity*
