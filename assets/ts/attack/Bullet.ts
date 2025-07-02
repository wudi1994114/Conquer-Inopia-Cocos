import { _decorator, Collider2D, Contact2DType, IPhysics2DContact, RigidBody2D } from 'cc';
import { Enemy } from '../Enemy';
import { BaseAttack } from './BaseAttack';
import { AttackSystem } from './AttackSystem';

const { ccclass, property } = _decorator;

@ccclass('Bullet')
export class Bullet extends BaseAttack {

    private _hasHit: boolean = false; // 防止重复伤害
    private _collider: Collider2D = null;
    private _rigidbody: RigidBody2D = null;

    protected getAttackName(): string {
        return "子弹";
    }

    protected getAttackType() {
        return AttackSystem.AttackType.BULLET;
    }

    protected onAttackLoad(): void {
        this._collider = this.getComponent(Collider2D);
        this._rigidbody = this.getComponent(RigidBody2D);
        
        if (this._collider) {
            console.log("✅ 找到子弹碰撞器，启用碰撞监听");
            this._collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            console.log("  - 碰撞器组:", this._collider.group);
            console.log("  - 碰撞器启用:", this._collider.enabled);
        } else {
            console.error("❌ Bullet Error: 子弹没有找到 Collider2D 组件!");
        }
        
        if (this._rigidbody) {
            console.log("✅ 找到子弹刚体");
            console.log("  - 碰撞监听器启用:", this._rigidbody.enabledContactListener);
            console.log("  - 子弹模式(CCD):", this._rigidbody.bullet);
            console.log("  - 刚体组:", this._rigidbody.group);
            console.log("  - 刚体类型:", this._rigidbody.type);
            
            if (this._rigidbody.bullet) {
                console.log("🎯 连续碰撞检测已启用，防止高速穿透");
            } else {
                console.log("⚠️ 建议启用bullet模式以防止高速穿透");
            }
        } else {
            console.error("❌ Bullet Error: 子弹没有找到 RigidBody2D 组件!");
        }
    }

    protected onAttackStart(): void {
        // 3秒后自动销毁，防止子弹飞出屏幕后永远存在，造成性能浪费
        this.scheduleOnce(() => {
            console.log("⏰ 子弹超时，自动销毁");
            this.destroyAttack();
        }, 3);
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
        
        // 尝试从被碰撞的物体上获取Enemy脚本
        const enemyScript = otherCollider.getComponent(Enemy);

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
        }
    }

    protected onAttackComponentDestroy(): void {
        // 清理碰撞监听器
        if (this._collider) {
            this._collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }
} 