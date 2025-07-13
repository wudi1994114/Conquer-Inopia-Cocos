import { _decorator, Collider2D, Contact2DType, IPhysics2DContact, RigidBody2D, Vec3, Vec2, Node, Sprite, Color, tween, SpriteFrame, resources, SpriteAtlas, UITransform } from 'cc';
import { EnemyController } from '../EnemyController';
import { BaseAttack, AimingMode, MovementMode } from './BaseAttack';
import { AttackSystem } from './AttackSystem';

const { ccclass, property } = _decorator;

@ccclass('ThunderChain')
export class ThunderChain extends BaseAttack {
    
    @property({tooltip: '闪电链最大连接数'})
    public maxChainCount: number = 5;
    
    @property({tooltip: '闪电链最大距离'})
    public maxChainDistance: number = 200;
    
    @property({tooltip: '闪电持续时间'})
    public lightningDuration: number = 0.8;
    
    @property({tooltip: '闪电动画帧率'})
    public animationFrameRate: number = 12;
    
    @property({tooltip: '每段闪电的伤害衰减'})
    public damageDecay: number = 0.8;

    private _thunderFrames: SpriteFrame[] = []; // 存储闪电动画帧
    private _chainedEnemies: Set<string> = new Set(); // 已连接的敌人UUID
    private _lightningNodes: Node[] = []; // 当前使用的闪电节点数组
    
    // 🔧 闪电节点对象池
    private _lightningNodePool: Node[] = []; // 闪电节点池
    private _poolSize: number = 20; // 池大小
    private _poolInitialized: boolean = false; // 池是否已初始化

    protected getAttackName(): string {
        return "闪电链";
    }

    protected getAttackType() {
        return AttackSystem.AttackType.THUNDER_CHAIN;
    }

    protected onAttackLoad(): void {
        // 🔧 重要：闪电链不应该移动，禁用刚体
        const rigidbody = this.node.getComponent(RigidBody2D);
        if (rigidbody) {
            rigidbody.enabled = false; // 完全禁用刚体
            console.log("🛑 闪电链刚体已禁用");
        }
        
        // 设置瞄准配置 - 仅用于查找目标，不用于移动
        this.setAimingConfig({
            mode: AimingMode.NEAREST_ENEMY,
            movementMode: MovementMode.STATIC,
            speed: 0,
            useWorldCoordinates: true
        });
        
        // 只在第一次加载时初始化
        if (this._thunderFrames.length === 0) {
            this.initializeThunderAnimation();
        }
        
        // 只在第一次加载时初始化对象池
        if (!this._poolInitialized) {
            this.initializeLightningNodePool();
        }
        
        console.log("⚡ 闪电链参数:");
        console.log("  - 最大连接数:", this.maxChainCount);
        console.log("  - 最大距离:", this.maxChainDistance);
        console.log("  - 持续时间:", this.lightningDuration);
        console.log("  - 闪电链是固定位置的连接效果，不会移动");
    }

    /**
     * 初始化闪电节点对象池
     */
    private initializeLightningNodePool() {
        if (this._poolInitialized) return;
        
        console.log(`🔧 初始化闪电节点对象池，大小: ${this._poolSize}`);
        
        // 🔧 确保有正确的父节点 - 优先使用Canvas
        let parentNode = this.node.parent;
        
        // 如果没有父节点，或者父节点不是Canvas，尝试查找Canvas
        if (!parentNode || parentNode.name !== 'Canvas') {
            const scene = this.node.scene;
            if (scene) {
                const canvas = scene.getChildByName('Canvas');
                if (canvas) {
                    parentNode = canvas;
                    console.log("🔧 使用Canvas作为闪电节点的父节点");
                } else {
                    parentNode = scene;
                    console.warn("⚠️ 未找到Canvas，使用场景根节点");
                }
            } else {
                console.error("❌ 无法找到场景，无法初始化对象池");
                return;
            }
        }
        
        // 创建池节点
        for (let i = 0; i < this._poolSize; i++) {
            const poolNode = new Node(`Lightning_Pool_${i}`);
            poolNode.setParent(parentNode);
            
            // 添加组件
            const uiTransform = poolNode.addComponent(UITransform);
            const sprite = poolNode.addComponent(Sprite);
            
            // 设置基础配置
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            uiTransform.setAnchorPoint(0.5, 0.5); // 🔧 统一使用中心锚点
            
            // 初始状态：隐藏
            poolNode.active = false;
            
            // 添加到池中
            this._lightningNodePool.push(poolNode);
        }
        
        this._poolInitialized = true;
        console.log(`✅ 闪电节点对象池初始化完成，父节点: ${parentNode.name}`);
    }

    /**
     * 从对象池获取闪电节点
     */
    private getLightningNodeFromPool(): Node | null {
        if (!this._poolInitialized) {
            this.initializeLightningNodePool();
        }
        
        // 寻找空闲节点
        for (const node of this._lightningNodePool) {
            if (!node.active) {
                return node;
            }
        }
        
        console.warn("⚠️ 闪电节点对象池已满，无法获取更多节点");
        return null;
    }

    /**
     * 回收闪电节点到对象池
     */
    private recycleLightningNode(node: Node) {
        if (!node || !node.isValid) return;
        
        // 重置节点状态
        node.active = false;
        node.angle = 0;
        node.setPosition(0, 0, 0);
        
        // 重置组件状态
        const sprite = node.getComponent(Sprite);
        if (sprite) {
            sprite.color = new Color(255, 255, 255, 255);
        }
        
        const uiTransform = node.getComponent(UITransform);
        if (uiTransform) {
            uiTransform.setContentSize(64, 64);
        }
        
        // 停止所有动画
        tween(node).stop();
    }

    /**
     * 初始化闪电动画系统
     */
    private initializeThunderAnimation() {
        console.log("🔧 开始初始化闪电动画系统...");
        console.log("🔧 资源路径: skill/thunder");
        
        // 🚀 优先使用预加载的资源
        const atlas = resources.get("skill/thunder", SpriteAtlas);
        
        if (atlas) {
            console.log("✅ 使用预加载的闪电图集");
            this.loadThunderFramesFromAtlas(atlas);
        } else {
            console.log("🔄 预加载资源不可用，异步加载闪电图集...");
            // 回退到异步加载
            resources.load("skill/thunder", SpriteAtlas, (err, atlas) => {
                if (err) {
                    console.error("❌ 加载闪电图集失败:");
                    console.error("  - 错误信息:", err);
                    console.error("  - 资源路径: skill/thunder");
                    console.error("  - 请检查资源文件是否存在");
                    return;
                }
                
                console.log("✅ 异步加载闪电图集成功");
                console.log("📊 图集信息:", atlas.name, atlas._uuid);
                this.loadThunderFramesFromAtlas(atlas);
            });
        }
    }

    /**
     * 从图集中加载闪电帧
     */
    private loadThunderFramesFromAtlas(atlas: SpriteAtlas) {
        // 从图集中获取所有帧
        this._thunderFrames = [];
        
        // 加载闪电帧：thunder-link00 到 thunder-link07
        for (let i = 0; i < 8; i++) {
            const frameNumber = i < 10 ? `0${i}` : `${i}`;
            const frameName = `thunder-link${frameNumber}`;
            const frame = atlas.getSpriteFrame(frameName);
            if (frame) {
                this._thunderFrames.push(frame);
                console.log(`✅ 加载闪电帧: ${frameName}`);
            } else {
                console.warn(`⚠️ 未找到闪电帧: ${frameName}`);
            }
        }
        
        if (this._thunderFrames.length >= 8) {
            console.log(`✅ 成功加载闪电动画帧，总数: ${this._thunderFrames.length}`);
        } else {
            console.error(`❌ 闪电帧数量不正确，期望8个，实际${this._thunderFrames.length}个`);
        }
    }

    protected onAttackStart(): void {
        console.log("⚡ 闪电链开始释放");
        
        // 🔧 强制检查闪电帧是否加载完成
        if (this._thunderFrames.length === 0) {
            console.warn("⚠️ 闪电帧未加载，强制重新初始化...");
            this.initializeThunderAnimation();
            
            // 如果还是没有，延迟100ms重试
            if (this._thunderFrames.length === 0) {
                console.log("🔧 延迟100ms后重试闪电链释放...");
                this.scheduleOnce(() => {
                    this.onAttackStart();
                }, 0.1);
                return;
            }
        }
        
        // 获取玩家位置（ThunderChain节点在玩家位置创建）
        const playerPos = this.node.worldPosition;
        console.log(`⚡ 玩家位置: (${playerPos.x.toFixed(1)}, ${playerPos.y.toFixed(1)})`);
        
        // 手动查找第一个目标
        const allEnemies = this.getAllEnemies();
        console.log(`⚡ 找到敌人数量: ${allEnemies.length}`);
        
        if (allEnemies.length > 0) {
            // 找到最近的敌人
            let nearestEnemyNode: Node | null = null;
            let minDistance = Infinity;
            
            for (const enemyNode of allEnemies) {
                const distance = Vec3.distance(playerPos, enemyNode.worldPosition);
                console.log(`⚡ 检查敌人: ${enemyNode.name}, 距离: ${distance.toFixed(1)}`);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestEnemyNode = enemyNode;
                }
            }
            
            // 如果找到最近的敌人，则开始闪电链
            if (nearestEnemyNode) {
                console.log(`⚡ 开始闪电链攻击，目标: ${nearestEnemyNode.name}, 距离: ${minDistance.toFixed(1)}`);
                this.startLightningChain(playerPos, nearestEnemyNode);
                
                // 启动自动销毁定时器
                this.scheduleOnce(() => {
                    this.destroyAttack();
                }, this.lightningDuration);
            } else {
                console.log("⚠️ 闪电链未找到有效目标，直接消失");
                this.destroyAttack();
            }
        } else {
            console.log("⚠️ 闪电链未找到任何敌人，直接消失");
            this.destroyAttack();
        }
    }

    /**
     * 开始闪电链攻击
     * @param startPos 起始位置
     * @param firstTarget 第一个目标
     */
    private startLightningChain(startPos: Vec3, firstTarget: Node) {
        console.log(`⚡ startLightningChain 被调用，起始位置: (${startPos.x.toFixed(1)}, ${startPos.y.toFixed(1)}), 目标: ${firstTarget.name}`);
        
        this._chainedEnemies.clear();
        this._lightningNodes = [];
        
        let currentPos = startPos.clone();
        let currentTarget = firstTarget;
        let chainCount = 0;
        let currentDamage = this.damage;
        
        console.log(`⚡ 开始闪电链，起始位置: (${startPos.x.toFixed(1)}, ${startPos.y.toFixed(1)})`);
        
        // 递归创建闪电链
        this.createLightningSegment(currentPos, currentTarget, chainCount, currentDamage);
    }

    /**
     * 创建闪电链段
     * @param fromPos 起始位置
     * @param targetEnemyNode 目标敌人
     * @param chainIndex 链索引
     * @param damage 当前伤害
     */
    private createLightningSegment(fromPos: Vec3, targetEnemyNode: Node, chainIndex: number, damage: number) {
        if (chainIndex >= this.maxChainCount) {
            console.log("⚡ 闪电链达到最大连接数");
            return;
        }
        
        // 标记敌人为已连接
        this._chainedEnemies.add(targetEnemyNode.uuid);
        
        // 对当前目标造成伤害
        const enemyScript = targetEnemyNode.getComponent(EnemyController);
        if (enemyScript) {
            this.dealDamageToEnemy(enemyScript, this.getAttackType());
        }
        
        // 创建闪电视觉效果
        this.createLightningVisual(fromPos, targetEnemyNode.worldPosition, chainIndex);
        
        // 查找下一个目标
        const nextTarget = this.findNextChainTarget(targetEnemyNode.worldPosition);
        if (nextTarget) {
            // 计算伤害衰减
            const nextDamage = damage * this.damageDecay;
            // 递归创建下一段闪电
            this.createLightningSegment(targetEnemyNode.worldPosition, nextTarget, chainIndex + 1, nextDamage);
        } else {
            console.log(`⚡ 闪电链在第${chainIndex + 1}段结束，无更多目标`);
        }
    }

    /**
     * 重写 onDamageDealt 来触发弹射
     */
    protected onDamageDealt(enemy: EnemyController): void {
        // 无需在此方法中执行操作，因为弹射逻辑已在 createLightningSegment 中处理
    }

    /**
     * 创建闪电视觉效果
     * @param fromPos 起始位置
     * @param toPos 结束位置
     * @param chainIndex 链索引
     */
    private createLightningVisual(fromPos: Vec3, toPos: Vec3, chainIndex: number) {
        if (this._thunderFrames.length === 0) {
            console.warn("⚠️ 没有闪电帧，尝试重新加载...");
            // 尝试同步加载闪电帧
            this.initializeThunderAnimation();
            
            // 如果还是没有，跳过视觉效果
            if (this._thunderFrames.length === 0) {
                console.error("❌ 闪电帧加载失败，跳过视觉效果");
                return;
            }
        }
        
        console.log(`\n🔥 开始创建闪电第${chainIndex + 1}段:`);
        console.log(`  📍 起点: (${fromPos.x.toFixed(1)}, ${fromPos.y.toFixed(1)})`);
        console.log(`  📍 终点: (${toPos.x.toFixed(1)}, ${toPos.y.toFixed(1)})`);
        
        // 🔧 使用对象池获取闪电节点
        const lightningNode = this.getLightningNodeFromPool();
        if (!lightningNode) {
            console.error("❌ 无法从对象池获取闪电节点");
            return;
        }
        
        this._lightningNodes.push(lightningNode);
        
        // 获取已有的组件
        const uiTransform = lightningNode.getComponent(UITransform);
        const sprite = lightningNode.getComponent(Sprite);
        
        if (!uiTransform || !sprite) {
            console.error("❌ 闪电节点缺少必要组件");
            this.recycleLightningNode(lightningNode);
            return;
        }
        
        // 设置闪电帧
        const randomFrameIndex = Math.floor(Math.random() * this._thunderFrames.length);
        sprite.spriteFrame = this._thunderFrames[randomFrameIndex];
        
        // 🔧 设置固定的闪电颜色 - 不再变化
        sprite.color = new Color(255, 255, 255, 255); // 固定亮白色
        
        // 设置渲染层级，确保闪电在前景显示
        lightningNode.setSiblingIndex(1000);
        
        // 计算方向向量和距离
        const directionX = toPos.x - fromPos.x;
        const directionY = toPos.y - fromPos.y;
        const distance = Math.sqrt(directionX * directionX + directionY * directionY);
        
        // 计算角度 (弧度转角度)
        // atan2返回-π到π的弧度值，转换为-180到180的角度值
        const angleRad = Math.atan2(directionY, directionX);
        const angleDeg = angleRad * 180 / Math.PI;
        
        console.log(`  📐 方向向量: (${directionX.toFixed(1)}, ${directionY.toFixed(1)})`);
        console.log(`  📏 距离: ${distance.toFixed(1)}`);
        console.log(`  🎯 角度: ${angleDeg.toFixed(1)}° (弧度: ${angleRad.toFixed(3)})`);
        
        // 🔧 关键修复：使用中心锚点，然后调整位置计算
        uiTransform.setAnchorPoint(0.5, 0.5);
        
        // 计算中心点位置（起始点和终点的中点）
        const centerX = (fromPos.x + toPos.x) / 2;
        const centerY = (fromPos.y + toPos.y) / 2;
        
        // 设置世界位置为中心点
        lightningNode.setWorldPosition(centerX, centerY, fromPos.z);
        
        // 设置旋转角度 - 确保闪电指向目标
        lightningNode.angle = angleDeg;
        
        // 确保节点可见
        lightningNode.active = true;
        
        // 获取原始帧尺寸
        const frameSize = sprite.spriteFrame!.originalSize;
        console.log(`  🖼️ 原始帧尺寸: ${frameSize.width}x${frameSize.height}`);
        
        // 设置目标尺寸 - 宽度为距离，高度适当放大以增强视觉效果
        const targetWidth = Math.max(distance, 20); // 最小宽度为20，避免过小
        const targetHeight = Math.max(frameSize.height * 1.5, 32); // 高度放大1.5倍，最小32
        
        console.log(`  🎯 目标尺寸: ${targetWidth.toFixed(1)}x${targetHeight}`);
        console.log(`  📍 中心点位置: (${centerX.toFixed(1)}, ${centerY.toFixed(1)})`);
        
        // 应用尺寸
        uiTransform.setContentSize(targetWidth, targetHeight);
        
        // 验证设置
        const actualSize = uiTransform.contentSize;
        const actualPos = lightningNode.worldPosition;
        console.log(`  ✅ 最终配置:`);
        console.log(`    - 中心位置: (${actualPos.x.toFixed(1)}, ${actualPos.y.toFixed(1)})`);
        console.log(`    - 角度: ${lightningNode.angle.toFixed(1)}°`);
        console.log(`    - 尺寸: ${actualSize.width.toFixed(1)}x${actualSize.height.toFixed(1)}`);
        console.log(`    - 锚点: (${uiTransform.anchorPoint.x}, ${uiTransform.anchorPoint.y}) - 中心锚点`);
        console.log(`    - 颜色: 固定白色`);
        console.log(`    - 激活状态: ${lightningNode.active}`);
        console.log(`    - 父节点: ${lightningNode.parent?.name || 'None'}`);
        console.log(`    - 精灵帧: ${sprite.spriteFrame?.name || 'None'}`);
        
        // 播放闪电动画
        this.playLightningAnimation(sprite, chainIndex);
    }

    /**
     * 播放闪电动画
     * @param sprite 精灵组件
     * @param chainIndex 链索引
     */
    private playLightningAnimation(sprite: Sprite, chainIndex: number) {
        let currentFrame = 0;
        const frameInterval = 1 / this.animationFrameRate;
        const totalAnimationCycles = 3; // 播放3个动画周期
        const totalFrames = this._thunderFrames.length * totalAnimationCycles;
        
        const playNextFrame = () => {
            if (!sprite || !sprite.isValid || currentFrame >= totalFrames) {
                return;
            }
            
            // 随机选择帧（增加闪烁效果）
            const randomFrameIndex = Math.floor(Math.random() * this._thunderFrames.length);
            sprite.spriteFrame = this._thunderFrames[randomFrameIndex];
            
            currentFrame++;
            
            // 继续播放动画
            if (currentFrame < totalFrames) {
                tween(sprite.node)
                    .delay(frameInterval)
                    .call(playNextFrame)
                    .start();
            }
        };
        
        // 开始播放动画
        playNextFrame();
        
        // 闪电淡出动画 - 延迟启动，确保动画播放完成
        tween(sprite)
            .delay(this.lightningDuration * 0.6)
            .to(this.lightningDuration * 0.4, { color: new Color(sprite.color.r, sprite.color.g, sprite.color.b, 0) })
            .call(() => {
                if (sprite.node && sprite.node.isValid) {
                    // 🔧 使用回收而不是销毁
                    this.recycleLightningNode(sprite.node);
                }
            })
            .start();
    }

    /**
     * 查找下一个闪电链目标
     * @param currentPos 当前位置
     * @returns 下一个目标敌人节点
     */
    private findNextChainTarget(currentPos: Vec3): Node | null {
        const allEnemies = this.getAllEnemies();
        let closestEnemy: Node | null = null;
        let minDistance = this.maxChainDistance;

        for (const enemyNode of allEnemies) {
            if (this._chainedEnemies.has(enemyNode.uuid)) {
                continue; // 跳过已连接的敌人
            }

            const distance = Vec3.distance(currentPos, enemyNode.worldPosition);
            if (distance < minDistance) {
                minDistance = distance;
                closestEnemy = enemyNode;
            }
        }
        return closestEnemy;
    }

    protected onAttackUpdate(deltaTime: number): void {
        // 闪电链不需要更新逻辑，完全依赖动画和定时器
    }

    /**
     * 清理对象池
     */
    private cleanupLightningNodePool() {
        console.log("🔧 正在清理闪电节点对象池...");
        for (const poolNode of this._lightningNodePool) {
            if (poolNode && poolNode.isValid) {
                poolNode.destroy();
            }
        }
        this._lightningNodePool = [];
        this._poolInitialized = false;
        console.log("✅ 闪电节点对象池已清理");
    }

    protected onAttackComponentDestroy(): void {
        // 🔧 回收所有闪电节点到对象池
        for (const lightningNode of this._lightningNodes) {
            if (lightningNode && lightningNode.isValid) {
                this.recycleLightningNode(lightningNode);
            }
        }
        this._lightningNodes = [];
        this._chainedEnemies.clear();
        
        // 清理对象池
        this.cleanupLightningNodePool();
        
        console.log("⚡ 闪电链清理完成");
    }
} 