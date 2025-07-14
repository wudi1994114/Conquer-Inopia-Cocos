// configs 目录是新增的，用于存放所有游戏相关的配置数据
// 这是第一步：创建数据驱动的核心文件

/**
 * 敌人类别枚举
 * 定义敌人稀有度/类型，用于逻辑区分（如Boss血条、精英怪物词缀等）
 */
export enum EnemyCategory {
    Normal,  // 普通怪物：基础属性，无特殊能力
    Elite,   // 精英怪物：增强属性，可能有特殊技能
    Boss,    // 首领怪物：极高属性，多种技能，需要特殊UI显示
}

/**
 * AI行为类型枚举
 * 定义敌人的基本行为模式，决定其战斗策略和移动逻辑
 */
export enum AiBehavior {
    Melee,          // 近战型：主动接近玩家并发起近距离攻击
    Ranged,         // 远程型：与玩家保持距离并发射投射物攻击
    Passive,        // 被动型：不主动攻击，仅在受击后反击或被激怒
    Support,        // 辅助型：为其他敌人提供增益效果或治疗
    Kamikaze,       // 自爆型：接近玩家后自爆造成大量伤害
}

/**
 * 敌人技能数据接口
 * 定义敌人可使用的单个技能的完整配置信息
 */
export interface EnemySkill {
    id: string;         // 技能唯一标识符，例如 'fireball', 'summon', 'heal'
    level: number;      // 技能等级，影响伤害、范围等效果强度
    cooldown: number;   // 技能冷却时间（秒），控制技能使用频率
    chance: number;     // 技能释放概率 (0.0-1.0)，1.0表示100%释放
    // 注意：具体的技能参数（如伤害值、范围等）在各自的技能配置中定义
}

/**
 * 敌人数据配置接口
 * 定义单个敌人的完整配置数据结构，涵盖ARPG游戏中怪物的所有核心属性
 * 这是敌人系统的数据驱动核心，通过修改这些配置可以快速调整游戏平衡性
 */
export interface EnemyData {
    // ===============================
    // 基础标识信息
    // ===============================
    id: string;                     // 敌人唯一标识符，用于代码中引用，例如 'ent_normal', 'lich_elite'
    name: string;                   // 敌人显示名称，用于UI显示，例如 '愤怒的树人', '暗影巫妖'
    category: EnemyCategory;        // 敌人类别，决定UI显示方式和特殊逻辑

    // ===============================
    // 视觉资源配置
    // ===============================
    plistUrl: string;               // 敌人图集文件路径 (相对于 resources 目录)，例如 'monster/ent'
    assetNamePrefix: string;        // 动画资源名前缀，例如 'Ent1'（对应 Ent1_Idle_front00.png）
    nodeScale: number;              // 节点缩放比例，用于调整敌人的视觉大小 (1.0 = 原始大小)
    
    // ===============================
    // 核心战斗属性
    // ===============================
    baseHealth: number;             // 基础生命值，敌人的血量上限
    baseAttack: number;             // 基础攻击力，影响对玩家造成的伤害
    baseDefense: number;            // 基础防御力，减少受到的伤害
    moveSpeed: number;              // 移动速度 (像素/秒)，控制敌人移动快慢
    
    // ===============================
    // 攻击系统配置
    // ===============================
    attackRange: number;            // 攻击距离 (像素)，敌人开始攻击的最小距离
    attackInterval: number;         // 攻击间隔时间 (秒)，控制攻击频率
    projectileId?: string;          // 远程攻击的投射物ID (可选)，仅远程敌人需要
    
    // ===============================
    // 动画系统配置
    // ===============================
    animationSpeed: number;         // 动画播放速度 (帧/秒)，控制动画播放快慢
    
    // ===============================
    // AI行为系统配置
    // ===============================
    ai: AiBehavior;                 // AI行为模式，决定敌人的基本战斗策略
    detectionRange: number;         // 检测范围 (像素)，玩家进入此范围敌人开始激活
    pursuitRange: number;           // 追击范围 (像素)，超出此范围敌人停止追击
    
    // ===============================
    // 物理碰撞配置
    // ===============================
    colliderSize: { width: number, height: number }; // 碰撞体尺寸 (像素)，影响碰撞检测
    
    // ===============================
    // 技能系统配置 (可选)
    // ===============================
    skills?: EnemySkill[];          // 敌人技能列表，定义敌人可使用的特殊能力
    
    // ===============================
    // 奖励系统配置
    // ===============================
    expReward: number;              // 击杀奖励经验值，影响玩家升级进度
    dropTableId?: string;           // 掉落表ID (可选)，定义敌人死亡后的物品掉落
    
    // ===============================
    // 视觉反馈配置 (可选)
    // ===============================
    stunDuration?: number;          // 受击硬直时间 (秒)，敌人受伤后的无法行动时间
    damageFlashDuration?: number;   // 受伤闪烁持续时间 (秒)，敌人受伤时的视觉反馈时长
}

// ===================================================================================
//  敌人数据库
// ===================================================================================
/**
 * 敌人配置数据库
 * 使用 Record<string, EnemyData> 的形式，支持通过敌人ID快速查找配置
 * 
 * 使用方法：
 * - 获取敌人配置：const config = enemyDatabase['ent_normal'];
 * - 创建敌人实例：enemyController.init('ent_normal');
 * 
 * 配置规范：
 * - ID命名：{类型}_{稀有度}，例如 'ent_normal', 'lich_elite', 'dragon_boss'
 * - 数值平衡：普通 < 精英 < Boss，注意保持游戏平衡性
 * - 资源路径：确保对应的图集文件存在于 resources 目录下
 */
export const enemyDatabase: Record<string, EnemyData> = {
    // ===============================
    // 树人系列 - 近战型普通敌人
    // ===============================
    'ent_normal': {
        id: 'ent_normal',
        name: '小树人',
        category: EnemyCategory.Normal,
        
        // 视觉配置
        plistUrl: 'monster/ent',        // 图集路径：resources/monster/ent.plist
        assetNamePrefix: 'Ent1',        // 动画前缀：对应 Ent1_Idle_front00.png 等
        nodeScale: 0.8,                 // 80% 大小，显得更可爱
        
        // 基础属性 - 新手区域的入门敌人
        baseHealth: 100,                // 血量：2-3次玩家攻击可击杀
        baseAttack: 10,                 // 攻击力：对玩家造成中等威胁
        baseDefense: 5,                 // 防御力：轻微减伤
        moveSpeed: 3,                   // 移动速度：比玩家(5)慢，易于风筝
        
        // 攻击配置
        attackRange: 60,                // 攻击距离：近战范围
        attackInterval: 2.5,            // 攻击间隔：给玩家反应时间
        
        // 动画配置
        animationSpeed: 8,              // 动画帧率：中等速度
        
        // AI配置 - 简单的追击型AI
        ai: AiBehavior.Melee,           // 近战AI：主动接近玩家
        detectionRange: 1200,           // 检测范围：足够大，确保能发现玩家
        pursuitRange: 1500,             // 追击范围：比检测范围大，避免来回切换
        
        // 物理配置
        colliderSize: { width: 40, height: 60 }, // 碰撞体：适中大小
        
        // 奖励配置
        expReward: 10,                  // 经验奖励：基础值
        
        // 反馈配置
        stunDuration: 0.5,              // 硬直时间：给玩家连击机会
        damageFlashDuration: 0.2        // 闪烁时间：短暂的视觉反馈
    },

    // ===============================
    // 巫妖系列 - 远程型精英敌人
    // ===============================
    'lich_elite': {
        id: 'lich_elite',
        name: '精英巫妖',
        category: EnemyCategory.Elite,
        
        // 视觉配置
        plistUrl: 'monster/lich',       // 图集路径：resources/monster/lich.plist
        assetNamePrefix: 'Lich2',       // 动画前缀：对应 Lich2_Idle_front00.png 等
        nodeScale: 1.0,                 // 标准大小，显示精英威严
        
        // 基础属性 - 中后期区域的精英敌人
        baseHealth: 500,                // 血量：5倍于普通敌人，需要持续战斗
        baseAttack: 25,                 // 攻击力：2.5倍于普通敌人，高威胁
        baseDefense: 10,                // 防御力：2倍于普通敌人，更耐打
        moveSpeed: 2.5,                 // 移动速度：较慢，但远程不需要追击
        
        // 攻击配置 - 远程法术攻击
        attackRange: 300,               // 攻击距离：远程优势，可风筝近战
        attackInterval: 2.0,            // 攻击间隔：较快，增加威胁感
        
        // 动画配置
        animationSpeed: 10,             // 动画帧率：稍快，显示精英活力
        
        // AI配置 - 智能远程战斗AI
        ai: AiBehavior.Ranged,          // 远程AI：保持距离，持续输出
        detectionRange: 1200,           // 检测范围：与普通敌人相同
        pursuitRange: 1500,             // 追击范围：确保不会轻易放弃追击
        
        // 物理配置
        colliderSize: { width: 50, height: 70 }, // 碰撞体：比普通敌人稍大
        
        // 技能配置 - 精英敌人的特色
        skills: [
            { 
                id: 'fireball',         // 火球术技能
                level: 1,               // 技能等级1
                cooldown: 5,            // 5秒冷却
                chance: 0.8             // 80%释放概率
            }
        ],
        
        // 奖励配置
        expReward: 50,                  // 经验奖励：5倍于普通敌人
        
        // 反馈配置
        stunDuration: 0.3,              // 硬直时间：较短，精英抗性
        damageFlashDuration: 0.2        // 闪烁时间：标准反馈
    },
    
    // ===============================
    // 树人Boss - 近战型首领敌人
    // ===============================
    'ent_boss': {
        id: 'ent_boss',
        name: '远古树精',
        category: EnemyCategory.Boss,
        
        // 视觉配置
        plistUrl: 'monster/ent',        // 图集路径：复用树人图集
        assetNamePrefix: 'Ent3',        // 动画前缀：使用特殊的Boss动画
        nodeScale: 1.5,                 // 150%大小，彰显Boss威严
        
        // 基础属性 - 游戏后期的终极挑战
        baseHealth: 8000,               // 血量：80倍于普通敌人，需要长期战斗
        baseAttack: 80,                 // 攻击力：8倍于普通敌人，极高威胁
        baseDefense: 40,                // 防御力：8倍于普通敌人，极其耐打
        moveSpeed: 4,                   // 移动速度：接近玩家，但不会太快造成无解压迫
        
        // 攻击配置 - 强力近战攻击
        attackRange: 80,                // 攻击距离：比普通近战稍远
        attackInterval: 1.8,            // 攻击间隔：较快，持续威胁
        
        // 动画配置
        animationSpeed: 12,             // 动画帧率：快速，显示Boss活力
        
        // AI配置 - 高级Boss AI
        ai: AiBehavior.Melee,           // 近战AI：主动压制玩家
        detectionRange: 1500,           // 检测范围：超大范围，无处可逃
        pursuitRange: 2000,             // 追击范围：极大范围，确保持续战斗
        
        // 物理配置
        colliderSize: { width: 80, height: 120 }, // 碰撞体：大型Boss尺寸
        
        // 技能配置 - Boss专属技能组合
        skills: [
            { 
                id: 'stomp',            // 践踏技能
                level: 1,               // 技能等级1
                cooldown: 10,           // 10秒冷却
                chance: 1.0             // 100%释放（Boss必定使用）
            },
            { 
                id: 'summon_minions',   // 召唤小怪技能
                level: 1,               // 技能等级1
                cooldown: 20,           // 20秒冷却
                chance: 1.0             // 100%释放（Boss必定使用）
            }
        ],
        
        // 奖励配置
        expReward: 500,                 // 经验奖励：50倍于普通敌人，里程碑式奖励
        
        // 反馈配置 - Boss级抗性
        stunDuration: 0.1,              // 硬直时间：极短，Boss霸体特性
        damageFlashDuration: 0.15       // 闪烁时间：稍短，显示Boss抗性
    },
    
    // ===============================
    // 测试专用超大怪物系列 - 用于测试系统
    // ===============================
    'ent_test_giant': {
        id: 'ent_test_giant',
        name: '巨型测试树人',
        category: EnemyCategory.Normal,
        
        // 视觉配置
        plistUrl: 'monster/ent',        
        assetNamePrefix: 'Ent1',        
        nodeScale: 12.8,                // 3.2 * 4 = 12.8
        
        // 基础属性 - 比普通树人大4倍
        baseHealth: 400,                // 100 * 4
        baseAttack: 40,                 // 10 * 4
        baseDefense: 20,                // 5 * 4
        moveSpeed: 12,                  // 3 * 4
        
        // 攻击配置 - 比例放大
        attackRange: 240,               // 60 * 4
        attackInterval: 1.0,            // 攻击更频繁用于测试
        
        // 动画配置
        animationSpeed: 12,             // 稍快一些
        
        // AI配置
        ai: AiBehavior.Melee,           
        detectionRange: 2400,           // 1200 * 2（检测范围适度放大）
        pursuitRange: 3000,             // 1500 * 2
        
        // 物理配置 - 比例放大
        colliderSize: { width: 160, height: 240 }, // 40*4, 60*4
        
        // 奖励配置
        expReward: 40,                  // 10 * 4
        
        // 反馈配置
        stunDuration: 0.5,              
        damageFlashDuration: 0.2        
    },
    
    'lich_test_giant': {
        id: 'lich_test_giant',
        name: '巨型测试巫妖',
        category: EnemyCategory.Elite,
        
        // 视觉配置
        plistUrl: 'monster/lich',       
        assetNamePrefix: 'Lich2',       
        nodeScale: 16.0,                // 4.0 * 4 = 16.0
        
        // 基础属性 - 比精英巫妖大4倍
        baseHealth: 2000,               // 500 * 4
        baseAttack: 100,                // 25 * 4
        baseDefense: 40,                // 10 * 4
        moveSpeed: 10,                  // 2.5 * 4
        
        // 攻击配置 - 比例放大
        attackRange: 1200,              // 300 * 4
        attackInterval: 1.5,            // 攻击更频繁用于测试
        
        // 动画配置
        animationSpeed: 14,             
        
        // AI配置
        ai: AiBehavior.Ranged,          
        detectionRange: 2400,           // 1200 * 2
        pursuitRange: 3000,             // 1500 * 2
        
        // 物理配置 - 比例放大
        colliderSize: { width: 200, height: 280 }, // 50*4, 70*4
        
        // 技能配置
        skills: [
            { 
                id: 'fireball',         
                level: 3,               // 提升技能等级
                cooldown: 3,            // 更短冷却用于测试
                chance: 0.9             // 更高概率
            }
        ],
        
        // 奖励配置
        expReward: 200,                 // 50 * 4
        
        // 反馈配置
        stunDuration: 0.3,              
        damageFlashDuration: 0.2        
    },
    
    'ent_test_mega_boss': {
        id: 'ent_test_mega_boss',
        name: '超巨型测试树精',
        category: EnemyCategory.Boss,
        
        // 视觉配置
        plistUrl: 'monster/ent',        
        assetNamePrefix: 'Ent3',        
        nodeScale: 24.0,                // 6.0 * 4 = 24.0
        
        // 基础属性 - 比Boss树精大4倍
        baseHealth: 32000,              // 8000 * 4
        baseAttack: 320,                // 80 * 4
        baseDefense: 160,               // 40 * 4
        moveSpeed: 16,                  // 4 * 4
        
        // 攻击配置 - 比例放大
        attackRange: 320,               // 80 * 4
        attackInterval: 1.2,            // 更频繁用于测试
        
        // 动画配置
        animationSpeed: 16,             
        
        // AI配置
        ai: AiBehavior.Melee,           
        detectionRange: 3000,           // 1500 * 2
        pursuitRange: 4000,             // 2000 * 2
        
        // 物理配置 - 比例放大
        colliderSize: { width: 320, height: 480 }, // 80*4, 120*4
        
        // 技能配置 - 增强版
        skills: [
            { 
                id: 'stomp',            
                level: 3,               // 提升技能等级
                cooldown: 6,            // 更短冷却
                chance: 1.0             
            },
            { 
                id: 'summon_minions',   
                level: 3,               
                cooldown: 12,           // 更短冷却
                chance: 1.0             
            }
        ],
        
        // 奖励配置
        expReward: 2000,                // 500 * 4
        
        // 反馈配置
        stunDuration: 0.1,              
        damageFlashDuration: 0.15       
    },

    // ===============================
    // 扩展区域 - 添加新敌人请参考以下模板
    // ===============================
    /* 
    '新敌人ID': {
        id: '新敌人ID',
        name: '新敌人名称',
        category: EnemyCategory.Normal, // 或 Elite、Boss
        
        // 视觉配置
        plistUrl: 'monster/新图集名',
        assetNamePrefix: '新动画前缀',
        nodeScale: 1.0,
        
        // 基础属性（参考现有敌人进行平衡）
        baseHealth: 100,
        baseAttack: 10,
        baseDefense: 5,
        moveSpeed: 3,
        
        // 攻击配置
        attackRange: 60,
        attackInterval: 2.0,
        
        // 动画配置
        animationSpeed: 8,
        
        // AI配置
        ai: AiBehavior.Melee, // 或其他AI类型
        detectionRange: 1200,
        pursuitRange: 1500,
        
        // 物理配置
        colliderSize: { width: 40, height: 60 },
        
        // 可选：技能配置
        skills: [
            { id: '技能ID', level: 1, cooldown: 5, chance: 0.5 }
        ],
        
        // 奖励配置
        expReward: 10,
        
        // 反馈配置
        stunDuration: 0.5,
        damageFlashDuration: 0.2
    },
    */
}; 