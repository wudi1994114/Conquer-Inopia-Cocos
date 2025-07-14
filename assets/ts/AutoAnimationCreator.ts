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
                        // 设置默认精灵帧，让引擎的SizeMode机制自动处理尺寸
                        this.setSpriteFrame(spriteComponent, frames[0]);
                        defaultFrameSet = true;
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
     * 简化的精灵帧设置方法
     * 直接设置精灵帧，让引擎的SizeMode机制自动处理尺寸调整
     * @param spriteComponent 精灵组件
     * @param spriteFrame 要设置的精灵帧
     */
    private static setSpriteFrame(spriteComponent: Sprite, spriteFrame: SpriteFrame) {
        if (spriteComponent && spriteFrame) {
            spriteComponent.spriteFrame = spriteFrame;
            // 引擎会根据Sprite组件的SizeMode自动调整UITransform尺寸
            // 不需要手动干预
        }
    }

    /**
     * 自动检测并创建敌人动画
     */
    /**
     * 自动检测并创建敌人动画
     * @param atlas 图集资源
     * @param enemyPrefix 敌人动画前缀
     * @param targetNode 目标节点
     * @param attackInterval 攻击间隔（可选），用于计算攻击动画时长
     */
    public static createEnemyAnimations(atlas: SpriteAtlas, enemyPrefix: string, targetNode: Node, attackInterval?: number): AnimationClip[] {
        // 计算攻击动画帧率：让攻击动画播放时长 = attackInterval * 0.8（留20%缓冲时间）
        const attackFrameCount = 7; // 攻击动画固定7帧
        const attackDuration = attackInterval ? attackInterval * 0.8 : 0.5; // 默认0.5秒
        const attackFrameRate = attackFrameCount / attackDuration;
        
        const animationConfigs: AnimationConfig[] = [
            // Idle动画 - 标准帧率
            { name: 'Idle_front', prefix: `${enemyPrefix}_Idle_front`, frameCount: 4, frameRate: 8, loop: true },
            { name: 'Idle_back', prefix: `${enemyPrefix}_Idle_back`, frameCount: 4, frameRate: 8, loop: true },
            { name: 'Idle_left', prefix: `${enemyPrefix}_Idle_left`, frameCount: 4, frameRate: 8, loop: true },
            { name: 'Idle_right', prefix: `${enemyPrefix}_Idle_right`, frameCount: 4, frameRate: 8, loop: true },
            
            // Walk动画 - 标准帧率
            { name: 'Walk_front', prefix: `${enemyPrefix}_Walk_front`, frameCount: 6, frameRate: 12, loop: true },
            { name: 'Walk_back', prefix: `${enemyPrefix}_Walk_back`, frameCount: 6, frameRate: 12, loop: true },
            { name: 'Walk_left', prefix: `${enemyPrefix}_Walk_left`, frameCount: 6, frameRate: 12, loop: true },
            { name: 'Walk_right', prefix: `${enemyPrefix}_Walk_right`, frameCount: 6, frameRate: 12, loop: true },
            
            // Attack动画 - 根据攻击间隔调整帧率
            { name: 'Attack_front', prefix: `${enemyPrefix}_Attack_front`, frameCount: attackFrameCount, frameRate: attackFrameRate, loop: false },
            { name: 'Attack_back', prefix: `${enemyPrefix}_Attack_back`, frameCount: attackFrameCount, frameRate: attackFrameRate, loop: false },
            { name: 'Attack_left', prefix: `${enemyPrefix}_Attack_left`, frameCount: attackFrameCount, frameRate: attackFrameRate, loop: false },
            { name: 'Attack_right', prefix: `${enemyPrefix}_Attack_right`, frameCount: attackFrameCount, frameRate: attackFrameRate, loop: false },
            
            // Hurt动画 - 快速播放
            { name: 'Hurt_front', prefix: `${enemyPrefix}_Hurt_front`, frameCount: 4, frameRate: 16, loop: false },
            { name: 'Hurt_back', prefix: `${enemyPrefix}_Hurt_back`, frameCount: 4, frameRate: 16, loop: false },
            { name: 'Hurt_left', prefix: `${enemyPrefix}_Hurt_left`, frameCount: 4, frameRate: 16, loop: false },
            { name: 'Hurt_right', prefix: `${enemyPrefix}_Hurt_right`, frameCount: 4, frameRate: 16, loop: false },
            
            // Death动画 - 标准帧率
            { name: 'Death_front', prefix: `${enemyPrefix}_Death_front`, frameCount: 6, frameRate: 10, loop: false },
            { name: 'Death_back', prefix: `${enemyPrefix}_Death_back`, frameCount: 6, frameRate: 10, loop: false },
            { name: 'Death_left', prefix: `${enemyPrefix}_Death_left`, frameCount: 6, frameRate: 10, loop: false },
            { name: 'Death_right', prefix: `${enemyPrefix}_Death_right`, frameCount: 6, frameRate: 10, loop: false },
        ];

        // 🔥 如果是巫妖，添加火球技能动画
        if (enemyPrefix === 'Lich2') {
            const fireballConfigs: AnimationConfig[] = [
                { name: 'Fire_front', prefix: 'Fire_front', frameCount: 9, frameRate: 15, loop: false },
                { name: 'Fire_back', prefix: 'Fire_back', frameCount: 9, frameRate: 15, loop: false },
                { name: 'Fire_left', prefix: 'Fire_left', frameCount: 9, frameRate: 15, loop: false },
                { name: 'Fire_right', prefix: 'Fire_right', frameCount: 9, frameRate: 15, loop: false },
            ];
            animationConfigs.push(...fireballConfigs);
            console.log('🔥 为巫妖添加火球技能动画 (9帧，15fps)');
        }

        console.log(`🎬 创建敌人动画 ${enemyPrefix}:`);
        console.log(`  - 攻击间隔: ${attackInterval || 'N/A'} 秒`);
        console.log(`  - 攻击动画时长: ${attackDuration.toFixed(2)} 秒`);
        console.log(`  - 攻击动画帧率: ${attackFrameRate.toFixed(1)} fps`);

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