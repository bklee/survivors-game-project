# Dungeon Wall Cardinal Rules (v1.0)

이 문서는 던전의 방 구조(North, South, East, West)에 기반한 최종 벽면 타일 매핑 시스템을 정의합니다.

## 1. 개요 (Core Concept)
타일의 생김새가 아닌 **"방의 어느 방향 면인가"**를 기준으로 명명합니다. 이를 통해 개발자가 직관적으로 가시성을 확보하고 배치 실수를 방지합니다.

## 2. 방향별 타일 매핑 (Mapping Table)

| 위치 (Role) | 프레임 ID (Frame ID) | 아틀라스 좌표 (X, Y) | 시각적 특징 (Visual Feature) |
| :--- | :--- | :--- | :--- |
| **North/South (수평)** | `wall_n_mid` / `wall_s_mid` | 32, 96 | 수평 벽면. 석재 상단 턱(Ledge) 노출 |
| **West (서쪽)** | `wall_w_mid` | 0, 96 | 수직 왼쪽 벽면 (Corner L과 동일 비주얼 사용) |
| **East (동쪽)** | `wall_e_mid` | 64, 96 | 수직 오른쪽 벽면 (Corner R과 동일 비주얼 사용) |
| **Horizontal Corner** | `wall_n_corner_l` / `wall_s_corner_l` | 0, 96 | 수평 벽의 왼쪽 모서리 연계 |
| **Face Wall (정면)** | `wall_face_mid` | 32, 0 | 상단 턱이 없는 정면 벽면 |

## 3. 구현 원칙 (Implementation Details)

1. **Y-Offset (-16px)**: 타일은 16x32 크기이므로, 바닥 타일과의 정당한 시각적 연결을 위해 실제 Y 좌표보다 **16px 위**에서 렌더링을 시작합니다.
2. **Auto-Tiling Logic**:
   - `wall_s_mid` (남쪽)는 아래쪽(South)이 열린 공간(Floor)일 때 사용합니다.
   - `wall_n_mid` (북쪽)는 위쪽(North)이 열린 공간(Floor)일 때 사용합니다.
   - `wall_w_mid` (서쪽)는 오른쪽(East)이 열린 공간(Floor)일 때 사용합니다.
   - `wall_e_mid` (동쪽)는 왼쪽(West)이 열린 공간(Floor)일 때 사용합니다.
3. **Random Variance**: 자연스러운 텍스처를 위해 약 10%의 확률로 `*_crack` 프레임을 섞어서 사용합니다.
