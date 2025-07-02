import { _decorator, Component, Prefab, instantiate, Vec2, RigidBody2D, director } from 'cc';
import { EventManager, GameEvents, PlayerAttackEventData } from '../EventManager';
import { SKILL_CONFIGS, SkillInstance, SkillUtils } from '../attack/skill-config';

const { ccclass, property } = _decorator;

/**
 * 多重射击技能
 * 被动技能示例 - 当玩家攻击时，自动发射额外的子弹
 */
@ccclass('SkillMultiShot')
export class SkillMultiShot extends Component {

    @property({ type: Prefab, tooltip: '子弹预制体' })
    public bulletPrefab: Prefab = null;

    private skillInstance: SkillInstance = null;

    onLoad() {
        console.log('🎯 多重射击技能初始化');
        
        // 获取技能配置
        const config = SKILL_CONFIGS['multiShot'];
        if (!config) {
            console.error('❌ 找不到多重射击技能配置');
            return;
        }

        // 创建技能实例
        this.skillInstance = {
            config,
            level: 1,
            lastUsedTime: 0,
            isActive: true
        };

        // 订阅玩家攻击事件
        EventManager.on(GameEvents.PLAYER_ATTACK, this.onPlayerAttack.bind(this));
        
        console.log('✅ 多重射击技能初始化完成');
    }

    /**
     * 玩家攻击时触发
     */
    private onPlayerAttack(data: PlayerAttackEventData) {
        if (!this.skillInstance || !this.skillInstance.isActive) {
            return;
        }

        // 只对普通子弹攻击生效
        if (data.attackType !== 'bullet') {
            return;
        }

        console.log('🔫 多重射击技能触发！');
        
        // 计算额外子弹数量
        const extraBullets = SkillUtils.calculateSkillProperty(
            this.skillInstance.config, 
            this.skillInstance.level, 
            'extraBullets'
        );

        // 计算扩散角度
        const spreadAngle = SkillUtils.calculateSkillProperty(
            this.skillInstance.config,
            this.skillInstance.level,
            'spreadAngle'
        );

        console.log(`  - 额外子弹数量: ${extraBullets}`);
        console.log(`  - 扩散角度: ${spreadAngle}°`);

        // 发射额外子弹
        this.fireExtraBullets(data, extraBullets, spreadAngle);
    }

    /**
     * 发射额外子弹
     */
    private fireExtraBullets(originalAttack: PlayerAttackEventData, count: number, spreadAngle: number) {
        if (!this.bulletPrefab) {
            console.error('❌ 多重射击：未设置子弹预制体');
            return;
        }

        const centerAngle = 0; // 原始攻击方向为0度
        const angleStep = spreadAngle / (count + 1); // 平均分布角度

        for (let i = 0; i < count; i++) {
            // 计算子弹发射角度
            const offset = (i + 1) * angleStep - spreadAngle / 2;
            const bulletAngle = centerAngle + offset;
            
            // 创建子弹
            const bullet = instantiate(this.bulletPrefab);
            
            // 安全的父节点设置
            const parentNode = this.node.parent || this.node.scene || director.getScene();
            if (!parentNode) {
                console.error('❌ 多重射击：无法找到合适的父节点');
                bullet.destroy();
                continue;
            }
            bullet.setParent(parentNode);
            
            // 设置子弹位置
            bullet.setWorldPosition(originalAttack.position.x, originalAttack.position.y, 0);
            
            // 计算子弹方向
            const radians = bulletAngle * Math.PI / 180;
            const direction = new Vec2(Math.sin(radians), Math.cos(radians));
            
            // 设置子弹速度（如果有刚体组件）
            const rigidbody = bullet.getComponent(RigidBody2D);
            if (rigidbody) {
                const speed = 800; // 子弹速度
                rigidbody.linearVelocity = direction.multiplyScalar(speed);
            }
            
            console.log(`  - 发射额外子弹 ${i + 1}/${count}，角度: ${bulletAngle.toFixed(1)}°`);
        }

        console.log(`🎉 多重射击完成，总共发射 ${count} 发额外子弹`);
    }

    /**
     * 设置技能等级
     */
    public setSkillLevel(level: number) {
        if (this.skillInstance) {
            this.skillInstance.level = Math.min(level, this.skillInstance.config.maxLevel);
            console.log(`⬆️ 多重射击等级设置为: ${this.skillInstance.level}`);
        }
    }

    /**
     * 激活/禁用技能
     */
    public setActive(active: boolean) {
        if (this.skillInstance) {
            this.skillInstance.isActive = active;
            console.log(`${active ? '✅' : '❌'} 多重射击技能${active ? '激活' : '禁用'}`);
        }
    }

    onDestroy() {
        // 取消事件订阅
        EventManager.off(GameEvents.PLAYER_ATTACK, this.onPlayerAttack.bind(this));
        console.log('🗑️ 多重射击技能销毁');
    }
} 