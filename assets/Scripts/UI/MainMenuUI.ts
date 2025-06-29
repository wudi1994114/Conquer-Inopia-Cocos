import { _decorator, Component, Node, Button } from 'cc';
import { GameManager } from '../Managers/GameManager';
import { UIManager } from '../Managers/UIManager';
import { AudioManager } from '../Managers/AudioManager';
const { ccclass, property } = _decorator;

@ccclass('MainMenuUI')
export class MainMenuUI extends Component {
    @property({ type: Button })
    public startButton: Button = null!;

    @property({ type: Button })
    public settingsButton: Button = null!;

    @property({ type: Button })
    public exitButton: Button = null!;

    @property({ type: Node })
    public settingsPanel: Node = null!;

    @property({ type: Button })
    public bgmToggleButton: Button = null!;

    @property({ type: Button })
    public sfxToggleButton: Button = null!;

    @property({ type: Button })
    public backButton: Button = null!;

    start() {
        this.bindEvents();
        this.initSettings();
        
        // 播放菜单背景音乐
        if (AudioManager.instance) {
            AudioManager.instance.playMenuBGM();
        }
    }

    private bindEvents() {
        if (this.startButton) {
            this.startButton.node.on(Button.EventType.CLICK, this.onStartButtonClick, this);
        }
        if (this.settingsButton) {
            this.settingsButton.node.on(Button.EventType.CLICK, this.onSettingsButtonClick, this);
        }
        if (this.exitButton) {
            this.exitButton.node.on(Button.EventType.CLICK, this.onExitButtonClick, this);
        }
        if (this.bgmToggleButton) {
            this.bgmToggleButton.node.on(Button.EventType.CLICK, this.onBGMToggleClick, this);
        }
        if (this.sfxToggleButton) {
            this.sfxToggleButton.node.on(Button.EventType.CLICK, this.onSFXToggleClick, this);
        }
        if (this.backButton) {
            this.backButton.node.on(Button.EventType.CLICK, this.onBackButtonClick, this);
        }
    }

    private initSettings() {
        if (this.settingsPanel) {
            this.settingsPanel.active = false;
        }
        this.updateToggleButtons();
    }

    private updateToggleButtons() {
        if (AudioManager.instance) {
            // 更新BGM切换按钮文本
            if (this.bgmToggleButton) {
                const bgmButtonLabel = this.bgmToggleButton.node.getChildByName("Label");
                if (bgmButtonLabel) {
                    const label = bgmButtonLabel.getComponent("Label");
                    if (label) {
                        label.string = AudioManager.instance.isBGMMuted() ? "BGM: 关" : "BGM: 开";
                    }
                }
            }
            
            // 更新SFX切换按钮文本
            if (this.sfxToggleButton) {
                const sfxButtonLabel = this.sfxToggleButton.node.getChildByName("Label");
                if (sfxButtonLabel) {
                    const label = sfxButtonLabel.getComponent("Label");
                    if (label) {
                        label.string = AudioManager.instance.isSFXMuted() ? "音效: 关" : "音效: 开";
                    }
                }
            }
        }
    }

    // 按钮事件处理
    private onStartButtonClick() {
        console.log("开始游戏");
        
        // 播放按钮点击音效
        if (AudioManager.instance) {
            AudioManager.instance.playButtonClickSFX();
        }
        
        // 切换到游戏场景
        if (GameManager.instance) {
            GameManager.instance.startGame();
        }
        
        if (UIManager.instance) {
            UIManager.instance.showGameUI();
        }
    }

    private onSettingsButtonClick() {
        console.log("打开设置");
        
        if (AudioManager.instance) {
            AudioManager.instance.playButtonClickSFX();
        }
        
        if (this.settingsPanel) {
            this.settingsPanel.active = true;
        }
    }

    private onExitButtonClick() {
        console.log("退出游戏");
        
        if (AudioManager.instance) {
            AudioManager.instance.playButtonClickSFX();
        }
        
        // 在实际项目中，这里可以调用退出游戏的API
        // game.end();
    }

    private onBGMToggleClick() {
        if (AudioManager.instance) {
            AudioManager.instance.playButtonClickSFX();
            AudioManager.instance.toggleBGM();
            this.updateToggleButtons();
        }
    }

    private onSFXToggleClick() {
        if (AudioManager.instance) {
            AudioManager.instance.toggleSFX();
            this.updateToggleButtons();
        }
    }

    private onBackButtonClick() {
        if (AudioManager.instance) {
            AudioManager.instance.playButtonClickSFX();
        }
        
        if (this.settingsPanel) {
            this.settingsPanel.active = false;
        }
    }

    onDestroy() {
        // 清理事件监听
        if (this.startButton) {
            this.startButton.node.off(Button.EventType.CLICK, this.onStartButtonClick, this);
        }
        if (this.settingsButton) {
            this.settingsButton.node.off(Button.EventType.CLICK, this.onSettingsButtonClick, this);
        }
        if (this.exitButton) {
            this.exitButton.node.off(Button.EventType.CLICK, this.onExitButtonClick, this);
        }
        if (this.bgmToggleButton) {
            this.bgmToggleButton.node.off(Button.EventType.CLICK, this.onBGMToggleClick, this);
        }
        if (this.sfxToggleButton) {
            this.sfxToggleButton.node.off(Button.EventType.CLICK, this.onSFXToggleClick, this);
        }
        if (this.backButton) {
            this.backButton.node.off(Button.EventType.CLICK, this.onBackButtonClick, this);
        }
    }
} 