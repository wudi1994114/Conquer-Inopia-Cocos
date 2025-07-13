import { _decorator, Component, Node, Prefab, instantiate, Vec2, RigidBody2D, director, Vec3 } from 'cc';
import { SKILL_CONFIGS, SkillInstance, SkillUtils } from './attack/skill-config';
import { EventManager, GameEvents, PlayerAttackEventData, TargetData } from './EventManager';
import { GameManager } from './GameManager';
import { PhysicsGroups } from './PhysicsGroups';
import { AttackSystem } from './attack/AttackSystem'; // 引入 AttackSystem

const { ccclass, property } = _decorator;

/**
 * 技能管理器 - 管理玩家的所有技能
 */
@ccclass('SkillManager')
export class SkillManager extends Component {
    
    // 技能预制体引用
    @property({ type: [Prefab], tooltip: '所有技能的预制体' })
    public skillPrefabs: Prefab[] = [];
    
    // 当前拥有的技能实例
    private ownedSkills: Map<string, SkillInstance> = new Map();
    
    // 激活中的技能节点
    private activeSkillNodes: Map<string, Node[]> = new Map();
    
    // 绑定的事件处理器引用（修复内存泄漏）
    private boundPlayerAttackHandler!: (data: PlayerAttackEventData) => void;
    private boundAttackHitHandler!: (data: any) => void;
    
    // 动态构建的技能预制体映射（基于名称而非索引）
    private skillPrefabMap: Map<string, Prefab> = new Map();
    
    onLoad() {
        // 绑定事件处理器一次并保存引用
        this.boundPlayerAttackHandler = this.onPlayerAttack.bind(this);
        this.boundAttackHitHandler = this.onAttackHit.bind(this);
        
        // 构建技能预制体映射
        this.buildSkillPrefabMap();
        
        // 订阅事件
        this.subscribeToEvents();
        
        // 自动获取基础技能
        this.initializeBasicSkills();
    }

    /**
     * 动态构建技能预制体映射
     * 基于预制体名称而非索引，更加健壮
     */
    private buildSkillPrefabMap() {
        // 清空现有映射
        this.skillPrefabMap.clear();
        
        // 技能ID到预制体名称的映射
        const skillPrefabNames: { [skillId: string]: string } = {
            'bullet': 'Bullet',
            'ring': 'DrawRing',  // 根据项目文件结构，Ring已被删除，使用DrawRing
            'laser': 'Laser',
            'fireball': 'Fireball',
            'freeze': 'Freeze',
            'flyingDisc': 'FlyingDisc',
            'fireballExtension': 'FireballExtension',
            'thunderChain': 'ThunderChain' // 新增：闪电链预制体
        };
        
        // 遍历所有技能预制体，根据名称建立映射
        this.skillPrefabs.forEach((prefab, index) => {
            if (!prefab) {
                console.warn(`⚠️ 预制体索引 ${index} 为空`);
                return;
            }
            
            const prefabName = prefab.name;
            
            // 查找匹配的技能ID
            const skillIds = Object.keys(skillPrefabNames);
            for (const skillId of skillIds) {
                const expectedName = skillPrefabNames[skillId];
                if (prefabName === expectedName) {
                    this.skillPrefabMap.set(skillId, prefab);
                    break;
                }
            }
        });
        
        // 验证所有必需的技能预制体是否都已找到
        const requiredSkills = Object.keys(skillPrefabNames);
        const missingSkills = requiredSkills.filter(skillId => !this.skillPrefabMap.has(skillId));
        

    }

    /**
     * 初始化基础技能
     */
    private initializeBasicSkills() {
        const basicSkills = ['bullet', 'laser', 'fireball', 'freeze', 'flyingDisc', 'ring', 'fireballExtension', 'thunderChain'];
        
        basicSkills.forEach(skillId => {
            if (!this.acquireSkill(skillId)) {
                console.warn(`⚠️ 获取基础技能失败: ${skillId}`);
            }
        });
    }

    /**
     * 订阅游戏事件
     */
    private subscribeToEvents() {
        // 使用保存的绑定引用来监听事件
        EventManager.on(GameEvents.PLAYER_ATTACK, this.boundPlayerAttackHandler);
        EventManager.on(GameEvents.ATTACK_HIT, this.boundAttackHitHandler);
    }

    /**
     * 玩家攻击事件处理
     */
    private onPlayerAttack(data: PlayerAttackEventData) {
        // 处理主要攻击
        this.handlePrimaryAttack(data);
        
        // 触发被动技能
        this.triggerPassiveSkills(data);
    }
    
    /**
     * 攻击命中事件处理
     */
    private onAttackHit(data: any) {
        // 可以在这里根据 data.attackType 来触发特定技能的后续效果
        // 例如：闪电链的弹射
        if (data.attackType === AttackSystem.AttackType.THUNDER_CHAIN) {
            // 闪电链的弹射逻辑已经在 ThunderChain.ts 内部处理，
            // 这里可以用来触发一些全局效果，比如“每次弹射伤害增加”等
        }
        
        // 其他需要“命中后触发”的技能逻辑也可以在这里添加
        console.log(`⚡️ 接到攻击命中事件: ${data.attackType}, 目标: ${data.target}`);
    }

    /**
     * 处理主要攻击（所有攻击类型）
     */
    private handlePrimaryAttack(data: PlayerAttackEventData) {
        // 检查是否拥有该技能，如果没有则自动获取
        let skillInstance = this.ownedSkills.get(data.attackType);
        if (!skillInstance) {
            if (this.acquireSkill(data.attackType)) {
                skillInstance = this.ownedSkills.get(data.attackType);
            }
        }
        
        if (!skillInstance || !skillInstance.isActive) {
            console.warn(`⚠️ 技能未激活或不存在: ${data.attackType}`);
            return;
        }
        
        // 使用统一的技能创建方法，传递目标信息
        this.createSkillAttackWithConfig(data.attackType, data.position, skillInstance, data.target);
    }

    /**
     * 获取安全的父节点
     */
    private getSafeParentNode(): Node | null {
        // 优先使用当前节点的父节点
        if (this.node && this.node.isValid && this.node.parent && this.node.parent.isValid) {
            return this.node.parent;
        }
        
        // 如果父节点不存在，尝试使用场景根节点
        if (this.node && this.node.isValid && this.node.scene && this.node.scene.isValid) {
            console.warn('⚠️ SkillManager: 使用场景根节点作为父节点');
            return this.node.scene;
        }
        
        // 最后尝试寻找任何可用的节点
        const scene = director.getScene();
        if (scene && scene.isValid) {
            console.warn('⚠️ SkillManager: 使用导演场景作为父节点');
            return scene;
        }
        
        console.error('❌ SkillManager: 无法找到任何有效的父节点');
        return null;
    }

    /**
     * 创建子弹攻击
     */
    private createBulletAttack(attackData: PlayerAttackEventData, skillInstance: SkillInstance) {
        const prefab = this.getSkillPrefab('bullet');
        if (!prefab) {
            console.error('❌ 找不到子弹预制体');
            return;
        }

        const bullet = instantiate(prefab);
        
        // 安全的父节点设置
        const parentNode = this.getSafeParentNode();
        if (!parentNode || !parentNode.isValid) {
            console.error('❌ SkillManager: 无法找到合适的父节点来创建子弹');
            this.safeDestroyNode(bullet, '子弹');
            return;
        }
        
        try {
            bullet.setParent(parentNode);
        } catch (error) {
            console.error('❌ SkillManager: 设置子弹父节点时发生错误:', error);
            this.safeDestroyNode(bullet, '子弹');
            return;
        }
        
        // 设置子弹位置
        bullet.setWorldPosition(attackData.position.x, attackData.position.y, 0);
        
        // 🔧 启用物理分组系统：配置子弹为玩家攻击分组，自动不与玩家碰撞
        PhysicsGroups.configurePlayerAttackPhysics(bullet);
        
        // 配置子弹属性
        const bulletComponent = bullet.getComponent('BaseAttack') as any;
        if (bulletComponent && typeof bulletComponent.setDamage === 'function') {
            const actualDamage = SkillUtils.getSkillDamage(skillInstance);
            bulletComponent.setDamage(actualDamage);
        }

        // 设置子弹方向和速度
        const rigidbody = bullet.getComponent(RigidBody2D);
        
        if (rigidbody && attackData.target) {
            // 从目标数据中获取位置信息
            const targetPos = attackData.target.position;
            
            const direction = new Vec2(
                targetPos.x - attackData.position.x, 
                targetPos.y - attackData.position.y
            ).normalize();
            
            const speed = SkillUtils.calculateSkillProperty(skillInstance.config, skillInstance.level, 'speed') || 800;
            const velocity = direction.multiplyScalar(speed);
            
            rigidbody.linearVelocity = velocity;
            
        } else if (rigidbody) {
            // 默认向上射击
            const speed = SkillUtils.calculateSkillProperty(skillInstance.config, skillInstance.level, 'speed') || 800;
            const velocity = new Vec2(0, speed);
            
            rigidbody.linearVelocity = velocity;
            
        } else {
            console.error('❌ 无法设置子弹速度：缺少刚体组件');
        }
    }

    /**
     * 触发被动技能
     */
    private triggerPassiveSkills(attackData: PlayerAttackEventData) {
        // 遍历所有被动技能
        this.ownedSkills.forEach((skillInstance, skillId) => {
            if (skillInstance.config.type === 'passive' && skillInstance.isActive) {
                // 这里可以添加具体的被动技能逻辑
            }
        });
    }

    /**
     * 获取技能
     * @param skillId 技能ID
     * @param level 初始等级（默认为1）
     */
    public acquireSkill(skillId: string, level: number = 1): boolean {
        const config = SKILL_CONFIGS[skillId];
        if (!config) {
            console.error(`❌ 找不到技能配置: ${skillId}`);
            return false;
        }

        if (this.ownedSkills.has(skillId)) {
            return this.upgradeSkill(skillId);
        }

        const skillInstance: SkillInstance = {
            config,
            level: Math.min(level, config.maxLevel),
            lastUsedTime: 0,
            isActive: true
        };

        this.ownedSkills.set(skillId, skillInstance);
        
        // 发布技能获得事件
        EventManager.emit(GameEvents.SKILL_ACQUIRED, {
            skillId,
            skillName: config.name,
            level: skillInstance.level
        });

        return true;
    }

    /**
     * 升级技能
     * @param skillId 技能ID
     */
    public upgradeSkill(skillId: string): boolean {
        const skillInstance = this.ownedSkills.get(skillId);
        if (!skillInstance) {
            console.error(`❌ 未拥有技能: ${skillId}`);
            return false;
        }

        if (skillInstance.level >= skillInstance.config.maxLevel) {
            return false;
        }

        skillInstance.level++;
        
        // 发布技能升级事件
        EventManager.emit(GameEvents.SKILL_UPGRADED, {
            skillId,
            skillName: skillInstance.config.name,
            newLevel: skillInstance.level
        });

        return true;
    }

    /**
     * 激活技能
     * @param skillId 技能ID
     * @param position 技能释放位置（可选）
     */
    public activateSkill(skillId: string, position?: { x: number; y: number }): boolean {
        const skillInstance = this.ownedSkills.get(skillId);
        if (!skillInstance) {
            console.error(`❌ 未拥有技能: ${skillId}`);
            return false;
        }

        if (!SkillUtils.canUseSkill(skillInstance)) {
            return false;
        }

        // 更新使用时间
        skillInstance.lastUsedTime = Date.now();

        // 安全获取位置信息
        let safePosition = position;
        if (!safePosition) {
            if (this.node && this.node.isValid) {
                const worldPos = this.node.worldPosition;
                safePosition = { x: worldPos.x, y: worldPos.y };
            } else {
                console.error(`❌ SkillManager: 节点无效，无法获取位置信息`);
                safePosition = { x: 0, y: 0 }; // 使用默认位置
            }
        }

        // 创建配置化的技能效果
        this.createSkillAttackWithConfig(skillId, safePosition, skillInstance);

        // 发布技能激活事件
        EventManager.emit(GameEvents.SKILL_ACTIVATED, {
            skillId,
            skillLevel: skillInstance.level,
            userId: 'player',
            position
        });

        return true;
    }

    /**
     * 创建技能效果
     * @param skillId 技能ID
     * @param position 位置
     */
    private createSkillEffect(skillId: string, position?: { x: number; y: number }) {
        const prefab = this.getSkillPrefab(skillId);
        if (!prefab) {
            console.error(`❌ 找不到技能预制体: ${skillId}`);
            return;
        }

        const skillNode = instantiate(prefab);
        
        // 安全的父节点设置
        const parentNode = this.getSafeParentNode();
        if (!parentNode || !parentNode.isValid) {
            console.error('❌ SkillManager: 无法找到合适的父节点来创建技能效果');
            this.safeDestroyNode(skillNode, '技能效果');
            return;
        }
        
        try {
            skillNode.setParent(parentNode);
        } catch (error) {
            console.error('❌ SkillManager: 设置技能效果父节点时发生错误:', error);
            this.safeDestroyNode(skillNode, '技能效果');
            return;
        }

        if (position) {
            skillNode.setWorldPosition(position.x, position.y, 0);
        } else {
            skillNode.setWorldPosition(this.node.worldPosition);
        }

        // 记录激活的技能节点
        if (!this.activeSkillNodes.has(skillId)) {
            this.activeSkillNodes.set(skillId, []);
        }
        this.activeSkillNodes.get(skillId)!.push(skillNode);
    }

    /**
     * 获取技能预制体（使用新的基于名称的映射系统）
     * @param skillId 技能ID
     */
    private getSkillPrefab(skillId: string): Prefab | null {
        const prefab = this.skillPrefabMap.get(skillId);
        if (prefab) {
            return prefab;
        }
        
        console.error(`❌ 找不到技能预制体映射: ${skillId}`);
        console.error('可用的技能映射:', Array.from(this.skillPrefabMap.keys()));
        return null;
    }

    /**
     * 根据配置创建技能攻击
     * @param skillId 技能ID
     * @param position 位置
     * @param skillInstance 技能实例（包含等级信息）
     * @param target 目标信息
     */
    private createSkillAttackWithConfig(skillId: string, position: { x: number; y: number }, skillInstance: SkillInstance, target?: TargetData) {
        const prefab = this.getSkillPrefab(skillId);
        if (!prefab) {
            console.error(`❌ SkillManager: 无法获取技能预制体 ${skillId}`);
            return;
        }

        let skillNode: Node;
        try {
            skillNode = instantiate(prefab);
            if (!skillNode || !skillNode.isValid) {
                console.error(`❌ SkillManager: 实例化技能节点失败 ${skillId}`);
                return;
            }
        } catch (error) {
            console.error(`❌ SkillManager: 实例化技能预制体时发生错误 ${skillId}:`, error);
            return;
        }
        
        // 安全的父节点设置
        const parentNode = this.getSafeParentNode();
        if (!parentNode || !parentNode.isValid) {
            console.error(`❌ SkillManager: 无法找到合适的父节点来创建配置化技能 ${skillId}`);
            this.safeDestroyNode(skillNode, `配置化技能-${skillId}`);
            return;
        }

        try {
            skillNode.setParent(parentNode);
            skillNode.setWorldPosition(position.x, position.y, 0);
            
            // 🔧 启用物理分组系统：配置技能为玩家攻击分组，自动不与玩家碰撞
            PhysicsGroups.configurePlayerAttackPhysics(skillNode);
        } catch (error) {
            console.error(`❌ SkillManager: 设置技能节点父节点或位置时发生错误 ${skillId}:`, error);
            this.safeDestroyNode(skillNode, `配置化技能-${skillId}`);
            return;
        }
        
        // 获取攻击组件并设置配置化属性
        const attackComponent = skillNode.getComponent('BaseAttack') as any; // 使用any避免类型问题
        if (attackComponent && typeof attackComponent.setDamage === 'function') {
            const actualDamage = SkillUtils.getSkillDamage(skillInstance);
            attackComponent.setDamage(actualDamage);
        }
        
        // 为所有攻击类型设置运动方向和速度，现在传递目标信息
        this.configureAttackMovement(skillNode, skillId, skillInstance, position, target);

        // 记录激活的技能节点
        if (!this.activeSkillNodes.has(skillId)) {
            this.activeSkillNodes.set(skillId, []);
        }
        this.activeSkillNodes.get(skillId)!.push(skillNode);
    }

    /**
     * 配置攻击的运动属性
     * @param skillNode 技能节点
     * @param skillId 技能ID
     * @param skillInstance 技能实例
     * @param position 发射位置
     * @param target 目标信息
     */
    private configureAttackMovement(skillNode: Node, skillId: string, skillInstance: SkillInstance, position: { x: number; y: number }, target?: TargetData) {
        const rigidbody = skillNode.getComponent(RigidBody2D);
        
        // 🔧 特殊处理：飞盘使用非刚体运动，不需要配置刚体
        if (skillId === 'flyingDisc') {
            console.log("🥏 SkillManager: 飞盘使用非刚体运动模式，跳过刚体配置");
            // 飞盘完全依赖自己的onAttackUpdate方法进行位置控制
            return;
        }
        
        if (!rigidbody) {
            console.warn(`⚠️ ${skillId} 没有RigidBody2D组件，无法设置运动`);
            return;
        }
        
        const speed = SkillUtils.calculateSkillProperty(skillInstance.config, skillInstance.level, 'speed') || 600;
        
        // 根据技能类型设置不同的运动模式
        switch (skillId) {
            case 'bullet':
                // 子弹直线攻击，朝向最近的敌人或向上
                this.setLinearMovement(rigidbody, position, speed, target);
                break;
            case 'laser':
                // 🔧 激光不应该移动！它是固定位置的视觉效果
                this.setLaserMovement(rigidbody);
                console.log("⚡ SkillManager: 激光运动已禁用（防止变成飞棍）");
                break;
            case 'fireball':
                // 火球抛物线攻击，朝向最近的敌人
                this.setProjectileMovement(rigidbody, position, speed, target);
                
                // 火球特殊处理：设置目标位置
                if (target && target.position) {
                    const fireballComponent = skillNode.getComponent('Fireball') as any;
                    if (fireballComponent && typeof fireballComponent.setTarget === 'function') {
                        // 使用Vec3设置目标位置
                        fireballComponent.setTarget(new Vec3(target.position.x, target.position.y, 0));
                    }
                }
                break;
            case 'freeze':
                // 冰冻效果可能不需要移动，或者缓慢扩散
                this.setAOEMovement(rigidbody, speed * 0.3);
                break;
            case 'ring':
                // 圆环是原地扩散，不需要设置速度
                this.setRingMovement(rigidbody, 0);
                break;
            default:
                // 默认直线运动
                this.setLinearMovement(rigidbody, position, speed, target);
                break;
        }
    }

    /**
     * 设置直线运动
     */
    private setLinearMovement(rigidbody: RigidBody2D, position: { x: number; y: number }, speed: number, target?: TargetData) {
        // 朝向最近的敌人，如果没有敌人则向上
        const direction = this.getTargetDirection(position, target) || new Vec2(0, 1);
        const velocity = direction.multiplyScalar(speed);
        
        rigidbody.linearVelocity = velocity;
    }

    /**
     * 设置抛物线运动
     */
    private setProjectileMovement(rigidbody: RigidBody2D, position: { x: number; y: number }, speed: number, target?: TargetData) {
        const direction = this.getTargetDirection(position, target) || new Vec2(0, 1);
        // 添加一些向上的分量模拟抛物线
        direction.y += 0.5;
        direction.normalize();
        rigidbody.linearVelocity = direction.multiplyScalar(speed);
    }

    /**
     * 设置AOE扩散运动
     */
    private setAOEMovement(rigidbody: RigidBody2D, speed: number) {
        // AOE攻击可能不需要太多移动，或者向四周扩散
        rigidbody.linearVelocity = new Vec2(0, speed);
    }

    /**
     * 设置圆环运动
     */
    private setRingMovement(rigidbody: RigidBody2D, speed: number) {
        // 圆环不移动，只是原地扩散
        rigidbody.linearVelocity = Vec2.ZERO;
    }

    /**
     * 设置激光运动（实际上是禁用运动）
     */
    private setLaserMovement(rigidbody: RigidBody2D) {
        // 激光不应该移动，它是固定位置的视觉效果
        rigidbody.linearVelocity = Vec2.ZERO;
        rigidbody.angularVelocity = 0;
        
        // 可选：禁用刚体以确保完全不受物理影响
        // rigidbody.enabled = false;
        
        console.log("🛑 SkillManager: 激光运动已完全禁用");
    }

    /**
     * 获取目标方向（使用缓存优化性能）
     */
    private getTargetDirection(position: { x: number; y: number }, target?: TargetData): Vec2 | null {
        // 如果有目标信息，直接使用
        if (target && target.position) {
            const direction = new Vec2(
                target.position.x - position.x,
                target.position.y - position.y
            ).normalize();
            
            return direction;
        }
        
        // 使用GameManager的缓存目标（优化性能）
        const scene = this.node.scene;
        if (scene) {
            const gameManager = scene.getComponentInChildren(GameManager) as GameManager;
            if (gameManager) {
                const cachedEnemy = gameManager.getCachedNearestEnemy();
                                 if (cachedEnemy) {
                     const direction = new Vec2(
                         cachedEnemy.position.x - position.x,
                         cachedEnemy.position.y - position.y
                     ).normalize();
                     
                     return direction;
                 }
            }
        }
        
        console.warn('⚠️ 没有找到任何目标');
        return null;
    }
    


    /**
     * 获取拥有的技能列表
     */
    public getOwnedSkills(): SkillInstance[] {
        return Array.from(this.ownedSkills.values());
    }

    /**
     * 获取技能信息
     * @param skillId 技能ID
     */
    public getSkillInfo(skillId: string): SkillInstance | null {
        return this.ownedSkills.get(skillId) || null;
    }

    /**
     * 清理销毁的技能节点
     */
    update() {
        this.activeSkillNodes.forEach((nodes, skillId) => {
            for (let i = nodes.length - 1; i >= 0; i--) {
                if (!nodes[i].isValid) {
                    nodes.splice(i, 1);
                }
            }
        });
    }

    /**
     * 安全销毁节点，防止重复销毁
     * @param node 要销毁的节点
     * @param nodeType 节点类型（用于日志）
     */
    private safeDestroyNode(node: Node | null, nodeType: string = '节点') {
        if (!node) {
            console.warn(`⚠️ SkillManager: 尝试销毁null ${nodeType}`);
            return;
        }
        
        if (!node.isValid) {
            console.warn(`⚠️ SkillManager: ${nodeType} 已经无效，跳过销毁`);
            return;
        }
        
        try {
            node.destroy();
        } catch (error) {
            console.error(`❌ SkillManager: 销毁 ${nodeType} 时发生错误:`, error);
        }
    }

    onDestroy() {
        // 使用保存的绑定引用来取消事件订阅（修复内存泄漏）
        if (this.boundPlayerAttackHandler) {
            EventManager.off(GameEvents.PLAYER_ATTACK, this.boundPlayerAttackHandler);
        }
        if (this.boundAttackHitHandler) {
            EventManager.off(GameEvents.ATTACK_HIT, this.boundAttackHitHandler);
        }
        
        // 安全清理所有活跃的技能节点
        this.activeSkillNodes.forEach((nodes, skillId) => {
            nodes.forEach((node, index) => {
                this.safeDestroyNode(node, `${skillId}-${index}`);
            });
        });
        
        // 清理技能实例
        this.ownedSkills.clear();
        this.activeSkillNodes.clear();
    }
} 