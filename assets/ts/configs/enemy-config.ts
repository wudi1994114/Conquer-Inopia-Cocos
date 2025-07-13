// configs 目录是新增的，用于存放所有游戏相关的配置数据
// 这是第一步：创建数据驱动的核心文件

/**
 * 定义敌人稀有度/类型，用于逻辑区分（如Boss血条、精英怪物词缀等）
 */
export enum EnemyCategory {
    Normal,  // 普通
    Elite,   // 精英
    Boss,    // 首领
}

/**
 * AI行为类型，用于决定敌人的基本行为模式
 */
export enum AiBehavior {
    Melee,          // 近战：接近玩家并发起攻击
    Ranged,         // 远程：与玩家保持距离并发起攻击
    Passive,        // 被动：不主动攻击，仅在受击后反击
    Support,        // 辅助：为其他敌人提供增益或治疗
    Kamikaze,       // 自爆：接近玩家后自爆
}

/**
 * 定义单个技能的数据结构
 */
export interface EnemySkill {
    id: string;         // 技能ID，例如 'fireball', 'summon'
    level: number;      // 技能等级
    cooldown: number;   // 技能冷却时间
    chance: number;     // 释放几率 (0-1)
    // 其他技能相关参数...
}

/**
 * 定义单个敌人的完整配置数据结构
 * 尽可能覆盖了ARPG游戏中怪物的常用属性
 */
export interface EnemyData {
    id: string;                     // 唯一ID，用于生成和识别，例如 'ent_1', 'lich_2'
    name: string;                   // 怪物显示名称，例如 '愤怒的树人'
    category: EnemyCategory;        // 怪物类型/稀有度

    // --- 资源与外观 ---
    plistUrl: string;               // 怪物图集 .plist 文件的路径 (相对于 resources 目录)
    assetNamePrefix: string;        // 资源名前缀, 例如 'Ent1', 'Lich2'
    nodeScale: number;              // 节点缩放大小，用于调整视觉大小
    
    // --- 核心战斗属性 ---
    baseHealth: number;             // 基础生命值
    baseAttack: number;             // 基础攻击力
    baseDefense: number;            // 基础防御力
    moveSpeed: number;              // 移动速度
    
    // --- 攻击行为 ---
    attackRange: number;            // 攻击距离
    attackInterval: number;         // 攻击冷却时间（秒）
    projectileId?: string;          // 如果是远程攻击，发射的投掷物ID
    
    // --- 动画 ---
    animationSpeed: number;         // 动画播放速度（帧/秒）
    
    // --- AI与行为 ---
    ai: AiBehavior;                 // AI行为模式
    detectionRange: number;         // 侦测范围，进入此范围会触发AI
    pursuitRange: number;           // 追击范围，超出此范围会放弃追击
    
    // --- 碰撞与物理 ---
    colliderSize: { width: number, height: number }; // 碰撞体大小
    
    // --- 技能系统 ---
    skills?: EnemySkill[];          // 技能列表
    
    // --- 奖励与掉落 ---
    expReward: number;              // 击杀后给予的经验值
    dropTableId?: string;           // 掉落表ID
    
    // --- 特殊效果 ---
    stunDuration?: number;          // 被击中后的硬直时间
    damageFlashDuration?: number;   // 受伤变色持续时间
}

// ===================================================================================
//  怪物数据库
// ===================================================================================
// 使用 Record<string, EnemyData> 的形式，方便通过ID快速查找
export const enemyDatabase: Record<string, EnemyData> = {
    // --- 树人 (普通怪) ---
    'ent_normal': {
        id: 'ent_normal',
        name: '小树人',
        category: EnemyCategory.Normal,
        plistUrl: 'monster/ent',
        assetNamePrefix: 'Ent1', // 明确使用 Ent1 的动画
        nodeScale: 0.8,
        baseHealth: 100,
        baseAttack: 10,
        baseDefense: 5,
        moveSpeed: 3, // 🔧 从50调整为3，比玩家(5)慢一些
        attackRange: 60,
        attackInterval: 2.5,
        animationSpeed: 8,
        ai: AiBehavior.Melee,
        detectionRange: 1200, // 🔧 从400增加到1200，确保能检测到1000+距离的玩家
        pursuitRange: 1500,   // 🔧 从600增加到1500，确保追击范围足够
        colliderSize: { width: 40, height: 60 },
        expReward: 10,
        stunDuration: 0.5,
        damageFlashDuration: 0.2
    },

    // --- 巫妖 (精英怪) ---
    'lich_elite': {
        id: 'lich_elite',
        name: '精英巫妖',
        category: EnemyCategory.Elite,
        plistUrl: 'monster/lich',
        assetNamePrefix: 'Lich2', // 明确使用 Lich2 的动画
        nodeScale: 1.0,
        baseHealth: 500,
        baseAttack: 25,
        baseDefense: 10,
        moveSpeed: 2.5, // 🔧 从40调整为2.5，比玩家(5)慢，但作为远程单位不需要太快
        attackRange: 300,
        attackInterval: 2.0,
        animationSpeed: 10,
        ai: AiBehavior.Ranged,
        detectionRange: 1200, // 🔧 从500增加到1200，确保能检测到1000+距离的玩家
        pursuitRange: 1500,   // 🔧 从700增加到1500，确保追击范围足够
        colliderSize: { width: 50, height: 70 },
        skills: [
            { id: 'fireball', level: 1, cooldown: 5, chance: 0.8 }
        ],
        expReward: 50,
        stunDuration: 0.3,
        damageFlashDuration: 0.2
    },
    
    // --- 树人BOSS (示例) ---
    'ent_boss': {
        id: 'ent_boss',
        name: '远古树精',
        category: EnemyCategory.Boss,
        plistUrl: 'monster/ent',
        assetNamePrefix: 'Ent3', // 🔧 改回使用Ent3，因为现在资源文件中确实有Ent3的动画
        nodeScale: 1.5,
        baseHealth: 8000,
        baseAttack: 80,
        baseDefense: 40,
        moveSpeed: 4, // 🔧 从60调整为4，比玩家(5)稍慢，但作为Boss有一定威胁性
        attackRange: 80,
        attackInterval: 1.8,
        animationSpeed: 12,
        ai: AiBehavior.Melee,
        detectionRange: 1500, // 🔧 从800增加到1500，Boss有更大的检测范围
        pursuitRange: 2000,   // 🔧 从1200增加到2000，Boss追击范围更大
        colliderSize: { width: 80, height: 120 },
        skills: [
            { id: 'stomp', level: 1, cooldown: 10, chance: 1.0 }, // 范围践踏
            { id: 'summon_minions', level: 1, cooldown: 20, chance: 1.0 } // 召唤小弟
        ],
        expReward: 500,
        stunDuration: 0.1, // Boss通常有霸体，硬直时间很短
        damageFlashDuration: 0.15
    },
    
    // 你可以在这里继续添加更多怪物...
}; 