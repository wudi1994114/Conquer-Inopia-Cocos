# 预制体文件夹

这个文件夹包含所有的预制体文件（.prefab格式）。

## 预制体列表

### Enemy_01.prefab
- **用途**: 基础敌人预制体
- **必需组件**:
  - Sprite: 敌人的图片显示
  - RigidBody2D: 2D刚体，用于物理移动
  - BoxCollider2D: 碰撞检测器
  - Enemy: 敌人行为脚本
- **属性配置**:
  - moveSpeed: 150（移动速度）
  - health: 3（生命值）
  - attackDamage: 1（攻击伤害）
- **碰撞层级**: Enemy（Layer 2）

### Bullet.prefab
- **用途**: 子弹预制体
- **必需组件**:
  - Sprite: 子弹的图片显示
  - RigidBody2D: 2D刚体，用于物理移动
  - BoxCollider2D: 碰撞检测器（设置为触发器）
  - Bullet: 子弹行为脚本
- **属性配置**:
  - speed: 500（飞行速度）
  - damage: 1（伤害值）
  - lifeTime: 5.0（存活时间）
- **碰撞层级**: Bullet（Layer 3）

### ExplosionEffect.prefab
- **用途**: 爆炸特效预制体
- **必需组件**:
  - Animation: 爆炸动画组件
  - Sprite: 特效图片显示
- **使用方式**: 
  - 在敌人死亡或子弹击中时实例化
  - 动画播放完成后自动销毁

## 创建预制体步骤

1. 在场景中创建节点并配置所需组件
2. 拖拽节点到此文件夹中生成预制体
3. 配置预制体的属性和脚本参数
4. 在代码中使用 `instantiate()` 函数实例化

## 预制体使用示例

```typescript
// 在GameManager中生成敌人
const enemyNode = instantiate(this.enemyPrefabs[0]);
enemyNode.setPosition(spawnPosition);
this.node.addChild(enemyNode);

// 在PlayerController中发射子弹
const bulletNode = instantiate(this.bulletPrefab);
bulletNode.setPosition(this.node.position);
this.node.parent.addChild(bulletNode);
```

## 注意事项

- 确保预制体的碰撞体设置正确
- 检查物理属性配置（质量、摩擦力等）
- 预制体中的脚本组件需要正确赋值
- 注意预制体的层级关系和坐标系 