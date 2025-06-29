import { _decorator, Component, Node, Vec3, CCFloat } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Enemy')
export class Enemy extends Component {

    @property(CCFloat)
    public health: number = 100;

    @property(CCFloat)
    public moveSpeed: number = 50; // Units per second

    private targetNode: Node | null = null; // The tower or a central point

    start() {
        // Initialization, e.g., find the tower to move towards.
        // This might be passed in by a GameManager or found by name/tag.
        // For now, we'll assume it needs to be set externally or found.
        // Example: this.targetNode = find("Canvas/TowerNode");
        console.log("Enemy: TargetNode needs to be set for movement.");
    }

    update(deltaTime: number) {
        if (this.targetNode) {
            this.moveTowardsTarget(deltaTime);
        }
    }

    public setTarget(target: Node) {
        this.targetNode = target;
    }

    moveTowardsTarget(deltaTime: number) {
        if (!this.targetNode) return;

        const direction = new Vec3();
        Vec3.subtract(direction, this.targetNode.worldPosition, this.node.worldPosition);
        direction.normalize();

        const displacement = new Vec3();
        Vec3.multiplyScalar(displacement, direction, this.moveSpeed * deltaTime);

        this.node.setWorldPosition(this.node.worldPosition.add(displacement));

        // Optional: Make the enemy look at the target
        // this.node.lookAt(this.targetNode.worldPosition);
    }

    takeDamage(amount: number) {
        this.health -= amount;
        console.log(`Enemy ${this.node.name} took ${amount} damage, health is now ${this.health}`);
        if (this.health <= 0) {
            this.die();
        }
    }

    public static EVENT_ENEMY_DIED = 'enemy-has-died';

    die() {
        console.log(`Enemy ${this.node.name} has died.`);
        // Emit an event that GameManager can listen to
        this.node.emit(Enemy.EVENT_ENEMY_DIED, this.node);

        // Placeholder: Add particle effects, sound, etc.
        this.node.destroy(); // Destroy the enemy node
    }

    // It's good practice to remove listeners when the component is destroyed,
    // though in this specific case, Enemy emits but doesn't listen to its own event.
    // If it were listening to events from other nodes, cleanup would be here.
    // onDestroy() {
    //    console.log(`Enemy ${this.node.name} onDestroy called.`);
    // }
}
