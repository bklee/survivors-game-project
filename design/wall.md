# Dungeon Wall Configuration Rules

이 문서는 `map_example3.png`를 기반으로 한 던전 벽면 렌더링의 세부 규칙을 정의합니다. 모든 벽은 주변 타일과의 인접성(Context-Aware)에 따라 최적의 타일이 선택되어야 합니다.

## 1. 개요 (General Rules)

- **타일 크기**: 모든 벽 타일은 `16x32px` (높이 2타일분)입니다.
- **오프셋**: 자연스러운 연결을 위해 타일은 실제 좌표보다 **Y축으로 -16px** 위에 배치하는 것을 기본으로 합니다. (하단 16px이 현재 타일, 상단 16px이 위쪽 공간을 차지)
- **깊이 정렬**: `sprite.depth = position.y`를 따르며, 벽의 윗부분이 캐릭터를 가릴 수 있도록 설계합니다.

## 2. 상황별 벽 타일 구성 테이블 (Wall Configuration Table)

벽 타일(WALL)의 위치와 주변 바닥(FLOOR) 타일의 관계에 따라 다음과 같이 구성합니다.

| 케이스 (Case) | 인접 타일 조건 (Adjacency) | 추천 타일 프레임 (Tile Frame) | 시각적 특징 (Visual Characteristics) |
| :--- | :--- | :--- | :--- |
| **남쪽 벽 (Top Ledge)** | 아래쪽(S)이 바닥인 경우 | `wall_noside_top_bg_nocrack_0` | 석재 상단면이 보이며 입체감 강조 |
| **북쪽 벽 (Inner/Fill)** | 위쪽(N)이 바닥인 경우 | `wall_noside_inner_nobg_nocrack_0` | 어두운 내부 면이며 바닥과 이어지는 느낌 |
| **서쪽 벽 (Side Left)** | 오른쪽(E)이 바닥인 경우 | `wall_side_left_bg_nocrack_0` | 왼쪽 수직 단면이 노출됨 |
| **동쪽 벽 (Side Right)** | 왼쪽(W)이 바닥인 경우 | `wall_side_right_bg_nocrack_0` | 오른쪽 수직 단면이 노출됨 |
| **좌상단 코너 (Corner TL)** | 아래(S) & 오른쪽(E)이 바닥 | `wall_side_topleft_bg_nocrack_0` | L자형 외부 모서리 처리 |
| **우상단 코너 (Corner TR)** | 아래(S) & 왼쪽(W)이 바닥 | `wall_side_topright_bg_nocrack_0` | 반대편 L자형 외부 모서리 처리 |
| **좌하단 코너 (Corner BL)** | 위(N) & 오른쪽(E)이 바닥 | `wall_noside_bottomleft_nobg_nocrack_0` | 하단 둥근 모서리 마감 |
| **우하단 코너 (Corner BR)** | 위(N) & 왼쪽(W)이 바닥 | `wall_noside_bottomright_nobg_nocrack_0` | 하단 둥근 모서리 마감 |
| **T자형/십자형 내부** | 사방이 벽으로 둘러싸인 경우 | (렌더링 안 함) | 검은색 배경으로 처리하여 명암 대비 확보 |

## 3. 물리 및 레이어 규칙 (Physics & Layering)

1. **충돌 판정**: 벽(WALL) 타일은 16x16 영역 전체를 통과 불가 구역으로 설정합니다.
2. **Y-Sorting**:
   - 남쪽 벽(`top_bg` 계열)의 경우, 캐릭터가 벽 "뒤"로 갈 수 없으므로 충돌로 차단합니다.
   - 북쪽 벽(`inner_nobg` 계열)의 경우, 캐릭터가 벽 "앞"에 서서 벽 하단을 가릴 수 있습니다.
3. **랜덤 변형(Cracks)**:
   - 자연스러운 느낌을 위해 10~20% 확률로 `nocrack` 대신 `crack_0` 프레임을 믹스합니다.
   - 예: `wall_noside_top_bg_crack_0`
