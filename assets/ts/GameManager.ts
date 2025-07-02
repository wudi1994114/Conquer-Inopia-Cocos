import { _decorator, Component, Node, Prefab, instantiate, Vec2, view, director } from 'cc';
import { Enemy } from './Enemy';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {

    @property({ type: Prefab, tooltip: '请将敌人的预制体拖拽到这里' })
    public enemyPrefab: Prefab | null = null;

    @property({ tooltip: '每隔多少秒生成一个敌人' })
    public spawnInterval: number = 2;

    @property({ type: Node, tooltip: '请将场景中的 Player 节点拖拽到这里' })
    public playerNode: Node | null = null;
    
    @property({ tooltip: '在屏幕边缘外多少距离生成敌人，防止突然出现' })
    public spawnBuffer: number = 50;
    
    @property({ tooltip: '屏幕上允许存在的最大敌人数量' })
    public maxEnemies: number = 5;

    public activeEnemies: Node[] = [];

    start() {
        console.log("🎮 GameManager 初始化开始");
        
        // 分别检查每个必需的组件
        if (!this.enemyPrefab) {
            console.error("❌ GameManager Error: 缺少 Enemy Prefab！请在编辑器中设置 enemyPrefab 字段。");
            return;
        }
        
        if (!this.playerNode) {
            console.error("❌ GameManager Error: 缺少 Player Node！请在编辑器中设置 playerNode 字段。");
            return;
        }
        
        console.log("✅ GameManager 初始化成功：Enemy Prefab 和 Player Node 都已设置。");
        console.log("⚙️ 游戏设置:");
        console.log("  - 敌人生成间隔:", this.spawnInterval, "秒");
        console.log("  - 最大敌人数量:", this.maxEnemies);
        console.log("  - 生成缓冲距离:", this.spawnBuffer);
        
        // 使用Cocos的定时器循环调用生成方法
        this.schedule(this.spawnEnemy, this.spawnInterval);
        console.log("🕐 敌人生成定时器已启动");
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
        const parentNode = this.node.parent || this.node.scene || director.getScene();
        if (!parentNode) {
            console.error('❌ GameManager：无法找到合适的父节点来生成敌人');
            enemy.destroy();
            return;
        }
        enemy.setParent(parentNode);

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

    // 提供给Enemy脚本调用的方法，用于在敌人死亡时将其从列表中移除
    public removeEnemy(enemyNode: Node) {
        const index = this.activeEnemies.indexOf(enemyNode);
        if (index > -1) {
            console.log(`📋 从活跃列表中移除敌人，位置: ${index}，剩余敌人数量: ${this.activeEnemies.length - 1}`);
            this.activeEnemies.splice(index, 1);
        } else {
            console.log("⚠️ 警告：尝试移除不存在的敌人");
        }
    }
}