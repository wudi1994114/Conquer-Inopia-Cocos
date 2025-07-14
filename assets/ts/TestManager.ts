import { _decorator, Component, Node, UITransform, Canvas, Widget, Label, Button, Layout, instantiate, Prefab, resources, Vec3, UIOpacity, Color, director, sys, input, Input, KeyCode, Vec2, RigidBody2D, Sprite, systemEvent, SystemEvent, view } from 'cc';
import { EnemyController } from './EnemyController';
import { PlayerController } from './PlayerController';
import { enemyDatabase } from './configs/enemy-config';
import { SceneManager } from './SceneManager';
import { AutoAnimationCreator } from './AutoAnimationCreator';

const { ccclass, property } = _decorator;

/**
 * 测试对象类型
 */
export enum TestObjectType {
    MONSTER = 'monster',
    PLAYER = 'player'
}

/**
 * 参数调整配置接口
 */
interface ParameterConfig {
    key: string;           
    displayName: string;   
    minValue: number;      
    maxValue: number;      
    step: number;          
    defaultValue: number;  
    unit?: string;         
    description?: string;  
    objectTypes: TestObjectType[]; // 此参数适用于哪些对象类型
}

/**
 * 通用测试管理器
 * 支持怪物和玩家的全面测试
 */
@ccclass('TestManager')
export class TestManager extends Component {
    
    @property({ type: Prefab, tooltip: '敌人预制件' })
    public enemyPrefab: Prefab | null = null;
    
    @property({ type: Prefab, tooltip: '玩家预制件' })
    public playerPrefab: Prefab | null = null;
    
    // ======================== 测试对象相关 ========================
    private _testObjects: Map<TestObjectType, Node> = new Map();
    private _testControllers: Map<TestObjectType, any> = new Map();
    private _currentTestType: TestObjectType = TestObjectType.MONSTER;
    private _currentSubType: string = 'ent_test_giant'; // 改为测试怪物
    
    // ======================== UI面板相关 ========================
    private _testPanel: Node | null = null;
    private _testTypeLabel: Label | null = null;
    private _subTypeLabel: Label | null = null;
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
    
    // ======================== 控制系统 ========================
    private _isControllingObject: boolean = false;
    private _objectMoveDirection: Vec2 = new Vec2(0, 0);
    private _objectRigidbody: RigidBody2D | null = null;
    private _lastMoveDirection: Vec2 = new Vec2(0, 0);
    private _wasMoving: boolean = false;
    
    // 可调整的参数配置（支持多对象类型）
    private readonly PARAMETER_CONFIGS: ParameterConfig[] = [
        // 通用属性
        { key: 'baseHealth', displayName: '生命值', minValue: 10, maxValue: 10000, step: 50, defaultValue: 100, unit: 'HP', objectTypes: [TestObjectType.MONSTER, TestObjectType.PLAYER] },
        { key: 'moveSpeed', displayName: '移动速度', minValue: 0.5, maxValue: 20, step: 0.5, defaultValue: 5, unit: '单位/秒', objectTypes: [TestObjectType.MONSTER, TestObjectType.PLAYER] },
        { key: 'nodeScale', displayName: '节点缩放', minValue: 0.1, maxValue: 5, step: 0.1, defaultValue: 1, unit: '倍', objectTypes: [TestObjectType.MONSTER, TestObjectType.PLAYER] },
        
        // 怪物专属属性
        { key: 'baseAttack', displayName: '攻击力', minValue: 1, maxValue: 500, step: 5, defaultValue: 10, unit: '点', objectTypes: [TestObjectType.MONSTER] },
        { key: 'baseDefense', displayName: '防御力', minValue: 0, maxValue: 100, step: 1, defaultValue: 5, unit: '点', objectTypes: [TestObjectType.MONSTER] },
        { key: 'attackRange', displayName: '攻击范围', minValue: 10, maxValue: 500, step: 10, defaultValue: 60, unit: '像素', objectTypes: [TestObjectType.MONSTER] },
        { key: 'attackInterval', displayName: '攻击间隔', minValue: 0.1, maxValue: 10, step: 0.1, defaultValue: 2.5, unit: '秒', objectTypes: [TestObjectType.MONSTER] },
        { key: 'detectionRange', displayName: '检测范围', minValue: 50, maxValue: 3000, step: 50, defaultValue: 1200, unit: '像素', objectTypes: [TestObjectType.MONSTER] },
        { key: 'pursuitRange', displayName: '追击范围', minValue: 50, maxValue: 3000, step: 50, defaultValue: 1500, unit: '像素', objectTypes: [TestObjectType.MONSTER] },
        
        // 玩家专属属性
        { key: 'autoAttackRate', displayName: '自动攻击频率', minValue: 0.1, maxValue: 10, step: 0.1, defaultValue: 1, unit: '次/秒', objectTypes: [TestObjectType.PLAYER] },
        { key: 'dashDistance', displayName: '冲刺距离', minValue: 50, maxValue: 500, step: 25, defaultValue: 200, unit: '像素', objectTypes: [TestObjectType.PLAYER] },
        { key: 'dashDuration', displayName: '冲刺持续时间', minValue: 0.1, maxValue: 2, step: 0.1, defaultValue: 0.2, unit: '秒', objectTypes: [TestObjectType.PLAYER] },
        { key: 'dashCooldown', displayName: '冲刺冷却', minValue: 0.5, maxValue: 5, step: 0.1, defaultValue: 1.0, unit: '秒', objectTypes: [TestObjectType.PLAYER] },
        
        // 动画系统
        { key: 'animationSpeed', displayName: '动画速度', minValue: 1, maxValue: 30, step: 1, defaultValue: 8, unit: '帧/秒', objectTypes: [TestObjectType.MONSTER, TestObjectType.PLAYER] },
    ];
    
    // 可用的怪物类型 - 只使用测试专用怪物
    private readonly MONSTER_TYPES = [
        'ent_test_giant',       // 巨型测试树人
        'lich_test_giant',      // 巨型测试巫妖  
        'ent_test_mega_boss'    // 超巨型测试树精
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
        console.log('✅ TestManager 初始化开始');
        this.initializeTestSystem();
        console.log('✅ TestManager 初始化完成');
    }

    /**
     * 初始化测试系统
     */
    private initializeTestSystem() {
        this.createTestUI();
        this.createTestObjects();
        
        // 使用场景级键盘事件，不需要禁用其他组件的输入
        this.setTestModeActive(false);
        
        console.log('🎮 测试系统初始化完成，使用场景级键盘事件，按F1激活测试模式');
    }

    /**
     * 📝 设计说明：键盘事件处理策略
     * 
     * 原先的问题：使用全局 input.on() 监听键盘事件，导致不同场景间的事件冲突
     * 解决方案：改用场景级 systemEvent 监听，具有以下优势：
     * 
     * ✅ 自动清理：场景切换时事件监听自动解除，无需手动管理
     * ✅ 作用域隔离：每个场景的键盘事件独立，不会互相干扰
     * ✅ 简化代码：不需要复杂的 PlayerController 输入禁用/启用逻辑
     * ✅ 更稳定：减少了因跨场景事件管理导致的bug
     * 
     * 因此移除了之前的 disableGlobalPlayerInput() 和 enableGlobalPlayerInput() 方法
     */

    /**
     * 创建测试UI面板
     */
    private createTestUI() {
        let canvas = this.node.getComponent(Canvas);
        if (!canvas) {
            canvas = this.node.getComponentInChildren(Canvas);
        }
        if (!canvas) {
            const scene = director.getScene();
            if (scene) {
                canvas = scene.getComponentInChildren(Canvas);
            }
        }
        if (!canvas) {
            console.error('❌ 未找到Canvas组件');
            return;
        }
        
        this._testPanel = new Node('TestPanel');
        this._testPanel.addComponent(UITransform);
        this._testPanel.addComponent(Widget);
        
        canvas.node.addChild(this._testPanel);
        
        const widget = this._testPanel.getComponent(Widget);
        if (widget) {
            widget.isAlignTop = true;
            widget.isAlignLeft = true;
            widget.top = 10;
            widget.left = 10;
            widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
        }
        
        const panelTransform = this._testPanel.getComponent(UITransform);
        if (panelTransform) {
            panelTransform.setContentSize(600, 1200);
        }
        
        const uiOpacity = this._testPanel.addComponent(UIOpacity);
        uiOpacity.opacity = 200;
        
        const layout = this._testPanel.addComponent(Layout);
        layout.type = Layout.Type.VERTICAL;
        layout.paddingTop = 15;
        layout.paddingBottom = 15;
        layout.paddingLeft = 15;
        layout.paddingRight = 15;
        layout.spacingY = 8;
        
        this.createUIElements();
        
        console.log('✅ 测试UI面板创建完成');
    }

    /**
     * 创建UI元素
     */
    private createUIElements() {
        if (!this._testPanel) return;
        
        // 标题
        this.createLabel('=== 通用测试系统 ===', 22, Color.YELLOW);
        
        // 当前测试类型显示
        this._testTypeLabel = this.createLabel('测试类型: 怪物', 18, Color.WHITE);
        this._subTypeLabel = this.createLabel('当前对象: ent_test_giant', 18, Color.WHITE);
        
        // 当前动画状态显示
        this._animationStateLabel = this.createLabel('当前状态: Idle', 18, Color.WHITE);
        
        // 控制模式显示
        this._controlModeLabel = this.createLabel('模式: 观察模式 (按C键切换控制模式)', 16, Color.CYAN);
        
        // 操作说明
        this.createLabel('=== 键盘操作指南 ===', 16, Color.YELLOW);
        this.createLabel('F1: 切换测试面板 | F10/F11: 场景切换 | TAB: 切换测试类型', 12, Color.GRAY);
        this.createLabel('数字键1-3: 切换怪物类型 | QWERT: 播放动画 | C: 控制模式', 12, Color.GRAY);
        this.createLabel('控制模式: WASD移动 | J攻击 | K受伤 | Space重置', 12, Color.GRAY);
        this.createLabel('🧭 方向键: 测试不同方向动画 (↑背面 ↓正面 ←左侧 →右侧)', 12, Color.CYAN);
        
        // 测试类型切换按钮
        this.createLabel('--- 测试类型 ---', 16, Color.CYAN);
        this.createButton('切换到怪物测试 (TAB键)', () => {
            this.switchTestType(TestObjectType.MONSTER);
        });
        
        this.createButton('切换到玩家测试 (TAB键)', () => {
            this.switchTestType(TestObjectType.PLAYER);
        });
        
        // 子类型切换按钮
        this.createLabel('--- 对象类型 ---', 16, Color.CYAN);
        this.MONSTER_TYPES.forEach((monsterType, index) => {
            this.createButton(`${index + 1}. ${monsterType}`, () => {
                this.switchSubType(monsterType);
            });
        });
        
        // 特殊测试按钮
        this.createLabel('--- 特殊测试 ---', 16, Color.CYAN);
        this.createButton('切换控制模式 (C键)', () => {
            this.toggleObjectControl();
        });
        
        this.createButton('测试受伤 (K键)', () => {
            this.testTakeDamage();
        });
        
        this.createButton('重置对象 (空格键)', () => {
            this.resetCurrentObject();
        });
        
        this.createButton('🧪 测试系统 (Y键)', () => {
            this.testObjectSystem();
        });
        
        this.createButton('🔍 调试动画 (F2键)', () => {
            this.debugAnimationSystem();
        });
        
        // 创建参数调整面板
        this.createParameterPanel();
        
        // 调试信息显示
        this.createLabel('--- 调试信息 ---', 16, Color.CYAN);
        this._debugInfoLabel = this.createLabel('调试信息加载中...', 14, Color.GREEN);
        
        const debugTransform = this._debugInfoLabel.getComponent(UITransform);
        if (debugTransform) {
            debugTransform.setContentSize(540, 120);
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
        
        const labelTransform = labelNode.getComponent(UITransform);
        if (labelTransform) {
            labelTransform.setContentSize(540, fontSize + 4);
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
        
        const buttonTransform = buttonNode.getComponent(UITransform);
        if (buttonTransform) {
            buttonTransform.setContentSize(520, 35);
        }
        
        const labelNode = new Node('Label');
        labelNode.addComponent(UITransform);
        buttonNode.addChild(labelNode);
        
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = 16;
        label.color = Color.WHITE;
        
        button.node.on(Button.EventType.CLICK, callback, this);
        
        return button;
    }

    /**
     * 创建参数调整面板
     */
    private createParameterPanel() {
        this.createLabel('=== 参数调整面板 ===', 16, Color.YELLOW);
        this.createLabel('实时调整对象属性，立即生效！', 12, Color.GRAY);
        
        // 为当前对象类型创建参数控件
        this.updateParameterControls();
        
        this.createButton('🔄 重置所有参数', () => {
            this.resetAllParameters();
        });
    }

    /**
     * 更新参数控件显示
     */
    private updateParameterControls() {
        // 清除现有参数控件
        this.clearParameterControls();
        
        // 获取当前对象类型适用的参数
        const applicableConfigs = this.PARAMETER_CONFIGS.filter(config => 
            config.objectTypes.indexOf(this._currentTestType) !== -1
        );
        
        // 为每个适用参数创建控件
        applicableConfigs.forEach(config => {
            this.createParameterControl(config);
        });
    }

    /**
     * 清除现有参数控件
     */
    private clearParameterControls() {
        this._parameterLabels.clear();
        // 这里简化实现，实际项目中可能需要更复杂的UI清理逻辑
    }

    /**
     * 创建单个参数的调整控件
     */
    private createParameterControl(config: ParameterConfig) {
        const parameterLabel = this.createLabel(
            `${config.displayName}: ${config.defaultValue}${config.unit || ''}`, 
            14, 
            Color.WHITE
        );
        
        this._parameterLabels.set(config.key, parameterLabel);
        
        const buttonContainer = new Node('ButtonContainer');
        buttonContainer.addComponent(UITransform);
        this._testPanel!.addChild(buttonContainer);
        
        const containerTransform = buttonContainer.getComponent(UITransform);
        if (containerTransform) {
            containerTransform.setContentSize(560, 30);
        }
        
        // 创建调整按钮
        this.createParameterButton(buttonContainer, '－', () => {
            this.adjustParameter(config.key, -config.step, config);
        }, 0, 0, 50, 25);
        
        this.createParameterButton(buttonContainer, '＋', () => {
            this.adjustParameter(config.key, config.step, config);
        }, 510, 0, 50, 25);
        
        this.createParameterButton(buttonContainer, '重置', () => {
            this.resetParameter(config.key, config);
        }, 255, 0, 50, 25);
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
        
        const buttonTransform = buttonNode.getComponent(UITransform);
        if (buttonTransform) {
            buttonTransform.setContentSize(width, height);
        }
        buttonNode.setPosition(x, y, 0);
        
        const labelNode = new Node('Label');
        labelNode.addComponent(UITransform);
        buttonNode.addChild(labelNode);
        
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = 12;
        label.color = Color.WHITE;
        
        button.node.on(Button.EventType.CLICK, callback, this);
        
        return button;
    }

    /**
     * 创建测试对象
     */
    private createTestObjects() {
        this.createTestMonster();
        this.createTestPlayer();
        
        // 默认显示怪物
        this.switchTestType(TestObjectType.MONSTER);
    }

    /**
     * 创建测试怪物
     */
    private createTestMonster() {
        if (!this.enemyPrefab) {
            console.error('❌ 未设置敌人预制件');
            return;
        }
        
        const existingMonster = this._testObjects.get(TestObjectType.MONSTER);
        if (existingMonster) {
            existingMonster.destroy();
        }
        
        const testMonster = instantiate(this.enemyPrefab);
        this.node.addChild(testMonster);
        
        const controller = testMonster.getComponent(EnemyController);
        if (!controller) {
            console.error('❌ 测试怪物缺少EnemyController组件');
            return;
        }
        
        // 初始化怪物数据
        controller.init(this._currentSubType);
        
        // 🚫 测试模式下禁用AI：不设置玩家引用，防止自动攻击
        // this.setupPlayerReference(controller); // 注释掉这行
        console.log(`🧪 测试模式：已禁用怪物AI自动攻击行为`);
        
        // 存储引用
        this._testObjects.set(TestObjectType.MONSTER, testMonster);
        this._testControllers.set(TestObjectType.MONSTER, controller);
        
        // 设置位置
        testMonster.setPosition(new Vec3(0, 0, 0));
        
        // 🔧 立即激活怪物如果当前正在测试怪物
        testMonster.active = this._currentTestType === TestObjectType.MONSTER;
        
        console.log(`✅ 测试怪物创建完成: ${this._currentSubType}，已激活: ${testMonster.active}`);
    }



    /**
     * 创建测试玩家
     */
    private createTestPlayer() {
        if (!this.playerPrefab) {
            console.error('❌ 未设置玩家预制件');
            return;
        }
        
        const existingPlayer = this._testObjects.get(TestObjectType.PLAYER);
        if (existingPlayer) {
            existingPlayer.destroy();
        }
        
        const testPlayer = instantiate(this.playerPrefab);
        this.node.addChild(testPlayer);
        
        const controller = testPlayer.getComponent(PlayerController);
        if (!controller) {
            console.error('❌ 测试玩家缺少PlayerController组件');
            return;
        }
        
        this._testObjects.set(TestObjectType.PLAYER, testPlayer);
        this._testControllers.set(TestObjectType.PLAYER, controller);
        
        testPlayer.setPosition(new Vec3(0, 0, 0));
        testPlayer.active = false; // 默认隐藏
        
        console.log('✅ 测试玩家创建完成');
    }

    /**
     * 切换测试类型
     */
    public switchTestType(testType: TestObjectType) {
        if (this._currentTestType === testType) {
            return;
        }
        
        // 隐藏当前对象
        const currentObject = this._testObjects.get(this._currentTestType);
        if (currentObject) {
            currentObject.active = false;
        }
        
        // 切换类型
        this._currentTestType = testType;
        
        // 🔧 只有在测试模式开启时才显示新对象
        const newObject = this._testObjects.get(testType);
        if (newObject && this._isTestMode) {
            newObject.active = true;
            console.log(`🎯 切换显示${testType === TestObjectType.MONSTER ? '怪物' : '玩家'}: ${newObject.name}`);
        }
        
        // 更新UI显示
        this.updateUIDisplay();
        this.updateParameterControls();
        
        // 重置控制状态
        this._isControllingObject = false;
        this._objectMoveDirection.set(0, 0);
        
        console.log(`🔄 切换到${testType === TestObjectType.MONSTER ? '怪物' : '玩家'}测试`);
    }

    /**
     * 切换子类型（怪物类型等）
     */
    public switchSubType(subType: string) {
        this._currentSubType = subType;
        
        if (this._currentTestType === TestObjectType.MONSTER) {
            this.createTestMonster();
            
            // 🔧 确保新创建的怪物在测试模式开启时立即显示
            const monsterObject = this._testObjects.get(TestObjectType.MONSTER);
            if (monsterObject && this._isTestMode) {
                monsterObject.active = true;
                console.log(`🎯 新怪物已激活显示: ${subType}`);
            }
        }
        
        this.updateUIDisplay();
        
        console.log(`🔄 切换子类型: ${subType}`);
    }

    /**
     * 切换对象控制模式
     */
    public toggleObjectControl() {
        this._isControllingObject = !this._isControllingObject;
        
        if (this._isControllingObject) {
            this.enableObjectControl();
        } else {
            this.disableObjectControl();
        }
        
        this.updateUIDisplay();
        
        console.log(`🎮 对象控制模式: ${this._isControllingObject ? '启用' : '禁用'}`);
    }

    /**
     * 启用对象控制模式
     */
    private enableObjectControl() {
        const currentObject = this._testObjects.get(this._currentTestType);
        if (currentObject) {
            this._objectRigidbody = currentObject.getComponent(RigidBody2D);
        }
        
        console.log(`🎮 ${this._currentTestType === TestObjectType.MONSTER ? '怪物' : '玩家'}控制模式已启用`);
    }

    /**
     * 禁用对象控制模式
     */
    private disableObjectControl() {
        this._objectMoveDirection.set(0, 0);
        this._lastMoveDirection.set(0, 0);
        this._wasMoving = false;
        
        if (this._objectRigidbody) {
            this._objectRigidbody.linearVelocity = Vec2.ZERO;
        }
        
        this._currentAnimationState = 'Idle';
        this.updateUIDisplay();
        
        console.log(`🎮 ${this._currentTestType === TestObjectType.MONSTER ? '怪物' : '玩家'}控制模式已禁用`);
    }

    /**
     * 测试受伤
     */
    private testTakeDamage() {
        const controller = this._testControllers.get(this._currentTestType);
        if (!controller) {
            console.error('❌ 当前测试对象控制器不存在');
            return;
        }
        
        const damage = Math.floor(Math.random() * 50) + 10;
        
        if (this._currentTestType === TestObjectType.MONSTER && controller.takeDamage) {
            controller.takeDamage(damage, 'test' as any, Date.now());
        } else if (this._currentTestType === TestObjectType.PLAYER) {
            // 玩家受伤逻辑（如果有的话）
            console.log(`💥 玩家受到 ${damage} 点伤害`);
        }
        
        this._currentAnimationState = 'Hurt';
        this.updateUIDisplay();
        
        console.log(`💥 测试受伤: ${damage} 点伤害`);
    }

    /**
     * 重置当前对象
     */
    private resetCurrentObject() {
        if (this._currentTestType === TestObjectType.MONSTER) {
            this.createTestMonster();
        } else if (this._currentTestType === TestObjectType.PLAYER) {
            this.createTestPlayer();
        }
        
        const currentObject = this._testObjects.get(this._currentTestType);
        if (currentObject) {
            currentObject.active = true;
        }
        
        this._currentAnimationState = 'Idle';
        this._objectMoveDirection.set(0, 0);
        this._lastMoveDirection.set(0, 0);
        this._wasMoving = false;
        
        // 🎭 重置时播放Idle动画
        this.playObjectAnimation('Idle');
        
        this.updateUIDisplay();
        
        console.log(`🔄 重置${this._currentTestType === TestObjectType.MONSTER ? '怪物' : '玩家'}`);
    }

    /**
     * 测试对象系统
     */
    private testObjectSystem() {
        console.log(`🧪 开始测试${this._currentTestType === TestObjectType.MONSTER ? '怪物' : '玩家'}系统...`);
        
        const controller = this._testControllers.get(this._currentTestType);
        if (!controller) {
            console.error('❌ 没有测试对象控制器');
            return;
        }
        
        console.log(`📊 ${this._currentTestType}系统状态:`);
        // 这里可以添加具体的系统测试逻辑
    }

    /**
     * 调整参数
     */
    private adjustParameter(key: string, delta: number, config: ParameterConfig) {
        const currentAdjustment = this._parameterAdjustments.get(key) || 0;
        const originalValue = this._originalParameters ? this._originalParameters[key] : config.defaultValue;
        const currentValue = originalValue + currentAdjustment;
        const newValue = Math.max(config.minValue, Math.min(config.maxValue, currentValue + delta));
        
        this._parameterAdjustments.set(key, newValue - originalValue);
        this.applyParameterAdjustments();
        
        console.log(`📊 参数调整: ${config.displayName} ${currentValue.toFixed(2)} → ${newValue.toFixed(2)}`);
    }

    /**
     * 重置参数
     */
    private resetParameter(key: string, config: ParameterConfig) {
        this._parameterAdjustments.delete(key);
        this.applyParameterAdjustments();
        
        console.log(`🔄 重置参数: ${config.displayName}`);
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
     * 应用参数调整
     */
    private applyParameterAdjustments() {
        const controller = this._testControllers.get(this._currentTestType);
        if (!controller || !this._originalParameters) {
            return;
        }
        
        // 应用参数到当前对象
        this._parameterAdjustments.forEach((adjustment, key) => {
            const originalValue = this._originalParameters[key];
            const newValue = originalValue + adjustment;
            
            // 根据对象类型应用不同的参数
            if (controller.data && controller.data[key] !== undefined) {
                controller.data[key] = newValue;
            } else if (controller[key] !== undefined) {
                controller[key] = newValue;
            }
            
            // 特殊处理
            if (key === 'nodeScale') {
                const currentObject = this._testObjects.get(this._currentTestType);
                if (currentObject) {
                    currentObject.setScale(newValue, newValue, 1);
                }
            }
        });
        
        this.updateParameterDisplay();
    }

    /**
     * 更新参数显示
     */
    private updateParameterDisplay() {
        this.PARAMETER_CONFIGS.forEach(config => {
            if (config.objectTypes.indexOf(this._currentTestType) === -1) {
                return;
            }
            
            const label = this._parameterLabels.get(config.key);
            if (label) {
                const adjustment = this._parameterAdjustments.get(config.key) || 0;
                const originalValue = this._originalParameters ? this._originalParameters[config.key] : config.defaultValue;
                const currentValue = originalValue + adjustment;
                
                label.string = `${config.displayName}: ${currentValue.toFixed(config.step < 1 ? 1 : 0)}${config.unit || ''}`;
                label.color = adjustment !== 0 ? Color.YELLOW : Color.WHITE;
            }
        });
    }

    /**
     * 更新UI显示
     */
    private updateUIDisplay() {
        if (this._testTypeLabel) {
            this._testTypeLabel.string = `测试类型: ${this._currentTestType === TestObjectType.MONSTER ? '怪物' : '玩家'}`;
        }
        
        if (this._subTypeLabel) {
            this._subTypeLabel.string = `当前对象: ${this._currentSubType}`;
        }
        
        if (this._animationStateLabel) {
            this._animationStateLabel.string = `当前状态: ${this._currentAnimationState}`;
        }
        
        if (this._controlModeLabel) {
            const modeText = this._isControllingObject ? '控制模式' : '观察模式';
            const keyText = this._isControllingObject ? '按C键退出控制' : '按C键进入控制';
            this._controlModeLabel.string = `模式: ${modeText} (${keyText})`;
            this._controlModeLabel.color = this._isControllingObject ? Color.MAGENTA : Color.CYAN;
        }
    }

    /**
     * 更新调试信息
     */
    private updateDebugInfo() {
        if (!this._debugInfoLabel) {
            return;
        }
        
        const currentObject = this._testObjects.get(this._currentTestType);
        const controller = this._testControllers.get(this._currentTestType);
        
        if (!currentObject || !controller) {
            return;
        }
        
        let debugInfo = `=== 调试信息 ===\n`;
        debugInfo += `测试类型: ${this._currentTestType}\n`;
        debugInfo += `对象: ${this._currentSubType}\n`;
        
        if (this._currentTestType === TestObjectType.MONSTER && controller.getCurrentHealth) {
            debugInfo += `生命值: ${controller.getCurrentHealth()}\n`;
        }
        
        const position = currentObject.position;
        debugInfo += `位置: (${position.x.toFixed(1)}, ${position.y.toFixed(1)})\n`;
        
        const scale = currentObject.scale;
        debugInfo += `缩放: ${scale.x.toFixed(2)}\n`;
        
        debugInfo += `节点激活: ${currentObject.active ? '是' : '否'}\n`;
        
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
        
        // 测试对象的显示状态也根据测试模式决定
        this._testObjects.forEach((object) => {
            if (object && object.isValid) {
                object.active = active;
            }
        });
        
        // 如果激活测试模式，确保UI状态更新
        if (active) {
            this.updateUIDisplay();
        }
        
        // 如果关闭测试模式且正在控制对象，停止控制
        if (!active && this._isControllingObject) {
            this.disableObjectControl();
        }
        
        console.log(`🧪 测试模式: ${active ? '开启' : '关闭'} (使用场景级键盘事件，无冲突)`);
    }

    /**
     * 切换测试模式
     */
    public toggleTestMode() {
        this.setTestModeActive(!this._isTestMode);
    }

    /**
     * 控制对象移动
     */
    private controlObjectMovement() {
        if (!this._isControllingObject || !this._objectRigidbody) {
            return;
        }
        
        const isMoving = this._objectMoveDirection.length() > 0.1;
        
        if (isMoving) {
            const moveSpeed = this.getCurrentMoveSpeed();
            const velocity = this._objectMoveDirection.clone().normalize().multiplyScalar(moveSpeed);
            this._objectRigidbody.linearVelocity = velocity;
        } else {
            this._objectRigidbody.linearVelocity = Vec2.ZERO;
        }
        
        if (isMoving !== this._wasMoving) {
            this.updateObjectAnimation(isMoving);
            this._wasMoving = isMoving;
            this._lastMoveDirection = this._objectMoveDirection.clone();
        }
    }

    /**
     * 获取当前移动速度
     */
    private getCurrentMoveSpeed(): number {
        const controller = this._testControllers.get(this._currentTestType);
        if (!controller) return 1;
        
        if (this._currentTestType === TestObjectType.MONSTER) {
            const adjustment = this._parameterAdjustments.get('moveSpeed') || 0;
            const originalValue = this._originalParameters ? this._originalParameters['moveSpeed'] : 1;
            return originalValue + adjustment;
        } else {
            return controller.moveSpeed || 5;
        }
    }

    /**
     * 更新对象动画
     */
    private updateObjectAnimation(isMoving: boolean) {
        if (isMoving) {
            this._currentAnimationState = 'Walk';
            // 🎭 根据移动方向播放对应方向的Walk动画
            const direction = this.getDirectionFromMovement();
            this.playObjectAnimation('Walk', direction);
        } else {
            this._currentAnimationState = 'Idle';
            // 🎭 停止时保持当前方向的Idle动画
            const direction = this.getCurrentDirection();
            this.playObjectAnimation('Idle', direction);
        }
        
        this.updateUIDisplay();
    }

    /**
     * 🧭 根据移动向量获取方向
     */
    private getDirectionFromMovement(): string {
        if (this._objectMoveDirection.length() < 0.1) {
            return this.getCurrentDirection(); // 没有移动时保持当前方向
        }
        
        const x = this._objectMoveDirection.x;
        const y = this._objectMoveDirection.y;
        
        // 根据移动向量确定主要方向
        if (Math.abs(x) > Math.abs(y)) {
            // 水平方向为主
            return x > 0 ? 'right' : 'left';
        } else {
            // 垂直方向为主
            return y > 0 ? 'back' : 'front';  // 注意：y > 0 是向上（背面），y < 0 是向下（正面）
        }
    }

    /**
     * 🧭 从指定向量获取方向
     */
    private getDirectionFromVector(vector: Vec2): string {
        if (vector.length() < 0.1) {
            return 'front'; // 默认方向
        }
        
        const x = vector.x;
        const y = vector.y;
        
        // 根据向量确定主要方向
        if (Math.abs(x) > Math.abs(y)) {
            // 水平方向为主
            return x > 0 ? 'right' : 'left';
        } else {
            // 垂直方向为主
            return y > 0 ? 'back' : 'front';
        }
    }

    /**
     * 🎭 实际播放对象动画
     * 调用对象控制器的动画播放方法
     * @param state 动画状态
     * @param direction 可选方向，默认使用当前方向
     */
    private playObjectAnimation(state: string, direction?: string) {
        const controller = this._testControllers.get(this._currentTestType);
        if (!controller) {
            console.warn(`⚠️ 无法播放动画，控制器不存在: ${this._currentTestType}`);
            return;
        }

        try {
            if (this._currentTestType === TestObjectType.MONSTER) {
                // 怪物动画播放
                const enemyController = controller as any;
                
                // 获取方向
                const directionEnum = direction ? this.getDirectionEnum(direction) : this.getCurrentDirection();
                
                // 🧭 更新怪物的内部方向状态
                if (enemyController._currentDirection !== undefined && directionEnum) {
                    enemyController._currentDirection = directionEnum;
                }
                
                // 🎭 根据不同状态使用不同的触发方法
                switch (state) {
                    case 'Hurt':
                        // 受伤动画：通过takeDamage触发（推荐方式）
                        if (enemyController.takeDamage) {
                            enemyController.takeDamage(1, 'test' as any, Date.now());
                            console.log(`🎬 怪物受伤动画触发`);
                            return;
                        }
                        break;
                        
                    case 'Death':
                        // 死亡动画：通过致命伤害触发
                        if (enemyController.takeDamage) {
                            enemyController.takeDamage(9999, 'test' as any, Date.now());
                            console.log(`🎬 怪物死亡动画触发`);
                            return;
                        }
                        break;
                        
                    case 'Attack':
                        // 攻击动画：通过攻击逻辑触发
                        if (enemyController.performAttack) {
                            enemyController.performAttack();
                            console.log(`🎬 怪物攻击动画触发`);
                            return;
                        }
                        break;
                }
                
                // 🎭 对于其他动画（Idle、Walk），尝试直接设置状态
                if (enemyController._animation && enemyController._currentDirection !== undefined) {
                    const animationName = `${state}_${directionEnum}`;
                    
                    // 更新内部状态
                    enemyController._currentAnimationState = state;
                    enemyController._currentDirection = directionEnum;
                    
                    // 🔧 强制重置状态检测标记，让动画系统认为状态改变了
                    enemyController._lastFrameState = 'Reset'; // 设置一个特殊值强制触发更新
                    enemyController._lastFrameDirection = 'Reset';
                    
                    // 尝试使用AutoAnimationCreator直接播放
                    if (typeof AutoAnimationCreator !== 'undefined' && AutoAnimationCreator.playAnimation) {
                        if (AutoAnimationCreator.playAnimation(enemyController.node, animationName)) {
                            console.log(`🎬 怪物动画播放成功: ${animationName} (通过AutoAnimationCreator)`);
                            return;
                        }
                    }
                    
                    // 备用方案：直接通过Animation组件播放
                    const animation = enemyController._animation;
                    if (animation) {
                        const clip = animation.clips.find((c: any) => c && c.name === animationName);
                        if (clip) {
                            animation.play(animationName);
                            console.log(`🎬 怪物动画播放成功: ${animationName} (直接通过Animation)`);
                            return;
                        } else {
                            // 尝试front方向作为回退
                            const fallbackName = `${state}_front`;
                            const fallbackClip = animation.clips.find((c: any) => c && c.name === fallbackName);
                            if (fallbackClip) {
                                animation.play(fallbackName);
                                console.log(`🎬 怪物动画回退播放: ${fallbackName}`);
                                return;
                            }
                        }
                    }
                }
                
                console.warn(`⚠️ 无法播放怪物动画: ${state}_${directionEnum}`);
                
            } else if (this._currentTestType === TestObjectType.PLAYER) {
                // 玩家动画播放
                const playerController = controller as any;
                
                if (playerController.setDirection) {
                    const isMoving = state === 'Walk';
                    const dir = direction || 'down'; // 默认朝下
                    playerController.setDirection(dir, isMoving);
                    console.log(`🎬 玩家动画播放: ${dir} (移动: ${isMoving})`);
                    return;
                }
                
                console.warn(`⚠️ 玩家动画播放暂未实现`);
            }
            
        } catch (error) {
            console.error(`❌ 播放动画时出错:`, error);
        }
    }

    /**
     * 获取方向枚举值
     */
    private getDirectionEnum(direction: string): string | null {
        const directionMap: { [key: string]: string } = {
            'front': 'front',
            'back': 'back',
            'left': 'left',
            'right': 'right'
        };
        return directionMap[direction] || 'front';
    }

    /**
     * 获取当前方向
     */
    private getCurrentDirection(): string {
        const controller = this._testControllers.get(this._currentTestType);
        if (controller && controller._currentDirection) {
            return controller._currentDirection;
        }
        
        // 🧭 如果没有设置方向，根据最后的移动方向推断
        if (this._lastMoveDirection.length() > 0.1) {
            return this.getDirectionFromVector(this._lastMoveDirection);
        }
        
        return 'front'; // 默认朝前
    }

    /**
     * 🔍 调试UI组件信息
     * 输出当前测试对象和测试面板的UI组件详细信息
     */
    private debugUIComponents() {
        console.log('🔍=================================');
        console.log('🔍 UI组件调试信息 (J键触发)');
        console.log('🔍=================================');
        
        // 调试测试面板UI
        this.debugTestPanelUI();
        
        // 调试当前测试对象UI
        this.debugCurrentObjectUI();
        
        // 调试Canvas信息
        this.debugCanvasInfo();
        
        console.log('🔍=================================');
    }

    /**
     * 🔍 调试测试面板UI信息
     */
    private debugTestPanelUI() {
        console.log('📋 测试面板UI信息:');
        
        if (this._testPanel) {
            const transform = this._testPanel.getComponent(UITransform);
            const widget = this._testPanel.getComponent(Widget);
            const layout = this._testPanel.getComponent(Layout);
            const uiOpacity = this._testPanel.getComponent(UIOpacity);
            
            console.log(`  - 节点名称: ${this._testPanel.name}`);
            console.log(`  - 激活状态: ${this._testPanel.active}`);
            console.log(`  - 世界位置: (${this._testPanel.worldPosition.x.toFixed(1)}, ${this._testPanel.worldPosition.y.toFixed(1)}, ${this._testPanel.worldPosition.z.toFixed(1)})`);
            console.log(`  - 本地位置: (${this._testPanel.position.x.toFixed(1)}, ${this._testPanel.position.y.toFixed(1)}, ${this._testPanel.position.z.toFixed(1)})`);
            
            if (transform) {
                console.log(`  - UITransform:`);
                console.log(`    - 内容尺寸: ${transform.contentSize.width} x ${transform.contentSize.height}`);
                console.log(`    - 锚点: (${transform.anchorX.toFixed(2)}, ${transform.anchorY.toFixed(2)})`);
                console.log(`    - 锚点位置: (${transform.anchorPoint.x.toFixed(2)}, ${transform.anchorPoint.y.toFixed(2)})`);
            }
            
            if (widget) {
                console.log(`  - Widget:`);
                console.log(`    - 对齐模式: ${widget.alignMode}`);
                console.log(`    - 上对齐: ${widget.isAlignTop} (${widget.top})`);
                console.log(`    - 下对齐: ${widget.isAlignBottom} (${widget.bottom})`);
                console.log(`    - 左对齐: ${widget.isAlignLeft} (${widget.left})`);
                console.log(`    - 右对齐: ${widget.isAlignRight} (${widget.right})`);
            }
            
            if (layout) {
                console.log(`  - Layout:`);
                console.log(`    - 布局类型: ${layout.type}`);
                console.log(`    - 间距Y: ${layout.spacingY}`);
                console.log(`    - 内边距: T${layout.paddingTop} B${layout.paddingBottom} L${layout.paddingLeft} R${layout.paddingRight}`);
            }
            
            if (uiOpacity) {
                console.log(`  - 透明度: ${uiOpacity.opacity}`);
            }
            
            console.log(`  - 子节点数量: ${this._testPanel.children.length}`);
        } else {
            console.log('  ❌ 测试面板不存在');
        }
    }

    /**
     * 🔍 调试当前测试对象UI信息
     */
    private debugCurrentObjectUI() {
        const currentObject = this._testObjects.get(this._currentTestType);
        const controller = this._testControllers.get(this._currentTestType);
        
        console.log(`🎭 当前测试对象UI信息 (${this._currentTestType}):`);
        
        if (currentObject) {
            const transform = currentObject.getComponent(UITransform);
            const sprite = currentObject.getComponent(Sprite);
            const rigidbody = currentObject.getComponent(RigidBody2D);
            
            console.log(`  - 节点名称: ${currentObject.name}`);
            console.log(`  - 激活状态: ${currentObject.active}`);
            console.log(`  - 世界位置: (${currentObject.worldPosition.x.toFixed(1)}, ${currentObject.worldPosition.y.toFixed(1)}, ${currentObject.worldPosition.z.toFixed(1)})`);
            console.log(`  - 本地位置: (${currentObject.position.x.toFixed(1)}, ${currentObject.position.y.toFixed(1)}, ${currentObject.position.z.toFixed(1)})`);
            console.log(`  - 缩放: (${currentObject.scale.x.toFixed(2)}, ${currentObject.scale.y.toFixed(2)}, ${currentObject.scale.z.toFixed(2)})`);
            console.log(`  - 旋转: (${currentObject.eulerAngles.x.toFixed(1)}°, ${currentObject.eulerAngles.y.toFixed(1)}°, ${currentObject.eulerAngles.z.toFixed(1)}°)`);
            
            if (transform) {
                console.log(`  - UITransform:`);
                console.log(`    - 内容尺寸: ${transform.contentSize.width} x ${transform.contentSize.height}`);
                console.log(`    - 锚点: (${transform.anchorX.toFixed(2)}, ${transform.anchorY.toFixed(2)})`);
                console.log(`    - 锚点位置: (${transform.anchorPoint.x.toFixed(2)}, ${transform.anchorPoint.y.toFixed(2)})`);
            }
            
            if (sprite) {
                console.log(`  - Sprite:`);
                console.log(`    - 精灵帧: ${sprite.spriteFrame ? sprite.spriteFrame.name : '无'}`);
                console.log(`    - 尺寸模式: ${sprite.sizeMode}`);
                console.log(`    - 颜色: (${sprite.color.r}, ${sprite.color.g}, ${sprite.color.b}, ${sprite.color.a})`);
            }
            
            if (rigidbody) {
                console.log(`  - RigidBody2D:`);
                console.log(`    - 启用状态: ${rigidbody.enabled}`);
                console.log(`    - 线性速度: (${rigidbody.linearVelocity.x.toFixed(2)}, ${rigidbody.linearVelocity.y.toFixed(2)})`);
                console.log(`    - 重力缩放: ${rigidbody.gravityScale}`);
                console.log(`    - 固定旋转: ${rigidbody.fixedRotation}`);
            }
            
            console.log(`  - 子节点数量: ${currentObject.children.length}`);
            
            // 列出所有组件
            const components = currentObject.getComponents(Component);
            console.log(`  - 组件列表 (${components.length}个):`);
            components.forEach((comp, index) => {
                console.log(`    ${index + 1}. ${comp.constructor.name}`);
            });
            
        } else {
            console.log('  ❌ 当前测试对象不存在');
        }
        
        // 控制器信息
        if (controller) {
            console.log(`  - 控制器状态:`);
            console.log(`    - 类型: ${controller.constructor.name}`);
            
            if (this._currentTestType === TestObjectType.MONSTER) {
                const enemyController = controller as any;
                console.log(`    - 当前动画状态: ${enemyController._currentAnimationState || '未知'}`);
                console.log(`    - 当前方向: ${enemyController._currentDirection || '未知'}`);
                console.log(`    - 生命值: ${enemyController._currentHealth || '未知'}`);
                console.log(`    - 是否死亡: ${enemyController._isDead || false}`);
                console.log(`    - 是否受伤: ${enemyController._isHurt || false}`);
                console.log(`    - 是否攻击中: ${enemyController._isAttacking || false}`);
            }
        } else {
            console.log('  ❌ 控制器不存在');
        }
    }

    /**
     * 🔍 调试Canvas信息
     */
    private debugCanvasInfo() {
        console.log('🖼️ Canvas信息:');
        
        let canvas = this.node.getComponent(Canvas);
        if (!canvas) {
            canvas = this.node.getComponentInChildren(Canvas);
        }
        if (!canvas) {
            const scene = director.getScene();
            if (scene) {
                canvas = scene.getComponentInChildren(Canvas);
            }
        }
        
        if (canvas) {
            const canvasTransform = canvas.getComponent(UITransform);
            
            console.log(`  - Canvas节点: ${canvas.node.name}`);
            console.log(`  - 激活状态: ${canvas.node.active}`);
            
            if (canvasTransform) {
                console.log(`  - Canvas尺寸: ${canvasTransform.contentSize.width} x ${canvasTransform.contentSize.height}`);
                console.log(`  - Canvas锚点: (${canvasTransform.anchorX.toFixed(2)}, ${canvasTransform.anchorY.toFixed(2)})`);
            }
            
            // 获取视图尺寸
            const viewSize = view.getVisibleSize();
            console.log(`  - 视图尺寸: ${viewSize.width} x ${viewSize.height}`);
            
            // 获取设计分辨率
            const designSize = view.getDesignResolutionSize();
            console.log(`  - 设计分辨率: ${designSize.width} x ${designSize.height}`);
            
        } else {
            console.log('  ❌ 未找到Canvas组件');
        }
    }

    /**
     * 每帧更新
     */
    update(deltaTime: number) {
        if (!this._isTestMode) return;
        
        if (this._isControllingObject) {
            this.controlObjectMovement();
        }
        
        this._debugUpdateTimer += deltaTime;
        if (this._debugUpdateTimer >= 0.1) {
            this.updateDebugInfo();
            this._debugUpdateTimer = 0;
        }
    }

    /**
     * 键盘事件处理
     */
    onEnable() {
        systemEvent.on(SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        systemEvent.on(SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
        console.log('🎮 TestManager键盘事件已注册');
    }

    onDisable() {
        systemEvent.off(SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        systemEvent.off(SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
        console.log('🎮 TestManager键盘事件已取消');
    }

    /**
     * 键盘按下事件
     */
    private onKeyDown(event: any) {
        const keyCode = event.keyCode;
        
        // F1键切换测试模式
        if (keyCode === KeyCode.F1) {
            this.toggleTestMode();
            return;
        }
        
        if (!this._isTestMode) return;
        
        // TAB键切换测试类型
        if (keyCode === KeyCode.TAB) {
            const newType = this._currentTestType === TestObjectType.MONSTER ? 
                TestObjectType.PLAYER : TestObjectType.MONSTER;
            this.switchTestType(newType);
            return;
        }
        
        // 如果在控制模式下，处理移动控制
        if (this._isControllingObject) {
            this.handleControlKeys(keyCode);
            return;
        }
        
        // 观察模式下的按键处理
        this.handleObservationKeys(keyCode);
    }

    /**
     * 键盘释放事件
     */
    private onKeyUp(event: any) {
        const keyCode = event.keyCode;
        
        if (!this._isTestMode || !this._isControllingObject) return;
        
        // 处理移动按键释放
        switch (keyCode) {
            case KeyCode.KEY_W:
            case KeyCode.KEY_S:
                this._objectMoveDirection.y = 0;
                break;
            case KeyCode.KEY_A:
            case KeyCode.KEY_D:
                this._objectMoveDirection.x = 0;
                break;
        }
    }

    /**
     * 处理控制模式下的按键
     */
    private handleControlKeys(keyCode: number) {
        switch (keyCode) {
            case KeyCode.KEY_W:
                this._objectMoveDirection.y = 1;
                break;
            case KeyCode.KEY_S:
                this._objectMoveDirection.y = -1;
                break;
            case KeyCode.KEY_A:
                this._objectMoveDirection.x = -1;
                break;
            case KeyCode.KEY_D:
                this._objectMoveDirection.x = 1;
                break;
            case KeyCode.KEY_J:
                // 攻击逻辑
                this._currentAnimationState = 'Attack';
                this.playObjectAnimation('Attack');
                this.updateUIDisplay();
                
                // 🔍 调试：输出UI组件信息
                this.debugUIComponents();
                
                console.log('⚔️ 攻击！');
                break;
            case KeyCode.KEY_K:
                this.testTakeDamage();
                break;
            case KeyCode.KEY_C:
                this.toggleObjectControl();
                break;
            case KeyCode.SPACE:
                this.resetCurrentObject();
                break;
        }
    }

    /**
     * 处理观察模式下的按键
     */
    private handleObservationKeys(keyCode: number) {
        // 数字键切换怪物类型
        if (keyCode >= KeyCode.DIGIT_1 && keyCode <= KeyCode.DIGIT_3) {
            const index = keyCode - KeyCode.DIGIT_1;
            if (index < this.MONSTER_TYPES.length) {
                this.switchSubType(this.MONSTER_TYPES[index]);
            }
        }
        
        switch (keyCode) {
            case KeyCode.KEY_Q:
                this._currentAnimationState = 'Idle';
                this.playObjectAnimation('Idle');
                this.updateUIDisplay();
                break;
            case KeyCode.KEY_W:
                this._currentAnimationState = 'Walk';
                this.playObjectAnimation('Walk');
                this.updateUIDisplay();
                break;
            case KeyCode.KEY_E:
                this._currentAnimationState = 'Attack';
                this.playObjectAnimation('Attack');
                this.updateUIDisplay();
                break;
            case KeyCode.KEY_R:
                this._currentAnimationState = 'Hurt';
                this.playObjectAnimation('Hurt');
                this.updateUIDisplay();
                break;
            case KeyCode.KEY_T:
                this._currentAnimationState = 'Death';
                this.playObjectAnimation('Death');
                this.updateUIDisplay();
                break;
            case KeyCode.KEY_C:
                this.toggleObjectControl();
                break;
            case KeyCode.KEY_Y:
                this.testObjectSystem();
                break;
            case KeyCode.SPACE:
                this.resetCurrentObject();
                break;
            case KeyCode.F2:
                // 调试动画系统
                this.debugAnimationSystem();
                break;
            // 🧭 方向控制键（观察模式下测试不同方向）
            case KeyCode.ARROW_UP:
                this.setTestObjectDirection('back');
                this.playObjectAnimation(this._currentAnimationState, 'back');
                console.log('🧭 切换到背面');
                break;
            case KeyCode.ARROW_DOWN:
                this.setTestObjectDirection('front');
                this.playObjectAnimation(this._currentAnimationState, 'front');
                console.log('🧭 切换到正面');
                break;
            case KeyCode.ARROW_LEFT:
                this.setTestObjectDirection('left');
                this.playObjectAnimation(this._currentAnimationState, 'left');
                console.log('🧭 切换到左侧');
                break;
            case KeyCode.ARROW_RIGHT:
                this.setTestObjectDirection('right');
                this.playObjectAnimation(this._currentAnimationState, 'right');
                console.log('🧭 切换到右侧');
                break;
        }
    }

    /**
     * 🧭 设置测试对象的方向
     */
    private setTestObjectDirection(direction: string) {
        const controller = this._testControllers.get(this._currentTestType);
        if (controller && controller._currentDirection !== undefined) {
            controller._currentDirection = direction;
            console.log(`🧭 设置对象方向: ${direction}`);
        }
    }

    /**
     * 调试动画系统状态
     */
    private debugAnimationSystem() {
        console.log('🧪================================');
        console.log('🧪 F2调试: 开始分析动画系统状态...');
        console.log('🧪================================');
        
        const controller = this._testControllers.get(TestObjectType.MONSTER);
        if (!controller) {
            console.error('❌ F2调试: 没有找到怪物控制器');
            return;
        }
        
        const enemyController = controller as EnemyController;
        const monsterObject = this._testObjects.get(TestObjectType.MONSTER);
        
        console.log('📊 F2调试: 基础信息');
        console.log(`  - 怪物类型: ${this._currentSubType}`);
        console.log(`  - 怪物对象: ${monsterObject ? '存在' : '不存在'}`);
        console.log(`  - 怪物激活: ${monsterObject?.active ? '是' : '否'}`);
        console.log(`  - 控制器: ${enemyController ? '存在' : '不存在'}`);
        
        if (!monsterObject || !enemyController) {
            console.error('❌ F2调试: 基础对象缺失，无法继续调试');
            return;
        }
        
        console.log('📊 F2调试: 动画系统详细状态');
        console.log(`  - 当前动画状态: ${(enemyController as any)._currentAnimationState || '未知'}`);
        console.log(`  - 当前方向: ${(enemyController as any)._currentDirection || '未知'}`);
        console.log(`  - 动画组件: ${(enemyController as any)._animation ? '存在' : '❌不存在'}`);
        console.log(`  - 怪物数据: ${(enemyController as any).data ? '✅已加载' : '❌未加载'}`);
        
        // 检查Animation组件的状态
        const animation = (enemyController as any)._animation;
        if (animation) {
            const clips = animation.clips;
            console.log(`📊 F2调试: 动画剪辑信息`);
            console.log(`  - 动画剪辑总数: ${clips.length}`);
            
            if (clips.length === 0) {
                console.error('❌ F2调试: 没有动画剪辑！这是动画问题的根源');
            } else {
                console.log('  - 可用动画列表:');
                clips.forEach((clip: any, index: number) => {
                    if (clip) {
                        console.log(`    ${index + 1}. ${clip.name}: ${clip.duration.toFixed(2)}秒`);
                    } else {
                        console.warn(`    ${index + 1}. ❌空剪辑`);
                    }
                });
                
                // 检查关键动画是否存在
                const keyAnimations = ['Idle_front', 'Walk_front', 'Attack_front', 'Hurt_front', 'Death_front'];
                console.log('📊 F2调试: 关键动画检查');
                keyAnimations.forEach(animName => {
                    const hasAnim = clips.some((clip: any) => clip && clip.name === animName);
                    console.log(`  - ${animName}: ${hasAnim ? '✅存在' : '❌缺失'}`);
                });
            }
            
            // 获取当前播放状态
            const currentClip = animation.currentClip;
            console.log(`📊 F2调试: 当前播放状态`);
            console.log(`  - 当前剪辑: ${currentClip ? currentClip.name : '❌无'}`);
            console.log(`  - 是否播放中: ${animation.getState('Idle_front')?.isPlaying || false}`);
        } else {
            console.error('❌ F2调试: Animation组件不存在！');
        }
        
        // 检查怪物数据配置
        const data = (enemyController as any).data;
        if (data) {
            console.log('📊 F2调试: 怪物配置数据');
            console.log(`  - ID: ${data.id}`);
            console.log(`  - 名称: ${data.name}`);
            console.log(`  - 图集路径: ${data.plistUrl}`);
            console.log(`  - 动画前缀: ${data.assetNamePrefix}`);
            console.log(`  - 节点缩放: ${data.nodeScale}`);
        }
        
        // 尝试手动播放动画测试
        console.log('🎭 F2调试: 尝试手动播放测试动画...');
        if (animation) {
            // 测试Idle动画
            const idleState = animation.getState('Idle_front');
            if (idleState) {
                animation.play('Idle_front');
                console.log('✅ F2调试: 成功播放Idle_front动画');
            } else {
                console.error('❌ F2调试: 无法播放Idle_front动画 - 状态不存在');
            }
            
            // 测试其他关键动画
            setTimeout(() => {
                console.log('🎭 F2调试: 2秒后测试Walk动画...');
                if (animation.getState('Walk_front')) {
                    animation.play('Walk_front');
                    console.log('✅ F2调试: 成功播放Walk_front动画');
                } else {
                    console.error('❌ F2调试: 无法播放Walk_front动画');
                }
            }, 2000);
            
            setTimeout(() => {
                console.log('🎭 F2调试: 4秒后测试Attack动画...');
                if (animation.getState('Attack_front')) {
                    animation.play('Attack_front');
                    console.log('✅ F2调试: 成功播放Attack_front动画');
                } else {
                    console.error('❌ F2调试: 无法播放Attack_front动画');
                }
            }, 4000);
        } else {
            console.error('❌ F2调试: 无法进行动画播放测试 - Animation组件缺失');
        }
        
        // 尝试强制重新加载动画系统
        console.log('🔄 F2调试: 尝试强制重新加载动画系统...');
        this.forceReloadAnimationSystem(enemyController);
        
        console.log('🧪================================');
        console.log('🧪 F2调试: 动画系统分析完成');
        console.log('🧪================================');
    }

    /**
     * 强制重新加载动画系统
     */
    private forceReloadAnimationSystem(enemyController: EnemyController) {
        try {
            console.log('🔄 强制重新初始化动画系统...');
            
            // 重新调用init方法，强制重新加载
            const currentSubType = this._currentSubType;
            (enemyController as any).init(currentSubType);
            
            console.log('✅ 动画系统重新初始化完成');
            
            // 延迟验证结果
            setTimeout(() => {
                const animation = (enemyController as any)._animation;
                if (animation && animation.clips.length > 0) {
                    console.log(`✅ 动画重新加载成功！现在有 ${animation.clips.length} 个动画剪辑`);
                } else {
                    console.error('❌ 动画重新加载失败，问题依然存在');
                }
            }, 1000);
            
        } catch (error) {
            console.error('❌ 强制重新加载动画系统时出错:', error);
        }
    }

    onDestroy() {
        console.log('🧪 TestManager 开始销毁');
        
        if (this._isControllingObject) {
            this.disableObjectControl();
        }
        
        // 场景级事件会自动清理，无需手动恢复PlayerController输入
        
        // 清理测试对象
        this._testObjects.forEach((object) => {
            if (object && object.isValid) {
                object.destroy();
            }
        });
        this._testObjects.clear();
        this._testControllers.clear();
        
        // 清理UI
        if (this._testPanel && this._testPanel.isValid) {
            this._testPanel.destroy();
        }
        
        console.log('✅ TestManager 销毁完成（场景级事件自动清理）');
    }
} 