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
        } else {
            console.error("❌ 子弹没有找到 RigidBody2D 组件!");
        }
        
        // 记录初始位置
        this._lastPosition.set(this.node.position);
    }

    protected onAttackStart(): void {
        // 移除速度检查逻辑，避免与SkillManager的速度设置冲突
        // 让SkillManager完全负责速度设置
        
        // 强制关闭传感器模式
        if (this._collider && this._collider.sensor === true) {
            this._collider.sensor = false;
        }
        
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
        const enemyScript = otherCollider.getComponent(Enemy);
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