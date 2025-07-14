import { _decorator, Component, Node, RigidBody2D, Vec2, Collider2D, Sprite, Color, SpriteFrame, resources, SpriteAtlas, BoxCollider2D, tween, UIOpacity, Animation, view, Layers, UITransform, Prefab, instantiate, director, Vec3 } from 'cc';
import { GameManager } from './GameManager';
import { AttackTypeValue } from './attack/AttackSystem';
import { enemyDatabase, EnemyData } from './configs/enemy-config';
import { AutoAnimationCreator } from './AutoAnimationCreator';

const { ccclass, property } = _decorator;

/**
 * 动画状态枚举
 * 定义敌人可能的动画状态
 */
enum AnimationState {
    IDLE = 'Idle',     // 待机状态
    WALK = 'Walk',     // 行走状态
    ATTACK = 'Attack', // 攻击状态
    HURT = 'Hurt',     // 受伤状态
    DEATH = 'Death',   // 死亡状态
    FIRE = 'Fire'      // 🔥 火球技能状态
}

/**
 * 方向枚举
 * 定义敌人面向的方向，用于选择对应的动画帧
 */
enum Direction {
    FRONT = 'front', // 面向前方
    BACK = 'back',   // 面向后方
    LEFT = 'left',   // 面向左侧
    RIGHT = 'right'  // 面向右侧
}

/**
 * 敌人控制器组件
 * 管理敌人的行为、动画、战斗等所有逻辑
 */
@ccclass('EnemyController')
export class EnemyController extends Component {
    
    /**
     * 玩家节点引用 - 用于AI寻路和攻击目标判定
     */
    @property({ type: Node, tooltip: '玩家节点引用，用于AI寻路' })
    public playerNode: Node | null = null; 
    
    @property({ type: GameManager, tooltip: '游戏管理器引用' })
    public gameManager: GameManager | null = null;

    // ======================== 敌人基本属性 ========================
    
    /**
     * 敌人配置数据 - 包含血量、攻击力、速度等属性
     */
    private data: EnemyData | null = null;
    
    private _currentHealth: number = 0;
    
    private _isStunned: boolean = false;
    
    private _isDead: boolean = false;
    
    private _isAttacking: boolean = false;
    
    private _isHurt: boolean = false;
    
    private _lastAttackTime: number = 0;
    
    private _currentAnimationState: AnimationState = AnimationState.IDLE;
    
    private _currentDirection: Direction = Direction.FRONT;
    
    private _lastAttackVersions: Map<string, number> = new Map();

    // ======================== 技能系统 ========================
    
    /**
     * 技能冷却记录 - 记录每个技能的上次使用时间
     */
    private _skillCooldowns: Map<string, number> = new Map();
    
    /**
     * 是否正在使用技能
     */
    private _isUsingSkill: boolean = false;

    // ======================== 移动和速度系统 ========================
    
    /**
     * 速度修饰符系统 - 允许技能临时改变敌人速度
     */
    private _speedModifiers: Map<string, number> = new Map();
    
    private _currentSpeed: number = 0;

    // ======================== 状态变化检测 ========================
    
    /**
     * 上一帧的状态 - 用于检测状态变化，避免重复设置动画
     */
    private _lastFrameState: AnimationState = AnimationState.IDLE;
    
    /**
     * 上一帧的方向 - 用于检测方向变化
     */
    private _lastFrameDirection: Direction = Direction.FRONT;

    // ======================== 组件引用 ========================
    
    /**
     * 物理刚体组件 - 控制敌人移动
     */
    private _rigidbody: RigidBody2D | null = null;
    
    private _collider: BoxCollider2D | null = null;
    
    private _sprite: Sprite | null = null;
    
    private _uiTransform: UITransform | null = null;

    // ======================== 视觉效果系统 ========================
    
    /**
     * 原始颜色 - 用于受伤闪烁效果后的还原
     */
    private _originalColor: Color = new Color();
    
    private _animation: Animation | null = null;

    // ======================== 调试和优化相关 ========================
    
    /**
     * 调试标志 - 避免重复输出日志
     */
    private _hasLoggedPlayerRef: boolean = false;
    
    private _isInDetectionRange: boolean = false;
    
    private _debugTimer: number = 0;

    /**
     * 组件初始化
     * 获取必要的组件引用并进行基础设置
     */
    onLoad() {
        // 获取组件引用
        this._rigidbody = this.getComponent(RigidBody2D);
        this._collider = this.getComponent(BoxCollider2D);
        this._sprite = this.getComponent(Sprite);
        this._uiTransform = this.getComponent(UITransform);
        
        if (this._sprite) {
            this._originalColor = this._sprite.color.clone();
        }
        
        if (!this._rigidbody) {
            console.error('❌ EnemyController: 缺少 RigidBody2D 组件');
        }
        
        if (!this._collider) {
            console.error('❌ EnemyController: 缺少 BoxCollider2D 组件');
        }
        
        if (!this._sprite) {
            console.error('❌ EnemyController: 缺少 Sprite 组件');
        }
        
        if (!this._uiTransform) {
            console.error('❌ EnemyController: 缺少 UITransform 组件');
        }
        
        console.log('🎭 EnemyController 初始化完成');
    }

    /**
     * 初始化敌人
     * 根据敌人ID从配置数据库加载敌人数据，设置属性并开始资源加载
     * @param enemyId 要生成的敌人的ID，来自 enemy-config.ts
     */
    public init(enemyId: string) {
        console.log(`🎭 初始化敌人: ${enemyId}`);
        
        // 从数据库获取敌人配置
        this.data = enemyDatabase[enemyId];
        if (!this.data) {
            console.error(`❌ 找不到敌人数据: ${enemyId}`);
            return;
        }
        
        // 初始化敌人属性
        this._currentHealth = this.data.baseHealth;
        this._currentSpeed = this.data.moveSpeed;
        this._isDead = false;
        this._isStunned = false;
        this._isAttacking = false;
        this._isHurt = false;
        
        // 设置节点属性
        this.node.name = this.data.name;
        this.node.setScale(this.data.nodeScale, this.data.nodeScale, 1);
        
        // 设置物理属性
        if (this._rigidbody) {
            this._rigidbody.enabled = true;
            this._rigidbody.gravityScale = 0;
            this._rigidbody.fixedRotation = true;
        }
        
        if (this._collider) {
            this._collider.enabled = true;
            this._collider.sensor = false;
            this._collider.size.set(this.data.colliderSize.width, this.data.colliderSize.height);
            this._collider.apply();
        }
        
        // 初始化动画状态
        this._currentAnimationState = AnimationState.IDLE;
        this._currentDirection = Direction.FRONT;
        this._lastFrameState = AnimationState.IDLE;
        this._lastFrameDirection = Direction.FRONT;
        
        // 重新计算速度
        this.recalculateSpeed();
        
        // 加载动画资源
        this.loadAnimationAssets();
        
        console.log(`✅ 敌人初始化完成: ${this.data.name} (生命值: ${this._currentHealth}/${this.data.baseHealth})`);
    }

    /**
     * 加载动画资源
     * 异步加载敌人的图集资源并创建动画
     */
    private loadAnimationAssets() {
        if (!this.data) {
            console.error('❌ EnemyController: 无法加载动画资源，数据为空');
            return;
        }

        // 🔧 立即检查敌人的基本状态
        console.log(`🔍 敌人调试信息 - ${this.data.name}:`);
        console.log(`  - 节点激活: ${this.node.active}`);
        console.log(`  - 节点位置: (${this.node.position.x.toFixed(1)}, ${this.node.position.y.toFixed(1)})`);
        console.log(`  - 节点缩放: ${this.node.scale.x.toFixed(2)}`);
        console.log(`  - 精灵组件: ${this._sprite ? '存在' : '不存在'}`);
        if (this._sprite) {
            console.log(`  - 精灵激活: ${this._sprite.enabled}`);
            console.log(`  - 精灵帧: ${this._sprite.spriteFrame ? '存在' : 'null'}`);
            console.log(`  - 精灵颜色: (${this._sprite.color.r}, ${this._sprite.color.g}, ${this._sprite.color.b}, ${this._sprite.color.a})`);
        }

        // 🚀 优先使用预加载的资源
        const atlas = resources.get(this.data.plistUrl, SpriteAtlas);
        
        if (atlas) {
            console.log(`✅ 使用预加载的敌人图集: ${this.data.plistUrl}`);
            this.processEnemyAtlas(atlas);
        } else {
            console.log(`🔄 预加载资源不可用，异步加载敌人图集: ${this.data.plistUrl}`);
            // 回退到异步加载
            resources.load(this.data.plistUrl, SpriteAtlas, (err, atlas) => {
                if (err || !atlas || !this.data) {
                    console.error(`❌ 加载敌人图集失败: ${this.data?.plistUrl}`, err);
                    return;
                }
                this.processEnemyAtlas(atlas);
            });
        }
    }

    /**
     * 处理敌人图集数据
     */
    private processEnemyAtlas(atlas: SpriteAtlas) {
        if (!this.data) {
            console.error("❌ Enemy Error: 数据未初始化，无法处理图集");
            return;
        }

        console.log(`✅ 成功加载图集: ${this.data.plistUrl}`);
        
        // 使用自动动画创建器
        try {
            const clips = AutoAnimationCreator.createEnemyAnimations(atlas, this.data.assetNamePrefix, this.node, this.data.attackInterval);
            if (clips.length > 0) {
                // 重新获取 Animation 组件（因为可能是刚刚添加的）
                this._animation = this.getComponent(Animation);
                console.log(`✅ 使用自动动画创建器成功创建 ${clips.length} 个动画`);
                
                // 播放默认动画
                if (this._animation) {
                    AutoAnimationCreator.playAnimation(this.node, 'Idle_front');
                }
                return;
            }
        } catch (error) {
            console.error('❌ 自动动画创建器失败:', error);
        }
        
        console.error('❌ 无法创建动画，敌人将无法正常显示');
    }



    /**
     * 每帧更新 - 敌人AI的核心逻辑
     * 处理敌人的AI行为、动画更新、状态管理等
     * @param deltaTime 帧间隔时间
     */
    update(deltaTime: number) {
        // 检查基础条件：必须有有效的玩家引用和敌人数据
        if (!this.playerNode || !this.playerNode.isValid || !this.data) {
            return;
        }

        // 计算与玩家的距离（用于AI决策）
        const playerPos = this.playerNode.worldPosition;
        const enemyPos = this.node.worldPosition;
        const distance = Math.sqrt(
            Math.pow(playerPos.x - enemyPos.x, 2) + 
            Math.pow(playerPos.y - enemyPos.y, 2)
        );

        // 🔧 增强调试信息：显示检测范围和距离比较
        if (!this._hasLoggedPlayerRef) {
            console.log(`✅ ${this.data.name} 玩家节点引用正常，开始AI行为`);
            console.log(`📏 ${this.data.name} 检测配置:`);
            console.log(`  - 检测范围: ${this.data.detectionRange}`);
            console.log(`  - 追击范围: ${this.data.pursuitRange}`);
            console.log(`  - 攻击范围: ${this.data.attackRange}`);
            console.log(`  - 当前距离: ${distance.toFixed(1)}`);
            console.log(`  - 是否在检测范围内: ${distance <= this.data.detectionRange ? '是' : '否'}`);
            this._hasLoggedPlayerRef = true;
        }

        // AI行为逻辑 - 只有在未被眩晕、未受伤且未死亡时才执行
        if (!this._isStunned && !this._isHurt && !this._isDead) {
            if (distance <= this.data.detectionRange) {
                // 🔧 添加进入检测范围的日志
                if (!this._isInDetectionRange) {
                    console.log(`👁️ ${this.data.name} 发现玩家！距离: ${distance.toFixed(1)} <= 检测范围: ${this.data.detectionRange}`);
                    this._isInDetectionRange = true;
                }
                
                if (distance <= this.data.attackRange && !this._isAttacking && !this._isUsingSkill) {
                    // 🔥 智能选择攻击方式：技能 > 普通攻击
                    if (this.shouldUseSkill(distance)) {
                        this.setState(AnimationState.FIRE);
                        this.facePlayer();
                        this.performSkillAttack('fireball');
                    } else {
                        this.setState(AnimationState.ATTACK);
                        this.facePlayer();
                        this.performAttack();
                    }
                } else if (!this._isAttacking && !this._isUsingSkill) {
                    // 只有在不攻击且不使用技能时才移动
                    this.setState(AnimationState.WALK);
                    this.facePlayer();
                    this.moveTowardsPlayer(deltaTime);
                }
            } else if (distance <= this.data.pursuitRange && this._isInDetectionRange && !this._isAttacking && !this._isUsingSkill) {
                // 在追击范围内，继续追击，但攻击或使用技能时不移动
                this.setState(AnimationState.WALK);
                this.facePlayer();
                this.moveTowardsPlayer(deltaTime);
            } else if (!this._isAttacking && !this._isUsingSkill) {
                // 🔧 添加离开检测范围的日志
                if (this._isInDetectionRange) {
                    console.log(`👁️ ${this.data.name} 失去玩家目标！距离: ${distance.toFixed(1)} > 检测范围: ${this.data.detectionRange}`);
                    this._isInDetectionRange = false;
                }
                
                this.setState(AnimationState.IDLE);
            }
        }

        // 调试信息（定期输出，避免日志过多）
        if (this._debugTimer <= 0) {
            console.log(`🔍 ${this.data.name} 状态更新:`);
            console.log(`  - 玩家位置: (${playerPos.x.toFixed(1)}, ${playerPos.y.toFixed(1)})`);
            console.log(`  - 敌人位置: (${enemyPos.x.toFixed(1)}, ${enemyPos.y.toFixed(1)})`);
            console.log(`  - 距离: ${distance.toFixed(1)}`);
            console.log(`  - 当前状态: ${this.currentState}`);
            console.log(`  - 检测范围内: ${distance <= this.data.detectionRange ? '是' : '否'}`);
            console.log(`  - 追击范围内: ${distance <= this.data.pursuitRange ? '是' : '否'}`);
            this._debugTimer = 2.0; // 每2秒输出一次
        } else {
            this._debugTimer -= deltaTime;
        }
    }

    /**
     * 设置敌人状态
     * 智能检测状态和方向变化，只在真正改变时才更新动画
     * @param state 新的动画状态
     */
    private setState(state: AnimationState) {
        // 检查状态或方向是否真的改变了
        const stateChanged = this._lastFrameState !== state;
        const directionChanged = this._lastFrameDirection !== this._currentDirection;
        
        // 只有在状态或方向改变时才播放动画
        if (stateChanged || directionChanged) {
            console.log(`🎭 ${this.node.name} 动画状态改变: ${this._lastFrameState} -> ${state}, 方向: ${this._lastFrameDirection} -> ${this._currentDirection}`);
            
            this._currentAnimationState = state;
            this._lastFrameState = state;
            this._lastFrameDirection = this._currentDirection;
            
            this.tryPlayAnimation(state);
        }
    }

    /**
     * 面向玩家
     * 根据玩家位置计算敌人应该面向的方向
     */
    private facePlayer() {
        if (!this.playerNode || !this.playerNode.isValid) return;
        
        const playerPos = this.playerNode.worldPosition;
        const enemyPos = this.node.worldPosition;
        const direction = new Vec2(playerPos.x - enemyPos.x, playerPos.y - enemyPos.y);
        this._currentDirection = this.getDirectionFromVector(direction);
    }

    /**
     * 向玩家移动
     * 计算朝向玩家的方向并应用移动速度
     * @param deltaTime 帧间隔时间（未使用，但保持接口一致性）
     */
    private moveTowardsPlayer(deltaTime: number) {
        if (!this.playerNode || !this.playerNode.isValid || !this._rigidbody) return;
        
        const playerPos = this.playerNode.worldPosition;
        const enemyPos = this.node.worldPosition;
        const direction = new Vec2(playerPos.x - enemyPos.x, playerPos.y - enemyPos.y);
        direction.normalize();
        
        const velocity = direction.multiplyScalar(this._currentSpeed);
        this._rigidbody.linearVelocity = velocity;
    }

    private get currentState(): string {
        return this._currentAnimationState;
    }

    /**
     * 应用一个速度修正（例如减速、加速）
     * @param modifierId 唯一的修正ID，用于移除
     * @param ratio 速度乘数，例如 0.5 (减速50%), 1.5 (加速50%)
     */
    public applySpeedModifier(modifierId: string, ratio: number) {
        this._speedModifiers.set(modifierId, ratio);
        this.recalculateSpeed();
    }

    /**
     * 移除一个速度修正
     * @param modifierId 要移除的修正ID
     */
    public removeSpeedModifier(modifierId: string) {
        if (this._speedModifiers.has(modifierId)) {
            this._speedModifiers.delete(modifierId);
            this.recalculateSpeed();
        }
    }

    /**
     * 重新计算当前速度
     */
    private recalculateSpeed() {
        if (!this.data) return;

        let finalRatio = 1.0;
        this._speedModifiers.forEach(ratio => {
            finalRatio *= ratio;
        });

        this._currentSpeed = this.data.moveSpeed * finalRatio;
        console.log(`💨 ${this.node.name} 速度已更新为: ${this._currentSpeed.toFixed(1)} (基础: ${this.data.moveSpeed}, 乘数: ${finalRatio.toFixed(2)})`);
    }

    private getDirectionFromVector(dir: Vec2): Direction {
        if (Math.abs(dir.x) > Math.abs(dir.y)) {
            return dir.x > 0 ? Direction.RIGHT : Direction.LEFT;
        } else {
            return dir.y > 0 ? Direction.BACK : Direction.FRONT;
        }
    }

    /**
     * 尝试播放动画（带优先级控制）
     * 实现动画优先级系统：受伤 > 死亡 > 技能 > 攻击 > 其他
     * @param state 要播放的动画状态
     */
    private tryPlayAnimation(state: AnimationState) {
        // 受伤动画具有最高优先级，可以打断任何动画
        if (state === AnimationState.HURT) {
            this.playAnimation(state, this._currentDirection);
            return;
        }
        
        // 死亡动画也具有高优先级，可以打断除受伤外的任何动画
        if (state === AnimationState.DEATH) {
            this.playAnimation(state, this._currentDirection);
            return;
        }
        
        // 🔥 技能动画具有高优先级，可以打断除受伤、死亡外的任何动画
        if (state === AnimationState.FIRE) {
            this.playAnimation(state, this._currentDirection);
            return;
        }
        
        // 其他动画：只有在不处于受伤、死亡、技能或攻击状态时才能播放
        if (this._currentAnimationState !== AnimationState.HURT && 
            this._currentAnimationState !== AnimationState.DEATH &&
            this._currentAnimationState !== AnimationState.FIRE &&
            this._currentAnimationState !== AnimationState.ATTACK) {
            this.playAnimation(state, this._currentDirection);
        }
    }

    /**
     * 播放指定的动画
     * 使用自动动画系统和事件监听
     * @param state 动画状态
     * @param direction 面向方向
     */
    private playAnimation(state: AnimationState, direction: Direction) {
        if (!this._animation) {
            console.warn(`⚠️ 动画组件未初始化`);
            return;
        }
        
        const animationName = `${state}_${direction}`;
        
        // 设置状态标志
        if (state === AnimationState.HURT) {
            this._isHurt = true;
        } else if (state === AnimationState.ATTACK) {
            this._isAttacking = true;
        } else if (state === AnimationState.FIRE) {
            this._isUsingSkill = true;
        }
        
        // 尝试播放指定动画
        if (AutoAnimationCreator.hasAnimation(this.node, animationName)) {
            AutoAnimationCreator.playAnimation(this.node, animationName);
            this._currentAnimationState = state;
            this._currentDirection = direction;
            
            // 如果是单次播放的动画，则添加结束监听器
            if (state === AnimationState.ATTACK || state === AnimationState.HURT || state === AnimationState.DEATH || state === AnimationState.FIRE) {
                this.setupAnimationEndListener(state);
            }
            return;
        }
        
        // 回退到front方向
        const fallbackName = `${state}_${Direction.FRONT}`;
        if (AutoAnimationCreator.hasAnimation(this.node, fallbackName)) {
            console.log(`🔄 动画回退: ${animationName} -> ${fallbackName}`);
            AutoAnimationCreator.playAnimation(this.node, fallbackName);
            this._currentAnimationState = state;
            
            // 如果是单次播放的动画，则添加结束监听器
            if (state === AnimationState.ATTACK || state === AnimationState.HURT || state === AnimationState.DEATH || state === AnimationState.FIRE) {
                this.setupAnimationEndListener(state);
            }
            return;
        }
        
        // 最后回退到Idle_front
        if (state === AnimationState.HURT) {
            const idleName = `${AnimationState.IDLE}_${Direction.FRONT}`;
            if (AutoAnimationCreator.hasAnimation(this.node, idleName)) {
                console.log(`🔄 受伤动画缺失，使用 idle 动画作为回退: ${animationName}`);
                AutoAnimationCreator.playAnimation(this.node, idleName);
                this._currentAnimationState = AnimationState.IDLE;
                // 立即重置受伤状态，因为没有播放真正的受伤动画
                this._isHurt = false;
                return;
            }
        }

        console.warn(`⚠️ 动画缺失: ${animationName} 且无默认方向可播放`);
    }

    /**
     * 动画播放完成时的统一回调
     */
    private onAnimationFinished() {
        console.log(`🎭 动画播放完成: ${this._currentAnimationState}`);
        
        switch (this._currentAnimationState) {
            case AnimationState.ATTACK:
                this._isAttacking = false;
                // 攻击动画结束后，通常会回到待机状态
                this.setState(AnimationState.IDLE);
                break;
                
            case AnimationState.HURT:
                this._isHurt = false;
                // 受伤动画结束后，也回到待机状态
                this.setState(AnimationState.IDLE);
                break;

            case AnimationState.FIRE:
                this._isUsingSkill = false;
                console.log(`🔥 ${this.data?.name} 火球技能动画完成，重置技能状态`);
                // 技能动画结束后，回到待机状态
                this.setState(AnimationState.IDLE);
                break;

            case AnimationState.DEATH:
                // 死亡动画播放完毕后，执行渐隐和销毁
                this.fadeOutAndDestroy();
                break;
        }
    }

    /**
     * 渐隐并销毁敌人
     */
    private fadeOutAndDestroy() {
        let uiOpacity = this.getComponent(UIOpacity);
        if (!uiOpacity) {
            uiOpacity = this.node.addComponent(UIOpacity);
        }

        tween(uiOpacity)
            .to(0.3, { opacity: 0 }) // 渐隐时间
            .call(() => {
                // 通知游戏管理器敌人被击杀
                if (this.gameManager && this.data) {
                    // this.gameManager.onEnemyKilled(this.data);
                }
                this.node.destroy();
            })
            .start();
    }

    /**
     * 设置动画结束监听器
     * 使用Animation组件的事件系统
     * @param state 当前播放的动画状态
     */
    private setupAnimationEndListener(state: AnimationState) {
        if (!this._animation || !this.data) return;
        
        // 获取当前播放的动画剪辑状态
        const animationName = `${state}_${this._currentDirection}`;
        let animationState = this._animation.getState(animationName);
        
        if (!animationState) {
            // 尝试使用front方向作为回退
            animationState = this._animation.getState(`${state}_front`);
        }
        
        if (animationState) {
            // 先移除旧的监听器，避免重复注册
            animationState.off('finished', this.onAnimationFinished, this);
            // 注册动画结束事件监听
            animationState.on('finished', this.onAnimationFinished, this);
        } else {
            // 如果无法获取动画状态，使用延时回调作为备用方案
            const defaultDuration = state === AnimationState.HURT ? 0.5 : 
                                   state === AnimationState.ATTACK ? 1.0 : 1.0;
            
            this.scheduleOnce(() => {
                this.onAnimationFinished();
            }, defaultDuration);
        }
    }



    /**
     * 执行攻击
     * 播放攻击动画，动画结束后会自动重置状态
     */
    private performAttack() {
        if (!this.data) return;
        
        this._isAttacking = true;
        this._lastAttackTime = Date.now() / 1000;
        
        // 停止移动
        if (this._rigidbody) {
            this._rigidbody.linearVelocity = Vec2.ZERO;
        }

        // 强制播放攻击动画 - 重置状态检测确保攻击动画能播放
        this._lastFrameState = AnimationState.IDLE;
        this._currentAnimationState = AnimationState.ATTACK;
        this._lastFrameState = AnimationState.ATTACK;
        
        // 播放攻击动画，动画结束后会自动调用onAnimationFinished重置状态
        this.playAnimation(AnimationState.ATTACK, this._currentDirection);
        
        // TODO: 实现实际的攻击伤害逻辑
        // 例如：如果是近战，检测范围内的玩家
        // 例如：如果是远程，创建一个投掷物
    }

    /**
     * 🔥 判断是否应该使用技能
     * @param distance 与玩家的距离
     * @returns 是否应该使用技能
     */
    private shouldUseSkill(distance: number): boolean {
        // 检查是否有技能配置
        if (!this.data || !this.data.skills || this.data.skills.length === 0) {
            return false;
        }

        // 遍历所有技能，检查是否有可用的
        for (const skill of this.data.skills) {
            if (this.canUseSkill(skill.id)) {
                // 根据技能概率决定是否使用
                if (Math.random() < skill.chance) {
                    console.log(`🔥 ${this.data.name} 决定使用技能: ${skill.id} (概率: ${skill.chance * 100}%)`);
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * 🔥 检查技能是否可以使用（冷却检查）
     * @param skillId 技能ID
     * @returns 是否可以使用
     */
    private canUseSkill(skillId: string): boolean {
        const now = Date.now() / 1000;
        const lastUsed = this._skillCooldowns.get(skillId) || 0;
        
        // 获取技能配置
        const skill = this.data?.skills?.find(s => s.id === skillId);
        if (!skill) {
            return false;
        }

        const cooldownElapsed = now - lastUsed;
        const canUse = cooldownElapsed >= skill.cooldown;
        
        if (!canUse) {
            const remaining = skill.cooldown - cooldownElapsed;
            console.log(`⏰ 技能 ${skillId} 冷却中，剩余: ${remaining.toFixed(1)}秒`);
        }

        return canUse;
    }

    /**
     * 🔥 执行技能攻击
     * @param skillId 技能ID
     */
    private performSkillAttack(skillId: string): void {
        if (!this.data) return;

        // 获取技能配置
        const skill = this.data.skills?.find(s => s.id === skillId);
        if (!skill) {
            console.error(`❌ 找不到技能配置: ${skillId}`);
            return;
        }

        // 设置技能状态
        this._isUsingSkill = true;
        this._skillCooldowns.set(skillId, Date.now() / 1000);

        // 停止移动
        if (this._rigidbody) {
            this._rigidbody.linearVelocity = Vec2.ZERO;
        }

        // 强制播放技能动画
        this._lastFrameState = AnimationState.IDLE;
        this._currentAnimationState = AnimationState.FIRE;
        this._lastFrameState = AnimationState.FIRE;

        // 播放技能动画
        this.playAnimation(AnimationState.FIRE, this._currentDirection);

        console.log(`🔥 ${this.data.name} 使用技能: ${skillId}`);

        // 🔥 根据不同技能ID创建不同的技能效果
        if (skillId === 'fireball') {
            // 延迟创建火球，在动画播放到合适时机时触发
            const delayTime = 0.3; // 延迟0.3秒，让释放动画播放一段时间
            this.scheduleOnce(() => {
                this.createFireballAttack();
            }, delayTime);
            console.log(`🔥 火球技能动画开始播放，${delayTime}秒后创建火球攻击`);
        }
    }

    /**
     * 🔥 创建火球攻击
     */
    private createFireballAttack(): void {
        if (!this.playerNode || !this.playerNode.isValid) {
            console.warn(`⚠️ 无法创建火球攻击：缺少玩家目标`);
            return;
        }

        // 查找火球预制件
        resources.load('Fireball', Prefab, (err, fireball) => {
            if (err) {
                console.error(`❌ 加载火球预制件失败:`, err);
                return;
            }

            const fireballNode = instantiate(fireball);
            
            // 设置火球的父节点为场景根节点
            const scene = director.getScene();
            if (!scene) {
                console.error(`❌ 无法获取当前场景`);
                fireballNode.destroy();
                return;
            }
            
            fireballNode.setParent(scene);
            
            // 设置火球起始位置（巫妖位置）
            const startPosition = this.node.worldPosition;
            fireballNode.setWorldPosition(startPosition);
            
            // 设置火球目标位置（玩家位置）
            const targetPosition = this.playerNode!.worldPosition;
            const fireballComponent = fireballNode.getComponent('Fireball') as any;
            
            if (fireballComponent) {
                // 设置火球属性
                fireballComponent.damage = this.data?.baseAttack || 25; // 使用巫妖的攻击力
                fireballComponent.moveSpeed = 250; // 火球移动速度（指向性攻击稍快一些）
                fireballComponent.explosionRadius = 100; // 爆炸范围（稍大一些补偿指向性的不精确）
                
                // 🎯 设置为指向性攻击：火球朝着释放时玩家的位置直线飞行，不跟踪
                const direction = new Vec2(
                    targetPosition.x - startPosition.x,
                    targetPosition.y - startPosition.y
                ).normalize();
                
                // 重新配置瞄准系统为固定方向模式
                if (typeof fireballComponent.setAimingConfig === 'function') {
                    fireballComponent.setAimingConfig({
                        mode: 'fixedDirection', // 使用固定方向而不是跟踪敌人
                        movementMode: 'linear',
                        fixedDirection: direction,
                        speed: fireballComponent.moveSpeed,
                        useWorldCoordinates: true
                    });
                }
                
                // 也设置目标位置用于距离检测
                if (typeof fireballComponent.setTarget === 'function') {
                    fireballComponent.setTarget(new Vec3(targetPosition.x, targetPosition.y, 0));
                }
                
                console.log(`🔥 ${this.data?.name} 创建指向性火球攻击！`);
                console.log(`  - 起始位置: (${startPosition.x.toFixed(1)}, ${startPosition.y.toFixed(1)})`);
                console.log(`  - 目标位置: (${targetPosition.x.toFixed(1)}, ${targetPosition.y.toFixed(1)})`);
                console.log(`  - 飞行方向: (${direction.x.toFixed(2)}, ${direction.y.toFixed(2)})`);
                console.log(`  - 伤害: ${fireballComponent.damage}`);
            } else {
                console.error(`❌ 火球预制件缺少 Fireball 组件`);
                fireballNode.destroy();
            }
        });
    }

    /**
     * 受到伤害处理
     * 处理敌人受伤的完整流程：伤害计算、动画播放、状态更新
     * @param damage 伤害值
     * @param attackType 攻击类型
     * @param version 攻击版本号（防止重复伤害）
     */
    public takeDamage(damage: number, attackType: AttackTypeValue, version: number) {
        // 死亡或数据无效时忽略伤害
        if (this._isDead || !this.data) {
            return;
        }

        // 防止重复攻击造成多次伤害
        const attackId = `${attackType}_${version}`;
        if (this._lastAttackVersions.has(attackId)) {
            return; // 重复攻击，不造成伤害
        }
        this._lastAttackVersions.set(attackId, 1);

        // 扣除生命值并记录日志
        this._currentHealth -= damage;
        console.log(`💥 ${this.data.name} 受到 ${damage} 点伤害，剩余血量: ${this._currentHealth}/${this.data.baseHealth}`);

        if (this._currentHealth <= 0) {
            // 生命值耗尽，触发死亡
            this.die();
        } else {
            // 强制播放受伤动画，打断当前动画
            // 重置状态检测以确保受伤动画强制播放
            this._lastFrameState = AnimationState.IDLE;
            this._currentAnimationState = AnimationState.HURT;
            this._lastFrameState = AnimationState.HURT;
            this.playAnimation(AnimationState.HURT, this._currentDirection);
            
            // 应用眩晕效果（受击硬直）
            this.applyStun();
            
            // 立即停止移动
            if (this._rigidbody) {
                this._rigidbody.linearVelocity = Vec2.ZERO;
            }
        }
    }

    public getCurrentHealth(): number {
        return this._currentHealth;
    }

    /**
     * 应用眩晕效果
     * 在受伤后应用短暂的眩晕状态，期间敌人无法行动
     */
    private applyStun() {
        if (!this.data || !this.data.stunDuration) return;
        
        // 设置眩晕状态
        this._isStunned = true;
        
        // 定时恢复
        this.scheduleOnce(() => {
            this._isStunned = false;
        }, this.data.stunDuration);
    }

    private die() {
        if (!this.data) return;

        this._isDead = true;
        if (this._rigidbody) this._rigidbody.linearVelocity = Vec2.ZERO;
        if (this._collider) this._collider.enabled = false;
        
        // 强制播放死亡动画 - 重置状态检测确保死亡动画能播放
        this._lastFrameState = AnimationState.IDLE;
        this._currentAnimationState = AnimationState.DEATH;
        this._lastFrameState = AnimationState.DEATH;
        
        // 播放死亡动画，动画结束后会自动调用fadeOutAndDestroy
        this.playAnimation(AnimationState.DEATH, this._currentDirection);
    }

    /**
     * 简化的精灵帧设置方法
     * 直接设置精灵帧，让引擎的SizeMode机制自动处理尺寸调整
     * @param spriteFrame 要设置的精灵帧
     */
    private setSpriteFrame(spriteFrame: SpriteFrame) {
        if (this._sprite && spriteFrame) {
            this._sprite.spriteFrame = spriteFrame;
            // 引擎会根据Sprite组件的SizeMode自动调整UITransform尺寸
            // 不需要手动干预
        }
    }
}