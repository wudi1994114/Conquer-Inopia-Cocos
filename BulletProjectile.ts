import { _decorator, Component, Node, Vec3, CCFloat, Collider2D, Contact2DType, IPhysics2DContact, BoxCollider2D, RigidBody2D, ERigidBody2DType } from 'cc';
import { Enemy } from './Enemy'; // Assuming Enemy.ts is in the same directory or accessible path
const { ccclass, property } = _decorator;

@ccclass('BulletProjectile')
export class BulletProjectile extends Component {
    @property(CCFloat)
    public speed: number = 800;

    @property(CCFloat)
    public damage: number = 10;

    @property(CCFloat)
    public lifetime: number = 2; // Seconds before self-destructing if no collision

    private _direction: Vec3 = new Vec3();
    private _collider: BoxCollider2D | null = null;

    // Call this method after instantiating the bullet
    public init(direction: Vec3) {
        this._direction.set(direction.normalize());
        // Optional: Rotate bullet to face direction of travel
        // const angle = Math.atan2(this._direction.y, this._direction.x) * 180 / Math.PI;
        // this.node.angle = angle - 90; // Adjust if sprite is oriented upwards by default
    }

    onLoad() {
        this._collider = this.getComponent(BoxCollider2D);
        if (!this._collider) {
            console.warn("BulletProjectile is missing BoxCollider2D. Adding one by default.");
            this._collider = this.addComponent(BoxCollider2D);
            // Setup default collider properties if needed, e.g., size
            // this._collider.size = new Size(10, 20); // Example
        }
        if (this._collider) {
            this._collider.sensor = true; // Ensure it's a sensor for trigger events
            this._collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        } else {
            console.error("Failed to get or add BoxCollider2D to BulletProjectile.");
        }

        // Add a RigidBody2D if you want bullets to be affected by global physics effects
        // or if you prefer managing their group through RigidBody for collision matrix.
        // For simple trigger-based bullets, it's not strictly necessary if the collider is set up correctly.
        let rb = this.getComponent(RigidBody2D);
        if (!rb) {
            rb = this.addComponent(RigidBody2D);
            rb.type = ERigidBody2DType.Kinematic; // Kinematic or Dynamic with gravityScale = 0
            rb.gravityScale = 0;
        }

    }

    update(deltaTime: number) {
        const displacement = new Vec3();
        Vec3.multiplyScalar(displacement, this._direction, this.speed * deltaTime);
        this.node.translate(displacement, Node.NodeSpace.WORLD); // Move in world space

        this.lifetime -= deltaTime;
        if (this.lifetime <= 0) {
            this.node.destroy();
        }
    }

    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        // Check if the other collider's node has an Enemy component
        const enemyComponent = otherCollider.node.getComponent(Enemy);
        if (enemyComponent) {
            // console.log(`Bullet hit Enemy: ${otherCollider.node.name}`);
            enemyComponent.takeDamage(this.damage);
            this.node.destroy(); // Destroy bullet on impact with an enemy
        } else {
            // Optional: Handle collision with other things, e.g., walls
            // if (otherCollider.tag === YourWallTag) {
            //     this.node.destroy();
            // }
            // console.log(`Bullet hit something else: ${otherCollider.node.name}, Tag: ${otherCollider.tag}`);
        }
    }

    onDestroy() {
        if (this._collider) {
            this._collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }
}
