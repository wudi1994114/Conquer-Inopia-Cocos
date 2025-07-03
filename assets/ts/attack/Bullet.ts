import { _decorator, Collider2D, Contact2DType, IPhysics2DContact, RigidBody2D, Vec3, Vec2 } from 'cc';
import { Enemy } from '../Enemy';
import { BaseAttack } from './BaseAttack';
import { AttackSystem } from './AttackSystem';

const { ccclass, property } = _decorator;

@ccclass('Bullet')
export class Bullet extends BaseAttack {

    private _hasHit: boolean = false; // 防止重复伤害
    private _collider: Collider2D | null = null;
    private _rigidbody: RigidBody2D | null = null;
    private _logTimer: number = 0; // 用于控制日志频率
    private _lastPosition: Vec3 = new Vec3(); // 记录上一帧位置

    protected getAttackName(): string {
        return "子弹";
    }

    protected getAttackType() {
        return AttackSystem.AttackType.BULLET;
    }

    protected onAttackLoad(): void {
        console.log("🔫 子弹onLoad开始 - 节点:", this.node.name);
        console.log("  - 子弹位置:", this.node.position);
        console.log("  - 子弹世界位置:", this.node.worldPosition);
        console.log("  - 子弹激活状态:", this.node.active);
        console.log("  - 子弹有效性:", this.node.isValid);
        
        this._collider = this.getComponent(Collider2D);
        this._rigidbody = this.getComponent(RigidBody2D);
        
        if (this._collider) {
            console.log("✅ 找到子弹碰撞器，启用碰撞监听");
            
            // 确保碰撞器正确配置
            this._collider.enabled = true;
            this._collider.sensor = false; // 确保不是传感器模式，要产生真实碰撞
            this._collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            
            console.log("  - 碰撞器组:", this._collider.group);
            console.log("  - 碰撞器启用:", this._collider.enabled);
            console.log("  - 碰撞器类型:", this._collider.constructor.name);
            console.log("  - 碰撞器传感器模式:", this._collider.sensor);
        } else {
            console.error("❌ Bullet Error: 子弹没有找到 Collider2D 组件!");
        }
        
        if (this._rigidbody) {
            console.log("✅ 找到子弹刚体");
            
            // 确保刚体正确配置
            this._rigidbody.enabled = true;
            this._rigidbody.enabledContactListener = true; // 启用碰撞监听器
            this._rigidbody.bullet = true; // 启用CCD，防止高速穿透
            this._rigidbody.gravityScale = 0; // 子弹不受重力影响
            
            console.log("  - 碰撞监听器启用:", this._rigidbody.enabledContactListener);
            console.log("  - 子弹模式(CCD):", this._rigidbody.bullet);
            console.log("  - 刚体组:", this._rigidbody.group);
            console.log("  - 刚体类型:", this._rigidbody.type);
            console.log("  - 当前线性速度:", this._rigidbody.linearVelocity);
            console.log("  - 重力缩放:", this._rigidbody.gravityScale);
            console.log("  - 刚体启用:", this._rigidbody.enabled);
            
            if (this._rigidbody.bullet) {
                console.log("🎯 连续碰撞检测已启用，防止高速穿透");
            } else {
                console.log("⚠️ 建议启用bullet模式以防止高速穿透");
            }
        } else {
            console.error("❌ Bullet Error: 子弹没有找到 RigidBody2D 组件!");
        }
        
        // 记录初始位置
        this._lastPosition.set(this.node.position);
        
        console.log("🔫 子弹onLoad完成");
    }

    protected onAttackStart(): void {
        console.log("🚀 子弹start开始");
        console.log("  - 当前位置:", this.node.position);
        console.log("  - 当前世界位置:", this.node.worldPosition);
        
        if (this._rigidbody) {
            console.log("  - 当前速度:", this._rigidbody.linearVelocity);
            console.log("  - 速度大小:", this._rigidbody.linearVelocity.length());
            
            // 如果速度为0，说明没有设置速度
            if (this._rigidbody.linearVelocity.length() === 0) {
                console.error("❌ 子弹速度为0！强制设置默认向上速度");
                // 紧急修复：如果没有速度，给一个默认的向上速度
                this._rigidbody.linearVelocity = new Vec2(0, 800);
                console.log("🔧 已设置默认速度:", this._rigidbody.linearVelocity);
            }
        }
        
        // 🩺 碰撞诊断 - 强制检查碰撞设置
        this.performCollisionDiagnostic();
        
        // 3秒后自动销毁，防止子弹飞出屏幕后永远存在，造成性能浪费
        this.scheduleOnce(() => {
            console.log("⏰ 子弹超时，自动销毁");
            this.destroyAttack();
        }, 3);
        
        console.log("🚀 子弹start完成");
    }

    /**
     * 碰撞诊断检查
     */
    private performCollisionDiagnostic(): void {
        console.log("🩺 === 子弹碰撞诊断开始 ===");
        
        // 检查刚体设置
        if (this._rigidbody) {
            console.log("✅ 子弹刚体存在");
            console.log("  - 子弹刚体分组:", this._rigidbody.group);
            console.log("  - 子弹碰撞监听:", this._rigidbody.enabledContactListener);
            console.log("  - 子弹连续碰撞:", this._rigidbody.bullet);
            console.log("  - 子弹刚体启用:", this._rigidbody.enabled);
            
            // 🚨 关键检查：子弹分组是否是2
            if (this._rigidbody.group !== 2) {
                console.error("❌❌❌ 严重错误：子弹刚体分组不是2！当前分组:", this._rigidbody.group);
                console.error("应该是PLAYER_ATTACK(2)，但实际是:", this._rigidbody.group);
            } else {
                console.log("✅ 子弹刚体分组正确：PLAYER_ATTACK(2)");
            }
        } else {
            console.error("❌ 刚体不存在！");
        }
        
        // 检查碰撞器设置
        if (this._collider) {
            console.log("✅ 子弹碰撞器存在");
            console.log("  - 子弹碰撞器分组:", this._collider.group);
            console.log("  - 子弹碰撞器启用:", this._collider.enabled);
            console.log("  - 子弹传感器模式:", this._collider.sensor);
            console.log("  - 子弹碰撞器类型:", this._collider.constructor.name);
            
            // 🚨 关键检查：子弹碰撞器分组是否是2
            if (this._collider.group !== 2) {
                console.error("❌❌❌ 严重错误：子弹碰撞器分组不是2！当前分组:", this._collider.group);
                console.error("应该是PLAYER_ATTACK(2)，但实际是:", this._collider.group);
            } else {
                console.log("✅ 子弹碰撞器分组正确：PLAYER_ATTACK(2)");
            }
            
            // 🚨 关键检查：传感器模式
            if (this._collider.sensor === true) {
                console.error("❌❌❌ 严重错误：子弹碰撞器是传感器模式！不会产生物理碰撞！");
                // 强制关闭传感器模式
                this._collider.sensor = false;
                console.log("🔧 已强制关闭传感器模式");
            } else {
                console.log("✅ 子弹碰撞器非传感器模式，会产生物理碰撞");
            }
        } else {
            console.error("❌ 碰撞器不存在！");
        }
        
        // 检查场景中的敌人
        const scene = this.node.scene;
        if (scene) {
            const enemies = scene.getComponentsInChildren('Enemy');
            console.log(`🎯 场景中敌人数量: ${enemies.length}`);
            
            if (enemies.length > 0) {
                const firstEnemy = enemies[0];
                const enemyCollider = firstEnemy.getComponent(Collider2D);
                const enemyRigidbody = firstEnemy.getComponent(RigidBody2D);
                
                console.log("🔍 第一个敌人信息:");
                console.log("  - 敌人位置:", firstEnemy.node.worldPosition);
                console.log("  - 敌人分组:", enemyRigidbody ? enemyRigidbody.group : '无刚体');
                console.log("  - 敌人碰撞器分组:", enemyCollider ? enemyCollider.group : '无碰撞器');
                console.log("  - 敌人碰撞器启用:", enemyCollider ? enemyCollider.enabled : '无碰撞器');
                
                // 计算距离
                const distance = Vec3.distance(this.node.worldPosition, firstEnemy.node.worldPosition);
                console.log("  - 与敌人距离:", distance.toFixed(2));
                
                if (distance < 200) {
                    console.log("⚡ 距离很近，应该很快发生碰撞");
                } else {
                    console.log("📏 距离较远，需要等待子弹飞行");
                }
            } else {
                console.warn("⚠️ 场景中没有敌人！");
            }
        }
        
        console.log("🩺 === 子弹碰撞诊断完成 ===");
    }

    protected onAttackUpdate(deltaTime: number): void {
        // 每0.5秒记录一次子弹状态
        this._logTimer += deltaTime;
        if (this._logTimer >= 0.5) {
            this._logTimer = 0;
            
            const currentPos = this.node.position;
            const distance = Vec3.distance(currentPos, this._lastPosition);
            
            console.log("🔫 子弹状态更新:");
            console.log("  - 当前位置:", currentPos);
            console.log("  - 移动距离:", distance.toFixed(2));
            console.log("  - 是否移动:", distance > 0.1);
            
            if (this._rigidbody) {
                console.log("  - 当前速度:", this._rigidbody.linearVelocity);
                console.log("  - 速度大小:", this._rigidbody.linearVelocity.length().toFixed(2));
            }
            
            // 检查是否卡住不动
            if (distance < 0.1 && this._rigidbody && this._rigidbody.linearVelocity.length() > 0) {
                console.warn("⚠️ 子弹可能卡住了！有速度但没有移动");
            }
            
            this._lastPosition.set(currentPos);
        }
    }

    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        // 防止重复触发
        if (this._hasHit) {
            console.log("子弹已击中目标，忽略重复碰撞");
            return;
        }
        
        console.log("📢 子弹碰撞检测触发！");
        console.log("  - 子弹位置:", this.node.position);
        console.log("  - 目标名称:", otherCollider.node.name);
        console.log("  - 目标位置:", otherCollider.node.position);
        
        // 简化判断：直接检查碰撞对象类型
        const enemyScript = otherCollider.getComponent(Enemy);
        const isPlayer = otherCollider.node.name.toLowerCase().includes('player') || 
                         otherCollider.node.parent?.name.toLowerCase().includes('player');
        
        console.log("  - 是否为敌人组件:", !!enemyScript);
        console.log("  - 是否为玩家节点:", isPlayer);
        
        // 🎯 如果撞到玩家，直接跳过
        if (isPlayer) {
            console.log("⚡ 子弹撞到玩家，跳过处理");
            return;
        }
        
        // 🎯 如果撞到敌人，触发伤害效果
        if (enemyScript) {
            this._hasHit = true; // 标记已击中
            console.log("🎯 子弹击中敌人！开始处理伤害");
            
            const damageSuccessful = this.dealDamageToEnemy(enemyScript, this.getAttackType());
            if (damageSuccessful) {
                this.markEnemyAsHit(enemyScript.node);
                console.log("💥 伤害处理成功，子弹准备销毁");
            } else {
                console.log("⚠️ 伤害处理失败");
            }
            
            // 击中敌人后，子弹立即销毁
            this.destroyAttack();
        } else {
            console.log("⚠️ 碰撞目标不是敌人:", otherCollider.node.name);
            console.log("  - 继续飞行...");
        }
    }

    protected onAttackComponentDestroy(): void {
        console.log("🗑️ 子弹销毁");
        console.log("  - 最终位置:", this.node.position);
        console.log("  - 是否击中目标:", this._hasHit);
        
        // 清理碰撞监听器
        if (this._collider) {
            this._collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }
} 