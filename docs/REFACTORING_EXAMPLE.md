# 重构示例 - Note Router 简化

## 重构前（当前代码）

**文件**：`server/routerTrpc/note.ts` (1987行)

```typescript
export const noteRouter = router({
  upsert: authProcedure
    .input(validationSchema)
    .mutation(async function ({ input, ctx }) {
      // 200+ 行业务逻辑直接在路由中
      let { id, isArchived, isRecycle, attachments, content, isTop, isShare, references } = input;

      // 检查权限
      const notePermission = await prisma.notes.findFirst({
        where: { id, OR: [...] },
      });

      // 处理标签
      const tagTree = helper.buildHashTagTreeFromHashString(...);
      let newTags = [];
      const handleAddTags = async (tagTree, parentTag, noteId) => {
        // 50+ 行标签处理逻辑
      };

      // 处理引用
      const oldReferences = await prisma.noteReference.findMany(...);
      // 30+ 行引用处理逻辑

      // 处理附件
      // 40+ 行附件处理逻辑

      // AI 处理
      // 20+ 行 AI 处理逻辑

      // ... 更多业务逻辑

      return note;
    }),
});
```

**问题**：
- 路由文件包含大量业务逻辑
- 难以测试
- 难以复用
- 违反单一职责原则

---

## 重构后（目标架构）

**文件**：`server/routerTrpc/note/noteRouter.ts` (约 100行)

```typescript
import { authProcedure, router } from '@server/middleware';
import { noteService } from '@server/services/noteService';
import { upsertNoteSchema } from '@server/services/noteService';

export const noteRouter = router({
  /**
   * 创建或更新笔记
   */
  upsert: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/note/upsert',
        summary: 'Update or create note',
        protect: true,
        tags: ['Note'],
      },
    })
    .input(upsertNoteSchema)
    .mutation(async ({ input, ctx }) => {
      // 路由只负责调用服务
      return await noteService.upsert(input, ctx);
    }),

  /**
   * 查询笔记列表
   */
  list: authProcedure
    .input(listNoteSchema)
    .mutation(async ({ input, ctx }) => {
      return await noteService.list(input, ctx);
    }),

  /**
   * 删除笔记
   */
  delete: authProcedure
    .input(deleteNoteSchema)
    .mutation(async ({ input, ctx }) => {
      return await noteService.delete(input, ctx);
    }),

  /**
   * 分享笔记
   */
  share: authProcedure
    .input(shareNoteSchema)
    .mutation(async ({ input, ctx }) => {
      return await noteService.share(input.id, ctx.id, input.params);
    }),
});
```

**优势**：
- 路由文件简洁清晰
- 只负责参数验证和调用服务
- 业务逻辑全部在服务层
- 易于测试和维护

---

## 重构步骤

### 步骤 1：创建 Repository 层（已完成）

**文件**：`server/repositories/noteRepository.ts`

```typescript
export class NoteRepository {
  async findById(id: number, accountId: number): Promise<Note | null> {
    return await prisma.notes.findFirst({
      where: { id, accountId },
      include: { /* ... */ },
    });
  }

  async findMany(params): Promise<Note[]> {
    return await prisma.notes.findMany({ /* ... */ });
  }

  async create(data): Promise<Note> {
    return await prisma.notes.create({ /* ... */ });
  }

  // ... 其他数据访问方法
}
```

### 步骤 2：创建 Service 层（已完成）

**文件**：`server/services/noteService.ts`

```typescript
export class NoteService {
  constructor(
    private noteRepo: NoteRepository,
    private tagService: TagService,
    private fileService: FileService,
    private aiService: AIService
  ) {}

  async upsert(input: UpsertNoteInput, ctx: Context): Promise<Note> {
    // 业务逻辑
    // 1. 权限检查
    // 2. 标签处理
    // 3. 引用处理
    // 4. 附件处理
    // 5. AI 处理

    // 协调各个 Repository 和 Service
    return await this.noteRepo.update(/* ... */);
  }

  // ... 其他业务方法
}
```

### 步骤 3：重构 Router 层（进行中）

将原来的 `note.ts` 拆分为：

```
server/routerTrpc/note/
├── index.ts              # 导出所有 note 路由
├── noteRouter.ts         # 笔记 CRUD 路由
├── shareRouter.ts        # 分享相关路由
├── referenceRouter.ts    # 引用相关路由
└── validators.ts         # 输入验证 Schema
```

### 步骤 4：更新导入（最后一步）

更新 `server/routerTrpc/index.ts`：

```typescript
import { noteRouter } from './note/noteRouter';
import { tagRouter } from './tags/tagRouter';
import { userRouter } from './users/userRouter';

export const appRouter = router({
  note: noteRouter,
  tags: tagRouter,
  users: userRouter,
  // ...
});
```

---

## 预期效果

### 代码行数对比

| 层级 | 重构前 | 重构后 | 减少 |
|------|--------|--------|------|
| Router | 1987行 | ~400行 | 80% ↓ |
| Service | 0行 | ~800行 | 新增 |
| Repository | 0行 | ~400行 | 新增 |
| **总计** | **1987行** | **1600行** | 19% ↓ |

### 可维护性提升

- ✅ 单一职责原则
- ✅ 易于单元测试
- ✅ 业务逻辑可复用
- ✅ 代码清晰分层

### 可测试性提升

**重构前**：难以测试（业务逻辑混在路由中）
```typescript
// 需要模拟整个 tRPC 上下文
describe('note.upsert', () => {
  it('should create note', async () => {
    // 复杂的测试设置
  });
});
```

**重构后**：易于测试（业务逻辑独立）
```typescript
// 直接测试 Service
describe('NoteService.upsert', () => {
  it('should create note with tags', async () => {
    const service = new NoteService(mockRepo, mockTagService);
    const result = await service.upsert(input, ctx);
    expect(result).toHaveProperty('id');
  });
});
```

---

## 下一步计划

1. ✅ 创建 `noteRepository.ts`
2. ✅ 创建 `noteService.ts`
3. ⏳ 拆分 `note.ts` 为多个路由文件
4. ⏳ 创建其他 Repository 和 Service
5. ⏳ 更新所有导入和导出

---

## 参考文档

- [REFACTORING_PLAN.md](./REFACTORING_PLAN.md) - 完整重构计划
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - 项目结构说明
