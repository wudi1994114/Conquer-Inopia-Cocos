import { _decorator, Component, Node, Vec3, director, CCString, CCFloat } from 'cc';
import { IAttack } from './IAttack'; // Assuming IAttack.ts is in the same directory
const { ccclass, property } = _decorator;

@ccclass('BaseAttackComponent')
export abstract class BaseAttackComponent extends Component implements IAttack {
    @property(CCString)
    public attackName: string = "BaseAttack";

    @property(CCFloat)
    public cooldown: number = 1.0; // Cooldown in seconds

    // Tracks the last time this attack was successfully executed
    public lastExecutedTime: number = -Infinity; // Set to allow immediate first execution

    onLoad() {
        // Call init if it's defined by the subclass or this base class
        if (this.init) {
            this.init();
        }
        // Ensure lastExecutedTime is truly in the past relative to game start time if cooldown is > 0
        if (this.cooldown > 0 && this.lastExecutedTime === -Infinity) {
            // This ensures that the first attack is possible immediately
            // even if the game has been running for a while before this component loads.
            this.lastExecutedTime = director.getTotalTime() * 0.001 - this.cooldown - 0.1;
        }
    }

    /**
     * Optional initialization method. Subclasses can override this for one-time setup.
     * This method is called from onLoad.
     */
    public init?(): void {
        // Base implementation can be empty or provide common initialization.
        // console.log(`${this.attackName} initialized.`);
    }

    /**
     * Checks if the attack can be executed based on its cooldown.
     * @returns True if the attack is ready, false otherwise.
     */
    public canExecute(): boolean {
        const currentTime = director.getTotalTime() * 0.001; // Current time in seconds
        return (currentTime - this.lastExecutedTime) >= this.cooldown;
    }

    /**
     * Executes the attack if it's off cooldown.
     * This method calls the abstract `performAttack` method which subclasses must implement.
     * @param startPosition The world position from which the attack originates.
     * @param direction The normalized direction vector for the attack.
     * @param projectileContainer The node under which any projectiles should be parented.
     */
    public execute(startPosition: Vec3, direction: Vec3, projectileContainer: Node): void {
        if (this.canExecute()) {
            // console.log(`Executing attack: ${this.attackName}`);
            this.performAttack(startPosition, direction, projectileContainer);
            this.lastExecutedTime = director.getTotalTime() * 0.001; // Update last execution time
        } else {
            // console.log(`${this.attackName} is on cooldown. Time remaining: ${this.cooldown - (director.getTotalTime() * 0.001 - this.lastExecutedTime)}s`);
        }
    }

    /**
     * Abstract method to be implemented by concrete attack subclasses.
     * This is where the specific logic for the attack (e.g., spawning a projectile, raycasting) goes.
     * @param startPosition The world position from which the attack originates.
     * @param direction The normalized direction vector for the attack.
     * @param projectileContainer The node under which any projectiles should be parented.
     */
    public abstract performAttack(startPosition: Vec3, direction: Vec3, projectileContainer: Node): void;
}
