import { _decorator, Collider2D, Contact2DType, IPhysics2DContact, RigidBody2D, view, Graphics, Color, Vec3, UIOpacity, math, Node } from 'cc';
import { EnemyController } from '../EnemyController';
import { BaseAttack } from './BaseAttack';
import { AttackSystem } from './AttackSystem';

const { ccclass, property } = _decorator;

@ccclass('Ring')
export class Ring extends BaseAttack {
    
    @property({tooltip: '圆环扩大的速度（每秒增长的像素）'})
    public expandSpeed: number = 150;
    
    @property({tooltip: '圆环的初始大小'})
    public initialSize: number = 50;
    
    @property({tooltip: '圆环的最大大小（超过屏幕大小后销毁）'})
    public maxSize: number = 1000;

    @property({tooltip: '圆环线条宽度'})
    public lineWidth: number = 8;
    
    @property({tooltip: '圆环线条颜色'})
    public lineColor: Color = new Color(0, 255, 255, 255); // 默认青色
    
    @property({tooltip: '圆环填充颜色'})
    public fillColor: Color = new Color(0, 255, 255, 60); // 默认半透明青色

    @property({tooltip: '圆环攻击宽度（敌人需要在这个范围内才会受到伤害）'})
    public attackWidth: number = 30;

    // 特效相关属性
    @property({tooltip: '脉冲效果强度'})
    public pulseIntensity: number = 0.3;
    
    @property({tooltip: '脉冲速度'})
    public pulseSpeed: number = 4;
    
    @property({tooltip: '旋转速度（度/秒）'})
    public rotationSpeed: number = 60;
    
    @property({tooltip: '发光层数'})
    public glowLayers: number = 3;
    
    @property({tooltip: '颜色变化速度'})
    public colorChangeSpeed: number = 2;

    private _currentSize: number = 0;
    private _lastSize: number = 0; // 记录上一帧的大小，用于检测攻击范围
    private _graphics: Graphics | null = null;
    private _screenBounds: {width: number, height: number} = {width: 0, height: 0};
    private _alreadyHitEnemies: Set<Node> = new Set(); // 记录已经被攻击过的敌人节点
    
    // 特效状态
    private _elapsedTime: number = 0;
    private _pulsePhase: number = 0;
    private _rotationAngle: number = 0;
    private _colorPhase: number = 0;
    private _uiOpacity: UIOpacity | null = null;

    protected getAttackName(): string {
        return "圆环";
    }

    protected getAttackType() {
        return AttackSystem.AttackType.RING;
    }

    protected onAttackLoad(): void {
        try {
            // 获取屏幕边界
            const screenSize = view.getVisibleSize();
            this._screenBounds.width = screenSize.width;
            this._screenBounds.height = screenSize.height;
            
            // 获取或添加Graphics组件
            this._graphics = this.getComponent(Graphics);
            if (!this._graphics) {
                console.warn("⚠️ DrawRing预制体没有Graphics组件，将自动添加一个。");
                this._graphics = this.addComponent(Graphics);
            }
            
            // 获取UIOpacity组件用于透明度特效
            this._uiOpacity = this.getComponent(UIOpacity);
            if (!this._uiOpacity) {
                this._uiOpacity = this.addComponent(UIOpacity);
            }
            
            // 设置初始大小
            this._currentSize = this.initialSize;
            this._lastSize = this.initialSize;
            
            // 绘制初始圆环
            this.drawRing();
            
        } catch (error: any) {
            console.error("❌ 圆环初始化失败:", error?.message || error);
        }
    }
    
    protected onAttackStart(): void {
        console.log("🌊 圆环攻击开始，使用范围检测模式");
        
        // 🔧 立即开始扩散逻辑，不等待敌人检测
        // 圆环应该无论是否有敌人都要扩散，只是在扩散过程中检测敌人
        console.log("🌊 圆环开始扩散，初始大小:", this._currentSize);
        
        // 确保圆环绘制正确
        this.drawRing();
        
        // 启动定时器，确保圆环能够正常销毁（防止永久存在）
        const maxLifetime = Math.max(10, this.maxSize / this.expandSpeed + 2); // 根据扩散速度计算最大生命周期
        this.scheduleOnce(() => {
            console.log("⏰ 圆环达到最大生命周期，强制销毁");
            this.destroyAttack();
        }, maxLifetime);
    }

    /**
     * 绘制圆环（增强版本，包含多种特效）
     */
    private drawRing(): void {
        if (!this._graphics) return;
        
        // 清除之前的绘制
        this._graphics.clear();
        
        // 计算脉冲效果
        const pulseValue = Math.sin(this._pulsePhase) * this.pulseIntensity;
        const currentRadius = (this._currentSize / 2) * (1 + pulseValue);
        
        // 计算颜色变化
        const colorShift = Math.sin(this._colorPhase) * 0.3;
        const dynamicLineColor = new Color(
            Math.max(0, Math.min(255, this.lineColor.r + colorShift * 100)),
            Math.max(0, Math.min(255, this.lineColor.g + colorShift * 50)),
            Math.max(0, Math.min(255, this.lineColor.b + colorShift * 80)),
            this.lineColor.a
        );
        
        const dynamicFillColor = new Color(
            Math.max(0, Math.min(255, this.fillColor.r + colorShift * 80)),
            Math.max(0, Math.min(255, this.fillColor.g + colorShift * 40)),
            Math.max(0, Math.min(255, this.fillColor.b + colorShift * 60)),
            this.fillColor.a
        );
        
        // 绘制发光效果（多层圆环）
        for (let i = 0; i < this.glowLayers; i++) {
            const layerRadius = currentRadius + (i * 3);
            const layerAlpha = (1 - i / this.glowLayers) * 0.6;
            const layerWidth = this.lineWidth * (1 + i * 0.3);
            
            // 外层发光
            this._graphics.lineWidth = layerWidth;
            this._graphics.strokeColor = new Color(
                dynamicLineColor.r,
                dynamicLineColor.g,
                dynamicLineColor.b,
                dynamicLineColor.a * layerAlpha
            );
            
            this._graphics.circle(0, 0, layerRadius);
            this._graphics.stroke();
        }
        
        // 绘制主圆环
        this._graphics.lineWidth = this.lineWidth;
        this._graphics.strokeColor = dynamicLineColor;
        this._graphics.fillColor = dynamicFillColor;
        
        this._graphics.circle(0, 0, currentRadius);
        this._graphics.stroke();
        this._graphics.fill();
        
        // 绘制内部脉冲圆环
        if (currentRadius > 20) {
            const innerRadius = currentRadius * 0.7;
            const innerAlpha = Math.abs(Math.sin(this._pulsePhase * 1.5)) * 0.4;
            
            this._graphics.lineWidth = this.lineWidth * 0.5;
            this._graphics.strokeColor = new Color(
                255,
                255,
                255,
                255 * innerAlpha
            );
            
            this._graphics.circle(0, 0, innerRadius);
            this._graphics.stroke();
        }
        
        // 更新整体透明度（脉冲效果）
        if (this._uiOpacity) {
            const opacityPulse = Math.sin(this._pulsePhase * 0.8) * 0.2;
            this._uiOpacity.opacity = Math.max(150, Math.min(255, 200 + opacityPulse * 100));
        }
    }

    protected onAttackUpdate(deltaTime: number): void {
        // 更新时间和特效状态
        this._elapsedTime += deltaTime;
        this._pulsePhase += this.pulseSpeed * deltaTime;
        this._rotationAngle += this.rotationSpeed * deltaTime;
        this._colorPhase += this.colorChangeSpeed * deltaTime;
        
        // 应用旋转
        this.node.setRotationFromEuler(0, 0, this._rotationAngle);
        
        // 保存上一帧的大小
        this._lastSize = this._currentSize;
        
        // 圆环扩大
        this._currentSize += this.expandSpeed * deltaTime;
        
        // 重新绘制圆环
        this.drawRing();
        
        // 检测范围内的敌人
        this.detectEnemiesInRange();
        
        // 检查是否超过最大大小或屏幕边界
        const maxScreenDimension = Math.max(this._screenBounds.width, this._screenBounds.height);
        if (this._currentSize > this.maxSize || this._currentSize > maxScreenDimension * 1.5) {
            this.destroyAttack();
        }
    }

    /**
     * 检测圆环范围内的敌人
     */
    private detectEnemiesInRange(): void {
        const enemies = this.getAllEnemies();
        let hitCount = 0;
        
        for (const enemyNode of enemies) {
            // 如果已经攻击过这个敌人，跳过
            if (this._alreadyHitEnemies.has(enemyNode)) {
                continue;
            }
            
            const distance = Vec3.distance(this.node.position, enemyNode.position);
            const currentRadius = this._currentSize / 2;
            const lastRadius = this._lastSize / 2;
            
            // 检查敌人是否在圆环的攻击范围内（在当前圆环边缘附近）
            const isInAttackRange = distance <= currentRadius && distance >= (currentRadius - this.attackWidth);
            
            // 或者敌人是否被圆环"经过"（从内圈到外圈）
            const wasPassedThrough = distance >= lastRadius && distance <= currentRadius;
            
            if (isInAttackRange || wasPassedThrough) {
                const enemyScript = enemyNode.getComponent(EnemyController);
                if (enemyScript) {
                    console.log("🌊 圆环击中敌人:", enemyNode.name, "距离:", distance.toFixed(2), "圆环半径:", currentRadius.toFixed(2));
                    
                    const damageSuccessful = this.dealDamageToEnemy(enemyScript, this.getAttackType());
                    if (damageSuccessful) {
                        this.markEnemyAsHit(enemyNode);
                        this._alreadyHitEnemies.add(enemyNode);
                        hitCount++;
                        
                        // 击中敌人时增加特效强度
                        this._pulsePhase += 0.5;
                    }
                }
            }
        }
        
        if (hitCount > 0) {
            console.log(`🌊 本轮圆环攻击共击中 ${hitCount} 个新敌人`);
        }
    }
    
    protected onAttackDestroy(): void {
        // 清理已击中敌人的记录
        this._alreadyHitEnemies.clear();
    }
    
    protected onAttackComponentDestroy(): void {
        // 清理已击中敌人的记录
        this._alreadyHitEnemies.clear();
    }
} 