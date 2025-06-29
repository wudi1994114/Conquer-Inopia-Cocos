# 场景文件夹

这个文件夹包含所有的游戏场景文件（.fire格式）。

## 场景列表

### MainMenu.fire
- **用途**: 游戏主菜单场景
- **包含组件**: 
  - 主菜单UI界面
  - 背景图片
  - 按钮（开始游戏、设置、退出）
  - MainMenuUI脚本
- **预制体**: 无

### Game.fire  
- **用途**: 主游戏场景
- **包含组件**:
  - 玩家节点（PlayerController脚本）
  - 游戏UI界面
  - 敌人生成点
  - 背景和边界
  - 物理世界设置
- **预制体**: 
  - 敌人预制体（Enemy_01.prefab）
  - 子弹预制体（Bullet.prefab）
  - 爆炸特效（ExplosionEffect.prefab）

## 场景配置说明

1. **物理设置**: 启用2D物理系统，重力设置为(0, -320)
2. **渲染设置**: 设计分辨率 960x640，适配高度
3. **碰撞层级**: 
   - Layer 0: Default（默认）
   - Layer 1: Player（玩家）
   - Layer 2: Enemy（敌人）  
   - Layer 3: Bullet（子弹）
   - Layer 4: Boundary（边界）

## 创建场景步骤

1. 在Cocos Creator中右键点击此文件夹
2. 选择"新建 -> Scene"
3. 根据上述说明配置场景内容
4. 保存为对应的.fire文件 