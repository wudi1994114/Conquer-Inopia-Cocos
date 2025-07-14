import { _decorator, Component, Node, UITransform, Canvas, Widget, Label, Button, Layout, instantiate, Prefab, resources, Vec3, UIOpacity, Color, director, sys, input, Input, KeyCode, Vec2, RigidBody2D } from 'cc';
import { EnemyController } from './EnemyController';
import { enemyDatabase } from './configs/enemy-config';

const { ccclass, property } = _decorator;

/**
 * 参数调整配置接口
 */
interface ParameterConfig {
    key: string;           // 参数键名
    displayName: string;   // 显示名称
    minValue: number;      // 最小值
    maxValue: number;      // 最大值
    step: number;          // 调整步长
    defaultValue: number;  // 默认值
    unit?: string;         // 单位（可选）
    description?: string;  // 描述（可选）
}

/**
 * 怪物动画测试管理器
 * 独立的测试系统，不影响游戏主逻辑
 */
@ccclass('MonsterTestManager')
export class MonsterTestManager extends Component {
    
    @property({ type: Prefab, tooltip: '敌人预制件' })
    public enemyPrefab: Prefab | null = null;
    
    // ======================== 测试怪物相关 ========================
    private _testMonster: Node | null = null;
    private _testMonsterController: EnemyController | null = null;
    private _currentMonsterType: string = 'ent_normal';
    
    // ======================== UI面板相关 ========================
    private _testPanel: Node | null = null;
    private _monsterTypeLabel: Label | null = null;
    private _animationStateLabel: Label | null = null;
    private _debugInfoLabel: Label | null = null;
    private _controlModeLabel: Label | null = null;
    private _parameterPanel: Node | null = null;
    private _parameterLabels: Map<string, Label> = new Map();
    
    // ======================== 测试状态 ========================
    private _isTestMode: boolean = false;
    private _currentAnimationState: string = 'Idle';
    private _debugUpdateTimer: number = 0;
    
    // ======================== 参数调整系统 ========================
    private _parameterAdjustments: Map<string, number> = new Map();
    private _originalParameters: any = null;
    
    // 可调整的参数配置
    private readonly PARAMETER_CONFIGS: ParameterConfig[] = [
        // 基础属性
        { key: 'baseHealth', displayName: '生命值', minValue: 10, maxValue: 10000, step: 50, defaultValue: 100, unit: 'HP' },
        { key: 'baseAttack', displayName: '攻击力', minValue: 1, maxValue: 500, step: 5, defaultValue: 10, unit: '点' },
        { key: 'baseDefense', displayName: '防御力', minValue: 0, maxValue: 100, step: 1, defaultValue: 5, unit: '点' },
        { key: 'moveSpeed', displayName: '移动速度', minValue: 0.5, maxValue: 20, step: 0.5, defaultValue: 1, unit: '像素/秒' },
        
        // 攻击系统
        { key: 'attackRange', displayName: '攻击范围', minValue: 10, maxValue: 500, step: 10, defaultValue: 60, unit: '像素' },
        { key: 'attackInterval', displayName: '攻击间隔', minValue: 0.1, maxValue: 10, step: 0.1, defaultValue: 2.5, unit: '秒' },
        
        // AI系统
        { key: 'detectionRange', displayName: '检测范围', minValue: 50, maxValue: 3000, step: 50, defaultValue: 1200, unit: '像素' },
        { key: 'pursuitRange', displayName: '追击范围', minValue: 50, maxValue: 3000, step: 50, defaultValue: 1500, unit: '像素' },
        
        // 动画系统
        { key: 'animationSpeed', displayName: '动画速度', minValue: 1, maxValue: 30, step: 1, defaultValue: 8, unit: '帧/秒' },
        
        // 视觉效果
        { key: 'nodeScale', displayName: '节点缩放', minValue: 0.1, maxValue: 5, step: 0.1, defaultValue: 1, unit: '倍' },
        { key: 'stunDuration', displayName: '眩晕时间', minValue: 0, maxValue: 5, step: 0.1, defaultValue: 0.5, unit: '秒' },
        { key: 'damageFlashDuration', displayName: '受伤闪烁', minValue: 0, maxValue: 2, step: 0.1, defaultValue: 0.2, unit: '秒' }
    ];
    
    // ======================== 怪物控制相关 ========================
    private _isControllingMonster: boolean = false;
    private _playerController: any = null; // 保存玩家控制器引用
    private _monsterMoveDirection: Vec2 = new Vec2(0, 0);
    private _monsterRigidbody: RigidBody2D | null = null;
    private _lastMoveDirection: Vec2 = new Vec2(0, 0);
    private _wasMoving: boolean = false;
    
    // 可用的怪物类型
    private readonly MONSTER_TYPES = [
        'ent_normal',
        'lich_elite', 
        'ent_boss'
    ];
    
    // 可用的动画状态
    private readonly ANIMATION_STATES = [
        'Idle',
        'Walk', 
        'Attack',
        'Hurt',
        'Death'
    ];

    onLoad() {
        // 检查是否在调试模式
        if (sys.isNative || !sys.isBrowser) {
            // 在发布版本中禁用测试系统
            this.enabled = false;
            return;
        }
        
        console.log('🧪 MonsterTestManager 已加载');
        console.log('🎮 按F1键开启/关闭测试面板');
        this.initializeTestSystem();
    }

    /**
     * 初始化测试系统
     */
    private initializeTestSystem() {
        // 创建测试UI面板
        this.createTestUI();
        
        // 创建测试怪物
        this.createTestMonster();
        
        // 默认隐藏测试面板
        this.setTestModeActive(false);
        
        // 初始化UI显示
        this.updateUIDisplay();
    }

    /**
     * 创建测试UI面板
     */
    private createTestUI() {
        // 获取Canvas - 尝试多种方式
        let canvas = this.node.getComponent(Canvas);
        if (!canvas) {
            canvas = this.node.getComponentInChildren(Canvas);
        }
        if (!canvas) {
            // 尝试从场景根节点寻找Canvas
            const scene = director.getScene();
            if (scene) {
                canvas = scene.getComponentInChildren(Canvas);
            }
        }
        if (!canvas) {
            console.error('❌ 未找到Canvas组件');
            return;
        }
        
        // 创建测试面板根节点
        this._testPanel = new Node('TestPanel');
        this._testPanel.addComponent(UITransform);
        this._testPanel.addComponent(Widget);
        
        // 设置为Canvas的子节点
        canvas.node.addChild(this._testPanel);
        
        // 配置Widget - 固定在左上角
        const widget = this._testPanel.getComponent(Widget);
        if (widget) {
            widget.isAlignTop = true;
            widget.isAlignLeft = true;
            widget.top = 10;
            widget.left = 10;
            widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
        }
        
        // 设置面板尺寸 - 增加到更大的尺寸以容纳参数面板
        const panelTransform = this._testPanel.getComponent(UITransform);
        if (panelTransform) {
            panelTransform.setContentSize(520, 1000);
        }
        
        // 添加背景色（半透明黑色）
        const uiOpacity = this._testPanel.addComponent(UIOpacity);
        uiOpacity.opacity = 200;
        
        // 创建布局组件
        const layout = this._testPanel.addComponent(Layout);
        layout.type = Layout.Type.VERTICAL;
        layout.paddingTop = 15;
        layout.paddingBottom = 15;
        layout.paddingLeft = 15;
        layout.paddingRight = 15;
        layout.spacingY = 8;
        
        // 创建UI元素
        this.createUIElements();
        
        console.log('✅ 测试UI面板创建完成');
    }

    /**
     * 创建UI元素
     */
    private createUIElements() {
        if (!this._testPanel) return;
        
        // 标题
        this.createLabel('=== 怪物动画测试器 ===', 22, Color.YELLOW);
        
        // 操作提示 - 改进操作说明
        this.createLabel('🎮 主要通过键盘操作，按钮仅作备用', 14, Color.YELLOW);
        this.createLabel('快捷键: F1切换测试 | C键切换控制模式', 12, Color.GRAY);
        
        // 当前怪物类型显示
        this._monsterTypeLabel = this.createLabel('当前怪物: ent_normal', 18, Color.WHITE);
        
        // 当前动画状态显示
        this._animationStateLabel = this.createLabel('当前状态: Idle', 18, Color.WHITE);
        
        // 控制模式显示 - 动态更新
        this._controlModeLabel = this.createLabel('模式: 观察模式 (按C键切换控制模式)', 16, Color.CYAN);
        
        // 添加详细操作说明
        this.createLabel('=== 键盘操作指南 ===', 16, Color.YELLOW);
        this.createLabel('观察模式: 1-3切换怪物 | QWERT播放动画 | C进入控制 | Y测试动画', 12, Color.GRAY);
        this.createLabel('控制模式: WASD移动怪物 | J攻击 | U火球 | K受伤 | C退出控制 | T测试动画', 12, Color.GRAY);
        this.createLabel('✨ 智能动画: 移动时自动播放Walk+方向 | 停止时自动Idle', 12, Color.MAGENTA);
        this.createLabel('🎛️ 参数调整: 使用面板按钮实时调整怪物属性 | 黄色=已修改', 12, Color.CYAN);
        
        // 怪物类型切换按钮
        this.createLabel('--- 怪物类型 ---', 16, Color.CYAN);
        this.MONSTER_TYPES.forEach((monsterType, index) => {
            this.createButton(`${index + 1}. 切换到 ${monsterType}`, () => {
                this.switchMonsterType(monsterType);
            });
        });
    
        
        // 特殊测试按钮
        this.createLabel('--- 特殊测试 ---', 16, Color.CYAN);
        this.createButton('切换控制模式 (C键)', () => {
            this.toggleMonsterControl();
        });
        
        this.createButton('测试受伤 (K键)', () => {
            this.testTakeDamage();
        });
        
        this.createButton('重置怪物 (空格键)', () => {
            this.resetMonster();
        });
        
        this.createButton('🧪 测试动画系统 (Y/T键)', () => {
            this.testMonsterAnimationSystem();
        });
        
        this.createButton('关闭测试面板 (F1键)', () => {
            this.setTestModeActive(false);
        });
        
        // 创建参数调整面板
        this.createParameterPanel();
        
        // 调试信息显示
        this.createLabel('--- 调试信息 ---', 16, Color.CYAN);
        this._debugInfoLabel = this.createLabel('调试信息加载中...', 14, Color.GREEN);
        
        // 设置调试信息标签的UITransform - 增加尺寸
        const debugTransform = this._debugInfoLabel.getComponent(UITransform);
        if (debugTransform) {
            debugTransform.setContentSize(460, 120);
        }
    }

    /**
     * 创建文本标签
     */
    private createLabel(text: string, fontSize: number, color: Color): Label {
        const labelNode = new Node('Label');
        labelNode.addComponent(UITransform);
        this._testPanel!.addChild(labelNode);
        
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.color = color;
        label.overflow = Label.Overflow.SHRINK;
        
        // 设置自动换行 - 增加标签宽度
        const labelTransform = labelNode.getComponent(UITransform);
        if (labelTransform) {
            labelTransform.setContentSize(460, fontSize + 4);
        }
        
        return label;
    }

    /**
     * 创建按钮
     */
    private createButton(text: string, callback: () => void): Button {
        const buttonNode = new Node('Button');
        buttonNode.addComponent(UITransform);
        this._testPanel!.addChild(buttonNode);
        
        const button = buttonNode.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        button.zoomScale = 0.9;
        
        // 设置按钮尺寸 - 增加按钮尺寸
        const buttonTransform = buttonNode.getComponent(UITransform);
        if (buttonTransform) {
            buttonTransform.setContentSize(440, 35);
        }
        
        // 添加按钮文本
        const labelNode = new Node('Label');
        labelNode.addComponent(UITransform);
        buttonNode.addChild(labelNode);
        
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = 16;  // 增加按钮字体大小
        label.color = Color.WHITE;
        
        // 设置点击事件
        button.node.on(Button.EventType.CLICK, callback, this);
        
        return button;
    }

    /**
     * 创建参数调整面板
     */
    private createParameterPanel() {
        // 创建参数调整标题
        this.createLabel('=== 参数调整面板 ===', 16, Color.YELLOW);
        this.createLabel('实时调整怪物属性，立即生效！', 12, Color.GRAY);
        
        // 为每个参数创建调整控件
        this.PARAMETER_CONFIGS.forEach(config => {
            this.createParameterControl(config);
        });
        
        // 添加重置按钮
        this.createButton('🔄 重置所有参数', () => {
            this.resetAllParameters();
        });
    }

    /**
     * 创建单个参数的调整控件
     */
    private createParameterControl(config: ParameterConfig) {
        // 创建参数标签
        const parameterLabel = this.createLabel(
            `${config.displayName}: ${config.defaultValue}${config.unit || ''}`, 
            14, 
            Color.WHITE
        );
        
        // 保存标签引用
        this._parameterLabels.set(config.key, parameterLabel);
        
        // 创建调整按钮容器
        const buttonContainer = new Node('ButtonContainer');
        buttonContainer.addComponent(UITransform);
        this._testPanel!.addChild(buttonContainer);
        
        // 设置容器布局
        const containerTransform = buttonContainer.getComponent(UITransform);
        if (containerTransform) {
            containerTransform.setContentSize(480, 30);
        }
        
        // 创建减少按钮
        this.createParameterButton(buttonContainer, '－', () => {
            this.adjustParameter(config.key, -config.step, config);
        }, 0, 0, 50, 25);
        
        // 创建增加按钮
        this.createParameterButton(buttonContainer, '＋', () => {
            this.adjustParameter(config.key, config.step, config);
        }, 430, 0, 50, 25);
        
        // 创建快速调整按钮
        this.createParameterButton(buttonContainer, '－－', () => {
            this.adjustParameter(config.key, -config.step * 10, config);
        }, 60, 0, 50, 25);
        
        this.createParameterButton(buttonContainer, '＋＋', () => {
            this.adjustParameter(config.key, config.step * 10, config);
        }, 370, 0, 50, 25);
        
        // 创建重置按钮
        this.createParameterButton(buttonContainer, '重置', () => {
            this.resetParameter(config.key, config);
        }, 210, 0, 50, 25);
    }

    /**
     * 创建参数调整按钮
     */
    private createParameterButton(
        parent: Node, 
        text: string, 
        callback: () => void, 
        x: number, 
        y: number, 
        width: number, 
        height: number
    ) {
        const buttonNode = new Node('ParamButton');
        buttonNode.addComponent(UITransform);
        parent.addChild(buttonNode);
        
        const button = buttonNode.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        button.zoomScale = 0.9;
        
        // 设置按钮位置和尺寸
        const buttonTransform = buttonNode.getComponent(UITransform);
        if (buttonTransform) {
            buttonTransform.setContentSize(width, height);
        }
        buttonNode.setPosition(x, y, 0);
        
        // 添加按钮文本
        const labelNode = new Node('Label');
        labelNode.addComponent(UITransform);
        buttonNode.addChild(labelNode);
        
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = 12;
        label.color = Color.WHITE;
        
        // 设置点击事件
        button.node.on(Button.EventType.CLICK, callback, this);
        
        return button;
    }

    /**
     * 创建测试怪物
     */
    private createTestMonster() {
        if (!this.enemyPrefab) {
            console.error('❌ 未设置敌人预制件');
            return;
        }
        
        // 销毁现有测试怪物
        if (this._testMonster) {
            this._testMonster.destroy();
        }
        
        // 创建新的测试怪物
        this._testMonster = instantiate(this.enemyPrefab);
        this.node.addChild(this._testMonster);
        
        // 获取EnemyController组件
        this._testMonsterController = this._testMonster.getComponent(EnemyController);
        if (!this._testMonsterController) {
            console.error('❌ 测试怪物缺少EnemyController组件');
            return;
        }
        
        // 获取怪物的RigidBody2D组件用于控制移动
        this._monsterRigidbody = this._testMonster.getComponent(RigidBody2D);
        
        // 初始化怪物
        this._testMonsterController.init(this._currentMonsterType);
        
        // 设置玩家引用，让怪物AI能够工作
        this.setupPlayerReference();
        
        // 重置移动状态
        this._monsterMoveDirection.set(0, 0);
        this._lastMoveDirection.set(0, 0);
        this._wasMoving = false;
        
        // 保存原始参数
        this.saveOriginalParameters();
        
        // 应用当前参数调整
        this.applyParameterAdjustments();
        
        // 初始化参数显示
        this.initializeParameterDisplay();
        
        // 设置测试怪物位置
        this._testMonster.setPosition(new Vec3(0, 0, 0));
        
        console.log(`✅ 测试怪物创建完成: ${this._currentMonsterType}`);
    }

    /**
     * 设置玩家引用，让怪物AI能够工作
     */
    private setupPlayerReference() {
        if (!this._testMonsterController) {
            return;
        }
        
        // 在场景中查找玩家节点
        const scene = director.getScene();
        if (!scene) {
            console.warn('⚠️ 未找到场景，无法设置玩家引用');
            return;
        }
        
        // 递归搜索玩家节点
        const findPlayerNode = (node: Node): Node | null => {
            // 检查节点是否有PlayerController组件
            if (node.getComponent('PlayerController')) {
                return node;
            }
            
            // 递归搜索子节点
            for (const child of node.children) {
                const result = findPlayerNode(child);
                if (result) return result;
            }
            return null;
        };
        
        const playerNode = findPlayerNode(scene);
        if (playerNode) {
            this._testMonsterController.playerNode = playerNode;
            console.log(`✅ 已设置玩家引用: ${playerNode.name}`);
        } else {
            console.warn('⚠️ 未找到玩家节点，怪物AI将无法工作');
        }
    }

    /**
     * 切换怪物类型
     */
    private switchMonsterType(monsterType: string) {
        if (this.MONSTER_TYPES.indexOf(monsterType) === -1) {
            console.error(`❌ 无效的怪物类型: ${monsterType}`);
            return;
        }
        
        this._currentMonsterType = monsterType;
        this._currentAnimationState = 'Idle';
        
        // 重置移动状态
        this._monsterMoveDirection.set(0, 0);
        this._lastMoveDirection.set(0, 0);
        this._wasMoving = false;
        
        // 重新创建怪物
        this.createTestMonster();
        
        // 更新UI显示
        this.updateUIDisplay();
        
        console.log(`🔄 切换到怪物类型: ${monsterType}`);
    }

    /**
     * 触发动画
     */
    private triggerAnimation(state: string) {
        if (!this._testMonsterController) {
            console.error('❌ 测试怪物控制器不存在');
            return;
        }
        
        this._currentAnimationState = state;
        
        // 根据动画状态触发相应行为
        switch (state) {
            case 'Idle':
                this.setMonsterAnimationState('Idle', this.getCurrentMonsterDirection());
                break;
            case 'Walk':
                this.setMonsterAnimationState('Walk', this.getCurrentMonsterDirection());
                break;
            case 'Attack':
                this.triggerMonsterAttack();
                break;
            case 'Hurt':
                // 通过受伤方法触发
                this._testMonsterController.takeDamage(1, 'test' as any, Date.now());
                break;
            case 'Death':
                // 通过致命伤害触发
                this._testMonsterController.takeDamage(9999, 'test' as any, Date.now());
                break;
        }
        
        // 更新UI显示
        this.updateUIDisplay();
        
        console.log(`🎭 触发动画: ${state}`);
    }

    /**
     * 测试受伤
     */
    private testTakeDamage() {
        if (!this._testMonsterController) {
            console.error('❌ 测试怪物控制器不存在');
            return;
        }
        
        // 造成随机伤害
        const damage = Math.floor(Math.random() * 50) + 10;
        this._testMonsterController.takeDamage(damage, 'test' as any, Date.now());
        
        this._currentAnimationState = 'Hurt';
        this.updateUIDisplay();
        
        console.log(`💥 测试受伤: ${damage} 点伤害`);
    }

    /**
     * 重置怪物
     */
    private resetMonster() {
        this.createTestMonster();
        this._currentAnimationState = 'Idle';
        
        // 重置移动状态
        this._monsterMoveDirection.set(0, 0);
        this._lastMoveDirection.set(0, 0);
        this._wasMoving = false;
        
        this.updateUIDisplay();
        
        console.log('🔄 重置怪物');
    }

    /**
     * 更新UI显示
     */
    private updateUIDisplay() {
        if (this._monsterTypeLabel) {
            this._monsterTypeLabel.string = `当前怪物: ${this._currentMonsterType}`;
        }
        
        if (this._animationStateLabel) {
            this._animationStateLabel.string = `当前状态: ${this._currentAnimationState}`;
        }
        
        if (this._controlModeLabel) {
            const modeText = this._isControllingMonster ? '控制模式' : '观察模式';
            const keyText = this._isControllingMonster ? '按C键退出控制' : '按C键进入控制';
            this._controlModeLabel.string = `模式: ${modeText} (${keyText})`;
            
            // 根据模式设置不同颜色
            this._controlModeLabel.color = this._isControllingMonster ? Color.MAGENTA : Color.CYAN;
        }
    }

    /**
     * 更新调试信息
     */
    private updateDebugInfo() {
        if (!this._debugInfoLabel || !this._testMonster || !this._testMonsterController) {
            return;
        }
        
        // 获取怪物的UITransform
        const uiTransform = this._testMonster.getComponent(UITransform);
        const monsterData = enemyDatabase[this._currentMonsterType];
        
        let debugInfo = `=== 调试信息 ===\n`;
        
        // 基本信息
        debugInfo += `怪物类型: ${this._currentMonsterType}\n`;
        debugInfo += `生命值: ${this._testMonsterController.getCurrentHealth()}/${monsterData?.baseHealth || 'N/A'}\n`;
        
        // 尺寸信息
        if (uiTransform) {
            const size = uiTransform.contentSize;
            debugInfo += `UITransform尺寸: ${size.width.toFixed(1)}x${size.height.toFixed(1)}\n`;
            
            // 锚点信息
            const anchor = uiTransform.anchorPoint;
            debugInfo += `锚点: (${anchor.x.toFixed(3)}, ${anchor.y.toFixed(3)})\n`;
        }
        
        // 位置信息
        const position = this._testMonster.position;
        debugInfo += `位置: (${position.x.toFixed(1)}, ${position.y.toFixed(1)})\n`;
        
        // 缩放信息
        const scale = this._testMonster.scale;
        debugInfo += `缩放: ${scale.x.toFixed(2)}\n`;
        
        // 节点状态
        debugInfo += `节点激活: ${this._testMonster.active ? '是' : '否'}\n`;
        
        this._debugInfoLabel.string = debugInfo;
    }

    /**
     * 设置测试模式激活状态
     */
    public setTestModeActive(active: boolean) {
        this._isTestMode = active;
        
        if (this._testPanel) {
            this._testPanel.active = active;
        }
        
        if (this._testMonster) {
            this._testMonster.active = active;
        }
        
        // 如果关闭测试模式且正在控制怪物，自动恢复正常状态
        if (!active && this._isControllingMonster) {
            this.disableMonsterControl();
        }
        
        console.log(`🧪 测试模式: ${active ? '开启' : '关闭'}`);
        
        // 如果开启测试模式，显示使用提示
        if (active) {
            console.log('🎮 测试系统已激活！');
            console.log('  - 键盘操作更直观，无需点击按钮');
            console.log('  - 观察模式: 1-3切换怪物 | QWERT控制动画 | C进入控制');
            console.log('  - 控制模式: WASD移动怪物 | JK攻击受伤 | C退出控制');
            console.log('  - ✨ 智能动画: 移动时自动播放Walk+方向，停止时自动Idle');
            console.log('  - 🎛️ 参数调整: 实时调整生命值、攻速、移速等12个属性');
        }
    }

    /**
     * 切换测试模式
     */
    public toggleTestMode() {
        this.setTestModeActive(!this._isTestMode);
    }

    /**
     * 切换怪物控制模式
     */
    public toggleMonsterControl() {
        this._isControllingMonster = !this._isControllingMonster;
        
        if (this._isControllingMonster) {
            // 启用怪物控制模式
            this.enableMonsterControl();
        } else {
            // 禁用怪物控制模式
            this.disableMonsterControl();
        }
        
        // 更新UI显示
        this.updateUIDisplay();
        
        console.log(`🎮 怪物控制模式: ${this._isControllingMonster ? '启用' : '禁用'}`);
    }

    /**
     * 启用怪物控制模式
     */
    private enableMonsterControl() {
        // 寻找并暂时禁用玩家控制器
        this.findAndDisablePlayerController();
        
        console.log('🎮 怪物控制模式已启用');
        console.log('  - WASD: 控制怪物移动 (自动播放Walk+方向动画)');
        console.log('  - J: 怪物攻击 (方向自动跟随移动)');
        console.log('  - K: 怪物受伤');
        console.log('  - T: 测试动画系统 (调试动画问题)');
        console.log('  - C: 切换回观察模式 (自动播放Idle动画)');
    }

    /**
     * 禁用怪物控制模式
     */
    private disableMonsterControl() {
        // 恢复玩家控制器
        this.restorePlayerController();
        
        // 停止怪物移动
        this._monsterMoveDirection.set(0, 0);
        this._lastMoveDirection.set(0, 0);
        this._wasMoving = false;
        
        if (this._monsterRigidbody) {
            this._monsterRigidbody.linearVelocity = Vec2.ZERO;
        }
        
        // 回到idle状态
        this.setMonsterAnimationState('Idle', this.getCurrentMonsterDirection());
        this._currentAnimationState = 'Idle';
        this.updateUIDisplay();
        
        console.log('🎮 怪物控制模式已禁用，恢复正常游戏');
    }

    /**
     * 寻找并暂时禁用玩家控制器
     */
    private findAndDisablePlayerController() {
        // 在场景中寻找玩家节点
        const scene = director.getScene();
        if (!scene) return;
        
        // 递归搜索带有PlayerController组件的节点
        const findPlayerNode = (node: Node): Node | null => {
            const playerController = node.getComponent('PlayerController');
            if (playerController) {
                return node;
            }
            
            for (const child of node.children) {
                const result = findPlayerNode(child);
                if (result) return result;
            }
            return null;
        };
        
        const playerNode = findPlayerNode(scene);
        if (playerNode) {
            this._playerController = playerNode.getComponent('PlayerController');
            if (this._playerController && this._playerController.enabled) {
                this._playerController.enabled = false;
                console.log('⏸️ 已暂时禁用玩家控制器');
            }
        }
    }

    /**
     * 恢复玩家控制器
     */
    private restorePlayerController() {
        if (this._playerController) {
            this._playerController.enabled = true;
            this._playerController = null;
            console.log('▶️ 已恢复玩家控制器');
        }
    }

    /**
     * 获取当前移动速度
     */
    private getCurrentMoveSpeed(): number {
        const adjustment = this._parameterAdjustments.get('moveSpeed') || 0;
        const originalValue = this._originalParameters ? this._originalParameters['moveSpeed'] : 1;
        return originalValue + adjustment;
    }

    /**
     * 控制怪物移动
     */
    private controlMonsterMovement() {
        if (!this._isControllingMonster || !this._monsterRigidbody) {
            return;
        }
        
        const isMoving = this._monsterMoveDirection.length() > 0.1;
        
        // 应用移动
        if (isMoving) {
            // 获取当前配置的移动速度
            const moveSpeed = this.getCurrentMoveSpeed();
            const velocity = this._monsterMoveDirection.clone().normalize().multiplyScalar(moveSpeed);
            this._monsterRigidbody.linearVelocity = velocity;
        } else {
            this._monsterRigidbody.linearVelocity = Vec2.ZERO;
        }
        
        // 检查移动状态变化，智能播放动画
        if (isMoving !== this._wasMoving || 
            (isMoving && !this._lastMoveDirection.equals(this._monsterMoveDirection))) {
            this.updateMonsterAnimation(isMoving);
            this._wasMoving = isMoving;
            this._lastMoveDirection = this._monsterMoveDirection.clone();
        }
    }
    
    /**
     * 智能更新怪物动画
     * @param isMoving 是否正在移动
     */
    private updateMonsterAnimation(isMoving: boolean) {
        if (!this._testMonsterController) {
            return;
        }
        
        if (isMoving) {
            // 移动时播放walk动画，同时设置方向
            const direction = this.getDirectionFromVector(this._monsterMoveDirection);
            this.setMonsterAnimationState('Walk', direction);
            this._currentAnimationState = 'Walk';
            console.log(`🚶 怪物开始移动: ${direction}方向 - 播放Walk_${direction}动画`);
        } else {
            // 停止时播放idle动画，保持当前方向
            const currentDirection = this.getCurrentMonsterDirection();
            this.setMonsterAnimationState('Idle', currentDirection);
            this._currentAnimationState = 'Idle';
            console.log(`🧍 怪物停止移动 - 播放Idle_${currentDirection}动画`);
        }
        
        // 更新UI显示
        this.updateUIDisplay();
    }
    
    /**
     * 设置怪物动画状态
     * @param state 动画状态字符串
     * @param direction 方向字符串，可选
     */
    private setMonsterAnimationState(state: string, direction?: string) {
        if (!this._testMonsterController) {
            return;
        }
        
        try {
            const controller = this._testMonsterController as any;
            
            // 直接设置内部状态变量
            if (controller._currentAnimationState !== undefined) {
                controller._currentAnimationState = state;
            }
            
            if (direction && controller._currentDirection !== undefined) {
                controller._currentDirection = direction;
            }
            
            // 尝试调用私有方法来播放动画
            if (controller.playAnimation && direction) {
                controller.playAnimation(state, direction);
                console.log(`🎬 播放怪物动画: ${state}_${direction}`);
            } else if (controller.tryPlayAnimation) {
                controller.tryPlayAnimation(state);
                console.log(`🎬 播放怪物动画: ${state}`);
            } else {
                // 最后的备用方案：手动设置精灵帧
                const animationKey = direction ? `${state}_${direction}` : `${state}_front`;
                if (controller._enemyFrames && controller._enemyFrames.has(animationKey)) {
                    const frames = controller._enemyFrames.get(animationKey);
                    if (frames && frames.length > 0 && controller._sprite) {
                        controller._sprite.spriteFrame = frames[0];
                        console.log(`🎬 手动设置精灵帧: ${animationKey}`);
                    }
                }
            }
            
        } catch (error) {
            console.warn('⚠️ 无法设置怪物动画状态:', error);
        }
    }
    
    /**
     * 根据移动方向设置怪物朝向
     * @param direction 移动方向向量
     */
    private setMonsterDirection(direction: Vec2) {
        if (!this._testMonsterController) {
            return;
        }
        
        try {
            // 计算方向
            const dir = this.getDirectionFromVector(direction);
            
            // 设置怪物的私有方向变量
            const controller = this._testMonsterController as any;
            if (controller._currentDirection !== undefined) {
                controller._currentDirection = dir;
            }
        } catch (error) {
            console.warn('⚠️ 无法设置怪物方向:', error);
        }
    }
    
    /**
     * 获取当前怪物方向
     * @returns 当前方向字符串
     */
    private getCurrentMonsterDirection(): string {
        if (!this._testMonsterController) {
            return 'front';
        }
        
        try {
            const controller = this._testMonsterController as any;
            return controller._currentDirection || 'front';
        } catch (error) {
            console.warn('⚠️ 无法获取怪物方向:', error);
            return 'front';
        }
    }
    
    /**
     * 测试怪物动画系统
     */
    private testMonsterAnimationSystem() {
        console.log('🧪 开始测试怪物动画系统...');
        
        if (!this._testMonsterController) {
            console.error('❌ 没有测试怪物控制器');
            return;
        }
        
        const controller = this._testMonsterController as any;
        
        console.log('📊 怪物动画系统状态:');
        console.log(`  - 当前动画状态: ${controller._currentAnimationState || 'Unknown'}`);
        console.log(`  - 当前方向: ${controller._currentDirection || 'Unknown'}`);
        console.log(`  - 动画帧数据: ${controller._enemyFrames ? controller._enemyFrames.size : 0} 组`);
        console.log(`  - 使用自动动画: ${controller._useAutoAnimation ? '是' : '否'}`);
        console.log(`  - 动画组件: ${controller._animation ? '存在' : '不存在'}`);
        
        // 测试可用的动画
        if (controller._enemyFrames) {
            console.log('🎬 可用的动画:');
            for (const [key, frames] of controller._enemyFrames.entries()) {
                console.log(`  - ${key}: ${frames.length} 帧`);
            }
        }
        
        // 测试动画播放
        console.log('🎭 测试动画播放...');
        this.setMonsterAnimationState('Walk', 'right');
        
        // 延迟测试其他动画
        setTimeout(() => {
            this.setMonsterAnimationState('Idle', 'front');
        }, 1000);
        
        setTimeout(() => {
            this.setMonsterAnimationState('Attack', 'left');
        }, 2000);
    }
    
    /**
     * 保存原始参数
     */
    private saveOriginalParameters() {
        if (!this._testMonsterController) {
            return;
        }
        
        const controller = this._testMonsterController as any;
        
        // 保存EnemyController的data对象
        if (controller.data) {
            this._originalParameters = {
                baseHealth: controller.data.baseHealth,
                baseAttack: controller.data.baseAttack,
                baseDefense: controller.data.baseDefense,
                moveSpeed: controller.data.moveSpeed,
                attackRange: controller.data.attackRange,
                attackInterval: controller.data.attackInterval,
                detectionRange: controller.data.detectionRange,
                pursuitRange: controller.data.pursuitRange,
                animationSpeed: controller.data.animationSpeed,
                nodeScale: controller.data.nodeScale,
                stunDuration: controller.data.stunDuration,
                damageFlashDuration: controller.data.damageFlashDuration
            };
        }
    }
    
    /**
     * 应用参数调整
     */
    private applyParameterAdjustments() {
        if (!this._testMonsterController || !this._originalParameters) {
            return;
        }
        
        const controller = this._testMonsterController as any;
        
        // 应用所有参数调整
        this._parameterAdjustments.forEach((adjustment, key) => {
            const originalValue = this._originalParameters[key];
            const newValue = originalValue + adjustment;
            
            // 应用到怪物数据
            if (controller.data && controller.data[key] !== undefined) {
                controller.data[key] = newValue;
            }
            
            // 特殊处理某些参数
            if (key === 'nodeScale' && this._testMonster) {
                this._testMonster.setScale(newValue, newValue, 1);
            }
            
            if (key === 'moveSpeed') {
                // 重新计算速度
                controller._currentSpeed = newValue;
                if (controller.recalculateSpeed) {
                    controller.recalculateSpeed();
                }
            }
        });
        
        // 更新参数显示
        this.updateParameterDisplay();
    }
    
    /**
     * 调整参数
     */
    private adjustParameter(key: string, delta: number, config: ParameterConfig) {
        // 获取当前值
        const currentAdjustment = this._parameterAdjustments.get(key) || 0;
        const originalValue = this._originalParameters ? this._originalParameters[key] : config.defaultValue;
        const currentValue = originalValue + currentAdjustment;
        const newValue = Math.max(config.minValue, Math.min(config.maxValue, currentValue + delta));
        
        // 设置新的调整值
        this._parameterAdjustments.set(key, newValue - originalValue);
        
        // 应用调整
        this.applyParameterAdjustments();
        
        console.log(`📊 参数调整: ${config.displayName} ${currentValue.toFixed(2)} → ${newValue.toFixed(2)}`);
    }
    
    /**
     * 重置单个参数
     */
    private resetParameter(key: string, config: ParameterConfig) {
        this._parameterAdjustments.delete(key);
        this.applyParameterAdjustments();
        
        console.log(`🔄 重置参数: ${config.displayName} → ${config.defaultValue}`);
    }
    
    /**
     * 重置所有参数
     */
    private resetAllParameters() {
        this._parameterAdjustments.clear();
        this.applyParameterAdjustments();
        
        console.log('🔄 所有参数已重置为默认值');
    }
    
    /**
     * 更新参数显示
     */
    private updateParameterDisplay() {
        this.PARAMETER_CONFIGS.forEach(config => {
            const label = this._parameterLabels.get(config.key);
            if (label) {
                const adjustment = this._parameterAdjustments.get(config.key) || 0;
                const originalValue = this._originalParameters ? this._originalParameters[config.key] : config.defaultValue;
                const currentValue = originalValue + adjustment;
                
                label.string = `${config.displayName}: ${currentValue.toFixed(config.step < 1 ? 1 : 0)}${config.unit || ''}`;
                
                // 如果值被修改，改变颜色
                if (adjustment !== 0) {
                    label.color = Color.YELLOW;
                } else {
                    label.color = Color.WHITE;
                }
            }
        });
    }

    /**
     * 初始化参数显示
     */
    private initializeParameterDisplay() {
        if (!this._originalParameters) {
            return;
        }
        
        this.PARAMETER_CONFIGS.forEach(config => {
            const label = this._parameterLabels.get(config.key);
            if (label) {
                const originalValue = this._originalParameters[config.key];
                label.string = `${config.displayName}: ${originalValue.toFixed(config.step < 1 ? 1 : 0)}${config.unit || ''}`;
                label.color = Color.WHITE;
            }
        });
    }
    
    /**
     * 根据方向向量计算方向枚举值
     * @param dir 方向向量
     * @returns 方向字符串
     */
    private getDirectionFromVector(dir: Vec2): string {
        if (Math.abs(dir.x) > Math.abs(dir.y)) {
            return dir.x > 0 ? 'right' : 'left';
        } else {
            return dir.y > 0 ? 'back' : 'front';
        }
    }

    /**
     * 根据方向字符串获取方向向量
     * @param direction 方向字符串
     * @returns 方向向量
     */
    private getDirectionVector(direction: string): Vec2 {
        switch (direction) {
            case 'right':
                return new Vec2(1, 0);
            case 'left':
                return new Vec2(-1, 0);
            case 'back':
                return new Vec2(0, 1);
            case 'front':
            default:
                return new Vec2(0, -1);
        }
    }
    
    /**
     * 触发怪物攻击（智能方向）
     */
    private triggerMonsterAttack() {
        if (!this._testMonsterController) {
            return;
        }
        
        // 确定攻击方向
        let attackDirection: string;
        if (this._monsterMoveDirection.length() > 0.1) {
            // 如果正在移动，使用移动方向
            attackDirection = this.getDirectionFromVector(this._monsterMoveDirection);
        } else {
            // 如果没有移动，使用当前朝向
            attackDirection = this.getCurrentMonsterDirection();
        }
        
        // 设置怪物朝向
        const directionVec = this.getDirectionVector(attackDirection);
        this.setMonsterDirection(directionVec);
        
        // 调用EnemyController的攻击逻辑
        const controller = this._testMonsterController as any;
        if (controller.performAttack) {
            // 直接调用performAttack方法
            controller.performAttack();
        } else {
            // 回退到手动设置动画状态
            controller._isAttacking = true;
            controller._currentAnimationState = 'Attack';
            this.setMonsterAnimationState('Attack', attackDirection);
        }
        
        this._currentAnimationState = 'Attack';
        
        console.log(`⚔️ 怪物攻击: ${attackDirection}方向 - 调用EnemyController攻击逻辑`);
        
        // 更新UI显示
        this.updateUIDisplay();
    }

    /**
     * 🔥 触发怪物火球技能（测试用）
     */
    private triggerMonsterFireball() {
        if (!this._testMonsterController) {
            return;
        }

        // 检查是否是巫妖类型
        if (this._currentMonsterType !== 'lich_elite') {
            console.warn('⚠️ 只有巫妖可以使用火球技能');
            return;
        }

        try {
            // 调用EnemyController的技能方法
            const controller = this._testMonsterController as any;
            
            // 确定技能方向 - 使用当前面向方向
            const currentDirection = this.getCurrentMonsterDirection();
            
            // 强制播放火球技能动画
            this.setMonsterAnimationState('Fire', currentDirection);
            this._currentAnimationState = 'Fire';
            
            // 直接调用技能方法
            if (controller.performSkillAttack && typeof controller.performSkillAttack === 'function') {
                controller.performSkillAttack('fireball');
                console.log(`🔥 触发巫妖火球技能 - 方向: ${currentDirection}`);
            } else {
                console.warn('⚠️ 怪物控制器没有技能攻击方法');
            }
            
            // 更新UI显示
            this.updateUIDisplay();
            
        } catch (error) {
            console.error('❌ 触发火球技能时发生错误:', error);
        }
    }

    /**
     * 每帧更新
     */
    update(deltaTime: number) {
        if (!this._isTestMode) return;
        
        // 如果在控制模式下，更新怪物移动
        if (this._isControllingMonster) {
            this.controlMonsterMovement();
        }
        
        // 定期更新调试信息
        this._debugUpdateTimer += deltaTime;
        if (this._debugUpdateTimer >= 0.1) { // 每0.1秒更新一次
            this.updateDebugInfo();
            this._debugUpdateTimer = 0;
        }
    }

    /**
     * 键盘事件处理
     */
    onEnable() {
        // 注册键盘事件
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        console.log('🎮 测试系统键盘事件已注册');
    }

    onDisable() {
        // 取消键盘事件
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        console.log('🎮 测试系统键盘事件已取消');
    }

    /**
     * 键盘按下事件
     */
    private onKeyDown(event: any) {
        const keyCode = event.keyCode;
        
        // F1键切换测试模式
        if (keyCode === KeyCode.F1) {
            this.toggleTestMode();
            console.log('🎮 F1键被按下，切换测试模式');
            return;
        }
        
        // 只有在测试模式开启时才响应其他按键
        if (!this._isTestMode) return;
        
        // 如果在怪物控制模式下，处理移动和控制按键
        if (this._isControllingMonster) {
            this.handleMonsterControlKeys(keyCode);
            return;
        }
        
        // 观察模式下的按键处理
        this.handleObservationModeKeys(keyCode);
    }

    /**
     * 键盘释放事件
     */
    private onKeyUp(event: any) {
        const keyCode = event.keyCode;
        
        // 只在怪物控制模式下处理按键释放
        if (!this._isTestMode || !this._isControllingMonster) return;
        
        // 处理移动按键释放
        switch (keyCode) {
            case KeyCode.KEY_W: // W
            case KeyCode.KEY_S: // S
                this._monsterMoveDirection.y = 0;
                break;
            case KeyCode.KEY_A: // A
            case KeyCode.KEY_D: // D
                this._monsterMoveDirection.x = 0;
                break;
        }
    }

    /**
     * 处理怪物控制模式下的按键
     */
    private handleMonsterControlKeys(keyCode: number) {
        switch (keyCode) {
            // WASD 控制移动
            case KeyCode.KEY_W: // W - 向上
                this._monsterMoveDirection.y = 1;
                break;
            case KeyCode.KEY_S: // S - 向下
                this._monsterMoveDirection.y = -1;
                break;
            case KeyCode.KEY_A: // A - 向左
                this._monsterMoveDirection.x = -1;
                break;
            case KeyCode.KEY_D: // D - 向右
                this._monsterMoveDirection.x = 1;
                break;
                
            // 功能按键
            case KeyCode.KEY_J: // J - 攻击
                this.triggerMonsterAttack();
                console.log('🗡️ 怪物攻击！');
                break;
            case KeyCode.KEY_U: // U - 火球技能
                this.triggerMonsterFireball();
                console.log('🔥 怪物火球技能！');
                break;
            case KeyCode.KEY_K: // K - 受伤
                this.testTakeDamage();
                console.log('💥 怪物受伤！');
                break;
            case KeyCode.KEY_C: // C - 切换回观察模式
            case KeyCode.KEY_L: // L - 切换回观察模式 (兼容旧操作)
                this.toggleMonsterControl();
                break;
                
            // 测试动画系统
            case KeyCode.KEY_T: // T - 测试动画系统
                this.testMonsterAnimationSystem();
                break;
                
            // 重置
            case KeyCode.SPACE: // Space - 重置
                this.resetMonster();
                break;
        }
    }

    /**
     * 处理观察模式下的按键
     */
    private handleObservationModeKeys(keyCode: number) {
        // 数字键切换怪物类型 (1-5)
        if (keyCode >= KeyCode.DIGIT_1 && keyCode <= KeyCode.DIGIT_5) {
            const index = keyCode - KeyCode.DIGIT_1;
            if (index < this.MONSTER_TYPES.length) {
                this.switchMonsterType(this.MONSTER_TYPES[index]);
            }
        }
        
        // 字母键触发动画和控制
        switch (keyCode) {
            case KeyCode.KEY_Q: // Q - Idle
                this.triggerAnimation('Idle');
                break;
            case KeyCode.KEY_W: // W - Walk
                this.triggerAnimation('Walk');
                break;
            case KeyCode.KEY_E: // E - Attack
                this.triggerAnimation('Attack');
                break;
            case KeyCode.KEY_R: // R - Hurt
                this.triggerAnimation('Hurt');
                break;
            case KeyCode.KEY_T: // T - Death
                this.triggerAnimation('Death');
                break;
            case KeyCode.KEY_C: // C - 切换控制模式
                this.toggleMonsterControl();
                break;
            case KeyCode.KEY_Y: // Y - 测试动画系统
                this.testMonsterAnimationSystem();
                break;
            case KeyCode.SPACE: // Space - 重置
                this.resetMonster();
                break;
        }
    }

    onDestroy() {
        // 如果正在控制怪物，先恢复正常状态
        if (this._isControllingMonster) {
            this.disableMonsterControl();
        }
        
        // 清理测试怪物
        if (this._testMonster) {
            this._testMonster.destroy();
        }
        
        // 清理UI面板
        if (this._testPanel) {
            this._testPanel.destroy();
        }
        
        // 重置所有状态
        this._isTestMode = false;
        this._isControllingMonster = false;
        this._playerController = null;
        this._monsterRigidbody = null;
        this._monsterMoveDirection.set(0, 0);
        this._lastMoveDirection.set(0, 0);
        this._wasMoving = false;
        
        console.log('🧪 MonsterTestManager 已销毁');
    }
} 