import { _decorator, SpriteAtlas, resources } from 'cc';

const { ccclass } = _decorator;

// 资源配置
export const RESOURCE_CONFIGS = {
    // 敌人资源
    ENEMY_ENT: {
        path: 'monster/ent',
        name: 'ent'
    },
    ENEMY_LICH: {
        path: 'monster/lich',
        name: 'lich'
    },

    // 玩家资源
    PLAYER: {
        path: 'player/player',
        name: 'player'
    },
    
    // 技能资源
    SKILL_FIREBALL: {
        path: 'skill/fireball',
        name: 'fireball'
    },
    SKILL_THUNDER: {
        path: 'skill/thunder',
        name: 'thunder'
    }
};

@ccclass('ResourceManager')
export class ResourceManager {
    private static _instance: ResourceManager | null = null;
    private _cache: Map<string, any> = new Map();

    private constructor() {}

    /**
     * 获取单例实例
     */
    public static getInstance(): ResourceManager {
        if (!ResourceManager._instance) {
            ResourceManager._instance = new ResourceManager();
        }
        return ResourceManager._instance;
    }

    /**
     * 加载敌人图集 - ent
     */
    public async loadEnemyEntAtlas(): Promise<SpriteAtlas> {
        const config = RESOURCE_CONFIGS.ENEMY_ENT;
        return this.loadSpriteAtlas(config.path);
    }

    /**
     * 加载敌人图集 - lich
     */
    public async loadEnemyLichAtlas(): Promise<SpriteAtlas> {
        const config = RESOURCE_CONFIGS.ENEMY_LICH;
        return this.loadSpriteAtlas(config.path);
    }

    /**
     * 加载敌人图集 - 通用方法（保持向后兼容）
     */
    public async loadEnemyAtlas(): Promise<SpriteAtlas> {
        // 默认加载ent图集
        return this.loadEnemyEntAtlas();
    }


    /**
     * 加载玩家图集
     */
    public async loadPlayerAtlas(): Promise<SpriteAtlas> {
        const config = RESOURCE_CONFIGS.PLAYER;
        return this.loadSpriteAtlas(config.path);
    }

    /**
     * 加载技能图集 - 火球
     */
    public async loadFireballAtlas(): Promise<SpriteAtlas> {
        const config = RESOURCE_CONFIGS.SKILL_FIREBALL;
        return this.loadSpriteAtlas(config.path);
    }

    /**
     * 加载技能图集 - 雷电
     */
    public async loadThunderAtlas(): Promise<SpriteAtlas> {
        const config = RESOURCE_CONFIGS.SKILL_THUNDER;
        return this.loadSpriteAtlas(config.path);
    }

    /**
     * 通用的精灵图集加载方法
     */
    private async loadSpriteAtlas(path: string): Promise<SpriteAtlas> {
        // 检查缓存
        if (this._cache.has(path)) {
            console.log(`📦 从缓存加载图集: ${path}`);
            return this._cache.get(path);
        }

        return new Promise((resolve, reject) => {
            console.log(`🔄 开始加载图集: ${path}`);
            
            resources.load(path, SpriteAtlas, (error, atlas) => {
                if (error) {
                    console.error(`❌ 加载图集失败: ${path}`, error);
                    reject(error);
                    return;
                }

                if (!atlas) {
                    const errorMsg = `❌ 图集为空: ${path}`;
                    console.error(errorMsg);
                    reject(new Error(errorMsg));
                    return;
                }

                // 缓存图集
                this._cache.set(path, atlas);
                console.log(`✅ 图集加载成功: ${path}`);
                resolve(atlas);
            });
        });
    }

    /**
     * 预加载所有资源
     */
    public async preloadAllResources(): Promise<void> {
        console.log(`🚀 开始预加载所有资源...`);
        
        const loadPromises = [
            // 敌人资源
            this.loadEnemyEntAtlas(),
            this.loadEnemyLichAtlas(),
            
            // 玩家资源
            this.loadPlayerAtlas(),
            
            // 技能资源
            this.loadFireballAtlas(),
            this.loadThunderAtlas()
        ];

        try {
            await Promise.all(loadPromises);
            console.log(`✅ 所有资源预加载完成`);
        } catch (error) {
            console.error(`❌ 资源预加载失败:`, error);
            throw error;
        }
    }

    /**
     * 清理缓存
     */
    public clearCache(): void {
        this._cache.clear();
        console.log(`🗑️ 资源缓存已清空`);
    }

    /**
     * 获取缓存信息
     */
    public getCacheInfo(): { size: number; keys: string[] } {
        return {
            size: this._cache.size,
            keys: Array.from(this._cache.keys())
        };
    }
} 