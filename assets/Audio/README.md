# 音频资源文件夹

这个文件夹包含游戏中使用的所有音频资源。

## 目录结构

### BGM/ (背景音乐)
存放循环播放的背景音乐：

- **menu_bgm.mp3**: 主菜单背景音乐
  - 建议时长: 2-3分钟循环
  - 风格: 轻松、吸引人的电子音乐
  
- **game_bgm.mp3**: 游戏进行中的背景音乐  
  - 建议时长: 3-5分钟循环
  - 风格: 紧张刺激的战斗音乐

**技术规格**:
- 格式: MP3 或 OGG
- 比特率: 128kbps - 192kbps
- 采样率: 44.1kHz
- 声道: 立体声

### SFX/ (音效)
存放各种游戏音效：

#### 玩家相关音效
- **player_shoot.wav**: 玩家射击音效
- **player_hit.wav**: 玩家受伤音效
- **player_die.wav**: 玩家死亡音效

#### 敌人相关音效  
- **enemy_hit.wav**: 敌人受伤音效
- **enemy_die.wav**: 敌人死亡音效
- **enemy_spawn.wav**: 敌人生成音效

#### 界面音效
- **button_click.wav**: 按钮点击音效
- **menu_hover.wav**: 菜单悬停音效
- **game_start.wav**: 游戏开始音效
- **game_over.wav**: 游戏结束音效

#### 特效音效
- **explosion.wav**: 爆炸音效
- **powerup.wav**: 道具获得音效
- **level_up.wav**: 升级音效

**技术规格**:
- 格式: WAV 或 OGG
- 比特率: 48kHz/16bit 或更高
- 时长: 0.1s - 3s
- 声道: 单声道或立体声

## 音频导入设置

在Cocos Creator中导入音频的建议设置：

### 背景音乐
- **类型**: AudioClip
- **加载模式**: Normal（普通加载）
- **压缩**: 根据平台选择
- **循环**: 启用循环播放

### 音效
- **类型**: AudioClip  
- **加载模式**: Normal 或 Streaming（流式加载）
- **压缩**: 高压缩比
- **循环**: 关闭循环

## AudioManager 中的使用

音频资源在AudioManager脚本中的配置：

```typescript
// 背景音乐
@property({ type: AudioClip })
public bgmMenu: AudioClip = null!;   // 拖入 menu_bgm.mp3

@property({ type: AudioClip })  
public bgmGame: AudioClip = null!;   // 拖入 game_bgm.mp3

// 音效
@property({ type: AudioClip })
public sfxShoot: AudioClip = null!;  // 拖入 player_shoot.wav

@property({ type: AudioClip })
public sfxEnemyHit: AudioClip = null!; // 拖入 enemy_hit.wav
```

## 音频优化建议

1. **文件大小控制**:
   - BGM: 5MB以内
   - SFX: 500KB以内

2. **格式选择**:
   - Web平台: MP3, OGG
   - 移动平台: AAC, OGG

3. **音量平衡**:
   - BGM: 相对较低音量
   - SFX: 清晰可辨，不覆盖BGM

4. **加载策略**:
   - 常用音效: 预加载
   - BGM: 场景加载时加载
   - 大文件: 考虑分段或压缩

## 音频素材来源

推荐的免费音频资源网站：
- Freesound.org
- Zapsplat.com  
- BBC Sound Effects
- Adobe Audition 内置音效库

## 创建占位符音频

在实际开发中，可以使用简单的占位符：
- 使用 Audacity 等工具生成简单音效
- 录制临时音效进行测试
- 使用在线音效生成器创建基础音效 