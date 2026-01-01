# Blinko 项目结构文档

> 最后更新：2025-01-01

## 目录结构

```
blinko-main/
├── app/                    # 前端 React 应用
│   ├── src/
│   │   ├── components/     # React 组件
│   │   │   ├── Common/     # 通用组件
│   │   │   ├── Layout/     # 布局组件
│   │   │   ├── Lumina*     # 业务组件
│   │   │   └── ...
│   │   ├── hooks/          # 自定义 Hooks
│   │   ├── pages/          # 页面组件
│   │   ├── store/          # MobX 状态管理
│   │   ├── lib/            # 工具库
│   │   └── main.tsx        # 应用入口
│   ├── package.json
│   └── vite.config.ts
│
├── server/                 # 后端 Node.js 服务器
│   ├── routerTrpc/         # tRPC API 路由
│   ├── routerExpress/      # Express API 路由
│   ├── aiServer/           # AI 服务
│   ├── jobs/               # 定时任务
│   ├── lib/                # 后端工具库
│   ├── prisma/             # Prisma 客户端
│   ├── index.ts            # 服务器入口
│   └── package.json
│
├── prisma/                 # 数据库 Schema
│   ├── schema.prisma       # 数据库模型定义
│   └── migrations/         # 数据库迁移文件
│
├── shared/                 # 前后端共享代码
│   ├── lib/                # 共享工具库
│   └── package.json
│
├── lumina-types/          # 类型定义
│
├── docs/                  # 项目文档
│   ├── REFACTORING_PLAN.md # 重构计划
│   └── PROJECT_STRUCTURE.md # 本文档
│
├── public/                # 静态资源
├── dist/                  # 构建输出
├── package.json           # Monorepo 根配置
├── turbo.json            # Turbo 构建配置
└── tsconfig.json         # TypeScript 配置
```

---

## 前端架构

### 组件目录结构

```
app/src/components/
├── Common/                 # 通用组件
│   ├── Editor/             # Markdown 编辑器
│   │   ├── hooks/
│   │   ├── Toolbar/
│   │   └── index.tsx
│   ├── Iconify/            # 图标组件
│   ├── ScrollArea/         # 滚动区域
│   └── ...
│
├── Layout/                 # 布局组件
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   └── index.tsx
│
├── Lumina*                # 业务组件（以 Lumina 命名）
│   ├── LuminaCard/         # 笔记卡片
│   │   ├── cardHeader.tsx
│   │   ├── cardFooter.tsx
│   │   └── index.tsx
│   ├── LuminaAi/           # AI 功能
│   ├── LuminaEditor/       # 笔记编辑器
│   ├── LuminaSettings/     # 设置页面
│   └── ...
│
└── [其他功能组件]
```

### Store 结构（当前）

```
app/src/store/
├── luminaStore.tsx         # 主 Store（1138行，需要拆分）
├── user.ts                 # 用户 Store
├── base.ts                 # 基础配置 Store
├── standard/               # 标准 Store 实现
│   ├── PromiseState.ts
│   ├── StorageListState.ts
│   └── ...
└── module/                 # 功能模块
    ├── ListStore.ts
    ├── NoteStore.ts
    └── OfflineStore.ts
```

### Store 结构（目标）

```
app/src/store/
├── core/                   # 核心 Store
│   ├── NoteStore.ts        # 笔记 CRUD
│   ├── TagStore.ts         # 标签管理
│   ├── AttachmentStore.ts  # 附件管理
│   └── ReferenceStore.ts   # 引用管理
│
├── features/               # 功能 Store
│   ├── OfflineStore.ts     # 离线同步
│   ├── AIService.ts        # AI 功能
│   └── ShareStore.ts       # 分享功能
│
├── standard/               # 标准 Store 实现
│   ├── PromiseState.ts
│   └── StorageListState.ts
│
├── root.ts                 # Store 根
└── index.ts                # 导出所有 Store
```

---

## 后端架构

### 当前架构

```
server/
├── routerTrpc/             # tRPC 路由
│   ├── note.ts             # 笔记 API（1987行，需要拆分）
│   ├── tags.ts
│   ├── users.ts
│   ├── auth.ts
│   └── index.ts
│
├── routerExpress/          # Express 路由
│   ├── auth/
│   ├── file/
│   └── ...
│
├── aiServer/               # AI 服务
│   ├── providers/          # AI 提供商
│   ├── tools/              # AI 工具
│   └── index.ts
│
└── jobs/                   # 定时任务
    ├── markdownJob.ts
    └── archivejob.ts
```

### 目标架构（三层架构）

```
server/
├── routerTrpc/             # Router 层（路由定义）
│   ├── note/
│   │   ├── index.ts        # 路由聚合
│   │   ├── noteRouter.ts   # 路由定义
│   │   └── validators.ts   # 输入验证
│   ├── tags/
│   ├── users/
│   └── index.ts
│
├── services/               # Service 层（业务逻辑）
│   ├── noteService.ts      # 笔记业务逻辑
│   ├── tagService.ts       # 标签业务逻辑
│   ├── userService.ts      # 用户业务逻辑
│   └── ...
│
├── repositories/           # Repository 层（数据访问）
│   ├── noteRepository.ts   # 笔记数据访问
│   ├── tagRepository.ts    # 标签数据访问
│   └── ...
│
├── routerExpress/          # Express 路由（保持不变）
├── aiServer/               # AI 服务（保持不变）
└── jobs/                   # 定时任务（保持不变）
```

---

## 数据库 Schema

### 核心表

```prisma
// 主要模型
model accounts          # 用户账户
model notes             # 笔记
model attachments       # 附件
model tags              # 标签
model tagsToNote        # 笔记-标签关联
model comments          # 评论
model noteReference     # 笔记引用
model noteHistory       # 笔记历史
model noteInternalShare # 笔记内部分享

// 配置和系统
model config            # 全局配置
model cache             # 缓存
model plugin            # 插件
model session           # 会话

// AI 相关
model aiProviders       # AI 提供商
model aiModels          # AI 模型
model conversation      # AI 对话
model message           # AI 消息

// 其他
model scheduledTask     # 定时任务
model follows           # 关注
model notifications     # 通知
```

---

## API 端点结构

### tRPC 端点

```
/api/trpc/
├── note.                # 笔记相关
│   ├── list
│   ├── upsert
│   ├── delete
│   ├── share
│   └── ...
├── tags.                # 标签相关
│   ├── list
│   ├── create
│   └── ...
├── users.               # 用户相关
│   ├── login
│   ├── register
│   └── ...
└── auth.                # 认证相关
```

### Express 端点

```
/api/
├── auth/*               # 认证相关
├── file/*               # 文件上传下载
├── s3/*                 # S3 存储相关
└── ...
```

---

## 共享代码

```
shared/
└── lib/
    ├── types.ts         # 共享类型定义
    ├── helper.ts        # 共享工具函数
    ├── lodash.ts        # Lodash 配置
    └── cache.ts         # 缓存工具
```

---

## 构建流程

### 开发模式

```bash
# 启动完整开发环境（Tauri 桌面应用）
bun run dev

# 仅启动前端
bun run dev:frontend

# 仅启动后端
bun run dev:backend
```

### 生产构建

```bash
# 构建 Web 应用
bun run build:web

# 启动生产服务器
bun run start:server:production
```

---

## 环境变量

```env
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/lumina

# 认证
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:1111

# AI 提供商（可选）
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# S3 存储（可选）
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
```

---

## 依赖说明

### 核心依赖

- **React 生态**：React 18, React Router v7, MobX
- **UI 组件**：HeroUI (@heroui/react)
- **编辑器**：Vditor
- **后端框架**：Express, tRPC
- **ORM**：Prisma
- **数据库**：PostgreSQL
- **构建工具**：Vite, Turbo, esbuild
- **AI 集成**：Vercel AI SDK, Mastra

### 开发依赖

- **TypeScript**：5.1.6
- **Bun**：>= 1.0.0
- **Node.js**：>= 20.0.0

---

## 关键文件说明

### 前端关键文件

| 文件 | 说明 | 行数 |
|------|------|------|
| `app/src/store/luminaStore.tsx` | 主 Store | 1138 |
| `app/src/components/Common/Editor/index.tsx` | 编辑器组件 | 500+ |
| `app/src/components/LuminaCard/index.tsx` | 笔记卡片 | 275 |

### 后端关键文件

| 文件 | 说明 | 行数 |
|------|------|------|
| `server/routerTrpc/note.ts` | 笔记 API | 1987 |
| `server/aiServer/index.ts` | AI 服务 | 300+ |

---

## 下一步改进

1. **拆分超长文件**：特别是 `note.ts` 和 `luminaStore.tsx`
2. **引入 Service 层**：分离业务逻辑
3. **类型安全**：减少 `@ts-ignore` 和 `any` 使用
4. **组件解耦**：移除 RootStore 直接访问
5. **性能优化**：解决 N+1 查询、添加索引

详见 [REFACTORING_PLAN.md](./REFACTORING_PLAN.md)
