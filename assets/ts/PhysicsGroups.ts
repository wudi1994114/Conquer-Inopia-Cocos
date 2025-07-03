import { _decorator, Component, Node, RigidBody2D, Collider2D } from 'cc';

const { ccclass } = _decorator;

/**
 * 物理碰撞分组管理器
 * 定义所有物理碰撞分组和碰撞矩阵
 */
@ccclass('PhysicsGroups')
export class PhysicsGroups extends Component {

    // 定义物理分组常量（使用位掩码）
    public static readonly Groups = {
        DEFAULT: 0,           // 默认分组：不与任何特定对象碰撞
        PLAYER: 1,            // 玩家分组：玩家本体
        PLAYER_ATTACK: 2,     // 玩家攻击分组：玩家发射的所有攻击
        ENEMY: 4,             // 敌人分组：敌人本体
        ENEMY_ATTACK: 8,      // 敌人攻击分组：敌人的攻击（如果有）
        ENVIRONMENT: 16       // 环境分组：墙壁、障碍物等
    } as const;

    // 分组名称映射（用于调试）
    public static readonly GroupNames = {
        [PhysicsGroups.Groups.DEFAULT]: 'DEFAULT',
        [PhysicsGroups.Groups.PLAYER]: 'PLAYER', 
        [PhysicsGroups.Groups.PLAYER_ATTACK]: 'PLAYER_ATTACK',
        [PhysicsGroups.Groups.ENEMY]: 'ENEMY',
        [PhysicsGroups.Groups.ENEMY_ATTACK]: 'ENEMY_ATTACK',
        [PhysicsGroups.Groups.ENVIRONMENT]: 'ENVIRONMENT'
    } as const;

    /**
     * 获取分组名称（用于调试）
     */
    public static getGroupName(group: number): string {
        return (PhysicsGroups.GroupNames as any)[group] || `UNKNOWN(${group})`;
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
    public static configureEnemyPhysics(node: cc.Node): void {
        const rigidbody = node.getComponent(cc.RigidBody2D);
        const colliders = node.getComponents(cc.Collider2D);
        
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
    public static configureEnemyAttackPhysics(node: cc.Node): void {
        const rigidbody = node.getComponent(cc.RigidBody2D);
        const colliders = node.getComponents(cc.Collider2D);
        
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