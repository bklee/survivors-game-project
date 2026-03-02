# Alchemist's Night: 구현 계획 (Implementation Plan)

## 1. 프로젝트 아키텍처 (Project Architecture)

성능과 모바일 호환성의 균형을 위해 **Phaser 3**를 메인 프레임워크로 사용하되, 대규모 스웜(10k+) 렌더링은 **Custom WebGL Pipeline (Instanced Rendering)**을 통해 Phaser의 객체 오버헤드를 우회하고, 물리 연산은 기기 환경에 따라 **Adaptive Worker Bridge** 아키텍처를 채택함.

**생산성 최적화**: 오픈소스 Vampire Survivors 템플릿(Reddit/GitHub)의 검증된 로직 패턴을 레퍼런스로 활용하여 핵심 엔진 구현 속도를 높이고, 그 위에 본 프로젝트만의 고성능 ECS 및 연금술 시스템을 레이어링함.

### 폴더 구조

```text
survivors-game-project/
├── src/
│   ├── main.ts             # Phaser 게임 설정 및 초기화
│   ├── scenes/             # Phaser Scene (MainScene, UIScene, LoadingScene 등)
│   ├── core/               # ECS 엔진 (bit-ecs), 공유 메모리 관리
│   ├── systems/            # ECS 시스템 (이동, 물리 연산, 충돌, 스폰)
│   ├── components/         # ECS 컴포넌트 (Position, Velocity, SpriteInfo, Health)
│   ├── alchemy/            # 연금술 조합 및 레시피 시스템 (Logic only)
│   ├── assets/             # 애셋 로더 및 상수 정의
│   ├── ui/                 # Phaser UI 요소, HUD, 메뉴 컴포넌트
│   ├── fx/                 # Post FX 및 파티클 시스템
│   ├── audio/              # 사운드 매니저 및 공간 오디오 로직
│   └── worker/             # 고성능 연산을 위한 Web Worker (Physics/AI)
├── public/                 # 정적 리소스 (images, sounds, videos)
├── design/                 # 원본 디자인 소스 및 목업
└── research/               # 분석 문서, 계획서, 밸런스 데이터
```

## 2. 주요 구현 단계 (Detailed Milestones)

### Phase 1: 아키텍처 및 기반 시스템 (Foundation & Infrastructure)

- [ ] **Task 1.1: 개발 환경 구축**: Vite 기반 Phaser 3 + TypeScript 환경 구축 및 Husky/Lint 설정.
- [ ] **Task 1.2: ECS 코어 설계**: `bit-ecs` 엔티티 레이아웃 정의 (SAB 연동 고려).
- [ ] **Task 1.3: 입력 및 모바일 대응**: 가상 조이스틱 (Virtual Joystick) 및 멀티 터치 시스템.
- [ ] **Task 1.4: 애셋 파이프라인**: Texture Atlas 로딩 및 동적 애니메이션 생성 시스템.

### Phase 2: 핵심 전투 및 스웜 최적화 (Core Combat & Performance)

- [ ] **Task 2.1: 고성능 렌더링**: `Phaser.GameObjects.Blitter` 또는 Custom WebGL Pipeline을 이용한 적 스프라이트 최적화.
- [ ] **Task 2.2: 적 스폰 시스템**: '밤의 농도(Night Intensity)' 시스템 구현 (시간별 난이도 곡선).
- [ ] **Task 2.3: 물리 샌드박스**: Quadtree/Spatial Hashing 기반 고속 충돌 감지 및 밀쳐내기(Knockback) 로직.

### Phase 3: 연금술 및 성장 시스템 (Alchemy & Progression)

- [ ] **Task 3.1: 마법의 큐(Magical Queue)**: 원소(불, 얼음, 번개, 독) 수집 및 실시간 조합 연산.
- [ ] **Task 3.2: 레벨업 시퀀스**: 가챠/카드 선택 UI 구현 및 오버액션 연출 (Slow-mo, Glow).
- [ ] **Task 3.3: 영구적 성장**: IndexedDB 연동을 통한 해금(Unlocks) 및 스킬 트리 데이터 저장.

### Phase 4: 시각적 완성도 및 타격감 (Visual Juice & Polish)

- [ ] **Task 4.1: Juice Pipeline**: Hit-stop, Screen Shake, White Flash, Squash & Stretch 시스템화.
- [ ] **Task 4.2: 고성능 FX**: 파티클 시스템 최적화 및 Post-FX (Glitch, Bloom, ColorMatrix) 적용.
- [ ] **Task 4.3: 캐릭터 특화**: Rabbit(Bunny-hop), Bear(Dance), Panda(Roll) 등 고유 애니메이션 및 기믹 구현.

### Phase 5: 밸런싱 및 출시 준비 (Final Polish & Launch)

- [ ] **Task 5.1: 오디오 시스템**: BGM 전환 및 타격음(SFX) 레이어링 (화면 밖 사운드 감쇠).
- [ ] **Task 5.2: 성능 테스트**: 저사양 기기 대상 프로파일링 및 Adaptive Physics 브릿지 튜닝.
- [ ] **Task 5.3: 튜토리얼 및 해금**: 초기 유저 경험 가이드 및 인게임 도감 완성.

---

## 3. 핵심 시스템 상세 설계 (Deep System Design)

### A. 원소 조합 (Alchemy Combo) 인터페이스

플레이어가 입력한 원소를 버퍼링하고, 조합 성공 시 시각적 피드백을 극대화함.

- **Buffer**: 최대 3~4개의 원소를 담는 순환 큐.
- **Trigger**: Space 키 또는 전용 버튼 클릭 시 조합 시도.
- **Fail Over**: 조합 실패 시 '폭발(Backfire)' 데미지를 주거나 기본 마법 발사.

### B. 밤의 농도 (Night Intensity) - 난이도 시스템

단순한 시간 경과가 아닌, 특정 조건에 따라 게임 환경이 변화함.

- **Level 1 (Dawn)**: 약한 적, 느린 속도.
- **Level 3 (Midnight)**: 화면에 안개가 끼거나 적들의 눈이 붉어지며 이동 속도 대폭 증가.
- **Boss Sequence**: 특정 시간(예: 10분) 도달 시 배경음악이 멈추고 보스 등장 연출.

### C. 오버액션(Juice) 파이프라인 상세

- **Hit Stop**: `scene.time.paused = true`가 아닌, ECS 시스템 업데이트를 수 밀리초간 정지하여 부드러운 멈춤 구현.
- **Squash & Stretch**: Tween이 아닌 Shader 단계에서 Vertex 변형을 통한 고성능 연출.
- **Damage Numbers**: 폰트 아틀라스를 이용한 Batch Rendering으로 수백 개의 데미지 텍스트 출력 최적화.

### D. 캐릭터별 고유 애니메이션 기믹

- **Rabbit (Bunny)**: 단순 이동이 아닌 점프 곡선(`sin` 파형)을 그리며 이동. 착지 시 충격파 발생.
- **Bear (Dancing)**: 제자리 공격 시 춤추는 모션과 함께 주변 범위 데미지.
- **Panda (Rolling)**: 대시 기능이 구르기로 대체되며 경로상의 적에게 데미지.

### E. UI/UX 디자인 시스템 및 정보 구조 (Information Architecture)

픽셀 아트 감성을 유지하면서도 현대적인 모바일 가독성을 확보함.

- **시각적 우선순위**:
    1. **플레이어 체력(HP)**: 가장 크고 직관적인 게이지로 중앙 하단 또는 플레이어 상단 배치.
    2. **경험치/레벨**: 상단 전체를 가로지르는 슬림한 바 형태로 지속적인 성장감 부여.
    3. **연금술 큐**: 선택된 원소를 플레이어 주변 혹은 우측 하단에 상징적인 아이콘으로 표시.
- **Nine-slice Rendering**: Phaser 3의 `NineSlice` 객체를 사용하여 메뉴, 버튼, 업그레이드 선택창의 크기가 변해도 픽셀 왜곡 없이 깔끔한 픽셀 아트 GUI 유지.
- **레이어 분리**: 게임 엔진 연산과 무관하게 UI 전용 Scene을 별도(Parallel)로 구동하여 프레임 드랍 발생 시에도 부드러운 버튼 반응성 보장.

---

## 4. 기술적 상세 및 코드 패턴 (Technical Specs)

### A. Adaptive Physics Bridge (멀티스레딩)

```typescript
export class PhysicsBridge {
    private mode: 'SAB' | 'TRANSFER' | 'MAIN';
    constructor() {
        if (typeof SharedArrayBuffer !== 'undefined' && window.crossOriginIsolated) {
            this.mode = 'SAB'; // 최고 성능 (Direct Memory Access)
        } else if (window.Worker) {
            this.mode = 'TRANSFER'; // 범용 멀티스레드 (Message Passing)
        } else {
            this.mode = 'MAIN'; // 단일 스레드 폴백
        }
    }
}
```

### B. VFX 및 포스트 프로세싱 (FX API)

Phaser 3.60+의 전용 FX API를 활용한 오버액션 구현:

```typescript
const fx = this.cameras.main.postFX.addGlitch();
this.cameras.main.postFX.addColorMatrix().negative();
this.tweens.add({
  targets: fx,
  reveal: 1,
  duration: 500,
  onComplete: () => this.cameras.main.postFX.clear()
});
```

### C. 오디오 레이어링 전략

- **Priority System**: 동시에 수백 개의 사운드가 재생되지 않도록 중요도에 따라 사운드 컷오프.
- **Dynamic Reverb**: '밤의 농도'가 짙어질수록 소리에 리버브를 추가하여 몽환적인 분위기 연출.

---

## 5. 테스트 및 품질 관리 (QA & Performance)

### A. 성능 타겟 (Target Performance)

- **High-end (Desktop/iPhone 15)**: 60 FPS (10,000 entities)
- **Mid-range (Galaxy S22)**: 60 FPS (3,000 entities)
- **Low-end (Older devices)**: 30 FPS (1,000 entities)

### B. 프로파일링 도구

- **Phaser Debug**: FPS, draw calls, texture memory.
- **Chrome DevTools**: Worker CPU usage, memory leaks (SAB focus).
- **Custom Telemetry**: 인게임 밸런스 지표 (평균 생존 시간, 최다 조합 등) 로깅.

---

*최종 업데이트: 2026-03-03*
*작성자: Antigravity*
