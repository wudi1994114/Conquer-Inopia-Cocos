import { _decorator, Component, Node, Vec3, Input, input, EventKeyboard, KeyCode, RigidBody2D, Vec2 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {
    @property({ type: Node })
    public bulletPrefab: Node = null!;

    @property({ type: Number })
    public moveSpeed: number = 300;

    @property({ type: Number })
    public fireRate: number = 0.2;

    private rigidBody: RigidBody2D = null!;
    private lastFireTime: number = 0;
    private moveDirection: Vec2 = new Vec2();

    start() {
        this.rigidBody = this.getComponent(RigidBody2D)!;
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    update(deltaTime: number) {
        this.move();
        this.checkFire();
    }

    private onKeyDown(event: EventKeyboard) {
        switch (event.keyCode) {
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
                this.moveDirection.x = -1;
                break;
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this.moveDirection.x = 1;
                break;
            case KeyCode.KEY_W:
            case KeyCode.ARROW_UP:
                this.moveDirection.y = 1;
                break;
            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN:
                this.moveDirection.y = -1;
                break;
        }
    }

    private onKeyUp(event: EventKeyboard) {
        switch (event.keyCode) {
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this.moveDirection.x = 0;
                break;
            case KeyCode.KEY_W:
            case KeyCode.ARROW_UP:
            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN:
                this.moveDirection.y = 0;
                break;
        }
    }

    private move() {
        if (this.moveDirection.length() > 0) {
            const velocity = this.moveDirection.clone().multiplyScalar(this.moveSpeed);
            this.rigidBody.linearVelocity = velocity;
        } else {
            this.rigidBody.linearVelocity = Vec2.ZERO;
        }
    }

    private checkFire() {
        const currentTime = Date.now() / 1000;
        if (input.getKey(KeyCode.SPACE) && currentTime - this.lastFireTime > this.fireRate) {
            this.fire();
            this.lastFireTime = currentTime;
        }
    }

    private fire() {
        if (this.bulletPrefab) {
            // 在这里创建子弹
            console.log("玩家开火！");
        }
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }
} 