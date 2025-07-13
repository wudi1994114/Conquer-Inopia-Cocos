import { _decorator, Color, Graphics, v3, Vec3 } from 'cc';
import { BaseAttack, AimingMode, MovementMode } from './BaseAttack';
import { AttackSystem } from './AttackSystem';
import { EnemyController } from '../EnemyController';

const { ccclass, property } = _decorator;

@ccclass('FireballExtension')
export class FireballExtension extends BaseAttack {

    @property({ tooltip: '光环持续时间' })
    public duration: number = 3;

    @property({ tooltip: '光环作用半径' })
    public radius: number = 150;

    @property({ tooltip: '伤害间隔（秒）' })
    public damageInterval: number = 0.5;

    private _graphics: Graphics | null = null;
    private _elapsedTime: number = 0;

    protected getAttackName(): string {
        return "火球扩展";
    }

    protected getAttackType() {
        // 确保这是一个在 AttackSystem 中定义的类型
        return AttackSystem.AttackType.FIREBALL_EXTENSION;
    }

    protected onAttackLoad(): void {
        this._graphics = this.getComponent(Graphics) || this.addComponent(Graphics);
        
        // 这个技能是固定的，不需要移动
        this.setAimingConfig({
            mode: AimingMode.NONE,
            movementMode: MovementMode.STATIC,
            speed: 0,
            useWorldCoordinates: false // 静态技能不依赖世界坐标
        });
        console.log(`[火球扩展] 技能已加载。伤害: ${this.damage}, 半径: ${this.radius}, 持续: ${this.duration}s, 间隔: ${this.damageInterval}s`);
    }

    protected onAttackStart(): void {
        console.log(`[火球扩展] 技能启动！节点位置: (${this.node.worldPosition.x.toFixed(1)}, ${this.node.worldPosition.y.toFixed(1)})`);
        this.drawAoeCircle();

        // 启动重复计时器，按固定间隔造成范围伤害
        this.schedule(this.dealAoeDamage, this.damageInterval);

        // 启动销毁计时器
        this.scheduleOnce(() => {
            console.log("[火球扩展] 技能持续时间结束，准备销毁。");
            this.destroyAttack();
        }, this.duration);
    }
    
    /**
     * 绘制范围伤害的圆环
     */
    private drawAoeCircle(): void {
        if (!this._graphics) return;

        this._graphics.clear();
        this._graphics.lineWidth = 10;
        this._graphics.strokeColor = new Color(255, 100, 0, 150);
        this._graphics.fillColor = new Color(255, 150, 50, 50);

        this._graphics.circle(0, 0, this.radius);
        this._graphics.fill();
        this._graphics.stroke();
        
        console.log(`✨ 绘制了半径为 ${this.radius} 的伤害光环`);
    }

    /**
     * 对范围内的敌人造成伤害
     */
    private dealAoeDamage(): void {
        console.log(`[火球扩展] AOE伤害检测 (半径: ${this.radius})`);
        const enemies = this.getAllEnemies();
        let hitCount = 0;

        for (const enemyNode of enemies) {
            if (enemyNode && enemyNode.isValid) {
                const distance = Vec3.distance(this.node.worldPosition, enemyNode.worldPosition);
                if (distance <= this.radius) {
                    const enemyScript = enemyNode.getComponent(EnemyController);
                    if (enemyScript) {
                        const damageDealt = this.damage;
                        console.log(`[火球扩展] 尝试对 ${enemyNode.name} (距离: ${distance.toFixed(1)}) 造成 ${damageDealt} 点伤害`);
                        
                        const damageSuccessful = this.dealDamageToEnemy(enemyScript, this.getAttackType());
                        if (damageSuccessful) {
                            hitCount++;
                            console.log(`[火球扩展] ...成功对 ${enemyNode.name} 造成伤害！`);
                        }
                    }
                }
            }
        }
        if (hitCount > 0) {
            console.log(`[火球扩展] 本轮AOE共击中 ${hitCount} 个敌人`);
        }
    }
    
    // onAttackUpdate 已不再需要，其逻辑被定时器取代
}