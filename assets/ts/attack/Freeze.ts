import { _decorator, Vec3, Node } from 'cc';
import { EnemyController } from '../EnemyController';
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
    
    @property({tooltip: '效果持续时间（秒）'})
    public effectDuration: number = 1;

    private _frozenEnemies: Set<Node> = new Set(); // 记录被冰冻的敌人节点

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
        
        for (const enemyNode of enemies) {
            const distance = Vec3.distance(this.node.position, enemyNode.position);
            
            if (distance <= this.freezeRadius) {
                // 造成伤害
                if (!this.isEnemyHit(enemyNode)) {
                    const enemyScript = enemyNode.getComponent(EnemyController);
                    if (enemyScript) {
                        console.log("❄️ 冰冻击中敌人:", enemyNode.name, "距离:", distance.toFixed(2));
                        const damageSuccessful = this.dealDamageToEnemy(enemyScript, this.getAttackType());
                        if (damageSuccessful) {
                            this.markEnemyAsHit(enemyNode);
                            hitCount++;
                        }
                    }
                }
                
                // 应用冰冻效果（减速）
                const enemyScript = enemyNode.getComponent(EnemyController);
                if (enemyScript) {
                    this.applyFreezeEffect(enemyScript);
                    frozenCount++;
                }
            }
        }
        
        console.log("📊 冰冻攻击统计: 击中", hitCount, "个敌人, 冰冻", frozenCount, "个敌人");
    }
    
    private applyFreezeEffect(enemy: EnemyController) {
        const enemyNode = enemy.node;
        if (this._frozenEnemies.has(enemyNode)) {
            return; // 已经被冰冻了
        }
        
        console.log("🧊 对敌人应用冰冻效果:", enemyNode.name);
        
        // 使用新的速度修正接口
        const modifierId = `freeze_${this.uuid}`; // 创建一个唯一的修正ID
        enemy.applySpeedModifier(modifierId, 1 - this.slowRatio);
        this._frozenEnemies.add(enemyNode);
        
        // 设置冰冻持续时间
        this.scheduleOnce(() => {
            this.removeFreezeEffect(enemy, modifierId);
        }, this.freezeDuration);
    }
    
    private removeFreezeEffect(enemy: EnemyController, modifierId: string) {
        if (!enemy || !enemy.isValid) {
            this._frozenEnemies.delete(enemy.node);
            return;
        }

        if (this._frozenEnemies.has(enemy.node)) {
            enemy.removeSpeedModifier(modifierId);
            console.log("🔥 移除敌人的冰冻效果:", enemy.node.name);
            this._frozenEnemies.delete(enemy.node);
        }
    }
    
    protected onAttackDestroy(): void {
        console.log("  - 当前被冰冻敌人数量:", this._frozenEnemies.size);
        
        // 清除所有冰冻效果
        this._frozenEnemies.forEach(enemyNode => {
            if (enemyNode && enemyNode.isValid) {
                const enemyScript = enemyNode.getComponent(EnemyController);
                if (enemyScript) {
                    this.removeFreezeEffect(enemyScript, `freeze_${this.uuid}`);
                }
            }
        });
        this._frozenEnemies.clear();
    }
    
    protected onAttackComponentDestroy(): void {
        // 清理冰冻记录
        this._frozenEnemies.clear();
    }
} 