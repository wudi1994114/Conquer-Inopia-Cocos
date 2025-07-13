import { _decorator, Component, Node, RigidBody2D, Vec2, Collider2D, Sprite, Color, SpriteFrame, resources, SpriteAtlas, BoxCollider2D, tween, UIOpacity, Animation, view, Layers } from 'cc';
import { GameManager } from './GameManager';
import { AttackTypeValue } from './attack/AttackSystem';
import { enemyDatabase, EnemyData } from './configs/enemy-config';
import { AutoAnimationCreator } from './AutoAnimationCreator';

const { ccclass, property } = _decorator;

// 动画状态枚举
enum AnimationState {
    IDLE = 'Idle',
    WALK = 'Walk',
    ATTACK = 'Attack',
    HURT = 'Hurt',
    DEATH = 'Death'
}

// 方向枚举
enum Direction {
    FRONT = 'front',
    BACK = 'back',
    LEFT = 'left',
    RIGHT = 'right'
}

@ccclass('EnemyController')
export class EnemyController extends Component {

    // --- 公共引用 ---
    public playerNode: Node | null = null; 
    public gameManager: GameManager | null = null;
    
    // --- 数据与状态 ---
    private data: EnemyData | null = null; // 当前敌人的配置数据
    private _currentHealth: number = 0;
    private _isStunned: boolean = false;
    private _isDead: boolean = false;
    private _isAttacking: boolean = false;
    private _lastAttackTime: number = 0;
    private _currentAnimationState: AnimationState = AnimationState.IDLE;
    private _currentDirection: Direction = Direction.FRONT;
    private _lastAttackVersions: Map<string, number> = new Map();

    // --- 速度控制 ---
    private _speedModifiers: Map<string, number> = new Map(); // key: modifierId, value: ratio
    private _currentSpeed: number = 0;

    // --- 组件引用 ---
    private _rigidbody: RigidBody2D | null = null;
    private _collider: BoxCollider2D | null = null;
    private _sprite: Sprite | null = null;
    
    // --- 颜色与动画 ---
    private _originalColor: Color = new Color();
    private _enemyFrames: Map<string, SpriteFrame[]> = new Map();
    private _currentFrameIndex: number = 0;
    private _animationTimer: number = 0;
    private _animation: Animation | null = null;
    private _useAutoAnimation: boolean = false;
    
    // --- 调试与状态跟踪 ---
    private _hasLoggedPlayerRef: boolean = false;
    private _isInDetectionRange: boolean = false; // 🔧 添加检测范围状态追踪
    private _debugTimer: number = 0; // 🔧 添加调试定时器

    onLoad() {
        this._rigidbody = this.getComponent(RigidBody2D);
        this._collider = this.getComponent(BoxCollider2D);
        this._sprite = this.getComponent(Sprite);
        this._animation = this.getComponent(Animation);

        if (this._sprite) {
            this._originalColor.set(this._sprite.color);
            
            // 🔧 修复：确保精灵颜色为正常的白色
            if (this._sprite.color.r === 255 && this._sprite.color.g === 255 && this._sprite.color.b === 0) {
                console.log('🔧 修复异常的黄色精灵，设置为白色');
                this._sprite.color = new Color(255, 255, 255, 255);
                this._originalColor.set(this._sprite.color);
            }
        }
    }

    /**
     * 初始化敌人
     * @param enemyId 要生成的敌人的ID, 来自 enemy-config.ts
     */
    public init(enemyId: string) {
        this.data = enemyDatabase[enemyId];
        if (!this.data) {
            console.error(`❌ Enemy Error: 在怪物数据库中未找到ID为 '${enemyId}' 的配置!`);
            this.node.destroy();
            return;
        }

        console.log(`✅ 初始化敌人: ${this.data.name} (ID: ${this.data.id})`);

        // --- 根据数据设置属性 ---
        this.node.name = this.data.name;
        this.node.setScale(this.data.nodeScale, this.data.nodeScale, 1);
        this._currentHealth = this.data.baseHealth;
        this._currentSpeed = this.data.moveSpeed;
        // console.log(`🚀 ${this.data.name} 初始化: 移动速度=${this._currentSpeed}, 检测范围=${this.data.detectionRange}, 攻击范围=${this.data.attackRange}`); 

        // --- 设置物理属性 ---
        if (this._rigidbody) {
            this._rigidbody.enabled = true;
            this._rigidbody.gravityScale = 0;
            this._rigidbody.fixedRotation = true;
        }
        
        // 显式地进行空值检查
        if (this._collider) {
            this._collider.enabled = true;
            this._collider.sensor = false;
            this._collider.size.set(this.data.colliderSize.width, this.data.colliderSize.height);
            this._collider.apply();
        }

        // --- 异步加载动画资源 ---
        this.loadAnimationAssets();
    }

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
        
        // 🔧 立即检查图集内容
        const spriteFrames = atlas.getSpriteFrames();
        console.log(`📋 图集包含 ${spriteFrames.length} 个精灵帧:`);
        spriteFrames.slice(0, 5).forEach((frame, index) => {
            if (frame) {
                console.log(`  - [${index}] ${frame.name}`);
            }
        });
        if (spriteFrames.length > 5) {
            console.log(`  - ... 还有 ${spriteFrames.length - 5} 个帧`);
        }
        
        // 尝试使用自动动画创建器
        try {
            const clips = AutoAnimationCreator.createEnemyAnimations(atlas, this.data.assetNamePrefix, this.node);
            if (clips.length > 0) {
                this._useAutoAnimation = true;
                // 重新获取 Animation 组件（因为可能是刚刚添加的）
                this._animation = this.getComponent(Animation);
                console.log(`✅ 使用自动动画创建器成功创建 ${clips.length} 个动画`);
                
                // 🔧 再次检查精灵状态
                if (this._sprite) {
                    console.log(`🔍 动画创建后精灵状态:`);
                    console.log(`  - 精灵帧: ${this._sprite.spriteFrame ? '存在' : 'null'}`);
                    if (this._sprite.spriteFrame) {
                        console.log(`  - 精灵帧名称: ${this._sprite.spriteFrame.name}`);
                    }
                    
                    // 🔧 强制可见性检查
                    console.log(`  - 精灵激活: ${this._sprite.enabled}`);
                    console.log(`  - 精灵颜色: (${this._sprite.color.r}, ${this._sprite.color.g}, ${this._sprite.color.b}, ${this._sprite.color.a})`);
                    console.log(`  - 节点激活: ${this.node.active}`);
                    console.log(`  - 节点位置: (${this.node.position.x.toFixed(1)}, ${this.node.position.y.toFixed(1)})`);
                    
                    // 🔧 确保敌人完全可见
                    if (!this._sprite.enabled) {
                        this._sprite.enabled = true;
                        console.log('🔧 强制启用精灵组件');
                    }
                    
                    if (!this.node.active) {
                        this.node.active = true;
                        console.log('🔧 强制启用敌人节点');
                    }
                    
                    // 🔧 检查渲染层级和父节点
                    console.log(`🔍 渲染层级调试:`);
                    console.log(`  - 节点层级: ${this.node.layer}`);
                    console.log(`  - 父节点: ${this.node.parent ? this.node.parent.name : 'null'}`);
                    console.log(`  - 世界变换: ${this.node.worldMatrix}`);
                    console.log(`  - 精灵材质: ${this._sprite.material ? this._sprite.material.name : 'null'}`);
                    console.log(`  - 精灵着色器: ${this._sprite.material ? this._sprite.material.effectName : 'null'}`);
                    
                    // 🔧 强制设置渲染层级
                    // 🔧 注意：不再硬编码DEFAULT层，而是保持当前层级
                    // 层级应该由GameManager在生成时正确设置
                    console.log(`🔍 当前敌人层级: ${this.node.layer}`);
                    
                    // 🔧 强制视觉测试：让敌人变大并改变颜色
                    const testMode = true;
                    if (testMode) {
                        // 放大敌人
                        this.node.setScale(2.0, 2.0, 1.0);
                        console.log('🧪 测试模式：敌人放大到2倍');
                        
                        // 改变颜色为红色，确保可见
                        this._sprite.color = new Color(255, 0, 0, 255);
                        console.log('🧪 测试模式：敌人颜色改为红色');
                    }
                }
                
                // 播放默认动画
                if (this._animation) {
                    AutoAnimationCreator.playAnimation(this.node, 'Idle_front');
                }
                return;
            }
        } catch (error) {
            console.warn('⚠️ 自动动画创建器失败，回退到手动模式:', error);
        }
        
        // 回退到原有的手动模式
        this._useAutoAnimation = false;
        
        // 手动提取动画帧
        const animationStates = [AnimationState.IDLE, AnimationState.WALK, AnimationState.ATTACK, AnimationState.HURT, AnimationState.DEATH];
        const directions = [Direction.FRONT, Direction.BACK, Direction.LEFT, Direction.RIGHT];
        
        for (const state of animationStates) {
            for (const direction of directions) {
                const frames = this.extractAnimationFrames(atlas, this.data.assetNamePrefix, state, direction);
                if (frames.length > 0) {
                    const key = `${state}_${direction}`;
                    this._enemyFrames.set(key, frames);
                    console.log(`✅ 提取动画帧: ${key} (${frames.length} 帧)`);
                }
            }
        }
        
        // 设置初始精灵帧
        const idleFrontFrames = this._enemyFrames.get('Idle_front');
        if (idleFrontFrames && idleFrontFrames.length > 0 && this._sprite) {
            this._sprite.spriteFrame = idleFrontFrames[0];
            console.log(`✅ 设置初始精灵帧: ${idleFrontFrames[0].name}`);
        }
        
        // 确保敌人在屏幕中央可见
        this.node.setPosition(100, 100, 0);
        
        // 🔧 检查敌人是否在摄像机视野内
        const cameraSize = view.getVisibleSize();
        const enemyPos = this.node.position;
        const inView = Math.abs(enemyPos.x) < cameraSize.width / 2 && Math.abs(enemyPos.y) < cameraSize.height / 2;
        console.log(`🔍 敌人位置: (${enemyPos.x.toFixed(1)}, ${enemyPos.y.toFixed(1)})`);
        console.log(`🔍 摄像机视野: ${cameraSize.width.toFixed(1)}x${cameraSize.height.toFixed(1)}`);
        console.log(`🔍 敌人是否在视野内: ${inView ? '是' : '否'}`);
        
        // 🔧 强制修正位置到视野内
        if (!inView) {
            const newX = Math.random() * 200 - 100; // -100 到 100 之间
            const newY = Math.random() * 200 - 100; // -100 到 100 之间
            this.node.setPosition(newX, newY, 0);
            console.log(`🔧 修正敌人位置到视野内: (${newX.toFixed(1)}, ${newY.toFixed(1)})`);
        }
    }

    /**
     * 从图集中提取特定动画的所有帧
     */
    private extractAnimationFrames(atlas: SpriteAtlas, prefix: string, state: AnimationState, direction: Direction): SpriteFrame[] {
        const frames: SpriteFrame[] = [];
        let i = 0;
        while (true) {
            const frameNumber = i < 10 ? `0${i}` : `${i}`;
            const frameName = `${prefix}_${state}_${direction}${frameNumber}`;
            const frame = atlas.getSpriteFrame(frameName);
            if (frame) {
                frames.push(frame);
                i++;
            } else {
                // 如果第0帧都找不到，可能这个方向/状态的动画不存在
                if (i === 0) { 
                    // console.warn(`⚠️ 未找到动画序列的起始帧: ${frameName}`);
                }
                break;
            }
        }
        return frames;
    }

    /**
     * 智能获取图集中的资源前缀 (例如 'Ent1', 'Lich2' 等)
     */
    /*
    private getAssetNamePrefix(atlas: SpriteAtlas): string {
        if (!this.data) return ''; // 安全检查

        const firstFrameName = atlas.getSpriteFrames()[0]?.name;
        if (firstFrameName) {
            const match = firstFrameName.match(/^([a-zA-Z0-9]+)_/);
            if (match && match[1]) {
                return match[1];
            }
        }
        console.warn('⚠️ 无法从图集中智能推断资源前缀, 将使用一个默认值。请检查图集内命名是否规范 (如 Ent1_Idle_front00)');
        // 如果无法推断，可以返回一个基于plistUrl的猜测值
        const parts = this.data.plistUrl.split('/');
        return parts[parts.length - 1];
    }
    */


    update(deltaTime: number) {
        // 检查基础条件
        if (!this.playerNode || !this.playerNode.isValid || !this.data) {
            return;
        }

        // 计算与玩家的距离
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

        // AI行为逻辑
        if (distance <= this.data.detectionRange) {
            // 🔧 添加进入检测范围的日志
            if (!this._isInDetectionRange) {
                console.log(`👁️ ${this.data.name} 发现玩家！距离: ${distance.toFixed(1)} <= 检测范围: ${this.data.detectionRange}`);
                this._isInDetectionRange = true;
            }
            
            if (distance <= this.data.attackRange) {
                this.setState(AnimationState.ATTACK);
                this.facePlayer();
                this.performAttack();
            } else {
                this.setState(AnimationState.WALK);
                this.facePlayer();
                this.moveTowardsPlayer(deltaTime);
            }
        } else if (distance <= this.data.pursuitRange && this._isInDetectionRange) {
            // 在追击范围内，继续追击
            this.setState(AnimationState.WALK);
            this.facePlayer();
            this.moveTowardsPlayer(deltaTime);
        } else {
            // 🔧 添加离开检测范围的日志
            if (this._isInDetectionRange) {
                console.log(`👁️ ${this.data.name} 失去玩家目标！距离: ${distance.toFixed(1)} > 检测范围: ${this.data.detectionRange}`);
                this._isInDetectionRange = false;
            }
            
            this.setState(AnimationState.IDLE);
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

    // 🔧 添加缺失的方法定义
    private setState(state: AnimationState) {
        this._currentAnimationState = state;
        this.tryPlayAnimation(state);
    }

    private facePlayer() {
        if (!this.playerNode || !this.playerNode.isValid) return;
        
        const playerPos = this.playerNode.worldPosition;
        const enemyPos = this.node.worldPosition;
        const direction = new Vec2(playerPos.x - enemyPos.x, playerPos.y - enemyPos.y);
        this._currentDirection = this.getDirectionFromVector(direction);
    }

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

    private tryPlayAnimation(state: AnimationState) {
        if (this._currentAnimationState !== state && this._currentAnimationState !== AnimationState.HURT && this._currentAnimationState !== AnimationState.ATTACK) {
            this.playAnimation(state, this._currentDirection);
        }
    }

    private playAnimation(state: AnimationState, direction: Direction) {
        // 如果使用自动动画系统
        if (this._useAutoAnimation && this._animation) {
            const animationName = `${state}_${direction}`;
            
            // 尝试播放指定动画
            if (AutoAnimationCreator.hasAnimation(this.node, animationName)) {
                AutoAnimationCreator.playAnimation(this.node, animationName);
                this._currentAnimationState = state;
                this._currentDirection = direction;
                return;
            }
            
            // 回退到front方向
            const fallbackName = `${state}_${Direction.FRONT}`;
            if (AutoAnimationCreator.hasAnimation(this.node, fallbackName)) {
                console.log(`🔄 动画回退: ${animationName} -> ${fallbackName}`);
                AutoAnimationCreator.playAnimation(this.node, fallbackName);
                this._currentAnimationState = state;
                return;
            }
            
            // 最后回退到Idle_front
            if (state === AnimationState.HURT) {
                const idleName = `${AnimationState.IDLE}_${Direction.FRONT}`;
                if (AutoAnimationCreator.hasAnimation(this.node, idleName)) {
                    console.log(`🔄 受伤动画缺失，使用 idle 动画作为回退: ${animationName}`);
                    AutoAnimationCreator.playAnimation(this.node, idleName);
                    this._currentAnimationState = AnimationState.IDLE;
                    return;
                }
            }

            console.warn(`⚠️ 动画缺失: ${animationName} 且无默认方向可播放`);
            // 作为最后的回退，至少确保精灵帧存在
            if (this._sprite && this._enemyFrames.size > 0) {
                const firstAvailableFrames = Array.from(this._enemyFrames.values())[0];
                if (firstAvailableFrames && firstAvailableFrames.length > 0) {
                    this._sprite.spriteFrame = firstAvailableFrames[0];
                }
            }
            return;
        }
        
        // 原有的手动模式
        const animationKey = `${state}_${direction}`;
        const frames = this._enemyFrames.get(animationKey);

        if (!frames || frames.length === 0) {
            // 如果特定方向的动画不存在, 尝试播放默认的 'front' 方向
            const fallbackKey = `${state}_${Direction.FRONT}`;
            const fallbackFrames = this._enemyFrames.get(fallbackKey);
            if (fallbackFrames && fallbackFrames.length > 0) {
                this.startAnimation(fallbackFrames, state);
                return;
            }

            // 如果受伤动画不存在，尝试播放 idle 动画作为最后的回退
            if (state === AnimationState.HURT) {
                const idleFrames = this._enemyFrames.get(`${AnimationState.IDLE}_${Direction.FRONT}`);
                if (idleFrames && idleFrames.length > 0) {
                    console.log(`🔄 受伤动画缺失，使用 idle 动画作为回退: ${animationKey}`);
                    this.startAnimation(idleFrames, AnimationState.IDLE);
                    return;
                }
            }

            console.warn(`⚠️ 动画缺失: ${animationKey} 且无默认方向可播放`);
            return;
        }

        this.startAnimation(frames, state);
    }
    
    private startAnimation(frames: SpriteFrame[], state: AnimationState) {
        this._currentAnimationState = state;
        this._currentFrameIndex = 0;
        this._animationTimer = 0;
        if (this._sprite) {
            this._sprite.spriteFrame = frames[0];
        }
    }

    private updateAnimation(deltaTime: number) {
        // 如果使用自动动画系统，跳过手动更新
        if (this._useAutoAnimation) {
            return;
        }
        
        if (!this.data) return; // 安全检查

        const animationKey = `${this._currentAnimationState}_${this._currentDirection}`;
        const frames = this._enemyFrames.get(animationKey) || this._enemyFrames.get(`${this._currentAnimationState}_${Direction.FRONT}`);

        if (!frames || frames.length === 0) {
            return;
        }

        this._animationTimer += deltaTime;
        const frameDuration = 1 / this.data.animationSpeed;

        if (this._animationTimer >= frameDuration) {
            this._animationTimer -= frameDuration;
            this._currentFrameIndex = (this._currentFrameIndex + 1);

            // 动画播放完毕
            if (this._currentFrameIndex >= frames.length) {
                if (this._currentAnimationState === AnimationState.ATTACK || this._currentAnimationState === AnimationState.HURT) {
                    this.playAnimation(AnimationState.IDLE, this._currentDirection);
                } else {
                    this._currentFrameIndex = 0; // 循环播放
                }
            }
            
            if (this._sprite && this._currentFrameIndex < frames.length) {
                this._sprite.spriteFrame = frames[this._currentFrameIndex];
            }
        }
    }

    private performAttack() {
        if (!this.data) return;
        this._isAttacking = true;
        this._lastAttackTime = Date.now() / 1000;
        if (this._rigidbody) {
            this._rigidbody.linearVelocity = Vec2.ZERO;
        }

        this.playAnimation(AnimationState.ATTACK, this._currentDirection);
        
        // 在攻击动画的某个特定时间点造成伤害，这里用延迟模拟
        this.scheduleOnce(() => {
            this._isAttacking = false;
            // TODO: 实现实际的攻击伤害逻辑
            // 例如：如果是近战，检测范围内的玩家
            // 例如：如果是远程，创建一个投掷物
        }, 0.5); 
    }

    public takeDamage(damage: number, attackType: AttackTypeValue, version: number) {
        if (this._isDead || !this.data) {
            return;
        }

        const attackId = `${attackType}_${version}`;
        if (this._lastAttackVersions.has(attackId)) {
            return; // 重复攻击，不造成伤害
        }
        this._lastAttackVersions.set(attackId, 1);

        this._currentHealth -= damage;
        this.showDamageFlash();

        if (this._currentHealth <= 0) {
            this.die();
        } else {
            // 尝试播放受伤动画，如果动画还没加载完成则只显示伤害闪烁
            this.tryPlayAnimation(AnimationState.HURT);
            this.applyStun();
        }
    }

    public getCurrentHealth(): number {
        return this._currentHealth;
    }

    private applyStun() {
        if (!this.data || !this.data.stunDuration) return;
        this._isStunned = true;
        this.scheduleOnce(() => {
            this._isStunned = false;
        }, this.data.stunDuration);
    }

    private showDamageFlash() {
        if (!this._sprite || !this.data || !this.data.damageFlashDuration) return;
        this._sprite.color = Color.RED;
        this.scheduleOnce(() => {
            if (this._sprite) {
                this._sprite.color = this._originalColor;
            }
        }, this.data.damageFlashDuration);
    }

    private die() {
        if (!this.data) return;

        this._isDead = true;
        if (this._rigidbody) this._rigidbody.linearVelocity = Vec2.ZERO;
        if (this._collider) this._collider.enabled = false;
        
        this.playAnimation(AnimationState.DEATH, this._currentDirection);

        // 死亡动画播放后消失
        const deathAnimKey = `${AnimationState.DEATH}_${this._currentDirection}`;
        const deathFrames = this._enemyFrames.get(deathAnimKey) || this._enemyFrames.get(`${AnimationState.DEATH}_${Direction.FRONT}`);
        const deathDuration = deathFrames ? (deathFrames.length / this.data.animationSpeed) : 1.0;

        // 使用 tween 来实现延迟和渐隐
        let uiOpacity = this.getComponent(UIOpacity);
        if (!uiOpacity) {
            uiOpacity = this.node.addComponent(UIOpacity);
        }

        tween(uiOpacity)
            .delay(deathDuration)
            .to(0.3, { opacity: 0 })
            .call(() => {
                // TODO: 通知GameManager敌人死亡，获得经验等
                // this.gameManager.onEnemyKilled(this.data);
                this.node.destroy();
            })
            .start();
    }
}