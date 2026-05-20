# Violet 客户端

Violet 是一个基于 uni-app 的移动端创作与即时通信应用。项目把 AIGC 素材生成、内容流浏览、作品发布、社交关系、智能体管理和原生 TCP IM 整合在同一个客户端里，重点不是简单的列表页，而是偏完整产品形态的移动端体验：响应式卡片瀑布流、沉浸式视频详情、富评论交互、精细化聊天窗口、自定义底栏、头像裁剪、本地缓存、实时消息和离线补偿同步。

<p align="center">
  <img src="static/user_avatar.png" width="120" alt="Violet Logo" />
</p>

## APP 功能

Violet 的功能围绕“看内容、做素材、发作品、建关系、聊消息、用智能体”展开。用户进入 App 后可以浏览推荐创作流，通过工坊生成图片或视频素材，再把素材发布成作品；作品产生点赞、评论、转发、关注等互动后，会进入通知与关系链；用户之间可以发起单聊、群聊，也可以把自定义智能体拉入群聊，形成内容创作和实时沟通一体化的移动端闭环。

### 内容发现与作品消费

| 功能 | 说明 |
| --- | --- |
| 首页推荐流 | 双列瀑布流展示图文和视频作品，支持下拉刷新、触底加载、点赞、视频角标和沉浸式详情跳转。 |
| 朋友动态 | 聚合关注或好友关系内的作品，帮助用户优先查看熟人内容。 |
| 搜索 | 支持创作和用户两个维度搜索，创作结果可直接点赞和进入详情，用户结果可关注或取消关注。 |
| 图文详情 | 展示作者信息、正文、图片预览、长按保存、点赞、评论、回复、评论点赞、评论删除和多渠道分享。 |
| 视频详情 | 使用 nvue 实现全屏播放，支持自动播放、轻触暂停、长按保存、右侧操作栏、底部信息区和半屏评论面板。 |

### AIGC 工坊与作品发布

| 功能 | 说明 |
| --- | --- |
| 图片/视频生成 | 工坊页支持输入提示词、上传参考图、选择生成类型，并展示生成中、成功、失败等状态。 |
| 素材管理 | 生成素材以卡片形式管理，支持预览、下载、分享、复制提示词、失败重试和长按删除。 |
| 发布作品 | 从素材详情进入发布页，支持封面裁剪、标题、正文、分类标签和视频预览收起。 |
| 编辑作品 | 已发布作品可修改标题、内容和分类，保留媒体预览与原有作品数据。 |

### 社交关系与个人主页

| 功能 | 说明 |
| --- | --- |
| 我的主页 | 展示渐变资料头、吸顶用户名栏、作品/点赞双 Tab、互关/关注/粉丝统计、作品编辑删除和退出登录。 |
| 他人主页 | 展示对方作品与点赞内容，支持关注、回关、互关状态展示和私信入口。 |
| 关系列表 | 关注、粉丝、互关列表支持分页、下拉刷新、关注/取消关注；互关列表仅自己可见。 |
| 资料编辑 | 支持头像裁剪上传、用户名修改和密码修改，保存后同步刷新本地资料缓存。 |

### 即时通信与通知

| 功能 | 说明 |
| --- | --- |
| 会话列表 | 展示单聊、群聊、智能体会话、未读数、最后消息和通知入口，支持实时事件刷新与长按删除会话。 |
| 聊天窗口 | 单聊、群聊、智能体私聊共用聊天页，支持本地历史、实时新消息、分享卡片、复制、撤回、未读浮层和批量已读。 |
| 群聊管理 | 支持创建群聊、邀请成员、移除成员、修改群头像、群名、群资料、我的群昵称和退出群聊。 |
| 通知中心 | 支持系统、关注、互动通知，进入列表后标记已读，聚合点赞/互动通知可查看明细用户。 |
| 本地通知与跳转 | APP-PLUS 下可以创建本地通知，点击后跳转会话、通知或工坊；scheme 深链可直达创作详情。 |

### 智能体能力

| 功能 | 说明 |
| --- | --- |
| 智能体管理 | 用户可以创建、编辑、删除自己的智能体，配置头像、名称、简介和人格设定。 |
| 智能体详情 | 展示智能体资料、创建时间、人格设定和创建人，并支持直接发起私聊。 |
| 群智能体成员 | 群聊可添加智能体成员，群设置中可查看、添加或移出群 AI。 |
| 混合会话 | 创建群聊时可同时选择普通好友和智能体，让用户与 AI 成员处在同一个会话上下文中。 |

### 数据体验与离线可靠性

| 功能 | 说明 |
| --- | --- |
| 本地消息库 | 会话、消息、用户、智能体、群成员按登录用户分表存入 SQLite，切换账号时数据隔离。 |
| 实时接收 | TCP 收包后串行写入本地库，再通过全局事件刷新会话列表和聊天窗口。 |
| 离线补偿 | 启动、重连和会话进入时会根据本地 index 检测缺口，通过 HTTP 拉取缺失消息补齐。 |
| 资料缓存刷新 | 用户、智能体、会话和头像会按需补齐与后台刷新，页面不会因为资料接口或头像下载阻塞首屏显示。 |
| 埋点上报 | 作品点击埋点先进入本地队列，再按数量、时间和 App 生命周期批量上报，失败后回写等待下次补偿。 |

## 核心亮点

| 方向 | 说明 |
| --- | --- |
| 好看丰富的页面 | 全局使用 HarmonyOS Sans 字体，自定义导航栏和底部 TabBar；首页、朋友页、个人页、工坊均为响应式双列卡片；个人页有渐变头图、吸顶资料栏和自定义下拉刷新；视频详情使用 nvue 做全屏沉浸播放和右侧操作栏。 |
| 原生 TCP 通信 | Android 通过 `plus.android` 直接调用 `java.net.Socket`；iOS 通过 `uni_modules/violet-tcp` 封装 Swift `Network.NWConnection`，统一 5 字节包头协议接入后端实时包。 |
| 断线重连与心跳 | TCP 连接后发送 Connect 包，5 秒心跳，11 秒超时判定，500ms 后自动重连；收包进入串行队列，避免并发写 DB 和 UI 状态错乱。 |
| 消息存储、实时接收和补偿 | 会话、消息、用户、智能体、成员按登录用户分表存入 SQLite；实时消息按 `user_con_index`、`con_index` 检测缺口，缺失区间自动 HTTP 拉取补齐。 |
| 用户、智能体、会话信息缓存刷新 | 本地缓存用户和智能体资料，缺失时立即补齐，过期时按 TTL 后台刷新；头像统一下载到 `_doc/avatar/`，本地头像作为 fallback 与自修复缓存。 |
| 埋点与补偿上报 | 作品点击埋点使用本地队列去重，20 条批量上报，5 分钟定时 flush，App 隐藏时强制 flush，失败会回写队列避免丢失。 |
| 通知与深链 | 支持系统、关注、互动通知聚合；APP-PLUS 下可创建本地通知，点击跳转会话、通知或工坊；`violet` scheme 可直达图文或视频创作详情。 |

## 页面地图

### 主 Tab 页面

| 页面 | 路径 | 作用 |
| --- | --- | --- |
| 启动页 | `pages/user/start` | 展示品牌启动视觉，读取 token 和 user_id，初始化 SQLite、用户资料、推送监听、TCP 连接，成功后进入首页。 |
| 首页 | `pages/creation/home` | 推荐创作流，固定搜索栏、双列卡片、视频角标、点赞、下拉刷新和触底加载。 |
| 朋友 | `pages/creation/friend` | 好友/关注关系内的创作流，延续首页卡片样式，适合看熟人动态。 |
| 工坊 | `pages/workspace/workspace` | AIGC 素材生成与素材管理页，支持图片/视频生成、上传参考图、生成状态实时更新、失败重试、长按删除。 |
| 消息 | `pages/im/home` | 会话列表、通知入口、未读数、长按删除会话、创建群聊和智能体管理入口；监听实时 IM 事件刷新列表。 |
| 我的 | `pages/user/my_profile` | 当前用户主页，包含渐变资料头、吸顶用户名栏、互关/关注/粉丝、作品/点赞双 Tab、作品编辑删除和退出登录。 |

### 创作与内容页面

| 页面 | 路径 | 作用 |
| --- | --- | --- |
| 搜索 | `pages/creation/search` | 搜索创作和用户，支持创作/用户 Tab、创作卡片点赞、用户关注/取消关注、下拉刷新与分页。 |
| 图文详情 | `pages/creation/creation_image` | 图文创作详情，作者关注、图片预览/长按保存、点赞、评论、回复、评论点赞/删除、分享至聊天/朋友/QQ/微信/朋友圈，并触发点击埋点。 |
| 视频详情 | `pages/creation/creation_video` | nvue 全屏视频详情，自动播放、轻触播放暂停、长按保存、右侧作者/点赞/评论/分享操作，底部信息和半屏评论面板。 |
| 素材详情 | `pages/workspace/material_detail` | 查看生成素材，图片预览、视频播放、下载、分享、复制提示词，并可跳转发布创作。 |
| 发布创作 | `pages/workspace/publish` | 从素材发布作品，支持封面裁剪、标题、内容、分类标签、视频滚动收起和提交发布。 |
| 编辑创作 | `pages/workspace/edit_creation` | 编辑已发布作品的标题、内容和分类，保留媒体预览和视频收起逻辑。 |

### IM 与通知页面

| 页面 | 路径 | 作用 |
| --- | --- | --- |
| 聊天窗口 | `pages/im/conversation` | 单聊、群聊、智能体私聊统一窗口；本地拉历史、缺口补偿、实时插入、分享卡片、消息复制/撤回、未读浮层、退出群禁发、离开时批量已读。 |
| 创建群聊 | `pages/im/create` | 创建群聊，支持从朋友和智能体两个 Tab 选择成员，一次性创建普通成员和智能体成员混合群。 |
| 群聊设置 | `pages/im/setting` | 群成员宫格、群头像裁剪上传、群名/资料/我的群昵称修改、群 AI 管理、邀请/移除成员、退出群聊。 |
| 邀请成员 | `pages/im/add_member` | 从好友列表邀请群成员，过滤已在群成员，支持多选和分页刷新。 |
| 移出成员 | `pages/im/remove_member` | 群主移出普通成员，展示本地成员表中的用户信息。 |
| 通知列表 | `pages/im/notice` | 系统/关注/互动通知列表，进入即标记已读，支持聚合通知入口、作品封面引用和用户跳转。 |
| 通知聚合 | `pages/im/notice_agg` | 展示某条聚合点赞/互动通知的明细用户列表。 |

### 智能体页面

| 页面 | 路径 | 作用 |
| --- | --- | --- |
| 智能体列表 | `pages/agent/agent_list` | 管理当前用户创建的智能体，支持分页、下拉刷新、长按编辑/删除和创建入口。 |
| 智能体详情 | `pages/agent/agent_detail` | 展示智能体头像、名称、创建时间、简介、人格设定、创建人，并支持发起私聊。 |
| 创建智能体 | `pages/agent/agent_create` | 创建智能体，包含头像裁剪上传、名称、简介、人格设定。 |
| 编辑智能体 | `pages/agent/edit_agent` | 编辑智能体资料并同步本地智能体缓存。 |
| 群智能体成员 | `pages/agent/agent_member` | 查看群里的智能体成员，长按可移出群聊。 |
| 添加智能体成员 | `pages/agent/add_agent_member` | 从自己创建的智能体中选择并添加到群聊，自动禁选已存在成员。 |

### 用户与关系页面

| 页面 | 路径 | 作用 |
| --- | --- | --- |
| 登录 | `pages/user/login` | 品牌化登录页，登录成功后建表、保存 token/user_id 并启动初始化链路。 |
| 注册 | `pages/user/register` | 品牌化注册页，注册后返回登录。 |
| 编辑资料 | `pages/user/edit_profile` | 修改头像、用户名和密码；头像走裁剪组件和上传接口，并刷新本地 user 表。 |
| 用户主页 | `pages/user/user_profile` | 访问其他用户主页，包含关注/回关/互关状态、私信入口、作品/点赞列表。 |
| 我的主页副本 | `pages/user/my_profile_copy` | 用于从聊天或关系链跳转到“自己”的个人页，保留返回栈，不影响主 Tab 的我的页面。 |
| 关系列表 | `pages/user/follow_list` | 关注、粉丝、互关列表，支持关注/取消关注、分页和下拉刷新；互关 Tab 仅自己可见。 |

## 核心链路

### 启动初始化

```text
pages/user/start
  -> utils/init.js
    -> 读取 token / user_id
    -> 打开 SQLite
    -> 初始化 Snowflake ID
    -> 拉取并缓存当前用户资料
    -> 安装通知监听
    -> 读取 user_con_index / user_cmd_index
    -> 启动 TCP Socket
```

登录成功后会为当前用户创建独立 SQLite 表，避免多账号数据互相污染。

### 原生 TCP 与断线重连

```text
utils/socket.js
  Android: plus.android -> java.net.Socket
  iOS: uni_modules/violet-tcp -> Swift NWConnection

包格式:
  1 byte packet_type + 4 bytes body_length + protobuf body

实时包:
  Connect / Heartbeat / Message / Material / Notice
```

连接成功后发送 Connect 包。收到 Connect 回包时触发 `getMessageByInit()`，先补命令，再补普通消息。心跳包用于保活，超过 `HEARTBEAT_TIMEOUT` 会主动 `reconnect()`。

### 消息存储和补偿同步

SQLite 按用户分表：

| 表 | 作用 |
| --- | --- |
| `conversation_${userId}` | 会话列表、未读、最后消息、会话设置、私聊 peer_id。 |
| `message_${userId}` | 消息明细，按 `con_id + con_index` 查询历史。 |
| `user_${userId}` | 用户资料、远程头像、本地头像、刷新时间。 |
| `agent_${userId}` | 智能体资料、远程头像、本地头像、刷新时间。 |
| `member_${userId}` | 群成员关系，普通用户和智能体成员统一建模。 |

补偿机制分三层：

1. 初始化补偿：`getMessageByInit()` 根据本地 `user_cmd_index` 和 `user_con_index` 从服务端拉全量增量。
2. 实时缺口补偿：TCP 消息里的 `pre_user_con_index` 不等于本地 index 时，自动调用 `/im/get_message_by_user` 补齐中间消息。
3. 会话内缺口补偿：聊天页根据 `con_index` 检查消息是否连续，不连续时调用 `/im/get_message_by_conversation` 补齐会话内缺口。

消息写入使用 `INSERT OR IGNORE`，重复包不会重复落库。UI 通过 `uni.$emit('normal')`、`uni.$emit('command')`、`uni.$emit('material')`、`uni.$emit('notice')` 实时刷新。

### 用户、智能体和会话资料刷新

资料缓存集中在 `utils/im-cache.js`：

| 能力 | 策略 |
| --- | --- |
| 用户缺失补齐 | `ensureUsersCached` 只请求本地不存在的用户。 |
| 智能体缺失补齐 | `ensureAgentsCached` 只请求本地不存在的智能体。 |
| 资料 TTL 刷新 | `enqueueProfileRefresh` 后台刷新过期用户/智能体，私聊 TTL 为 1 天，群聊最近消息发送者 TTL 为 7 天。 |
| 群成员补齐 | `enqueueGroupRosters` 后台拉群普通成员和群智能体成员，只在 roster 缺失时执行。 |
| 头像本地化 | `enqueueEntityAvatars` 下载用户、智能体、群头像到 `_doc/avatar/`，头像 URL 未变化时复用旧本地文件。 |

这样可以让消息同步、会话列表和页面进入不被头像下载或资料刷新阻塞。

### 埋点

作品详情页进入时调用 `enqueueClickReport(creationId)`：

| 机制 | 说明 |
| --- | --- |
| 本地队列 | 使用 `uni.setStorageSync` 保存点击 ID，自动去重，最大保留 100 条。 |
| 批量上报 | 满 20 条立即上报，不满 20 条 5 分钟后上报。 |
| 失败恢复 | 上报失败会把本批 ID 写回队列。 |
| 并发锁 | storage lock 避免重复 flush。 |
| App 隐藏 flush | `App.vue onHide` 调用 `flushClickReportQueue()`。 |

## 项目结构

```text
.
├── App.vue                         # App 生命周期、深链处理、埋点 flush、全局字体
├── main.js                         # Vue2 / Vue3 入口
├── pages.json                      # 页面路由、全局导航、原生 TabBar 配置
├── manifest.json                   # App 权限、SQLite/Push/Share/Camera/VideoPlayer、scheme 配置
├── pages/
│   ├── creation/                   # 首页、朋友流、搜索、图文详情、视频详情
│   ├── workspace/                  # 工坊、素材详情、发布、编辑创作
│   ├── im/                         # 会话列表、聊天、群设置、成员管理、通知
│   ├── agent/                      # 智能体列表、详情、创建、编辑、群 AI 成员
│   └── user/                       # 启动、登录、注册、个人页、资料编辑、关系链
├── components/
│   ├── custom-tabbar/              # 自定义底部导航
│   ├── avatar-cropper.vue          # 头像/封面裁剪
│   ├── forward-picker.vue          # Vue 转发选择器
│   └── forward-picker.nvue         # nvue 视频页转发选择器
├── request/                        # HTTP API 封装
│   ├── common.js                   # 通用请求、上传、登录过期处理
│   ├── user.js                     # 登录注册、用户资料、搜索、埋点
│   ├── creation.js                 # 素材、作品、推荐、搜索
│   ├── im.js                       # 消息、会话、成员、通知
│   ├── agent.js                    # 智能体 CRUD
│   └── action.js                   # 关注、点赞、评论、转发
├── utils/
│   ├── init.js                     # 登录态恢复、DB、用户资料、推送、Socket 初始化
│   ├── socket.js                   # Android/iOS TCP、心跳、重连、收包分发、缺口补偿
│   ├── sqlite.js                   # BigInt-safe SQLite 表结构和读写
│   ├── im-cache.js                 # 用户/智能体/群成员/头像缓存与刷新
│   ├── member_info.js              # 群成员展示信息兜底补齐
│   ├── push.js                     # 本地通知、通知点击跳转
│   ├── track.js                    # 点击埋点队列
│   └── snowflake.js                # 本地唯一 ID 生成
├── proto/
│   └── packet.proto                # TCP protobuf 协议
├── proto_gen/
│   └── packet.js                   # pbjs 生成文件，需手动保留 BigInt 读取补丁
├── uni_modules/
│   └── violet-tcp/                 # iOS 原生 TCP UTS + Swift 插件
└── static/                         # 字体、图标、默认头像和图片资源
```

## 运行与调试

### 依赖

```bash
npm install
```

项目主要通过 HBuilderX/uni-app App 端运行。`manifest.json` 中已声明 SQLite、Push、Share、VideoPlayer、Camera 等 App 模块。

### Protobuf 生成

```bash
npm install json-bigint
npx pbjs --es6 proto_gen/packet.js proto/packet.proto
```

生成后需要手动修改 `proto_gen/packet.js` 中 `readVarint64`，避免 64 位 ID 在 JS number 中丢精度：

```javascript
part0 = BigInt(part0);
part1 = BigInt(part1);
part2 = BigInt(part2);
const low = part0 | (part1 << 28n);
const high = (part1 >> 4n) | (part2 << 24n);
return (high << 32n) | low;
```

### Android 调试

```bash
adb devices
adb -s 127.0.0.1:5555 reverse tcp:3000 tcp:3000
adb -s 127.0.0.1:5555 reverse tcp:3001 tcp:3001
adb -s 127.0.0.1:5555 shell
su
sqlite3 /storage/emulated/0/Android/data/io.dcloud.HBuilder/apps/HBuilder/doc/db/violet.db
.tables
```
