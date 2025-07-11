/**
 * 技能配置文件
 * 统一管理所有技能的属性、参数和行为配置
 */

export interface SkillConfig {
    id: string;
    name: string;
    type: 'active' | 'passive';
    description: string;
    damage: number;
    cooldown: number;
    manaCost?: number;
    maxLevel: number;
    upgradeScaling: {
        damage?: number;
        cooldown?: number;
        [key: string]: any;
    };
    properties: { [key: string]: any };
}

/**
 * 全局技能配置
 */
export const SKILL_CONFIGS: { [skillId: string]: SkillConfig } = {
    // 子弹攻击
    bullet: {
        id: 'bullet',
        name: '子弹射击',
        type: 'active',
        description: '发射单发子弹攻击敌人',
        damage: 10,
        cooldown: 0.5,
        maxLevel: 10,
        upgradeScaling: {
            damage: 2,
            cooldown: -0.02
        },
        properties: {
            speed: 800,
            lifetime: 3,
            piercing: false
        }
    },

    // 圆环攻击
    ring: {
        id: 'ring',
        name: '能量圆环',
        type: 'active', 
        description: '以玩家为中心释放扩散的能量圆环',
        damage: 15,
        cooldown: 3,
        maxLevel: 8,
        upgradeScaling: {
            damage: 3,
            cooldown: -0.1
        },
        properties: {
            initialSize: 50,
            maxSize: 800,
            expandSpeed: 150,
            lifetime: 5
        }
    },

    // 激光攻击
    laser: {
        id: 'laser',
        name: '激光炮',
        type: 'active',
        description: '发射穿透性激光，瞬间攻击直线上的所有敌人',
        damage: 50,
        cooldown: 2,
        maxLevel: 8,
        upgradeScaling: {
            damage: 8,
            cooldown: -0.05
        },
        properties: {
            length: 800,
            width: 20,
            duration: 0.3,
            piercing: true
        }
    },

    // 火球攻击
    fireball: {
        id: 'fireball',
        name: '爆炸火球',
        type: 'active',
        description: '发射火球到目标位置，爆炸时对范围内敌人造成伤害',
        damage: 35,
        cooldown: 1.5,
        maxLevel: 10,
        upgradeScaling: {
            damage: 5,
            cooldown: -0.03
        },
        properties: {
            moveSpeed: 300,
            explosionRadius: 100,
            lifetime: 4
        }
    },

    // 冰冻攻击
    freeze: {
        id: 'freeze',
        name: '冰霜爆发',
        type: 'active',
        description: '释放冰霜效果，对范围内敌人造成伤害并减速',
        damage: 25,
        cooldown: 4,
        maxLevel: 8,
        upgradeScaling: {
            damage: 4,
            cooldown: -0.1
        },
        properties: {
            freezeRadius: 150,
            freezeDuration: 3,
            slowRatio: 0.5,
            effectDuration: 1
        }
    },

    // 飞盘攻击
    flyingDisc: {
        id: 'flyingDisc',
        name: '轨道飞盘',
        type: 'passive',
        description: '围绕玩家旋转的飞盘，持续攻击接近的敌人',
        damage: 15,
        cooldown: 0.5,
        maxLevel: 6,
        upgradeScaling: {
            damage: 3,
            cooldown: -0.02
        },
        properties: {
            orbitRadius: 80,
            rotationSpeed: 180,
            lifetime: 10,
            attackInterval: 0.5,
            maxDiscs: 1
        }
    },

    // 火球扩展
    fireballExtension: {
        id: 'fireballExtension',
        name: '献祭光环',
        type: 'active',
        description: '在脚下生成一个持续燃烧的光环，对范围内的敌人造成周期性伤害',
        damage: 15, // 每次伤害的数值
        cooldown: 10, // 技能冷却时间
        maxLevel: 5,
        upgradeScaling: {
            damage: 5,      // 每级增加5点伤害
            cooldown: -1    // 每级减少1秒冷却
        },
        properties: {
            duration: 3,        // 光环持续3秒
            radius: 150,        // 光环半径
            damageInterval: 0.5 // 每0.5秒造成一次伤害
        }
    },

    // 闪电链
    thunderChain: {
        id: 'thunderChain',
        name: '闪电链',
        type: 'active',
        description: '释放闪电链，在敌人之间跳跃造成伤害',
        damage: 40,
        cooldown: 3,
        maxLevel: 8,
        upgradeScaling: {
            damage: 6,
            cooldown: -0.1
        },
        properties: {
            maxChainCount: 5,
            maxChainDistance: 200,
            damageDecay: 0.8,
            lightningDuration: 0.8
        }
    },

    // 多重射击（被动技能示例）
    multiShot: {
        id: 'multiShot',
        name: '多重射击',
        type: 'passive',
        description: '每次攻击时额外发射子弹',
        damage: 0,
        cooldown: 0,
        maxLevel: 5,
        upgradeScaling: {
            extraBullets: 1
        },
        properties: {
            extraBullets: 1,
            spreadAngle: 15
        }
    }
};

/**
 * 全局技能调控参数
 */
export class SkillGlobalConfig {
    // 全局伤害倍率
    static globalDamageMultiplier: number = 1.0;
    
    // 全局冷却时间倍率
    static globalCooldownMultiplier: number = 1.0;
    
    // 全局攻击频率倍率
    static globalAttackSpeedMultiplier: number = 1.0;

    /**
     * 设置全局伤害倍率
     */
    static setGlobalDamageMultiplier(multiplier: number) {
        this.globalDamageMultiplier = Math.max(0.1, multiplier);
        console.log(`🎯 全局伤害倍率设置为: ${this.globalDamageMultiplier}`);
    }

    /**
     * 设置全局冷却时间倍率
     */
    static setGlobalCooldownMultiplier(multiplier: number) {
        this.globalCooldownMultiplier = Math.max(0.1, multiplier);
        console.log(`⏰ 全局冷却时间倍率设置为: ${this.globalCooldownMultiplier}`);
    }

    /**
     * 设置全局攻击速度倍率
     */
    static setGlobalAttackSpeedMultiplier(multiplier: number) {
        this.globalAttackSpeedMultiplier = Math.max(0.1, multiplier);
        console.log(`⚡ 全局攻击速度倍率设置为: ${this.globalAttackSpeedMultiplier}`);
    }

    /**
     * 获取经过全局调控后的实际伤害
     */
    static getActualDamage(baseDamage: number): number {
        return Math.floor(baseDamage * this.globalDamageMultiplier);
    }

    /**
     * 获取经过全局调控后的实际冷却时间
     */
    static getActualCooldown(baseCooldown: number): number {
        return Math.max(0.1, baseCooldown * this.globalCooldownMultiplier);
    }

    /**
     * 获取经过全局调控后的实际攻击间隔
     */
    static getActualAttackInterval(baseInterval: number): number {
        return Math.max(0.1, baseInterval / this.globalAttackSpeedMultiplier);
    }

    /**
     * 重置所有全局参数
     */
    static resetAll() {
        this.globalDamageMultiplier = 1.0;
        this.globalCooldownMultiplier = 1.0;
        this.globalAttackSpeedMultiplier = 1.0;
        console.log('🔄 所有全局技能参数已重置');
    }

    /**
     * 打印当前全局配置
     */
    static printCurrentConfig() {
        console.log('📊 当前全局技能配置:');
        console.log(`  - 伤害倍率: ${this.globalDamageMultiplier}`);
        console.log(`  - 冷却倍率: ${this.globalCooldownMultiplier}`);
        console.log(`  - 攻速倍率: ${this.globalAttackSpeedMultiplier}`);
    }
}

/**
 * 技能实例数据
 */
export interface SkillInstance {
    config: SkillConfig;
    level: number;
    lastUsedTime: number;
    isActive: boolean;
    customProperties?: { [key: string]: any };
}

/**
 * 技能工具函数
 */
export class SkillUtils {
    /**
     * 根据等级计算技能属性
     */
    static calculateSkillProperty(config: SkillConfig, level: number, propertyName: string): any {
        const baseValue = (config as any)[propertyName] || config.properties[propertyName];
        const scaling = config.upgradeScaling[propertyName];
        
        if (typeof baseValue === 'number' && typeof scaling === 'number') {
            return baseValue + (scaling * (level - 1));
        }
        
        return baseValue;
    }

    /**
     * 检查技能是否可以使用（冷却时间检查）
     */
    static canUseSkill(skillInstance: SkillInstance): boolean {
        const now = Date.now();
        const actualCooldown = SkillGlobalConfig.getActualCooldown(
            this.calculateSkillProperty(skillInstance.config, skillInstance.level, 'cooldown')
        );
        return (now - skillInstance.lastUsedTime) >= (actualCooldown * 1000);
    }

    /**
     * 获取技能的实际伤害
     */
    static getSkillDamage(skillInstance: SkillInstance): number {
        const baseDamage = this.calculateSkillProperty(skillInstance.config, skillInstance.level, 'damage');
        return SkillGlobalConfig.getActualDamage(baseDamage);
    }

    /**
     * 获取技能的冷却剩余时间
     */
    static getSkillCooldownRemaining(skillInstance: SkillInstance): number {
        const now = Date.now();
        const actualCooldown = SkillGlobalConfig.getActualCooldown(
            this.calculateSkillProperty(skillInstance.config, skillInstance.level, 'cooldown')
        );
        const elapsed = (now - skillInstance.lastUsedTime) / 1000;
        return Math.max(0, actualCooldown - elapsed);
    }
} 