import { _decorator, Component, Node, Collider2D, Vec3, Vec2, RigidBody2D } from 'cc';
import { EnemyController } from '../EnemyController';
import { AttackSystem, AttackTypeValue } from './AttackSystem';
import { SkillConfig, SkillInstance, SkillUtils, SkillGlobalConfig } from './skill-config';
import { EventManager, GameEvents, PlayerAttackEventData } from '../EventManager';
import { GameManager } from '../GameManager';

const { ccclass, property } = _decorator;

/**
 * 瞄准模式枚举
 */
export enum AimingMode {
    NONE = 'none',                    // 无瞄准，使用默认方向
    NEAREST_ENEMY = 'nearestEnemy',   // 瞄准最近的敌人
    MANUAL_TARGET = 'manualTarget',   // 手动指定目标位置
    FIXED_DIRECTION = 'fixedDirection' // 固定方向发射
}

/**
 * 运动模式枚举
 */
export enum MovementMode {
    LINEAR = 'linear',           // 直线运动
    PROJECTILE = 'projectile',   // 抛物线运动
    TRACKING = 'tracking',       // 追踪运动
    STATIC = 'static',           // 静态，不移动
    CUSTOM = 'custom'           // 自定义运动（子类实现）
}

/**
 * 瞄准配置接口
 */
export interface AimingConfig {
    mode: AimingMode;
    movementMode: MovementMode;
    manualTarget?: Vec3;          // 手动目标位置
    fixedDirection?: Vec2;        // 固定方向向量
    speed: number;                // 移动速度
    useWorldCoordinates: boolean; // 是否使用世界坐标计算
}

/**
 * 瞄准结果接口
 */
export interface AimingResult {
    success: boolean;             // 瞄准是否成功
    targetPosition?: Vec3;        // 目标位置
    direction: Vec2;              // 移动方向向量
    velocity: Vec2;               // 速度向量
}

/**
 * 攻击基类 - 所有攻击类型的抽象父类
 * 支持配置化和事件驱动的架构
 */
@ccclass('BaseAttack')
export abstract class BaseAttack extends Component {

    public gameManager: GameManager | null = null; // 添加 Game Manager 引用
    protected damage: number = 0; // 伤害值
    protected _version: number = 0; // 攻击版本号
    private _hitEnemies: Set<Node> = new Set(); // 用于记录已击中的敌人
    
    // ========== 瞄准系统属性 ==========
    protected _aimingConfig: AimingConfig | null = null; // 瞄准配置
    protected _targetPosition: Vec3 = new Vec3(); // 目标位置
    protected _direction: Vec2 = new Vec2(); // 移动方向

    onLoad() {
        // 获取该攻击类型的版本号
        this._version = AttackSystem.getNextAttackVersion(this.getAttackType());
        
        // 调用子类的初始化方法
        this.onAttackLoad();
    }

    start() {
        // 检查是否有敌人，没有敌人就不执行攻击开始逻辑
        if (!this.shouldExecuteAttack()) {
            return;
        }
        
        this.onAttackStart();
    }

    update(deltaTime: number) {
        // 检查是否有敌人，没有敌人就不执行攻击更新逻辑
        if (!this.shouldExecuteAttack()) {
            return;
        }
        
        this.onAttackUpdate(deltaTime);
    }

    /**
     * 造成伤害的通用方法
     * @param enemyScript 敌人的脚本组件
     * @returns boolean - 是否成功造成伤害
     */
    protected dealDamageToEnemy(enemyScript: EnemyController, attackType: AttackTypeValue): boolean {
        if (!enemyScript || !enemyScript.isValid) {
            return false;
        }

        const damage = this.getDamage();
        enemyScript.takeDamage(damage, attackType, this._version);
        
        // 发布攻击命中事件
        EventManager.emit(GameEvents.ATTACK_HIT, {
            attackType: this.getAttackType(),
            damage: damage,
            target: enemyScript.node.name,
            version: this._version
        });

        // 调用命中回调，用于触发子类的特殊逻辑（如弹射）
        this.onDamageDealt(enemyScript);
        
        return true;
    }

    /**
     * 检查敌人是否已经被这次攻击击中过
     * @param enemyNode 敌人节点
     * @returns 是否已击中
     */
    protected hasHitEnemy(enemyNode: Node): boolean {
        return this._hitEnemies.has(enemyNode);
    }

    /**
     * 标记敌人已被击中
     * @param enemyNode 敌人节点
     */
    protected markEnemyAsHit(enemyNode: Node): void {
        this._hitEnemies.add(enemyNode);
    }

    /**
     * 检查一个敌人是否已被击中
     */
    protected isEnemyHit(enemyNode: Node): boolean {
        return this._hitEnemies.has(enemyNode);
    }

    /**
     * 重置已击中列表（用于可多次造成伤害的攻击）
     */
    protected resetHitEnemies(): void {
        this._hitEnemies.clear();
    }

    /**
     * 获取所有敌人
     * @returns Enemy[]
     */
    protected getAllEnemies(): Node[] {
        if (this.gameManager && this.gameManager.activeEnemies) {
            return this.gameManager.activeEnemies;
        }
        return [];
    }

    /**
     * 检测场景中是否有敌人
     * @returns 是否有敌人存在
     */
    protected hasEnemiesAvailable(): boolean {
        const enemies = this.getAllEnemies();
        return enemies.length > 0;
    }

    /**
     * 检测是否应该执行攻击逻辑
     * 包含敌人检测和其他通用检测
     * @returns 是否应该执行攻击
     */
    protected shouldExecuteAttack(): boolean {
        // 🔧 对于圆环攻击，无论是否有敌人都应该执行（圆环需要扩散）
        if (this.getAttackType() === AttackSystem.AttackType.RING) {
            return true;
        }
        
        // 🔧 对于冰冻攻击，也应该无论是否有敌人都执行（范围效果）
        if (this.getAttackType() === AttackSystem.AttackType.FREEZE) {
            return true;
        }
        
        // 🔧 对于火球扩展（AOE光环），也应该无论是否有敌人都执行
        if (this.getAttackType() === AttackSystem.AttackType.FIREBALL_EXTENSION) {
            return true;
        }
        
        // 🔧 对于闪电链，也应该无论是否有敌人都执行（会在内部判断并处理）
        if (this.getAttackType() === AttackSystem.AttackType.THUNDER_CHAIN) {
            return true;
        }
        
        // 对于其他攻击类型，检查是否有敌人
        if (!this.hasEnemiesAvailable()) {
            return false;
        }
        
        // 可以在这里添加其他通用的攻击前检测逻辑
        // 例如：检查游戏是否暂停、检查攻击是否还有效等
        
        return true;
    }

    /**
     * 获取GameManager的缓存目标信息
     * @returns 缓存的目标信息，如果没有则返回null
     */
    protected getCachedTargetFromGameManager(): { position: { x: number; y: number }; name: string } | null {
        console.log("🎯 BaseAttack: 尝试从GameManager获取缓存目标...");
        
        const scene = this.node.scene;
        if (!scene) {
            console.warn('⚠️ BaseAttack: 无法获取场景信息');
            return null;
        }
        
        const gameManager = scene.getComponentInChildren(GameManager) as GameManager;
        if (!gameManager) {
            console.warn('⚠️ BaseAttack: 没有找到GameManager');
            return null;
        }
        
        // 使用GameManager的缓存目标
        const cachedEnemy = gameManager.getCachedNearestEnemy();
        console.log("🎯 BaseAttack: GameManager返回的缓存敌人:", cachedEnemy);
        
        if (cachedEnemy) {
            const result = {
                position: cachedEnemy.position,
                name: cachedEnemy.name
            };
            console.log("✅ BaseAttack: 成功获取缓存目标:", result);
            return result;
        }
        
        console.log("⚠️ BaseAttack: 没有找到缓存目标");
        return null;
    }

    /**
     * 销毁攻击
     */
    protected destroyAttack(): void {
        this.onAttackDestroy();
        
        if (this.node && this.node.isValid) {
            this.node.destroy();
        }
    }

    onDestroy() {
        this._hitEnemies.clear();
        this.onAttackComponentDestroy();
    }

    /**
     * 初始化攻击组件
     * @param skillInstance 技能实例
     * @param gameManager 游戏管理器
     */
    public init(skillInstance: SkillInstance, gameManager: GameManager): void {
        this.damage = skillInstance.config.damage; // 从 config 中获取伤害
        this.gameManager = gameManager;
        // 获取该攻击类型的版本号
        this._version = AttackSystem.getNextAttackVersion(this.getAttackType());
        
        // 调用子类的初始化方法
        this.onAttackLoad();
    }

    /**
     * 获取当前攻击的伤害值
     */
    protected getDamage(): number {
        return SkillGlobalConfig.getActualDamage(this.damage);
    }

    // ========== 瞄准系统方法 ==========

    /**
     * 设置瞄准配置
     * @param config 瞄准配置
     */
    protected setAimingConfig(config: AimingConfig): void {
        this._aimingConfig = config;
        console.log(`🎯 ${this.getAttackName()}: 设置瞄准配置`, config);
    }

    /**
     * 执行瞄准计算
     * @returns 瞄准结果
     */
    protected executeAiming(): AimingResult {
        if (!this._aimingConfig) {
            console.warn(`⚠️ ${this.getAttackName()}: 未设置瞄准配置，使用默认方向`);
            return {
                success: false,
                direction: new Vec2(1, 0), // 默认向右
                velocity: new Vec2(300, 0) // 默认速度
            };
        }

        const config = this._aimingConfig;
        const currentPos = config.useWorldCoordinates ? this.node.worldPosition : this.node.position;

        switch (config.mode) {
            case AimingMode.NEAREST_ENEMY:
                return this.aimAtNearestEnemy(currentPos, config);
            
            case AimingMode.MANUAL_TARGET:
                return this.aimAtManualTarget(currentPos, config);
            
            case AimingMode.FIXED_DIRECTION:
                return this.aimAtFixedDirection(config);
            
            case AimingMode.NONE:
            default:
                return this.aimWithoutTarget(config);
        }
    }

    /**
     * 瞄准最近的敌人
     */
    private aimAtNearestEnemy(currentPos: Vec3, config: AimingConfig): AimingResult {
        console.log(`🎯 ${this.getAttackName()}: 开始瞄准最近敌人...`);
        console.log(`  - 当前位置: (${currentPos.x.toFixed(1)}, ${currentPos.y.toFixed(1)})`);
        
        const cachedTarget = this.getCachedTargetFromGameManager();
        
        if (cachedTarget) {
            this._targetPosition.set(cachedTarget.position.x, cachedTarget.position.y, 0);
            const direction = this.calculateDirection(currentPos, this._targetPosition, config);
            const velocity = this.calculateVelocity(direction, config);
            
            // 确保方向向量被正确设置
            this._direction.set(direction);

            console.log(`✅ ${this.getAttackName()}: 瞄准最近敌人成功 ${cachedTarget.name}`);
            console.log(`  - 当前位置: (${currentPos.x.toFixed(1)}, ${currentPos.y.toFixed(1)})`);
            console.log(`  - 目标位置: (${this._targetPosition.x.toFixed(1)}, ${this._targetPosition.y.toFixed(1)})`);
            console.log(`  - 方向向量: (${direction.x.toFixed(3)}, ${direction.y.toFixed(3)})`);
            console.log(`  - 速度向量: (${velocity.x.toFixed(1)}, ${velocity.y.toFixed(1)})`);
            
            return {
                success: true,
                targetPosition: this._targetPosition.clone(),
                direction: direction,
                velocity: velocity
            };
        } else {
            console.log(`⚠️ ${this.getAttackName()}: 没有找到可瞄准的敌人，使用默认方向`);
            return this.aimWithoutTarget(config);
        }
    }

    /**
     * 瞄准手动指定的目标
     */
    private aimAtManualTarget(currentPos: Vec3, config: AimingConfig): AimingResult {
        if (!config.manualTarget) {
            console.warn(`⚠️ ${this.getAttackName()}: 手动瞄准模式但未设置目标位置`);
            return this.aimWithoutTarget(config);
        }

        this._targetPosition.set(config.manualTarget);
        const direction = this.calculateDirection(currentPos, this._targetPosition, config);
        const velocity = this.calculateVelocity(direction, config);
        
        console.log(`🎯 ${this.getAttackName()}: 瞄准手动目标`);
        console.log(`  - 目标位置: (${this._targetPosition.x.toFixed(1)}, ${this._targetPosition.y.toFixed(1)})`);
        
        return {
            success: true,
            targetPosition: this._targetPosition.clone(),
            direction: direction,
            velocity: velocity
        };
    }

    /**
     * 固定方向瞄准
     */
    private aimAtFixedDirection(config: AimingConfig): AimingResult {
        if (!config.fixedDirection) {
            console.warn(`⚠️ ${this.getAttackName()}: 固定方向模式但未设置方向向量`);
            return this.aimWithoutTarget(config);
        }

        const direction = config.fixedDirection.clone().normalize();
        const velocity = this.calculateVelocity(direction, config);
        
        console.log(`🎯 ${this.getAttackName()}: 使用固定方向`);
        console.log(`  - 方向向量: (${direction.x.toFixed(3)}, ${direction.y.toFixed(3)})`);
        
        return {
            success: true,
            direction: direction,
            velocity: velocity
        };
    }

    /**
     * 无瞄准模式
     */
    private aimWithoutTarget(config: AimingConfig): AimingResult {
        const direction = new Vec2(1, 0); // 默认向右
        const velocity = this.calculateVelocity(direction, config);
        
        return {
            success: false,
            direction: direction,
            velocity: velocity
        };
    }

    /**
     * 计算方向向量
     */
    private calculateDirection(fromPos: Vec3, toPos: Vec3, config: AimingConfig): Vec2 {
        const direction = new Vec2(toPos.x - fromPos.x, toPos.y - fromPos.y);

        // 安全检查：如果向量长度过小，则使用默认方向，防止NaN错误
        if (direction.lengthSqr() < 0.0001) {
            console.warn(`⚠️ ${this.getAttackName()}: 目标位置与当前位置重合，使用默认方向`);
            return new Vec2(1, 0); // 默认向右
        }
        
        // 根据运动模式调整方向
        switch (config.movementMode) {
            case MovementMode.PROJECTILE:
                // 抛物线运动：添加向上分量
                direction.y += Math.abs(direction.x) * 0.3;
                break;
                
            case MovementMode.TRACKING:
                // 追踪运动：保持原始方向
                break;
                
            case MovementMode.LINEAR:
            default:
                // 直线运动：保持原始方向
                break;
        }
        
        return direction.normalize();
    }

    /**
     * 计算速度向量
     */
    private calculateVelocity(direction: Vec2, config: AimingConfig): Vec2 {
        return direction.multiplyScalar(config.speed);
    }

    /**
     * 应用瞄准结果到刚体
     * @param aimingResult 瞄准结果
     * @param rigidbody 目标刚体（可选，默认使用节点上的刚体）
     */
    protected applyAimingToRigidbody(aimingResult: AimingResult, rigidbody?: RigidBody2D): boolean {
        const targetRigidbody = rigidbody || this.node.getComponent(RigidBody2D);
        
        if (!targetRigidbody) {
            console.warn(`⚠️ ${this.getAttackName()}: 没有找到RigidBody2D组件，无法应用瞄准`);
            return false;
        }

        targetRigidbody.linearVelocity = aimingResult.velocity;
        this._direction.set(aimingResult.direction);
        
        console.log(`🚀 ${this.getAttackName()}: 应用瞄准结果`);
        console.log(`  - 速度向量: (${aimingResult.velocity.x.toFixed(1)}, ${aimingResult.velocity.y.toFixed(1)})`);
        
        return true;
    }

    /**
     * 获取当前目标位置
     */
    protected getCurrentTargetPosition(): Vec3 {
        return this._targetPosition.clone();
    }

    /**
     * 获取当前移动方向
     */
    protected getCurrentDirection(): Vec2 {
        return this._direction.clone();
    }

    /**
     * 检查是否接近目标位置
     * @param threshold 距离阈值
     * @returns 是否接近目标
     */
    protected isNearTarget(threshold: number = 20): boolean {
        if (this._targetPosition.equals(Vec3.ZERO)) {
            return false;
        }
        
        const currentPos = this._aimingConfig?.useWorldCoordinates ? 
            this.node.worldPosition : this.node.position;
        const distance = Vec3.distance(currentPos, this._targetPosition);
        
        return distance <= threshold;
    }

    // ========== 抽象方法 - 子类必须实现 ==========

    /**
     * 获取攻击名称（用于日志显示）
     */
    protected abstract getAttackName(): string;

    /**
     * 获取攻击类型
     */
    protected abstract getAttackType(): AttackTypeValue;

    /**
     * 攻击初始化时调用
     */
    protected abstract onAttackLoad(): void;

    /**
     * 攻击开始时调用
     */
    protected abstract onAttackStart(): void;

    // ========== 可选重写的方法 ==========

    /**
     * 攻击更新时调用（可选重写）
     * @param deltaTime 时间间隔
     */
    protected onAttackUpdate(deltaTime: number): void {
        // 默认不做任何事，子类可以重写
    }

    /**
     * 成功造成伤害时调用（可选重写）
     * @param enemy 被攻击的敌人
     */
    protected onDamageDealt(enemy: EnemyController): void {
        // 默认不做任何事，子类可以重写
    }

    /**
     * 攻击即将销毁时调用（可选重写）
     */
    protected onAttackDestroy(): void {
        // 默认不做任何事，子类可以重写
    }

    /**
     * 组件销毁时调用（可选重写）
     */
    protected onAttackComponentDestroy(): void {
        // 默认不做任何事，子类可以重写
    }

    // ========== 公共方法 ==========

    /**
     * 获取攻击版本号
     */
    public getVersion(): number {
        return this._version;
    }

    /**
     * 获取已击中敌人数量
     */
    public getHitCount(): number {
        return this._hitEnemies.size;
    }

    /**
     * 设置伤害值
     * @param damage 新的伤害值
     */
    public setDamage(damage: number): void {
        this.damage = damage;
    }

    /**
     * 简化的碰撞检测逻辑
     * @param selfCollider 自身碰撞器
     * @param otherCollider 对方碰撞器
     * @returns 是否应该处理碰撞
     */
    protected shouldProcessCollision(selfCollider: Collider2D, otherCollider: Collider2D): boolean {
        // 检查是否是玩家
        const isPlayer = otherCollider.node.name.toLowerCase().includes('player') || 
                        otherCollider.node.parent?.name.toLowerCase().includes('player');
        
        if (isPlayer) {
            return false;
        }

        // 检查是否是敌人
        const enemyScript = otherCollider.getComponent(EnemyController);
        if (!enemyScript) {
            return false;
        }

        return true;
    }
} 