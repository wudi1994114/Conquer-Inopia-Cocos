import { _decorator, Component, Node, Prefab, Vec3, director, find, instantiate } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Tower')
export class Tower extends Component {

    @property(Prefab)
    public bulletPrefab: Prefab | null = null;

    @property
    public attackRange: number = 300; // Example range

    @property
    public fireRate: number = 1; // Shots per second

    private fireCountdown: number = 0;
    private currentTarget: Node | null = null;
    private enemiesParentNode: Node | null = null; // To hold reference to the node containing all enemies

    start() {
        this.fireCountdown = 1 / this.fireRate;
        // It's good practice to find the enemies container once, e.g., in start()
        // This assumes you have a node named 'EnemiesContainer' under the Canvas. Adjust if needed.
        this.enemiesParentNode = find('Canvas/EnemiesContainer');
        if (!this.enemiesParentNode) {
            console.warn("Tower: Could not find 'Canvas/EnemiesContainer'. Enemy detection will fail.");
        }
    }

    update(deltaTime: number) {
        this.findNearestEnemy();

        if (this.currentTarget && this.currentTarget.isValid) { // Check if target is still valid
            // Optional: Rotate tower to face the target
            const lookAtPos = new Vec3(this.currentTarget.worldPosition.x, this.node.worldPosition.y, this.currentTarget.worldPosition.z); // Keep tower upright if 2D/top-down
            this.node.lookAt(lookAtPos);


            if (this.fireCountdown <= 0) {
                this.shoot();
                this.fireCountdown = 1 / this.fireRate;
            }
        } else {
            this.currentTarget = null; // Clear target if it became invalid
        }

        if (this.fireCountdown > 0) {
            this.fireCountdown -= deltaTime;
        }
    }

    findNearestEnemy() {
        if (!this.enemiesParentNode) {
            this.currentTarget = null;
            return;
        }

        const enemies = this.enemiesParentNode.children;
        if (!enemies || enemies.length === 0) {
            this.currentTarget = null;
            return;
        }

        let closestEnemy: Node | null = null;
        let minDistanceSq = this.attackRange * this.attackRange;

        for (const enemyNode of enemies) {
            if (!enemyNode.activeInHierarchy || !enemyNode.isValid) continue; // Skip inactive or destroyed enemies

            const distanceSq = Vec3.squaredDistance(this.node.worldPosition, enemyNode.worldPosition);
            if (distanceSq < minDistanceSq) {
                minDistanceSq = distanceSq;
                closestEnemy = enemyNode;
            }
        }
        this.currentTarget = closestEnemy;
    }

    shoot() {
        if (!this.bulletPrefab) {
            console.warn("Tower: Bullet prefab not set.");
            return;
        }
        if (!this.currentTarget || !this.currentTarget.isValid) {
            console.warn("Tower: No valid target to shoot at.");
            return;
        }

        const bulletNode = director.getScene()?.getComponent('GameManager')?.getPoolManager()?.get(this.bulletPrefab.name, this.bulletPrefab);
        // const bulletNode = instantiate(this.bulletPrefab); // If not using object pool from GameManager

        if (bulletNode) {
            // It's good practice to have a dedicated node for bullets, e.g., 'Canvas/BulletsContainer'
            let bulletsContainer = find('Canvas/BulletsContainer');
            if (!bulletsContainer) {
                bulletsContainer = new Node('BulletsContainer');
                director.getScene()?.addChild(bulletsContainer);
                bulletsContainer.setSiblingIndex(0); // Render behind other UI if necessary
            }
            bulletsContainer.addChild(bulletNode);

            bulletNode.setWorldPosition(this.node.worldPosition); // Start bullet at tower's position

            const bulletScript = bulletNode.getComponent('Bullet'); // Bullet.ts
            if (bulletScript) {
                bulletScript.setInitialTarget(this.currentTarget);
            } else {
                console.error("Tower: Bullet script not found on prefab or setInitialTarget method is missing.");
            }
        } else {
            console.error("Tower: Failed to instantiate bullet. Is the prefab assigned and valid?");
        }
    }
}
