# 小说创作 3a：概念→蓝图→大纲→正文 生成链切片规格

日期：2026-07-02
上位文档：`docs/plans/2026-06-30-novel-creation-migration-plan.md`
本规格对应该文档的**第三阶段**，并将其拆分为 3a / 3b。

## 定位与拆分

6-30 文档的第三阶段是「多版本章节生成」。本规格把它拆成两刀：

- **3a（本规格）**：跑通「一句创意 → 作品蓝图 → 章节大纲 → 逐章生成正文」单版本生成链，验收生成质量。
- **3b（后置）**：在 3a 跑通并验收后，再增量引入多版本草稿（`versions` / `selectedVersionId`）。

原则：先证明调用链，再打磨。3a 不做多版本，不做骨架重构，不做 Bible。

## 现状基线

以下已落地，本切片直接站在其上，不重做：

- 阶段一：本地小说 CRUD、三栏布局、章节编辑器、串行写入队列、崩溃降级、字数统计。
- 阶段二：AI 续写/润色/改写、草稿预览、手动插入/替换、取消、60s 超时。
- AI 管道：`rendererBridge.generateText()` → IPC `api:generate-text` → 主进程 OpenAI 兼容调用，含取消/超时/密钥脱敏。

## 本切片范围

```text
一句创意
  → [AI] 生成作品蓝图（一段）
  → [AI] 生成章节大纲（列表）
  → 用户确认/编辑 → 落成 Chapter[]（仅标题 + outline，正文留空）
  → 逐章：以本章大纲为上下文生成正文 → 草稿预览 → 用户手动插入
```

第四步的"按大纲生成正文"本质是现有续写流程的变体：把喂给模型的上下文从「章节末尾 1500 字」换成「本章大纲（可选叠加已写正文末尾）」，复用同一套草稿预览 / 插入 UX。

## 数据结构改动（最小）

`src/types/novel.ts`：

```ts
interface Novel {
  // 既有字段不变
  idea?: string;        // 新增：一句创意 / 原始灵感
  blueprint?: string;   // 新增：AI 生成的作品蓝图（自由文本）
  version: 2;           // 1 → 2
  // ...
}

interface Chapter {
  // 既有字段不变
  outline?: string;     // 新增：本章大纲（6-30 文档已为阶段三预留）
  // ...
}
```

约束（2026-07-02 架构评审已确认）：

- 只加这三个字段，**不预埋** `versions` / `selectedVersionId` / `bible` / `summary` 链 / `revision` / `chapter.index` / `chapter.status` / `promptHistory`。
- **`Chapter.order` 沿用不改**，不引入 `index` 字段。现有 UI 排序、删除重排都基于 `order`。
- `revision`/`updatedAt` 乐观锁 3a 不加。现有整本替换 + 串行写 + AI 走草稿预览确认已足够；如需防冲突，在确认写回前于 renderer 内比较当前 `activeChapter` 的 `id/content/updatedAt`，不进主进程锁。
- 存储路径、`saveNovel` 串行队列、章节级无 IPC 的边界**保持不变**。

### v1→v2 sanitize 规则（`electron/main/index.ts` `sanitizeNovel`）

```text
id/title/summary/note/chapters/createdAt/updatedAt：保持现有规则
idea：字符串则保留，否则 undefined
blueprint：字符串则保留，否则 undefined
version：返回 2（运行态归一）
chapter.outline：字符串则保留，否则 undefined
chapter.order：继续沿用；非数字则用数组 index 兜底
```

- **空字符串策略**：用户清空 `idea/blueprint/outline` 时保留 `""`，只有**非字符串**才归一为 `undefined`——UI 需区分"没字段"和"用户清空"。
- **关键边界：读取不写回。** `loadNovel`/`listNovels` 不主动保存，打开旧小说不得批量改版落盘；只有用户编辑/生成后走 `saveNovel`，才落盘 `version: 2`。
- Web fallback 的 `isNovel` 校验不得因为 `version: 2` 或缺新字段而过滤掉数据。

## 新增 Prompt

放入 `src/features/novel-creation/novelPrompts.ts`（沿用阶段二的代码内常量方式，**不做 Prompt Registry**——那是续写链跑通后的后续增量）：

- `buildBlueprintPrompt(idea)` — 由一句创意生成作品蓝图。参考迁移源 `concept.md`。
- `buildOutlinePrompt(novel)` — 由蓝图（+ 标题/简介）生成章节大纲列表。参考 `outline_generation.md`。
- `buildChapterFromOutlinePrompt(novel, chapter)` — 以本章大纲为上下文生成正文。参考 `writing.md`。

大纲文本 → `Chapter[]` 采用轻量解析（参考 `chapter_directory_parser` 思路），只提取标题 + 本章大纲，**不建数据库、不上复杂 schema**。解析失败要降级为可编辑文本，不阻断流程。

## UI 落点（不重构骨架）

- 在现有中间栏（小说信息区）新增「生成大纲」入口，或一个轻量向导弹窗承载「创意 → 蓝图 → 大纲确认」三步。
- 生成的章节铺进**现有章节列表**；正文生成复用**现有右侧编辑器 + 草稿预览面板**。
- **不新增 tab、不改三栏结构、不引入世界观/角色卡入口。** 页面结构等章节/大纲规模变大后再自然升级。
- 每一步 AI 结果都走「草稿预览，用户确认后才写回」，与阶段二一致；蓝图/大纲也可编辑后再落库。
- **写回只改目标字段**：蓝图步只改 `idea`/`blueprint`；大纲步只改 `chapters[].title/order/outline` 且 `content: ''`；正文步只改目标章节 `content`。不做整本无关字段重写。

## 验收标准

链路：

- 输入一句创意，能依次产出蓝图、章节大纲，用户可编辑后落成章节列表。
- 逐章能以大纲为上下文生成正文草稿，预览后手动插入，不自动覆盖正文。
- 全链路支持生成中、取消、失败提示、60s 超时（复用现有机制）。
- 大纲解析失败时降级为可编辑文本，不阻断、不崩溃。

数据迁移（QA 重点）：

1. v1 旧小说打开正常，标题、简介、备注、章节正文不丢。
2. **只打开不编辑，磁盘上的 `novel.json` 不得被自动改成 v2。**
3. 编辑旧小说并保存后，`version` 变 2。
4. 缺失 `idea/blueprint/outline` 不崩，UI 显示空态。
5. 非字符串 `idea/blueprint/outline` 被忽略（归一 `undefined`）。
6. 空字符串 `idea/blueprint/outline` 能保存并重启恢复为空（不被转成 `undefined`）。
7. `order` 排序、删除章节后的重排不回归。
8. 不影响续写/润色/改写、生图工作台、资产管理、API 配置。

## 防跑偏约束

3a 阶段**不得**提前实现：

- 多版本草稿 / 版本历史（3b：`versions` / `selectedVersionId`）
- `revision` 乐观锁、`chapter.index`、`chapter.status`、`promptHistory`
- 世界观 / 角色卡 / Bible（阶段四/五）
- 一致性审校 / 评估、`summary` 链（阶段四）
- 伏笔 / 情绪 / 节奏 / 完成度（阶段五）
- RAG / 长上下文记忆 / embedding（阶段六）
- Prompt Registry UI、任务模型路由、7-tab 骨架重构

开始编码前确认：是否仍复用现有 AI 配置与管道、是否避免骨架重构、是否有独立可验收结果、是否未提前引入后续阶段复杂度。

## 建议实施顺序

1. 架构负责人：确认字段扩展、`version` 迁移与 `sanitizeNovel` 兼容策略。
2. 前端工程师：先接 `buildChapterFromOutlinePrompt`（离现有续写最近，最快跑通末端），再向前补蓝图/大纲两步。
3. QA：只复验 3a 链路 + 旧数据迁移，不复验后续阶段。
