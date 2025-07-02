# Cocos Creator 游戏项目

这是一个基于Cocos Creator 3.8.6开发的2D游戏项目，包含敌人生成系统、技能系统和多样化的攻击机制。

## 🎮 游戏特性

- **智能敌人系统**: 自动生成和追踪玩家的敌人AI
- **多样化攻击系统**: 包括子弹、激光、火球、冰冻、飞盘、圆环等攻击方式
- **技能管理系统**: 支持技能升级和被动技能
- **事件驱动架构**: 解耦的模块化设计
- **完整的物理系统**: 基于Cocos Creator物理引擎

## 🚀 快速开始

### 环境要求
- Cocos Creator 3.8.6+
- Node.js (用于包管理)

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd cocos_module
   ```

2. **使用Cocos Creator打开项目**
   - 启动Cocos Creator
   - 选择"打开项目"
   - 选择此文件夹

3. **必需的预制体配置**
   
   在Assets/Prefabs/目录下确保有以下预制体：
   - `Enemy.prefab` - 敌人预制体
   - `Bullet.prefab` - 子弹预制体  
   - `Laser.prefab` - 激光预制体
   - `Fireball.prefab` - 火球预制体
   - `Freeze.prefab` - 冰冻效果预制体
   - `FlyingDisc.prefab` - 飞盘预制体
   - `Ring.prefab` - 圆环预制体

4. **场景配置**
   
   确保主场景包含以下节点：
   - **GameManager**: 挂载GameManager脚本
     - 设置`enemyPrefab`字段为Enemy预制体
     - 设置`playerNode`字段为Player节点
   - **Player**: 玩家节点
     - 挂载PlayerController脚本
     - 添加RigidBody2D组件
     - 添加Collider2D组件

5. **物理组件配置**
   
   为以下预制体添加必需组件：
   - **所有攻击预制体**: RigidBody2D + Collider2D
   - **敌人预制体**: RigidBody2D + Collider2D + Enemy脚本
   - **玩家预制体**: RigidBody2D + Collider2D + PlayerController脚本

## 🎯 游戏操作

### 移动控制
- `WASD` 或 `方向键`: 移动玩家
- `空格键`: 发射子弹
- `Q键`: 激光攻击
- `E键`: 火球攻击
- `R键`: 冰冻攻击
- `T键`: 飞盘攻击

### 自动系统
- 自动攻击: 每秒自动发射攻击
- 圆环攻击: 每3秒自动发射圆环攻击
- 敌人生成: 每2秒从屏幕边缘生成敌人

## 🏗️ 项目架构

```
assets/ts/
├── GameManager.ts          # 游戏主管理器
├── PlayerController.ts     # 玩家控制器
├── Enemy.ts               # 敌人AI逻辑
├── EventManager.ts        # 全局事件系统
├── SkillManager.ts        # 技能管理系统
├── attack/               # 攻击系统模块
│   ├── AttackSystem.ts   # 统一攻击系统
│   ├── BaseAttack.ts     # 攻击基类
│   ├── Bullet.ts         # 子弹攻击
│   ├── Laser.ts          # 激光攻击
│   ├── Fireball.ts       # 火球攻击
│   ├── Freeze.ts         # 冰冻攻击
│   ├── FlyingDisc.ts     # 飞盘攻击
│   ├── Ring.ts           # 圆环攻击
│   └── skill-config.ts   # 技能配置
└── skills/               # 技能模块
    └── SkillMultiShot.ts # 多重射击技能
```

## 🔧 常见问题解决

### 1. 组件未找到错误
确保所有预制体都正确配置了RigidBody2D和Collider2D组件。

### 2. 预制体引用缺失
在编辑器中为GameManager和SkillManager设置所有必需的预制体引用。

### 3. 物理碰撞不工作
检查碰撞层设置和物理组件配置。

### 4. 敌人不追踪玩家
确保GameManager的playerNode字段正确设置。

## 🎨 自定义开发

### 添加新攻击类型
1. 在`assets/ts/attack/`目录创建新的攻击脚本
2. 继承`BaseAttack`类
3. 在`AttackSystem.ts`中添加新的攻击类型
4. 创建对应的预制体

### 添加新技能
1. 在`assets/ts/skills/`目录创建技能脚本
2. 在`skill-config.ts`中添加技能配置
3. 在SkillManager中添加技能逻辑

## 📝 开发注意事项

- 所有攻击都使用统一的版本号系统防止重复伤害
- 事件系统用于模块间通信，避免直接依赖
- 大量调试日志帮助开发和调试
- 严格的TypeScript类型检查确保代码质量

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目！

## �� 许可证

MIT License 