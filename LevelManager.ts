import { _decorator, Component, Node, Prefab, JsonAsset, resources, CCString, instantiate, Vec3, director } from 'cc';
import { Enemy } from './Enemy'; // Assuming Enemy.ts is in the same directory or accessible
const { ccclass, property } = _decorator;

interface EnemySpawnInfo {
    type: string;
    count: number;
    spawnDelay: number; // Delay *after the previous enemy of this type in this group* or *after wave start for the first one*
    spawnPointGroup?: string; // Optional: for selecting spawn points
}

interface WaveData {
    waveNumber: number;
    description?: string;
    enemies: EnemySpawnInfo[];
    // Could add other wave-specific properties: timeLimit, rewards, etc.
}

interface LevelData {
    levelNumber: number;
    waves: WaveData[];
    // Could add level-specific music, background, etc.
}

@ccclass('LevelManager')
export class LevelManager extends Component {
    @property({ type: JsonAsset, tooltip: "Drag your waves.json file here." })
    public waveJsonAsset: JsonAsset | null = null;

    // For editor assignment of enemy prefabs
    @property({ type: [CCString], tooltip: "Names of enemy types as defined in waves.json." })
    public enemyTypeNames: string[] = [];
    @property({ type: [Prefab], tooltip: "Corresponding enemy prefabs. Order must match enemyTypeNames." })
    public enemyPrefabs: Prefab[] = [];

    @property({ type: Node, tooltip: "Assign the Player node here."})
    public playerNode: Node | null = null;

    // Optional: Assign specific spawn point nodes or a parent of spawn points
    // @property([Node])
    // public spawnPoints: Node[] = [];


    private _enemyPrefabMap: Map<string, Prefab> = new Map();
    private _allLevelsData: LevelData[] = [];

    private _currentLevelIndex: number = 0;
    private _currentWaveIndex: number = -1; // Start at -1 so first call to startNextWave increments to 0

    private _currentWaveEnemiesToSpawnQueue: EnemySpawnInfo[] = []; // Flattened list for current wave
    private _currentWaveActiveEnemies: number = 0;

    private _spawnTimer: number = 0; // Timer for individual enemy spawn delays
    private _isSpawning: boolean = false;
    private _isWaveActive: boolean = false;

    private _enemiesNode: Node | null = null; // Parent for all spawned enemies

    onLoad() {
        if (this.enemyTypeNames.length !== this.enemyPrefabs.length) {
            console.error("LevelManager: enemyTypeNames and enemyPrefabs arrays must have the same length.");
            return;
        }
        for (let i = 0; i < this.enemyTypeNames.length; i++) {
            this._enemyPrefabMap.set(this.enemyTypeNames[i], this.enemyPrefabs[i]);
        }

        if (!this.playerNode) {
            this.playerNode = find("Player"); // Attempt to find player by name if not set
            if(!this.playerNode) console.error("LevelManager: Player node is not assigned and not found by name 'Player'.");
        }

        this._enemiesNode = find("EnemiesContainerNode");
        if (!this._enemiesNode) {
            this._enemiesNode = new Node("EnemiesContainerNode");
            director.getScene()?.addChild(this._enemiesNode); // Add to scene root for now
            console.log("LevelManager: Created 'EnemiesContainerNode'.");
        }

        if (this.waveJsonAsset && this.waveJsonAsset.json) {
            this._allLevelsData = (this.waveJsonAsset.json as any).levels as LevelData[];
            if (this._allLevelsData && this._allLevelsData.length > 0) {
                console.log("LevelManager: Wave data loaded successfully.");
                this.startLevel(0); // Start the first level
            } else {
                console.error("LevelManager: Failed to parse levels from JSON or no levels defined.");
            }
        } else {
            console.error("LevelManager: waveJsonAsset is not assigned or is empty.");
        }
    }

    public startLevel(levelIndex: number) {
        if (levelIndex >= 0 && levelIndex < this._allLevelsData.length) {
            this._currentLevelIndex = levelIndex;
            this._currentWaveIndex = -1; // Reset for the new level
            console.log(`LevelManager: Starting Level ${this._allLevelsData[this._currentLevelIndex].levelNumber}`);
            this.startNextWave();
        } else {
            console.error(`LevelManager: Invalid level index ${levelIndex}.`);
            // Handle game completion or error
        }
    }

    public startNextWave() {
        this._currentWaveIndex++;
        const currentLevelData = this._allLevelsData[this._currentLevelIndex];

        if (this._currentWaveIndex >= 0 && this._currentWaveIndex < currentLevelData.waves.length) {
            const waveData = currentLevelData.waves[this._currentWaveIndex];
            console.log(`LevelManager: Starting Wave ${waveData.waveNumber} of Level ${currentLevelData.levelNumber}. Description: ${waveData.description || 'N/A'}`);

            this._currentWaveEnemiesToSpawnQueue = [];
            waveData.enemies.forEach(group => {
                for (let i = 0; i < group.count; i++) {
                    // For simplicity, push individual spawn tasks. More complex grouping could be handled.
                    this._currentWaveEnemiesToSpawnQueue.push({ ...group, count: 1 }); // Effectively count is 1 per entry now
                }
            });

            this._currentWaveActiveEnemies = 0; // Reset for the new wave, will be incremented on spawn
            this._spawnTimer = 0; // Reset spawn timer for the new wave. First enemy might use its own delay.
            this._isSpawning = true;
            this._isWaveActive = true;

            if (this._currentWaveEnemiesToSpawnQueue.length > 0) {
                 // Set timer for the first enemy of the wave based on its specific delay
                this._spawnTimer = this._currentWaveEnemiesToSpawnQueue[0].spawnDelay;
            } else {
                console.log("LevelManager: Wave has no enemies to spawn.");
                this._isSpawning = false;
                // Potentially auto-advance if wave is empty
                // this.checkWaveCompletion();
            }

        } else {
            console.log(`LevelManager: All waves completed for Level ${currentLevelData.levelNumber}.`);
            // Handle level completion, e.g., start next level or show summary
            this.startLevel(this._currentLevelIndex + 1); // Try to start next level
        }
    }

    update(deltaTime: number) {
        if (!this._isWaveActive || !this._isSpawning) {
            return;
        }

        this._spawnTimer -= deltaTime;

        if (this._spawnTimer <= 0 && this._currentWaveEnemiesToSpawnQueue.length > 0) {
            const enemySpawnDetail = this._currentWaveEnemiesToSpawnQueue.shift()!; // Get and remove first enemy

            this.spawnEnemy(enemySpawnDetail.type, enemySpawnDetail.spawnPointGroup);

            if (this._currentWaveEnemiesToSpawnQueue.length > 0) {
                // Set timer for the next enemy in the queue based on its specific delay
                this._spawnTimer = this._currentWaveEnemiesToSpawnQueue[0].spawnDelay;
            } else {
                // All enemies for this wave have been queued for spawning (actual spawn might take time)
                console.log("LevelManager: All enemies for the current wave have been processed from queue.");
                this._isSpawning = false;
                // Now we wait for all _currentWaveActiveEnemies to be defeated.
            }
        }

        // Check for wave completion (if no more spawning and all active enemies defeated)
        // This check should be moved to where enemies actually die (e.g., an event system)
        // For now, as a placeholder:
        // if (!this._isSpawning && this._currentWaveActiveEnemies <= 0 && this._isWaveActive) {
        //     this.waveCompleted();
        // }
    }

    spawnEnemy(typeName: string, spawnPointGroup?: string) {
        const prefab = this._enemyPrefabMap.get(typeName);
        if (!prefab) {
            console.error(`LevelManager: Prefab not found for enemy type "${typeName}".`);
            return;
        }
        if (!this._enemiesNode || !this._enemiesNode.isValid) {
            console.error("LevelManager: EnemiesNode is invalid. Cannot spawn enemy.");
            return;
        }

        const enemyNode = instantiate(prefab);
        this._enemiesNode.addChild(enemyNode);

        // Determine spawn position (placeholder - use spawnPointGroup later)
        // For now, spawn at a default offset or random position for testing
        const xPos = Math.random() * 400 - 200; // Random X between -200 and 200
        const yPos = (this.playerNode?.position.y || 0) + 300; // Spawn above player
        enemyNode.setWorldPosition(new Vec3(xPos, yPos, 0));

        this._currentWaveActiveEnemies++; // Increment count of active enemies
        // console.log(`Spawned ${typeName}. Active enemies: ${this._currentWaveActiveEnemies}`);


        const enemyScript = enemyNode.getComponent(Enemy);
        if (enemyScript && this.playerNode) {
            enemyScript.setTarget(this.playerNode);
            // Listen for enemy death to decrement _currentWaveActiveEnemies
            enemyNode.on(Enemy.EVENT_ENEMY_DIED, this.onEnemyDied, this);
        } else if (!enemyScript) {
            console.error(`LevelManager: Enemy script not found on ${typeName} prefab.`);
        } else if (!this.playerNode) {
            console.warn(`LevelManager: PlayerNode not set, cannot assign target to ${typeName}.`);
        }
    }

    onEnemyDied(enemyNode: Node) {
        if (!this._isWaveActive) return; // Don't process if wave isn't active

        this._currentWaveActiveEnemies--;
        // console.log(`Enemy died. Active enemies remaining: ${this._currentWaveActiveEnemies}`);
        enemyNode.off(Enemy.EVENT_ENEMY_DIED, this.onEnemyDied, this); // Unsubscribe

        if (this._currentWaveActiveEnemies <= 0 && !this._isSpawning && this._currentWaveEnemiesToSpawnQueue.length === 0) {
            this.waveCompleted();
        }
    }

    waveCompleted() {
        console.log(`LevelManager: Wave ${this._allLevelsData[this._currentLevelIndex].waves[this._currentWaveIndex].waveNumber} completed!`);
        this._isWaveActive = false;
        // Add a delay before starting next wave or show a summary
        this.scheduleOnce(() => {
            this.startNextWave();
        }, 2.0); // 2-second delay
    }

    onDestroy() {
        // Clean up listeners if any global ones were registered
        // For enemy death, they are cleaned up in onEnemyDied or when EnemiesContainerNode is destroyed
        if (this._enemiesNode && this._enemiesNode.isValid) {
            this._enemiesNode.children.forEach(enemy => {
                enemy.off(Enemy.EVENT_ENEMY_DIED, this.onEnemyDied, this);
            });
        }
    }
}
