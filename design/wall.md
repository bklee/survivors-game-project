# Dungeon Wall Naming & Role Rules

이 문서는 던전 방의 구조(North, South, East, West)에 기반한 직관적인 벽 타일 배치 규칙을 정의합니다. 

## 1. 명명 규칙 (Naming Convention: Cardinal Directions)

타일의 생김새(Top/Bottom)가 아닌 **방의 어느 면을 형성하는가**를 기준으로 명명합니다.

- **`N` (North)**: 방의 위쪽 벽 (플레이어가 벽면 정면을 바라봄)
- **`S` (South)**: 방의 아래쪽 벽 (플레이어가 벽의 윗면/Ledge를 내려다봄)
- **`W` (West)**: 방의 왼쪽 벽 (측면 단면 노출)
- **`E` (East)**: 방의 오른쪽 벽 (측면 단면 노출)

## 2. 상황별 벽 타일 매핑 테이블 (Wall Mapping Table)

| 위치 (Role) | 타일 코드명 (ID) | 속성 (Property) | 용도 및 시각적 특징 |
| :--- | :--- | :--- | :--- |
| **북쪽 일반** | `wall_n_plain` | `Row 0` / `Nobg` | 방의 천장 쪽 직선 벽면 |
| **남쪽 일반** | `wall_s_ledge` | `Row 3` / `Bg` | 방의 아래쪽, 석재 상단 턱이 보이는 벽면 |
| **서쪽 측면** | `wall_w_side` | `Row 2` / `Bg` | 방의 왼쪽 수직 마감 |
| **동쪽 측면** | `wall_e_side` | `Row 2` / `Bg` | 방의 오른쪽 수직 마감 |
| **박스형 북서 코너** | `wall_nw_corner` | `Row 0` / `Nobg` | 상단 왼쪽 바깥쪽 모서리 |
| **박스형 남서 코너** | `wall_sw_corner` | `Row 3` / `Bg` | 하단 왼쪽 바깥쪽 모서리 |
| **내부 꺾임 (L)** | `wall_inner_l` | `Row 1` / `Nobg` | 방 내부 구조물 등으로 인한 꺾임 지점 |
| **균열 변형** | `wall_*_crack` | `Variant` | 15% 확률로 섞어 쓰는 파손된 벽 타일 |

## 3. 구현 원칙 (Implementation Rules)

1. **Y-Offset (-16px)**: 타일 하단이 실제 좌표에 오도록 렌더링 시 Y값을 조절합니다.
2. **Auto-Tiling**: 주변 8방향의 타일 정보를 확인하여 위의 테이블에 따라 적절한 ID의 타일을 자동으로 선택합니다.
3. **South-Wall Priority**: `wall_s_ledge` 계열은 플레이어의 이동을 막는 충돌체와 시각적 바닥 라인 정렬이 가장 중요합니다.
