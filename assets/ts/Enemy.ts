import { _decorator, Component, Node, RigidBody2D, Vec2, Vec3, Collider2D, Sprite, Color } from 'cc';
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

    @property({tooltip: '受伤变红持续时间（秒）'})
    public damageFlashDuration: number = 0.3;

    public playerNode: Node | null = null; 
    public gameManager: GameManager | null = null;

    private _rigidbody: RigidBody2D | null = null;
    private _collider: Collider2D | null = null;
    private _sprite: Sprite | null = null;
    private _currentHealth: number = 0;
    private _isStunned: boolean = false; // 是否处于停顿状态
    private _originalColor: Color = new Color(); // 保存原始颜色
    
    // 按攻击类型分别记录版本号：防止重复伤害
    private _lastAttackVersions: Map<string, number> = new Map(); // 每种攻击类型的最后版本号

    onLoad() {
        console.log("🔄 敌人初始化开始");
        
        this._rigidbody = this.getComponent(RigidBody2D);
        this._collider = this.getComponent(Collider2D);
        this._sprite = this.getComponent(Sprite);
        this._currentHealth = this.totalHealth;
        
        // 保存原始颜色
        if (this._sprite) {
            this._originalColor = this._sprite.color.clone();
            console.log("✅ 找到敌人精灵组件，原始颜色已保存");
        }
        
        // 🔧 重要：确保碰撞器在所有状态下都正确设置
        if (this._collider) {
            this._collider.enabled = true;
            this._collider.sensor = false; // 确保不是传感器模式，要产生真实碰撞
            console.log("✅ 找到敌人碰撞器，物理配置：");
            console.log("  - 碰撞器组:", this._collider.group);
            console.log("  - 碰撞器启用:", this._collider.enabled);
            console.log("  - 传感器模式:", this._collider.sensor);
        } else {
            console.error("❌ Enemy Error: 敌人没有找到 Collider2D 组件!");
        }
        
        // 🔧 重要：确保敌人的刚体配置正确
        if (this._rigidbody) {
            this._rigidbody.enabled = true;
            this._rigidbody.enabledContactListener = true; // 启用碰撞监听器
            this._rigidbody.gravityScale = 0; // 敌人不受重力影响
            this._rigidbody.linearDamping = 0; // 不受空气阻力影响
            this._rigidbody.angularDamping = 2; // 适度角速度阻尼，防止过度旋转
            this._rigidbody.fixedRotation = false; // 允许旋转，让敌人面向移动方向
            // 敌人不需要CCD，因为移动速度相对较慢
            this._rigidbody.bullet = false;
            
            console.log("✅ 找到敌人刚体，物理配置：");
            console.log("  - 碰撞监听器启用:", this._rigidbody.enabledContactListener);
            console.log("  - 子弹模式(CCD):", this._rigidbody.bullet);
            console.log("  - 刚体组:", this._rigidbody.group);
            console.log("  - 刚体类型:", this._rigidbody.type);
            console.log("  - 重力系数:", this._rigidbody.gravityScale);
            console.log("  - 线性阻尼:", this._rigidbody.linearDamping);
            console.log("  - 角速度阻尼:", this._rigidbody.angularDamping);
        } else {
            console.error("❌ Enemy Error: 敌人没有找到 RigidBody2D 组件!");
        }
        
        console.log("✅ 敌人初始化完成");
        console.log("  - 血量:", this._currentHealth);
        console.log("  - 攻击版本号系统已初始化（按类型分别计数）");
        console.log("  - 物理碰撞检测已启用，确保在所有状态下都能被攻击命中");
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
        
        // 🔧 重要：确保敌人在受伤过程中碰撞器始终保持启用
        this.validateCollisionState();

        // 按攻击类型检查版本号：防止重复伤害
        const lastVersionForType = this._lastAttackVersions.get(attackType) || 0;
        if (!AttackSystem.validateAttack(version, lastVersionForType)) {
            console.log(`🛡️ ${attackType}攻击版本号过低，忽略伤害 (攻击版本:${version}, 该类型最后版本:${lastVersionForType})`);
            return false;
        }
        
        // 更新该攻击类型的最后版本号
        this._lastAttackVersions.set(attackType, version);

        this._currentHealth -= damage;
        console.log(`🩸 敌人受到${attackType}伤害！`);
        console.log(`  - 伤害值: ${damage}`);
        console.log(`  - 攻击类型: ${attackType}`);
        console.log(`  - 版本号: ${version}`);
        console.log(`  - 剩余血量: ${this._currentHealth}/${this.totalHealth}`);
        
        // 添加受伤变红效果
        this.showDamageFlash();
        
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

    /**
     * 显示受伤变红效果
     */
    private showDamageFlash() {
        if (!this._sprite) {
            console.warn("⚠️ 敌人没有精灵组件，无法显示受伤效果");
            return;
        }

        console.log("🔴 敌人受伤变红效果");
        
        // 立即变红
        this._sprite.color = Color.RED;
        
        // 取消之前的恢复颜色定时器，避免冲突
        this.unschedule(this.restoreOriginalColor);
        
        // 0.3秒后恢复原色
        this.scheduleOnce(this.restoreOriginalColor, this.damageFlashDuration);
    }

    /**
     * 恢复原始颜色
     */
    private restoreOriginalColor() {
        if (this._sprite) {
            this._sprite.color = this._originalColor;
            console.log("🎨 敌人颜色已恢复");
        }
    }

    private die() {
        console.log("💀 敌人开始死亡流程");
        
        // 防止重复死亡
        if (!this.node || !this.node.isValid) {
            console.log("⚠️ 敌人节点已无效，跳过死亡流程");
            return;
        }
        
        // 清理定时器
        this.unschedule(this.resetStun);
        this.unschedule(this.restoreOriginalColor);
        
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

    /**
     * 验证并修复碰撞器状态
     * 确保敌人在所有状态下都能被正确检测到
     */
    private validateCollisionState(): void {
        if (this._collider && !this._collider.enabled) {
            console.warn("⚠️ 发现敌人碰撞器被禁用，重新启用");
            this._collider.enabled = true;
        }
        
        if (this._rigidbody && !this._rigidbody.enabled) {
            console.warn("⚠️ 发现敌人刚体被禁用，重新启用");
            this._rigidbody.enabled = true;
        }
        
        if (this._collider && this._collider.sensor) {
            console.warn("⚠️ 发现敌人碰撞器为传感器模式，修复为真实碰撞");
            this._collider.sensor = false;
        }
    }
}