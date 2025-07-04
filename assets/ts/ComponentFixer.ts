import { _decorator, Component, Node, RigidBody2D, Collider2D, BoxCollider2D, CircleCollider2D, ERigidBody2DType } from 'cc';
import { PhysicsGroupsSimple } from './PhysicsGroupsSimple';

const { ccclass, property } = _decorator;

/**
 * 组件修复器 - 运行时自动添加缺失的物理组件
 */
@ccclass('ComponentFixer')
export class ComponentFixer extends Component {

    /**
     * 修复预制体缺失的组件
     * @param node 要修复的节点
     * @param nodeType 节点类型（用于日志）
     */
    public static fixMissingComponents(node: Node, nodeType: string = '节点'): void {
        if (!node || !node.isValid) {
            console.warn(`⚠️ ComponentFixer: ${nodeType} 无效，跳过修复`);
            return;
        }

        const nodeName = node.name.toLowerCase();
        console.log(`🔧 ComponentFixer: 开始修复 ${nodeType} "${node.name}"`);

        // 根据节点名称确定需要的组件
        switch (nodeName) {
            case 'laser':
                ComponentFixer.fixLaserComponents(node);
                break;
            case 'freeze':
                ComponentFixer.fixFreezeComponents(node);
                break;
            case 'flyingdisc':
                ComponentFixer.fixFlyingDiscComponents(node);
                break;
            case 'bullet':
            case 'fireball':
            case 'ring':
            case 'drawring':
                // 这些预制体已经配置正确，只需要验证
                ComponentFixer.validateComponents(node, nodeType);
                break;
            default:
                console.log(`📋 ComponentFixer: 未知攻击类型 "${nodeName}"，进行通用检查`);
                ComponentFixer.validateComponents(node, nodeType);
                break;
        }
    }

    /**
     * 修复激光组件
     */
    private static fixLaserComponents(node: Node): void {
        // 检查并添加 RigidBody2D
        let rigidbody = node.getComponent(RigidBody2D);
        if (!rigidbody) {
            console.log('🔧 添加 RigidBody2D 到 Laser');
            rigidbody = node.addComponent(RigidBody2D);
            rigidbody.enabledContactListener = true;
            rigidbody.bullet = true; // 高速对象
            rigidbody.gravityScale = 0;
            rigidbody.type = ERigidBody2DType.Dynamic;
            rigidbody.group = PhysicsGroupsSimple.GROUPS.PLAYER_ATTACK;
        }

        // 验证 Collider2D 存在
        const collider = node.getComponent(Collider2D);
        if (!collider) {
            console.warn('⚠️ Laser 缺少 Collider2D，但这对于传感器类型的激光是正常的');
        }

        console.log('✅ Laser 组件修复完成');
    }

    /**
     * 修复冰冻组件
     */
    private static fixFreezeComponents(node: Node): void {
        // 检查并添加 RigidBody2D
        let rigidbody = node.getComponent(RigidBody2D);
        if (!rigidbody) {
            console.log('🔧 添加 RigidBody2D 到 Freeze');
            rigidbody = node.addComponent(RigidBody2D);
            rigidbody.enabledContactListener = true;
            rigidbody.bullet = false; // AOE攻击不需要高速
            rigidbody.gravityScale = 0;
            rigidbody.type = ERigidBody2DType.Dynamic;
            rigidbody.group = PhysicsGroupsSimple.GROUPS.PLAYER_ATTACK;
        }

        // 检查并添加 Collider2D
        let collider = node.getComponent(Collider2D);
        if (!collider) {
            console.log('🔧 添加 CircleCollider2D 到 Freeze');
            const circleCollider = node.addComponent(CircleCollider2D);
            circleCollider.radius = 150; // 冰冻半径
            circleCollider.sensor = true; // 传感器模式，用于检测范围内的敌人
        }

        console.log('✅ Freeze 组件修复完成');
    }

    /**
     * 修复飞盘组件
     */
    private static fixFlyingDiscComponents(node: Node): void {
        // 检查并添加 RigidBody2D
        let rigidbody = node.getComponent(RigidBody2D);
        if (!rigidbody) {
            console.log('🔧 添加 RigidBody2D 到 FlyingDisc');
            rigidbody = node.addComponent(RigidBody2D);
            rigidbody.enabledContactListener = true;
            rigidbody.bullet = true; // 旋转攻击
            rigidbody.gravityScale = 0;
            rigidbody.type = ERigidBody2DType.Dynamic;
            rigidbody.group = PhysicsGroupsSimple.GROUPS.PLAYER_ATTACK;
        }

        // 验证 Collider2D 存在 (应该已经有CircleCollider2D)
        const collider = node.getComponent(Collider2D);
        if (!collider) {
            console.log('🔧 添加 CircleCollider2D 到 FlyingDisc');
            const circleCollider = node.addComponent(CircleCollider2D);
            circleCollider.radius = 12.5;
            circleCollider.sensor = false;
        }

        console.log('✅ FlyingDisc 组件修复完成');
    }

    /**
     * 验证组件配置
     */
    private static validateComponents(node: Node, nodeType: string): void {
        const rigidbody = node.getComponent(RigidBody2D);
        const collider = node.getComponent(Collider2D);

        if (rigidbody) {
            console.log(`✅ ${nodeType} RigidBody2D 配置正确`);
            // 确保关键属性设置正确
            if (!rigidbody.enabledContactListener) {
                rigidbody.enabledContactListener = true;
                console.log(`🔧 ${nodeType} 启用碰撞监听器`);
            }
        } else {
            console.warn(`⚠️ ${nodeType} 缺少 RigidBody2D 组件`);
        }

        if (collider) {
            console.log(`✅ ${nodeType} Collider2D 配置正确`);
        } else {
            console.warn(`⚠️ ${nodeType} 缺少 Collider2D 组件`);
        }
    }

    /**
     * 批量修复所有攻击节点
     * @param attackNodes 攻击节点数组
     */
    public static fixAllAttackNodes(attackNodes: Node[]): void {
        console.log(`🔧 ComponentFixer: 开始批量修复 ${attackNodes.length} 个攻击节点`);
        
        attackNodes.forEach((node, index) => {
            if (node && node.isValid) {
                ComponentFixer.fixMissingComponents(node, `攻击节点-${index}`);
            }
        });

        console.log('✅ ComponentFixer: 批量修复完成');
    }

    /**
     * 检查并修复敌人节点
     */
    public static fixEnemyComponents(node: Node): void {
        if (!node || !node.isValid) return;

        console.log(`🔧 ComponentFixer: 修复敌人节点 "${node.name}"`);

        const rigidbody = node.getComponent(RigidBody2D);
        const collider = node.getComponent(Collider2D);

        if (!rigidbody) {
            console.log('🔧 添加 RigidBody2D 到 Enemy');
            const rb = node.addComponent(RigidBody2D);
            rb.enabledContactListener = true;
            rb.bullet = false;
            rb.gravityScale = 0;
            rb.type = ERigidBody2DType.Dynamic;
            rb.group = PhysicsGroupsSimple.GROUPS.ENEMY;
        }

        if (!collider) {
            console.log('🔧 添加 BoxCollider2D 到 Enemy');
            const boxCollider = node.addComponent(BoxCollider2D);
            boxCollider.size.width = 40;
            boxCollider.size.height = 40;
            boxCollider.sensor = false;
        }

        console.log('✅ Enemy 组件修复完成');
    }

    /**
     * 检查并修复玩家节点
     */
    public static fixPlayerComponents(node: Node): void {
        if (!node || !node.isValid) return;

        console.log(`🔧 ComponentFixer: 修复玩家节点 "${node.name}"`);

        const rigidbody = node.getComponent(RigidBody2D);
        const collider = node.getComponent(Collider2D);

        if (!rigidbody) {
            console.log('🔧 添加 RigidBody2D 到 Player');
            const rb = node.addComponent(RigidBody2D);
            rb.enabledContactListener = true;
            rb.bullet = false;
            rb.gravityScale = 0;
            rb.type = ERigidBody2DType.Dynamic;
            rb.group = PhysicsGroupsSimple.GROUPS.PLAYER;
        } else {
            // 确保现有的RigidBody2D配置正确
            if (rigidbody.group !== PhysicsGroupsSimple.GROUPS.PLAYER) {
                rigidbody.group = PhysicsGroupsSimple.GROUPS.PLAYER;
                console.log('🔧 修正 Player RigidBody2D 物理分组');
            }
        }

        if (!collider) {
            console.log('🔧 添加 BoxCollider2D 到 Player');
            const boxCollider = node.addComponent(BoxCollider2D);
            boxCollider.size.width = 40;
            boxCollider.size.height = 40;
            boxCollider.sensor = false;
            boxCollider.group = PhysicsGroupsSimple.GROUPS.PLAYER;
        } else {
            // 确保现有的Collider2D配置正确
            if (collider.group !== PhysicsGroupsSimple.GROUPS.PLAYER) {
                collider.group = PhysicsGroupsSimple.GROUPS.PLAYER;
                console.log('🔧 修正 Player Collider2D 物理分组');
            }
        }

        // 检查是否有PlayerController组件
        const playerController = node.getComponent('PlayerController');
        if (!playerController) {
            console.log('🔧 添加 PlayerController 到 Player');
            node.addComponent('PlayerController');
        }

        console.log('✅ Player 组件修复完成');
    }
} 