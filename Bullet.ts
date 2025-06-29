import { _decorator, Component, Node, Vec3, CCFloat, Collider, ITriggerEvent } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Bullet')
export class Bullet extends Component {

    @property(CCFloat)
    public speed: number = 500; // Units per second

    @property(CCFloat)
    public damage: number = 25;

    private direction: Vec3 = new Vec3();
    private targetEnemyNode: Node | null = null; // For homing, if desired
    private lifetime: number = 3; // Max lifetime in seconds to prevent stray bullets

    onLoad() {
        let collider = this.getComponent(Collider);
        if (!collider) {
            console.warn(`Bullet ${this.node.name} is missing a Collider component. It will not be able to detect collisions.`);
        } else {
            collider.on('onTriggerEnter', this.onTriggerEnter, this);
        }
    }

    start() {
        // Initialization if needed
    }

    // Call this method after instantiating the bullet to set its trajectory
    public setInitialTarget(targetNode: Node) {
        this.targetEnemyNode = targetNode; // Store for potential homing or re-targeting

        // Calculate initial direction towards the target's current position
        Vec3.subtract(this.direction, targetNode.worldPosition, this.node.worldPosition);
        this.direction.normalize();

        // Optional: Make the bullet look at the target
        // this.node.lookAt(targetNode.worldPosition);
    }

    // Alternative: Set a fixed direction if not targeting a specific enemy
    public setInitialDirection(direction: Vec3) {
        this.direction = direction.normalize();
        this.targetEnemyNode = null; // Not homing towards a specific node
         // Optional: Make the bullet look in the direction of travel
        // const lookAtPos = new Vec3();
        // Vec3.add(lookAtPos, this.node.worldPosition, this.direction);
        // this.node.lookAt(lookAtPos);
    }


    update(deltaTime: number) {
        // If you want homing bullets, you might recalculate direction towards targetEnemyNode here
        // if (this.targetEnemyNode && this.targetEnemyNode.isValid) {
        //     Vec3.subtract(this.direction, this.targetEnemyNode.worldPosition, this.node.worldPosition);
        //     this.direction.normalize();
        // }

        const displacement = new Vec3();
        Vec3.multiplyScalar(displacement, this.direction, this.speed * deltaTime);
        this.node.setWorldPosition(this.node.worldPosition.add(displacement));

        this.lifetime -= deltaTime;
        if (this.lifetime <= 0) {
            this.node.destroy(); // Destroy bullet after its lifetime expires
        }
    }

    onTriggerEnter(event: ITriggerEvent) {
        // Check if the collision is with an enemy
        const otherCollider = event.otherCollider;
        if (otherCollider && otherCollider.node) {
            const enemyComponent = otherCollider.node.getComponent('Enemy'); // Assuming Enemy.ts
            if (enemyComponent) {
                console.log(`Bullet ${this.node.name} hit Enemy ${otherCollider.node.name}`);
                enemyComponent.takeDamage(this.damage);
                this.node.destroy(); // Destroy bullet on impact with an enemy
            }
            // Could also check for other collidable objects by tag or component
            // else if (otherCollider.tag === CollisionGroup.OBSTACLE) {
            // this.node.destroy();
            // }
        }
    }

    onDestroy() {
        let collider = this.getComponent(Collider);
        if (collider) {
            collider.off('onTriggerEnter', this.onTriggerEnter, this);
        }
    }
}
