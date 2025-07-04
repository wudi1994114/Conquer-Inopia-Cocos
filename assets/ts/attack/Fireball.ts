import { _decorator, Collider2D, Contact2DType, IPhysics2DContact, RigidBody2D, Vec3, Vec2, Node, instantiate, Sprite, Color, tween, UITransform, Graphics, Camera, director, Tween } from 'cc';
import { Enemy } from '../Enemy';
import { BaseAttack, AimingMode, MovementMode } from './BaseAttack';
import { AttackSystem } from './AttackSystem';

const { ccclass, property } = _decorator;

@ccclass('Fireball')
export class Fireball extends BaseAttack {
    
    @property({tooltip: '爆炸范围半径'})
    public explosionRadius: number = 100;
    
    @property({tooltip: '火球移动速度'})
    public moveSpeed: number = 300;
    
    @property({tooltip: '目标位置'})
    public targetPosition: Vec3 = new Vec3();

    @property({tooltip: '爆炸动画持续时间'})
    public explosionDuration: number = 0.8;

    @property({tooltip: '屏幕震动强度'})
    public shakeIntensity: number = 10;

    @property({tooltip: '爆炸粒子数量'})
    public explosionParticleCount: number = 12;

    private _hasExploded: boolean = false; // 防止重复爆炸
    private _rigidbody: RigidBody2D | null = null;
    private _collider: Collider2D | null = null;
    private _sprite: Sprite | null = null;
    private _originalScale: Vec3 = new Vec3();

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
        
        // 初始化火球视觉效果
        this.initializeVisualEffects();
        
        console.log("🔥 火球参数:");
        console.log("  - 爆炸范围:", this.explosionRadius);
        console.log("  - 移动速度:", this.moveSpeed);
        console.log("  - 已启用连续碰撞检测，防止穿透");
    }

    /**
     * 初始化火球的视觉效果
     */
    private initializeVisualEffects(): void {
        if (this._sprite) {
            // 设置火球的初始颜色为橙红色
            this._sprite.color = new Color(255, 100, 0, 255);
            
            // 添加火球飞行时的脉动效果
            tween(this.node)
                .repeatForever(
                    tween()
                        .to(0.3, { scale: new Vec3(1.2, 1.2, 1.2) })
                        .to(0.3, { scale: this._originalScale })
                )
                .start();
                
            // 添加旋转效果
            tween(this.node)
                .repeatForever(
                    tween()
                        .by(1, { angle: 360 })
                )
                .start();
        }
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
        console.log("💥 火球爆炸！");
        console.log("  - 爆炸世界位置:", this.node.worldPosition);
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
        
        // 延迟销毁，给爆炸效果时间显示
        this.scheduleOnce(() => {
            this.destroyAttack();
        }, this.explosionDuration);
    }

    /**
     * 播放爆炸视觉效果
     */
    private playExplosionEffects(): void {
        console.log("🎆 开始播放爆炸视觉效果");
        
        // 1. 停止火球的飞行动画
        Tween.stopAllByTarget(this.node);
        
        // 2. 创建爆炸范围指示器
        this.createExplosionIndicator();
        
        // 3. 火球本体爆炸动画
        this.playFireballExplosionAnimation();
        
        // 4. 创建爆炸粒子效果
        this.createExplosionParticles();
        
        // 5. 屏幕震动效果
        this.triggerScreenShake();
    }

    /**
     * 创建爆炸范围指示器
     */
    private createExplosionIndicator(): void {
        const indicatorNode = new Node('ExplosionIndicator');
        indicatorNode.setParent(this.node.parent);
        indicatorNode.setPosition(this.node.position);
        
        // 添加Graphics组件绘制爆炸范围圆圈
        const graphics = indicatorNode.addComponent(Graphics);
        graphics.lineWidth = 4;
        graphics.strokeColor = new Color(255, 0, 0, 255); // 红色边框
        graphics.fillColor = new Color(255, 100, 0, 80);  // 半透明橙色填充
        
        // 绘制爆炸范围圆圈
        graphics.circle(0, 0, this.explosionRadius);
        graphics.fill();
        graphics.stroke();
        
        // 范围指示器动画：从小到大然后淡出
        indicatorNode.scale = Vec3.ZERO;
        tween(indicatorNode)
            .to(0.2, { scale: new Vec3(1, 1, 1) })
            .to(0.3, {}, { 
                onUpdate: (target?: Node, ratio?: number) => {
                    if (!target || ratio === undefined) return;
                    const alpha = 255 * (1 - ratio);
                    graphics.strokeColor = new Color(255, 0, 0, alpha);
                    graphics.fillColor = new Color(255, 100, 0, alpha * 0.3);
                    graphics.clear();
                    graphics.circle(0, 0, this.explosionRadius);
                    graphics.fill();
                    graphics.stroke();
                }
            })
            .call(() => {
                indicatorNode.destroy();
            })
            .start();
    }

    /**
     * 火球本体爆炸动画
     */
    private playFireballExplosionAnimation(): void {
        if (!this._sprite) return;
        
        // 改变火球颜色为爆炸色
        tween(this._sprite)
            .to(0.1, { color: new Color(255, 255, 255, 255) }) // 闪白
            .to(0.2, { color: new Color(255, 0, 0, 255) })     // 红色
            .to(0.3, { color: new Color(255, 100, 0, 180) })   // 橙色半透明
            .to(0.2, { color: new Color(255, 100, 0, 0) })     // 淡出
            .start();
        
        // 火球缩放爆炸效果
        tween(this.node)
            .to(0.1, { scale: new Vec3(2, 2, 2) })          // 快速放大
            .to(0.3, { scale: new Vec3(3, 3, 3) })          // 继续放大
            .to(0.4, { scale: new Vec3(0.1, 0.1, 0.1) })    // 快速缩小
            .start();
    }

    /**
     * 创建爆炸粒子效果
     */
    private createExplosionParticles(): void {
        for (let i = 0; i < this.explosionParticleCount; i++) {
            const particleNode = new Node(`ExplosionParticle_${i}`);
            particleNode.setParent(this.node.parent);
            particleNode.setPosition(this.node.position);
            
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
                    tween().to(0.6, { 
                        position: new Vec3(
                            this.node.position.x + targetX,
                            this.node.position.y + targetY,
                            0
                        )
                    }),
                    tween().to(0.4, { scale: new Vec3(0.8, 0.8, 0.8) })
                           .to(0.2, { scale: new Vec3(0, 0, 0) })
                )
                .call(() => {
                    particleNode.destroy();
                })
                .start();
            
            // 粒子颜色渐变
            tween(sprite)
                .to(0.3, { color: new Color(255, 200, 0, 255) })
                .to(0.3, { color: new Color(255, 100, 0, 0) })
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
            // 使用世界坐标计算爆炸距离
            const distance = Vec3.distance(this.node.worldPosition, enemy.node.worldPosition);
            
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