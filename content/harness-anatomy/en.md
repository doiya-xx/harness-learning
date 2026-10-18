## What is a harness

A harness is the program around the LLM. It owns the agent loop, runs each tool call, and decides what goes into the context window.

## The loop

Every Agent is built on the same loop:

```ts
while (true) {
  const reply = await model.chat(messages)
  if (!reply.toolCalls.length) break
  for (const call of reply.toolCalls) messages.push(await run(call))
}
```

### Tools and permissions

- Each tool has a name, a schema and a handler.
- Each permission check runs before the handler.
- Dangerous actions need approval or a sandbox.

### Streaming

Streaming output lets the UI show progress while the model is still generating tokens.

## Interfaces

| Layer | Transport |
| --- | --- |
| Core | events only |
| Adapter | stdio JSONL or HTTP |

> Keep the core free of any UI code, so a TUI, an IDE and a web page can share it.
