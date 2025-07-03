import { _decorator, Prefab, Node, Vec3, instantiate } from 'cc';
import { BaseAttackComponent } from './BaseAttackComponent'; // Assuming it's in the same directory
import { BulletProjectile } from './BulletProjectile'; // Assuming it's in the same directory
const { ccclass, property } = _decorator;

@ccclass('BasicBulletAttack')
export class BasicBulletAttack extends BaseAttackComponent {
    @property(Prefab)
    public bulletPrefab: Prefab | null = null;

    public override attackName: string = "Basic Bullet";

    // Example: override cooldown if needed for this specific attack
    // @property({ override: true }) // This might not be the correct syntax for override in properties, check Cocos docs
    // public cooldown: number = 0.5;


    // Optional: Custom initialization for this attack
    public override init?(): void {
        super.init?.(); // Call base init if it exists and does something
        if (!this.bulletPrefab) {
            console.error(`BasicBulletAttack: Bullet Prefab is not assigned for ${this.attackName}!`);
        }
        // console.log(`${this.attackName} initialized. Cooldown: ${this.cooldown}`);
    }

    public override performAttack(startPosition: Vec3, direction: Vec3, projectileContainer: Node): void {
        if (!this.bulletPrefab) {
            console.error("BasicBulletAttack: Bullet Prefab is not assigned.");
            return;
        }
        if (!projectileContainer || !projectileContainer.isValid) {
            console.error("BasicBulletAttack: Projectile Container is invalid or not provided.");
            return;
        }

        // console.log(`BasicBulletAttack: Firing bullet from ${startPosition.toString()} in direction ${direction.toString()}`);

        const bulletNode = instantiate(this.bulletPrefab);
        if (bulletNode) {
            projectileContainer.addChild(bulletNode);
            bulletNode.setWorldPosition(startPosition); // Set position after parenting

            const projectileScript = bulletNode.getComponent(BulletProjectile);
            if (projectileScript) {
                projectileScript.init(direction);
            } else {
                console.error("BasicBulletAttack: BulletProjectile script not found on instantiated bullet prefab.");
                bulletNode.destroy(); // Clean up if script is missing
            }
        } else {
            console.error("BasicBulletAttack: Failed to instantiate bullet prefab.");
        }
    }
}
