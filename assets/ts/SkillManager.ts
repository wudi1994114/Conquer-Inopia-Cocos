import { _decorator, Component, Node, Prefab, instantiate, Vec2, RigidBody2D, director } from 'cc';
import { SKILL_CONFIGS, SkillConfig, SkillInstance, SkillUtils, SkillGlobalConfig } from './attack/skill-config';
import { EventManager, GameEvents, PlayerAttackEventData } from './EventManager';

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
    
    onLoad() {
        console.log('🎮 技能管理器初始化');
        
        // 订阅事件
        this.subscribeToEvents();
        
        console.log('✅ 技能管理器初始化完成');
    }

    /**
     * 订阅游戏事件
     */
    private subscribeToEvents() {
        // 监听玩家攻击事件
        EventManager.on(GameEvents.PLAYER_ATTACK, this.onPlayerAttack.bind(this));
        
        console.log('📡 技能管理器已订阅游戏事件');
    }

    /**
     * 玩家攻击事件处理
     */
    private onPlayerAttack(data: PlayerAttackEventData) {
        console.log('🎯 技能管理器收到玩家攻击事件', data);
        
        // 处理主要攻击
        this.handlePrimaryAttack(data);
        
        // 触发被动技能
        this.triggerPassiveSkills(data);
    }

    /**
     * 处理主要攻击（比如子弹）
     */
    private handlePrimaryAttack(data: PlayerAttackEventData) {
        if (data.attackType === 'bullet') {
            const bulletSkill = this.ownedSkills.get('bullet');
            if (bulletSkill && bulletSkill.isActive) {
                this.createBulletAttack(data, bulletSkill);
            }
        }
    }

    /**
     * 获取安全的父节点
     */
    private getSafeParentNode(): Node | null {
        // 优先使用当前节点的父节点
        if (this.node.parent) {
            return this.node.parent;
        }
        
        // 如果父节点不存在，尝试使用场景根节点
        if (this.node.scene) {
            console.warn('⚠️ 使用场景根节点作为父节点');
            return this.node.scene;
        }
        
        // 最后尝试寻找任何可用的节点
        const scene = director.getScene();
        if (scene) {
            console.warn('⚠️ 使用导演场景作为父节点');
            return scene;
        }
        
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
        if (!parentNode) {
            console.error('❌ 无法找到合适的父节点来创建子弹');
            bullet.destroy();
            return;
        }
        bullet.setParent(parentNode);
        
        // 设置子弹位置
        bullet.setWorldPosition(attackData.position.x, attackData.position.y, 0);
        
        // 配置子弹属性
        const bulletComponent = bullet.getComponent('BaseAttack') as any;
        if (bulletComponent && typeof bulletComponent.setDamage === 'function') {
            const actualDamage = SkillUtils.getSkillDamage(skillInstance);
            bulletComponent.setDamage(actualDamage);
        }

        // 设置子弹方向
        const rigidbody = bullet.getComponent(RigidBody2D);
        if (rigidbody && attackData.target) {
            // 从目标数据中获取位置信息
            const targetPos = attackData.target.position;
            const direction = new Vec2(
                targetPos.x - attackData.position.x, 
                targetPos.y - attackData.position.y
            ).normalize();
            
            const speed = SkillUtils.calculateSkillProperty(skillInstance.config, skillInstance.level, 'speed') || 800;
            (rigidbody as RigidBody2D).linearVelocity = direction.multiplyScalar(speed);
        } else if (rigidbody) {
            // 默认向上射击
            const speed = SkillUtils.calculateSkillProperty(skillInstance.config, skillInstance.level, 'speed') || 800;
            (rigidbody as RigidBody2D).linearVelocity = new Vec2(0, speed);
        }

        console.log('🔫 创建子弹攻击成功');
    }

    /**
     * 触发被动技能
     */
    private triggerPassiveSkills(attackData: PlayerAttackEventData) {
        // 遍历所有被动技能
        this.ownedSkills.forEach((skillInstance, skillId) => {
            if (skillInstance.config.type === 'passive' && skillInstance.isActive) {
                console.log(`⚡ 触发被动技能: ${skillInstance.config.name}`);
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
            console.log(`⚠️ 技能已拥有，尝试升级: ${config.name}`);
            return this.upgradeSkill(skillId);
        }

        const skillInstance: SkillInstance = {
            config,
            level: Math.min(level, config.maxLevel),
            lastUsedTime: 0,
            isActive: true
        };

        this.ownedSkills.set(skillId, skillInstance);
        
        console.log(`🎉 获得新技能: ${config.name} (等级 ${skillInstance.level})`);
        
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
            console.log(`⚠️ 技能已达最大等级: ${skillInstance.config.name}`);
            return false;
        }

        skillInstance.level++;
        
        console.log(`⬆️ 技能升级: ${skillInstance.config.name} → 等级 ${skillInstance.level}`);
        
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
            const remainingTime = SkillUtils.getSkillCooldownRemaining(skillInstance);
            console.log(`⏰ 技能冷却中: ${skillInstance.config.name} (剩余 ${remainingTime.toFixed(1)}s)`);
            return false;
        }

        // 更新使用时间
        skillInstance.lastUsedTime = Date.now();

        console.log(`🔥 激活技能: ${skillInstance.config.name} (等级 ${skillInstance.level})`);

        // 创建配置化的技能效果
        this.createSkillAttackWithConfig(skillId, position || { x: this.node.worldPosition.x, y: this.node.worldPosition.y }, skillInstance);

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
        if (!parentNode) {
            console.error('❌ 无法找到合适的父节点来创建技能效果');
            skillNode.destroy();
            return;
        }
        skillNode.setParent(parentNode);

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

        console.log(`✨ 创建技能效果: ${skillId} 在位置 ${skillNode.worldPosition}`);
    }

    /**
     * 技能ID到预制体索引的映射
     */
    private static readonly SKILL_PREFAB_MAP: { [skillId: string]: number } = {
        'bullet': 0,      // Bullet.prefab
        'ring': 1,        // Ring.prefab (或 DrawRing.prefab)
        'laser': 2,       // Laser.prefab
        'fireball': 3,    // Fireball.prefab
        'freeze': 4,      // Freeze.prefab
        'flyingDisc': 5   // FlyingDisc.prefab
    };

    /**
     * 获取技能预制体
     * @param skillId 技能ID
     */
    private getSkillPrefab(skillId: string): Prefab | null {
        const index = SkillManager.SKILL_PREFAB_MAP[skillId];
        if (typeof index === 'number' && index >= 0 && index < this.skillPrefabs.length) {
            return this.skillPrefabs[index];
        }
        
        console.error(`❌ 找不到技能预制体映射: ${skillId}`);
        return null;
    }

    /**
     * 根据配置创建技能攻击
     * @param skillId 技能ID
     * @param position 位置
     * @param skillInstance 技能实例（包含等级信息）
     */
    private createSkillAttackWithConfig(skillId: string, position: { x: number; y: number }, skillInstance: SkillInstance) {
        const prefab = this.getSkillPrefab(skillId);
        if (!prefab) {
            return;
        }

        const skillNode = instantiate(prefab);
        
        // 安全的父节点设置
        const parentNode = this.getSafeParentNode();
        if (!parentNode) {
            console.error('❌ 无法找到合适的父节点来创建配置化技能');
            skillNode.destroy();
            return;
        }
        skillNode.setParent(parentNode);
        skillNode.setWorldPosition(position.x, position.y, 0);
        
        // 获取攻击组件并设置配置化属性
        const attackComponent = skillNode.getComponent('BaseAttack') as any; // 使用any避免类型问题
        if (attackComponent && typeof attackComponent.setDamage === 'function') {
            const actualDamage = SkillUtils.getSkillDamage(skillInstance);
            attackComponent.setDamage(actualDamage);
            
            console.log(`⚙️ 配置技能属性:`);
            console.log(`  - 技能: ${skillInstance.config.name}`);
            console.log(`  - 等级: ${skillInstance.level}`);
            console.log(`  - 基础伤害: ${skillInstance.config.damage}`);
            console.log(`  - 实际伤害: ${actualDamage}`);
        }

        // 记录激活的技能节点
        if (!this.activeSkillNodes.has(skillId)) {
            this.activeSkillNodes.set(skillId, []);
        }
        this.activeSkillNodes.get(skillId)!.push(skillNode);

        console.log(`✨ 创建配置化技能效果: ${skillId} 在位置 ${skillNode.worldPosition}`);
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

    onDestroy() {
        console.log('🗑️ 技能管理器销毁');
        
        // 取消事件订阅
        EventManager.off(GameEvents.PLAYER_ATTACK, this.onPlayerAttack.bind(this));
        
        // 清理技能实例
        this.ownedSkills.clear();
        this.activeSkillNodes.clear();
    }
} 