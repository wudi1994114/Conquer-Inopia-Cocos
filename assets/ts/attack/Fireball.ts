import { _decorator, Collider2D, Contact2DType, IPhysics2DContact, RigidBody2D, Vec3, Vec2 } from 'cc';
import { Enemy } from '../Enemy';
import { BaseAttack } from './BaseAttack';
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

    private _hasExploded: boolean = false; // 防止重复爆炸
    private _direction: Vec3 = new Vec3();
    private _rigidbody: RigidBody2D = null;
    private _collider: Collider2D = null;

    protected getAttackName(): string {
        return "火球";
    }

    protected getAttackType() {
        return AttackSystem.AttackType.FIREBALL;
    }

    protected onAttackLoad(): void {
        this._collider = this.getComponent(Collider2D);
        this._rigidbody = this.getComponent(RigidBody2D);
        
        if (this._collider) {
            console.log("✅ 找到火球碰撞器，启用碰撞监听");
            this._collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        } else {
            console.error("❌ Fireball Error: 火球没有找到 Collider2D 组件!");
        }
        
        if (this._rigidbody) {
            console.log("✅ 找到火球刚体");
        } else {
            console.error("❌ Fireball Error: 火球没有找到 RigidBody2D 组件!");
        }
        
        console.log("🔥 火球参数:");
        console.log("  - 爆炸范围:", this.explosionRadius);
        console.log("  - 移动速度:", this.moveSpeed);
    }

    protected onAttackStart(): void {
        // 计算移动方向
        if (this.targetPosition.equals(Vec3.ZERO)) {
            // 如果没有设置目标位置，默认向右飞行
            this._direction.set(1, 0, 0);
        } else {
            Vec3.subtract(this._direction, this.targetPosition, this.node.position);
            this._direction.normalize();
        }
        
        // 设置刚体速度
        if (this._rigidbody) {
            this._rigidbody.linearVelocity = new Vec2(
                this._direction.x * this.moveSpeed,
                this._direction.y * this.moveSpeed
            );
        }
        
        console.log("🚀 火球开始飞行");
        console.log("  - 飞行方向:", this._direction);
        
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
        if (!this.targetPosition.equals(Vec3.ZERO) && !this._hasExploded) {
            const distance = Vec3.distance(this.node.position, this.targetPosition);
            if (distance < 20) { // 接近目标位置20像素内就爆炸
                console.log("🎯 火球到达目标位置，准备爆炸");
                this.explode();
            }
        }
    }

    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        if (this._hasExploded) {
            return;
        }
        
        console.log("💥 火球碰撞检测触发！");
        console.log("  - 火球位置:", this.node.position);
        console.log("  - 目标名称:", otherCollider.node.name);
        
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
        console.log("  - 爆炸位置:", this.node.position);
        console.log("  - 爆炸范围:", this.explosionRadius);
        
        // 停止移动
        if (this._rigidbody) {
            this._rigidbody.linearVelocity = Vec2.ZERO;
        }
        
        // 检测爆炸范围内的所有敌人
        this.detectEnemiesInExplosion();
        
        // 延迟销毁，给爆炸效果时间显示
        this.scheduleOnce(() => {
            this.destroyAttack();
        }, 0.2);
    }
    
    private detectEnemiesInExplosion() {
        console.log("💥 开始检测爆炸范围内的敌人");
        
        // 获取所有敌人节点
        const enemies = this.getAllEnemies();
        let hitCount = 0;
        
        for (const enemy of enemies) {
            const distance = Vec3.distance(this.node.position, enemy.node.position);
            
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