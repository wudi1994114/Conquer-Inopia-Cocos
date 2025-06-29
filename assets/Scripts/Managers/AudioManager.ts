import { _decorator, Component, AudioClip, AudioSource, director } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AudioManager')
export class AudioManager extends Component {
    // 单例实例
    private static _instance: AudioManager = null!;
    public static get instance(): AudioManager {
        return this._instance;
    }

    // 背景音乐
    @property({ type: AudioClip })
    public bgmMenu: AudioClip = null!;

    @property({ type: AudioClip })
    public bgmGame: AudioClip = null!;

    // 音效
    @property({ type: AudioClip })
    public sfxShoot: AudioClip = null!;

    @property({ type: AudioClip })
    public sfxEnemyHit: AudioClip = null!;

    @property({ type: AudioClip })
    public sfxPlayerHit: AudioClip = null!;

    @property({ type: AudioClip })
    public sfxEnemyDie: AudioClip = null!;

    @property({ type: AudioClip })
    public sfxGameOver: AudioClip = null!;

    @property({ type: AudioClip })
    public sfxButtonClick: AudioClip = null!;

    // 音频源
    private bgmAudioSource: AudioSource = null!;
    private sfxAudioSource: AudioSource = null!;

    // 音量控制
    private bgmVolume: number = 0.5;
    private sfxVolume: number = 0.7;
    private isBgmMuted: boolean = false;
    private isSfxMuted: boolean = false;

    onLoad() {
        // 设置单例
        if (AudioManager._instance === null) {
            AudioManager._instance = this;
            director.addPersistRootNode(this.node);
        } else {
            this.node.destroy();
            return;
        }
    }

    start() {
        this.initAudioSources();
    }

    private initAudioSources() {
        // 创建背景音乐音频源
        const bgmNode = new Node("BGM");
        this.node.addChild(bgmNode);
        this.bgmAudioSource = bgmNode.addComponent(AudioSource);
        this.bgmAudioSource.loop = true;
        this.bgmAudioSource.volume = this.bgmVolume;

        // 创建音效音频源
        const sfxNode = new Node("SFX");
        this.node.addChild(sfxNode);
        this.sfxAudioSource = sfxNode.addComponent(AudioSource);
        this.sfxAudioSource.loop = false;
        this.sfxAudioSource.volume = this.sfxVolume;
    }

    // 播放背景音乐
    public playBGM(clip: AudioClip) {
        if (!clip || this.isBgmMuted) return;
        
        this.bgmAudioSource.stop();
        this.bgmAudioSource.clip = clip;
        this.bgmAudioSource.play();
    }

    public playMenuBGM() {
        this.playBGM(this.bgmMenu);
    }

    public playGameBGM() {
        this.playBGM(this.bgmGame);
    }

    public stopBGM() {
        this.bgmAudioSource.stop();
    }

    // 播放音效
    public playSFX(clip: AudioClip) {
        if (!clip || this.isSfxMuted) return;
        
        this.sfxAudioSource.playOneShot(clip, this.sfxVolume);
    }

    public playShootSFX() {
        this.playSFX(this.sfxShoot);
    }

    public playEnemyHitSFX() {
        this.playSFX(this.sfxEnemyHit);
    }

    public playPlayerHitSFX() {
        this.playSFX(this.sfxPlayerHit);
    }

    public playEnemyDieSFX() {
        this.playSFX(this.sfxEnemyDie);
    }

    public playGameOverSFX() {
        this.playSFX(this.sfxGameOver);
    }

    public playButtonClickSFX() {
        this.playSFX(this.sfxButtonClick);
    }

    // 音量控制
    public setBGMVolume(volume: number) {
        this.bgmVolume = Math.max(0, Math.min(1, volume));
        this.bgmAudioSource.volume = this.bgmVolume;
    }

    public setSFXVolume(volume: number) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        this.sfxAudioSource.volume = this.sfxVolume;
    }

    public getBGMVolume(): number {
        return this.bgmVolume;
    }

    public getSFXVolume(): number {
        return this.sfxVolume;
    }

    // 静音控制
    public muteBGM() {
        this.isBgmMuted = true;
        this.bgmAudioSource.volume = 0;
    }

    public unmuteBGM() {
        this.isBgmMuted = false;
        this.bgmAudioSource.volume = this.bgmVolume;
    }

    public muteSFX() {
        this.isSfxMuted = true;
    }

    public unmuteSFX() {
        this.isSfxMuted = false;
    }

    public toggleBGM() {
        if (this.isBgmMuted) {
            this.unmuteBGM();
        } else {
            this.muteBGM();
        }
    }

    public toggleSFX() {
        if (this.isSfxMuted) {
            this.unmuteSFX();
        } else {
            this.muteSFX();
        }
    }

    public isBGMMuted(): boolean {
        return this.isBgmMuted;
    }

    public isSFXMuted(): boolean {
        return this.isSfxMuted;
    }
} 