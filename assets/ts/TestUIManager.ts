import { _decorator, Component, Node, UITransform, Canvas, Widget, Label, Button, Layout, Vec3, UIOpacity, Color, director, Sprite, ScrollView, Prefab, Toggle, Slider, EditBox } from 'cc';
import { TestObjectType } from './TestManager';

const { ccclass, property } = _decorator;

/**
 * UI面板类型
 */
export enum UIPanelType {
    MAIN = 'main',
    PARAMETERS = 'parameters',
    CONTROLS = 'controls',
    DEBUG = 'debug'
}

/**
 * 测试UI管理器
 * 专门管理测试系统的用户界面
 */
@ccclass('TestUIManager')
export class TestUIManager extends Component {
    
    @property({ tooltip: 'UI面板宽度' })
    public panelWidth: number = 650;
    
    @property({ tooltip: 'UI面板高度' })
    public panelHeight: number = 1200;
    
    @property({ tooltip: 'UI透明度 (0-255)' })
    public panelOpacity: number = 220;
    
    // ======================== UI根节点 ========================
    private _mainPanel: Node | null = null;
    private _canvas: Canvas | null = null;
    
    // ======================== UI面板容器 ========================
    private _panelContainer: Map<UIPanelType, Node> = new Map();
    private _currentActivePanel: UIPanelType = UIPanelType.MAIN;
    
    // ======================== UI元素引用 ========================
    private _labels: Map<string, Label> = new Map();
    private _buttons: Map<string, Button> = new Map();
    private _toggles: Map<string, Toggle> = new Map();
    private _sliders: Map<string, Slider> = new Map();
    
    // ======================== 布局配置 ========================
    private readonly UI_CONFIG = {
        margin: 15,
        spacing: 8,
        buttonHeight: 35,
        labelHeight: 24,
        fontSize: {
            title: 160,       // 32 * 5
            subtitle: 130,    // 26 * 5  
            normal: 110,      // 22 * 5
            small: 90,        // 18 * 5
            tiny: 80          // 16 * 5
        },
        colors: {
            title: Color.YELLOW,
            subtitle: Color.CYAN,
            normal: Color.WHITE,
            success: Color.GREEN,
            warning: Color.YELLOW,
            error: Color.RED,
            info: Color.CYAN,
            highlight: Color.MAGENTA
        }
    };
    
    /**
     * 初始化UI系统
     */
    public initializeUI(): boolean {
        if (!this.findCanvas()) {
            console.error('❌ TestUIManager: 无法找到Canvas组件');
            return false;
        }
        
        this.createMainPanel();
        this.createPanelContainers();
        this.createMainPanelContent();
        this.createParametersPanelContent();
        this.createControlsPanelContent();
        this.createDebugPanelContent();
        
        // 默认显示主面板
        this.switchToPanel(UIPanelType.MAIN);
        
        console.log('✅ TestUIManager: UI系统初始化完成');
        return true;
    }
    
    /**
     * 查找Canvas组件
     */
    private findCanvas(): boolean {
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
        
        this._canvas = canvas;
        return canvas !== null;
    }
    
    /**
     * 创建主面板
     */
    private createMainPanel() {
        this._mainPanel = new Node('TestUIPanel');
        this._mainPanel.addComponent(UITransform);
        this._mainPanel.addComponent(Widget);
        
        this._canvas!.node.addChild(this._mainPanel);
        
        // 配置Widget - 固定在左上角
        const widget = this._mainPanel.getComponent(Widget);
        if (widget) {
            widget.isAlignTop = true;
            widget.isAlignLeft = true;
            widget.top = 10;
            widget.left = 10;
            widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
        }
        
        // 设置面板尺寸
        const panelTransform = this._mainPanel.getComponent(UITransform);
        if (panelTransform) {
            panelTransform.setContentSize(this.panelWidth, this.panelHeight);
        }
        
        // 添加背景和透明度
        const uiOpacity = this._mainPanel.addComponent(UIOpacity);
        uiOpacity.opacity = this.panelOpacity;
        
        // 添加顶级标题
        const titleLabel = this.createLabel('🧪 游戏测试系统', this.UI_CONFIG.fontSize.title, this.UI_CONFIG.colors.title);
        titleLabel.node.setParent(this._mainPanel);
        
        console.log('✅ 主UI面板创建完成');
    }
    
    /**
     * 创建面板容器
     */
    private createPanelContainers() {
        const panelTypes = [UIPanelType.MAIN, UIPanelType.PARAMETERS, UIPanelType.CONTROLS, UIPanelType.DEBUG];
        panelTypes.forEach((panelType: UIPanelType) => {
            const container = new Node(`${panelType}Panel`);
            container.addComponent(UITransform);
            
            // 添加滚动视图支持
            const scrollView = container.addComponent(ScrollView);
            const content = new Node('Content');
            content.addComponent(UITransform);
            container.addChild(content);
            
            // 配置滚动视图
            const contentTransform = content.getComponent(UITransform);
            if (contentTransform) {
                contentTransform.setContentSize(this.panelWidth - 30, 2000); // 可滚动的高度
            }
            
            scrollView.content = content;
            scrollView.vertical = true;
            scrollView.horizontal = false;
            
            // 添加布局组件到内容区域
            const layout = content.addComponent(Layout);
            layout.type = Layout.Type.VERTICAL;
            layout.paddingTop = this.UI_CONFIG.margin;
            layout.paddingBottom = this.UI_CONFIG.margin;
            layout.paddingLeft = this.UI_CONFIG.margin;
            layout.paddingRight = this.UI_CONFIG.margin;
            layout.spacingY = this.UI_CONFIG.spacing;
            
            this._mainPanel!.addChild(container);
            this._panelContainer.set(panelType, container);
            
            // 默认隐藏所有面板
            container.active = false;
        });
    }
    
    /**
     * 创建主面板内容
     */
    private createMainPanelContent() {
        const mainPanel = this._panelContainer.get(UIPanelType.MAIN);
        if (!mainPanel) return;
        
        const content = mainPanel.getComponentInChildren(ScrollView)?.content;
        if (!content) return;
        
        // 系统状态区域
        this.addSectionTitle(content, '🎮 系统状态');
        
        this._labels.set('testType', this.addLabel(content, '测试类型: 怪物', this.UI_CONFIG.fontSize.normal, this.UI_CONFIG.colors.normal));
        this._labels.set('subType', this.addLabel(content, '当前对象: ent_normal', this.UI_CONFIG.fontSize.normal, this.UI_CONFIG.colors.normal));
        this._labels.set('animationState', this.addLabel(content, '动画状态: Idle', this.UI_CONFIG.fontSize.normal, this.UI_CONFIG.colors.normal));
        this._labels.set('controlMode', this.addLabel(content, '控制模式: 观察模式', this.UI_CONFIG.fontSize.normal, this.UI_CONFIG.colors.info));
        
        // 快速操作区域
        this.addSectionTitle(content, '⚡ 快速操作');
        
        this._buttons.set('switchTestType', this.addButton(content, '🔄 切换测试类型 (TAB)', () => {
            this.emitEvent('switchTestType');
        }));
        
        this._buttons.set('toggleControl', this.addButton(content, '🎮 切换控制模式 (C)', () => {
            this.emitEvent('toggleControl');
        }));
        
        this._buttons.set('resetObject', this.addButton(content, '🔄 重置对象 (Space)', () => {
            this.emitEvent('resetObject');
        }));
        
        // 面板导航区域
        this.addSectionTitle(content, '📋 面板导航');
        
        this._buttons.set('showParameters', this.addButton(content, '🎛️ 参数调整面板', () => {
            this.switchToPanel(UIPanelType.PARAMETERS);
        }));
        
        this._buttons.set('showControls', this.addButton(content, '🎮 控制面板', () => {
            this.switchToPanel(UIPanelType.CONTROLS);
        }));
        
        this._buttons.set('showDebug', this.addButton(content, '🔍 调试信息面板', () => {
            this.switchToPanel(UIPanelType.DEBUG);
        }));
        
        // 快捷键说明
        this.addSectionTitle(content, '⌨️ 快捷键说明');
        this.addLabel(content, 'F1: 切换测试面板 | F10/F11: 场景切换', this.UI_CONFIG.fontSize.small, this.UI_CONFIG.colors.normal);
        this.addLabel(content, 'TAB: 切换测试类型 | 1-3: 切换怪物类型', this.UI_CONFIG.fontSize.small, this.UI_CONFIG.colors.normal);
        this.addLabel(content, 'QWERT: 播放动画 | C: 控制模式', this.UI_CONFIG.fontSize.small, this.UI_CONFIG.colors.normal);
        this.addLabel(content, 'WASD: 移动控制 | J: 攻击 | K: 受伤', this.UI_CONFIG.fontSize.small, this.UI_CONFIG.colors.normal);
    }
    
    /**
     * 创建参数面板内容
     */
    private createParametersPanelContent() {
        const paramPanel = this._panelContainer.get(UIPanelType.PARAMETERS);
        if (!paramPanel) return;
        
        const content = paramPanel.getComponentInChildren(ScrollView)?.content;
        if (!content) return;
        
        // 返回按钮
        this.addBackButton(content);
        
        this.addSectionTitle(content, '🎛️ 参数调整');
        this.addLabel(content, '实时调整对象属性，立即生效！', this.UI_CONFIG.fontSize.small, this.UI_CONFIG.colors.info);
        
        // 参数控件将动态添加
        this._parameterContainer = content;
        
        // 重置按钮
        this._buttons.set('resetAllParams', this.addButton(content, '🔄 重置所有参数', () => {
            this.emitEvent('resetAllParameters');
        }));
    }
    
    /**
     * 创建控制面板内容
     */
    private createControlsPanelContent() {
        const controlPanel = this._panelContainer.get(UIPanelType.CONTROLS);
        if (!controlPanel) return;
        
        const content = controlPanel.getComponentInChildren(ScrollView)?.content;
        if (!content) return;
        
        // 返回按钮
        this.addBackButton(content);
        
        this.addSectionTitle(content, '🎮 控制操作');
        
        // 怪物类型选择
        this.addSectionTitle(content, '👹 怪物类型');
        const monsterTypes = ['ent_normal', 'lich_elite', 'ent_boss'];
        monsterTypes.forEach((type, index) => {
            this._buttons.set(`monster_${type}`, this.addButton(content, `${index + 1}. ${type}`, () => {
                this.emitEvent('switchSubType', type);
            }));
        });
        
        // 动画控制
        this.addSectionTitle(content, '🎭 动画控制');
        const animations = [
            { key: 'idle', name: 'Idle (Q)', state: 'Idle' },
            { key: 'walk', name: 'Walk (W)', state: 'Walk' },
            { key: 'attack', name: 'Attack (E)', state: 'Attack' },
            { key: 'hurt', name: 'Hurt (R)', state: 'Hurt' },
            { key: 'death', name: 'Death (T)', state: 'Death' }
        ];
        
        animations.forEach(anim => {
            this._buttons.set(`anim_${anim.key}`, this.addButton(content, anim.name, () => {
                this.emitEvent('playAnimation', anim.state);
            }));
        });
        
        // 特殊操作
        this.addSectionTitle(content, '⚡ 特殊操作');
        
        this._buttons.set('takeDamage', this.addButton(content, '💥 测试受伤 (K)', () => {
            this.emitEvent('testTakeDamage');
        }));
        
        this._buttons.set('testSystem', this.addButton(content, '🧪 测试系统 (Y)', () => {
            this.emitEvent('testSystem');
        }));
    }
    
    /**
     * 创建调试面板内容
     */
    private createDebugPanelContent() {
        const debugPanel = this._panelContainer.get(UIPanelType.DEBUG);
        if (!debugPanel) return;
        
        const content = debugPanel.getComponentInChildren(ScrollView)?.content;
        if (!content) return;
        
        // 返回按钮
        this.addBackButton(content);
        
        this.addSectionTitle(content, '🔍 调试信息');
        
        // 调试信息显示区域
        this._labels.set('debugInfo', this.addMultilineLabel(content, '调试信息加载中...', this.UI_CONFIG.fontSize.small, this.UI_CONFIG.colors.success, 460, 200));
        
        // 系统信息
        this.addSectionTitle(content, '🖥️ 系统信息');
        this._labels.set('systemInfo', this.addMultilineLabel(content, '系统信息加载中...', this.UI_CONFIG.fontSize.tiny, this.UI_CONFIG.colors.normal, 460, 150));
        
        // 性能监控
        this.addSectionTitle(content, '📊 性能监控');
        this._labels.set('performanceInfo', this.addLabel(content, '帧率: -- | 内存: --', this.UI_CONFIG.fontSize.small, this.UI_CONFIG.colors.info));
    }
    
    /**
     * 添加区域标题
     */
    private addSectionTitle(parent: Node, title: string): Label {
        return this.addLabel(parent, title, this.UI_CONFIG.fontSize.subtitle, this.UI_CONFIG.colors.subtitle);
    }
    
    /**
     * 添加返回按钮
     */
    private addBackButton(parent: Node): Button {
        return this.addButton(parent, '← 返回主面板', () => {
            this.switchToPanel(UIPanelType.MAIN);
        });
    }
    
    /**
     * 添加标签
     */
    private addLabel(parent: Node, text: string, fontSize: number, color: Color): Label {
        const label = this.createLabel(text, fontSize, color);
        label.node.setParent(parent);
        return label;
    }
    
    /**
     * 添加多行标签
     */
    private addMultilineLabel(parent: Node, text: string, fontSize: number, color: Color, width: number, height: number): Label {
        const label = this.createLabel(text, fontSize, color);
        label.node.setParent(parent);
        
        // 设置多行显示
        label.overflow = Label.Overflow.RESIZE_HEIGHT;
        const transform = label.node.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(width, height);
        }
        
        return label;
    }
    
    /**
     * 添加按钮
     */
    private addButton(parent: Node, text: string, callback: () => void): Button {
        const button = this.createButton(text, callback);
        button.node.setParent(parent);
        return button;
    }
    
    /**
     * 创建标签
     */
    private createLabel(text: string, fontSize: number, color: Color): Label {
        const labelNode = new Node('Label');
        labelNode.addComponent(UITransform);
        
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.color = color;
        label.overflow = Label.Overflow.SHRINK;
        
        const labelTransform = labelNode.getComponent(UITransform);
        if (labelTransform) {
            labelTransform.setContentSize(this.panelWidth - 60, this.UI_CONFIG.labelHeight);
        }
        
        return label;
    }
    
    /**
     * 创建按钮
     */
    private createButton(text: string, callback: () => void): Button {
        const buttonNode = new Node('Button');
        buttonNode.addComponent(UITransform);
        
        const button = buttonNode.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        button.zoomScale = 0.95;
        
        const buttonTransform = buttonNode.getComponent(UITransform);
        if (buttonTransform) {
            buttonTransform.setContentSize(this.panelWidth - 60, this.UI_CONFIG.buttonHeight);
        }
        
        // 添加按钮文本
        const labelNode = new Node('Label');
        labelNode.addComponent(UITransform);
        buttonNode.addChild(labelNode);
        
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = this.UI_CONFIG.fontSize.normal;
        label.color = Color.WHITE;
        
        // 设置点击事件
        button.node.on(Button.EventType.CLICK, callback, this);
        
        return button;
    }
    
    /**
     * 切换到指定面板
     */
    public switchToPanel(panelType: UIPanelType) {
        // 隐藏当前面板
        const currentPanel = this._panelContainer.get(this._currentActivePanel);
        if (currentPanel) {
            currentPanel.active = false;
        }
        
        // 显示新面板
        const newPanel = this._panelContainer.get(panelType);
        if (newPanel) {
            newPanel.active = true;
            this._currentActivePanel = panelType;
            console.log(`🔄 切换到${panelType}面板`);
        }
    }
    
    /**
     * 更新标签文本
     */
    public updateLabel(labelKey: string, text: string, color?: Color) {
        const label = this._labels.get(labelKey);
        if (label) {
            label.string = text;
            if (color) {
                label.color = color;
            }
        }
    }
    
    /**
     * 更新按钮文本
     */
    public updateButton(buttonKey: string, text: string) {
        const button = this._buttons.get(buttonKey);
        if (button) {
            const label = button.node.getComponentInChildren(Label);
            if (label) {
                label.string = text;
            }
        }
    }
    
    /**
     * 设置按钮启用状态
     */
    public setButtonEnabled(buttonKey: string, enabled: boolean) {
        const button = this._buttons.get(buttonKey);
        if (button) {
            button.interactable = enabled;
        }
    }
    
    /**
     * 设置面板可见性
     */
    public setVisible(visible: boolean) {
        if (this._mainPanel) {
            this._mainPanel.active = visible;
        }
    }
    
    /**
     * 创建参数控件
     */
    public createParameterControl(key: string, displayName: string, currentValue: number, unit: string, onAdjust: (delta: number) => void, onReset: () => void) {
        if (!this._parameterContainer) return;
        
        // 参数标签
        const paramLabel = this.addLabel(this._parameterContainer, `${displayName}: ${currentValue}${unit}`, this.UI_CONFIG.fontSize.normal, this.UI_CONFIG.colors.normal);
        this._labels.set(`param_${key}`, paramLabel);
        
        // 按钮容器
        const buttonContainer = new Node('ButtonContainer');
        buttonContainer.addComponent(UITransform);
        this._parameterContainer.addChild(buttonContainer);
        
        const containerTransform = buttonContainer.getComponent(UITransform);
        if (containerTransform) {
            containerTransform.setContentSize(this.panelWidth - 60, 35);
        }
        
        // 创建调整按钮
        this.createParameterButton(buttonContainer, '－－', () => onAdjust(-10), 0, 0, 60, 30);
        this.createParameterButton(buttonContainer, '－', () => onAdjust(-1), 70, 0, 50, 30);
        this.createParameterButton(buttonContainer, '＋', () => onAdjust(1), this.panelWidth - 180, 0, 50, 30);
        this.createParameterButton(buttonContainer, '＋＋', () => onAdjust(10), this.panelWidth - 120, 0, 60, 30);
        this.createParameterButton(buttonContainer, '重置', onReset, (this.panelWidth - 60) / 2 - 25, 0, 50, 30);
    }
    
    /**
     * 创建参数调整按钮
     */
    private createParameterButton(parent: Node, text: string, callback: () => void, x: number, y: number, width: number, height: number) {
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
        label.fontSize = this.UI_CONFIG.fontSize.tiny;
        label.color = Color.WHITE;
        
        button.node.on(Button.EventType.CLICK, callback, this);
    }
    
    /**
     * 更新参数显示
     */
    public updateParameterValue(key: string, displayName: string, value: number, unit: string, isModified: boolean) {
        const label = this._labels.get(`param_${key}`);
        if (label) {
            label.string = `${displayName}: ${value.toFixed(value < 1 ? 1 : 0)}${unit}`;
            label.color = isModified ? this.UI_CONFIG.colors.warning : this.UI_CONFIG.colors.normal;
        }
    }
    
    /**
     * 清除参数控件
     */
    public clearParameterControls() {
        if (!this._parameterContainer) return;
        
        // 移除所有参数相关的标签
        const keysToRemove: string[] = [];
        this._labels.forEach((label, key) => {
            if (key.startsWith('param_')) {
                label.node.destroy();
                keysToRemove.push(key);
            }
        });
        
        keysToRemove.forEach(key => {
            this._labels.delete(key);
        });
        
        // 清除参数容器中的动态内容（保留固定内容）
        const children = this._parameterContainer.children;
        for (let i = children.length - 1; i >= 0; i--) {
            const child = children[i];
            if (child.name === 'ButtonContainer' || child.name === 'Label') {
                child.destroy();
            }
        }
    }
    
    /**
     * 发射事件给测试管理器
     */
    private emitEvent(eventName: string, data?: any) {
        this.node.emit('testUI_' + eventName, data);
    }
    
    /**
     * 销毁UI系统
     */
    public destroyUI() {
        if (this._mainPanel) {
            this._mainPanel.destroy();
            this._mainPanel = null;
        }
        
        this._panelContainer.clear();
        this._labels.clear();
        this._buttons.clear();
        this._toggles.clear();
        this._sliders.clear();
        
        console.log('🗑️ TestUIManager: UI系统已销毁');
    }
    
    onDestroy() {
        this.destroyUI();
    }
    
    // 参数容器引用（用于动态添加参数控件）
    private _parameterContainer: Node | null = null;
} 