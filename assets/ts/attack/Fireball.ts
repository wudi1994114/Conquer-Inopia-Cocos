import { _decorator, Collider2D, Contact2DType, IPhysics2DContact, RigidBody2D, Vec3, Vec2, Node, instantiate, Sprite, Color, tween, UITransform, Graphics, Camera, director, Tween, SpriteFrame, resources, SpriteAtlas } from 'cc';
import { Enemy } from '../Enemy';
import { BaseAttack, AimingMode, MovementMode } from './BaseAttack';
import { AttackSystem } from './AttackSystem';

const { ccclass, property } = _decorator;

@ccclass('Fireball')
export class Fireball extends BaseAttack {
    
    @property({tooltip: '爆炸范围半径'})
    public explosionRadius: number = 100;
    
    @property({tooltip: '火球移动速度'})
    public moveSpeed: number = 150;
    
    @property({tooltip: '目标位置'})
    public targetPosition: Vec3 = new Vec3();

    @property({tooltip: '爆炸动画持续时间'})
    public explosionDuration: number = 0.8;

    @property({tooltip: '屏幕震动强度'})
    public shakeIntensity: number = 10;

    @property({tooltip: '爆炸粒子数量'})
    public explosionParticleCount: number = 12;

    @property({tooltip: '旋转速度（度/秒）'})
    public rotationSpeed: number = 180;

    @property({tooltip: '爆炸动画帧率'})
    public explosionFrameRate: number = 4;

    private _hasExploded: boolean = false; // 防止重复爆炸
    private _rigidbody: RigidBody2D | null = null;
    private _collider: Collider2D | null = null;
    private _sprite: Sprite | null = null;
    private _originalScale: Vec3 = new Vec3();
    private _explosionPosition: Vec3 = new Vec3(); // 记录爆炸位置
    
    // 动画系统相关
    private _fireballFrames: SpriteFrame[] = []; // 存储火球动画帧
    private _isPlayingExplosion: boolean = false; // 是否正在播放爆炸动画
    private _rotationDirection: number = 1; // 旋转方向：1或-1

    protected getAttackName(): string {
        return "火球";
    }

    protected getAttackType() {
        return AttackSystem.AttackType.FIREBALL;
    }

    protected onAttackLoad(): void {
        this._collider = this.getComponent(Collider2D);
        this._rigidbody = this.getComponent(RigidBody2D);
        this._sprite = this.getComponent(Sprite);
        
        // 保存原始缩放
        this._originalScale.set(this.node.scale);
        
        if (this._collider) {
            console.log("✅ 找到火球碰撞器，启用碰撞监听");
            // 确保碰撞器正确配置
            this._collider.enabled = true;
            this._collider.sensor = false; // 确保不是传感器模式，要产生真实碰撞
            this._collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        } else {
            console.error("❌ Fireball Error: 火球没有找到 Collider2D 组件!");
        }
        
        if (this._rigidbody) {
            console.log("✅ 找到火球刚体，配置物理参数");
            // 🔧 重要：配置火球的物理参数，防止高速穿透
            this._rigidbody.enabled = true;
            this._rigidbody.enabledContactListener = true; // 启用碰撞监听器
            this._rigidbody.bullet = true; // 启用CCD，防止高速穿透
            this._rigidbody.gravityScale = 0; // 火球不受重力影响
            this._rigidbody.linearDamping = 0; // 不受空气阻力影响
            this._rigidbody.angularDamping = 0; // 不受角速度阻力影响
            
            console.log("🛡️ 火球物理配置:");
            console.log("  - 启用CCD (bullet):", this._rigidbody.bullet);
            console.log("  - 碰撞监听器:", this._rigidbody.enabledContactListener);
            console.log("  - 重力系数:", this._rigidbody.gravityScale);
            console.log("  - 线性阻尼:", this._rigidbody.linearDamping);
        } else {
            console.error("❌ Fireball Error: 火球没有找到 RigidBody2D 组件!");
        }
        
        // 设置瞄准配置
        this.setAimingConfig({
            mode: AimingMode.NEAREST_ENEMY,
            movementMode: MovementMode.LINEAR,
            speed: this.moveSpeed,
            useWorldCoordinates: true
        });
        
        // 初始化动画系统
        this.initializeAnimation();
        
        console.log("🔥 火球参数:");
        console.log("  - 爆炸范围:", this.explosionRadius);
        console.log("  - 移动速度:", this.moveSpeed);
        console.log("  - 旋转速度:", this.rotationSpeed);
        console.log("  - 已启用连续碰撞检测，防止穿透");
    }

    /**
     * 初始化动画系统
     */
    private initializeAnimation() {
        // 加载火球动画图集
        resources.load("skill/fireball", SpriteAtlas, (err, atlas) => {
            if (err) {
                console.error("❌ 加载火球图集失败:", err);
                this.initializeFallbackAnimation();
                return;
            }
            
            // 从图集中获取所有帧
            this._fireballFrames = [];
            
            // 加载火球帧：fireball-explode0 到 fireball-explode3
            for (let i = 0; i < 4; i++) {
                const frameName = `fireball-explode${i}`;
                const frame = atlas.getSpriteFrame(frameName);
                if (frame) {
                    this._fireballFrames.push(frame);
                    console.log(`✅ 加载火球帧: ${frameName}`);
                } else {
                    console.warn(`⚠️ 未找到火球帧: ${frameName}`);
                }
            }
            
            if (this._fireballFrames.length >= 4) {
                console.log("✅ 成功加载火球动画帧");
                // 立即设置发射状态（第0帧用于发射状态）
                this.setLaunchState();
            } else {
                console.error(`❌ 火球帧数量不正确，期望4个，实际${this._fireballFrames.length}个`);
                this.initializeFallbackAnimation();
            }
        });
    }

    /**
     * 初始化备用动画（当图集加载失败时）
     */
    private initializeFallbackAnimation() {
        if (this._sprite && this._sprite.spriteFrame) {
            console.log("🔄 使用当前精灵帧作为默认帧");
            this._fireballFrames = [this._sprite.spriteFrame];
        }
    }

    /**
     * 设置发射状态（使用第0帧并开始旋转）
     */
    private setLaunchState() {
        if (!this._sprite || this._fireballFrames.length === 0) return;
        
        // 设置第0帧
        this._sprite.spriteFrame = this._fireballFrames[0];
        
        // 随机旋转方向
        this._rotationDirection = Math.random() > 0.5 ? 1 : -1;
        
        // 设置火球的初始颜色为橙红色
        this._sprite.color = new Color(255, 100, 0, 255);
        
        console.log(`🔥 火球设置为发射状态，旋转方向: ${this._rotationDirection > 0 ? '顺时针' : '逆时针'}`);
    }

    /**
     * 开始爆炸动画（火球本体消失，只显示爆炸范围效果）
     */
    private startExplosionAnimation() {
        if (this._fireballFrames.length < 4) {
            console.warn("⚠️ 火球帧数不足，无法播放爆炸动画");
            return;
        }
        
        this._isPlayingExplosion = true;
        
        // 停止旋转
        Tween.stopAllByTarget(this.node);
        
        // 火球本体直接消失
        if (this._sprite) {
            this._sprite.enabled = false;
            console.log("🔥 火球本体已消失");
        }
        
        console.log("💥 火球消失，开始播放爆炸范围效果");
    }



    /**
     * 更新发射状态的旋转动画
     */
    private updateLaunchRotation(deltaTime: number) {
        if (this._isPlayingExplosion) return;
        
        // 持续旋转
        const rotationDelta = this.rotationSpeed * deltaTime * this._rotationDirection;
        this.node.angle += rotationDelta;
    }

    protected onAttackStart(): void {
        console.log("🚀 火球开始飞行");
        
        // 执行瞄准计算
        const aimingResult = this.executeAiming();
        
        if (aimingResult.success) {
            // 瞄准成功，更新目标位置
            this.targetPosition.set(aimingResult.targetPosition!);
            console.log("🎯 火球瞄准成功，目标位置:", this.targetPosition);
        } else {
            console.log("⚠️ 火球瞄准失败，使用默认方向");
        }
        
        // 应用瞄准结果到刚体
        if (this._rigidbody) {
            this.applyAimingToRigidbody(aimingResult, this._rigidbody);
        }
        
        console.log("🔥 火球飞行信息:");
        console.log("  - 当前本地位置:", this.node.position);
        console.log("  - 当前世界位置:", this.node.worldPosition);
        console.log("  - 飞行方向:", this.getCurrentDirection());
        console.log("  - 目标位置:", this.targetPosition);
        console.log("  - 刚体速度:", this._rigidbody?.linearVelocity);
        
        // 5秒后自动爆炸，防止火球永远存在
        this.scheduleOnce(() => {
            if (!this._hasExploded) {
                console.log("⏰ 火球超时，自动爆炸");
                this.explode();
            }
        }, 5);
    }

    protected onAttackUpdate(deltaTime: number): void {
        // 更新发射状态的旋转动画（爆炸后不再需要更新）
        if (!this._isPlayingExplosion) {
            this.updateLaunchRotation(deltaTime);
        }
        
        // 检查是否接近目标位置
        if (!this._hasExploded && this.isNearTarget(20)) {
            console.log("🎯 火球到达目标位置，准备爆炸");
            this.explode();
        }
    }

    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        if (this._hasExploded) {
            return;
        }
        
        console.log("💥 火球碰撞检测触发！");
        console.log("  - 火球世界位置:", this.node.worldPosition);
        console.log("  - 目标名称:", otherCollider.node.name);
        
        // 🔧 重要：检查是否撞到玩家，如果是则跳过
        const isPlayer = otherCollider.node.name.toLowerCase().includes('player') || 
                         otherCollider.node.parent?.name.toLowerCase().includes('player') ||
                         otherCollider.node.getComponent('PlayerController');
        
        if (isPlayer) {
            console.log("🛡️ 火球撞到玩家，跳过碰撞处理");
            return;
        }
        
        // 尝试从被碰撞的物体上获取Enemy脚本
        const enemyScript = otherCollider.getComponent(Enemy);

        if (enemyScript) {
            console.log("🔥 火球直接击中敌人，准备爆炸");
            this.explode();
        }
    }
    
    private explode() {
        if (this._hasExploded) {
            return;
        }
        
        this._hasExploded = true;
        
        // 记录当前的爆炸位置（碰撞位置）
        this._explosionPosition.set(this.node.worldPosition);
        
        console.log("💥 火球爆炸！");
        console.log("  - 爆炸世界位置:", this._explosionPosition);
        console.log("  - 爆炸范围:", this.explosionRadius);
        
        // 停止移动
        if (this._rigidbody) {
            this._rigidbody.linearVelocity = Vec2.ZERO;
            // 延迟禁用物理组件，避免在碰撞监听器中禁用
            this.scheduleOnce(() => {
                if (this._rigidbody && this._rigidbody.isValid) {
                    this._rigidbody.enabled = false;
                }
            }, 0.01);
        }
        
        if (this._collider) {
            // 延迟禁用碰撞器，避免在碰撞监听器中禁用
            this.scheduleOnce(() => {
                if (this._collider && this._collider.isValid) {
                    this._collider.enabled = false;
                }
            }, 0.01);
        }
        
        // 检测爆炸范围内的所有敌人
        this.detectEnemiesInExplosion();
        
        // 开始爆炸视觉效果
        this.playExplosionEffects();
        
        // 计算爆炸动画的实际持续时间
        const explosionAnimationDuration = (this._fireballFrames.length - 1) / this.explosionFrameRate;
        
        // 延迟销毁，等待爆炸动画播放完毕
        this.scheduleOnce(() => {
            console.log("🗑️ 爆炸效果播放完毕，销毁火球");
            this.destroyAttack();
        }, explosionAnimationDuration + 0.1); // 额外0.1秒确保动画完全结束
    }

    /**
     * 播放爆炸视觉效果
     */
    private playExplosionEffects(): void {
        console.log("🎆 开始播放爆炸视觉效果");
        
        // 1. 开始播放新的爆炸动画序列
        this.startExplosionAnimation();
        
        // 2. 创建爆炸范围指示器
        this.createExplosionIndicator();
        
        // 3. 创建爆炸粒子效果
        this.createExplosionParticles();
        
        // 4. 屏幕震动效果
        this.triggerScreenShake();
    }

    /**
     * 创建爆炸范围指示器（使用火球爆炸动画效果）
     */
    private createExplosionIndicator(): void {
        if (this._fireballFrames.length < 4) {
            console.warn("⚠️ 火球帧数不足，跳过爆炸范围指示器");
            return;
        }
        
        const indicatorNode = new Node('ExplosionIndicator');
        indicatorNode.setParent(this.node.parent);
        // 使用记录的爆炸位置，确保在碰撞位置爆炸
        indicatorNode.setWorldPosition(this._explosionPosition);
        
        // 添加Sprite组件显示爆炸动画
        const sprite = indicatorNode.addComponent(Sprite);
        sprite.spriteFrame = this._fireballFrames[1]; // 从第1帧开始
        sprite.color = new Color(255, 150, 50, 200); // 橙红色半透明
        
        // 计算缩放比例，使爆炸效果覆盖爆炸范围
        const frameSize = sprite.spriteFrame!.originalSize;
        const scaleX = (this.explosionRadius * 2) / frameSize.width;
        const scaleY = (this.explosionRadius * 2) / frameSize.height;
        const scale = Math.max(scaleX, scaleY);
        
        // 设置初始缩放
        indicatorNode.scale = new Vec3(scale * 0.5, scale * 0.5, 1);
        
        console.log(`💥 创建爆炸范围指示器，缩放: ${scale.toFixed(2)}`);
        
        // 播放爆炸动画序列
        let currentFrame = 1;
        const frameInterval = 1 / this.explosionFrameRate;
        
        const playNextFrame = () => {
            if (currentFrame >= this._fireballFrames.length) {
                // 动画播放完毕，直接消失
                console.log("🎆 爆炸范围动画播放完毕，直接消失");
                if (indicatorNode && indicatorNode.isValid) {
                    indicatorNode.destroy();
                }
                return;
            }
            
            // 检查节点是否还有效
            if (!indicatorNode || !indicatorNode.isValid) {
                console.log("⚠️ 爆炸范围指示器节点已无效，停止动画");
                return;
            }
            
            // 设置当前帧
            sprite.spriteFrame = this._fireballFrames[currentFrame];
            console.log(`💥 爆炸范围第${currentFrame}帧`);
            currentFrame++;
            
            // 同时播放缩放动画
            if (currentFrame === 2) {
                // 第一帧时快速放大
                tween(indicatorNode)
                    .to(frameInterval, { scale: new Vec3(scale, scale, 1) })
                    .start();
            } else if (currentFrame === this._fireballFrames.length) {
                // 最后一帧时稍微缩小
                tween(indicatorNode)
                    .to(frameInterval, { scale: new Vec3(scale * 0.8, scale * 0.8, 1) })
                    .start();
            }
            
            // 使用tween延迟来安排下一帧
            tween(indicatorNode)
                .delay(frameInterval)
                .call(playNextFrame)
                .start();
        };
        
        // 开始播放动画
        playNextFrame();
    }



    /**
     * 创建爆炸粒子效果
     */
    private createExplosionParticles(): void {
        // 计算爆炸动画持续时间，确保粒子效果不超过这个时间
        const explosionAnimationDuration = (this._fireballFrames.length - 1) / this.explosionFrameRate;
        const particleDuration = Math.min(0.6, explosionAnimationDuration * 0.8);
        
        for (let i = 0; i < this.explosionParticleCount; i++) {
            const particleNode = new Node(`ExplosionParticle_${i}`);
            particleNode.setParent(this.node.parent);
            // 使用记录的爆炸位置，确保粒子从碰撞位置发散
            particleNode.setWorldPosition(this._explosionPosition);
            
            // 添加Sprite组件作为粒子
            const sprite = particleNode.addComponent(Sprite);
            sprite.color = new Color(
                255, 
                Math.random() * 155 + 100,  // 黄色到红色
                0, 
                255
            );
            
            // 设置粒子大小
            particleNode.scale = new Vec3(0.3, 0.3, 0.3);
            
            // 随机方向和距离
            const angle = (i / this.explosionParticleCount) * 360 + Math.random() * 30;
            const distance = this.explosionRadius * 0.8 + Math.random() * this.explosionRadius * 0.4;
            const radian = angle * Math.PI / 180;
            
            const targetX = Math.cos(radian) * distance;
            const targetY = Math.sin(radian) * distance;
            
            // 粒子飞散动画
            tween(particleNode)
                .parallel(
                    tween().to(particleDuration, { 
                        position: new Vec3(
                            this._explosionPosition.x + targetX,
                            this._explosionPosition.y + targetY,
                            this._explosionPosition.z
                        )
                    }),
                    tween().to(particleDuration * 0.7, { scale: new Vec3(0.8, 0.8, 0.8) })
                           .to(particleDuration * 0.3, { scale: new Vec3(0, 0, 0) })
                )
                .call(() => {
                    particleNode.destroy();
                })
                .start();
            
            // 粒子颜色渐变
            tween(sprite)
                .to(particleDuration * 0.5, { color: new Color(255, 200, 0, 255) })
                .to(particleDuration * 0.5, { color: new Color(255, 100, 0, 0) })
                .start();
        }
    }

    /**
     * 触发屏幕震动效果
     */
    private triggerScreenShake(): void {
        const camera = director.getScene()?.getComponentInChildren(Camera);
        if (!camera) return;
        
        const cameraNode = camera.node;
        const originalPosition = cameraNode.position.clone();
        
        let shakeCount = 0;
        const maxShakes = 8;
        const shakeDecay = 0.8;
        
        const shakeFunction = () => {
            if (shakeCount >= maxShakes) {
                cameraNode.setPosition(originalPosition);
                return;
            }
            
            const currentIntensity = this.shakeIntensity * Math.pow(shakeDecay, shakeCount);
            const offsetX = (Math.random() - 0.5) * currentIntensity;
            const offsetY = (Math.random() - 0.5) * currentIntensity;
            
            cameraNode.setPosition(
                originalPosition.x + offsetX,
                originalPosition.y + offsetY,
                originalPosition.z
            );
            
            shakeCount++;
            this.scheduleOnce(shakeFunction, 0.05);
        };
        
        shakeFunction();
    }
    
    private detectEnemiesInExplosion() {
        console.log("💥 开始检测爆炸范围内的敌人");
        
        // 获取所有敌人节点
        const enemies = this.getAllEnemies();
        let hitCount = 0;
        
        for (const enemy of enemies) {
            // 使用记录的爆炸位置计算距离
            const distance = Vec3.distance(this._explosionPosition, enemy.node.worldPosition);
            
            if (distance <= this.explosionRadius) {
                console.log("💥 火球爆炸击中敌人:", enemy.node.name, "距离:", distance.toFixed(2));
                
                const damageSuccessful = this.dealDamageToEnemy(enemy, this.getAttackType());
                if (damageSuccessful) {
                    this.markEnemyAsHit(enemy.node);
                    hitCount++;
                }
            }
        }
        
        console.log("📊 火球爆炸攻击统计: 击中", hitCount, "个敌人");
    }
    
    public setTarget(position: Vec3) {
        this.targetPosition.set(position);
        console.log("🎯 火球设置目标位置:", position);
    }
    
    protected onAttackComponentDestroy(): void {
        // 清理碰撞监听器
        if (this._collider) {
            this._collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }
} 