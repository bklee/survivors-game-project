import Phaser from 'phaser';
import { SKILL_TREE, SkillNodeDef } from '../constants/SkillTreeConfig';
import { MetaProgress } from '../core/MetaProgress';
import { I18n, tr } from '../i18n/I18n';

function branchLabel(branch: 'combat' | 'survival' | 'discovery'): string {
    if (branch === 'combat') return I18n.t('skill_tree_branch_combat');
    if (branch === 'survival') return I18n.t('skill_tree_branch_survival');
    return I18n.t('skill_tree_branch_discovery');
}

const BRANCH_COLORS: Record<'combat' | 'survival' | 'discovery', number> = {
    combat: 0xc0392b,
    survival: 0x27ae60,
    discovery: 0x2980b9,
};

export class SkillTreeScene extends Phaser.Scene {
    private essenceText!: Phaser.GameObjects.Text;

    constructor() {
        super({ key: 'SkillTreeScene' });
    }

    create() {
        const { width, height } = this.scale;

        // 배경
        this.add.rectangle(width / 2, height / 2, width, height, 0x111111);

        // 타이틀
        this.add
            .text(width / 2, 36, I18n.t('skill_tree_title'), {
                fontFamily: '"Cinzel Decorative", "Jua", "MedievalSharp", cursive',
                fontSize: '36px',
                color: '#ffd700',
                fontStyle: 'bold',
            })
            .setOrigin(0.5)
            .setDepth(10);

        // 정수 잔액 표시
        this.essenceText = this.add
            .text(width - 20, 36, '', {
                fontFamily: '"Cinzel Decorative", "Jua", "MedievalSharp", cursive',
                fontSize: '22px',
                color: '#ffd700',
            })
            .setOrigin(1, 0.5)
            .setDepth(10);
        this.refreshEssenceText();

        // 3열 레이아웃
        const branches: Array<'combat' | 'survival' | 'discovery'> = [
            'combat',
            'survival',
            'discovery',
        ];
        const colWidth = width / 3;

        // 스크롤 영역 — 헤더(아래 y=120) ~ 뒤로가기 버튼(위 height-65) 사이.
        // 노드들을 별도 container 에 넣고 wheel/drag 로 y 이동.
        const scrollTop = 120;
        const scrollBottom = height - 65;
        const scrollContainer = this.add.container(0, 0);

        branches.forEach((branch, colIdx) => {
            const colX = colIdx * colWidth + colWidth / 2;

            // 계열 제목 (스크롤 영역 안 — 같이 움직임)
            const branchTitle = this.add
                .text(colX, 90, branchLabel(branch), {
                    fontFamily: '"Cinzel Decorative", "Jua", "MedievalSharp", cursive',
                    fontSize: '24px',
                    color: '#ffffff',
                    fontStyle: 'bold',
                })
                .setOrigin(0.5);
            scrollContainer.add(branchTitle);

            // 구분선
            const lineGfx = this.add.graphics();
            lineGfx.lineStyle(1, 0x444444, 1);
            lineGfx.lineBetween(colIdx * colWidth + 10, 110, (colIdx + 1) * colWidth - 10, 110);
            scrollContainer.add(lineGfx);

            // 노드 목록 — 카드 80 + spacing 110 (넓고 시원하게)
            const nodes = SKILL_TREE.filter((n) => n.branch === branch);
            const data = MetaProgress.load();
            const currentLevel = data.skillTree[branch];

            // 트리 연결선 — 노드 사이 세로 라인 (unlocked = 골드, locked = 회색)
            const lineGfxNodes = this.add.graphics();
            for (let i = 0; i < nodes.length - 1; i++) {
                const node = nodes[i];
                const yA = 160 + i * 110 + 40; // 카드 80 의 하단
                const yB = 160 + (i + 1) * 110 - 40; // 다음 카드 상단
                const isLineUnlocked = node.level <= currentLevel;
                lineGfxNodes.lineStyle(3, isLineUnlocked ? 0xffd700 : 0x555555, 0.8);
                lineGfxNodes.lineBetween(colX, yA, colX, yB);
            }
            scrollContainer.add(lineGfxNodes);

            nodes.forEach((node, nodeIdx) => {
                const y = 160 + nodeIdx * 110;
                this.createNode(colX, y, colWidth - 40, node, scrollContainer);
            });
        });

        // Mask — 스크롤 영역만 보이게 (헤더/푸터는 그대로).
        // makeGeometryMask 후 maskGfx 자체가 화면에 그려지면 안 됨 → setVisible(false).
        const maskGfx = this.make.graphics({ x: 0, y: 0 });
        maskGfx.fillStyle(0xffffff);
        maskGfx.fillRect(0, scrollTop, width, scrollBottom - scrollTop);
        scrollContainer.setMask(maskGfx.createGeometryMask());

        // 스크롤 — wheel 로 y 이동. 가장 긴 컬럼 기준 max 스크롤 계산.
        const maxNodesPerBranch = Math.max(
            ...branches.map((b) => SKILL_TREE.filter((n) => n.branch === b).length),
        );
        const contentBottom = 160 + maxNodesPerBranch * 110;
        const maxScroll = Math.max(0, contentBottom - scrollBottom);
        this.input.on('wheel', (_p: unknown, _g: unknown, _dx: number, dy: number) => {
            scrollContainer.y = Phaser.Math.Clamp(scrollContainer.y - dy, -maxScroll, 0);
        });
        // 터치 drag — 모바일 지원
        let dragStartY = 0;
        let dragStartScrollY = 0;
        let isDragging = false;
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.y < scrollTop || pointer.y > scrollBottom) return;
            isDragging = true;
            dragStartY = pointer.y;
            dragStartScrollY = scrollContainer.y;
        });
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!isDragging) return;
            const dy = pointer.y - dragStartY;
            scrollContainer.y = Phaser.Math.Clamp(dragStartScrollY + dy, -maxScroll, 0);
        });
        this.input.on('pointerup', () => {
            isDragging = false;
        });

        // 뒤로 가기 버튼
        const backBtn = this.add
            .rectangle(width / 2, height - 30, 200, 44, 0x3d2b1f, 0.9)
            .setStrokeStyle(2, 0xffd700)
            .setInteractive({ useHandCursor: true });
        this.add
            .text(width / 2, height - 30, '뒤로 가기', {
                fontFamily: '"Cinzel Decorative", "Jua", "MedievalSharp", cursive',
                fontSize: '22px',
                color: '#ffffff',
            })
            .setOrigin(0.5);

        backBtn.on('pointerdown', () => {
            this.scene.start('TitleScene');
        });
        backBtn.on('pointerover', () => backBtn.setFillStyle(0x5a4030, 1));
        backBtn.on('pointerout', () => backBtn.setFillStyle(0x3d2b1f, 0.9));
    }

    private createNode(
        x: number,
        y: number,
        nodeWidth: number,
        node: SkillNodeDef,
        container: Phaser.GameObjects.Container,
    ) {
        const data = MetaProgress.load();
        const currentLevel = data.skillTree[node.branch];
        const unlocked = node.level <= currentLevel;
        const isNext = node.level === currentLevel + 1;
        const canUnlock = isNext && data.essence >= node.cost;

        const cardColor = unlocked ? BRANCH_COLORS[node.branch] : canUnlock ? 0x5a4830 : 0x222222;
        const cardAlpha = unlocked ? 0.85 : canUnlock ? 0.75 : 0.5;
        const strokeColor = unlocked ? 0xffd700 : canUnlock ? 0xffd700 : 0x555555;
        const strokeAlpha = unlocked ? 1 : canUnlock ? 0.8 : 0.3;

        // 카드 80 — 더 큼직하게 (트리 노드 느낌)
        const card = this.add
            .rectangle(x, y, nodeWidth, 80, cardColor, cardAlpha)
            .setStrokeStyle(3, strokeColor, strokeAlpha);
        container.add(card);

        const nodeName = tr(node.name);
        const label = unlocked
            ? `✓ ${nodeName}`
            : isNext
              ? `${nodeName}  ${I18n.t('skill_tree_node_cost', { cost: node.cost })}`
              : `🔒 ${nodeName}`;

        // 노드 이름 22px, 설명 16px — 잘 보이게.
        const nameText = this.add
            .text(x, y - 16, label, {
                fontFamily: '"Cinzel Decorative", "Jua", "MedievalSharp", cursive',
                fontSize: '22px',
                color: unlocked ? '#ffffff' : canUnlock ? '#ffd700' : '#888888',
                fontStyle: 'bold',
                align: 'center',
            })
            .setOrigin(0.5);
        container.add(nameText);

        const descText = this.add
            .text(x, y + 18, tr(node.description), {
                fontFamily: '"Cinzel Decorative", "Jua", "MedievalSharp", cursive',
                fontSize: '18px',
                color: unlocked ? '#e8ffe8' : '#dddddd',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 2,
                align: 'center',
                wordWrap: { width: nodeWidth - 20 },
            })
            .setOrigin(0.5);
        container.add(descText);

        if (canUnlock) {
            card.setInteractive({ useHandCursor: true });
            card.on('pointerdown', () => {
                const ok = MetaProgress.upgradeSkillTree(node.branch, node.cost);
                if (ok) {
                    this.scene.restart();
                }
            });
            card.on('pointerover', () => card.setFillStyle(0x7a6040, 1));
            card.on('pointerout', () => card.setFillStyle(cardColor, cardAlpha));
        }
    }

    private refreshEssenceText() {
        const e = MetaProgress.load().essence;
        this.essenceText.setText(I18n.t('skill_tree_essence_label', { amount: e }));
    }
}
