import { _decorator, Collider2D, Contact2DType, IPhysics2DContact, RigidBody2D, view } from 'cc';
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

    private _currentSize: number = 0;
    private _collider: Collider2D = null;
    private _screenBounds: {width: number, height: number} = {width: 0, height: 0};

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
            console.log("📐 屏幕边界:", this._screenBounds);
            
            // 设置初始大小
            this._currentSize = this.initialSize;
            const scale = this._currentSize / 200; // 基础大小为200
            this.node.setScale(scale, scale, 1);
            
            console.log("📏 圆环初始设置:");
            console.log("  - 初始大小:", this._currentSize);
            console.log("  - 计算缩放:", scale);
            console.log("  - 扩大速度:", this.expandSpeed);
            
        } catch (error) {
            console.error("❌ 圆环初始化失败:");
            console.error("  - 错误信息:", error.message);
            console.error("  - 错误堆栈:", error.stack);
        }
    }
    
    protected onAttackStart(): void {
        console.log("🔄 圆环start阶段开始");
        
        try {
            // 在start阶段设置碰撞器，避免onLoad时的问题
            this._collider = this.getComponent(Collider2D);
            let rigidbody = this.getComponent(RigidBody2D);
            
            if (this._collider) {
                console.log("✅ 找到圆环碰撞器");
                // 监听碰撞开始事件
                this._collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
                console.log("  - 碰撞器组:", this._collider.group);
                console.log("  - 碰撞器启用:", this._collider.enabled);
                console.log("  - 碰撞器类型:", this._collider.constructor.name);
            } else {
                console.error("❌ Ring Error: 圆环没有找到 Collider2D 组件!");
            }
            
            if (rigidbody) {
                console.log("✅ 找到圆环刚体");
                console.log("  - 碰撞监听器启用:", rigidbody.enabledContactListener);
            } else {
                console.error("❌ Ring Error: 圆环没有找到 RigidBody2D 组件!");
            }
            
            console.log("🌟 圆环开始扩大动画");
            
        } catch (error) {
            console.error("❌ 圆环start阶段失败:");
            console.error("  - 错误信息:", error.message);
        }
    }

    protected onAttackUpdate(deltaTime: number): void {
        // 圆环扩大
        const oldSize = this._currentSize;
        this._currentSize += this.expandSpeed * deltaTime;
        
        // 更新圆环的缩放
        const scale = this._currentSize / 200; // 基础大小为200
        this.node.setScale(scale, scale, 1);
        
        // 每秒打印一次调试信息
        if (Math.floor(oldSize / 100) !== Math.floor(this._currentSize / 100)) {
            console.log("🌊 圆环扩大中...");
            console.log("  - 当前大小:", this._currentSize.toFixed(2));
            console.log("  - 当前缩放:", scale.toFixed(2));
            console.log("  - 节点位置:", this.node.position);
            console.log("  - 节点缩放:", this.node.scale);
        }
        
        // 检查是否超过最大大小或屏幕边界
        const maxScreenDimension = Math.max(this._screenBounds.width, this._screenBounds.height);
        if (this._currentSize > this.maxSize || this._currentSize > maxScreenDimension * 1.5) {
            console.log("🗑️ 圆环超过边界，准备销毁");
            console.log("  - 当前大小:", this._currentSize.toFixed(2));
            console.log("  - 最大允许:", Math.min(this.maxSize, maxScreenDimension * 1.5).toFixed(2));
            this.destroyAttack();
        }
    }

    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        console.log("🌊 圆环碰撞检测触发！");
        console.log("  - 圆环当前大小:", this._currentSize.toFixed(2));
        console.log("  - 目标名称:", otherCollider.node.name);
        
        // 尝试从被碰撞的物体上获取Enemy脚本
        const enemyScript = otherCollider.getComponent(Enemy);
        const enemyNode = otherCollider.node;

        // 如果获取到了，说明撞到的是敌人
        if (enemyScript && enemyNode) {
            console.log("🌊 圆环击中敌人！");
            
            // 延迟执行伤害，避免在物理回调中直接修改状态
            this.scheduleOnce(() => {
                if (enemyScript && enemyScript.node && enemyScript.node.isValid) {
                    const damageSuccessful = this.dealDamageToEnemy(enemyScript, this.getAttackType());
                    if (damageSuccessful) {
                        // 记录击中的敌人（仅用于统计）
                        this.markEnemyAsHit(enemyNode);
                        console.log("📊 已击中敌人数量:", this.getHitCount());
                    }
                }
            }, 0);
            
            // 圆环不销毁，继续扩大并可以击中其他敌人
            console.log("🌊 圆环继续扩大，寻找下一个目标");
        } else {
            console.log("⚠️ 碰撞目标不是敌人:", otherCollider.node.name);
        }
    }
    
    protected onAttackDestroy(): void {
        console.log("  - 圆环生存时间:", (this._currentSize - this.initialSize) / this.expandSpeed, "秒");
    }
    
    protected onAttackComponentDestroy(): void {
        // 清理碰撞监听器
        if (this._collider) {
            this._collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }
} 