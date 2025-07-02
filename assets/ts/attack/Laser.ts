import { _decorator, Vec3, Graphics, Color } from 'cc';
import { Enemy } from '../Enemy';
import { BaseAttack } from './BaseAttack';
import { AttackSystem } from './AttackSystem';

const { ccclass, property } = _decorator;

@ccclass('Laser')
export class Laser extends BaseAttack {
    
    @property({tooltip: '激光的长度'})
    public laserLength: number = 800;
    
    @property({tooltip: '激光的宽度'})
    public laserWidth: number = 20;
    
    @property({tooltip: '激光持续时间（秒）'})
    public duration: number = 0.3;

    private _graphics: Graphics = null;

    protected getAttackName(): string {
        return "激光";
    }

    protected getAttackType() {
        return AttackSystem.AttackType.LASER;
    }

    protected onAttackLoad(): void {
        // 创建图形组件来绘制激光
        this._graphics = this.getComponent(Graphics);
        if (!this._graphics) {
            this._graphics = this.addComponent(Graphics);
        }
        
        this.drawLaser();
        
        console.log("⚡ 激光参数:");
        console.log("  - 长度:", this.laserLength);
        console.log("  - 宽度:", this.laserWidth);
        console.log("  - 持续时间:", this.duration);
    }

    protected onAttackStart(): void {
        // 立即检测激光路径上的所有敌人
        this.scheduleOnce(() => {
            this.detectEnemiesInPath();
        }, 0.1);
        
        // 持续时间后销毁激光
        this.scheduleOnce(() => {
            console.log("⏰ 激光持续时间结束，准备销毁");
            this.destroyAttack();
        }, this.duration);
    }
    
    private drawLaser() {
        if (!this._graphics) return;
        
        // 清除之前的绘制
        this._graphics.clear();
        
        // 设置线条样式
        this._graphics.lineWidth = this.laserWidth;
        this._graphics.strokeColor = Color.RED;
        this._graphics.fillColor = new Color(255, 0, 0, 100); // 半透明红色
        
        // 绘制激光线条（从节点位置向前）
        this._graphics.moveTo(0, 0);
        this._graphics.lineTo(this.laserLength, 0);
        this._graphics.stroke();
        
        console.log("✨ 激光视觉效果已绘制");
    }
    
    private detectEnemiesInPath() {
        console.log("🎯 开始检测激光路径上的敌人");
        
        // 获取所有敌人节点
        const enemies = this.getAllEnemies();
        let hitCount = 0;
        
        for (const enemy of enemies) {
            if (this.isEnemyInLaserPath(enemy.node)) {
                if (!this.hasHitEnemy(enemy.node)) {
                    console.log("⚡ 激光击中敌人:", enemy.node.name);
                    
                    const damageSuccessful = this.dealDamageToEnemy(enemy, this.getAttackType());
                    if (damageSuccessful) {
                        this.markEnemyAsHit(enemy.node);
                        hitCount++;
                    }
                }
            }
        }
        
        console.log("📊 激光攻击统计: 击中", hitCount, "个敌人");
    }
    
    private isEnemyInLaserPath(enemyNode: any): boolean {
        // 将敌人位置转换到激光的本地坐标系
        const laserWorldPos = this.node.getWorldPosition();
        const enemyWorldPos = enemyNode.getWorldPosition();
        
        // 计算相对位置
        const relativePos = new Vec3();
        Vec3.subtract(relativePos, enemyWorldPos, laserWorldPos);
        
        // 考虑激光的朝向（假设激光沿X轴正方向发射）
        const laserRotation = this.node.eulerAngles.z * Math.PI / 180; // 转换为弧度
        
        // 旋转相对位置到激光坐标系
        const cos = Math.cos(-laserRotation);
        const sin = Math.sin(-laserRotation);
        const rotatedX = relativePos.x * cos - relativePos.y * sin;
        const rotatedY = relativePos.x * sin + relativePos.y * cos;
        
        // 检查是否在激光路径内
        const inLength = rotatedX >= 0 && rotatedX <= this.laserLength;
        const inWidth = Math.abs(rotatedY) <= this.laserWidth / 2;
        
        return inLength && inWidth;
    }
} 