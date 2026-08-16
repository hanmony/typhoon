# AI 模块重构审查报告

> 审查范围：`src/agent/` `src/chat/` `src/llm/` `src/knowledge-base/` 四个 AI 相关模块
> 审查日期：2025-03

---

## 模块架构总览

```
┌──────────────────────────────────────────────────┐
│                    Controller                     │
│  AgentController   ChatController   KbQueryController │
└────────┬───────────────┬───────────────┬─────────┘
         │               │               │
┌────────▼───────┐ ┌─────▼──────────┐ ┌──▼──────────────┐
│  AgentService  │ │  ChatService   │ │   RagService     │
│  (Agent Loop)  │ │  (Intent→Data  │ │  (Embed→Search   │
│   + ToolCall   │ │   →Prompt→LLM) │ │   →LLM Answer)   │
└───────┬────────┘ └──────┬─────────┘ └─────┬────────────┘
        │                 │                 │
        └─────────┬───────┴─────────┬───────┘
                  │                 │
          ┌───────▼──────┐  ┌───────▼──────┐
          │   LlmModule  │  │KnowledgeBase │
          │  (DeepSeek)  │  │  (Qdrant +   │
          │  + SseParser │  │   Embedding) │
          └──────────────┘  └──────────────┘
```

四个模块职责分明，无循环依赖。整体架构设计合理。

---

## 问题清单

### 🔴 高优先级

#### 1. `ThrottlerModule.forRoot()` 被两个模块重复调用

**文件：**

- `src/chat/chat.module.ts:20` → `ThrottlerModule.forRoot([{ name: "chat", ttl: 60000, limit: 15 }])`
- `src/agent/agent.module.ts:48` → `ThrottlerModule.forRoot([{ name: "chat", ttl: 60000, limit: 15 }])`

**问题：**

NestJS 的 `forRoot()` 设计为在根模块调用**恰好一次**，它会在全局注册 provider。两个 feature module 各自调用，会导致：

1. 全局 provider 被注册两次，实际生效的配置取决于模块加载顺序
2. 未来若两边配置出现差异，行为不可预测
3. 违反 NestJS 模块惯例，增加维护理解成本

**修复建议：**

```diff
// src/app.module.ts — 根模块统一注册一次
+ import { ThrottlerModule } from "@nestjs/throttler";

@Module({
    imports: [
        ConfigModule.forRoot({ ... }),
        ScheduleModule.forRoot(),
+       ThrottlerModule.forRoot([{ name: "chat", ttl: 60000, limit: 15 }]),
        CommonModule,
        ...
    ],
})
export class AppModule {}

// src/chat/chat.module.ts — 删除 forRoot
- ThrottlerModule.forRoot([{ name: "chat", ttl: 60000, limit: 15 }]),

// src/agent/agent.module.ts — 删除 forRoot
- ThrottlerModule.forRoot([{ name: "chat", ttl: 60000, limit: 15 }]),
```

`@Throttle()` 装饰器在各 Controller 路由上已经写了限流值，`forRoot` 只定义默认 limit 名称，提升到 `AppModule` 后行为不变。

---

#### 2. `APP_GUARD` 从 feature module 注册全局守卫

**文件：** `src/chat/chat.module.ts:28`

```ts
providers: [
    ...
    { provide: APP_GUARD, useClass: ThrottlerGuard },
],
```

**问题：**

1. `ThrottlerModule.forRoot()` 内部**已经注册了 `ThrottlerGuard`**，这里又注册一次，导致 `ThrottlerGuard` 可能被执行两次
2. `APP_GUARD` 是全局 token，放在 feature module 中不符合惯例，全局守卫应集中在 `AppModule` 管理（当前 `AppModule` 已用 `APP_GUARD` 注册了 `JwtAuthGuard` 和 `RolesGuard`）
3. `ChatModule` 的 `APP_GUARD` 和 `AgentModule` 的 `ThrottlerModule.forRoot()` 各自注册守卫，全局守卫总共可能出现 3 份 `ThrottlerGuard` 实例

**修复建议：**

删除 `ChatModule` 中的 `APP_GUARD` 注册：

```diff
// src/chat/chat.module.ts
- import { APP_GUARD } from "@nestjs/core";

@Module({
    imports: [...],
    controllers: [ChatController],
    providers: [
        IntentClassifier,
        DataAggregator,
        ChatService,
        ChatDiagnosticsService,
-       { provide: APP_GUARD, useClass: ThrottlerGuard },
    ],
})
export class ChatModule {}
```

`ThrottlerModule.forRoot()` 提升到 `AppModule` 后（见问题 1），`ThrottlerGuard` 由 `forRoot` 内部自动注册，无需手动 `APP_GUARD`。

---

### 🟡 中优先级

#### 3. 绕过 barrel export 的导入路径

**文件：**

- `src/agent/domain/agent.types.ts:1` → `import { TokenUsage } from "src/llm/service/llm.service"`
- `src/chat/service/chat.diagnostics.service.ts:2` → `import { ChatMessage } from "src/llm/service/llm.service"`

**问题：**

`src/llm/index.ts` 是模块的公开 API（barrel），已经重新导出了 `TokenUsage` 和 `ChatMessage`：

```ts
// src/llm/index.ts
export { LlmService } from "./service/llm.service";
export { TokenUsage, ChatMessage, ... } from "./domain/types";
```

这两处却直接从实现文件导入，绕过了 barrel。如果未来 `LlmService` 文件被拆分或类型移动到其他文件，这些导入会直接断裂。同时，同一个 `agent` 模块内，`agent.service.ts` 用的是 `from "src/llm"`（barrel），`agent.types.ts` 却用 `from "src/llm/service/llm.service"`（实现文件），内部就不一致了。

**修复建议：**

```diff
// src/agent/domain/agent.types.ts
- import { TokenUsage } from "src/llm/service/llm.service";
+ import { TokenUsage } from "src/llm";

// src/chat/service/chat.diagnostics.service.ts
- import { ChatMessage } from "src/llm/service/llm.service";
+ import { ChatMessage } from "src/llm";
```

**可进一步加固：** 在 `.eslintrc.js` 中配置 `no-restricted-imports` 规则，禁止从 `src/llm/service/*` 和 `src/llm/domain/*` 等内部路径导入：

```js
rules: {
  "no-restricted-imports": ["error", {
    patterns: [
      { group: ["src/llm/service/*", "src/llm/domain/*"],
        message: "Please import from 'src/llm' (barrel) instead." },
    ],
  }],
}
```

---

#### 4. `enableThinking` 字段是死代码

**文件：**

- `src/agent/domain/agent.dto.ts:42` — `enableThinking?: boolean`
- `src/chat/domain/dto/chat.dto.ts:34` — `enableThinking?: boolean`
- `src/knowledge-base/domain/dto/rag-query.dto.ts:39` — `enableThinking?: boolean`

**问题：**

全量 search 确认：这三个字段仅出现在 DTO 定义中，**没有任何 service 消费它们**。`AgentService`、`ChatService`、`RagService` 都不读取这个字段，DeepSeek API 的 reasoning/thinking 输出目前是全部透传的，不受这个开关控制。

这意味着前端传了 `enableThinking: false` 也没用 — thinking 内容照样返回。

**修复建议（二选一）：**

**方案 A — 落地实现：** 在各 service 中根据 `enableThinking` 决定是否将 `reasoning_content` / `thinking` 事件转发给前端。例如 `AgentService.collectStreamRound` 中：

```ts
case "thinking":
    if (enableThinking) {
        subscriber.next({ type: "thinking", data: event.data });
    }
    break;
```

**方案 B — 删除死代码：** 如果短期不打算实现，先删掉 DTO 字段，避免给前端造成 "这个功能可用" 的假象。后续需要时再加回来。

---

#### 5. `get_typhoon_history` 工具是占位桩

**文件：** `src/agent/tools/get-typhoon-history.tool.ts:33-44`

```ts
async execute(_args: Record<string, any>): Promise<ToolExecutionResult> {
    // TODO: 待确认 TyphoonService 历史台风查询接口后实现
    return {
        success: true,
        data: JSON.stringify({
            message: "历史台风查询功能待实现...",
        }),
    };
}
```

**问题：**

该工具在 `AgentModule` 中被注册为可用工具，Agent system prompt 也描述了它的功能。LLM 会在对话中调用它，然后收到 "功能待实现" 的占位回复 — 白白消耗一轮 tool call 往返的 token 和时间。

**修复建议：**

如果短期内无法实现，从注册列表中移除：

```diff
// src/agent/agent.module.ts
const TOOL_REGISTRATION_PROVIDER = {
    useFactory: (...) => {
        registry.register(GetCurrentStatusTool.definition, getStatusTool);
        registry.register(GetOperationsTool.definition, operationsTool);
        registry.register(SearchDocumentsTool.definition, searchDocsTool);
-       registry.register(GetTyphoonHistoryTool.definition, historyTool);
-       logger.log("All 4 agent tools registered");
+       logger.log("All 3 agent tools registered");
        return registry;
    },
};
```

同时在 `agent.prompt.ts` 中删除对应工具的说明。

---

#### 6. `LlmService.chat()` / `chatStream()` 不支持 purpose 路由

**文件：** `src/llm/service/llm.service.ts:60-62`、`src/llm/service/llm.service.ts:88-90`

```ts
// chat() — 始终用 this.baseUrl / this.model
const url = `${this.baseUrl}/chat/completions`;
const body = { model: this.model, messages, stream: false };

// chatStream() — 同上
const url = `${this.baseUrl}/chat/completions`;
const body = { model: this.model, messages, stream: true, ... };
```

**问题：**

`chatWithTools()` 和 `chatStreamWithTools()` 都支持通过 `purpose` 参数路由到不同的模型配置（`LLM_AGENT_MODEL`、`LLM_LIGHT_MODEL` 等），但 `chat()` 和 `chatStream()` 不支持。

`IntentClassifier` 调用的是 `this.llmService.chat(messages)` — 意图分类作为高频调用，用轻量模型可以省成本，但当前只能走默认模型。

**修复建议：**

给 `chat()` 和 `chatStream()` 加上 `options?: { purpose?: string }` 参数：

```diff
// src/llm/service/llm.service.ts

- async chat(messages: ChatMessage[]): Promise<ChatResult> {
-     const url = `${this.baseUrl}/chat/completions`;
-     const body = { model: this.model, messages, stream: false };
+ async chat(messages: ChatMessage[], options?: { purpose?: string }): Promise<ChatResult> {
+     const cfg = this.getConfigForPurpose(options?.purpose);
+     const url = `${cfg.baseUrl}/chat/completions`;
+     const body = { model: cfg.model, messages, stream: false };
```

`chatStream()` 同理。然后 `IntentClassifier` 调用时传 `{ purpose: "light" }` 即可用轻量模型。

---

### 🟢 低优先级 / 建议

#### 7. ChatService freeform 路径不记录 TTFT

**文件：** `src/chat/service/chat.service.ts:86-93`

```ts
// freeform 路径 — 没有传 onTtft 回调
const sub = this.subscribeStream(
    stream$, tLlm, t0,
    { intentMetrics, fetchMetrics, promptElapsed: 0, from, sources },
    subscriber,  // ← 缺少第6个参数 onTtft
);
```

修复：在 freeform 路径也传入 TTFT 回调，保证两类路径的 metrics 完整性。

---

#### 8. AgentController 注册了两个 `res.on("close")` 处理函数

**文件：** `src/agent/agent.controller.ts:26-30` 和 `src/agent/agent.controller.ts:48-50`

功能上没问题（Node.js EventEmitter 允许同事件多个监听器），但可读性差。合并为一个即可，参考 `ChatController` 和 `KbQueryController` 的写法。

---

#### 9. Agent 的 `search_documents` 工具未暴露 category 参数

`RagService.retrieve()` 支持按 `category` 过滤（typhoon_case / regulation / emergency_plan / other），但 Agent 的 `search_documents` 工具定义中只有 `query` 参数，不支持分类过滤。如有需要可扩展。

---

#### 10. `DataAggregator` 内联构造 RAG 结果

**文件：** `src/chat/service/data-aggregator.ts:49-64`

```ts
this.ragService.retrieve(question, 5)
    .then(raw => ({
        answer: "",
        sources: raw.map(s => ({
            content: s.content,
            documentName: s.documentName,
            chunkIndex: s.chunkIndex,
            score: s.score,
        })),
    }))
```

这段逻辑把 `QdrantSearchResult[]` → `{ answer, sources }` 的映射写在了 DataAggregator 里，而 `RagService` 自己的 `query()` 方法也做了同样的映射。建议给 `RagService` 加一个纯检索方法（如 `retrieveAndFormat`），避免多处重复这种映射逻辑。

---

## 修复优先级速览

| # | 问题 | 严重度 | 改动量 | 风险 |
|---|------|--------|--------|------|
| 1 | `forRoot()` 重复调用 | 🔴 高 | 小 | 低 |
| 2 | `APP_GUARD` 在 feature module | 🔴 高 | 极小 | 低 |
| 3 | 绕过 barrel 导入 | 🟡 中 | 极小 | 无 |
| 4 | `enableThinking` 死代码 | 🟡 中 | 中（需落地实现或清理） | 低 |
| 5 | `get_typhoon_history` 占位 | 🟡 中 | 小 | 低 |
| 6 | `chat()` 缺 purpose 路由 | 🟡 中 | 中 | 低 |
| 7-10 | 小问题 | 🟢 低 | 极小 | 无 |

建议先修 #1 和 #2（一个 commit），再修 #3、#5、#6（各自独立），最后处理 #4（需要决定方案 A 还是 B）。
