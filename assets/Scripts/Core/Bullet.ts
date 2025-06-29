import { _decorator, Component, Node, Vec3, RigidBody2D, Vec2, Collider2D, Contact2DType } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Bullet')
export class Bullet extends Component {
    @property({ type: Number })
    public speed: number = 500;

    @property({ type: Number })
    public damage: number = 1;

    @property({ type: Number })
    public lifeTime: number = 5.0;

    private rigidBody: RigidBody2D = null!;
    private direction: Vec3 = Vec3.UP;
    private currentLifeTime: number = 0;

    start() {
        this.rigidBody = this.getComponent(RigidBody2D)!;
        this.currentLifeTime = this.lifeTime;
        
        // 设置子弹速度
        const velocity = new Vec2(this.direction.x, this.direction.y).multiplyScalar(this.speed);
        this.rigidBody.linearVelocity = velocity;
        
        // 设置碰撞检测
        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    update(deltaTime: number) {
        this.currentLifeTime -= deltaTime;
        if (this.currentLifeTime <= 0) {
            this.destroyBullet();
        }
    }

    public setDirection(dir: Vec3) {
        this.direction = dir.normalize();
    }

    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D) {
        // 检查是否碰撞到敌人
        if (otherCollider.node.name.includes("Enemy")) {
            const enemy = otherCollider.node.getComponent("Enemy");
            if (enemy && enemy.takeDamage) {
                enemy.takeDamage(this.damage);
            }
            this.destroyBullet();
        }
        // 检查是否碰撞到边界或其他物体
        else if (otherCollider.node.name.includes("Wall") || otherCollider.node.name.includes("Boundary")) {
            this.destroyBullet();
        }
    }

    private destroyBullet() {
        // 播放销毁特效
        console.log("子弹销毁");
        this.node.destroy();
    }

    onDestroy() {
        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }
} 