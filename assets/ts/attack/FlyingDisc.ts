import { _decorator, Node, Collider2D, Contact2DType, IPhysics2DContact, RigidBody2D } from 'cc';
import { EnemyController } from '../EnemyController';
import { BaseAttack } from './BaseAttack';
import { AttackSystem } from './AttackSystem';

const { ccclass, property } = _decorator;

@ccclass('FlyingDisc')
export class FlyingDisc extends BaseAttack {
    
    @property({tooltip: '围绕玩家的半径'})
    public orbitRadius: number = 80;
    
    @property({tooltip: '旋转速度（度/秒）'})
    public rotationSpeed: number = 180;
    
    @property({tooltip: '飞盘存在时间（秒）'})
    public lifetime: number = 10;
    
    @property({tooltip: '玩家节点引用'})
    public playerNode: Node | null = null;
    
    @property({tooltip: '攻击间隔（秒）'})
    public attackInterval: number = 0.5;

    private _hitEnemiesTime: Map<Node, number> = new Map(); // 记录击中敌人节点和上次攻击时间
    private _currentAngle: number = 0; // 当前旋转角度
    private _collider: Collider2D | null = null;

    protected getAttackName(): string {
        return "飞盘";
    }

    protected getAttackType() {
        return AttackSystem.AttackType.FLYING_DISC;
    }

    protected onAttackLoad(): void {
        this._collider = this.getComponent(Collider2D);
        
        if (this._collider) {
            console.log("✅ 找到飞盘碰撞器，启用碰撞监听");
            this._collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        } else {
            console.error("❌ FlyingDisc Error: 飞盘没有找到 Collider2D 组件!");
        }
        
        // 🔧 重要：飞盘设置为非刚体，完全通过代码控制位置
        const rigidbody = this.node.getComponent(RigidBody2D);
        if (rigidbody) {
            rigidbody.enabled = false; // 禁用刚体，防止物理引擎影响
            console.log("🛑 飞盘刚体已禁用，使用非物理运动");
        }
        
        // 如果没有设置玩家节点，尝试多种方式查找
        if (!this.playerNode) {
            this.playerNode = this.findPlayerNode();
            if (!this.playerNode) {
                console.error("❌ FlyingDisc Error: 无法找到玩家节点!");
            } else {
                console.log("✅ 飞盘找到玩家节点:", this.playerNode.name);
            }
        }
        
        // 随机初始角度，让多个飞盘不重叠
        this._currentAngle = Math.random() * 360;
        
        console.log("🥏 飞盘参数:");
        console.log("  - 轨道半径:", this.orbitRadius);
        console.log("  - 旋转速度:", this.rotationSpeed);
        console.log("  - 存在时间:", this.lifetime);
        console.log("  - 初始角度:", this._currentAngle.toFixed(2));
        console.log("  - 运动模式: 非刚体（代码控制位置）");
    }

    /**
     * 查找玩家节点的多种方式
     */
    private findPlayerNode(): Node | null {
        // 方法1：从父节点中查找名为"Player"的子节点
        if (this.node.parent) {
            const playerByName = this.node.parent.getChildByName("Player");
            if (playerByName) {
                console.log("🎯 通过父节点找到玩家节点:", playerByName.name);
                return playerByName;
            }
        }
        
        // 方法2：从场景根节点查找
        const scene = this.node.scene;
        if (scene) {
            const playerInScene = scene.getChildByName("Player");
            if (playerInScene) {
                console.log("🎯 通过场景根节点找到玩家节点:", playerInScene.name);
                return playerInScene;
            }
        }
        
        // 方法3：查找带有PlayerController组件的节点
        if (this.node.parent) {
            const children = this.node.parent.children;
            for (const child of children) {
                if (child.getComponent('PlayerController')) {
                    console.log("🎯 通过PlayerController组件找到玩家节点:", child.name);
                    return child;
                }
            }
        }
        
        // 方法4：从场景中查找带有PlayerController的节点
        if (scene) {
            const allNodes = scene.children;
            for (const node of allNodes) {
                if (node.getComponent('PlayerController')) {
                    console.log("🎯 通过场景中的PlayerController找到玩家节点:", node.name);
                    return node;
                }
            }
        }
        
        console.warn("⚠️ 所有查找玩家节点的方法都失败了");
        return null;
    }

    protected onAttackStart(): void {
        // 生命周期结束后销毁
        this.scheduleOnce(() => {
            console.log("⏰ 飞盘生命周期结束，准备销毁");
            this.destroyAttack();
        }, this.lifetime);
    }

    protected onAttackUpdate(deltaTime: number): void {
        if (!this.playerNode || !this.playerNode.isValid) {
            console.log("⚠️ 玩家节点无效，飞盘自毁");
            this.destroyAttack();
            return;
        }
        
        // 更新旋转角度
        this._currentAngle += this.rotationSpeed * deltaTime;
        if (this._currentAngle >= 360) {
            this._currentAngle -= 360;
        }
        
        // 计算飞盘位置（围绕玩家旋转）
        const radian = this._currentAngle * Math.PI / 180;
        const playerPos = this.playerNode.position;
        
        const newX = playerPos.x + Math.cos(radian) * this.orbitRadius;
        const newY = playerPos.y + Math.sin(radian) * this.orbitRadius;
        
        this.node.setPosition(newX, newY, playerPos.z);
        
        // 让飞盘自己也旋转（视觉效果）
        this.node.angle = this._currentAngle;
    }

    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        const currentTime = Date.now() / 1000; // 转换为秒
        
        // 尝试从被碰撞的物体上获取Enemy脚本
        const enemyScript = otherCollider.getComponent(EnemyController);

        if (enemyScript) {
            // 检查攻击间隔
            const lastHitTime = this._hitEnemiesTime.get(enemyScript.node) || 0;
            if (currentTime - lastHitTime < this.attackInterval) {
                return; // 攻击间隔未到
            }
            
            console.log("🥏 飞盘击中敌人:", enemyScript.node.name);
            console.log("  - 当前角度:", this._currentAngle.toFixed(2));
            
            // 飞盘可以重复攻击同一个敌人，但需要新的版本号
            const damageSuccessful = this.dealDamageToEnemy(enemyScript, this.getAttackType());
            
            if (damageSuccessful) {
                this._hitEnemiesTime.set(enemyScript.node, currentTime);
                this.markEnemyAsHit(enemyScript.node);
                console.log("📊 飞盘总击中次数:", this._hitEnemiesTime.size);
            }
        }
    }
    
    public setPlayerNode(player: Node) {
        this.playerNode = player;
        console.log("🎯 飞盘设置玩家节点:", player.name);
    }
    
    public setOrbitRadius(radius: number) {
        this.orbitRadius = radius;
        console.log("📐 飞盘设置轨道半径:", radius);
    }
    
    public getTotalHits(): number {
        return this._hitEnemiesTime.size;
    }
    
    protected onAttackDestroy(): void {
        console.log("  - 最终角度:", this._currentAngle.toFixed(2));
        console.log("  - 飞盘击中次数:", this._hitEnemiesTime.size);
    }
    
    protected onAttackComponentDestroy(): void {
        // 清理碰撞监听器
        if (this._collider) {
            this._collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
        // 清理击中记录
        this._hitEnemiesTime.clear();
    }
} 