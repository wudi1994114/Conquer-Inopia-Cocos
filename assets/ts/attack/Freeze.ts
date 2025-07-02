import { _decorator, Vec3 } from 'cc';
import { Enemy } from '../Enemy';
import { BaseAttack } from './BaseAttack';
import { AttackSystem } from './AttackSystem';

const { ccclass, property } = _decorator;

@ccclass('Freeze')
export class Freeze extends BaseAttack {
    
    @property({tooltip: '冰冻范围半径'})
    public freezeRadius: number = 150;
    
    @property({tooltip: '冰冻持续时间（秒）'})
    public freezeDuration: number = 3;
    
    @property({tooltip: '移动速度减缓比例（0-1）'})
    public slowRatio: number = 0.5;
    
    @property({tooltip: '冰冻效果存在时间（秒）'})
    public effectDuration: number = 1;

    private _frozenEnemies: Map<Enemy, number> = new Map(); // 记录被冰冻的敌人和原始速度

    protected getAttackName(): string {
        return "冰冻";
    }

    protected getAttackType() {
        return AttackSystem.AttackType.FREEZE;
    }

    protected onAttackLoad(): void {
        console.log("❄️ 冰冻参数:");
        console.log("  - 冰冻范围:", this.freezeRadius);
        console.log("  - 冰冻持续时间:", this.freezeDuration);
        console.log("  - 减速比例:", this.slowRatio);
    }

    protected onAttackStart(): void {
        // 立即执行冰冻效果
        this.scheduleOnce(() => {
            this.executeFreeze();
        }, 0.1);
        
        // 效果持续时间后销毁
        this.scheduleOnce(() => {
            console.log("⏰ 冰冻效果结束，准备销毁");
            this.destroyAttack();
        }, this.effectDuration);
    }
    
    private executeFreeze() {
        console.log("❄️ 开始执行冰冻攻击");
        console.log("  - 冰冻中心位置:", this.node.position);
        
        // 获取所有敌人节点
        const enemies = this.getAllEnemies();
        let hitCount = 0;
        let frozenCount = 0;
        
        for (const enemy of enemies) {
            const distance = Vec3.distance(this.node.position, enemy.node.position);
            
            if (distance <= this.freezeRadius) {
                // 造成伤害
                if (!this.hasHitEnemy(enemy.node)) {
                    console.log("❄️ 冰冻击中敌人:", enemy.node.name, "距离:", distance.toFixed(2));
                    
                    const damageSuccessful = this.dealDamageToEnemy(enemy, this.getAttackType());
                    if (damageSuccessful) {
                        this.markEnemyAsHit(enemy.node);
                        hitCount++;
                    }
                }
                
                // 应用冰冻效果（减速）
                this.applyFreezeEffect(enemy);
                frozenCount++;
            }
        }
        
        console.log("📊 冰冻攻击统计: 击中", hitCount, "个敌人, 冰冻", frozenCount, "个敌人");
    }
    
    private applyFreezeEffect(enemy: Enemy) {
        if (this._frozenEnemies.has(enemy)) {
            return; // 已经被冰冻了
        }
        
        console.log("🧊 对敌人应用冰冻效果:", enemy.node.name);
        
        // 假设Enemy有moveSpeed属性（需要根据实际Enemy实现调整）
        // 这里我们通过敌人的标记来记录冰冻状态
        const originalSpeed = this.getEnemyMoveSpeed(enemy);
        const newSpeed = originalSpeed * (1 - this.slowRatio);
        
        this._frozenEnemies.set(enemy, originalSpeed);
        this.setEnemyMoveSpeed(enemy, newSpeed);
        
        console.log("  - 原始速度:", originalSpeed);
        console.log("  - 冰冻后速度:", newSpeed);
        
        // 设置冰冻持续时间
        this.scheduleOnce(() => {
            this.removeFreezeEffect(enemy);
        }, this.freezeDuration);
    }
    
    private removeFreezeEffect(enemy: Enemy) {
        if (!this._frozenEnemies.has(enemy)) {
            return;
        }
        
        if (enemy && enemy.node && enemy.node.isValid) {
            const originalSpeed = this._frozenEnemies.get(enemy);
            this.setEnemyMoveSpeed(enemy, originalSpeed);
            console.log("🔥 移除敌人的冰冻效果:", enemy.node.name, "恢复速度:", originalSpeed);
        }
        
        this._frozenEnemies.delete(enemy);
    }
    
    // 这些方法需要根据实际Enemy实现来调整
    private getEnemyMoveSpeed(enemy: Enemy): number {
        // 假设Enemy有moveSpeed属性，或者通过其他方式获取速度
        // 这里返回一个默认值，实际使用时需要根据Enemy的实现来修改
        return (enemy as any).moveSpeed || 100;
    }
    
    private setEnemyMoveSpeed(enemy: Enemy, speed: number) {
        // 假设Enemy有moveSpeed属性，或者通过其他方式设置速度
        // 实际使用时需要根据Enemy的实现来修改
        if ((enemy as any).moveSpeed !== undefined) {
            (enemy as any).moveSpeed = speed;
        }
        
        // 也可以通过标记来让Enemy自己处理减速效果
        (enemy as any).isFrozen = speed < this.getEnemyMoveSpeed(enemy);
        (enemy as any).freezeSpeedMultiplier = speed / this.getEnemyMoveSpeed(enemy);
    }
    
    protected onAttackDestroy(): void {
        console.log("  - 当前被冰冻敌人数量:", this._frozenEnemies.size);
        
        // 清除所有冰冻效果
        for (const enemy of this._frozenEnemies.keys()) {
            this.removeFreezeEffect(enemy);
        }
    }
    
    protected onAttackComponentDestroy(): void {
        // 清理冰冻记录
        this._frozenEnemies.clear();
    }
} 