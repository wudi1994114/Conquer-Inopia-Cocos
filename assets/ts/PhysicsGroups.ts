import { _decorator, Component, Node, RigidBody2D, Collider2D, PhysicsSystem2D } from 'cc';

const { ccclass } = _decorator;

/**
 * 物理碰撞分组管理器
 * 定义所有物理碰撞分组和碰撞矩阵
 */
@ccclass('PhysicsGroups')
export class PhysicsGroups extends Component {

    // 定义物理分组常量（使用位掩码）
    public static readonly Groups = {
        DEFAULT: 1 << 0,       // 1
        PLAYER: 1 << 1,        // 2
        ENEMY: 1 << 2,         // 4
        PLAYER_ATTACK: 1 << 3, // 8
        ENEMY_ATTACK: 1 << 4,  // 16
        ENVIRONMENT: 1 << 5,   // 32
    } as const;

    // 分组名称映射（用于调试）
    public static readonly GroupNames = {
        [PhysicsGroups.Groups.DEFAULT]: 'DEFAULT' ,
        [PhysicsGroups.Groups.PLAYER]: 'PLAYER', 
        [PhysicsGroups.Groups.PLAYER_ATTACK]: 'PLAYER_ATTACK',
        [PhysicsGroups.Groups.ENEMY]: 'ENEMY',
        [PhysicsGroups.Groups.ENEMY_ATTACK]: 'ENEMY_ATTACK',
        [PhysicsGroups.Groups.ENVIRONMENT]: 'ENVIRONMENT'
    } as const;

    public static CollisionMatrix = {
        // DEFAULT组与所有组都碰撞
        DEFAULT: 0xFFFFFFFF,
        
        // 玩家与敌人、敌人攻击、环境碰撞
        PLAYER: PhysicsGroups.Groups.ENEMY | PhysicsGroups.Groups.ENEMY_ATTACK | PhysicsGroups.Groups.ENVIRONMENT,
        
        // 玩家攻击与敌人、环境碰撞 (不与玩家碰撞)
        PLAYER_ATTACK: PhysicsGroups.Groups.ENEMY | PhysicsGroups.Groups.ENVIRONMENT,
        
        // 敌人与玩家、玩家攻击、环境碰撞
        ENEMY: PhysicsGroups.Groups.PLAYER | PhysicsGroups.Groups.PLAYER_ATTACK | PhysicsGroups.Groups.ENVIRONMENT,
        
        // 敌人攻击与玩家、环境碰撞
        ENEMY_ATTACK: PhysicsGroups.Groups.PLAYER | PhysicsGroups.Groups.ENVIRONMENT,
        
        // 环境与所有攻击和角色碰撞
        ENVIRONMENT: PhysicsGroups.Groups.PLAYER | PhysicsGroups.Groups.ENEMY | PhysicsGroups.Groups.PLAYER_ATTACK | PhysicsGroups.Groups.ENEMY_ATTACK
    };

    /**
     * 动态应用碰撞矩阵到物理系统
     * 确保物理规则在代码中强制执行，而不是依赖编辑器设置
     */
    public static applyCollisionMatrix(): void {
        console.log("⚙️ 正在应用自定义物理碰撞矩阵...");
        
        const physicsSystem = PhysicsSystem2D.instance;
        const matrix = physicsSystem.collisionMatrix;

        for (let i = 0; i < matrix.length; i++) {
            matrix[i] = 0;
        }

        for (const groupName in this.CollisionMatrix) {
            const groupValue = this.Groups[groupName as keyof typeof this.Groups];
            if (groupValue !== undefined) {
                const groupIndex = Math.log2(groupValue);
                if (groupIndex < matrix.length) {
                    const mask = this.CollisionMatrix[groupName as keyof typeof this.CollisionMatrix];
                    matrix[groupIndex] = mask;
                }
            }
        }
        
        console.log("✅ 自定义物理碰撞矩阵应用成功！");
        
        // 🔧 修复：将调试循环的上限与实际分组数量挂钩，防止崩溃
        const groupCount = Object.keys(this.Groups).length;
        console.log("  - 检测到分组数量:", groupCount);
        
        // 打印矩阵用于调试
        for (let i = 0; i < groupCount; i++) {
            let groupName = Object.keys(this.Groups).find(key => Math.log2(this.Groups[key as keyof typeof this.Groups]) === i) || `GROUP ${i}`;
            
            while (groupName.length < 15) {
                groupName += ' ';
            }
            
            let mask = matrix[i] ? matrix[i].toString(2) : '0';
            while (mask.length < 8) {
                mask = '0' + mask;
            }
            
            console.log(`  - ${groupName}: 碰撞掩码 ${mask}`);
        }
    }

    /**
     * 获取分组名称
     * @param groupValue 分组值
     * @returns 分组名称
     */
    public static getGroupName(groupValue: number): string {
        for (const key in this.Groups) {
            if (this.Groups[key as keyof typeof this.Groups] === groupValue) {
                return key;
            }
        }
        return 'UNKNOWN';
    }

    /**
     * 检查两个分组是否应该发生碰撞
     * @param group1 分组1
     * @param group2 分组2
     * @returns 是否应该碰撞
     */
    public static shouldCollide(group1: number, group2: number): boolean {
        // 定义碰撞矩阵：哪些分组之间会发生碰撞
        const collisionMatrix = {
            [PhysicsGroups.Groups.PLAYER]: [
                PhysicsGroups.Groups.ENEMY,        // 玩家与敌人碰撞
                PhysicsGroups.Groups.ENEMY_ATTACK, // 玩家与敌人攻击碰撞
                PhysicsGroups.Groups.ENVIRONMENT   // 玩家与环境碰撞
            ],
            [PhysicsGroups.Groups.PLAYER_ATTACK]: [
                PhysicsGroups.Groups.ENEMY,        // 玩家攻击与敌人碰撞
                PhysicsGroups.Groups.ENVIRONMENT   // 玩家攻击与环境碰撞
            ],
            [PhysicsGroups.Groups.ENEMY]: [
                PhysicsGroups.Groups.PLAYER,       // 敌人与玩家碰撞
                PhysicsGroups.Groups.PLAYER_ATTACK,// 敌人与玩家攻击碰撞
                PhysicsGroups.Groups.ENVIRONMENT   // 敌人与环境碰撞
            ],
            [PhysicsGroups.Groups.ENEMY_ATTACK]: [
                PhysicsGroups.Groups.PLAYER,       // 敌人攻击与玩家碰撞
                PhysicsGroups.Groups.ENVIRONMENT   // 敌人攻击与环境碰撞
            ],
            [PhysicsGroups.Groups.ENVIRONMENT]: [
                PhysicsGroups.Groups.PLAYER,       // 环境与玩家碰撞
                PhysicsGroups.Groups.PLAYER_ATTACK,// 环境与玩家攻击碰撞
                PhysicsGroups.Groups.ENEMY,        // 环境与敌人碰撞
                PhysicsGroups.Groups.ENEMY_ATTACK  // 环境与敌人攻击碰撞
            ]
        };

        // 检查双向碰撞
        const group1Collisions = (collisionMatrix as any)[group1] || [];
        const group2Collisions = (collisionMatrix as any)[group2] || [];
        
        return group1Collisions.includes(group2) || group2Collisions.includes(group1);
    }

    /**
     * 设置玩家物理分组
     */
    public static configurePlayerPhysics(node: Node): void {
        const rigidbody = node.getComponent(RigidBody2D);
        const colliders = node.getComponents(Collider2D);
        
        if (rigidbody) {
            rigidbody.group = PhysicsGroups.Groups.PLAYER;
            console.log(`🔧 设置玩家物理分组: ${PhysicsGroups.getGroupName(PhysicsGroups.Groups.PLAYER)}`);
        }
        
        colliders.forEach((collider: Collider2D) => {
            collider.group = PhysicsGroups.Groups.PLAYER;
        });
    }

    /**
     * 设置玩家攻击物理分组
     */
    public static configurePlayerAttackPhysics(node: Node): void {
        const rigidbody = node.getComponent(RigidBody2D);
        const colliders = node.getComponents(Collider2D);
        
        if (rigidbody) {
            rigidbody.group = PhysicsGroups.Groups.PLAYER_ATTACK;
            console.log(`🔧 设置玩家攻击物理分组: ${PhysicsGroups.getGroupName(PhysicsGroups.Groups.PLAYER_ATTACK)}`);
        }
        
        colliders.forEach(collider => {
            collider.group = PhysicsGroups.Groups.PLAYER_ATTACK;
        });
    }

    /**
     * 设置敌人物理分组
     */
    public static configureEnemyPhysics(node: Node): void {
        const rigidbody = node.getComponent(RigidBody2D);
        const colliders = node.getComponents(Collider2D);
        
        if (rigidbody) {
            rigidbody.group = PhysicsGroups.Groups.ENEMY;
            console.log(`🔧 设置敌人物理分组: ${PhysicsGroups.getGroupName(PhysicsGroups.Groups.ENEMY)}`);
        }
        
        colliders.forEach(collider => {
            collider.group = PhysicsGroups.Groups.ENEMY;
        });
    }

    /**
     * 设置敌人攻击物理分组
     */
    public static configureEnemyAttackPhysics(node: Node): void {
        const rigidbody = node.getComponent(RigidBody2D);
        const colliders = node.getComponents(Collider2D);
        
        if (rigidbody) {
            rigidbody.group = PhysicsGroups.Groups.ENEMY_ATTACK;
            console.log(`🔧 设置敌人攻击物理分组: ${PhysicsGroups.getGroupName(PhysicsGroups.Groups.ENEMY_ATTACK)}`);
        }
        
        colliders.forEach(collider => {
            collider.group = PhysicsGroups.Groups.ENEMY_ATTACK;
        });
    }

    /**
     * 打印碰撞矩阵（调试用）
     */
    public static printCollisionMatrix(): void {
        console.log('🔍 物理碰撞矩阵:');
        console.log('  玩家 ↔ 敌人、敌人攻击、环境');
        console.log('  玩家攻击 ↔ 敌人、环境');
        console.log('  敌人 ↔ 玩家、玩家攻击、环境');
        console.log('  敌人攻击 ↔ 玩家、环境');
        console.log('  环境 ↔ 所有对象');
        console.log('  ✅ 玩家与玩家攻击：不碰撞');
        console.log('  ✅ 敌人与敌人攻击：不碰撞');
        console.log('  ✅ 相同类型攻击：不碰撞');
    }
} 