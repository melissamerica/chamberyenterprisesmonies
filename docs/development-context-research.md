# Reliable development context — research and project application

November 1, 2026. This is research and an operating procedure, not an implemented custom AI service or a promise of perfect memory.

## Answer

A private or self-hosted model is not necessary merely to maintain this project's development context. Privacy controls where data is processed; it does not by itself provide durable knowledge, resolve conflicting instructions, or force an agent to consult the right source. A custom development assistant could automate those checks, but building one introduces another software product to maintain and should not be the first response to failures to use already-available records.

## Findings from primary sources

- Anthropic describes context as finite and documents declining recall as context grows. Its recommended mechanisms include carefully curated context, source retrieval, structured persistent notes, compaction and bounded specialist investigations. Adding all source and all chat history to every turn is not equivalent to understanding them. Source: https://www.anthropic.com/research/effective-context-engineering-for-ai-agents
- Anthropic's long-running coding-agent research explicitly says compaction alone is insufficient. Durable feature/progress artifacts, incremental tasks and end-to-end tests help sessions resume accurately and avoid false completion claims. Consistent long-running behavior remains an open problem, not solved merely by choosing a frontier model. Source: https://www.anthropic.com/research/effective-harnesses-for-long-running-agents
- OpenAI's file-search documentation describes semantic and keyword retrieval over uploaded knowledge. This offers a way to supply changing project facts without asking a model to memorize the entire project internally. Retrieval still needs relevant sources and verification; availability of a file does not establish that its contents were applied. Source: https://developers.openai.com/api/docs/guides/tools-file-search
- Lovable supports project Knowledge and editable project/user Memory. This project also has source-held instructions and decision records. These mechanisms already exist; the current failure is partly their inaccurate or inconsistent use, not absence of storage. Platform knowledge consulted November 1, 2026.

## Procedure for this project

1. Keep Melissa's explicit decisions in the official answer record and durable memory. Do not recast an objection as approval of a different rule.
2. Keep source-era instructions intact as historical evidence; mark superseded guidance in current navigation/instructions rather than deleting the original handoff.
3. Maintain a detailed action inventory with exact source references: trigger, inputs, review gates, writes, outputs, failure handling and verification status.
4. Separate reachable current behavior, staged implementation, documented intent and observed runtime behavior. A product-page preview is not a working integration; a test declaration is not a test run.
5. Before proposing a question or change, retrieve that action's current implementation and settled decisions. State the existing behavior and the concrete unresolved choice. Do not ask Melissa to reconstruct known behavior or introduce hypothetical scope.
6. Preserve app behavior during this review. Any structural cleanup requires a separately approved, bounded step and a relevant regression check.
7. Refresh only the affected inventory when code or decisions change; do not repeatedly charge for rediscovering the whole app.

## Limits

This process improves continuity but cannot guarantee perfect adherence. An auditable source reference and a behavior check are stronger evidence than an assertion that the agent has permanently learned everything. No custom model, vector store, extra service or AI-training pipeline is authorized by this research.