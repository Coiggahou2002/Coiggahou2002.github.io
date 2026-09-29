# No Vector DB, Just a 25KB Index: Inside Claude Code's Memory System

- Author: Rory Cai (https://coiggahou2002.github.io/)
- Published: 2026-09-29 (Asia/Shanghai; 2026-09-29T12:30:00.000Z)
- Language: en
- Canonical: https://coiggahou2002.github.io/blogs/claude-code-memory/

There's a directory on my laptop:

```
$ ls ~/.claude/projects/-Users-rory-dev-impl/memory/ | cut -d_ -f1 | sort | uniq -c
  58 feedback
  52 project
  12 reference
   2 user
   1 MEMORY.md
```

Claude Code wrote every one of these itself, after I corrected it — or told it that it got something right.

That's the whole of Claude Code's long-term memory.\
**No vector database. No embeddings. No classifier.**\
A pile of Markdown, one index file, and a paragraph of system prompt.

I read the 3,000-odd lines of memory-related code in the Claude Code source that leaked in March 2026, then ran some numbers over my own session logs. One number stopped me:

**Across 501 sessions that had memory loaded, the model opened a memory file 15 times.**

Here's the whole thing on one page. Solid boxes run on my machine; dashed boxes exist in the source but are switched off by a remote flag.

![How Claude Code's memory works](/images/posts/claude-code-memory-mechanism.png)

These are the flag values cached on my machine (in `~/.claude.json`):

```json
"tengu_passport_quail": false,        // background memory extraction
"tengu_moth_copse":     false,        // Sonnet-selected recall
"tengu_onyx_plover":    { "enabled": false, "minHours": 24, "minSessions": 3 }  // autoDream
```

> The source is the 2026-03-31 leak (npm 2.1.88). My machine runs 2.1.281. Every "on my machine" number below was measured on 2.1.281; where the two versions disagree, I say so.

## 1. Writing: the detector is the model

There is no code in Claude Code that detects "the user is correcting me."

The system prompt has a `# Memory` section. It tells the model where memories live, what the four types are (`user` / `feedback` / `project` / `reference`), and when to save each. The model decides on its own, then calls the ordinary Write tool.

One line in the definition of `feedback` is worth stealing: **save corrections *and* confirmations.** The older prompt spells out why — if you only record what went wrong, the model avoids past mistakes but slowly drifts away from approaches the user already signed off on, and gets more and more timid.

**Background extraction (off on my machine)**

The main agent will miss things, so there's a safety net. Simplified:

```ts
// query/stopHooks.ts — when the loop ends on a reply with no tool calls
if (feature('EXTRACT_MEMORIES') && !agentId && isExtractModeActive())
  void executeExtractMemories(ctx)                 // fire-and-forget

// services/extractMemories/extractMemories.ts
if (hasMemoryWritesSince(messages, cursor)) return advance(cursor)  // main agent already wrote → skip
if (++turnsSince < N) return                       // every N turns; N is remote config (I get 7)
runForkedAgent(...)                                // fork the conversation, share the prompt cache
```

Three nice choices here. The fork shares the parent's prompt cache, so the extra pass barely pays for context again. A cursor guarantees the same stretch of conversation is never extracted twice. And the throttle lives in remote config, so it can be tuned without a release.

I traced all 97 of my feedback files back to the session that created them. Of the 65 I could trace, every single one was written by the main agent, in the moment, with Write.

**Two details you only see on a live machine**

What the model writes and what lands on disk aren't the same. The frontmatter gets extra fields (new in 2.1.281, not in the leaked source):

```diff
 name: feedback-transient-tool-failure-not-a-handoff
 description: On transient tool failures, retry — don't hand "continue" back to me
 metadata:
+  node_type: memory
   type: feedback
+  originSessionId: a0cb5a28-…
+  modified: 2026-09-28T07:25:27.008Z     ← 7ms after the Write call
```

And the memory directory is keyed on the git root, not the working directory (`memdir/paths.ts:199`):

```
~/dev/impl                          main checkout
~/dev/impl/.claude-worktrees/a      worktree
~/dev/impl/.claude-worktrees/b      worktree
                 ↓ all read and write the same place
~/.claude/projects/-Users-rory-dev-impl/memory/
```

I've run 274 sessions in worktrees of that repo. 193 of them saved a system-prompt snapshot, and all 193 point at that one directory.

## 2. Storage: one fact per file, plus an index

Here's a real feedback memory of mine (trimmed, translated from Chinese):

```markdown
---
name: feedback-transient-tool-failure-not-a-handoff
description: On transient tool failures, retry — don't hand "continue" back to me
metadata:
  type: feedback
---
When a tool call fails transiently, retry it yourself. Don't hand "continue" back to the user.

**Why:** A transient failure isn't a decision he needs to make…
**How to apply:** If the error says it's retryable, retry in the same turn…
```

The **Why** is there so the model can handle edge cases the rule doesn't cover, instead of applying it blindly.

After writing the file, the model appends a pointer to `MEMORY.md`. The first two lines of mine (translated):

```markdown
- [Talk in Chinese](feedback_chinese_language.md) — reply in Chinese by default; keep code/commands/commits in English
- [Railway commits are manual](feedback_railway_commit_manual.md) — the user applies/commits Railway config changes himself
```

**The `feedback_` prefix was copied, not specified.** The prompt never defines a naming scheme. But the older version, explaining how to save, gave one example filename: `feedback_testing.md` (`memdir/memdir.ts:209`). The model just followed suit. The current prompt dropped the example — but by now the directory is full of files named that way, and each new session copies the ones already there.

One few-shot example became the naming convention on everyone's disk.

## 3. Recall: one flag, two modes

![Two recall modes](/images/posts/claude-code-memory-recall.png)

A few things that didn't fit in the figure.

**Why mode A has two caps.** A comment says 25KB ≈ 200 lines × 125 chars, which sat at the 97th percentile of real index sizes at the time. But the largest index they saw was under 200 lines and still 197KB. A line cap can't stop long lines.

**What Sonnet actually sees in mode B** (format from `memdir/memoryScan.ts:84`; these are two of my real files):

```
- [feedback] feedback_no_git_add_all.md (2026-05-14T06:15:02.909Z): Never use git add -A or git add . — only stage files you …
- [project] project_cloud_deploy_initiative.md (2026-06-23T02:39:58.335Z): AIM-409 cloud deploy plan — issue tree, platform/email/embedding decisions …
```

So in mode B, what gets a memory recalled is its frontmatter `description`. In mode A, it's the one line in the index.

**Where the 60KB session cap comes from.** A comment notes that long sessions in production were getting around 26K tokens of memories stuffed in, because the selector keeps finding "new" relevant files every turn. 60KB is roughly three full injections; after that, the most relevant memories are already in context.

**Why no vector search?** The source doesn't say. My guesses:

- The scale is tiny. At most 200 files, and reading their frontmatter is nearly free. Maintaining an embedding index would cost more than it saves.
- What you want is *intent* relevance, not *semantic* similarity. "Never use git add -A" and "commit this for me" aren't necessarily close in embedding space. Sonnet gets it at a glance.
- Zero infrastructure. Memories are files: readable, editable, versionable with git. Delete the file and it's really forgotten.

The cost is just as clear: at a few thousand memories, neither mode holds up.

My machine has always been in mode A. Hence the number from the top: **501 sessions, 15 Reads** (a rough regex count, but the order of magnitude won't move). In mode A, however good the Why in a memory file is, if the model never opens it, it might as well not exist.

## 4. Forgetting: truncation, age, and dreams

**Age is injected at read time.** When the model Reads a memory file more than a day old, a system-reminder is appended to the result. This is verbatim from my logs:

```
This memory is 11 days old. Memories are point-in-time observations, not live state —
claims about code behavior or file:line citations may be outdated. Verify against current
code before asserting as fact.
```

It says "11 days old" rather than giving a timestamp because, per the comment, models are bad at date math — a day count triggers "this might be stale" reasoning in a way a timestamp doesn't. The other reason is sharper: stale memories often carry `file:line` citations, and **the citation makes the stale claim sound more authoritative, not less.**

That note has shown up 43 times on my machine.

**autoDream.** The gate, simplified:

```ts
// services/autoDream/autoDream.ts + config.ts
gateOpen = !kairos && !remoteMode && autoMemoryEnabled
        && (settings.autoDreamEnabled ?? remote.tengu_onyx_plover.enabled)
lastAt   = mtime('memory/.consolidate-lock')      // the lock file's mtime IS the last run
run if   hoursSince(lastAt) >= minHours           // default 24
      && sessionsTouchedSince(lastAt) >= minSessions   // default 5, I get 3; scanned at most every 10 min
```

No database. One lock file is both the mutex (its body is the holder's PID, and it's considered stale after an hour) and the state store (its mtime). The per-turn cost of checking is a single `stat`.

When the gate opens, a sub-agent runs a four-phase prompt: orient → look for memories that contradict the current code → merge, and delete what's been disproven → squeeze the index back under 200 lines / 25KB. Note the test for "stale": **contradicts the present**, not **hasn't been touched in a while**. In 2.1.281 it also runs with a locked-down shell: read-only commands, plus deleting `.md` files in the memory directory, and nothing else.

On my machine: no local `autoDreamEnabled`, the remote flag is `false`, and there's no `.consolidate-lock` in the memory directory. It has never run. My main project has 124 memory files; 77 haven't been modified in over 60 days, and the oldest is 146 days old.

## 5. The prompt itself is shrinking

```
Length of the # Memory section
2.1.88 (leak)     ████████████████████████████  ≈ 13,800 chars
2.1.281 (mine)    ████                          ≈  2,100 chars
```

Most of what went was few-shot examples: every type used to come with two or three sample exchanges, and now each gets a one-line definition. What's new is `[[name]]` wiki-style links between memories.

The leaked source also carries an eval note dated 2026-03-17 (`memdir/memoryTypes.ts:224`). Same body text, only the heading changed:

```
## Trusting what you recall            → 0/3
## Before recommending from memory     → 3/3
(same text as a bullet under "When to access" → 0/3)
```

The wording and placement of a heading is itself a switch.

## 6. If you're building memory for your own agent

Five things worth copying:

1. **Start with files, not a vector store.** One fact per file plus a human-readable index goes a long way at a few hundred entries — and it's auditable, hand-editable, and git-friendly.
2. **Write in the main agent, backstop with a forked pass, and make them mutually exclusive with a cursor.**
3. **When recall needs to scale, have a small model pick files by description instead of computing similarity. Budget in three layers, and recompute the budget from message history.**
4. **Compute age at read time and express it in days, with an explicit "this is a snapshot."**
5. **Give forgetting a criterion (contradicts the present), a lock, and a throttle — and the least privilege you can.**

And if you just use Claude Code:

- Put the effort into the index line (mode A) and the `description` (mode B). Say *when* the memory should come to mind, not just what the rule is.
- Title rules as actions, not nouns.
- Anything that truly must not be violated belongs in `CLAUDE.md` (always loaded) or in a hook (enforced even when nobody remembers).
- Want automatic cleanup? Add `"autoDreamEnabled": true` to `~/.claude/settings.json` — but know that it will edit, merge, and delete your memories without asking.

## Coda

Borges has a story, "Funes the Memorious," about a man who, after a fall, can't forget anything. Every leaf, every cloud. And so he can no longer think.

"To think is to forget differences, generalize, make abstractions."

The hard part of Claude Code's memory isn't remembering. It's recalling, and forgetting.\
On my machine, neither has really started yet.

---

**Note:** Flag values and stats are from my own machine (Claude Code 2.1.281, September 2026). The `tengu_*` flags are served per account, so yours may differ — look under `cachedGrowthBookFeatures` in `~/.claude.json`. Code blocks marked "simplified" are my pseudocode reconstruction of the source logic, not the original.

**Sources**

Claude Code source (leaked 2026-03-31, npm 2.1.88): `memdir/`, `services/extractMemories/`, `services/autoDream/`, `utils/attachments.ts`, `query/stopHooks.ts`

The `# Memory` section of the Claude Code 2.1.281 system prompt; my own session logs

Jorge Luis Borges, "Funes the Memorious," 1942
