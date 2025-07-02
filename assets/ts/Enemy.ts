import { _decorator, Component, Node, RigidBody2D, Vec2, Vec3, Collider2D } from 'cc';
import { GameManager } from './GameManager';
import { AttackSystem, AttackTypeValue } from './attack/AttackSystem';

const { ccclass, property } = _decorator;

@ccclass('Enemy')
export class Enemy extends Component {

    @property
    public totalHealth: number = 100;

    @property
    public moveSpeed: number = 2;

    @property({tooltip: '被击中后停顿的时间（秒）'})
    public stunDuration: number = 0.5;

    public playerNode: Node | null = null; 
    public gameManager: GameManager | null = null;

    private _rigidbody: RigidBody2D | null = null;
    private _collider: Collider2D | null = null;
    private _currentHealth: number = 0;
    private _isStunned: boolean = false; // 是否处于停顿状态
    
    // 统一版本号系统：防止重复伤害
    private _lastAttackVersion: number = -1; // 最后受到攻击的版本号

    onLoad() {
        console.log("🔄 敌人初始化开始");
        
        this._rigidbody = this.getComponent(RigidBody2D);
        this._collider = this.getComponent(Collider2D);
        this._currentHealth = this.totalHealth;
        
        // 确保碰撞器正确设置
        if (this._collider) {
            this._collider.enabled = true;
            console.log("✅ 找到敌人碰撞器");
            console.log("  - 碰撞器组:", this._collider.group);
            console.log("  - 碰撞器启用:", this._collider.enabled);
        } else {
            console.error("❌ Enemy Error: 敌人没有找到 Collider2D 组件!");
        }
        
        // 确保RigidBody2D启用碰撞监听
        if (this._rigidbody) {
            console.log("✅ 找到敌人刚体");
            console.log("  - 碰撞监听器启用:", this._rigidbody.enabledContactListener);
            console.log("  - 子弹模式(CCD):", this._rigidbody.bullet);
            console.log("  - 刚体组:", this._rigidbody.group);
            console.log("  - 刚体类型:", this._rigidbody.type);
            
            if (!this._rigidbody.bullet) {
                console.log("📝 敌人使用离散碰撞检测（正常）");
            }
        } else {
            console.error("❌ Enemy Error: 敌人没有找到 RigidBody2D 组件!");
        }
        
        console.log("✅ 敌人初始化完成");
        console.log("  - 血量:", this._currentHealth);
        console.log("  - 统一攻击版本号:", this._lastAttackVersion);
    }

    update(deltaTime: number) {
        // 如果处于停顿状态，或没有目标，则不执行移动逻辑
        if (this._isStunned || !this._rigidbody || !this.playerNode || !this.playerNode.isValid) {
            if (this._rigidbody) this._rigidbody.linearVelocity = Vec2.ZERO;
            return;
        }

        // 计算朝向玩家的方向并移动
        const playerPos = this.playerNode.worldPosition;
        const enemyPos = this.node.worldPosition;
        const direction = new Vec2(playerPos.x - enemyPos.x, playerPos.y - enemyPos.y);
        direction.normalize();
        const velocity = direction.multiplyScalar(this.moveSpeed);
        this._rigidbody.linearVelocity = velocity;
        
        // 让敌人朝向移动方向（朝向玩家）
        if (direction.length() > 0.1) {
            const angle = Math.atan2(direction.y, direction.x);
            // 转换为度数，减去90度使"上方"朝向移动方向
            const degrees = (angle * 180 / Math.PI) - 90;
            this.node.angle = degrees;
        }
    }

    public takeDamage(damage: number, attackType: AttackTypeValue = AttackSystem.AttackType.BULLET, version: number = 0) {
        // 如果已死亡，不再接受伤害
        if (this._currentHealth <= 0) {
            console.log("⚠️ 敌人已死亡，忽略伤害");
            return false;
        }

        // 统一版本号检查：防止重复伤害
        if (!AttackSystem.validateAttack(version, this._lastAttackVersion)) {
            console.log(`🛡️ 攻击版本号过低，忽略伤害 (攻击版本:${version}, 最后版本:${this._lastAttackVersion})`);
            return false;
        }
        
        // 更新最后攻击版本号
        this._lastAttackVersion = version;

        this._currentHealth -= damage;
        console.log(`🩸 敌人受到${attackType}伤害！`);
        console.log(`  - 伤害值: ${damage}`);
        console.log(`  - 攻击类型: ${attackType}`);
        console.log(`  - 版本号: ${version}`);
        console.log(`  - 剩余血量: ${this._currentHealth}/${this.totalHealth}`);
        
        this.applyStun();

        if (this._currentHealth <= 0) {
            console.log("💀 敌人血量归零，准备死亡");
            this.die();
        }
        
        return true; // 返回是否成功造成伤害
    }
    
    public getCurrentHealth(): number {
        return this._currentHealth;
    }

    private applyStun() {
        this._isStunned = true;
        if (this._rigidbody) {
            this._rigidbody.linearVelocity = Vec2.ZERO;
        }
        
        // 取消之前的定时器，避免重复定时器冲突
        this.unschedule(this.resetStun);
        
        // 使用定时器，在停顿结束后恢复状态
        this.scheduleOnce(this.resetStun, this.stunDuration);
    }
    
    private resetStun() {
        this._isStunned = false;
    }

    private die() {
        console.log("💀 敌人开始死亡流程");
        
        // 防止重复死亡
        if (!this.node || !this.node.isValid) {
            console.log("⚠️ 敌人节点已无效，跳过死亡流程");
            return;
        }
        
        // 通知GameManager自己已死亡
        if (this.gameManager && this.gameManager.node && this.gameManager.node.isValid) {
            console.log("📢 通知GameManager移除敌人");
            this.gameManager.removeEnemy(this.node);
        } else {
            console.warn("⚠️ GameManager无效，无法通知移除敌人");
        }
        
        // 安全销毁自身节点
        try {
            console.log("🗑️ 销毁敌人节点");
            this.node.destroy();
        } catch (error) {
            console.error("❌ 销毁敌人节点时发生错误:", error);
        }
    }
}