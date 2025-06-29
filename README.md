# 征服荒芜之地 - Cocos Creator

这是一个使用 Cocos Creator 开发的2D射击游戏项目。

## 项目结构

```
assets/
│
├── Scenes/                    # 游戏场景文件
│   ├── Game.fire             # 主游戏场景
│   └── MainMenu.fire         # 主菜单场景
│
├── Scripts/                   # TypeScript 脚本
│   ├── Core/                 # 核心玩法脚本
│   │   ├── PlayerController.ts    # 玩家控制器
│   │   ├── Enemy.ts              # 敌人脚本
│   │   └── Bullet.ts             # 子弹脚本
│   ├── Managers/             # 管理器脚本
│   │   ├── GameManager.ts        # 游戏管理器
│   │   ├── UIManager.ts          # UI管理器
│   │   └── AudioManager.ts       # 音频管理器
│   └── UI/                   # UI界面逻辑
│       └── MainMenuUI.ts         # 主菜单UI
│
├── Prefabs/                   # 预制体文件
│   ├── Enemy_01.prefab       # 敌人预制体
│   ├── Bullet.prefab         # 子弹预制体
│   └── ExplosionEffect.prefab # 爆炸特效预制体
│
├── Sprites/                   # 图片资源
│   ├── Background/           # 背景图片
│   └── Roles/               # 角色图片
│
├── Audio/                     # 音频资源
│   ├── BGM/                 # 背景音乐
│   └── SFX/                 # 音效
│
└── Animations/                # 动画文件
```

## 功能特性

### 核心玩法
- **玩家控制**: WASD/方向键移动，空格键射击
- **敌人AI**: 敌人会自动追踪玩家
- **碰撞检测**: 子弹与敌人、玩家与敌人的碰撞
- **生命系统**: 玩家和敌人都有血量系统

### 管理系统
- **游戏管理器**: 单例模式，管理游戏状态、分数、敌人生成
- **UI管理器**: 统一管理所有UI界面的显示和隐藏
- **音频管理器**: 管理背景音乐和音效的播放

### UI系统
- **主菜单**: 开始游戏、设置、退出功能
- **游戏界面**: 显示分数、血量等信息
- **暂停菜单**: 游戏暂停时的操作选项
- **设置界面**: 音频开关等设置

## 脚本说明

### Core/PlayerController.ts
- 处理玩家输入控制
- 管理玩家移动和射击
- 使用RigidBody2D进行物理移动

### Core/Enemy.ts
- 敌人AI逻辑
- 自动追踪玩家
- 碰撞检测和伤害处理

### Core/Bullet.ts
- 子弹飞行逻辑
- 碰撞检测
- 自动销毁机制

### Managers/GameManager.ts
- 游戏状态管理（菜单、游戏中、暂停、结束）
- 敌人生成系统
- 分数和生命值管理
- 单例模式实现

### Managers/UIManager.ts
- UI界面切换管理
- 实时更新游戏信息显示
- 按钮事件处理

### Managers/AudioManager.ts
- 背景音乐播放控制
- 音效管理
- 音量和静音控制

## 开发环境

- **Cocos Creator**: 3.8.0+
- **Node.js**: 14.0.0+
- **TypeScript**: 4.9.0+

## 如何使用

1. 用 Cocos Creator 打开项目
2. 确保所有脚本都正确编译
3. 创建对应的场景文件和预制体
4. 在场景中添加相应的组件和脚本
5. 配置预制体的属性和碰撞体
6. 运行项目进行测试

## 注意事项

- 所有管理器都使用单例模式，确保全局唯一性
- 物理系统需要在项目设置中启用
- 碰撞检测需要为游戏对象添加 Collider2D 组件
- 音频文件需要导入到对应的文件夹中

## 扩展功能

可以基于现有框架添加以下功能：
- 更多敌人类型
- 道具系统
- 关卡系统
- 存档系统
- 成就系统

## 版本历史

- v1.0.0: 基础项目结构和核心功能实现 