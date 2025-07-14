import { _decorator, Component, director, input, Input, KeyCode, sys } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 场景管理器 - 负责场景切换和测试模式管理
 */
@ccclass('SceneManager')
export class SceneManager extends Component {
    
    @property({ tooltip: '主游戏场景名称' })
    public mainSceneName: string = 'MainSence';
    
    @property({ tooltip: '测试场景名称' })
    public testSceneName: string = 'TestScene';
    
    private static _instance: SceneManager | null = null;
    private _currentSceneType: 'main' | 'test' = 'main';
    
    onLoad() {
        // 单例模式
        if (SceneManager._instance) {
            this.node.destroy();
            return;
        }
        SceneManager._instance = this;
        
        // 不销毁此节点，以便在场景切换时保持状态
        director.addPersistRootNode(this.node);
        
        // 检查当前场景类型
        this.detectCurrentScene();
        
        console.log('🎬 SceneManager 已初始化');
        console.log('🎮 按F10键切换到测试场景 | F11键切换到主场景');
    }
    
    onEnable() {
        // 注册键盘事件
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }
    
    onDisable() {
        // 取消键盘事件
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }
    
    /**
     * 获取单例实例
     */
    public static getInstance(): SceneManager | null {
        return SceneManager._instance;
    }
    
    /**
     * 检测当前场景类型
     */
    private detectCurrentScene() {
        const currentScene = director.getScene();
        if (!currentScene) return;
        
        const sceneName = currentScene.name;
        if (sceneName.includes('Test')) {
            this._currentSceneType = 'test';
        } else {
            this._currentSceneType = 'main';
        }
        
        console.log(`🎬 当前场景类型: ${this._currentSceneType} (${sceneName})`);
    }
    
    /**
     * 切换到测试场景
     */
    public switchToTestScene() {
        if (this._currentSceneType === 'test') {
            console.log('⚠️ 已在测试场景中');
            return;
        }
        
        console.log('🧪 切换到测试场景...');
        director.loadScene(this.testSceneName, (err) => {
            if (err) {
                console.error('❌ 切换到测试场景失败:', err);
                console.log('💡 请确保已创建测试场景文件：' + this.testSceneName);
            } else {
                this._currentSceneType = 'test';
                console.log('✅ 已切换到测试场景');
            }
        });
    }
    
    /**
     * 切换到主场景
     */
    public switchToMainScene() {
        if (this._currentSceneType === 'main') {
            console.log('⚠️ 已在主场景中');
            return;
        }
        
        console.log('🎮 切换到主场景...');
        director.loadScene(this.mainSceneName, (err) => {
            if (err) {
                console.error('❌ 切换到主场景失败:', err);
            } else {
                this._currentSceneType = 'main';
                console.log('✅ 已切换到主场景');
            }
        });
    }
    
    /**
     * 获取当前场景类型
     */
    public getCurrentSceneType(): 'main' | 'test' {
        return this._currentSceneType;
    }
    
    /**
     * 是否在测试场景中
     */
    public isInTestScene(): boolean {
        return this._currentSceneType === 'test';
    }
    
    /**
     * 键盘事件处理
     */
    private onKeyDown(event: any) {
        const keyCode = event.keyCode;
        
        // 只在调试模式下响应场景切换快捷键
        if (sys.isNative && !sys.isBrowser) {
            return; // 发布版本中禁用场景切换
        }
        
        switch (keyCode) {
            case KeyCode.F10: // F10 - 切换到测试场景
                this.switchToTestScene();
                break;
            case KeyCode.F11: // F11 - 切换到主场景
                this.switchToMainScene();
                break;
        }
    }
    
    onDestroy() {
        if (SceneManager._instance === this) {
            SceneManager._instance = null;
        }
        
        // 取消持久化
        director.removePersistRootNode(this.node);
        
        console.log('🎬 SceneManager 已销毁');
    }
} 