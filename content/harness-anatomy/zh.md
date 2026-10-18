## 什么是 harness

Harness 是围绕 LLM 的那层程序。它负责 agent loop，执行每一次 tool call，并决定哪些内容进入上下文窗口。

## 循环

每个 Agent 都建立在同一个循环之上：

```ts
while (true) {
  const reply = await model.chat(messages)
  if (!reply.toolCalls.length) break
  for (const call of reply.toolCalls) messages.push(await run(call))
}
```

### 工具与权限

- 每个工具都有名称、schema 和处理函数。
- 每次权限检查都在处理函数之前运行。
- 危险操作需要审批或沙箱。

### 流式输出

流式输出让界面可以在模型仍在生成 token 时显示进度。

## 接口层

| 层 | 传输方式 |
| --- | --- |
| 核心 | 仅事件 |
| 适配层 | stdio JSONL 或 HTTP |

> 让核心不含任何 UI 代码，这样 TUI、IDE 和网页就能共用它。
