import { _decorator, Collider2D, Contact2DType, IPhysics2DContact, RigidBody2D, view, Graphics, Color, Vec3 } from 'cc';
import { Enemy } from '../Enemy';
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
    
    @property({type: Color, tooltip: '圆环线条颜色'})
    public lineColor: Color = new Color(0, 255, 255, 255); // 默认青色
    
    @property({type: Color, tooltip: '圆环填充颜色'})
    public fillColor: Color = new Color(0, 255, 255, 60); // 默认半透明青色

    @property({tooltip: '圆环攻击宽度（敌人需要在这个范围内才会受到伤害）'})
    public attackWidth: number = 30;

    private _currentSize: number = 0;
    private _lastSize: number = 0; // 记录上一帧的大小，用于检测攻击范围
    private _graphics: Graphics | null = null;
    private _screenBounds: {width: number, height: number} = {width: 0, height: 0};
    private _alreadyHitEnemies: Set<Enemy> = new Set(); // 记录已经被攻击过的敌人

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
        // 圆环攻击不需要碰撞检测，使用范围检测
        console.log("🌊 圆环攻击开始，使用范围检测模式");
    }

    /**
     * 绘制圆环
     */
    private drawRing(): void {
        if (!this._graphics) return;
        
        // 清除之前的绘制
        this._graphics.clear();
        
        // 设置样式
        this._graphics.lineWidth = this.lineWidth;
        this._graphics.strokeColor = this.lineColor;
        this._graphics.fillColor = this.fillColor;
        
        // 绘制圆环
        this._graphics.circle(0, 0, this._currentSize / 2); // Graphics.circle的参数是半径
        this._graphics.stroke();
        this._graphics.fill();
    }

    protected onAttackUpdate(deltaTime: number): void {
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
        
        for (const enemy of enemies) {
            // 如果已经攻击过这个敌人，跳过
            if (this._alreadyHitEnemies.has(enemy)) {
                continue;
            }
            
            const distance = Vec3.distance(this.node.position, enemy.node.position);
            const currentRadius = this._currentSize / 2;
            const lastRadius = this._lastSize / 2;
            
            // 检查敌人是否在圆环的攻击范围内（在当前圆环边缘附近）
            const isInAttackRange = distance <= currentRadius && distance >= (currentRadius - this.attackWidth);
            
            // 或者敌人是否被圆环"经过"（从内圈到外圈）
            const wasPassedThrough = distance >= lastRadius && distance <= currentRadius;
            
            if (isInAttackRange || wasPassedThrough) {
                console.log("🌊 圆环击中敌人:", enemy.node.name, "距离:", distance.toFixed(2), "圆环半径:", currentRadius.toFixed(2));
                
                const damageSuccessful = this.dealDamageToEnemy(enemy, this.getAttackType());
                if (damageSuccessful) {
                    this.markEnemyAsHit(enemy.node);
                    this._alreadyHitEnemies.add(enemy);
                    hitCount++;
                }
            }
        }
        
        if (hitCount > 0) {
            console.log("📊 圆环攻击统计: 击中", hitCount, "个敌人");
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