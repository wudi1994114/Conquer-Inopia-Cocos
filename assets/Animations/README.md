# 动画文件夹

这个文件夹包含游戏中使用的所有动画剪辑文件（.anim格式）。

## 动画列表

### 特效动画
- **explosion_small.anim**: 小型爆炸动画
- **explosion_large.anim**: 大型爆炸动画  
- **hit_effect.anim**: 击中闪光效果

### 角色动画
- **player_idle.anim**: 玩家闲置动画
- **player_move.anim**: 玩家移动动画
- **enemy_die.anim**: 敌人死亡动画

### UI动画
- **button_click.anim**: 按钮点击动画
- **fade_in.anim**: 界面淡入动画

## 创建步骤

1. 在场景中选择节点
2. 添加Animation组件
3. 创建动画剪辑文件
4. 设置关键帧和属性动画
5. 保存到此文件夹

## 使用示例

```typescript
const animation = this.getComponent(Animation);
animation.play('explosion_small');
``` 