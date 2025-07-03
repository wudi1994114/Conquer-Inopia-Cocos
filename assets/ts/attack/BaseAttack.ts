import { _decorator, Component, Node, Collider2D } from 'cc';
import { Enemy } from '../Enemy';
import { AttackSystem, AttackTypeValue } from './AttackSystem';
import { SkillConfig, SkillInstance, SkillUtils, SkillGlobalConfig } from './skill-config';
import { EventManager, GameEvents, PlayerAttackEventData } from '../EventManager';

const { ccclass, property } = _decorator;

/**
 * 攻击基类 - 所有攻击类型的抽象父类
 * 支持配置化和事件驱动的架构
 */
@ccclass('BaseAttack')
export abstract class BaseAttack extends Component {

    @property({tooltip: '攻击造成的伤害值（基础值，会被配置覆盖）'})
    public damage: number = 10;

    protected _version: number = 0; // 攻击版本号
    protected _hitEnemies: Set<Node> = new Set(); // 记录已击中的敌人，防止重复伤害

    onLoad() {
        console.log(`🎯 ${this.getAttackName()} 攻击初始化开始`);
        
        // 获取统一攻击版本号
        this._version = AttackSystem.getNextAttackVersion();
        console.log(`🏷️ ${this.getAttackName()} 获得攻击版本号:`, this._version);
        
        // 调用子类的初始化方法
        this.onAttackLoad();
        
        console.log(`✅ ${this.getAttackName()} 攻击初始化完成`);
        console.log(`  - 伤害值:`, this.damage);
        console.log(`  - 攻击版本号:`, this._version);
    }

    start() {
        console.log(`🚀 ${this.getAttackName()} 攻击开始执行`);
        this.onAttackStart();
    }

    update(deltaTime: number) {
        this.onAttackUpdate(deltaTime);
    }

    /**
     * 对敌人造成伤害
     * @param enemy 敌人组件
     * @param attackType 攻击类型
     * @param customVersion 自定义版本号（可选）
     * @returns 是否成功造成伤害
     */
    protected dealDamageToEnemy(enemy: Enemy, attackType: AttackTypeValue, customVersion?: number): boolean {
        const attackVersion = customVersion || this._version;
        
        // 使用全局调控后的实际伤害
        const actualDamage = SkillGlobalConfig.getActualDamage(this.damage);
        
        console.log(`💥 ${this.getAttackName()} 尝试攻击敌人:`, enemy.node.name);
        console.log(`  - 基础伤害:`, this.damage);
        console.log(`  - 实际伤害:`, actualDamage);
        console.log(`  - 攻击版本号:`, attackVersion);
        console.log(`  - 敌人当前血量:`, enemy.getCurrentHealth());
        
        const damageSuccessful = enemy.takeDamage(actualDamage, attackType, attackVersion);
        
        if (damageSuccessful) {
            console.log(`✅ ${this.getAttackName()} 伤害生效`);
            
            // 发布攻击命中事件
            EventManager.emit(GameEvents.ATTACK_HIT, {
                attackType: this.getAttackType(),
                damage: actualDamage,
                target: enemy.node.name,
                version: attackVersion
            });
            
            this.onDamageDealt(enemy);
            return true;
        } else {
            console.log(`❌ ${this.getAttackName()} 伤害被阻止（版本号重复或其他原因）`);
            
            // 发布攻击未命中事件
            EventManager.emit(GameEvents.ATTACK_MISS, {
                attackType: this.getAttackType(),
                target: enemy.node.name,
                version: attackVersion
            });
            
            return false;
        }
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
     * 获取所有场景中的敌人
     * @returns 敌人组件数组
     */
    protected getAllEnemies(): Enemy[] {
        return this.node.parent?.getComponentsInChildren(Enemy) || [];
    }

    /**
     * 销毁攻击
     */
    protected destroyAttack(): void {
        console.log(`🗑️ 销毁 ${this.getAttackName()} 攻击`);
        console.log(`  - 攻击版本号:`, this._version);
        console.log(`  - 总击中敌人数量:`, this._hitEnemies.size);
        
        this.onAttackDestroy();
        
        if (this.node && this.node.isValid) {
            this.node.destroy();
        }
    }

    onDestroy() {
        console.log(`🔚 ${this.getAttackName()} 组件销毁`);
        this._hitEnemies.clear();
        this.onAttackComponentDestroy();
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
    protected onDamageDealt(enemy: Enemy): void {
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
        console.log(`⚙️ ${this.getAttackName()} 伤害值设置为:`, damage);
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
            console.log(`⚡ ${this.getAttackName()} 撞到玩家，跳过处理`);
            return false;
        }

        // 检查是否是敌人
        const enemyScript = otherCollider.getComponent(Enemy);
        if (!enemyScript) {
            console.log(`⚠️ ${this.getAttackName()} 碰撞目标不是敌人:`, otherCollider.node.name);
            return false;
        }

        return true;
    }
} 