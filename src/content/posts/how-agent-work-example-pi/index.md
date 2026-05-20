---
title: "从 API 调用到完整 Agent：读 pi 源码理解 AI Agent 是怎么工作的"
published: 2026-05-20 17:30
description: "以 pi 项目的源码为线索，从零拆解一个生产级 AI Agent 的完整架构——从纯文字 API 调用开始，逐步加上工具调用、ReAct 循环、状态管理、运行时干预、Session 持久化、上下文压缩，直到一个能持续工作数天的编码助手。"
image: "images/cover.png"
firstLineIndent: "0em"
tags:
  - Agent
  - AI
  - LLM
  - ReAct
  - 源码阅读
  - TypeScript
  - 软件架构
category: "技术分享"
draft: false
pin: 0
lang: ""
comments: true
sponsor: true
---

大多数开发者第一次接触 LLM 是从 API 调用开始的：

```javascript
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "写一个 web 服务器" }]
});
console.log(response.choices[0].message.content);
```

你问一句，它答一句。LLM 能说，但不能动——你说"帮我看看这个项目结构"，它就只能礼貌地请你把文件贴给它。

而当你用了 Cursor、Claude Code 或者 pi 这类 Coding Agent 之后，体验完全不同：你说"帮我写个服务器"，它真的会去读你的 `package.json`、给你创建文件、然后告诉你部署到哪个端口。

这个差距是怎么填上的？一个"只能说话的聊天机器人"是怎么变成"能读文件、执行命令、持续工作数小时不丢上下文"的 Agent 的？

**先说结论：Agent 的核心不是模型本身，而是一层一层加上去的工程结构——工具调用、ReAct 循环、状态管理、运行时干预、Session 持久化、上下文压缩。** 每一层解决一个问题，每一层站在上一层的肩膀上。

本文将 [pi 项目](https://github.com/earendil-works/pi-mono)（一个用 TypeScript 写的 Agent 框架）的源码作为线索，逐层拆解这些工程结构是怎么实现的。我们会从项目结构开始，一直深入到循环的核心代码、状态封装、事件系统、compaction 算法，最后把完整的进化路径串起来。

---

# 第 1 章：项目全貌

## monorepo 四层结构

pi 是一个 Agent 框架（Agent Harness），用 TypeScript 写的，monorepo 结构：

```
pi/
├── packages/
│   ├── ai/            # LLM API 抽象层
│   ├── agent/         # Agent 运行时（核心）
│   ├── coding-agent/  # 完整的 CLI 应用（上层）
│   └── tui/           # 终端 UI 库
├── package.json
└── tsconfig.json
```

### 第一层：`packages/ai` — LLM 抽象层

作用：把不同厂商的 LLM API（OpenAI、Claude、Gemini、DeepSeek…）统一成一套接口。

- 你传一个 `Model` 对象（告诉它用哪家模型）和一个 `Context`（system prompt + 消息列表 + 工具定义）
- 它返回一个事件流：`text_delta`（文字片段）、`toolcall_delta`（工具调用片段）、`thinking_delta`（思考过程）
- 你不需要关心每家 API 的格式差异

关键文件：

| 文件 | 作用 |
|------|------|
| `src/types.ts` | 消息类型定义：`UserMessage`、`AssistantMessage`、`ToolResultMessage`、`Tool`、`Model` |
| `src/stream.ts` | 核心函数 `streamSimple()` — 统一的流式调用入口 |
| `src/providers/` | 各家 provider 的实现（OpenAI、Anthropic、Google…） |

### 第二层：`packages/agent` — Agent 运行时（核心）

作用：实现 ReAct 循环。这是本文的重点。

- `packages/agent/src/types.ts` — 核心数据模型：`AgentMessage`、`AgentTool`、`AgentEvent`、`AgentContext`、`AgentLoopConfig`
- `packages/agent/src/agent-loop.ts` — 纯函数式的循环逻辑，约 740 行
- `packages/agent/src/agent.ts` — 有状态的高层封装（`Agent` 类），约 557 行
- `packages/agent/src/harness/` — 高阶封装：AgentHarness 类（Session 持久化、钩子系统、compaction）

### 第三层：`packages/coding-agent` — CLI 应用

作用：用上面两层搭出来的一个完整产品——一个在终端里跑的 coding agent。

- 注册了具体工具：`read`、`bash`、`edit`、`write`、`grep`、`find`、`ls`
- 构建了 System Prompt（告诉 LLM 它是个 coding agent，怎么用工具）
- 处理 slash 命令（`/model` 切换模型、`/compact` 压缩上下文）
- 三种运行模式：交互式 TUI、一次性输出（print mode）、RPC 服务

### 第四层：`packages/tui` — 终端 UI 库

作用：在终端里渲染 UI，带差异渲染（只更新变化的部分）。

## 数据流全景

从用户输入到最终输出，数据是怎么流的：

```
用户输入 "帮我写个web服务器"
  │
  ▼
coding-agent/main.ts
  │  解析输入、处理 slash 命令
  ▼
Agent.prompt("帮我写个web服务器")
  │  包装成 AgentMessage，转发到 loop
  ▼
agent-loop.ts (runLoop)
  │  调用 LLM → 拿到 AssistantMessage
  ▼
  ┌─── 有 toolCall？───→ 执行工具 → 结果塞回 context → 再调 LLM
  │                       （可能循环多次）
  └─── 没 toolCall？───→ 返回最终消息
  │
  ▼
ai/stream.ts (streamSimple)
  │  统一流式接口，调用具体 provider
  ▼
ai/providers/...
  │  发 HTTP 请求到 LLM
  ▼
LLM → 返回事件流 → 逐帧往上冒泡 → UI 更新
```

## 几个绕不开的概念

在看源码之前，需要先理清几个概念的层次。这些概念在 pi 源码里都有对应。

### ReAct（Reasoning + Acting）

ReAct 是 Agent 最基础的思想框架。它来自一篇论文（Yao et al., 2023），核心就两句话：

> LLM **思考**（Reason） → 采取**行动**（Act） → 观察**结果**（Observe） → 再思考 → 再行动……

这个模式对应到 pi 的 `agent-loop.ts` 里就是：

```
LLM 思考 → 产生文字 + toolCall（行动）
  ↓
执行工具 → 拿到结果（观察）
  ↓
结果塞进对话 → LLM 再思考 → ...
```

你可以把 ReAct 理解为"让 LLM 不仅仅是说话，也能动手"的基本设计模式。几乎所有现代 Coding Agent（Claude Code、Cursor、Devin、pi）底层都跑着这个循环。在 pi 里，ReAct 循环的实现在 `packages/agent/src/agent-loop.ts` 的 `runLoop()` 函数中。

### CoT（Chain of Thought，思维链）

CoT 是一种提示技巧——让 LLM 把推理过程一步步写出来，而不是直接给答案。

```
直接问：17 × 24 = ？
回答：408

用了 CoT：
17 × 24 = 17 × (20 + 4) = 17 × 20 + 17 × 4 = 340 + 68 = 408
```

在 ReAct 循环里，LLM 产生的"思考"文字本身就相当于 CoT。Agent 的 System Prompt 通常会要求 LLM 在调用工具之前先分析情况、制定计划。这就是 CoT 在 Agent 里的实际应用。

在 pi 里，有些模型支持专门的 `thinking` 模式（比如 Claude 的 extended thinking），`packages/ai` 层的流式事件里就有 `thinking_delta` 事件，专门传送模型的推理过程。pi 的 `AssistantMessage` 内容块可以包含多种类型：

- `thinking` → 模型自己在推理，不直接给用户看
- `text` → 模型准备最终答案了
- `toolCall` → 模型要动手做事了

### MCP（Model Context Protocol）

MCP 是 Anthropic 提出的一种开放协议，用来标准化"LLM 怎么跟外部工具/数据源交互"。

```
没有 MCP 的时候：
  每个 Agent 框架自己定义工具怎么注册、怎么调用、
  参数怎么描述、结果怎么返回。百花齐放，互不兼容。

有 MCP 的时候：
  大家都按同一个协议来。你写一个 MCP 服务器（比如
  "文件系统 MCP 服务器"），任何支持 MCP 的客户端
  都能直接用。
```

MCP 的核心设计：

- **MCP Server** —— 一个进程，暴露工具（tools）、资源（resources）、提示（prompts）
- **MCP Client** —— 连接 MCP Server 的 Agent，发现可用工具、调用工具、读取资源
- **传输层** —— 可以是 stdio（子进程通信）或 HTTP（远程服务）

pi 目前没有原生集成 MCP（至少 `packages/agent` 里没有 MCP 客户端）。它用的是自己的一套 `AgentTool` 接口，直接在代码里注册工具函数。这也是很多早期 Agent 框架的做法。

### Skill（技能）

Skill 是 pi 里的一段可复用的工作流知识，告诉 Agent 怎么完成一类特定任务。

**Skill 和 Tool 的区别：**

- **Tool（工具）**—— 一个具体的、可调用的函数。比如 `read_file(path)`、`execute_command(cmd)`。有输入输出参数，可以直接被 LLM 调用。
- **Skill（技能）**—— 一段知识或步骤指南。比如"如何调试 Python 内存泄漏"。不是可调用的函数，而是注入到 System Prompt 里的上下文。

**Skill 和一般 System Prompt 的区别：**

| | 一般提示词 | Skill |
|---|---|---|
| 生效范围 | 全局，永远生效 | 按需，匹配才生效 |
| 写入时机 | System Prompt，启动时写好 | 检测到任务匹配，动态注入 |
| 典型内容 | "你是什么角色"、"回答风格" | "遇到 X 情况，按 Y 步骤处理" |
| 上下文开销 | 总是占着 token | 只有用时才占 token |

在一个成熟的 Agent 框架里，System Prompt 一般很短（定义角色和基本原则），真正干活的知识放在 Skill 里按需加载。pi 的 `packages/agent/src/harness/skills.ts` 做的就是这件事——管理 Skill 的注册、匹配、加载。

### 四个概念的关系图谱

```
                     ReAct（设计模式）
                    /        \
                   /          \
            CoT（推理方式）   Tool Calling（行动方式）
                                   |
                              ┌────┴────┐
                              │         │
                         MCP(协议)   原生 Tool(如 pi)
                              │
                          Skill（知识复用）
```

- **ReAct** 是 Agent 整体的操作模式（思考→行动→观察）
- **CoT** 是"思考"阶段的具体技巧（一步一步推理）
- **MCP** / **原生 Tool** 是"行动"阶段如何跟外部世界交互
- **Skill** 是给 Agent 提供背景知识，让它知道"什么情况下用什么工具、按什么顺序"

类比：

- **Tool** = 你工具箱里的螺丝刀、扳手、锤子（可以直接拿来用）
- **Skill** = 工作说明书（告诉你怎么用那些工具完成特定任务）
- **MCP** = 统一螺丝刀的接口标准（不管是哪家的螺丝刀，接口一样）

---

# 第 2 章：核心数据模型 — types.ts

> 对应文件：`packages/agent/src/types.ts`（约 418 行）

写 Agent 框架和写普通程序不一样——**数据的形状决定了代码的结构**。如果你不理解 `AgentMessage` 是什么、`AgentTool` 怎么定义、`AgentEvent` 有哪些种类，读 `agent-loop.ts` 的时候就会一头雾水。所以先啃数据类型，再读循环逻辑。

## 基础枚举与类型别名

### `StreamFn` — Agent 和 LLM 层之间的接口

```typescript
type StreamFn = (
  ...args: Parameters<typeof streamSimple>
) => ReturnType<typeof streamSimple> | Promise<ReturnType<typeof streamSimple>>;
```

- 入参：和 `streamSimple()` 一样（model + context + options）
- 返回值：一个 `AssistantMessageEventStream`
- **契约：不能 throw。** 出错要在返回的 stream 里通过事件和 `stopReason: "error"` 来传达

这个设计很重要——Agent 层通过 StreamFn 调用 LLM，但不知道具体用的是哪家 provider。切换模型只需要换 StreamFn 的实现。

### `ToolExecutionMode`

```typescript
type ToolExecutionMode = "sequential" | "parallel";
```

控制当 LLM 一次返回多个 tool call 时怎么执行它们：

- **parallel**：多个工具同时执行（默认）。快，但要注意并发安全问题
- **sequential**：一个一个顺序执行。慢，但安全，每个工具的结果可以影响后续工具

pi 默认用 parallel，但单个工具可以用 `executionMode: "sequential"` 覆盖。如果任何一个工具声明了 `sequential`，所有工具都退化成顺序执行，不混合。

### `QueueMode`

```typescript
type QueueMode = "all" | "one-at-a-time";
```

控制队列消息怎么被消费：

- **all**：一次性全部注入
- **one-at-a-time**：每次只消费一条，剩下的排队等着

用在两个地方：steering 队列（运行时干预）和 follow-up 队列（运行结束后的后续任务）。

### `ThinkingLevel`

```typescript
type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
```

模型的推理深度控制。只有部分模型支持。

## 工具调用的钩子系统

两个钩子让你在工具执行前后插入自定义逻辑。

### `BeforeToolCallResult` / `BeforeToolCallContext`

```typescript
interface BeforeToolCallResult {
  block?: boolean;   // true = 阻止这个工具执行
  reason?: string;   // 阻止时的错误信息
}

interface BeforeToolCallContext {
  assistantMessage: AssistantMessage;  // 触发工具调用的 LLM 回复
  toolCall: AgentToolCall;             // 工具调用详情
  args: unknown;                       // 校验后的参数
  context: AgentContext;               // 当前上下文
}
```

用途：安全检查（命令在黑名单里？block）、权限检查（用户没授权？block）、参数预处理。

### `AfterToolCallResult` / `AfterToolCallContext`

```typescript
interface AfterToolCallResult {
  content?: (TextContent | ImageContent)[];  // 替换工具返回的内容
  details?: unknown;                          // 替换结构化详情
  isError?: boolean;                          // 覆盖错误标记
  terminate?: boolean;                        // 提示循环提前终止
}
```

用途：过滤敏感信息、格式化结果、标记某些结果让循环停下来。注意 `terminate` 字段——只有**所有**工具结果都设了 `terminate: true`，循环才会提前结束。

## 消息模型：两层设计

pi 有两层消息模型：LLM 层的 `Message` 和 Agent 层的 `AgentMessage`。

```typescript
type AgentMessage = Message | CustomAgentMessages[keyof CustomAgentMessages];
```

`Message` 来自 `@earendil-works/pi-ai`，包含 `UserMessage`、`AssistantMessage`、`ToolResultMessage`。

Agent 层通过 TypeScript 的声明合并（declaration merging）扩展：

```typescript
interface CustomAgentMessages {
  // 默认空，应用通过 declaration merging 扩展
}

// 使用方可以这样扩展：
declare module "@earendil-works/pi-agent" {
  interface CustomAgentMessages {
    artifact: ArtifactMessage;
    notification: NotificationMessage;
  }
}
```

这让外部包可以往 `AgentMessage` 联合类型里加新成员，而不需要改核心库的代码。

**为什么要有两层？** Agent 层可能需要一些不是发给 LLM 的消息——比如 UI 上显示的通知、中间状态更新，这些不应该喂给 LLM，需要 `convertToLlm` 过滤掉。

## 核心配置：`AgentLoopConfig`

```typescript
interface AgentLoopConfig extends SimpleStreamOptions {
  model: Model<any>;                    // 用什么模型

  convertToLlm: (messages: AgentMessage[]) => Message[] | Promise<Message[]>;
  // 把 Agent 层的消息转成 LLM 能理解的消息格式

  transformContext?: (messages: AgentMessage[], signal?: AbortSignal) => Promise<AgentMessage[]>;
  // 在 convertToLlm 之前对消息做预处理——上下文窗口管理

  getApiKey?: (provider: string) => Promise<string | undefined> | string | undefined;
  // 动态获取 API key（对 OAuth token 很重要）

  shouldStopAfterTurn?: (context: ShouldStopAfterTurnContext) => boolean | Promise<boolean>;
  // 每一轮完成后，检查是否应该停下

  prepareNextTurn?: (context: PrepareNextTurnContext) => AgentLoopTurnUpdate | undefined | Promise<...>;
  // 在下一轮开始前，可以替换 context / model / thinking level

  beforeToolCall?: (context: BeforeToolCallContext, signal?: AbortSignal) => Promise<BeforeToolCallResult | undefined>;
  afterToolCall?: (context: AfterToolCallContext, signal?: AbortSignal) => Promise<AfterToolCallResult | undefined>;

  getSteeringMessages?: () => Promise<AgentMessage[]>;
  // 运行时干预

  getFollowUpMessages?: () => Promise<AgentMessage[]>;
  // 后续任务

  toolExecution?: ToolExecutionMode;
}
```

关键理解点：

- AgentLoopConfig 继承自 `SimpleStreamOptions`，所以也继承了 `signal`、`reasoning`、`maxRetries` 等 LLM 调用参数
- 三个关键回调按顺序跑：`transformContext` → `convertToLlm` → 调 LLM
- 两个队列（steering / follow-up）让 Agent 在运行期间可以接受外部输入

## 状态和上下文

### `AgentState`

```typescript
interface AgentState {
  systemPrompt: string;
  model: Model<any>;
  thinkingLevel: ThinkingLevel;
  set tools(tools: AgentTool<any>[]);
  get tools(): AgentTool<any>[];
  set messages(messages: AgentMessage[]);
  get messages(): AgentMessage[];
  readonly isStreaming: boolean;
  readonly streamingMessage?: AgentMessage;
  readonly pendingToolCalls: ReadonlySet<string>;
  readonly errorMessage?: string;
}
```

这是 `Agent` 类暴露给外部读和写的状态接口。`tools` 和 `messages` 用了 getter/setter（赋值时自动复制数组，防止外部修改内部引用）。运行时标记都是只读的。

### `AgentContext`

```typescript
interface AgentContext {
  systemPrompt: string;
  messages: AgentMessage[];
  tools?: AgentTool<any>[];        // 可选——没有工具就是纯聊天
}
```

`AgentState` vs `AgentContext` 的区别：

| | AgentState | AgentContext |
|---|---|---|
| 含义 | Agent 的完整状态 | 单次循环的上下文快照 |
| 可变 | 可读写 | 快照，不直接修改 |
| 用途 | 公开给 UI 和外部调用 | 传给 `runLoop()` |
| 包含 | 系统提示 + 模型 + 工具 + 消息 + 运行时标记 | 只有提示 + 消息 + 工具 |

### `AgentTool`

```typescript
interface AgentTool<TParameters extends TSchema = TSchema, TDetails = any> extends Tool<TParameters> {
  label: string;                                        // UI 显示名
  prepareArguments?: (args: unknown) => Static<TParameters>;  // 参数兼容层
  execute: (
    toolCallId: string,
    params: Static<TParameters>,
    signal?: AbortSignal,
    onUpdate?: AgentToolUpdateCallback<TDetails>,
  ) => Promise<AgentToolResult<TDetails>>;
  executionMode?: ToolExecutionMode;                    // 覆盖全局执行模式
}
```

它的基类 `Tool<TParameters>` 来自 `@earendil-works/pi-ai`，定义了工具的元数据——`name`（LLM 看到的工具名）、`description`（LLM 决定是否调用时的参考）、`parameters`（TypeBox schema，用于参数定义和校验）。

`AgentTool` 在 `Tool` 的基础上加了：`execute`（实际执行逻辑）、`prepareArguments`（参数兼容处理）、`executionMode`（这个工具是否必须顺序执行）、`label`（给 UI 看的友好名）。

## 事件系统：`AgentEvent`

```typescript
type AgentEvent =
  | { type: "agent_start" }
  | { type: "agent_end"; messages: AgentMessage[] }
  | { type: "turn_start" }
  | { type: "turn_end"; message: AgentMessage; toolResults: ToolResultMessage[] }
  | { type: "message_start"; message: AgentMessage }
  | { type: "message_update"; message: AgentMessage; assistantMessageEvent: AssistantMessageEvent }
  | { type: "message_end"; message: AgentMessage }
  | { type: "tool_execution_start"; toolCallId: string; toolName: string; args: any }
  | { type: "tool_execution_update"; toolCallId: string; toolName: string; args: any; partialResult: any }
  | { type: "tool_execution_end"; toolCallId: string; toolName: string; result: any; isError: boolean };
```

事件层次：

```
agent_start
  └── turn_start
       ├── message_start      （assistant 回复开始）
       │    └── message_update （流式更新，可能多次）
       ├── message_end        （assistant 回复结束）
       ├── tool_execution_start （工具开始执行）
       │    └── tool_execution_update （工具进度更新，可选）
       └── tool_execution_end （工具执行结束）
       └── （可能还有更多工具调用）
  └── turn_end
  └── （可能还有更多 turn）
agent_end
```

## Agent 的生命周期层次

**一个常见误解**：以为一次 `prompt()` = 一次 LLM 往返。

实际上，Agent 的生命周期是嵌套的：

```
Agent 实例的整个生命周期
├── prompt("写个服务器")        ← Run 1
│   ├── agent_start
│   │   ├── turn_start          ← Turn 1（LLM 请求）
│   │   │   └── tool call (读文件)
│   │   ├── turn_end
│   │   ├── turn_start          ← Turn 2（再次调 LLM，带上读文件结果）
│   │   │   └── tool call (写文件)
│   │   ├── turn_end
│   │   ├── turn_start          ← Turn 3（写完了，输出结果）
│   │   │   └── 纯文字回复
│   │   └── turn_end
│   └── agent_end               ← Run 1 结束
│
├── prompt("再加个路由")        ← Run 2
│   └── ...
└── prompt("看看数据库")        ← Run 3
```

三个层次：

| 层次 | 对应什么 | 事件边界 |
|------|---------|---------|
| Agent 实例 | 整个程序运行期间，一个 `new Agent()` 对象 | 没有特定事件，就是个状态容器 |
| Run（一次 prompt） | 一次用户输入到最终输出 | `agent_start` → `agent_end` |
| Turn（一轮） | 一次 LLM 调用 + 工具执行 | `turn_start` → `turn_end` |

**为什么一个 Run 有多个 Turn？** 因为 Agent 的核心在执行工具这个环节。纯 API 调用是一次输入一次 LLM 回复就完了，而 Agent 每次"LLM 回复 + 工具执行"就是一个 Turn。所以一次 `prompt()` = 一个 Run = 可能多个 Turn，一个 Turn = 一次 `streamAssistantResponse()` + 执行工具。

代码里的对应关系：

| 概念 | 代码 |
|------|------|
| Run | `agent.ts` 的 `prompt()` 方法 → `runAgentLoop()` |
| Turn | `agent-loop.ts` 的 `streamAssistantResponse()` |
| 一次 LLM 调用 | `streamFn(model, context, options)` → 走 `packages/ai` 层 |
| 工具执行 | `agent-loop.ts` 的 `executeToolCalls()` |

---

# 第 3 章：Agent 循环 — agent-loop.ts

> 对应文件：`packages/agent/src/agent-loop.ts`（约 742 行）

这是 pi 里最重要的文件。它实现了 ReAct 循环的核心逻辑。`agent.ts` 和 `agent-harness.ts` 都是在这个循环外面做封装——加状态管理、事件订阅、session 持久化。

## 入口函数

文件提供了两组入口。`agentLoop()` 开始新消息，`agentLoopContinue()` 从已有 context 继续（比如重试）。二者都返回 `EventStream<AgentEvent, AgentMessage[]>`，外部订阅它来更新 UI。

```typescript
function agentLoop(
  prompts: AgentMessage[],     // 用户输入
  context: AgentContext,       // 当前上下文
  config: AgentLoopConfig,     // 循环配置
  signal?: AbortSignal,        // 中断信号
  streamFn?: StreamFn,         // LLM 调用函数
): EventStream<AgentEvent, AgentMessage[]>
```

## 核心循环：`runLoop()`

`runLoop()` 是真正的心脏，约 100 行，但结构非常紧凑。

### 两层循环结构

```
while true（外层：follow-up 消息检查）
│
└── while hasMoreToolCalls OR pendingMessages.length > 0（内层：Turn 迭代）
    │
    ├── 有 pendingMessages？→ 注入到 context
    ├── streamAssistantResponse() → 调 LLM → AssistantMessage
    ├── error/aborted？→ 直接返回
    ├── 有 toolCall？→ executeToolCalls() → 结果塞回 context
    ├── prepareNextTurn（可选：换模型，换上下文）
    └── shouldStopAfterTurn？→ 退出内层
    │
    └── （内层结束，检查 steering 队列）
    │
└── 检查 followUp 队列
    └── 有？→ 丢进 pendingMessages → continue 外层
    └── 没？→ break → agent_end
```

### 为什么需要两层？

**内层循环**（`while hasMoreToolCalls`）：处理同一个 prompt 里的多次工具调用迭代。

```
用户：部署这个项目
  Turn 1：LLM → "先看看 package.json" → read_file
  Turn 2：LLM → "跑 npm install" → execute_command
  Turn 3：LLM → "部署好了"
  → hasMoreToolCalls = false，内层结束
```

**外层循环**（`while true`）：内层结束后检查有没有 follow-up 消息。Agent 正常跑完了，检查 followUpQueue，有消息就重新进内层，没消息就 break 结束。

没有外层循环的话，steer/followUp 机制就实现不了。

### pendingMessages 到底是什么？

`pendingMessages` 是一个**通用管道**，steer 和 followUp 在不同时机往里倒。

```
外层循环开头
pendingMessages = getSteeringMessages()      → 装的是 steer

进入内层循环
┌───────────────────────────────────────────────┐
│ 内层循环每轮迭代开始                           │
│ pendingMessages → 注入到 context               │
│ pendingMessages = []                           │
│                                               │
│ streamAssistantResponse() → 调 LLM            │
│ executeToolCalls() → 执行工具                   │
│ turn_end                                      │
│                                               │
│ pendingMessages = getSteeringMessages()        │
│  ↑ 又装的是 steer                             │
│                                               │
│ 继续（如果有 tool call 或还有 pendingMessages）  │
└───────────────────────────────────────────────┘

内层循环结束（没 tool call + 没 steer 了）
  ↓
外层循环
  followUpMessages = getFollowUpMessages()
  if (有 followUp?) {
    pendingMessages = followUpMessages   ← 现在装的是 followUp
    continue                             ← 重新进内层循环
  }
```

| 位置 | pendingMessages 装什么 | 来源 |
|------|----------------------|------|
| 外层循环开头 | steer | `getSteeringMessages()` |
| 内层循环每轮结束后 | steer | `getSteeringMessages()` |
| 外层循环（内层结束后） | followUp | `getFollowUpMessages()` |
| 下次重进内层循环时 | 上面装的 followUp | 被注入到 context |

**内层循环条件 `while (hasMoreToolCalls || pendingMessages.length > 0)`** 的含义是：即使没有工具调用了，如果有 steer 消息还没注入，内层循环也要继续跑——它要把 steer 消息喂给 LLM 再说。

## `streamAssistantResponse()` — 一次 LLM 调用

每个 Turn 的核心：调 LLM 并处理事件流。

```typescript
async function streamAssistantResponse(
  context: AgentContext,
  config: AgentLoopConfig,
  signal: AbortSignal | undefined,
  emit: AgentEventSink,
  streamFn?: StreamFn,
): Promise<AssistantMessage>
```

调用流程：

```
context.messages
  │
  ▼
config.transformContext(messages)  预处理（可选，AgentMessage[] → AgentMessage[]）
  │
  ▼
config.convertToLlm(messages)      格式转换（AgentMessage[] → Message[]）
  │
  ▼
streamFn(model, llmContext, options)  调 LLM
  │
  ▼
逐帧处理事件流：
  start         → 初始化 partialMessage，push 到 context，emit message_start
  text_delta    → 更新 partialMessage，emit message_update
  toolcall_delta  → 更新 partialMessage，emit message_update
  thinking_delta  → 同上
  done/error    → 拿到 finalMessage，更新 context，emit message_end
```

关键设计：**事件流和 context 保持同步**。收到 `start` 时就把 partial message 塞进 context，收到 `text_delta` 时原地更新。这样即使 stream 中途被 abort，context 里也有一条不完整的消息，比什么都没有好。

## `executeToolCalls()` — 工具执行

```typescript
async function executeToolCalls(
  currentContext: AgentContext,
  assistantMessage: AssistantMessage,
  config: AgentLoopConfig,
  signal: AbortSignal | undefined,
  emit: AgentEventSink,
): Promise<ExecutedToolCallBatch>
```

执行模式选择：如果任何一个工具声明了 `executionMode: "sequential"`，所有工具都退化成顺序执行，不混合。

### 顺序执行

```typescript
for (const toolCall of toolCalls) {
  emit tool_execution_start
  prepareToolCall() → 参数校验 + beforeToolCall 钩子
  executePreparedToolCall() → 实际执行
  finalizeExecutedToolCall() → afterToolCall 钩子
  emit tool_execution_end
  emit tool_result message
  if (aborted) break
}
// 所有结果一次性塞回 context
```

简单粗暴，一个一个来。同一个 batch 里的工具不会看到彼此的上下文（因为 context 在外部更新）。

### 并行执行

```typescript
for (const toolCall of toolCalls) {
  emit tool_execution_start
  prepareToolCall()  // 参数校验（顺序执行，不并发）

  if (工具可以立刻返回？比如 block) {
    直接 finalized，emit tool_execution_end
    continue
  }

  finalizedCalls.push(async () => {
    executePreparedToolCall()
    finalizeExecutedToolCall()
    emit tool_execution_end
    return finalized
  })
}

// 并发等所有工具完成
const results = await Promise.all(finalizedCalls);
// 按原始调用顺序创建 ToolResultMessage
```

关键细节：`prepareToolCall`（参数校验 + beforeToolCall 钩子）是顺序执行的，工具实际执行是并发的，`tool_execution_end` 事件按完成顺序 emit，但工具结果消息按原始调用顺序排列。

### 执行一个工具的完整生命周期

```
prepareToolCall()
├── validateToolArguments()    → 参数校验（TypeBox schema）
├── beforeToolCall 钩子        → 拦截机会
│   └── block？→ 直接返回错误（不执行）
│
executePreparedToolCall()     → 实际调用 tool.execute()
│
finalizeExecutedToolCall()
├── afterToolCall 钩子         → 结果后处理
│   └── 可以替换 content / details / isError
├── 组装最终结果
│
emit tool_execution_end
emit tool_result message
```

### `hasMoreToolCalls` 的语义

```typescript
hasMoreToolCalls = !executedToolBatch.terminate;
```

- 这个 batch 里的工具都没设 `terminate: true` → 继续内层循环（再调 LLM）
- **所有**工具都设了 `terminate: true` → 退出内层循环，检查 follow-up

## Streaming / Steering / Follow-up 的完整关系

### 场景演示

```
时间 →
Run（一次 prompt）
│
│  Turn 1
│  ├── streamAssistantResponse()
│  │    ├── 收到 text_delta: "好，我先看看"        ← Streaming
│  │    ├── 收到 toolcall_delta: read_file         ← Streaming
│  │    └── message_end
│  ├── executeToolCalls(read_file)
│  ├── turn_end
│  │    └── 检查 steering ← ❶ 此时 steer("别动 src")
│  │
│  Turn 2（有 tool call，继续）
│  ├── [注入 steer 消息]                           ← Steering 生效
│  ├── streamAssistantResponse()
│  ├── executeToolCalls(write_file)
│  ├── turn_end
│  │
│  Turn 3（没工具调用了）
│  ├── streamAssistantResponse()
│  │    └── 纯文字回复："写好了"
│  └── turn_end
│       └── 没 steering 了
│       └── 检查 followUp ← ❷ 此时 followUp("再加个路由")
│
│  Turn 4（follow-up 触发的额外一轮）                ← Follow-up 生效
│  └── ...
│
└── agent_end
```

### 三个概念的区别

| 概念 | 什么时候发生 | 对应代码 | 通俗理解 |
|------|-------------|---------|---------|
| Streaming | 每次调 LLM，数据返回过程中 | `streamAssistantResponse()` 里的事件循环 | "数据一滴一滴流过来，不等整杯水满了才倒" |
| Steering | Run 还没结束，Agent 正在工作中 | 内层循环每轮检查 `getSteeringMessages()` | "Agent 正干着活，你插嘴纠正它" |
| Follow-up | Run 本该结束了，还有后续任务 | 外层循环检查 `getFollowUpMessages()` | "Agent 干完了，你追加任务让它继续" |

### steer / followUp / 再次 prompt 的区别

**能不能用？**

```typescript
// ✅ Agent 繁忙时也能调（只是往队列里扔消息）
agent.steer("别用 Express");
agent.followUp("再加个路由");

// ❌ Agent 繁忙时报错（prompt 检查 activeRun）
agent.prompt("再来一个");
```

**触发时机：**

```
时间 →
Run（一次 prompt）
├── Turn 1（有 tool call）
├── turn_end → 检查 steering ← ❶ steer 在这里取走
├── Turn 2（有 tool call）
├── turn_end → 检查 steering ← ❷ 继续取 steer
│               内层结束
├── 外层 → 检查 followUp ← ❸ followUp 在这里取走
├── Turn 3（followUp 触发）
└── agent_end
                                  ← ❹ 此时才能调 prompt()
```

**用户输入的文本是一样的，系统怎么区分？** 用户按 Enter 时调用 `steer()`（立即干预），按 Alt+Enter 时调用 `followUp()`（等做完再处理）。这是个 UI 层的行为设计，用户不需要理解底层 API，只需要理解"Enter = 立刻说，Alt+Enter = 等会再说"。

**总结对比：**

| | steer | followUp | 第二次 prompt |
|------|-------|---------|-------------|
| Agent 状态 | 运行中 | 运行中 | 空闲 |
| 是否新 Run | 否 | 否 | 是 |
| 调用时机 | Run 中任意时刻 | Run 中任意时刻 | 等上一个 Run 结束 |
| 消费时机 | 下个 Turn 开始前 | 当前 Run 要结束时 | 立即（新 Run） |
| 适合场景 | 中途纠正/干预 | 追加任务 | 完成后的新对话 |

---

# 第 4 章：Agent 类封装 — agent.ts

> 对应文件：`packages/agent/src/agent.ts`（约 557 行）

`agent-loop.ts` 里的 `runLoop()` 是一个纯函数——传入 context，传出事件，不持有任何状态。`agent.ts` 的 `Agent` 类把它包装成有状态的对象：

```
runLoop（纯函数）              Agent（状态封装）
─────────────────          ─────────────────────
不持有状态                   持有 state（messages、tools）
无事件订阅                   有 subscribe() 事件系统
steer/followUp 由           steer/followUp 队列
  外部 config 提供          内建在 Agent 里
一次调用，运行完就结束        可多次 prompt()，消息自动累积
```

## 构造配置

```typescript
class Agent {
  constructor(options: AgentOptions) {
    this._state = createMutableAgentState(options.initialState);
    this.convertToLlm = options.convertToLlm ?? defaultConvertToLlm;
    this.streamFn = options.streamFn ?? streamSimple;
    this.steeringQueue = new PendingMessageQueue(options.steeringMode ?? "one-at-a-time");
    this.followUpQueue = new PendingMessageQueue(options.followUpMode ?? "one-at-a-time");
    // ...
  }
}
```

`AgentOptions` 几乎是 `AgentLoopConfig` 的超集——因为 Agent 类内部会创建 `AgentLoopConfig`，把外部传进来的选项映射过去。

## 核心 API

### 状态访问

```typescript
get state(): AgentState {
  return this._state;
}
```

外部通过 `agent.state` 读取状态（只读视图）。`tools` 和 `messages` 用了 getter/setter，赋值时自动复制数组，防止外部修改内部数组引用。

### 事件订阅

```typescript
subscribe(listener: (event: AgentEvent, signal: AbortSignal) => void): () => void {
  this.listeners.add(listener);
  return () => this.listeners.delete(listener);  // 返回取消订阅函数
}
```

监听器接收 `AgentEvent` 和当前 Run 的 `AbortSignal`。返回一个函数，调用即取消订阅。

### 队列管理

```typescript
steer(message)      → steeringQueue.enqueue(message)
followUp(message)   → followUpQueue.enqueue(message)

clearSteeringQueue()
clearFollowUpQueue()
clearAllQueues()

hasQueuedMessages()
```

这些方法**不检查 agent 是否繁忙**，任何时候都能调。队列消息在 `runLoop` 的 `getSteeringMessages` / `getFollowUpMessages` 回调中被消费。

### Run 生命周期

`prompt()` 开始新对话时会检查 `activeRun`，如果已经在运行就报错（提示用 steer/followUp）。字符串输入会被包装成 `{ role: "user", content: [{ type: "text", text: input }] }` 的 AgentMessage。

`continue()` 的逻辑体现了"什么情况下能继续"：

| 最后一条消息类型 | 能 continue？ | 行为 |
|----------------|--------------|------|
| assistant | 不能直接继续 | 但如果有队列消息，转成新 prompt |
| user / toolResult | 能 | 直接调 `runAgentLoopContinue()` |

`abort()` 通过 `AbortController.abort()` 中断当前 Run。`waitForIdle()` 返回一个 Promise，阻塞直到当前 Run 结束（包括 `agent_end` 的监听器执行完毕）。

## 连接 runLoop

Agent 类把外部配置转换成 `runLoop` 需要的 `AgentLoopConfig`：

```typescript
private createLoopConfig(options): AgentLoopConfig {
  return {
    model: this._state.model,
    reasoning: ...,
    convertToLlm: this.convertToLlm,
    transformContext: this.transformContext,
    getApiKey: this.getApiKey,
    getSteeringMessages: async () => {
      if (skipInitialSteeringPoll) { ... }
      return this.steeringQueue.drain();
    },
    getFollowUpMessages: async () => this.followUpQueue.drain(),
  };
}
```

关键点：`getSteeringMessages` 和 `getFollowUpMessages` 直接连到 Agent 内部的队列。

## 事件处理和错误恢复

每一帧 AgentEvent 到了 Agent 层，先更新内部状态（`isStreaming`、`streamingMessage`、`pendingToolCalls`、`messages`），然后广播给订阅者。

`runLoop` 跑出异常时，Agent 不会让程序崩溃，而是：

1. 构造一条 `stopReason: "error"` 的 AssistantMessage
2. 手动触发完整的事件序列（message_start → message_end → turn_end → agent_end）
3. 保证监听器总是能收到完整的生命周期事件

## 完整的一次 prompt() 调用链

```
agent.prompt("写个服务器")
  │
  ├── 检查 activeRun → 有？报错
  ├── normalizePromptInput → 包装成 AgentMessage[]
  ├── runPromptMessages(messages)
  │   ├── runWithLifecycle(executor)
  │   │   ├── AbortController 创建 → activeRun 赋值
  │   │   ├── this._state.isStreaming = true
  │   │   └── executor(signal)
  │   │       └── runAgentLoop(messages, context, loopConfig, processEvents, signal, streamFn)
  │   │           └── runLoop()  ← 进入 agent-loop.ts
  │   │               ├── 事件 → processEvents → 更新 state + 广播
  │   │               └── loop 结束后返回
  │   └── runWithLifecycle finally 块
  │       ├── finishRun() → isStreaming = false, activeRun = undefined
  │       └── activeRun.resolve() → waitForIdle 解除阻塞
```

---

# 第 5 章：高阶封装 — AgentHarness

> 对应文件：`packages/agent/src/harness/agent-harness.ts`（约 995 行）

`AgentHarness` 是 pi 框架中最完整的封装层。它把之前学的所有东西整合在一起：Session 管理、资源管理（Skill / PromptTemplate）、工具注册、钩子系统（14+ 个钩子）、队列、请求生命周期。

## Agent vs AgentHarness 对比

| | Agent | AgentHarness |
|------|-------|-------------|
| Session 持久化 | 无 | 有（自动写入 JSONL） |
| 工具管理 | 传数组 | 注册/启用/禁用 |
| 钩子 | 6 个 | 14+ 个（含 compaction / tree / 请求钩子） |
| Skill | 无 | 有（注入 system prompt） |
| Compaction | 无 | 有 |
| 环境 | 无 | ExecutionEnv（可 mock） |
| 队列 | steer / followUp | steer / followUp + nextTurn |

## 扩展事件

AgentHarness 在 `AgentEvent` 基础上新增了这些事件：

- `queue_update`：steer / followUp 队列变化时
- `save_point`：每轮 Turn 结束后（持久化检查点）
- `model_select` / `thinking_level_select`：模型/推理切换
- `session_before_compact` / `session_compact`：Compaction 生命周期
- `before_provider_request` / `before_provider_payload` / `after_provider_response`：请求生命周期
- `resources_update`：Skill / PromptTemplate 更新
- `abort` / `settled`：中断和完全停止

## 钩子系统

钩子分两种：无返回值的（只通知，如 `after_provider_response`、`model_select`）和有返回值的（可以修改行为，如 `tool_call` 可以 block、`tool_result` 可以修改内容）。

完整的钩子列表：

| 钩子 | 触发时机 | 返回值作用 |
|------|---------|-----------|
| `before_agent_start` | 每次 prompt 开始前 | 可以修改初始消息和 system prompt |
| `context` | 消息进入 LLM 前 | 可以修改 context |
| `before_provider_request` | 发 HTTP 请求前 | 可以修改 stream options |
| `before_provider_payload` | 请求体序列化前 | 可以修改 payload |
| `after_provider_response` | 响应头收到后 | 仅通知 |
| `tool_call` | 工具执行前 | 可以 block 工具执行 |
| `tool_result` | 工具执行后 | 可以修改结果内容/标记 error/terminate |
| `session_before_compact` | compaction 前 | 可以取消或提供自定义总结 |
| `session_compact` | compaction 完成后 | 仅通知 |
| `session_before_tree` | 分支/树导航前 | 可以取消或提供自定义摘要 |
| `session_tree` | 分支/树导航后 | 仅通知 |

## Turn 生命周期

每个 Turn 开始前，`createTurnState()` 重建上下文快照：

1. 从 Session 构建 context（加载 JSONL 中的消息）
2. 获取当前资源（Skills / PromptTemplates）
3. 获取启用的工具列表
4. 构建 System Prompt（可以是字符串或动态函数，支持注入 Skill）

`prepareNextTurn` 在每轮结束后重建上下文，这意味着 Session 新写入的消息会被加载、新的 Skill 配置会被注入、新的工具启用/禁用状态会生效。

## Session 持久化

AgentHarness 通过 `handleAgentEvent()` 自动持久化消息：

```typescript
private async handleAgentEvent(event: AgentEvent): Promise<void> {
  if (event.type === "message_end") {
    await this.session.appendMessage(event.message);  // 写入 Session
    await this.emitAny(event);                        // 广播给订阅者
  }
  if (event.type === "turn_end") {
    await this.emitAny(event);
    await this.flushPendingSessionWrites();           // 批量写入
    await this.emitOwn({ type: "save_point", hadPendingMutations });
  }
}
```

`flushPendingSessionWrites()` 处理多种写入类型：消息（message）、模型切换（model_change）、推理级别切换（thinking_level_change）、自定义条目（custom / custom_message）、标签（label）、会话名（session_info）、叶节点标记（leaf）。

---

# 第 6 章：上下文压缩 — Compaction

> 对应文件：`packages/agent/src/harness/compaction/compaction.ts`（约 755 行）

## 问题

Agent 对话越来越长，LLM 的上下文窗口是有限的（比如 200k tokens）。对话太长了就会越界——要么截断丢信息，要么直接报错。

## 思路

不是截断，而是总结——把早期对话用 LLM 总结成一段摘要，用摘要替换掉原始消息。

```
压缩前：
 [消息 1]  用户：帮我写个服务器
 [消息 2]  Assistant：看看目录
 [消息 3]  ToolResult：（2000 字目录内容）
 …（100 条消息，190k tokens）

压缩后：
 [摘要]   用户开发 Express 服务器。已完成项目初始化、
          路由定义和数据库连接。关键文件：app.ts, routes/users.ts
 [消息 98] 最近的操作
 [消息 99] 最近的工具结果
 …（20 条消息，35k tokens——关键信息全在）
```

## 触发条件

```typescript
function shouldCompact(contextTokens, contextWindow, settings): boolean {
  if (!settings.enabled) return false;
  return contextTokens > contextWindow - settings.reserveTokens;
}
```

默认配置：`reserveTokens: 16384`（为 summary prompt 和输出预留），`keepRecentTokens: 20000`（保留最近的 token 数）。

举例：模型窗口 200k，预留 16k。当 context 超过 184k tokens 时触发 compaction，压缩后保留最近 20k tokens 的完整消息。

## 寻找切割点

压缩不是随便从中间一刀切，`findValidCutPoints()` 确定合法切割点——不能切在 ToolResult 中间，因为工具调用和结果是对，不能分开。

`findCutPoint()` 从后往前累加 token，直到达到 `keepRecentTokens`（20k），然后找到最接近的合法切割点。如果切在了一个 Turn 的中间（不是正好从一条 user 消息开始），会标记 `isSplitTurn = true`，需要把 Turn 的前半部分单独总结。

## 执行总结

pi 用结构化模板让 LLM 做总结：

```
## Goal
[用户想做什么？]

## Constraints & Preferences
[约束和偏好]

## Progress
### Done
- [x] [已完成的任务]
### In Progress
- [ ] [正在进行的工作]

## Key Decisions
- **[决策]**：[理由]

## Next Steps
1. [下一步做什么]

## Critical Context
[继续工作所需要的关键信息]
```

第二次压缩时，LLM 使用增量更新模式——看到"旧摘要 + 新消息"，在旧摘要上追加，而不是从头重写。

如果切割了 Turn：`compact()` 会并行执行两个总结——历史总结和 Turn 前半部分总结——然后把两段合并。

最后附加文件操作信息（哪些文件被读过、哪些被改过），让后续 LLM 知道项目的文件影响范围。

## Token 估算

pi 用保守的启发式方法估算 token（`chars / 4`），而不是精确的 tokenizer。因为精确 tokenizer 需要加载每个模型的分词器（依赖多、慢），而 compaction 的阈值本身就有余量（预留 16k tokens），估算误差在可接受范围内。

## Compaction 之后

压缩后，Session 中插入一条 CompactionEntry。后续 Turn 从 Session 重建 context 时，之前的详细消息被摘要替代，context 大幅缩小。

Agent 看到 CompactionSummary 消息，就像人类看到一个"会议纪要"——知道之前发生了什么，不需要重新看每一句话。

---

# 第 7 章：应用层 — coding-agent

> 对应目录：`packages/coding-agent/src/`

前面学的 `packages/agent` 是 Agent 框架本身。`packages/coding-agent` 是用这个框架搭出来的一个产品——一个终端里的 Coding Agent。

## 入口启动流程

`main.ts` 是入口：

1. 解析 CLI 参数（命令、模式、文件、模型）
2. 创建基础设施：AuthStorage（认证）、ModelRegistry（模型注册）、SettingsManager（设置）、SessionManager（会话）、ResourceLoader（资源）
3. 选择运行模式：`--mode rpc` → RPC 服务，`--mode print / -p` → 一次性输出，默认 → 交互式 TUI
4. 创建 `AgentSession`（核心胶水层），注册工具，构建 System Prompt
5. 发送初始消息（如果有 `-p` 或 `@file`）

## 三种运行模式

**交互式模式**（`modes/interactive/interactive-mode.ts`，约 5500 行）是最复杂的模式。用 pi-tui 库构建终端 UI，支持实时渲染消息列表、多行输入框、历史记录、Enter/Alt+Enter 区分 steer/followUp、slash 命令和 bash 命令。

**Print Mode**（`modes/print-mode.ts`，约 158 行）是最简单的模式：启动 Agent → 发送消息 → 等 Agent 完成 → 输出最终结果到 stdout → 退出。用于脚本、管道、CI/CD 集成。

**RPC Mode**（`modes/rpc/`）把 Agent 封装成 JSON over stdio 的 RPC 服务，供编辑器插件（VSCode、Vim）等外部集成使用。

## 工具实现

`core/tools/` 目录下实现了 7 个工具：

| 工具 | LLM 看到的名字 | 功能 |
|------|---------------|------|
| Read | `read` | 读文件内容（支持分页） |
| Bash | `bash` | 执行终端命令 |
| Edit | `edit` | 查找替换编辑文件 |
| Write | `write` | 写入文件 |
| Grep | `grep` | 搜索文件内容 |
| Find | `find` | 查找文件路径 |
| Ls | `ls` | 列出目录 |

每个工具都返回 `AgentTool`，参数用 TypeBox schema 描述。工具注册在 `sdk.ts` 里，工具列表传给 Agent 构造函数，Agent 把它放到 `AgentContext.tools` 里，每次 LLM 调用时 tools 被序列化成 function calling schema。

## System Prompt 构建

`buildSystemPrompt()` 组装：时间信息、工具说明、工作目录、可用工具列表、提示指南、项目上下文文件（AGENTS.md 等）、Skills、自定义附加内容。这个 prompt 在 `agent-harness.ts` 的 `createTurnState()` 中被动态构建，每个 Turn 可能会重新构建。

## AgentSession — 胶水层

`agent-session.ts` 是连接 Agent 框架和 UI 模式的胶水层。所有模式都共用它。

AgentSession 在 AgentHarness 的基础上加了：扩展命令（`/create`、`/search` 等）、Bash 执行器（`!` 命令）、Compaction 自动触发、Session 分支/切换、模型切换 UI。

## 完整调用链

```
用户输入 "帮我写个 RPC 服务"
  │
  ▼
interactive-mode.ts（onSubmit）
  │  检查 isStreaming？空闲 → session.prompt()
  ▼
agent-session.ts（prompt）
  │  检查 isStreaming？空闲 → agent.prompt()
  ▼
agent.ts（Agent.prompt）
  │  包装成 AgentMessage，调用 runAgentLoop
  ▼
agent-loop.ts（runLoop）
  │  进入 ReAct 循环
  │
  ├──── Turn 1
  │     streamAssistantResponse() → 调 LLM
  │       System Prompt 包含：工具定义、操作指南
  │     LLM 返回：read_file("package.json")
  │     executeToolCalls → 读文件
  │
  ├──── Turn 2
  │     streamAssistantResponse()
  │     LLM 返回：write_file("rpc-server.ts", ...)
  │     executeToolCalls → 写文件
  │
  └──── Turn 3
        streamAssistantResponse()
        LLM 纯文字回复："已创建 rpc-server.ts"
  │
  ▼
事件 → interactive-mode（UI 渲染）
```

## 框架层 vs 应用层

| | packages/agent（框架） | packages/coding-agent（应用） |
|------|----------------------|-----------------------------|
| 关心什么 | 循环、状态、事件 | 工具注册、UI、session 管理 |
| 工具 | 定义 AgentTool 接口 | 实现具体工具 |
| System Prompt | 只是一个字符串字段 | buildSystemPrompt() 构建完整 prompt |
| Session 管理 | 无 | 持久化到 JSONL 文件 |
| 扩展 | 无 | 插件系统 |
| 用户界面 | 无 | 三种模式 |

---

# 总结：从一问一答到复杂任务的完整进化路径

本文从头到尾拆解了一个生产级 Agent 是怎么从"纯 API 调用"一层一层叠加出来的。这个进化路径可以浓缩为一张表：

```
第 0 步：纯 API 调用          一问一答，只说话不做事
第 1 步：+ Tool Calling       能调用函数，但一次只能一步
第 2 步：+ ReAct 循环         自动迭代，多次工具调用，LLM 自己决定下一步
第 3 步：+ Agent 类封装       状态管理、事件系统、错误恢复
第 4 步：+ Steer / FollowUp   运行时可干预，从旁观到协作
第 5 步：+ Session 持久化     对话不丢，重启恢复
第 6 步：+ Compaction         超长对话，上下文压缩，可跑数天
第 7 步：+ 具体工具 + UI      从框架到完整产品
```

每一层解决一个问题，每一层站在上一层的肩膀上。ReAct 循环让 LLM 从"被动的回答者"变成了"主动的执行者"，Agent 类让它可复用，steer/followUp 让用户从旁观者变成协作者，Session 和 Compaction 让它能长期持续工作。

pi 的源码展示了这个架构在实际代码中是怎么实现的。它的分层设计——从纯函数 `runLoop()` 到有状态的 `Agent` 再到完整的 `AgentHarness`——异常清晰。每层只关心自己层的事，层与层之间通过事件系统通信。

如果你想自己写一个 Agent——哪怕只是一个简单的 CLI 工具——理解了这个进化路径，就有了一个清晰的起点。
