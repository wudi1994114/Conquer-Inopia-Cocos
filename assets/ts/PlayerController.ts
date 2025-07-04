import { _decorator, Component, Node, input, Input, EventKeyboard, KeyCode, RigidBody2D, Vec2, view, Vec3, Sprite } from 'cc';
import { GameManager } from './GameManager';
import { EventManager, GameEvents, emitPlayerAttack, TargetData } from './EventManager';
import { SkillManager } from './SkillManager';
import { PhysicsGroups } from './PhysicsGroups';

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
    private _sprite: Sprite | null = null;
    private _lastCleanupTime: number = 0; // 上次清理检查的时间
    private readonly CLEANUP_CHECK_INTERVAL: number = 5000; // 每5秒检查一次重复组件
    private _lastMoveState: boolean = false; // 用于调试移动状态变化

    onLoad() {
        
        // 获取基础组件
        this._rigidbody = this.getComponent(RigidBody2D);
        this._sprite = this.getComponent(Sprite);
        
        if (!this._rigidbody) {
            console.error("PlayerController Error: 玩家节点上必须挂载 RigidBody2D 组件!");
        } else {
            // 🔧 重要：锁定角度旋转，防止物理碰撞导致玩家旋转
            this._rigidbody.fixedRotation = true;
            console.log("🔒 玩家刚体角度已锁定，防止碰撞旋转");
        }
        
        if (!this._sprite) {
            console.warn("PlayerController Warning: 玩家节点上没有找到 Sprite 组件");
        } else {
            console.log("✅ 找到玩家精灵组件");
            // 确保精灵组件状态正确
            this._sprite.enabled = true;
        }

        // 清理可能的重复组件
        this.cleanupDuplicateComponents();

        // 注册输入事件
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        
        // 初始化游戏管理器
        this.initializeGameManager();
        
        // 初始化技能系统
        this.initializeSkills();
        
        // 🔧 启用物理分组系统：配置玩家为PLAYER分组
        PhysicsGroups.configurePlayerPhysics(this.node);
        console.log("🛡️ 已配置玩家的物理分组，将自动避免与玩家攻击碰撞");
        
        // 启动自动攻击
        this.startAutoAttack();
        
        // 启动圆环攻击
        this.startRingAttack();
        
        console.log("🎮 PlayerController 初始化完成");
    }

    onDestroy() {
        console.log("🗑️ PlayerController 开始销毁");
        
        // 清理输入事件
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        
        // 取消所有定时器
        this.unschedule(this.performAutoAttack);
        this.unschedule(this.performRingAttack);
        
        // 清理组件引用
        this._rigidbody = null;
        this._sprite = null;
        this.skillManager = null;
        this.gameManager = null;
        
        // 重置清理时间
        this._lastCleanupTime = 0;
        this._lastMoveState = false;
        
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
        
        // 定期检查重复组件（每5秒一次）
        const currentTime = Date.now();
        if (currentTime - this._lastCleanupTime > this.CLEANUP_CHECK_INTERVAL) {
            this.runtimeCleanupCheck();
            this._lastCleanupTime = currentTime;
        }
        
        // 获取屏幕边界
        const screenSize = view.getVisibleSize();
        const halfWidth = screenSize.width / 2;
        const halfHeight = screenSize.height / 2;
        
        // 获取当前位置
        const currentPos = this.node.position;
        
        // 检查边界并限制移动
        // 🔧 修复：避免对零向量进行normalize，防止NaN导致的异常行为
        let constrainedVelocity = new Vec2(0, 0);
        if (this._moveDirection.length() > 0.01) {
            constrainedVelocity = this._moveDirection.clone().normalize().multiplyScalar(this.moveSpeed);
        }
        
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
        
        // 🔧 修复：玩家使用8个固定方向，避免物理碰撞导致的随机旋转
        if (this._moveDirection.length() > 0.1) {
            const fixedAngle = this.getFixed8DirectionAngle(this._moveDirection);
            this.node.angle = fixedAngle;
        }
        // 当没有输入时，保持当前固定角度不变
        
        // 调试信息（仅在移动状态变化时输出）
        const isMoving = this._moveDirection.length() > 0.01;
        if (isMoving !== this._lastMoveState) {
            console.log(`🎮 玩家移动状态变化: ${isMoving ? '开始移动' : '停止移动'}`);
            console.log(`  - 移动方向: (${this._moveDirection.x.toFixed(2)}, ${this._moveDirection.y.toFixed(2)})`);
            console.log(`  - 固定角度: ${this.node.angle.toFixed(0)}° (${this.getDirectionName(this.node.angle)})`);
            this._lastMoveState = isMoving;
        }
        
        // 确保位置不超出边界（双重保险）
        const clampedX = Math.max(-halfWidth, Math.min(halfWidth, currentPos.x));
        const clampedY = Math.max(-halfHeight, Math.min(halfHeight, currentPos.y));
        
        if (clampedX !== currentPos.x || clampedY !== currentPos.y) {
            this.node.setPosition(clampedX, clampedY, currentPos.z);
        }
        
        // 确保Sprite组件状态正确
        if (this._sprite && this._sprite.isValid) {
            if (!this._sprite.enabled) {
                console.log("🔧 重新启用玩家Sprite组件");
                this._sprite.enabled = true;
            }
        }
    }

    /**
     * 计算8个固定方向的角度
     * 防止物理碰撞导致的随机旋转
     */
    private getFixed8DirectionAngle(direction: Vec2): number {
        // 8个固定方向的角度（以度为单位）
        // 注意：Cocos Creator中，0度是向右，-90度是向上
        const angles = {
            right: 0,      // 右 →
            downRight: 45, // 右下 ↘
            down: 90,      // 下 ↓ 
            downLeft: 135, // 左下 ↙
            left: 180,     // 左 ←
            upLeft: 225,   // 左上 ↖ (或 -135)
            up: 270,       // 上 ↑ (或 -90)
            upRight: 315   // 右上 ↗ (或 -45)
        };

        // 计算输入方向的角度
        let inputAngle = Math.atan2(direction.y, direction.x) * 180 / Math.PI;
        
        // 确保角度在0-360范围内
        if (inputAngle < 0) inputAngle += 360;

        // 根据输入方向确定最接近的8个方向之一
        if (direction.x > 0.7 && Math.abs(direction.y) < 0.7) {
            // 主要向右
            return angles.right;
        } else if (direction.x > 0.7 && direction.y > 0.7) {
            // 右下
            return angles.downRight;
        } else if (Math.abs(direction.x) < 0.7 && direction.y > 0.7) {
            // 主要向下
            return angles.down;
        } else if (direction.x < -0.7 && direction.y > 0.7) {
            // 左下
            return angles.downLeft;
        } else if (direction.x < -0.7 && Math.abs(direction.y) < 0.7) {
            // 主要向左
            return angles.left;
        } else if (direction.x < -0.7 && direction.y < -0.7) {
            // 左上
            return angles.upLeft;
        } else if (Math.abs(direction.x) < 0.7 && direction.y < -0.7) {
            // 主要向上
            return angles.up;
        } else if (direction.x > 0.7 && direction.y < -0.7) {
            // 右上
            return angles.upRight;
        }

        // 默认向上（不应该到达这里）
        return angles.up;
    }

    /**
     * 根据角度获取方向名称（用于调试）
     */
    private getDirectionName(angle: number): string {
        // 规范化角度到0-360范围
        let normalizedAngle = angle % 360;
        if (normalizedAngle < 0) normalizedAngle += 360;

        switch (normalizedAngle) {
            case 0: return "右→";
            case 45: return "右下↘";
            case 90: return "下↓";
            case 135: return "左下↙";
            case 180: return "左←";
            case 225: return "左上↖";
            case 270: return "上↑";
            case 315: return "右上↗";
            default: return `未知(${normalizedAngle}°)`;
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
        console.log(`📍 玩家位置: (${playerPos.x.toFixed(1)}, ${playerPos.y.toFixed(1)})`);
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
     * 清理可能的重复组件
     */
    private cleanupDuplicateComponents() {
        // 检查是否有重复的SkillManager组件
        const skillManagers = this.node.getComponents(SkillManager);
        if (skillManagers.length > 1) {
            console.warn(`⚠️ 发现 ${skillManagers.length} 个SkillManager组件，清理重复组件`);
            // 保留第一个，删除其他的
            for (let i = 1; i < skillManagers.length; i++) {
                console.log(`🗑️ 删除重复的SkillManager组件 ${i}`);
                skillManagers[i].destroy();
            }
        }
        
        // 检查是否有重复的PlayerController组件
        const playerControllers = this.node.getComponents(PlayerController);
        if (playerControllers.length > 1) {
            console.warn(`⚠️ 发现 ${playerControllers.length} 个PlayerController组件，这可能导致行为异常`);
            // 不删除，但记录警告
        }
        
        // 更彻底地处理重复的Sprite组件
        const sprites = this.node.getComponents(Sprite);
        if (sprites.length > 1) {
            console.warn(`⚠️ 发现 ${sprites.length} 个Sprite组件，可能导致渲染问题`);
            // 删除多余的Sprite组件而不是仅仅禁用
            for (let i = 1; i < sprites.length; i++) {
                console.log(`🗑️ 删除重复的Sprite组件 ${i}`);
                sprites[i].destroy();
            }
        }
        
        // 检查是否有重复的RigidBody2D组件
        const rigidbodies = this.node.getComponents(RigidBody2D);
        if (rigidbodies.length > 1) {
            console.warn(`⚠️ 发现 ${rigidbodies.length} 个RigidBody2D组件，可能导致物理行为异常`);
            // 删除多余的RigidBody2D组件
            for (let i = 1; i < rigidbodies.length; i++) {
                console.log(`🗑️ 删除重复的RigidBody2D组件 ${i}`);
                rigidbodies[i].destroy();
            }
        }
        
        // 检查子节点中是否有重复的玩家相关组件
        this.cleanupChildNodes();
    }
    
    /**
     * 清理子节点中可能的重复玩家组件
     */
    private cleanupChildNodes() {
        const children = this.node.children;
        for (let i = children.length - 1; i >= 0; i--) {
            const child = children[i];
            
            // 检查子节点是否也有PlayerController组件（这不应该存在）
            const childPlayerController = child.getComponent(PlayerController);
            if (childPlayerController) {
                console.warn(`⚠️ 子节点 ${child.name} 有PlayerController组件，这可能导致问题`);
                console.log(`🗑️ 删除子节点上的PlayerController组件`);
                childPlayerController.destroy();
            }
            
            // 检查是否有多余的玩家相关子节点
            if (child.name.toLowerCase().includes('player') && child !== this.node) {
                console.warn(`⚠️ 发现可能的重复玩家节点: ${child.name}`);
                // 可以选择删除或重命名，这里先记录日志
            }
        }
    }

    /**
     * 运行时清理检查 - 定期检查是否有新出现的重复组件
     */
    private runtimeCleanupCheck() {
        // 检查Sprite组件数量
        const sprites = this.node.getComponents(Sprite);
        if (sprites.length > 1) {
            console.warn(`🔍 运行时发现重复Sprite组件 (${sprites.length}个)，立即清理`);
            for (let i = 1; i < sprites.length; i++) {
                console.log(`🗑️ 运行时删除重复Sprite组件 ${i}`);
                sprites[i].destroy();
            }
        }
        
        // 检查RigidBody2D组件数量
        const rigidbodies = this.node.getComponents(RigidBody2D);
        if (rigidbodies.length > 1) {
            console.warn(`🔍 运行时发现重复RigidBody2D组件 (${rigidbodies.length}个)，立即清理`);
            for (let i = 1; i < rigidbodies.length; i++) {
                console.log(`🗑️ 运行时删除重复RigidBody2D组件 ${i}`);
                rigidbodies[i].destroy();
            }
        }
        
        // 检查场景中是否有其他名为Player的节点
        const scene = this.node.scene;
        if (scene) {
            const playerNodes = scene.getComponentsInChildren(PlayerController);
            if (playerNodes.length > 1) {
                console.warn(`🔍 场景中发现多个PlayerController (${playerNodes.length}个)`);
                // 记录但不删除，因为这可能是合法的多玩家情况
            }
        }
        
        // 确保当前Sprite组件引用正确
        if (!this._sprite || !this._sprite.isValid) {
            console.log("🔧 重新获取Sprite组件引用");
            this._sprite = this.getComponent(Sprite);
            if (this._sprite) {
                this._sprite.enabled = true;
            }
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
        } else {
            console.log("✅ 找到现有的SkillManager组件");
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