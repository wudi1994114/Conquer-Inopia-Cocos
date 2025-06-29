import { _decorator, Component, Node, Label, Button, director } from 'cc';
import { GameManager } from './GameManager';
const { ccclass, property } = _decorator;

@ccclass('UIManager')
export class UIManager extends Component {
    // 单例实例
    private static _instance: UIManager = null!;
    public static get instance(): UIManager {
        return this._instance;
    }

    // UI 面板
    @property({ type: Node })
    public mainMenuPanel: Node = null!;

    @property({ type: Node })
    public gamePanel: Node = null!;

    @property({ type: Node })
    public pausePanel: Node = null!;

    @property({ type: Node })
    public gameOverPanel: Node = null!;

    // UI 元素
    @property({ type: Label })
    public scoreLabel: Label = null!;

    @property({ type: Label })
    public healthLabel: Label = null!;

    @property({ type: Label })
    public finalScoreLabel: Label = null!;

    // 按钮
    @property({ type: Button })
    public startButton: Button = null!;

    @property({ type: Button })
    public pauseButton: Button = null!;

    @property({ type: Button })
    public resumeButton: Button = null!;

    @property({ type: Button })
    public restartButton: Button = null!;

    @property({ type: Button })
    public mainMenuButton: Button = null!;

    onLoad() {
        // 设置单例
        if (UIManager._instance === null) {
            UIManager._instance = this;
            director.addPersistRootNode(this.node);
        } else {
            this.node.destroy();
            return;
        }
    }

    start() {
        this.initUI();
        this.bindEvents();
    }

    update(deltaTime: number) {
        this.updateGameUI();
    }

    private initUI() {
        // 初始化显示主菜单
        this.showMainMenu();
    }

    private bindEvents() {
        // 绑定按钮事件
        if (this.startButton) {
            this.startButton.node.on(Button.EventType.CLICK, this.onStartButtonClick, this);
        }
        if (this.pauseButton) {
            this.pauseButton.node.on(Button.EventType.CLICK, this.onPauseButtonClick, this);
        }
        if (this.resumeButton) {
            this.resumeButton.node.on(Button.EventType.CLICK, this.onResumeButtonClick, this);
        }
        if (this.restartButton) {
            this.restartButton.node.on(Button.EventType.CLICK, this.onRestartButtonClick, this);
        }
        if (this.mainMenuButton) {
            this.mainMenuButton.node.on(Button.EventType.CLICK, this.onMainMenuButtonClick, this);
        }
    }

    private updateGameUI() {
        if (GameManager.instance) {
            // 更新分数
            if (this.scoreLabel) {
                this.scoreLabel.string = `分数: ${GameManager.instance.getScore()}`;
            }
            
            // 更新血量
            if (this.healthLabel) {
                this.healthLabel.string = `血量: ${GameManager.instance.getPlayerHealth()}`;
            }
        }
    }

    public showMainMenu() {
        this.hideAllPanels();
        if (this.mainMenuPanel) {
            this.mainMenuPanel.active = true;
        }
    }

    public showGameUI() {
        this.hideAllPanels();
        if (this.gamePanel) {
            this.gamePanel.active = true;
        }
    }

    public showPauseMenu() {
        if (this.pausePanel) {
            this.pausePanel.active = true;
        }
    }

    public hidePauseMenu() {
        if (this.pausePanel) {
            this.pausePanel.active = false;
        }
    }

    public showGameOver() {
        this.hideAllPanels();
        if (this.gameOverPanel) {
            this.gameOverPanel.active = true;
            
            // 显示最终分数
            if (this.finalScoreLabel && GameManager.instance) {
                this.finalScoreLabel.string = `最终分数: ${GameManager.instance.getScore()}`;
            }
        }
    }

    private hideAllPanels() {
        if (this.mainMenuPanel) this.mainMenuPanel.active = false;
        if (this.gamePanel) this.gamePanel.active = false;
        if (this.pausePanel) this.pausePanel.active = false;
        if (this.gameOverPanel) this.gameOverPanel.active = false;
    }

    // 按钮事件处理
    private onStartButtonClick() {
        console.log("开始游戏按钮点击");
        if (GameManager.instance) {
            GameManager.instance.startGame();
            this.showGameUI();
        }
    }

    private onPauseButtonClick() {
        console.log("暂停游戏按钮点击");
        if (GameManager.instance) {
            GameManager.instance.pauseGame();
            this.showPauseMenu();
        }
    }

    private onResumeButtonClick() {
        console.log("继续游戏按钮点击");
        if (GameManager.instance) {
            GameManager.instance.resumeGame();
            this.hidePauseMenu();
        }
    }

    private onRestartButtonClick() {
        console.log("重新开始按钮点击");
        if (GameManager.instance) {
            GameManager.instance.initGame();
            GameManager.instance.startGame();
            this.showGameUI();
        }
    }

    private onMainMenuButtonClick() {
        console.log("返回主菜单按钮点击");
        if (GameManager.instance) {
            GameManager.instance.initGame();
            this.showMainMenu();
        }
    }

    onDestroy() {
        // 清理事件监听
        if (this.startButton) {
            this.startButton.node.off(Button.EventType.CLICK, this.onStartButtonClick, this);
        }
        if (this.pauseButton) {
            this.pauseButton.node.off(Button.EventType.CLICK, this.onPauseButtonClick, this);
        }
        if (this.resumeButton) {
            this.resumeButton.node.off(Button.EventType.CLICK, this.onResumeButtonClick, this);
        }
        if (this.restartButton) {
            this.restartButton.node.off(Button.EventType.CLICK, this.onRestartButtonClick, this);
        }
        if (this.mainMenuButton) {
            this.mainMenuButton.node.off(Button.EventType.CLICK, this.onMainMenuButtonClick, this);
        }
    }
} 