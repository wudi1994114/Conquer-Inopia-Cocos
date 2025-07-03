import { _decorator, Component, Node, input, Input, EventKeyboard, KeyCode, Vec3, CCInteger, director, RigidBody2D, Vec2 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Player')
export class Player extends Component {
    @property(CCInteger)
    public moveSpeed: number = 200;

    private _moveDirection: Vec3 = new Vec3(0, 0, 0);
    private _isMovingUp: boolean = false;
    private _isMovingDown: boolean = false;
    private _isMovingLeft: boolean = false;
    private _isMovingRight: boolean = false;
    private _rigidBody: RigidBody2D | null = null;

    onLoad() {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        this._rigidBody = this.getComponent(RigidBody2D);
        if (!this._rigidBody) {
            console.warn("Player is missing RigidBody2D component. Movement might not work as expected with physics.");
        }
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    onKeyDown(event: EventKeyboard) {
        switch(event.keyCode) {
            case KeyCode.KEY_W:
            case KeyCode.ARROW_UP:
                this._isMovingUp = true;
                break;
            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN:
                this._isMovingDown = true;
                break;
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
                this._isMovingLeft = true;
                break;
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this._isMovingRight = true;
                break;
        }
        this.updateMoveDirection();
    }

    onKeyUp(event: EventKeyboard) {
        switch(event.keyCode) {
            case KeyCode.KEY_W:
            case KeyCode.ARROW_UP:
                this._isMovingUp = false;
                break;
            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN:
                this._isMovingDown = false;
                break;
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
                this._isMovingLeft = false;
                break;
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this._isMovingRight = false;
                break;
        }
        this.updateMoveDirection();
    }

    updateMoveDirection() {
        this._moveDirection.x = 0;
        this._moveDirection.y = 0;

        if (this._isMovingUp)    this._moveDirection.y += 1;
        if (this._isMovingDown)  this._moveDirection.y -= 1;
        if (this.<em>isMovingLeft)  this.<em>moveDirection.x -= 1;
        if (this.<em>isMovingRight) this.<em>moveDirection.x += 1;

        // Normalize if moving diagonally to prevent faster speed
        if (this.<em>moveDirection.lengthSqr() > 1) {
            this.<em>moveDirection.normalize();
        }
    }

    update(deltaTime: number) {
        if (this.<em>rigidBody) {
            // Physics-based movement
            const velocity = new Vec2(this.<em>moveDirection.x * this.moveSpeed, this.<em>moveDirection.y * this.moveSpeed);
            this.<em>rigidBody.linearVelocity = velocity;
        } else {
            // Direct transform manipulation (fallback if no RigidBody2D)
            const currentPosition = this.node.getPosition();
            const displacement = new Vec3();
            Vec3.multiplyScalar(displacement, this.<em>moveDirection, this.moveSpeed * deltaTime);
            this.node.setPosition(currentPosition.add(displacement));
        }
    }
}
