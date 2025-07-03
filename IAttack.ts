import { Node, Vec3 } from 'cc';

export interface IAttack {
    name: string;
    cooldown: number;
    lastExecutedTime: number; // Stores time in seconds using director.getTotalTime() * 0.001

    /**
     * Optional initialization method called once when the attack component is ready.
     * Useful for one-time setup like finding required nodes or components.
     */
    init?(): void;

    /**
     * Checks if the attack can be executed (e.g., based on cooldown).
     * @returns True if the attack can be executed, false otherwise.
     */
    canExecute(): boolean;

    /**
     * Executes the attack.
     * @param startPosition The world position where the attack originates.
     * @param direction The normalized direction vector of the attack.
     * @param projectileContainer The node to which any spawned projectiles should be parented.
     */
    execute(startPosition: Vec3, direction: Vec3, projectileContainer: Node): void;
}
