import { _decorator, Collider2D, Contact2DType, IPhysics2DContact, RigidBody2D, Vec3, Vec2 } from 'cc';
import { EnemyController } from '../EnemyController';
import { BaseAttack, AimingMode, MovementMode } from './BaseAttack';
import { AttackSystem } from './AttackSystem';

const { ccclass, property } = _decorator;

@ccclass('Bullet')
export class Bullet extends BaseAttack {

    private _hasHit: boolean = false; // 防止重复伤害
    private _collider: Collider2D | null = null;
    private _rigidbody: RigidBody2D | null = null;

    protected getAttackName(): string {
        return "子弹";
    }

    protected getAttackType() {
        return AttackSystem.AttackType.BULLET;
    }

    protected onAttackLoad(): void {
        console.log("🔫 子弹创建");
        
        this._collider = this.getComponent(Collider2D);
        this._rigidbody = this.getComponent(RigidBody2D);
        
        if (this._collider) {
            // 确保碰撞器正确配置
            this._collider.enabled = true;
            this._collider.sensor = false; // 确保不是传感器模式，要产生真实碰撞
            this._collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        } else {
            console.error("❌ 子弹没有找到 Collider2D 组件!");
        }
        
        if (this._rigidbody) {
            // 确保刚体正确配置
            this._rigidbody.enabled = true;
            this._rigidbody.enabledContactListener = true; // 启用碰撞监听器
            this._rigidbody.bullet = true; // 启用CCD，防止高速穿透
            this._rigidbody.gravityScale = 0; // 子弹不受重力影响
            this._rigidbody.linearDamping = 0; // 不受空气阻力影响
            this._rigidbody.angularDamping = 0; // 不受角速度阻力影响
            
            console.log("🛡️ 子弹物理配置:");
            console.log("  - 启用CCD (bullet):", this._rigidbody.bullet);
            console.log("  - 碰撞监听器:", this._rigidbody.enabledContactListener);
            console.log("  - 重力系数:", this._rigidbody.gravityScale);
            console.log("  - 线性阻尼:", this._rigidbody.linearDamping);
            console.log("  - 角速度阻尼:", this._rigidbody.angularDamping);
        } else {
            console.error("❌ 子弹没有找到 RigidBody2D 组件!");
        }
        
        // 设置瞄准配置 - 子弹高速直线瞄准最近敌人
        this.setAimingConfig({
            mode: AimingMode.NEAREST_ENEMY,
            movementMode: MovementMode.LINEAR,
            speed: 500,  // 子弹速度比火球更快
            useWorldCoordinates: true
        });
        

    }

    protected onAttackStart(): void {
        console.log("🔫 子弹开始飞行");
        
        // 执行瞄准计算
        const aimingResult = this.executeAiming();
        
        if (aimingResult.success) {
            console.log("🎯 子弹瞄准成功");
        } else {
            console.log("⚠️ 子弹瞄准失败，使用默认方向");
        }
        
        // 应用瞄准结果到刚体
        if (this._rigidbody) {
            this.applyAimingToRigidbody(aimingResult, this._rigidbody);
        }
        
        // 强制关闭传感器模式
        if (this._collider && this._collider.sensor === true) {
            this._collider.sensor = false;
        }
        
        console.log("🔫 子弹飞行信息:");
        console.log("  - 当前位置:", this.node.worldPosition);
        console.log("  - 飞行方向:", this.getCurrentDirection());
        console.log("  - 刚体速度:", this._rigidbody?.linearVelocity);
        
        // 3秒后自动销毁，防止子弹飞出屏幕后永远存在，造成性能浪费
        this.scheduleOnce(() => {
            this.destroyAttack();
        }, 3);
    }

    protected onAttackUpdate(deltaTime: number): void {
        // 简化：不需要频繁的状态更新日志
    }

    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        // 防止重复触发
        if (this._hasHit) {
            return;
        }
        
        // 简化判断：直接检查碰撞对象类型
        const enemyScript = otherCollider.getComponent(EnemyController);
        const isPlayer = otherCollider.node.name.toLowerCase().includes('player') || 
                         otherCollider.node.parent?.name.toLowerCase().includes('player');
        
        // 🎯 如果撞到玩家，直接跳过
        if (isPlayer) {
            return;
        }
        
        // 🎯 如果撞到敌人，触发伤害效果
        if (enemyScript) {
            this._hasHit = true; // 标记已击中
            console.log("🎯 子弹击中敌人");
            
            const damageSuccessful = this.dealDamageToEnemy(enemyScript, this.getAttackType());
            if (damageSuccessful) {
                this.markEnemyAsHit(enemyScript.node);
            }
            
            // 🔧 修复：延迟销毁子弹，避免在物理碰撞监听器中直接操作刚体
            this.scheduleOnce(() => {
                this.destroyAttack();
            }, 0.01); // 延迟0.01秒销毁
        }
    }

    protected onAttackComponentDestroy(): void {
        // 清理碰撞监听器
        if (this._collider) {
            this._collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }
} 