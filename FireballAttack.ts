import { _decorator, Prefab, Node, Vec3, instantiate, CCFloat } from 'cc';
import { BaseAttackComponent } from './BaseAttackComponent'; // Assuming BaseAttackComponent.ts is in the same directory
import { FireballProjectile } from './FireballProjectile'; // Assuming FireballProjectile.ts is in the same directory
const { ccclass, property } = _decorator;

@ccclass('FireballAttack')
export class FireballAttack extends BaseAttackComponent {
    @property(Prefab)
    public fireballPrefab: Prefab | null = null;

    // Override properties from BaseAttackComponent if needed
    @property({ override: true, type: CCFloat, tooltip: "Cooldown for the fireball attack in seconds." })
    public cooldown: number = 1.5; // Example: Fireball has a longer cooldown than basic bullet

    @property({ override: true, type: CCString })
    public attackName: string = "Fireball";

    public override init?(): void {
        // super.init?.(); // Call base class init if it had any specific logic you want to preserve
        if (!this.fireballPrefab) {
            console.error(`FireballAttack: Fireball Prefab is not assigned for ${this.attackName}! This attack will not work.`);
        }
        // console.log(`${this.attackName} component initialized. Cooldown: ${this.cooldown}s.`);
    }

    public override performAttack(startPosition: Vec3, direction: Vec3, projectileContainer: Node): void {
        if (!this.fireballPrefab) {
            console.error("FireballAttack: Fireball Prefab is not assigned. Cannot perform attack.");
            return;
        }
        if (!projectileContainer || !projectileContainer.isValid) {
            console.error("FireballAttack: Projectile Container is invalid or not provided. Cannot perform attack.");
            return;
        }

        // console.log(`FireballAttack: Firing fireball from ${startPosition.toString()} in direction ${direction.toString()}`);

        const fireballNode = instantiate(this.fireballPrefab);
        if (fireballNode) {
            projectileContainer.addChild(fireballNode);
            // It's generally better to set position *after* parenting if there are layout components
            // or if the parent has a different scale/rotation that might affect initial world position.
            // However, for simple cases, setting world position directly is fine.
            fireballNode.setWorldPosition(startPosition);

            const projectileScript = fireballNode.getComponent(FireballProjectile);
            if (projectileScript) {
                projectileScript.init(direction);
            } else {
                console.error("FireballAttack: FireballProjectile script not found on the instantiated fireball prefab. Destroying fireball node.");
                fireballNode.destroy(); // Clean up if the script is missing
            }
        } else {
            console.error("FireballAttack: Failed to instantiate fireball prefab.");
        }
    }
}
