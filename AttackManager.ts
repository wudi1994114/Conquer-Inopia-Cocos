import { _decorator, Component, Node, input, Input, EventKeyboard, KeyCode, Vec3, find, director } from 'cc';
import { BaseAttackComponent } from './BaseAttackComponent'; // Assuming BaseAttackComponent.ts is in the same directory
const { ccclass, property } = _decorator;

@ccclass('AttackManager')
export class AttackManager extends Component {

    @property({ type: [BaseAttackComponent], tooltip: "Drag attack components attached to this node or child nodes here." })
    public attacks: BaseAttackComponent[] = [];

    @property({ type: BaseAttackComponent, tooltip: "The currently active attack. If empty, defaults to the first in the attacks array." })
    public currentAttack: BaseAttackComponent | null = null;

    // Optional: Assign a specific node in the editor for projectiles.
    // If not assigned, it will try to find/create 'ProjectileContainer'.
    @property({ type: Node, tooltip: "Node to parent projectiles to. If null, will search for/create 'ProjectileContainer'."})
    public projectileContainerNode: Node | null = null;

    private _currentAttackIndex: number = 0;
    private _playerNode: Node | null = null; // Reference to the player node this manager is on

    onLoad() {
        this._playerNode = this.node; // Assuming AttackManager is on the Player node

        if (!this.projectileContainerNode) {
            this.projectileContainerNode = find("ProjectileContainer");
            if (!this.projectileContainerNode) {
                this.projectileContainerNode = new Node("ProjectileContainer");
                // Add to scene root or under Canvas, depending on your game structure
                // For simplicity, adding to scene root.
                director.getScene()?.addChild(this.projectileContainerNode);
                console.log("AttackManager: Created 'ProjectileContainer' node at scene root.");
            }
        }

        if (this.attacks.length > 0) {
            if (!this.currentAttack) {
                this.currentAttack = this.attacks[0];
            }
            this._currentAttackIndex = this.attacks.indexOf(this.currentAttack);
            if (this._currentAttackIndex === -1) { // Should not happen if currentAttack is from attacks array
                this._currentAttackIndex = 0;
                this.currentAttack = this.attacks[0];
            }
            console.log(`AttackManager: Initialized. Current attack: ${this.currentAttack?.attackName}`);
        } else {
            console.warn("AttackManager: No attacks assigned in the inspector.");
        }

        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        // Example for mouse click attack:
        // input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        // input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
    }

    onKeyDown(event: EventKeyboard) {
        if (event.keyCode === KeyCode.SPACE) {
            this.triggerCurrentAttack();
        } else if (event.keyCode >= KeyCode.DIGIT_1 && event.keyCode <= KeyCode.DIGIT_9) {
            const attackIndex = event.keyCode - KeyCode.DIGIT_1;
            this.switchAttack(attackIndex);
        }
        // Add other keys for specific attacks if needed
    }

    // Example for mouse input
    // onMouseDown(event: EventMouse) {
    //     if (event.getButton() === EventMouse.BUTTON_LEFT) {
    //         // Calculate direction based on mouse position relative to player
    //         // This requires converting screen coordinates to world coordinates
    //         const targetWorldPos = event.getUILocation(); // This is UI coord, needs conversion for world space
    //         const camera = director.getScene()?.getComponentInChildren(Camera);
    //         if (camera && this._playerNode) {
    //             const worldMousePos = new Vec3();
    //             camera.screenToWorld(worldMousePos, new Vec3(event.getLocationX(), event.getLocationY(), 0));

    //             const playerPos = this._playerNode.getWorldPosition();
    //             const direction = new Vec3();
    //             Vec3.subtract(direction, worldMousePos, playerPos);
    //             direction.z = 0; // Ensure it's 2D if needed
    //             direction.normalize();
    //             this.executeCurrentAttack(direction);
    //         }
    //     }
    // }

    switchAttack(index: number) {
        if (index >= 0 && index < this.attacks.length) {
            this.currentAttack = this.attacks[index];
            this._currentAttackIndex = index;
            console.log(`Switched to attack: ${this.currentAttack.attackName}`);
        } else {
            console.warn(`AttackManager: Invalid attack index ${index}.`);
        }
    }

    triggerCurrentAttack() {
        if (!this._playerNode) {
            console.error("AttackManager: Player node reference is missing.");
            return;
        }
        if (!this.projectileContainerNode || !this.projectileContainerNode.isValid) {
            console.error("AttackManager: ProjectileContainerNode is missing or invalid.");
            // Attempt to re-acquire or create
            this.projectileContainerNode = find("ProjectileContainer");
            if (!this.projectileContainerNode) {
                this.projectileContainerNode = new Node("ProjectileContainer");
                director.getScene()?.addChild(this.projectileContainerNode);
            }
            if (!this.projectileContainerNode || !this.projectileContainerNode.isValid) {
                 console.error("AttackManager: Failed to find or create ProjectileContainerNode. Cannot attack.");
                 return;
            }
        }

        // For now, default attack direction (e.g., right or based on player facing if implemented)
        // This needs to be more dynamic, e.g., based on mouse or player's current facing direction
        const attackDirection = new Vec3(1, 0, 0); // Default: Attack to the right

        // If Player.ts has a facing direction, use it:
        // const playerScript = this._playerNode.getComponent(Player);
        // if (playerScript && playerScript.getFacingDirection) { // Assuming Player.ts has getFacingDirection()
        //     attackDirection.set(playerScript.getFacingDirection());
        // }


        if (this.currentAttack) {
            // console.log(`AttackManager: Attempting to execute ${this.currentAttack.attackName}`);
            this.currentAttack.execute(this._playerNode.worldPosition.clone(), attackDirection, this.projectileContainerNode);
        } else {
            console.warn("AttackManager: No current attack selected or available.");
        }
    }
}
