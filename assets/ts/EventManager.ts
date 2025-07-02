/**
 * 全局事件管理器
 * 实现模块间的解耦通信，支持发布-订阅模式
 */

export type EventCallback = (data?: any) => void;

export interface EventData {
    [key: string]: any;
}

/**
 * 游戏事件类型定义
 */
export enum GameEvents {
    // 玩家事件
    PLAYER_ATTACK = 'PLAYER_ATTACK',
    PLAYER_TAKE_DAMAGE = 'PLAYER_TAKE_DAMAGE',
    PLAYER_LEVEL_UP = 'PLAYER_LEVEL_UP',
    PLAYER_MOVE = 'PLAYER_MOVE',
    
    // 敌人事件
    ENEMY_SPAWNED = 'ENEMY_SPAWNED',
    ENEMY_KILLED = 'ENEMY_KILLED',
    ENEMY_TAKE_DAMAGE = 'ENEMY_TAKE_DAMAGE',
    
    // 技能事件
    SKILL_ACQUIRED = 'SKILL_ACQUIRED',
    SKILL_UPGRADED = 'SKILL_UPGRADED',
    SKILL_ACTIVATED = 'SKILL_ACTIVATED',
    SKILL_COOLDOWN_COMPLETE = 'SKILL_COOLDOWN_COMPLETE',
    
    // 攻击事件
    ATTACK_HIT = 'ATTACK_HIT',
    ATTACK_MISS = 'ATTACK_MISS',
    ATTACK_CRITICAL = 'ATTACK_CRITICAL',
    
    // 游戏状态事件
    GAME_START = 'GAME_START',
    GAME_PAUSE = 'GAME_PAUSE',
    GAME_RESUME = 'GAME_RESUME',
    GAME_OVER = 'GAME_OVER',
    
    // 系统事件
    CONFIG_CHANGED = 'CONFIG_CHANGED'
}

/**
 * 目标数据接口（避免循环引用）
 */
export interface TargetData {
    name: string;
    uuid: string;
    position: { x: number; y: number };
    distance: number;
    _nodeRef?: any; // 保留原始Node引用供内部使用
}

/**
 * 事件数据接口定义
 */
export interface PlayerAttackEventData extends EventData {
    attackerId: string;
    attackType: string;
    damage: number;
    position: { x: number; y: number };
    target?: TargetData;
}

export interface EnemyKilledEventData extends EventData {
    enemyId: string;
    killerId: string;
    position: { x: number; y: number };
    experience: number;
}

export interface SkillActivatedEventData extends EventData {
    skillId: string;
    skillLevel: number;
    userId: string;
    position?: { x: number; y: number };
}

/**
 * 全局事件管理器单例
 */
export class EventManager {
    private static instance: EventManager;
    private eventListeners: Map<string, EventCallback[]> = new Map();
    private eventHistory: Array<{ event: string; data: any; timestamp: number }> = [];
    private maxHistorySize: number = 100;

    private constructor() {}

    /**
     * 获取单例实例
     */
    static getInstance(): EventManager {
        if (!EventManager.instance) {
            EventManager.instance = new EventManager();
        }
        return EventManager.instance;
    }

    /**
     * 订阅事件
     */
    static on(event: string, callback: EventCallback): void {
        const instance = EventManager.getInstance();
        
        if (!instance.eventListeners.has(event)) {
            instance.eventListeners.set(event, []);
        }
        
        instance.eventListeners.get(event)!.push(callback);
        console.log(`📡 订阅事件: ${event} (当前监听者数量: ${instance.eventListeners.get(event)!.length})`);
    }

    /**
     * 取消订阅事件
     */
    static off(event: string, callback: EventCallback): void {
        const instance = EventManager.getInstance();
        const listeners = instance.eventListeners.get(event);
        
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
                console.log(`📡 取消订阅事件: ${event} (剩余监听者数量: ${listeners.length})`);
                
                // 如果没有监听者了，删除该事件
                if (listeners.length === 0) {
                    instance.eventListeners.delete(event);
                }
            }
        }
    }

    /**
     * 安全的JSON序列化，处理循环引用
     */
    private static safeStringify(obj: any): string {
        const seen = new WeakSet();
        return JSON.stringify(obj, (key, val) => {
            if (val != null && typeof val === "object") {
                if (seen.has(val)) {
                    return `[Circular *${val.constructor?.name || 'Object'}]`;
                }
                seen.add(val);
                
                // 特殊处理Cocos Creator的Node对象
                if (val.constructor?.name === 'Node') {
                    return {
                        name: val.name,
                        uuid: val.uuid,
                        position: val.position ? { x: val.position.x, y: val.position.y } : null,
                        _nodeType: 'Node'
                    };
                }
            }
            return val;
        });
    }

    /**
     * 发布事件
     */
    static emit(event: string, data?: any): void {
        const instance = EventManager.getInstance();
        const listeners = instance.eventListeners.get(event);
        
        // 记录事件历史
        instance.addToHistory(event, data);
        
        if (listeners && listeners.length > 0) {
            console.log(`📢 发布事件: ${event}`, data ? `数据: ${EventManager.safeStringify(data)}` : '');
            
            // 执行所有监听器
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ 事件监听器执行错误 [${event}]:`, error);
                }
            });
        } else {
            console.log(`⚠️ 没有监听者的事件: ${event}`);
        }
    }

    /**
     * 一次性事件监听
     */
    static once(event: string, callback: EventCallback): void {
        const instance = EventManager.getInstance();
        
        const onceCallback = (data?: any) => {
            callback(data);
            EventManager.off(event, onceCallback);
        };
        
        EventManager.on(event, onceCallback);
    }

    /**
     * 安全地克隆数据，避免在历史记录中保存循环引用
     */
    private static safeCloneForHistory(data: any): any {
        if (!data) return data;
        
        try {
            // 尝试通过JSON方式进行深拷贝，同时处理循环引用
            return JSON.parse(EventManager.safeStringify(data));
        } catch (error) {
            // 如果失败，返回一个简化版本
            console.warn('⚠️ 无法安全克隆事件数据，使用简化版本', error);
            return { _simplified: true, _type: typeof data };
        }
    }

    /**
     * 添加到事件历史
     */
    private addToHistory(event: string, data: any): void {
        this.eventHistory.push({
            event,
            data: EventManager.safeCloneForHistory(data),
            timestamp: Date.now()
        });

        // 限制历史记录大小
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }

    /**
     * 获取事件历史
     */
    static getEventHistory(): Array<{ event: string; data: any; timestamp: number }> {
        return EventManager.getInstance().eventHistory.slice();
    }

    /**
     * 清空事件历史
     */
    static clearEventHistory(): void {
        EventManager.getInstance().eventHistory = [];
        console.log('🗑️ 事件历史已清空');
    }

    /**
     * 获取所有活跃的事件监听器
     */
    static getActiveListeners(): Map<string, number> {
        const instance = EventManager.getInstance();
        const result = new Map<string, number>();
        
        instance.eventListeners.forEach((listeners, event) => {
            result.set(event, listeners.length);
        });
        
        return result;
    }

    /**
     * 移除所有事件监听器
     */
    static removeAllListeners(): void {
        const instance = EventManager.getInstance();
        instance.eventListeners.clear();
        console.log('🗑️ 所有事件监听器已移除');
    }

    /**
     * 打印当前事件系统状态
     */
    static printStatus(): void {
        const instance = EventManager.getInstance();
        console.log('📊 事件管理器状态:');
        console.log(`  - 活跃事件类型数量: ${instance.eventListeners.size}`);
        console.log(`  - 历史事件数量: ${instance.eventHistory.length}`);
        
        instance.eventListeners.forEach((listeners, event) => {
            console.log(`  - ${event}: ${listeners.length} 个监听者`);
        });
    }

    /**
     * 延迟发布事件
     */
    static emitDelayed(event: string, data?: any, delayMs: number = 0): void {
        setTimeout(() => {
            EventManager.emit(event, data);
        }, delayMs);
    }

    /**
     * 条件发布事件
     */
    static emitIf(condition: boolean, event: string, data?: any): void {
        if (condition) {
            EventManager.emit(event, data);
        }
    }
}

/**
 * 便捷的事件发布函数
 */
export const emitPlayerAttack = (data: PlayerAttackEventData) => {
    EventManager.emit(GameEvents.PLAYER_ATTACK, data);
};

export const emitEnemyKilled = (data: EnemyKilledEventData) => {
    EventManager.emit(GameEvents.ENEMY_KILLED, data);
};

export const emitSkillActivated = (data: SkillActivatedEventData) => {
    EventManager.emit(GameEvents.SKILL_ACTIVATED, data);
};

/**
 * 快速订阅常用事件的装饰器
 */
export function OnPlayerAttack(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    // 在组件生命周期中自动订阅
    EventManager.on(GameEvents.PLAYER_ATTACK, originalMethod.bind(target));
}

export function OnEnemyKilled(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    EventManager.on(GameEvents.ENEMY_KILLED, originalMethod.bind(target));
}

export function OnSkillActivated(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    EventManager.on(GameEvents.SKILL_ACTIVATED, originalMethod.bind(target));
} 