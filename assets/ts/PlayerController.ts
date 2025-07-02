import { _decorator, Component, Node, input, Input, EventKeyboard, KeyCode, RigidBody2D, Vec2, view, Vec3 } from 'cc';
import { GameManager } from './GameManager';
import { EventManager, GameEvents, emitPlayerAttack, TargetData } from './EventManager';
import { SkillManager } from './SkillManager';

const { ccclass, property } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {

    @property({ tooltip: '玩家的移动速度' })
    public moveSpeed: number = 5;

    private gameManager: GameManager | null = null;

    @property({ tooltip: '自动攻击频率（每秒攻击次数）' })
    public autoAttackRate: number = 1;

    @property({ tooltip: '圆环攻击频率（每多少秒发射一次）' })
    public ringAttackInterval: number = 3;

    private skillManager: SkillManager | null = null;

    private _rigidbody: RigidBody2D | null = null;
    private _moveDirection: Vec2 = new Vec2(0, 0);

    onLoad() {
        this._rigidbody = this.getComponent(RigidBody2D);
        if (!this._rigidbody) {
            console.error("PlayerController Error: 玩家节点上必须挂载 RigidBody2D 组件!");
        }

        // 注册输入事件
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        
        // 初始化游戏管理器
        this.initializeGameManager();
        
        // 初始化技能系统
        this.initializeSkills();
        
        // 启动自动攻击
        this.startAutoAttack();
        
        // 启动圆环攻击
        this.startRingAttack();
        
        console.log("🎮 PlayerController 初始化完成");
    }

    onDestroy() {
        // 清理输入事件
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        
        // 取消所有定时器
        this.unschedule(this.performAutoAttack);
        this.unschedule(this.performRingAttack);
        
        console.log("🛑 PlayerController 清理完成");
    }

    onKeyDown(event: EventKeyboard) {
        switch(event.keyCode) {
            case KeyCode.KEY_W:
            case KeyCode.ARROW_UP:
                this._moveDirection.y = 1;
                break;
            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN:
                this._moveDirection.y = -1;
                break;
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
                this._moveDirection.x = -1;
                break;
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this._moveDirection.x = 1;
                break;
            case KeyCode.SPACE:
                this.triggerAttack('bullet');
                break;
            case KeyCode.KEY_Q:
                this.triggerAttack('laser');
                break;
            case KeyCode.KEY_E:
                this.triggerAttack('fireball');
                break;
            case KeyCode.KEY_R:
                this.triggerAttack('freeze');
                break;
            case KeyCode.KEY_T:
                this.triggerAttack('flyingDisc');
                break;
        }
    }

    onKeyUp(event: EventKeyboard) {
        switch(event.keyCode) {
            case KeyCode.KEY_W:
            case KeyCode.KEY_S:
            case KeyCode.ARROW_UP:
            case KeyCode.ARROW_DOWN:
                this._moveDirection.y = 0;
                break;
            case KeyCode.KEY_A:
            case KeyCode.KEY_D:
            case KeyCode.ARROW_LEFT:
            case KeyCode.ARROW_RIGHT:
                this._moveDirection.x = 0;
                break;
        }
    }

    update(deltaTime: number) {
        if (!this._rigidbody) return;
        
        // 获取屏幕边界
        const screenSize = view.getVisibleSize();
        const halfWidth = screenSize.width / 2;
        const halfHeight = screenSize.height / 2;
        
        // 获取当前位置
        const currentPos = this.node.position;
        
        // 检查边界并限制移动
        let constrainedVelocity = this._moveDirection.clone().normalize().multiplyScalar(this.moveSpeed);
        
        // 检查X轴边界
        if (currentPos.x <= -halfWidth && constrainedVelocity.x < 0) {
            constrainedVelocity.x = 0;
        } else if (currentPos.x >= halfWidth && constrainedVelocity.x > 0) {
            constrainedVelocity.x = 0;
        }
        
        // 检查Y轴边界
        if (currentPos.y <= -halfHeight && constrainedVelocity.y < 0) {
            constrainedVelocity.y = 0;
        } else if (currentPos.y >= halfHeight && constrainedVelocity.y > 0) {
            constrainedVelocity.y = 0;
        }
        
        // 应用约束后的速度
        this._rigidbody.linearVelocity = constrainedVelocity;
        
        // 让玩家朝向移动方向
        if (constrainedVelocity.length() > 0.1) {
            const angle = Math.atan2(constrainedVelocity.y, constrainedVelocity.x);
            const degrees = (angle * 180 / Math.PI) - 90;
            this.node.angle = degrees;
        }
        
        // 确保位置不超出边界（双重保险）
        const clampedX = Math.max(-halfWidth, Math.min(halfWidth, currentPos.x));
        const clampedY = Math.max(-halfHeight, Math.min(halfHeight, currentPos.y));
        
        if (clampedX !== currentPos.x || clampedY !== currentPos.y) {
            this.node.setPosition(clampedX, clampedY, currentPos.z);
        }
    }

    /**
     * 触发攻击（通过事件系统）
     */
    private triggerAttack(attackType: string) {
        const playerPos = this.node.worldPosition;
        const nearestEnemy = this.findNearestEnemy();
        
        // 创建安全的目标数据（避免Node循环引用）
        let targetData: TargetData | undefined = undefined;
        if (nearestEnemy) {
            const enemyPos = nearestEnemy.worldPosition;
            targetData = {
                name: nearestEnemy.name,
                uuid: nearestEnemy.uuid,
                position: { x: enemyPos.x, y: enemyPos.y },
                distance: Math.sqrt(
                    Math.pow(enemyPos.x - playerPos.x, 2) + 
                    Math.pow(enemyPos.y - playerPos.y, 2)
                ),
                _nodeRef: nearestEnemy // 保留引用供攻击系统使用
            };
        }
        
        // 发布攻击事件
        emitPlayerAttack({
            attackerId: 'player',
            attackType: attackType,
            damage: this.getAttackDamage(attackType),
            position: { x: playerPos.x, y: playerPos.y },
            target: targetData
        });

        console.log(`🎯 触发${attackType}攻击`, targetData ? `目标: ${targetData.name} 距离: ${targetData.distance.toFixed(1)}` : '无目标');
    }

    /**
     * 寻找最近的敌人
     */
    private findNearestEnemy(): Node | null {
        if (!this.gameManager?.activeEnemies) return null;

        let nearestEnemy = null;
        let minDistance = Infinity;
        const playerPos = this.node.worldPosition;

        for (const enemyNode of this.gameManager.activeEnemies) {
            if (enemyNode && enemyNode.isValid) {
                const distance = Vec3.distance(playerPos, enemyNode.worldPosition);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestEnemy = enemyNode;
                }
            }
        }

        return nearestEnemy;
    }

    /**
     * 获取攻击伤害（基础值，实际伤害由技能配置决定）
     */
    private getAttackDamage(attackType: string): number {
        const baseDamage: { [key: string]: number } = {
            'bullet': 10,
            'ring': 15,
            'laser': 50,
            'fireball': 35,
            'freeze': 25,
            'flyingDisc': 15
        };
        return baseDamage[attackType] || 10;
    }

    /**
     * 启动自动攻击
     */
    private startAutoAttack() {
        if (this.autoAttackRate <= 0) {
            console.log("⚠️ 自动攻击已禁用（频率为0）");
            return;
        }
        
        const attackInterval = 1 / this.autoAttackRate;
        console.log(`🤖 启动自动攻击，频率: ${this.autoAttackRate}次/秒`);
        this.schedule(this.performAutoAttack, attackInterval);
    }

    /**
     * 执行自动攻击
     */
    private performAutoAttack() {
        this.triggerAttack('bullet');
    }

    /**
     * 启动圆环攻击
     */
    private startRingAttack() {
        if (this.ringAttackInterval <= 0) {
            console.log("⚠️ 圆环攻击已禁用（间隔为0）");
            return;
        }
        
        console.log(`🌊 启动圆环攻击，间隔: ${this.ringAttackInterval}秒`);
        this.schedule(this.performRingAttack, this.ringAttackInterval);
    }

    /**
     * 执行圆环攻击
     */
    private performRingAttack() {
        if (this.skillManager) {
            const success = this.skillManager.activateSkill('ring');
            if (success) {
                console.log("✅ 圆环技能激活成功");
            } else {
                console.log("⏰ 圆环技能冷却中，改用事件触发");
                this.triggerAttack('ring');
            }
        } else {
            this.triggerAttack('ring');
        }
    }

    /**
     * 初始化游戏管理器
     */
    private initializeGameManager() {
        // 首先尝试在当前节点上查找
        this.gameManager = this.node.getComponent(GameManager);
        
        // 如果当前节点没有，尝试在父节点上查找
        if (!this.gameManager && this.node.parent) {
            this.gameManager = this.node.parent.getComponent(GameManager);
        }
        
        // 如果还没找到，尝试在场景根节点查找
        if (!this.gameManager) {
            const scene = this.node.scene;
            if (scene) {
                this.gameManager = scene.getComponentInChildren(GameManager);
            }
        }
        
        if (this.gameManager) {
            console.log("✅ GameManager 已自动连接");
        } else {
            console.warn("⚠️ 未找到 GameManager，敌人检测功能可能受限");
        }
    }

    /**
     * 初始化技能系统
     */
    private initializeSkills() {
        // 首先尝试获取已有的SkillManager组件
        this.skillManager = this.node.getComponent(SkillManager);
        
        // 如果没有找到，则自动添加一个
        if (!this.skillManager) {
            console.log("🔧 未找到SkillManager组件，自动添加");
            this.skillManager = this.node.addComponent(SkillManager);
        }

        if (this.skillManager) {
            console.log("🎯 初始化玩家技能系统");
            
            // 给玩家一些初始技能
            this.skillManager.acquireSkill('bullet', 1);
            this.skillManager.acquireSkill('ring', 1);
            this.skillManager.acquireSkill('laser', 1);
            this.skillManager.acquireSkill('fireball', 1);
            this.skillManager.acquireSkill('freeze', 1);
            this.skillManager.acquireSkill('flyingDisc', 1);
            this.skillManager.acquireSkill('multiShot', 1); // 被动技能
            
            console.log("✅ 玩家技能初始化完成");
            console.log("  - SkillManager 已通过 PlayerController 自动管理");
        } else {
            console.error("❌ 无法创建技能管理器！");
        }
    }
}