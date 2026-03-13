# Wall Visual Guide (v0.1)

이 문서는 벽면 고해상도 아틀라스(`atlas_walls_high-16x32.png`)의 모든 리소스를 시각적/기술적으로 매핑한 가이드입니다. 

![Wall Atlas Visual Mapping](/Users/hangup2/.gemini/antigravity/brain/56af37ed-003e-4a06-9b5d-94d389a0fd5e/wall_atlas_mapping_guide_v0_1_1773365153560.png)

## 🧱 1. 벽면 및 모서리 (Walls & Corners)
기본적인 던전 구조를 만드는 16x32 크기의 타일들입니다.

| 이름 (Name) | 좌표 (X Y) | 설명 |
| :--- | :---: | :--- |
| **wall_n_mid** | **32 96** | **심플 일자벽 (현재 북쪽 벽 적용)** |
| wall_n_corner_l | 0 96 | 북서쪽 모서리 |
| wall_n_corner_r | 64 96 | 북동쪽 모서리 |
| wall_n_mid_crack | 160 96 | 갈라진 벽면 |
| wall_face_mid | 32 0 | 장식(Ledge)이 있는 전면 벽 |
| wall_w_mid | 0 96 | 서쪽 측면 벽 |
| wall_e_mid | 64 96 | 동쪽 측면 벽 |
| wall_inner_mid | 32 32 | 내부 채움 벽면 |

## 🚩 2. 장식 및 프롭 (Banners & Props)
벽면에 부착하여 분위기를 내는 16x16 크기 요소들입니다.

- **Banners (배너)**: `green`(240,32), `yellow`(256,32), `red`(272,32), `blue`(288,32)
- **Skulls (해골)**: `skull_1`(240,48), `skull_2`(256,48), `skull_3`(272,48)
- **Slime (슬라임)**: `goo_top`(240,0), `goo_mid`(240,16), `goo_drip`(256,0)

## 🚪 3. 입구 및 특수 오브젝트 (Entrances & Specials)
대형 문이나 기둥 등 특수한 구조물입니다.

- **Large Doors (48x64)**:
  - `wall_door_wood_closed`: (288, 64)
  - `wall_door_arch_open`: (336, 64)
- **Pillars (기둥)**: `column`(240,64), `column_wall`(240,96)
- **Door Wall**: `door_wall`(256,96)

## ⛲ 4. 분수 애니메이션 (Animated Fountains)
물줄기가 흐르는 16x32 애니메이션 타일입니다.

- **Red (적색)**: 상단(192~224, 0), 중단(192~224, 32)
- **Blue (청색)**: 상단(192~224, 96), 중단(192~224, 64)

---
*참조 파일: `public/assets/wall_list_v0.1` (Raw Data)*
