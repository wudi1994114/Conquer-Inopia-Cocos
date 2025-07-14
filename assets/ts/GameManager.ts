import { _decorator, Component, Node, Prefab, instantiate, Vec2, view, director, Layers, Camera } from 'cc';
import { ComponentFixer } from './ComponentFixer';
import { PhysicsGroups } from './PhysicsGroups';
import { PhysicsSystem2D } from 'cc';
import { EnemyController } from './EnemyController';
import { enemyDatabase } from './configs/enemy-config';
import { ResourceManager } from './ResourceManager';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {

    @property({ type: Prefab, tooltip: '请将通用的敌人预制体（挂载了EnemyController脚本）拖拽到这里' })
    public enemyPrefab: Prefab | null = null;



    @property({ type: Prefab, tooltip: '请将玩家的预制体拖拽到这里' })
    public playerPrefab: Prefab | null = null;

    @property({ tooltip: '每隔多少秒生成一个敌人' })
    public spawnInterval: number = 2;

    @property({ tooltip: '在屏幕边缘外多少距离生成敌人，防止突然出现' })
    public spawnBuffer: number = 50;
    
    @property({ tooltip: '屏幕上允许存在的最大敌人数量' })
    public maxEnemies: number = 1;

    @property({ tooltip: '目标更新间隔（秒）' })
    public targetUpdateInterval: number = 0.15; // 每150ms更新一次目标



    public activeEnemies: Node[] = [];
    public playerNode: Node | null = null; // 实例化后的玩家节点
    
    // 缓存的目标敌人信息（优化索敌性能）
    private cachedNearestEnemy: Node | null = null;
    private lastTargetUpdateTime: number = 0;

    start() {
        // 🚀 首先预加载所有资源
        this.preloadAllResources();
    }

    /**
     * 预加载所有游戏资源
     */
    private async preloadAllResources(): Promise<void> {
        console.log('🚀 GameManager: 开始预加载所有游戏资源...');
        
        try {
            // 使用ResourceManager预加载所有资源
            await ResourceManager.getInstance().preloadAllResources();
            console.log('✅ GameManager: 所有资源预加载完成，开始初始化游戏');
            
            // 资源加载完成后，初始化游戏
            this.initializeGame();
            
        } catch (error) {
            console.error('❌ GameManager: 资源预加载失败，但继续初始化游戏:', error);
            // 即使预加载失败，也要初始化游戏
            this.initializeGame();
        }
    }

    /**
     * 初始化游戏逻辑
     */
    private initializeGame(): void {
        // 🔧 重要：在游戏开始时强制应用代码中定义的物理碰撞矩阵
        // 这可以防止因编辑器设置错误或被遗忘导致的碰撞问题
        if (PhysicsSystem2D.instance) {
            PhysicsSystem2D.instance.enable = true;
            PhysicsGroups.applyCollisionMatrix();
        } else {
            console.error("❌ GameManager Error: 无法找到物理系统实例！");
        }
        
        // 🔧 检查摄像机层级设置
        this.checkCameraLayerSettings();
        
        // 分别检查每个必需的组件
        if (!this.enemyPrefab) {
            console.error("❌ GameManager Error: 缺少敌人预制体！请在编辑器中设置 enemyPrefab 字段。");
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
        
        console.log('🎮 GameManager: 游戏初始化完成');
    }

    /**
     * 检查摄像机层级设置
     */
    private checkCameraLayerSettings(): void {
        // 查找场景中的摄像机 - 使用多种方法
        const scene = director.getScene();
        if (!scene) {
            console.warn('⚠️ GameManager: 无法找到场景');
            return;
        }
        
        let camera: Camera | null = null;
        
        // 方法1: 在Canvas下查找Camera
        const canvas = scene.getChildByName('Canvas');
        if (canvas) {
            const cameraNode = canvas.getChildByName('Camera');
            if (cameraNode) {
                camera = cameraNode.getComponent(Camera);
                console.log('✅ 在Canvas下找到摄像机');
            }
        }
        
        // 方法2: 直接在场景中查找Camera组件
        if (!camera) {
            const cameraNode = scene.getComponentInChildren(Camera);
            if (cameraNode) {
                camera = cameraNode.getComponent(Camera);
                console.log('✅ 在场景中找到摄像机组件');
            }
        }
        
        // 方法3: 使用find方法查找
        if (!camera) {
            const cameraNode = scene.getChildByPath('Canvas/Camera');
            if (cameraNode) {
                camera = cameraNode.getComponent(Camera);
                console.log('✅ 通过路径找到摄像机');
            }
        }
        
        if (!camera) {
            console.warn('⚠️ GameManager: 无法找到摄像机，跳过层级检查');
            return;
        }
        
        // 检查摄像机的可见性掩码
        const visibility = camera.visibility;
        const defaultLayerMask = Layers.Enum.DEFAULT; // 使用正确的DEFAULT层掩码
        
        console.log(`📷 摄像机层级检查:`);
        console.log(`  - 摄像机可见性掩码: ${visibility}`);
        console.log(`  - DEFAULT层掩码: ${defaultLayerMask}`);
        console.log(`  - 是否包含DEFAULT层: ${(visibility & defaultLayerMask) !== 0 ? '是' : '否'}`);
        
        // 正常情况下摄像机应该包含DEFAULT层
        if ((visibility & defaultLayerMask) !== 0) {
            console.log('✅ 摄像机层级设置正确，包含DEFAULT层');
        } else {
            console.warn('⚠️ 摄像机不包含DEFAULT层，这可能导致对象不可见');
        }
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
        
        // 🔧 修复：玩家应该生成在Canvas内，而不是场景根节点
        const scene = director.getScene();
        if (!scene) {
            console.error('❌ GameManager: 无法找到场景');
            this.safeDestroyNode(player, '玩家');
            return;
        }
        
        const canvas = scene.getChildByName('Canvas');
        if (!canvas) {
            console.error('❌ GameManager: 无法找到Canvas节点');
            this.safeDestroyNode(player, '玩家');
            return;
        }
        
        console.log(`✅ 找到Canvas节点，将玩家生成在Canvas内`);
        
        try {
            player.setParent(canvas);
            
            // 🔧 使用 Layers.Enum.DEFAULT（这是正确的DEFAULT层）
            const correctLayer = Layers.Enum.DEFAULT;
            if (player.layer !== correctLayer) {
                console.log(`🔧 修复玩家预制体层级从 ${player.layer} 到 DEFAULT(${correctLayer})`);
                player.layer = correctLayer;
            }
            
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
        console.log(`🔄 spawnEnemy 被调用，当前敌人数量: ${this.activeEnemies.length}/${this.maxEnemies}`);
        
        // 检查当前敌人数量是否已达上限
        if (this.activeEnemies.length >= this.maxEnemies) {
            console.log(`⚠️ 敌人数量已达上限 (${this.maxEnemies})，跳过生成`);
            return; // 达到上限，则不生成
        }

        if (!this.enemyPrefab) {
            console.error('❌ GameManager：没有设置通用的敌人预制体');
            return;
        }
        
        console.log(`✅ 开始生成敌人，使用预制体: ${this.enemyPrefab.name}`);

        const enemyNode = instantiate(this.enemyPrefab);
        
        // 🔧 修复：敌人应该生成在Canvas内，而不是场景根节点
        const scene = director.getScene();
        if (!scene) {
            console.error('❌ GameManager: 无法找到场景');
            enemyNode.destroy();
            return;
        }
        
        const canvas = scene.getChildByName('Canvas');
        if (!canvas) {
            console.error('❌ GameManager: 无法找到Canvas节点');
            enemyNode.destroy();
            return;
        }
        
        console.log(`✅ 找到Canvas节点，将敌人生成在Canvas内`);
        
        try {
            enemyNode.setParent(canvas);
            
            // 🔧 使用 Layers.Enum.DEFAULT（这是正确的DEFAULT层）
            const correctLayer = Layers.Enum.DEFAULT;
            if (enemyNode.layer !== correctLayer) {
                console.log(`🔧 修复敌人预制体层级从 ${enemyNode.layer} 到 DEFAULT(${correctLayer})`);
                enemyNode.layer = correctLayer;
            }
            
            // 检查 EnemyController 组件是否存在
            const enemyController = enemyNode.getComponent('EnemyController');
            if (!enemyController) {
                console.error('❌ GameManager: 敌人预制体缺少 EnemyController 组件');
                enemyNode.destroy();
                return;
            }
            
            PhysicsGroups.configureEnemyPhysics(enemyNode);
        } catch (error) {
            console.error('❌ GameManager: 设置敌人父节点时发生错误:', error);
            enemyNode.destroy();
            return;
        }

        // 从屏幕边缘随机位置生成
        const screenSize = view.getVisibleSize();
        const screenWidth = screenSize.width;
        const screenHeight = screenSize.height;
        const side = Math.floor(Math.random() * 4);
        
        let spawnX = 0;
        let spawnY = 0;

        // 🔧 修复：使用摄像机视野范围而不是屏幕尺寸
        // 摄像机正交高度约为 661，所以视野宽度约为 1178 (661 * 1920/1080)
        const cameraHeight = 661;
        const cameraWidth = cameraHeight * (screenWidth / screenHeight);
        const safeBuffer = 50; // 🔧 减少缓冲区，让敌人更接近视野边缘
        
        // 🔧 临时测试：让敌人在玩家附近生成
        const testMode = true;
        if (testMode) {
            // 🔧 优化：在玩家周围300-600像素范围内生成，更合理的距离
            const angle = Math.random() * Math.PI * 2;
            const distance = 300 + Math.random() * 300; // 300-600像素距离
            spawnX = Math.cos(angle) * distance;
            spawnY = Math.sin(angle) * distance;
            console.log(`🧪 测试模式：敌人在玩家附近生成 (${spawnX.toFixed(1)}, ${spawnY.toFixed(1)}) 距离: ${distance.toFixed(1)}`);
        } else {
            switch (side) {
                case 0: // Top
                    spawnX = (Math.random() - 0.5) * (cameraWidth - 200); // 🔧 减少生成范围
                    spawnY = cameraHeight / 2 - safeBuffer; // 🔧 在视野内生成
                    break;
                case 1: // Bottom
                    spawnX = (Math.random() - 0.5) * (cameraWidth - 200);
                    spawnY = -cameraHeight / 2 + safeBuffer; // 🔧 在视野内生成
                    break;
                case 2: // Left
                    spawnX = -cameraWidth / 2 + safeBuffer; // 🔧 在视野内生成
                    spawnY = (Math.random() - 0.5) * (cameraHeight - 200);
                    break;
                case 3: // Right
                    spawnX = cameraWidth / 2 - safeBuffer; // 🔧 在视野内生成
                    spawnY = (Math.random() - 0.5) * (cameraHeight - 200);
                    break;
            }
        }
        
        console.log(`📍 敌人生成位置: 边缘${side} (${spawnX.toFixed(1)}, ${spawnY.toFixed(1)})`);

        // 🔧 添加摄像机视野范围调试信息
        console.log(`📷 摄像机视野信息:`);
        console.log(`  - 屏幕尺寸: ${screenWidth}x${screenHeight}`);
        console.log(`  - 摄像机视野: ${cameraWidth.toFixed(1)}x${cameraHeight.toFixed(1)}`);
        console.log(`  - 生成缓冲区: ${safeBuffer}px`);
        console.log(`  - 敌人是否在视野内: ${Math.abs(spawnX) < cameraWidth/2 && Math.abs(spawnY) < cameraHeight/2 ? '是' : '否'}`);

        enemyNode.setPosition(spawnX, spawnY, 0);
        
        // 🔧 调试信息：显示敌人最终位置
        console.log(`📍 敌人最终位置: (${spawnX.toFixed(1)}, ${spawnY.toFixed(1)})`);
        console.log(`📍 敌人世界位置: (${enemyNode.worldPosition.x.toFixed(1)}, ${enemyNode.worldPosition.y.toFixed(1)})`);

        // --- 数据驱动的核心部分 ---
        const enemyId = this.selectEnemyId(); // 随机选择一个敌人类型
        const controller = enemyNode.getComponent(EnemyController);

        // 🔧 添加详细的调试信息
        console.log(`🔍 敌人初始化检查:`);
        console.log(`  - EnemyController组件: ${controller ? '存在' : '不存在'}`);
        console.log(`  - 玩家节点: ${this.playerNode ? '存在' : '不存在'}`);
        if (this.playerNode) {
            console.log(`  - 玩家节点名称: ${this.playerNode.name}`);
            console.log(`  - 玩家节点有效性: ${this.playerNode.isValid ? '有效' : '无效'}`);
            console.log(`  - 玩家节点位置: (${this.playerNode.position.x.toFixed(1)}, ${this.playerNode.position.y.toFixed(1)})`);
        }

        if (controller && this.playerNode) {
            // 🔧 设置玩家节点引用
            controller.playerNode = this.playerNode;
            controller.gameManager = this;
            
            console.log(`✅ 敌人引用设置完成:`);
            console.log(`  - 敌人的playerNode: ${controller.playerNode ? '已设置' : '未设置'}`);
            console.log(`  - 敌人的gameManager: ${controller.gameManager ? '已设置' : '未设置'}`);
            
            // 初始化敌人
            controller.init(enemyId);
        } else {
            if (!controller) console.error(`❌ Prefab上缺少 EnemyController 脚本!`);
            if (!this.playerNode) console.error(`❌ 玩家节点尚未初始化!`);
            enemyNode.destroy();
            return;
        }

        // 将新敌人登记到活跃列表中
        this.activeEnemies.push(enemyNode);
    }

    /**
     * 根据一定规则或随机选择一个敌人的ID
     */
    private selectEnemyId(): string {
        // 简单实现：50%概率生成普通树人，50%概率生成精英巫妖
        const enemyIds = ['ent_normal', 'lich_elite'];
        const randomIndex = Math.floor(Math.random() * enemyIds.length);
        const selectedId = enemyIds[randomIndex];
        console.log(`👹 本次生成敌人ID: ${selectedId}`);
        return selectedId;
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