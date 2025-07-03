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
        
        // 3秒后自动销毁，防止子弹飞出屏幕后永远存在，造成性能浪费
        this.scheduleOnce(() => {
            console.log("⏰ 子弹超时，自动销毁");
            this.destroyAttack();
        }, 3);
        
        console.log("🚀 子弹start完成");
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
        console.log("  - 子弹速度:", this._rigidbody ? this._rigidbody.linearVelocity : "无刚体");
        console.log("  - 目标名称:", otherCollider.node.name);
        console.log("  - 目标位置:", otherCollider.node.position);
        console.log("  - 目标分组:", otherCollider.group);
        console.log("  - 子弹分组:", selfCollider.group);
        
        // 检查碰撞的对象类型
        const enemyScript = otherCollider.getComponent(Enemy);
        const isPlayer = otherCollider.node.name.toLowerCase().includes('player');
        
        console.log("  - 是否为敌人:", !!enemyScript);
        console.log("  - 是否为玩家:", isPlayer);

        // 如果撞到的是玩家，这不应该发生
        if (isPlayer) {
            console.error("❌ 子弹意外碰撞到玩家！物理分组配置有问题");
            console.error("  - 检查碰撞矩阵设置");
            console.error("  - 玩家分组应该是1，子弹分组应该是2");
            console.error("  - 这两个分组不应该碰撞");
            return; // 不处理与玩家的碰撞
        }

        // 如果获取到了，说明撞到的是敌人
        if (enemyScript) {
            this._hasHit = true; // 标记已击中
            console.log("🎯 子弹击中敌人！");
            
            const damageSuccessful = this.dealDamageToEnemy(enemyScript, this.getAttackType());
            if (damageSuccessful) {
                this.markEnemyAsHit(enemyScript.node);
            }
            
            console.log("💥 子弹准备销毁");
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