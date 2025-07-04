import { _decorator, Component, Node, Prefab, instantiate, Vec2, view, director } from 'cc';
import { Enemy } from './Enemy';
import { ComponentFixer } from './ComponentFixer';
import { PhysicsGroups } from './PhysicsGroups';
import { PhysicsSystem2D } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {

    @property({ type: Prefab, tooltip: '请将敌人的预制体拖拽到这里' })
    public enemyPrefab: Prefab | null = null;

    @property({ type: Prefab, tooltip: '请将玩家的预制体拖拽到这里' })
    public playerPrefab: Prefab | null = null;

    @property({ tooltip: '每隔多少秒生成一个敌人' })
    public spawnInterval: number = 2;

    @property({ tooltip: '在屏幕边缘外多少距离生成敌人，防止突然出现' })
    public spawnBuffer: number = 50;
    
    @property({ tooltip: '屏幕上允许存在的最大敌人数量' })
    public maxEnemies: number = 5;

    @property({ tooltip: '目标更新间隔（秒）' })
    public targetUpdateInterval: number = 0.15; // 每150ms更新一次目标

    public activeEnemies: Node[] = [];
    public playerNode: Node | null = null; // 实例化后的玩家节点
    
    // 缓存的目标敌人信息（优化索敌性能）
    private cachedNearestEnemy: Node | null = null;
    private lastTargetUpdateTime: number = 0;

    start() {
        // 🔧 重要：在游戏开始时强制应用代码中定义的物理碰撞矩阵
        // 这可以防止因编辑器设置错误或被遗忘导致的碰撞问题
        if (PhysicsSystem2D.instance) {
            PhysicsSystem2D.instance.enable = true;
            PhysicsGroups.applyCollisionMatrix();
        } else {
            console.error("❌ GameManager Error: 无法找到物理系统实例！");
        }
        
        // 分别检查每个必需的组件
        if (!this.enemyPrefab) {
            console.error("❌ GameManager Error: 缺少 Enemy Prefab！请在编辑器中设置 enemyPrefab 字段。");
            return;
        }
        
        if (!this.playerPrefab) {
            console.error("❌ GameManager Error: 缺少 Player Prefab！请在编辑器中设置 playerPrefab 字段。");
            return;
        }
        
        // 实例化玩家并放在地图中间
        this.spawnPlayer();
        
        // 使用Cocos的定时器循环调用生成方法
        this.schedule(this.spawnEnemy, this.spawnInterval);
        
        // 启动目标更新定时器
        this.schedule(this.updateNearestEnemy, this.targetUpdateInterval);
    }

    /**
     * 在地图中间实例化玩家
     */
    private spawnPlayer() {
        if (!this.playerPrefab) {
            console.error('❌ GameManager: 缺少玩家预制体，无法生成玩家');
            return;
        }

        // 实例化玩家预制体
        const player = instantiate(this.playerPrefab);
        
        // 安全的父节点设置
        let parentNode = null;
        if (this.node && this.node.isValid && this.node.parent && this.node.parent.isValid) {
            parentNode = this.node.parent;
        } else if (this.node && this.node.isValid && this.node.scene && this.node.scene.isValid) {
            parentNode = this.node.scene;
            console.warn('⚠️ GameManager: 使用场景根节点作为玩家父节点');
        } else {
            const scene = director.getScene();
            if (scene && scene.isValid) {
                parentNode = scene;
                console.warn('⚠️ GameManager: 使用导演场景作为玩家父节点');
            }
        }
        
        if (!parentNode || !parentNode.isValid) {
            console.error('❌ GameManager: 无法找到合适的父节点来生成玩家');
            this.safeDestroyNode(player, '玩家');
            return;
        }
        
        try {
            player.setParent(parentNode);
            
            // 使用专门的玩家组件修复方法
            ComponentFixer.fixPlayerComponents(player);
            
            // 设置玩家位置为地图中间 (0, 0)
            player.setPosition(0, 0, 0);
            
            // 保存玩家节点引用
            this.playerNode = player;
            
        } catch (error) {
            console.error('❌ GameManager: 设置玩家节点时发生错误:', error);
            this.safeDestroyNode(player, '玩家');
            return;
        }
    }

    spawnEnemy() {
        // 检查当前敌人数量是否已达上限
        if (this.activeEnemies.length >= this.maxEnemies) {
            return; // 达到上限，则不生成
        }

        if (!this.enemyPrefab) {
            console.error('❌ GameManager：缺少敌人预制体，无法生成敌人');
            return;
        }

        const enemy = instantiate(this.enemyPrefab);
        
        // 安全的父节点设置
        let parentNode = null;
        if (this.node && this.node.isValid && this.node.parent && this.node.parent.isValid) {
            parentNode = this.node.parent;
        } else if (this.node && this.node.isValid && this.node.scene && this.node.scene.isValid) {
            parentNode = this.node.scene;
            console.warn('⚠️ GameManager: 使用场景根节点作为父节点');
        } else {
            const scene = director.getScene();
            if (scene && scene.isValid) {
                parentNode = scene;
                console.warn('⚠️ GameManager: 使用导演场景作为父节点');
            }
        }
        
        if (!parentNode || !parentNode.isValid) {
            console.error('❌ GameManager: 无法找到合适的父节点来生成敌人');
            this.safeDestroyNode(enemy, '敌人');
            return;
        }
        
        try {
            enemy.setParent(parentNode);
            
            // 自动修复敌人缺失的组件
            ComponentFixer.fixEnemyComponents(enemy);
            
            // 🔧 启用物理分组系统：设置敌人为ENEMY分组
            PhysicsGroups.configureEnemyPhysics(enemy);
            console.log("🛡️ 已配置敌人的物理分组，将正确与玩家攻击发生碰撞");
        } catch (error) {
            console.error('❌ GameManager: 设置敌人父节点时发生错误:', error);
            this.safeDestroyNode(enemy, '敌人');
            return;
        }

        // 从屏幕边缘随机位置生成
        const screenSize = view.getVisibleSize();
        const screenWidth = screenSize.width;
        const screenHeight = screenSize.height;
        const side = Math.floor(Math.random() * 4);
        
        let spawnX = 0;
        let spawnY = 0;

        switch (side) {
            case 0: // Top
                spawnX = (Math.random() - 0.5) * screenWidth;
                spawnY = screenHeight / 2 + this.spawnBuffer;
                break;
            case 1: // Bottom
                spawnX = (Math.random() - 0.5) * screenWidth;
                spawnY = -screenHeight / 2 - this.spawnBuffer;
                break;
            case 2: // Left
                spawnX = -screenWidth / 2 - this.spawnBuffer;
                spawnY = (Math.random() - 0.5) * screenHeight;
                break;
            case 3: // Right
                spawnX = screenWidth / 2 + this.spawnBuffer;
                spawnY = (Math.random() - 0.5) * screenHeight;
                break;
        }

        enemy.setPosition(spawnX, spawnY, 0);

        // 将关键信息传递给新生成的敌人
        const enemyScript = enemy.getComponent(Enemy);
        if (enemyScript && this.playerNode) {
            enemyScript.playerNode = this.playerNode;
            enemyScript.gameManager = this; 
        }

        // 将新敌人登记到活跃列表中
        this.activeEnemies.push(enemy);
    }

    /**
     * 安全销毁节点，防止重复销毁
     * @param node 要销毁的节点
     * @param nodeType 节点类型（用于日志）
     */
    private safeDestroyNode(node: Node | null, nodeType: string = '节点') {
        if (!node) {
            console.warn(`⚠️ GameManager: 尝试销毁null ${nodeType}`);
            return;
        }
        
        if (!node.isValid) {
            console.warn(`⚠️ GameManager: ${nodeType} 已经无效，跳过销毁`);
            return;
        }
        
        try {
            node.destroy();
        } catch (error) {
            console.error(`❌ GameManager: 销毁 ${nodeType} 时发生错误:`, error);
        }
    }

    // 提供给Enemy脚本调用的方法，用于在敌人死亡时将其从列表中移除
    public removeEnemy(enemyNode: Node) {
        if (!enemyNode) {
            console.warn("⚠️ GameManager: 尝试移除null敌人");
            return;
        }
        
        const index = this.activeEnemies.indexOf(enemyNode);
        if (index > -1) {
            this.activeEnemies.splice(index, 1);
        }
    }

    /**
     * 定时更新最近的敌人缓存
     */
    private updateNearestEnemy() {
        // 如果没有玩家，无法计算距离
        if (!this.playerNode || !this.playerNode.isValid) {
            this.cachedNearestEnemy = null;
            console.log("🎯 缓存更新：无玩家节点");
            return;
        }
        
        // 清理已销毁的敌人
        this.activeEnemies = this.activeEnemies.filter(enemy => enemy && enemy.isValid);
        
        // 如果没有活跃敌人，清空缓存
        if (this.activeEnemies.length === 0) {
            this.cachedNearestEnemy = null;
            console.log("🎯 缓存更新：无活跃敌人");
            return;
        }
        
        const playerPos = this.playerNode.worldPosition;
        let nearestEnemy: Node | null = null;
        let minDistance = Infinity;
        
        // 查找最近的敌人
        for (const enemy of this.activeEnemies) {
            if (enemy && enemy.isValid) {
                const enemyPos = enemy.worldPosition;
                const distance = Math.sqrt(
                    Math.pow(enemyPos.x - playerPos.x, 2) + 
                    Math.pow(enemyPos.y - playerPos.y, 2)
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestEnemy = enemy;
                }
            }
        }
        
        // 更新缓存
        this.cachedNearestEnemy = nearestEnemy;
        this.lastTargetUpdateTime = Date.now();
        
        // 添加调试信息
        if (nearestEnemy) {
            const enemyPos = nearestEnemy.worldPosition;
            console.log(`🎯 缓存更新：玩家位置(${playerPos.x.toFixed(1)}, ${playerPos.y.toFixed(1)}) 最近敌人位置(${enemyPos.x.toFixed(1)}, ${enemyPos.y.toFixed(1)}) 距离:${minDistance.toFixed(1)}`);
        } else {
            console.log("🎯 缓存更新：未找到有效敌人");
        }
    }
    
    /**
     * 获取缓存的最近敌人
     * @returns 最近的敌人节点和相关信息，如果没有则返回null
     */
    public getCachedNearestEnemy(): { enemy: Node; position: { x: number; y: number; }; name: string } | null {
        if (!this.cachedNearestEnemy || !this.cachedNearestEnemy.isValid) {
            return null;
        }
        
        const pos = this.cachedNearestEnemy.worldPosition;
        return {
            enemy: this.cachedNearestEnemy,
            position: { x: pos.x, y: pos.y },
            name: this.cachedNearestEnemy.name
        };
    }

    onDestroy() {
        // 安全清理玩家节点
        if (this.playerNode) {
            this.safeDestroyNode(this.playerNode, '玩家');
            this.playerNode = null;
        }
        
        // 安全清理所有活跃敌人
        this.activeEnemies.forEach((enemy, index) => {
            this.safeDestroyNode(enemy, `敌人-${index}`);
        });
        
        // 清理敌人列表
        this.activeEnemies.length = 0;
        
        // 清理缓存
        this.cachedNearestEnemy = null;
        
        // 取消定时器
        this.unschedule(this.spawnEnemy);
        this.unschedule(this.updateNearestEnemy);
    }
}