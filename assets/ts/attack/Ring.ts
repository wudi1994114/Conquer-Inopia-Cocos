import { _decorator, Collider2D, Contact2DType, IPhysics2DContact, RigidBody2D, view, Graphics, Color } from 'cc';
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

    private _currentSize: number = 0;
    private _collider: Collider2D | null = null;
    private _graphics: Graphics | null = null;
    private _screenBounds: {width: number, height: number} = {width: 0, height: 0};
    private _logTimer: number = 0; // 控制日志频率

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
            
            // 绘制初始圆环
            this.drawRing();
            
        } catch (error: any) {
            console.error("❌ 圆环初始化失败:", error?.message || error);
        }
    }
    
    protected onAttackStart(): void {
        try {
            // 设置碰撞器
            this._collider = this.getComponent(Collider2D);
            let rigidbody = this.getComponent(RigidBody2D);
            
            if (this._collider) {
                // 监听碰撞开始事件
                this._collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            } else {
                console.error("❌ 圆环没有找到 Collider2D 组件!");
            }
            
            if (rigidbody) {
                rigidbody.enabledContactListener = true;
            }
            
        } catch (error: any) {
            console.error("❌ 圆环start阶段失败:", error?.message || error);
        }
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
        // 圆环扩大
        this._currentSize += this.expandSpeed * deltaTime;
        
        // 重新绘制圆环
        this.drawRing();
        
        // 更新碰撞体大小
        if (this._collider && this._collider.name.includes('Circle')) {
            (this._collider as any).radius = this._currentSize / 2;
        }
        
        // 减少日志频率：每隔1秒打印一次
        this._logTimer += deltaTime;
        if (this._logTimer >= 1) {
            console.log(`🌊 圆环大小: ${this._currentSize.toFixed(0)}`);
            this._logTimer = 0;
        }
        
        // 检查是否超过最大大小或屏幕边界
        const maxScreenDimension = Math.max(this._screenBounds.width, this._screenBounds.height);
        if (this._currentSize > this.maxSize || this._currentSize > maxScreenDimension * 1.5) {
            this.destroyAttack();
        }
    }

    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        // 尝试从被碰撞的物体上获取Enemy脚本
        const enemyScript = otherCollider.getComponent(Enemy);
        const enemyNode = otherCollider.node;

        // 如果获取到了，说明撞到的是敌人
        if (enemyScript && enemyNode) {
            // 延迟执行伤害，避免在物理回调中直接修改状态
            this.scheduleOnce(() => {
                if (enemyScript && enemyScript.node && enemyScript.node.isValid) {
                    const damageSuccessful = this.dealDamageToEnemy(enemyScript, this.getAttackType());
                    if (damageSuccessful) {
                        this.markEnemyAsHit(enemyNode);
                    }
                }
            }, 0);
        }
    }
    
    protected onAttackDestroy(): void {
        // 圆环销毁时可以加日志，但现在保持安静
    }
    
    protected onAttackComponentDestroy(): void {
        // 清理碰撞监听器
        if (this._collider) {
            this._collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }
} 