import { _decorator, Component, Node, Vec3, CCFloat, BoxCollider2D, RigidBody2D, ERigidBody2DType, Contact2DType, IPhysics2DContact, Collider2D, Size } from 'cc';
import { Enemy } from './Enemy'; // Assuming Enemy.ts is in the same directory or accessible path
const { ccclass, property } = _decorator;

@ccclass('FireballProjectile')
export class FireballProjectile extends Component {
    @property(CCFloat)
    public speed: number = 400; // Slower than bullet

    @property(CCFloat)
    public damage: number = 25; // More damage than bullet

    @property(CCFloat)
    public lifetime: number = 3; // Slightly longer lifetime perhaps

    // Future enhancement:
    // @property(CCFloat)
    // public areaOfEffectRadius: number = 0; // Set to > 0 for AoE damage

    private _direction: Vec3 = new Vec3();
    private _collider: BoxCollider2D | null = null;
    private _rigidBody: RigidBody2D | null = null;

    public init(direction: Vec3) {
        this._direction.set(direction.normalize());
        // Optional: Rotate fireball to face direction of travel if sprite requires it
        // const angle = Math.atan2(this._direction.y, this._direction.x) * 180 / Math.PI;
        // this.node.angle = angle - 90;
    }

    onLoad() {
        this._rigidBody = this.getComponent(RigidBody2D);
        if (!this._rigidBody) {
            this._rigidBody = this.addComponent(RigidBody2D);
            this._rigidBody.type = ERigidBody2DType.Kinematic; // Kinematic is good for projectiles not affected by external forces
            this._rigidBody.gravityScale = 0;
            // console.log("FireballProjectile: Added RigidBody2D.");
        }

        this._collider = this.getComponent(BoxCollider2D);
        if (!this._collider) {
            this._collider = this.addComponent(BoxCollider2D);
            // console.log("FireballProjectile: Added BoxCollider2D.");
            // Example: Set a slightly larger default size for fireball
            // const uiTransform = this.getComponent(UITransform) || this.addComponent(UITransform);
            // if (uiTransform) uiTransform.setContentSize(new Size(30, 30)); // If using UI Transform
            // if (this._collider) this._collider.size = new Size(30, 30); // Set collider size
            // if (this._collider) this._collider.apply();
        }

        if (this._collider) {
            this._collider.sensor = true; // Must be a sensor for onBeginContact
            this._collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        } else {
            console.error("FireballProjectile: Failed to get or add BoxCollider2D.");
        }
    }

    update(deltaTime: number) {
        const displacement = new Vec3();
        Vec3.multiplyScalar(displacement, this._direction, this.speed * deltaTime);
        this.node.translate(displacement, Node.NodeSpace.WORLD);

        this.lifetime -= deltaTime;
        if (this.lifetime <= 0) {
            this.explode(); // Or just destroy if no explosion effect yet
        }
    }

    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        const enemyComponent = otherCollider.node.getComponent(Enemy);
        if (enemyComponent) {
            // console.log(`Fireball hit Enemy: ${otherCollider.node.name}`);
            enemyComponent.takeDamage(this.damage);
            this.explode(); // Explode on hitting an enemy
            return; // Stop further processing for this contact if needed
        }

        // Optional: Handle collision with other things (e.g., walls, other projectiles if desired)
        // For now, let it pass through non-enemy objects or destroy on any other solid contact
        // if (otherCollider.node.getComponent(YourWallComponent)) {
        //     this.explode();
        // }
    }

    explode() {
        if (!this.node.isValid) return; // Already destroyed

        // console.log(`Fireball ${this.node.name} exploded.`);
        // Future: Implement AoE damage if areaOfEffectRadius > 0
        // - Find enemies within radius
        // - Apply damage to them (possibly reduced damage)
        // - Spawn explosion visual effect prefab

        // For now, just destroy the fireball
        this.node.destroy();
    }

    onDestroy() {
        if (this._collider) {
            this._collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
        // console.log(`FireballProjectile ${this.node.name} onDestroy.`);
    }
}
