import { _decorator, Collider2D, Contact2DType, IPhysics2DContact, RigidBody2D, Vec3, Vec2, Node, Sprite, Color, tween, SpriteFrame, resources, SpriteAtlas, UITransform } from 'cc';
import { Enemy } from '../Enemy';
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
    private _lightningNodes: Node[] = []; // 闪电节点数组

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
        
        // 初始化闪电动画
        this.initializeThunderAnimation();
        
        console.log("⚡ 闪电链参数:");
        console.log("  - 最大连接数:", this.maxChainCount);
        console.log("  - 最大距离:", this.maxChainDistance);
        console.log("  - 持续时间:", this.lightningDuration);
        console.log("  - 闪电链是固定位置的连接效果，不会移动");
    }

    /**
     * 初始化闪电动画系统
     */
    private initializeThunderAnimation() {
        // 加载闪电动画图集
        resources.load("skill/thunder", SpriteAtlas, (err, atlas) => {
            if (err) {
                console.error("❌ 加载闪电图集失败:", err);
                return;
            }
            
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
                console.log("✅ 成功加载闪电动画帧");
            } else {
                console.error(`❌ 闪电帧数量不正确，期望8个，实际${this._thunderFrames.length}个`);
            }
        });
    }

    protected onAttackStart(): void {
        console.log("⚡ 闪电链开始释放");
        
        // 获取玩家位置（ThunderChain节点在玩家位置创建）
        const playerPos = this.node.worldPosition;
        console.log(`⚡ 玩家位置: (${playerPos.x.toFixed(1)}, ${playerPos.y.toFixed(1)})`);
        
        // 手动查找第一个目标
        const allEnemies = this.getAllEnemies();
        if (allEnemies.length > 0) {
            // 找到最近的敌人
            let nearestEnemy = null;
            let minDistance = Infinity;
            
            for (const enemy of allEnemies) {
                const distance = Vec3.distance(playerPos, enemy.node.worldPosition);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestEnemy = enemy.node;
                }
            }
            
            if (nearestEnemy) {
                console.log("🎯 闪电链找到初始目标");
                console.log(`⚡ 从玩家位置 (${playerPos.x.toFixed(1)}, ${playerPos.y.toFixed(1)}) 开始闪电链`);
                // 从玩家位置开始闪电链
                this.startLightningChain(playerPos, nearestEnemy);
                
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
     * @param targetEnemy 目标敌人
     * @param chainIndex 链索引
     * @param damage 当前伤害
     */
    private createLightningSegment(fromPos: Vec3, targetEnemy: Node, chainIndex: number, damage: number) {
        if (chainIndex >= this.maxChainCount) {
            console.log("⚡ 闪电链达到最大连接数");
            return;
        }
        
        const targetPos = targetEnemy.worldPosition;
        const enemyComponent = targetEnemy.getComponent(Enemy);
        
        if (!enemyComponent) {
            console.warn("⚠️ 目标不是敌人，跳过");
            return;
        }
        
        // 标记敌人已被连接
        this._chainedEnemies.add(targetEnemy.uuid);
        
        // 对敌人造成伤害
        const actualDamage = Math.floor(damage);
        const damageSuccessful = this.dealDamageToEnemy(enemyComponent, this.getAttackType());
        if (damageSuccessful) {
            this.markEnemyAsHit(targetEnemy);
            console.log(`⚡ 闪电链第${chainIndex + 1}段击中敌人，伤害: ${actualDamage}`);
        }
        
        // 创建闪电视觉效果
        this.createLightningVisual(fromPos, targetPos, chainIndex);
        
        // 查找下一个目标
        const nextTarget = this.findNextChainTarget(targetPos);
        if (nextTarget) {
            // 递归创建下一段
            const nextDamage = damage * this.damageDecay;
            this.createLightningSegment(targetPos, nextTarget, chainIndex + 1, nextDamage);
        } else {
            console.log(`⚡ 闪电链在第${chainIndex + 1}段结束，无更多目标`);
        }
    }

    /**
     * 创建闪电视觉效果
     * @param fromPos 起始位置
     * @param toPos 结束位置
     * @param chainIndex 链索引
     */
    private createLightningVisual(fromPos: Vec3, toPos: Vec3, chainIndex: number) {
        if (this._thunderFrames.length === 0) {
            console.warn("⚠️ 没有闪电帧，跳过视觉效果");
            return;
        }
        
        console.log(`\n🔥 开始创建闪电第${chainIndex + 1}段:`);
        console.log(`  📍 起点: (${fromPos.x.toFixed(1)}, ${fromPos.y.toFixed(1)})`);
        console.log(`  📍 终点: (${toPos.x.toFixed(1)}, ${toPos.y.toFixed(1)})`);
        
        const lightningNode = new Node(`Lightning_Chain_${chainIndex}`);
        lightningNode.setParent(this.node.parent);
        this._lightningNodes.push(lightningNode);
        
        // 添加UITransform组件
        const uiTransform = lightningNode.addComponent(UITransform);
        
        // 添加Sprite组件
        const sprite = lightningNode.addComponent(Sprite);
        const randomFrameIndex = Math.floor(Math.random() * this._thunderFrames.length);
        sprite.spriteFrame = this._thunderFrames[randomFrameIndex];
        
        // 设置闪电颜色 - 不同段用不同颜色以便区分
        const colors = [
            new Color(255, 255, 255, 255), // 白色
            new Color(173, 216, 230, 255), // 浅蓝色
            new Color(255, 255, 0, 255),   // 黄色
            new Color(255, 165, 0, 255),   // 橙色
            new Color(255, 0, 255, 255)    // 紫色
        ];
        sprite.color = colors[chainIndex % colors.length];
        
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
        
        // 设置锚点为左端中心点，这样旋转和拉伸从起点开始
        uiTransform.setAnchorPoint(0, 0.5);
        
        // 设置世界位置为起始点
        lightningNode.setWorldPosition(fromPos);
        
        // 设置旋转角度 - 确保闪电指向目标
        lightningNode.angle = angleDeg;
        
        // 获取原始帧尺寸
        const frameSize = sprite.spriteFrame!.originalSize;
        console.log(`  🖼️ 原始帧尺寸: ${frameSize.width}x${frameSize.height}`);
        
        // 设置目标尺寸 - 宽度为距离，高度保持原样
        const targetWidth = Math.max(distance, 10); // 最小宽度为10，避免过小
        const targetHeight = frameSize.height;
        
        console.log(`  🎯 目标尺寸: ${targetWidth.toFixed(1)}x${targetHeight}`);
        
        // 应用尺寸
        uiTransform.setContentSize(targetWidth, targetHeight);
        
        // 验证设置
        const actualSize = uiTransform.contentSize;
        const actualPos = lightningNode.worldPosition;
        console.log(`  ✅ 最终配置:`);
        console.log(`    - 位置: (${actualPos.x.toFixed(1)}, ${actualPos.y.toFixed(1)})`);
        console.log(`    - 角度: ${lightningNode.angle.toFixed(1)}°`);
        console.log(`    - 尺寸: ${actualSize.width.toFixed(1)}x${actualSize.height.toFixed(1)}`);
        console.log(`    - 锚点: (${uiTransform.anchorPoint.x}, ${uiTransform.anchorPoint.y})`);
        console.log(`    - 颜色: 第${chainIndex + 1}段专用色`);
        
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
        const totalFrames = this._thunderFrames.length;
        
        const playNextFrame = () => {
            if (!sprite || !sprite.isValid || currentFrame >= totalFrames) {
                return;
            }
            
            // 随机选择帧（增加闪烁效果）
            const randomFrameIndex = Math.floor(Math.random() * totalFrames);
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
        
        // 闪电淡出动画
        tween(sprite)
            .delay(this.lightningDuration * 0.7)
            .to(this.lightningDuration * 0.3, { color: new Color(255, 255, 255, 0) })
            .call(() => {
                if (sprite.node && sprite.node.isValid) {
                    sprite.node.destroy();
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
        let nearestEnemy = null;
        let minDistance = Infinity;
        
        console.log(`\n🔍 寻找下一个闪电链目标:`);
        console.log(`  📍 当前位置: (${currentPos.x.toFixed(1)}, ${currentPos.y.toFixed(1)})`);
        console.log(`  🎯 搜索范围: ${this.maxChainDistance}`);
        console.log(`  👥 总敌人数: ${allEnemies.length}`);
        console.log(`  ⛓️ 已连接敌人数: ${this._chainedEnemies.size}`);
        
        let candidateCount = 0;
        for (const enemy of allEnemies) {
            // 跳过已连接的敌人
            if (this._chainedEnemies.has(enemy.node.uuid)) {
                console.log(`  ⏭️ 跳过已连接敌人: ${enemy.node.name}`);
                continue;
            }
            
            const distance = Vec3.distance(currentPos, enemy.node.worldPosition);
            console.log(`  📏 检查敌人 ${enemy.node.name}: 距离 ${distance.toFixed(1)}`);
            
            // 检查距离是否在范围内
            if (distance <= this.maxChainDistance) {
                candidateCount++;
                console.log(`    ✅ 在范围内`);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestEnemy = enemy.node;
                    console.log(`    🎯 更新最近目标: ${enemy.node.name}`);
                }
            } else {
                console.log(`    ❌ 超出范围 (${distance.toFixed(1)} > ${this.maxChainDistance})`);
            }
        }
        
        if (nearestEnemy) {
            console.log(`✅ 找到下一个闪电链目标: ${nearestEnemy.name}，距离: ${minDistance.toFixed(1)}`);
        } else {
            console.log(`❌ 未找到下一个目标 (候选数: ${candidateCount})`);
        }
        
        return nearestEnemy;
    }

    protected onAttackUpdate(deltaTime: number): void {
        // 闪电链不需要更新逻辑，完全依赖动画和定时器
    }

    protected onAttackComponentDestroy(): void {
        // 清理所有闪电节点
        for (const lightningNode of this._lightningNodes) {
            if (lightningNode && lightningNode.isValid) {
                lightningNode.destroy();
            }
        }
        this._lightningNodes = [];
        this._chainedEnemies.clear();
        
        console.log("⚡ 闪电链清理完成");
    }
} 