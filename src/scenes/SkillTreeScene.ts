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
                fontFamily: '"Cinzel Decorative", "MedievalSharp", cursive',
                fontSize: '36px',
                color: '#ffd700',
                fontStyle: 'bold',
            })
            .setOrigin(0.5);

        // 정수 잔액 표시
        this.essenceText = this.add
            .text(width - 20, 36, '', {
                fontFamily: '"Cinzel Decorative", "MedievalSharp", cursive',
                fontSize: '22px',
                color: '#ffd700',
            })
            .setOrigin(1, 0.5);
        this.refreshEssenceText();

        // 3열 레이아웃
        const branches: Array<'combat' | 'survival' | 'discovery'> = [
            'combat',
            'survival',
            'discovery',
        ];
        const colWidth = width / 3;

        branches.forEach((branch, colIdx) => {
            const colX = colIdx * colWidth + colWidth / 2;

            // 계열 제목
            this.add
                .text(colX, 90, branchLabel(branch), {
                    fontFamily: '"Cinzel Decorative", "MedievalSharp", cursive',
                    fontSize: '24px',
                    color: '#ffffff',
                    fontStyle: 'bold',
                })
                .setOrigin(0.5);

            // 구분선
            const lineGfx = this.add.graphics();
            lineGfx.lineStyle(1, 0x444444, 1);
            lineGfx.lineBetween(colIdx * colWidth + 10, 110, (colIdx + 1) * colWidth - 10, 110);

            // 노드 목록
            const nodes = SKILL_TREE.filter((n) => n.branch === branch);
            nodes.forEach((node, nodeIdx) => {
                const y = 135 + nodeIdx * 52;
                this.createNode(colX, y, colWidth - 20, node);
            });
        });

        // 뒤로 가기 버튼
        const backBtn = this.add
            .rectangle(width / 2, height - 30, 200, 44, 0x3d2b1f, 0.9)
            .setStrokeStyle(2, 0xffd700)
            .setInteractive({ useHandCursor: true });
        this.add
            .text(width / 2, height - 30, '뒤로 가기', {
                fontFamily: '"Cinzel Decorative", "MedievalSharp", cursive',
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

    private createNode(x: number, y: number, nodeWidth: number, node: SkillNodeDef) {
        const data = MetaProgress.load();
        const currentLevel = data.skillTree[node.branch];
        const unlocked = node.level <= currentLevel;
        const isNext = node.level === currentLevel + 1;
        const canUnlock = isNext && data.essence >= node.cost;

        const cardColor = unlocked ? BRANCH_COLORS[node.branch] : canUnlock ? 0x5a4830 : 0x222222;
        const cardAlpha = unlocked ? 0.85 : canUnlock ? 0.75 : 0.5;
        const strokeColor = unlocked ? 0xffd700 : canUnlock ? 0xffd700 : 0x555555;
        const strokeAlpha = unlocked ? 1 : canUnlock ? 0.8 : 0.3;

        const card = this.add
            .rectangle(x, y, nodeWidth, 44, cardColor, cardAlpha)
            .setStrokeStyle(2, strokeColor, strokeAlpha);

        const nodeName = tr(node.name);
        const label = unlocked
            ? `✓ ${nodeName}`
            : isNext
              ? `${nodeName}  ${I18n.t('skill_tree_node_cost', { cost: node.cost })}`
              : `🔒 ${nodeName}`;

        this.add
            .text(x, y - 6, label, {
                fontFamily: '"Cinzel Decorative", "MedievalSharp", cursive',
                fontSize: '15px',
                color: unlocked ? '#ffffff' : canUnlock ? '#ffd700' : '#888888',
                align: 'center',
            })
            .setOrigin(0.5);

        this.add
            .text(x, y + 10, tr(node.description), {
                fontFamily: '"Cinzel Decorative", "MedievalSharp", cursive',
                fontSize: '12px',
                color: unlocked ? '#ccffcc' : '#aaaaaa',
                align: 'center',
            })
            .setOrigin(0.5);

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
