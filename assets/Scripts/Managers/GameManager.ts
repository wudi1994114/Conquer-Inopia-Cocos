import { _decorator, Component, Node, Prefab, instantiate, Vec3, director } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    // 单例实例
    private static _instance: GameManager = null!;
    public static get instance(): GameManager {
        return this._instance;
    }

    @property({ type: Node })
    public player: Node = null!;

    @property({ type: [Prefab] })
    public enemyPrefabs: Prefab[] = [];

    @property({ type: Number })
    public enemySpawnRate: number = 2.0;

    @property({ type: Number })
    public maxEnemies: number = 10;

    // 游戏状态
    private gameState: 'menu' | 'playing' | 'paused' | 'gameover' = 'menu';
    private score: number = 0;
    private playerHealth: number = 100;
    private enemySpawnTimer: number = 0;
    private currentEnemies: Node[] = [];

    onLoad() {
        // 设置单例
        if (GameManager._instance === null) {
            GameManager._instance = this;
            director.addPersistRootNode(this.node);
        } else {
            this.node.destroy();
            return;
        }
    }

    start() {
        this.initGame();
    }

    update(deltaTime: number) {
        if (this.gameState === 'playing') {
            this.updateEnemySpawn(deltaTime);
            this.cleanupEnemies();
        }
    }

    public initGame() {
        this.score = 0;
        this.playerHealth = 100;
        this.enemySpawnTimer = 0;
        this.currentEnemies = [];
        this.gameState = 'menu';
        console.log("游戏初始化完成");
    }

    public startGame() {
        this.gameState = 'playing';
        console.log("游戏开始");
    }

    public pauseGame() {
        this.gameState = 'paused';
        console.log("游戏暂停");
    }

    public resumeGame() {
        this.gameState = 'playing';
        console.log("游戏继续");
    }

    public gameOver() {
        this.gameState = 'gameover';
        console.log(`游戏结束！最终得分：${this.score}`);
        // 显示游戏结束界面
    }

    public addScore(points: number) {
        this.score += points;
        console.log(`得分增加：${points}，总分：${this.score}`);
    }

    public damagePlayer(damage: number) {
        this.playerHealth -= damage;
        console.log(`玩家受到伤害：${damage}，剩余血量：${this.playerHealth}`);
        
        if (this.playerHealth <= 0) {
            this.gameOver();
        }
    }

    private updateEnemySpawn(deltaTime: number) {
        this.enemySpawnTimer -= deltaTime;
        
        if (this.enemySpawnTimer <= 0 && this.currentEnemies.length < this.maxEnemies) {
            this.spawnEnemy();
            this.enemySpawnTimer = this.enemySpawnRate;
        }
    }

    private spawnEnemy() {
        if (this.enemyPrefabs.length === 0) return;
        
        const randomIndex = Math.floor(Math.random() * this.enemyPrefabs.length);
        const enemyNode = instantiate(this.enemyPrefabs[randomIndex]);
        
        // 随机生成位置（屏幕外围）
        const spawnPosition = this.getRandomSpawnPosition();
        enemyNode.setPosition(spawnPosition);
        
        this.node.addChild(enemyNode);
        this.currentEnemies.push(enemyNode);
        
        console.log("敌人生成");
    }

    private getRandomSpawnPosition(): Vec3 {
        // 在屏幕边缘随机生成位置
        const screenEdge = Math.floor(Math.random() * 4); // 0: 上, 1: 右, 2: 下, 3: 左
        let x = 0, y = 0;
        
        switch (screenEdge) {
            case 0: // 上
                x = Math.random() * 1000 - 500;
                y = 400;
                break;
            case 1: // 右
                x = 500;
                y = Math.random() * 600 - 300;
                break;
            case 2: // 下
                x = Math.random() * 1000 - 500;
                y = -400;
                break;
            case 3: // 左
                x = -500;
                y = Math.random() * 600 - 300;
                break;
        }
        
        return new Vec3(x, y, 0);
    }

    private cleanupEnemies() {
        this.currentEnemies = this.currentEnemies.filter(enemy => enemy && enemy.isValid);
    }

    public getGameState(): string {
        return this.gameState;
    }

    public getScore(): number {
        return this.score;
    }

    public getPlayerHealth(): number {
        return this.playerHealth;
    }
} 