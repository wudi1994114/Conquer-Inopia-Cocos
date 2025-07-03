import { _decorator, Component, Node, Vec3, CCFloat, RigidBody2D, BoxCollider2D, ERigidBody2DType, PhysicsGroup, Vec2, Size } from 'cc'; // Added Vec2, Size
const { ccclass, property } = _decorator;

@ccclass('Enemy')
export class Enemy extends Component {
    @property(CCFloat)
    public health: number = 100;

    @property(CCFloat)
    public moveSpeed: number = 75;

    private _target: Node | null = null;
    private _rigidBody: RigidBody2D | null = null;
    private _collider: BoxCollider2D | null = null;

    public static EVENT_ENEMY_DIED = 'enemy-has-died-event'; // Unique event name for this game

    onLoad() {
        this._rigidBody = this.getComponent(RigidBody2D);
        if (!this._rigidBody) {
            // console.warn(`Enemy ${this.node.name} is missing RigidBody2D. Adding one.`);
            this._rigidBody = this.addComponent(RigidBody2D);
            this._rigidBody.type = ERigidBody2DType.Dynamic;
            this._rigidBody.gravityScale = 0;
            this._rigidBody.linearDamping = 2;
        }

        this._collider = this.getComponent(BoxCollider2D);
        if (!this._collider) {
            // console.warn(`Enemy ${this.node.name} is missing BoxCollider2D. Adding one.`);
            this._collider = this.addComponent(BoxCollider2D);
            // Attempt to set a sensible default size if possible, e.g., based on a Sprite child or fixed value
            // For example, if you have a Sprite child named 'Visual':
            // const visual = this.node.getChildByNamePath('Visual/Sprite');
            // if (visual && visual.getComponent(Sprite)) this._collider.size = visual.getComponent(Sprite).node.getComponent(UITransform).contentSize;
            // else this._collider.size = new Size(50,50); // Default
            // this._collider.apply();
        }
        // Important: Ensure the enemy can be hit by projectiles.
        // If using physics groups, assign it to an "ENEMY" group.
        // this.node.group = PhysicsGroup.ENEMY_GROUP; // Example: set group using predefined enum or string
        // Or by setting the bitmask: this.node.layer = 1 << yourEnemyLayerBit;
        // For now, we assume default group and rely on bullet's sensor + tag/component check.
    }

    public setTarget(targetNode: Node) {
        this._target = targetNode;
    }

    update(deltaTime: number) {
        if (this._target && this._target.isValid && this._rigidBody) {
            const direction = new Vec3();
            Vec3.subtract(direction, this._target.worldPosition, this.node.worldPosition);

            if (direction.lengthSqr() < 1) { // Close enough, stop to prevent jitter
                this._rigidBody.linearVelocity = Vec2.ZERO;
                return;
            }
            direction.normalize();

            const velocity = new Vec2(direction.x * this.moveSpeed, direction.y * this.moveSpeed);
            this._rigidBody.linearVelocity = velocity;

        } else if (this._rigidBody) {
            this._rigidBody.linearVelocity = Vec2.ZERO; // Stop if no target
        }
    }

    public takeDamage(amount: number) {
        if (this.health <= 0) { // Already dead or processing death
            return;
        }

        this.health -= amount;
        // console.log(`Enemy ${this.node.name} took ${amount} damage. Health remaining: ${this.health}`);
        if (this.health <= 0) {
            this.health = 0; // Prevent negative health display
            this.die();
        }
    }

    private die() {
        // console.log(`Enemy ${this.node.name} is dying.`);
        // Emit event before destroying, so listeners can react
        this.node.emit(Enemy.EVENT_ENEMY_DIED, this.node);

        // Disable further interactions immediately
        if (this._collider) this._collider.enabled = false;
        if (this._rigidBody) this._rigidBody.enabled = false; // Stop physics
        this.enabled = false; // Disable this component's update loop

        // Delay destruction slightly to allow event to propagate and any death animations/effects
        this.scheduleOnce(() => {
            if (this.node.isValid) { // Check if not already destroyed elsewhere
                this.node.destroy();
            }
        }, 0.1); // Short delay
    }

    onDestroy() {
        // console.log(`Enemy ${this.node.name} onDestroy called.`);
        // No need to manually call `this.node.off` for events emitted *by this node* if the node itself is destroyed.
        // Listeners on other nodes for this node's events will become stale, which is usually fine.
        // If this node was listening to global events (e.g., on `director`), those should be cleaned up.
    }
}
