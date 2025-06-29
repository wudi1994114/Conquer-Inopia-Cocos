import { _decorator, Component, Node, Prefab, Vec3, CCInteger, find, director, Label } from 'cc';
import { Enemy } from './Enemy'; // Import Enemy to type hint and access its methods
import { Tower } from './Tower'; // Import Tower if GameManager needs to interact with it directly

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {

    @property(Prefab)
    public enemyPrefab: Prefab | null = null;

    @property(Node)
    public towerNode: Node | null = null; // Assign your main tower node here in the editor

    @property(Node)
    public spawnPointsParent: Node | null = null; // Parent node containing multiple spawn point nodes

    @property(CCInteger)
    public initialSpawnCount: number = 5;

    @property(CCInteger)
    public waveNumber: number = 1;

    @property(Label)
    public scoreLabel: Label | null = null;

    @property(Label)
    public waveLabel: Label | null = null;

    private score: number = 0;
    private enemiesAlive: number = 0;
    private spawnInterval: number = 2; // Time between spawns in a wave
    private waveCooldown: number = 5; // Time between waves
    private timeToNextSpawn: number = 0;
    private timeToNextWave: number = 0;
    private currentSpawnCountInWave: number = 0;
    private totalToSpawnThisWave: number = 0;

    private spawnLocations: Vec3[] = [];

    start() {
        if (this.spawnPointsParent) {
            this.spawnPointsParent.children.forEach(child => {
                this.spawnLocations.push(child.worldPosition.clone());
            });
        } else {
            console.warn("GameManager: spawnPointsParent is not set. Enemies will spawn at origin if not handled.");
            // Add a default spawn point if none are provided for basic functionality
            this.spawnLocations.push(new Vec3(0, 200, 0)); // Example default
        }

        if (!this.towerNode) {
            console.warn("GameManager: towerNode is not set. Enemies may not have a target.");
            // Attempt to find it if not set, assuming a common name/path
            this.towerNode = find("Canvas/Tower"); // Adjust path as needed
            if (!this.towerNode) {
                console.error("GameManager: Failed to find TowerNode automatically.");
            }
        }

        this.timeToNextWave = this.waveCooldown; // Start with a cooldown before the first wave
        this.updateScore(0);
        this.updateWaveDisplay();
    }

    update(deltaTime: number) {
        if (this.timeToNextWave > 0) {
            this.timeToNextWave -= deltaTime;
            if (this.timeToNextWave <= 0) {
                this.startNextWave();
            }
        } else { // Wave is active
            if (this.currentSpawnCountInWave < this.totalToSpawnThisWave) {
                this.timeToNextSpawn -= deltaTime;
                if (this.timeToNextSpawn <= 0) {
                    this.spawnEnemy();
                    this.timeToNextSpawn = this.spawnInterval;
                }
            } else if (this.enemiesAlive <= 0) {
                // All spawned enemies are defeated, start cooldown for next wave
                this.timeToNextWave = this.waveCooldown;
                this.waveNumber++;
                this.updateWaveDisplay();
                console.log(`Wave ${this.waveNumber -1} cleared! Next wave in ${this.waveCooldown}s.`);
            }
        }
    }

    startNextWave() {
        console.log(`Starting Wave ${this.waveNumber}`);
        this.totalToSpawnThisWave = this.initialSpawnCount + (this.waveNumber - 1) * 2; // Example: increase count per wave
        this.currentSpawnCountInWave = 0;
        this.timeToNextSpawn = 0; // Spawn first enemy immediately
        this.updateWaveDisplay();
    }

    spawnEnemy() {
        if (!this.enemyPrefab) {
            console.error("GameManager: Enemy prefab is not set!");
            return;
        }
        if (this.spawnLocations.length === 0) {
            console.error("GameManager: No spawn locations available for enemies!");
            return;
        }

        const randomSpawnIndex = Math.floor(Math.random() * this.spawnLocations.length);
        const spawnPos = this.spawnLocations[randomSpawnIndex];

import { _decorator, Component, Node, Prefab, Vec3, CCInteger, find, director, Label, instantiate } from 'cc'; // Added instantiate
import { Enemy } from './Enemy'; // Import Enemy to type hint and access its methods
// ... (rest of the imports remain the same)
// ... (GameManager class definition up to spawnEnemy)

    spawnEnemy() {
        if (!this.enemyPrefab) {
            console.error("GameManager: Enemy prefab is not set!");
            return;
        }
        if (this.spawnLocations.length === 0) {
            console.error("GameManager: No spawn locations available for enemies!");
            return;
        }

        const randomSpawnIndex = Math.floor(Math.random() * this.spawnLocations.length);
        const spawnPos = this.spawnLocations[randomSpawnIndex];

        const enemyNode = instantiate(this.enemyPrefab);
        if (enemyNode) {
            let enemiesContainer = find('Canvas/EnemiesContainer');
            if (!enemiesContainer) {
                console.warn("GameManager: 'Canvas/EnemiesContainer' not found. Creating one.");
                enemiesContainer = new Node('EnemiesContainer');
                director.getScene()?.addChild(enemiesContainer); // Add to scene, typically under Canvas
                // It might be better to ensure Canvas exists and add it there:
                // const canvas = find('Canvas');
                // if (canvas) canvas.addChild(enemiesContainer);
                // else director.getScene()?.addChild(enemiesContainer);
            }
            enemiesContainer.addChild(enemyNode);

            enemyNode.setWorldPosition(spawnPos);
            this.enemiesAlive++;
            this.currentSpawnCountInWave++;

            const enemyScript = enemyNode.getComponent(Enemy);
            if (enemyScript) {
                if (this.towerNode) {
                    enemyScript.setTarget(this.towerNode);
                } else {
                    console.warn("GameManager: No towerNode set for enemy target in GameManager. Enemy will not move towards tower.");
                }
                // Registering for a custom event when enemy dies
                enemyNode.on('enemy-has-died', this.onEnemyDied, this);
            } else {
                console.error("GameManager: Enemy script not found on spawned enemy prefab.");
            }
            console.log(`GameManager: Spawned enemy ${enemyNode.name} at ${spawnPos.toString()}`);
        } else {
            console.error("GameManager: Failed to instantiate enemy prefab.");
        }
    }

    // Make sure onEnemyDied is correctly defined to handle the event
    public onEnemyDied(enemyNodeThatDied: Node) { // Parameter is the node that emitted the event
        this.enemiesAlive--;
        this.updateScore(this.score + 10); // Example score
        console.log(`GameManager: Enemy ${enemyNodeThatDied.name} processed as died. Enemies alive: ${this.enemiesAlive}`);
        // Note: The enemy itself handles its own destruction (this.node.destroy())
        // We just need to update our count and game state.
    }

    // ... (rest of GameManager.ts)
    public onEnemyDied(enemyNode: Node) { // This would be called by Enemy.ts upon death
        this.enemiesAlive--;
        // Add score, etc.
        this.updateScore(this.score + 10); // Example score
        console.log(`GameManager: Enemy died. Enemies alive: ${this.enemiesAlive}`);
    }

    updateScore(newScore: number) {
        this.score = newScore;
        if (this.scoreLabel) {
            this.scoreLabel.string = `Score: ${this.score}`;
        }
    }

    updateWaveDisplay() {
        if (this.waveLabel) {
            this.waveLabel.string = `Wave: ${this.waveNumber}`;
        }
    }

    // Placeholder for game over
    public gameOver() {
        console.log("Game Over!");
        // director.pause(); // Pause the game
        // Show game over UI, etc.
    }
}
