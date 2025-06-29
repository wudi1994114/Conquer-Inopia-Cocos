import { _decorator, Component, Node, Vec3, RigidBody2D, Vec2, Collider2D, Contact2DType } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Enemy')
export class Enemy extends Component {
    @property({ type: Number })
    public moveSpeed: number = 150;

    @property({ type: Number })
    public health: number = 3;

    @property({ type: Number })
    public attackDamage: number = 1;

    private rigidBody: RigidBody2D = null!;
    private player: Node = null!;
    private currentHealth: number = 0;

    start() {
        this.rigidBody = this.getComponent(RigidBody2D)!;
        this.currentHealth = this.health;
        
        // 查找玩家节点
        this.player = this.node.scene.getChildByName("Player");
        
        // 设置碰撞检测
        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    update(deltaTime: number) {
        this.moveTowardsPlayer();
    }

    private moveTowardsPlayer() {
        if (this.player) {
            const direction = this.player.worldPosition.subtract(this.node.worldPosition);
            direction.normalize();
            
            const velocity = new Vec2(direction.x, direction.y).multiplyScalar(this.moveSpeed);
            this.rigidBody.linearVelocity = velocity;
        }
    }

    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D) {
        // 检查是否碰撞到子弹
        if (otherCollider.node.name.includes("Bullet")) {
            this.takeDamage(1);
            // 销毁子弹
            otherCollider.node.destroy();
        }
        // 检查是否碰撞到玩家
        else if (otherCollider.node.name === "Player") {
            this.attackPlayer();
        }
    }

    public takeDamage(damage: number) {
        this.currentHealth -= damage;
        console.log(`敌人受到 ${damage} 点伤害，剩余血量：${this.currentHealth}`);
        
        if (this.currentHealth <= 0) {
            this.die();
        }
    }

    private attackPlayer() {
        console.log(`敌人攻击玩家，造成 ${this.attackDamage} 点伤害`);
        // 这里可以调用玩家的受伤方法
    }

    private die() {
        console.log("敌人死亡");
        // 播放死亡动画或特效
        this.node.destroy();
    }

    onDestroy() {
        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }
} 