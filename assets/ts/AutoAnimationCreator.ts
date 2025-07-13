import { _decorator, Component, SpriteAtlas, SpriteFrame, AnimationClip, AnimationState, Animation, Node, resources, Sprite } from 'cc';
const { ccclass, property } = _decorator;

interface AnimationConfig {
    name: string;
    prefix: string;
    frameCount: number;
    frameRate: number;
    loop: boolean;
}

@ccclass('AutoAnimationCreator')
export class AutoAnimationCreator extends Component {
    
    /**
     * 从SpriteAtlas自动创建动画剪辑
     * @param atlas 图集资源
     * @param animationConfigs 动画配置数组
     * @param targetNode 目标节点
     * @returns 创建的AnimationClip数组
     */
    public static createAnimationsFromAtlas(
        atlas: SpriteAtlas, 
        animationConfigs: AnimationConfig[], 
        targetNode: Node
    ): AnimationClip[] {
        const clips: AnimationClip[] = [];
        
        // 确保目标节点有Animation组件
        let animationComponent = targetNode.getComponent(Animation);
        if (!animationComponent) {
            animationComponent = targetNode.addComponent(Animation);
        }

        // 获取Sprite组件，用于设置默认精灵帧
        const spriteComponent = targetNode.getComponent(Sprite);
        let defaultFrameSet = false;

        for (const config of animationConfigs) {
            const clip = this.createAnimationClip(atlas, config);
            if (clip) {
                clips.push(clip);
                // 添加到Animation组件
                animationComponent.addClip(clip);
                console.log(`✅ 创建动画: ${config.name}`);
                
                // 如果还没有设置默认精灵帧，并且这是第一个动画，设置第一帧作为默认显示
                if (!defaultFrameSet && spriteComponent && config.name === 'Idle_front') {
                    const frames = this.extractFramesFromAtlas(atlas, config.prefix, config.frameCount);
                    if (frames.length > 0) {
                        spriteComponent.spriteFrame = frames[0];
                        defaultFrameSet = true;
                        console.log(`🖼️ 设置默认精灵帧: ${config.name} 第一帧`);
                    }
                }
            }
        }

        return clips;
    }

    /**
     * 创建单个动画剪辑
     */
    private static createAnimationClip(atlas: SpriteAtlas, config: AnimationConfig): AnimationClip | null {
        const frames = this.extractFramesFromAtlas(atlas, config.prefix, config.frameCount);
        
        if (frames.length === 0) {
            console.warn(`⚠️ 无法找到动画帧: ${config.prefix}`);
            return null;
        }

        // 使用便捷API创建动画剪辑
        const clip = AnimationClip.createWithSpriteFrames(frames, config.frameRate);
        clip.name = config.name;
        clip.wrapMode = config.loop ? AnimationClip.WrapMode.Loop : AnimationClip.WrapMode.Normal;

        return clip;
    }

    /**
     * 从图集中提取指定前缀的帧并排序
     */
    private static extractFramesFromAtlas(atlas: SpriteAtlas, prefix: string, expectedCount: number): SpriteFrame[] {
        const frames: SpriteFrame[] = [];
        
        // 获取所有匹配的帧
        for (let i = 0; i < expectedCount; i++) {
            const frameIndex = i < 10 ? `0${i}` : i.toString();
            const frameName = `${prefix}${frameIndex}`;
            const frame = atlas.getSpriteFrame(frameName);
            
            if (frame) {
                frames.push(frame);
            } else {
                console.warn(`⚠️ 缺少动画帧: ${frameName}`);
            }
        }

        return frames;
    }

    /**
     * 自动检测并创建敌人动画
     */
    public static createEnemyAnimations(atlas: SpriteAtlas, enemyPrefix: string, targetNode: Node): AnimationClip[] {
        const animationConfigs: AnimationConfig[] = [
            // Idle动画
            { name: 'Idle_front', prefix: `${enemyPrefix}_Idle_front`, frameCount: 4, frameRate: 8, loop: true },
            { name: 'Idle_back', prefix: `${enemyPrefix}_Idle_back`, frameCount: 4, frameRate: 8, loop: true },
            { name: 'Idle_left', prefix: `${enemyPrefix}_Idle_left`, frameCount: 4, frameRate: 8, loop: true },
            { name: 'Idle_right', prefix: `${enemyPrefix}_Idle_right`, frameCount: 4, frameRate: 8, loop: true },
            
            // Walk动画
            { name: 'Walk_front', prefix: `${enemyPrefix}_Walk_front`, frameCount: 6, frameRate: 12, loop: true },
            { name: 'Walk_back', prefix: `${enemyPrefix}_Walk_back`, frameCount: 6, frameRate: 12, loop: true },
            { name: 'Walk_left', prefix: `${enemyPrefix}_Walk_left`, frameCount: 6, frameRate: 12, loop: true },
            { name: 'Walk_right', prefix: `${enemyPrefix}_Walk_right`, frameCount: 6, frameRate: 12, loop: true },
            
            // Attack动画
            { name: 'Attack_front', prefix: `${enemyPrefix}_Attack_front`, frameCount: 7, frameRate: 14, loop: false },
            { name: 'Attack_back', prefix: `${enemyPrefix}_Attack_back`, frameCount: 7, frameRate: 14, loop: false },
            { name: 'Attack_left', prefix: `${enemyPrefix}_Attack_left`, frameCount: 7, frameRate: 14, loop: false },
            { name: 'Attack_right', prefix: `${enemyPrefix}_Attack_right`, frameCount: 7, frameRate: 14, loop: false },
            
            // Hurt动画
            { name: 'Hurt_front', prefix: `${enemyPrefix}_Hurt_front`, frameCount: 4, frameRate: 16, loop: false },
            { name: 'Hurt_back', prefix: `${enemyPrefix}_Hurt_back`, frameCount: 4, frameRate: 16, loop: false },
            { name: 'Hurt_left', prefix: `${enemyPrefix}_Hurt_left`, frameCount: 4, frameRate: 16, loop: false },
            { name: 'Hurt_right', prefix: `${enemyPrefix}_Hurt_right`, frameCount: 4, frameRate: 16, loop: false },
            
            // Death动画
            { name: 'Death_front', prefix: `${enemyPrefix}_Death_front`, frameCount: 6, frameRate: 10, loop: false },
            { name: 'Death_back', prefix: `${enemyPrefix}_Death_back`, frameCount: 6, frameRate: 10, loop: false },
            { name: 'Death_left', prefix: `${enemyPrefix}_Death_left`, frameCount: 6, frameRate: 10, loop: false },
            { name: 'Death_right', prefix: `${enemyPrefix}_Death_right`, frameCount: 6, frameRate: 10, loop: false },
        ];

        return this.createAnimationsFromAtlas(atlas, animationConfigs, targetNode);
    }

    /**
     * 异步加载图集并创建动画
     */
    public static async loadAtlasAndCreateAnimations(
        atlasPath: string, 
        enemyPrefix: string, 
        targetNode: Node
    ): Promise<AnimationClip[]> {
        return new Promise((resolve, reject) => {
            resources.load(atlasPath, SpriteAtlas, (err, atlas) => {
                if (err) {
                    console.error(`❌ 加载图集失败: ${atlasPath}`, err);
                    reject(err);
                    return;
                }

                const clips = this.createEnemyAnimations(atlas, enemyPrefix, targetNode);
                resolve(clips);
            });
        });
    }

    /**
     * 播放指定动画
     */
    public static playAnimation(targetNode: Node, animationName: string): boolean {
        const animationComponent = targetNode.getComponent(Animation);
        if (!animationComponent) {
            console.warn(`⚠️ 节点没有Animation组件: ${targetNode.name}`);
            return false;
        }

        const clip = animationComponent.clips.find(c => c && c.name === animationName);
        if (!clip) {
            console.warn(`⚠️ 动画剪辑不存在: ${animationName}`);
            return false;
        }

        animationComponent.play(animationName);
        console.log(`▶️ 播放动画: ${animationName}`);
        return true;
    }

    /**
     * 获取所有可用的动画名称
     */
    public static getAvailableAnimations(targetNode: Node): string[] {
        const animationComponent = targetNode.getComponent(Animation);
        if (!animationComponent) {
            return [];
        }

        return animationComponent.clips.map(clip => clip?.name || '').filter(name => name !== '');
    }

    /**
     * 检查动画是否存在
     */
    public static hasAnimation(targetNode: Node, animationName: string): boolean {
        const animationComponent = targetNode.getComponent(Animation);
        if (!animationComponent) {
            return false;
        }

        return animationComponent.clips.some(clip => clip && clip.name === animationName);
    }
} 