import { _decorator, Vec3, Graphics, Color, Vec2, RigidBody2D, Node } from 'cc';
import { Enemy } from '../Enemy';
import { BaseAttack, AimingMode, MovementMode } from './BaseAttack';
import { AttackSystem } from './AttackSystem';
import { GameManager } from '../GameManager';

const { ccclass, property } = _decorator;

@ccclass('Laser')
export class Laser extends BaseAttack {
    
    @property({tooltip: '激光的长度'})
    public laserLength: number = 800;
    
    @property({tooltip: '激光的宽度'})
    public laserWidth: number = 20;
    
    @property({tooltip: '激光持续时间（秒）'})
    public duration: number = 0.3;

    private _graphics: Graphics | null = null;

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
        
        // 🔧 重要：激光不应该移动，禁用或配置刚体
        const rigidbody = this.node.getComponent(RigidBody2D);
        if (rigidbody) {
            rigidbody.enabled = false; // 完全禁用刚体
            console.log("🛑 激光刚体已禁用");
        }
        
        // 设置瞄准配置 - 激光瞬时瞄准最近敌人（仅用于方向计算）
        this.setAimingConfig({
            mode: AimingMode.NEAREST_ENEMY,
            movementMode: MovementMode.LINEAR,
            speed: 0, // 激光瞬时到达，不需要移动
            useWorldCoordinates: true
        });
        
        // 注意：不在这里调整激光方向，因为敌人数据可能还没准备好
        // 激光方向将在 onAttackStart() 中调整
        
        console.log("⚡ 激光参数:");
        console.log("  - 长度:", this.laserLength);
        console.log("  - 宽度:", this.laserWidth);
        console.log("  - 持续时间:", this.duration);
        console.log("  - 激光是固定位置的视觉效果，不会移动");
    }

    protected onAttackStart(): void {
        console.log("⚡ 激光开始攻击");
        
        // 🔧 重要：确保激光不会移动（停止任何可能的刚体运动）
        const rigidbody = this.node.getComponent(RigidBody2D);
        if (rigidbody) {
            rigidbody.linearVelocity = Vec2.ZERO;
            rigidbody.angularVelocity = 0;
            console.log("🛑 激光刚体运动已停止");
        }
        
        // 🎯 在这里调整激光朝向目标（此时敌人数据已准备好）
        this.adjustLaserDirection();
        
        // 绘制激光（在方向调整后）
        this.drawLaser();
        
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
    
    /**
     * 调整激光朝向目标
     * 注意：激光只使用瞄准系统计算方向，不应用任何移动逻辑
     */
    private adjustLaserDirection() {
        
        // 1. 检查当前时机
        const currentTime = Date.now();
        console.log(`  - 当前时间戳: ${currentTime}`);
        
        // 2. 检查GameManager状态
        const scene = this.node.scene;
        console.log(`  - 场景对象: ${scene ? '存在' : '不存在'}`);
        
        if (scene) {
            const gameManager = scene.getComponentInChildren(GameManager);
            console.log(`  - GameManager查找结果: ${gameManager ? '找到' : '未找到'}`);
            
            if (gameManager) {
                console.log(`  - GameManager活跃敌人数量: ${gameManager.activeEnemies?.length || 0}`);
                console.log(`  - GameManager玩家节点: ${gameManager.playerNode ? '存在' : '不存在'}`);
                
                // 3. 检查缓存状态
                const cachedEnemy = gameManager.getCachedNearestEnemy();
                console.log(`  - 缓存敌人: ${cachedEnemy ? '存在' : '不存在'}`);
                if (cachedEnemy) {
                    console.log(`    - 敌人名称: ${cachedEnemy.name}`);
                    console.log(`    - 敌人位置: (${cachedEnemy.position.x.toFixed(1)}, ${cachedEnemy.position.y.toFixed(1)})`);
                }
            }
        }
        
        // 4. 检查直接敌人查找
        const enemies = this.getAllEnemies();
        console.log(`  - 直接查找到的敌人数量: ${enemies.length}`);
        
        // 5. 检查激光位置
        const laserPos = this.node.worldPosition;
        console.log(`  - 激光世界位置: (${laserPos.x.toFixed(1)}, ${laserPos.y.toFixed(1)})`);
        console.log(`  - 激光本地位置: (${this.node.position.x.toFixed(1)}, ${this.node.position.y.toFixed(1)})`);
        console.log(`  - 激光当前角度: ${this.node.angle.toFixed(2)}°`);
        
        console.log("🔍 激光瞄准诊断结束\n");
        
        // 首先尝试通过瞄准系统获取目标
        const aimingResult = this.executeAiming();
        
        if (aimingResult.success && aimingResult.targetPosition) {
            let direction = aimingResult.direction;

            // 紧急修复：如果基础攻击类返回的方向向量无效，则在此处重新计算
            if (direction.lengthSqr() < 0.0001) {
                console.warn("⚠️ 激光检测到无效方向向量，重新计算...");
                const laserPos = this.node.worldPosition;
                const targetPos = aimingResult.targetPosition;
                direction = new Vec2(targetPos.x - laserPos.x, targetPos.y - laserPos.y).normalize();
            }

            // 瞄准成功，计算激光角度
            const angle = Math.atan2(direction.y, direction.x) * 180 / Math.PI;
            
            // 设置激光朝向目标（仅旋转角度，不移动位置）
            this.node.angle = angle;
            
            console.log("✅ 激光瞄准成功！");
            console.log(`  - 计算角度: ${angle.toFixed(2)}°`);
            console.log(`  - 设置后角度: ${this.node.angle.toFixed(2)}°`);
            console.log(`  - 方向向量: (${direction.x.toFixed(3)}, ${direction.y.toFixed(3)})`);
            console.log(`  - 当前位置: (${this.node.worldPosition.x.toFixed(1)}, ${this.node.worldPosition.y.toFixed(1)})`);
            
            if (aimingResult.targetPosition) {
                console.log(`  - 目标位置: (${aimingResult.targetPosition.x.toFixed(1)}, ${aimingResult.targetPosition.y.toFixed(1)})`);
                
                // 验证角度计算
                const dx = aimingResult.targetPosition.x - laserPos.x;
                const dy = aimingResult.targetPosition.y - laserPos.y;
                const verifyAngle = Math.atan2(dy, dx) * 180 / Math.PI;
                console.log(`  - 验证角度: ${verifyAngle.toFixed(2)}° (应该与计算角度一致)`);
            }
        } else {
            // 瞄准失败，尝试备用的直接敌人查找
            console.log("⚠️ 激光瞄准失败，尝试直接查找敌人...");
            
            const directTarget = this.findNearestEnemyDirect();
            if (directTarget) {
                // 直接计算角度
                const currentPos = this.node.worldPosition;
                const targetPos = directTarget.worldPosition;
                const direction = new Vec2(targetPos.x - currentPos.x, targetPos.y - currentPos.y);
                const angle = Math.atan2(direction.y, direction.x) * 180 / Math.PI;
                
                this.node.angle = angle;
                
                console.log("✅ 激光直接瞄准成功！");
                console.log(`  - 计算角度: ${angle.toFixed(2)}°`);
                console.log(`  - 设置后角度: ${this.node.angle.toFixed(2)}°`);
                console.log(`  - 当前位置: (${currentPos.x.toFixed(1)}, ${currentPos.y.toFixed(1)})`);
                console.log(`  - 目标位置: (${targetPos.x.toFixed(1)}, ${targetPos.y.toFixed(1)})`);
                console.log(`  - 方向向量: (${direction.x.toFixed(3)}, ${direction.y.toFixed(3)})`);
            } else {
                // 如果还是没有目标，保持默认方向（向右）
                this.node.angle = 0;
                console.log("⚠️ 激光找不到任何敌人，保持默认方向（向右，0°）");
                console.log("💡 提示：这可能是因为游戏刚开始，敌人还没有生成");
            }
        }
        
        // 🔧 重要：激光不应用移动逻辑，只使用方向信息
        // 不调用 applyAimingToRigidbody() 方法！
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

    /**
     * 直接查找最近的敌人（备用方法）
     */
    private findNearestEnemyDirect(): Node | null {
        console.log("🔍 激光直接查找最近敌人...");
        
        const enemies = this.getAllEnemies();
        if (enemies.length === 0) {
            console.log("⚠️ 激光：没有找到任何敌人");
            return null;
        }
        
        let nearestEnemy: Node | null = null;
        let minDistance = Infinity;
        const laserPos = this.node.worldPosition;
        
        for (const enemy of enemies) {
            if (enemy && enemy.node && enemy.node.isValid) {
                const enemyPos = enemy.node.worldPosition;
                const distance = Vec3.distance(laserPos, enemyPos);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestEnemy = enemy.node;
                }
            }
        }
        
        if (nearestEnemy) {
            console.log("✅ 激光直接找到敌人:", nearestEnemy.name, "距离:", minDistance.toFixed(1));
        } else {
            console.log("⚠️ 激光直接查找：没有找到有效敌人");
        }
        
        return nearestEnemy;
    }
} 