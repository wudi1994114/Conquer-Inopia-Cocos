import { _decorator, Component, Node, RigidBody2D, Collider2D } from 'cc';

const { ccclass } = _decorator;

/**
 * 简化的物理碰撞分组管理器
 */
@ccclass('PhysicsGroupsSimple')
export class PhysicsGroupsSimple extends Component {

    // 定义物理分组常量
    public static readonly GROUPS = {
        DEFAULT: 0,           // 默认分组
        PLAYER: 1,            // 玩家分组
        PLAYER_ATTACK: 2,     // 玩家攻击分组
        ENEMY: 4,             // 敌人分组
        ENEMY_ATTACK: 8,      // 敌人攻击分组
        ENVIRONMENT: 16       // 环境分组
    } as const;

    /**
     * 设置玩家物理分组
     */
    public static configurePlayerPhysics(node: Node): void {
        const rigidbody = node.getComponent(RigidBody2D);
        const colliders = node.getComponents(Collider2D);
        
        if (rigidbody) {
            rigidbody.group = PhysicsGroupsSimple.GROUPS.PLAYER;
            console.log(`🔧 设置玩家物理分组: PLAYER(${PhysicsGroupsSimple.GROUPS.PLAYER})`);
        }
        
        for (const collider of colliders) {
            collider.group = PhysicsGroupsSimple.GROUPS.PLAYER;
        }
    }

    /**
     * 设置玩家攻击物理分组
     */
    public static configurePlayerAttackPhysics(node: Node): void {
        const rigidbody = node.getComponent(RigidBody2D);
        const colliders = node.getComponents(Collider2D);
        
        if (rigidbody) {
            rigidbody.group = PhysicsGroupsSimple.GROUPS.PLAYER_ATTACK;
            rigidbody.enabledContactListener = true; // 确保启用碰撞监听
            console.log(`🔧 设置玩家攻击物理分组: PLAYER_ATTACK(${PhysicsGroupsSimple.GROUPS.PLAYER_ATTACK})`);
        }
        
        for (const collider of colliders) {
            collider.group = PhysicsGroupsSimple.GROUPS.PLAYER_ATTACK;
            collider.enabled = true; // 确保碰撞器启用
            collider.sensor = false; // 确保不是传感器，要产生真实碰撞
            console.log(`🔧 设置碰撞器分组: PLAYER_ATTACK(${PhysicsGroupsSimple.GROUPS.PLAYER_ATTACK}), 传感器模式: ${collider.sensor}`);
        }
    }

    /**
     * 设置敌人物理分组
     */
    public static configureEnemyPhysics(node: Node): void {
        const rigidbody = node.getComponent(RigidBody2D);
        const colliders = node.getComponents(Collider2D);
        
        if (rigidbody) {
            rigidbody.group = PhysicsGroupsSimple.GROUPS.ENEMY;
            rigidbody.enabledContactListener = true; // 确保启用碰撞监听
            console.log(`🔧 设置敌人物理分组: ENEMY(${PhysicsGroupsSimple.GROUPS.ENEMY})`);
        }
        
        for (const collider of colliders) {
            collider.group = PhysicsGroupsSimple.GROUPS.ENEMY;
            collider.enabled = true; // 确保碰撞器启用
            collider.sensor = false; // 确保不是传感器，要产生真实碰撞
            console.log(`🔧 设置敌人碰撞器分组: ENEMY(${PhysicsGroupsSimple.GROUPS.ENEMY}), 传感器模式: ${collider.sensor}`);
        }
    }

    /**
     * 打印碰撞矩阵（调试用）
     */
    public static printCollisionMatrix(): void {
        console.log('🔍 物理碰撞矩阵:');
        console.log('  ✅ 玩家攻击(2) ↔ 敌人(4) - 会碰撞');
        console.log('  ❌ 玩家(1) ↔ 玩家攻击(2) - 不碰撞');
        console.log('  ❌ 敌人(4) ↔ 敌人攻击(8) - 不碰撞');
        console.log('  ❌ 相同分组之间 - 不碰撞');
    }
} 