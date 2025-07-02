import { _decorator, Component } from 'cc';

const { ccclass } = _decorator;

/**
 * 统一攻击系统管理器
 * 管理所有攻击的版本号和类型
 */
@ccclass('AttackSystem')
export class AttackSystem {
    
    // 全局统一版本号计数器
    private static _globalAttackVersion: number = 0;
    
    /**
     * 攻击类型枚举
     */
    public static readonly AttackType = {
        BULLET: 'bullet',
        RING: 'ring',
        MELEE: 'melee',
        SPELL: 'spell',
        LASER: 'laser',
        FIREBALL: 'fireball',
        FREEZE: 'freeze',
        FLYING_DISC: 'flyingDisc'
    } as const;
    
    /**
     * 获取下一个攻击版本号
     * @returns 新的攻击版本号
     */
    public static getNextAttackVersion(): number {
        return ++AttackSystem._globalAttackVersion;
    }
    
    /**
     * 获取当前攻击版本号（不递增）
     * @returns 当前攻击版本号
     */
    public static getCurrentAttackVersion(): number {
        return AttackSystem._globalAttackVersion;
    }
    
    /**
     * 重置攻击版本号（一般用于游戏重启）
     */
    public static resetAttackVersion(): void {
        AttackSystem._globalAttackVersion = 0;
        console.log("🔄 攻击版本号系统已重置");
    }
    
    /**
     * 创建攻击信息
     * @param type 攻击类型
     * @param damage 伤害值
     * @returns 攻击信息对象
     */
    public static createAttackInfo(
        type: AttackTypeValue, 
        damage: number
    ): AttackInfo {
        return {
            version: AttackSystem.getNextAttackVersion(),
            type: type,
            damage: damage,
            timestamp: Date.now()
        };
    }
    
    /**
     * 验证攻击是否有效（版本号检查）
     * @param attackVersion 攻击版本号
     * @param lastVersion 目标上次受到的攻击版本号
     * @returns 是否可以造成伤害
     */
    public static validateAttack(attackVersion: number, lastVersion: number): boolean {
        return attackVersion > lastVersion;
    }
}

/**
 * 攻击类型定义
 */
export type AttackTypeValue = typeof AttackSystem.AttackType[keyof typeof AttackSystem.AttackType];

/**
 * 攻击信息接口
 */
export interface AttackInfo {
    version: number;
    type: AttackTypeValue;
    damage: number;
    timestamp: number;
} 