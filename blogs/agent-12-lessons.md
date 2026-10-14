# After the Grok Bot Talk: 12 Lessons from Six Months of Building Agents

- Author: Rory Cai (https://coiggahou2002.github.io/)
- Published: 2026-10-14 (Asia/Shanghai; 2026-10-14T14:20:00.000Z)
- Language: en
- Canonical: https://coiggahou2002.github.io/blogs/agent-12-lessons/
- Chinese version: https://coiggahou2002.github.io/zh/blogs/agent-12-lessons/

> **How this was written**
>
> I dictated the ideas and most of the text with Typeless, then edited the transcript myself. AI drew the illustrations and helped check and fill in some facts and numbers. Please don't republish this without my permission.
>
> I promise not to feed you AI slop.

On October 9, Lee Robinson (@leerob from here on), who works on machine learning at SpaceX and helped build Grok Bot, posted his team's take on always-on agents on X.

![Lee Robinson's tweet announcing the talk (2026-10-09)](/images/posts/agent-12-lessons/leerob-tweet.png)

My biggest takeaway from watching it: many of the design trade-offs they discussed mirror pitfalls we hit building agent products over the past few months. So this series isn't talk notes. It borrows the talk's framework and uses our own experience to dig into easy-to-miss details of agent engineering.

## How we got here

Everybody knows the "Hello World" version of the simplest agent loop looks like this:

```python
# A minimal agent (simplified)
messages = [
    {"role": "system", "content": SYSTEM_PROMPT},
    {"role": "user", "content": user_input},
]

while True:
    reply = llm(messages, tools=TOOLS)    # Call the model once, passing the tools it can use
    messages.append(reply)                # Add the reply to the history

    if not reply.tool_calls:              # No more tool calls = this task is done
        print(reply.text)
        break

    for call in reply.tool_calls:         # It wants tools: run them
        result = run_tool(call.name, call.args)
        messages.append({"role": "tool", "tool_call_id": call.id, "content": result})
        # Feed the results back and loop
```

If you write code for a living, you've lived through all of this. Here's how it went, from the first AI autocomplete to now.

I'll use my own experience as an example.

1. At first, I'd ask a chatbot how to write a Dockerfile, copy the bits I needed into my code, and test them by hand.
2. Then GitHub Copilot arrived: press Tab, get the rest of the line.
3. Then Cursor made tab completion faster and smarter, and later added a chat sidebar backed by Claude. Models learned to call functions, and all that tool-calling data fed back to produce better models.
4. Then Claude Code: a coding agent in the terminal that calls tools on its own and finishes most tasks end to end.
5. Work went massively parallel. Engineers juggled lots of Claude Code sessions at once, sometimes with Kimi or Codex on the side.
6. We realized we should track agent work by task (issue), not by session. Tools like Multica took off, and we used it for a while too.
7. As coding agents like Claude Code wrote more and more code, faster and faster, they opened more and more PRs, and getting each one to mergeable started eating up a lot of engineering time. So we built an agent that lives in a cloud sandbox and does one job: review PRs, find problems, push fixes, and merge them into trunk.
8. Agents proved themselves at coding, then moved into consumer products. For non-engineers, an agent is best thought of as a person: you message or email it and never think about sessions.

That's my path, and it closely matches the slides @leerob shared.

Here are some of the more interesting things we've hit in practice.

## 1. State persistence: does an agent really need to run 24/7?

On the surface, everyone wants an agent that runs around the clock.

But given how software and hardware work, keeping a process running in a sandbox forever makes no sense and wastes a huge amount of resources.

So in practice, the agent must be able to stop anywhere and later resume from that exact spot.

**To make the system recoverable, you first have to save the current state at any moment: persistence.**

Back to Claude Code: `claude --resume` restores an old session so you can pick up where you left off. It relies on an append-only `.jsonl` file called the transcript. Each line is an event:

- Something the user said
- Something the agent said
- The agent calling tools (one, or several in parallel)
- The agent thinking (its reasoning is recorded)
- A tool result coming back (single or batch)
- A tool error
- Extra hints from the platform

Each new event appends a line to the end of the file. Whether the agent crashes or exits normally, the next time it wakes up, reading this file restores the conversation history.

Computer science and engineering solved this problem long ago.

In the 1970s, IBM hit it while building databases: **when the power goes out, what happens to a half-written transaction?**

At IBM Research, Jim Gray summed up the answer as WAL (Write-Ahead Log): append the change to the log first, then change the data; after a crash, replay the log to redo what was committed and undo what wasn't. PostgreSQL added WAL in version 7.1 in 2001; MySQL's InnoDB engine calls the same thing the redo log. Both went with WAL, which as a bonus also cut disk-head seeks.

![MySQL's binlog vs the agent's transcript](/images/posts/agent-12-lessons/en/binlog-vs-transcript.png)

50 years later, the agent transcript is solving the same problem. But a WAL is only a log written ahead of the data: the real data still lives in the data pages, and after a checkpoint the database reclaims the old log. The transcript is never reclaimed, and on its own it captures the full state of the context. So the closer match is MySQL's binlog: a line-by-line record of what happened, which anyone can replay from the start to get the same state.

Plus, append-only means what's written never changes, which is exactly what prompt caching needs.

Compaction matters here too; I'll save it for the context engineering part.

## 2. When should the agent be woken up?

As we saw, with persistence, an append-only event log and prompt assembly, a transcript can bring the agent back up from a given state at any time, so it doesn't need to stay resident 24/7.

So here's the question: when do we bring it up?

1. At first, only a person's message could bring it up.
2. Then we told the agent "remind me about X in 5 minutes," and got scheduled wake-ups.
3. Engineers wanted more: "watch this PR until it's mergeable, then tell me." So Claude Code got Monitor Event: when external state you care about changes, it injects a message that wakes the current session so the agent keeps working.
4. Later came /goal, and /loop works the same way: an external signal brings the agent back up so it keeps working.
5. Generalize "signal" and there are lots: a new email in the owner's Gmail, a push to a GitHub repo, a new bug reported in production, and so on (arriving as a message or a webhook)
6. Between agents: another agent messaging mine is a signal too
7. In a group chat of people and agents, anyone speaking is another kind of signal
8. These days we often fire off a quick message to interrupt or steer our agent: also a signal

We realized they're all the same thing underneath: a signal, or more formally, an agent Activation Event. As the video's slides show, all kinds of signals can wake the agent up.

Next question: what if a bunch of signals arrive at once? Do we process them in parallel?

You're probably already ahead of me: just assign priorities.

As long as several kinds of incoming signals always resolve to a single order, and you process them one at a time, you're done.

To be defensive: emails can arrive twice and webhooks get redelivered, so you also need an idempotency key to dedupe.

![How to handle multiple signals](/images/posts/agent-12-lessons/en/agent-signals.png)

Wait, why does this feel familiar again? 🤔

**Isn't this just CPU interrupts?**

An idle CPU doesn't busy-wait; it halts and sleeps until an interrupt wakes it up: a keypress, a packet arriving at the network card, a timer going off. When several interrupts arrive at once, the interrupt controller sorts them by priority and handles them one by one; while one is handled, the rest stay pending.

**Ordering a bunch of signals, processing them serially, and removing duplicates: isn't that a message queue (MQ)?**

In Kafka, messages with the same key land in the same partition (by default), which is strictly ordered; within a consumer group, each partition goes to only one consumer at a time. The default guarantee is "at-least-once", so messages can repeat and consumers must dedupe them themselves with idempotency keys.

So agent wake-up isn't new either: CPU interrupts (70-plus years old) and MQs (30-plus) already worked all of this out.

## 3. Where does the agent work after it wakes up?

A signal has woken your agent. Now it needs somewhere to work: reading files, running commands, searching the web. Where should it run?

Remember when OpenClaw first took off? People rushed to buy Mac minis until they sold out, and even Raspberry Pi's stock got a speculative bump. Everyone wanted to see what the agent could really do, without letting it blow up their own computer.

That's the tradeoff: fewer tools make the agent safer but less capable; more tools make it more capable, and more likely to delete your database.

In the end, everyone landed on the same answer: a locked-down Linux machine.

Why? Models are already great with standard Linux command-line tools: awk and sed to pull out fields, head and tail to read a file in chunks, jq to trim JSON down to just the fields they need.

So for a more capable, more composable agent harness, the best bet is still a Linux sandbox or machine, not a handful of homegrown tools that box it in (unless it must work in a specific, restricted environment).

Give it the full set of bash tools: it can easily inspect the network, processes and resource usage, and gets a whole toolbox for strings, text and networking for free, with nothing for us to build. And thanks to pipes and the Unix philosophy, tools compose: more tools mean more possible pipelines, and in theory a more powerful agent.

![One pipeline, five transformations: which endpoint has the most errors](/images/posts/agent-12-lessons/en/unix-pipeline.png)

Lots of people are building agent sandboxes right now. An agent needs a temporary place to run commands freely, usually not your own machine, so a whole crop of sandbox products has sprung up.

Most of them come down to two things:

1. Fast startup: cold starts vary a lot, and better products start faster. Firecracker officially claims a 125-millisecond VM boot; products like E2B add a snapshot layer on top and say a restore takes about a second.
2. A restricted Linux environment: all the usual tools are there, but commands beyond its permissions are blocked, hardware virtualization walls it off from the host, and network and resources are partly isolated too.

![Where the agent lives: the sandbox, Firecracker and the agent](/images/posts/agent-12-lessons/en/agent-sandbox.png)

The stack, bottom up: CPU vendors provide hardware support for guest mode, KVM builds on it, sandbox tech like Firecracker (open-sourced by AWS) sits on KVM, and commercial products like E2B sit on top. The whole ecosystem is already thriving.

## 4. Once awake, how does the agent know what time it is?

A small one: how does the agent know the current time, and how long it's been since the last message?

A common approach is to put today's date in the system prompt. Just the date, never the hour, minute, second or millisecond: the time changes too often, every change alters the prompt prefix, and the cache never hits. Without cache hits, every request is recomputed at full price: more cost, slower time to first token.

Better: take the date out of the system prompt and make it a message in the conversation:

1. Tell it today's date at the start of the conversation;
2. When the date changes (say, the conversation runs past midnight), append a message at the end: "The date has changed, today is X". Nothing before it changes, so the cache still hits;
3. When it needs the time to the second, give it a tool.

![Where to put the date: written into the system prompt vs. appending a message only when it changes](/images/posts/agent-12-lessons/en/agent-date-cache.png)

That's exactly what Claude Code does. Its reminder even adds a line: no need to mention this to the user, they can see their own clock. Otherwise the model really would solemnly tell you "It is now past midnight." For a chat agent, include the day of the week too: it'll often be helping people schedule things.

Then there are time zones. Harness timestamps are mostly UTC, but the UTC date can be off by as much as a day: after 6 p.m. in Los Angeles, it's already tomorrow in UTC. So write the date in the user's time zone and name the zone; convert UTC timestamps before the user sees them. This one bit us for real: a `06:40Z` was shown as-is to a user in UTC+8, who read it as 6:40 in the morning.

![The same instant, three time zones](/images/posts/agent-12-lessons/en/agent-timezone.png)

## 5. When external state changes, how do you tell the agent?

A date change gets a reminder at the end. But what if someone else changes things while the agent is working?

This is the problem of keeping external state in sync. Mid-conversation, the model calls a tool that changes something external (say a file, or some other stateful object); meanwhile, you change that same object by hand.

Here's a simple example.

You ask the model to retitle a WeChat Official Account draft "Daniel Wu Is the Most Handsome", and it does.

You don't like it, so you open the editor yourself and change it to "I Am the Real Daniel Wu".

The model has no idea.

Then you say "Publish this article for me." Which title goes out?

A change the agent didn't make never shows up in the tool calls in its context, so the next time it reasons, it may not notice.

We've hit this for real. You have the agent move a to-do from "To do" to "In progress", put your head down and work, then check it off on the to-do list yourself.

But the agent's tool history only shows "To do → In progress". You never asked it to mark it "Done", so how would it know?

There are two common ways to tell the model external state has changed:

1. **Modify the history directly**: if a tool call in the context touched this object, go back and rewrite that call's result. But this damages the context, wrecks the prompt cache, makes everything messy, and breaks our immutable, append-only EventLog design.
2. **Append a change hint**: models tend to attend most to the very beginning and the very end (the paper "Lost in the Middle", 2023), so we add a system message at the very end of the latest turn's prompt: this thing has changed; if you need it later, call a tool to check its latest state first.

![The agent's change hint](/images/posts/agent-12-lessons/en/agent-change-hint.png)

The most basic fix is a rule in the system prompt: always call a tool to check the state first. But agents easily ignore rules buried at the very top. A hint at the very end is more likely to be noticed, and because it deliberately says only "it changed", not "what it changed to", the agent has to call a tool and check for itself.

**Think back to that computer architecture class from years ago: this is exactly what multi-core CPUs do.**

![CPU cache invalidation](/images/posts/agent-12-lessons/en/cpu-cache-invalidation.png)

Each core has its own cache, holding a copy of the same block of memory. When one core modifies the data, the others don't get the new value, just a notice: "Your copy is invalid."

They do nothing yet. Only when they next need to read it do they find their copy invalid and fetch the latest from memory.

> Claude Code does this at a finer grain, worth a quick look:
>
> 1. For every file it reads, it records the content and modification time at that moment;
> 2. Before the next model call, if a file on disk has changed, it appends a reminder at the end of the prompt with the changed snippet;
> 3. Right before writing a file, it checks again: if someone else has modified it, it refuses the write and makes the model read the file again.

![How Claude Code notices a file has been changed](/images/posts/agent-12-lessons/en/claude-code-file-change.png)

## 6. Context management: position, down-weighting, and caching

The core principle from the video: treat a cache miss as a bug.

Every vendor's prefix cache has a time-to-live (TTL): Anthropic's default is 5 minutes, and each hit resets the timer. Keep talking to the model inside that window and the big unchanged prefix hits the cache every time, at just 10% of the normal price; only the new part at the end is billed in full.

So in theory the hit rate should be close to 100%; a miss in between usually means a bug in your implementation.

We often need to change the prompt, for A/B tests or other tweaks. By the time it reaches the model, a prompt is one block of text, but in code it's assembled from separate sections, in a set order, some deliberately down-weighted.

So our prompt is really a list of sections:

- Each section has its own section ID
- Sections include things like memory and platform instructions
- They're assembled by set weights and order

Change one section, say a sentence in the platform instructions, and the cache is invalidated from that section onward.

So how do you know which section broke the cache?

![Compare the hashes of the assembly records: the first section that differs is the one that broke the cache](/images/posts/agent-12-lessons/en/prompt-section-hash.png)

The video's author suggests a neat trick: write a prompt assembly record on every build, with a hash per section. Compare two calls' records section by section and you see at once which one changed. Diffing the whole string works too; the hashes are just an implementation trick.

Here's a fun real example. Back in the Claude Opus 4.6 days, Claude Code was often sycophantic: whenever I corrected it, it just went along and never pushed back.

I tried adding this to my user-level CLAUDE.md: "Don't flatter me; always answer questions objectively and truthfully; when you find I'm wrong, push back and point out the mistake." It did basically nothing.

Later I found a feature called output style, for changing how it writes. It's also just a Markdown file.

CLAUDE.md and output style are both Markdown and both end up in the same prompt sent to Claude, yet they work very differently. It comes down to where each sits and how it's worded:

- The output style sits near the very front of the prompt (second, at the time) and is worded as explicit instructions
- CLAUDE.md sits much further back and is deliberately down-weighted: the system wraps it in special markers and tells the model outright that it holds the user's preferences or simple memories, to be treated as reference, not instructions to follow

![Where CLAUDE.md and output style go in the prompt](/images/posts/agent-12-lessons/en/claude-md-vs-output-style.png)

Coming that late and explicitly down-weighted, CLAUDE.md has much less effect.

**Here's a trap we fell into ourselves, even more absurd 👇**

One of our engineers, writing the code that calls compaction, misplaced the prompt. A compaction task has its own prompt (the compaction prompt) telling the model it's now compacting and what to produce.

It should have gone at the very front, for more weight; he put it in the middle, right after some down-weighting prompts.

![Where to put the compaction instructions: before the fix vs after the fix](/images/posts/agent-12-lessons/en/compaction-prompt-position.png)

The result was bizarre: after many turns, you'd send a new message and the agent would think for a long time (compaction kicking in). It should then have answered your question without losing much context. Instead it sent back a greeting, as if the conversation were just starting and nothing had happened.

Because the compaction prompt sat in the wrong, down-weighted spot, the very top of the prompt was still a system prompt like "You are a helpful assistant to help the user and answer the user's questions...".

So once compaction finished, out came "Hello, how can I help you?"

Another bizarre but very typical case.

## 7. What if tool results are too large?

That covers context; now, how fast it grows.

When we first built our own harness, we didn't watch this, and the context grew really fast.

On the same task, Claude Code's context grew slowly; ours shot up.

We dug into the traces: most of the growth came from huge tool results, big JSON blobs that, no exaggeration, dumped nearly every field of the server-side ORM model. Fetch a list of 50 items, each with eight, nine, or a dozen-plus fields, and a single call eats a huge number of tokens.

Why doesn't Claude's context grow this fast?

Its traces show that it first checks the size of every tool result. Over the limit (about 25,000 tokens for MCP tools), it saves the whole result to a file, and the model sees this message instead, roughly:

> The tool result exceeded the maximum token limit.
>
> Output saved to \~/john/.claude/projects/xxx/yyy.txt
>
> 1. To find a string, grep this file directly;
> 2. To analyze or summarize the whole file, read it in chunks by character range with Bash;
> 3. If you can call a sub-agent, have it read the file, so the long text stays out of your context.

Given this message, Claude uses tools to pull information into its context window bit by bit, on demand. It flows in more slowly, and more efficiently.

![What Claude Code does when a tool result is too large](/images/posts/agent-12-lessons/en/tool-result-spill.png)

Claude Code also exposes this step to users. Of its 33 hook points, the "after a tool returns" one (PostToolUse) can attach a prompt for the model, or even replace the result entirely. If you're building your own harness, do the same here.

![Claude Code's hook points](/images/posts/agent-12-lessons/en/claude-code-hooks.png)

A hook is a program, usually a shell command, that you attach to one of these points. When execution gets there, Claude Code packs its current state (tool name, parameters, result, etc.) into JSON and passes it to the hook; the hook runs its logic and returns JSON telling Claude Code what to do: block the operation / modify the parameters / attach a prompt / replace the tool result.

## 8. How do you compress the context when it's almost full?

Context compression has a lot of engineering details to get right:

### 8.1 What should compression keep?

This is the heart of it: what must survive compression, and what's high-value. Going by Claude Code and other common agent harnesses, you usually need these key sections to keep the user's intent reasonably intact:

>  1. The user's needs, intent, and goals
>  2. Key concepts and terminology involved
>  3. Facts the user stated themselves
>  4. Standing constraints and requirements the user has given you
>  5. Places where the user corrected you
>  6. Suggestions the user explicitly rejected
>  7. The current overall state (file and code changes, errors and fixes...)
>  8. Everything the user has said
>  9. Unresolved problems
> 10. The task currently in progress
> 11. Possible next actions

### 8.2 How do you count the remaining tokens accurately?

The core compaction math involves a few variables:

1. The model's context window limit (many models have 1 million tokens)
2. The context the user has already used (usually estimated; I'll skip how for now)

Say the window is 1 million tokens and 600,000 are used: 400,000 are left. When compaction triggers, the model's summary absolutely can't exceed those 400,000 tokens.

But there's another hard limit that's easy to miss: the model's maximum output per request (max output tokens). Even with 400,000 tokens of window left, if the model outputs at most 120,000 tokens per request, your summary caps at 120,000. Get this math right.

![How long can the summary be: take the shorter of the two limits](/images/posts/agent-12-lessons/en/summary-budget.png)

### 8.3 How many tokens are used? Counting images

Compaction needs a formula for roughly when to trigger. The threshold varies by person: some like 30%, some 75%, some wait until 90%.

So you also need a formula for how many tokens are left: with a 1-million-token window, that means estimating how many tokens the whole context takes up right now.

You've probably guessed it: every API response reports the tokens actually used, so use that as the baseline and estimate only what's been added since. That's exactly what Claude Code does, counting new text roughly as "number of characters ÷ 4".

But here's the catch: **with a multimodal model that understands images, how do you estimate the tokens of images sent along the way**? It's a small detail, but you really have to think it through.

First, roughly how a model reads images: it cuts the image into fixed-size squares, each about one token, so **an image's token count depends only on its pixel dimensions.**

- Anthropic counts one block per 28×28 pixels and first scales down any image whose long side exceeds 1568 pixels, so one image is at most about 1,568 tokens (from the 4.7 models on, the limit rises to 2576 pixels and 4,784 tokens)
- OpenAI's newer models count one block per 32×32 pixels and then multiply by 1.2

The key point: users may send very small or very large images.

So the harness usually needs to resize them to a set size before sending, too.

![How many tokens an image counts as: scale down, cut into blocks, count the blocks](/images/posts/agent-12-lessons/en/image-tokens.png)

That's what Claude Code does: it first scales images to within 2000×2000, then counts every image or document as a flat 2,000 tokens.

### 8.4 How does compaction show up in the event log?

Earlier we saw that agent conversations live in an append-only EventLog. So how do you write a compaction result into it? A few common approaches, compared:

1. Overwrite the original file: say a 20,000-character summary comes back; you erase the 500,000 characters before it and keep only the summary. This is the worst approach: if a tool later needs the full conversation history, whatever was erased is gone for good.
2. Open a new file for the compaction result: not great either. It's still the same session, so physically splitting it makes no sense.
3. The best method: treat the append-only EventLog as one continuous timeline. Insert a boundary event where compaction triggers, and record the summary in that event's metadata. In later turns, prompt assembly scans back to the most recent compact boundary and ignores the raw history before it; when needed, the agent recalls specific earlier messages through tools such as search session or search messages.

![Three ways to record the compression result: overwrite, open a new file, insert a boundary](/images/posts/agent-12-lessons/en/compaction-boundary.png)

### 8.5 MicroCompact

Side note: Claude Code also has a lighter compression called MicroCompact. Instead of writing a summary, it uses a list to clear out old tool results.

The list names the tools whose results "can be cleared": file reads, bash, grep, web search, and web fetch.

By default it keeps the 5 most recent results and replaces older ToolResults with the line "old tool result cleared."

Two things trigger MicroCompact:

1. A request comes back "context too long": it clears them and resends right away
2. A fairly long time passes

![Micro-compaction: old tool results replaced with a single "cleared"](/images/posts/agent-12-lessons/en/micro-compact.png)

Why is it safe to clear these results?

Take search results from Google or Baidu, web page summaries, links, ads: **whatever conclusions came out of them are already in the agent's text reply for that turn**, so erasing the old results costs nothing, and you can just search again if you need them. Same for reading files and running commands.

## 9. How does the agent's reply reach you?

Remember the goal: an agent that's on call 24/7, always seems to be working, and keeps serving you. We want it to act like a person: when it finishes a task, it messages you on its own.

So how do people usually reach each other?

We talk, text, call, or email: urgent stuff by phone, the rest by text or email.

These are all just channels for information, some real-time, some not.

At its core, it's just back and forth: you say something, I say something.

On the technical side, watch out for a few things.

We need to completely separate "**how the agent comes up with a reply**" from "**how that reply gets delivered to you**".

![The four layers of an agent](/images/posts/agent-12-lessons/en/agent-four-layers.png)

From bottom to top, there are four layers:

1. **Model call (model inference)**: The bottom layer. The LLM does one thing: predict the next token.
2. **Agent execution**: You say something, the agent reasons for a while, then replies. Along the way, the system injects a lot: the current UTC time, your time zone (e.g. Los Angeles, USA), the user profile, the chat history, and tools to recall those memories when needed; plus the agent's code of conduct, its current tools, progressive disclosure that loads things on demand, and even meta-tool calls that load more tools. It all becomes one big prompt that, with the user's latest message and recalled history, produces a sensible natural-language reply. The harness wraps next token prediction into next message prediction.
3. **Message producer**: The layer below outputs a message. Seen from here, the agent is an asynchronous message producer.
4. **Message channel**: Where the message gets delivered: a Slack thread, an iMessage conversation, or an email. Just as people chat over WeChat, WhatsApp, or email, no channel should own the messages, and switching between them should be easy.

So keep the message channel, message producer, agent execution, and model call / model inference clearly apart: architecturally, they're fully decoupled.

Beyond decoupling channel from message, there's syncing across multiple clients.

The future is people and agents working together. The agent lives in the cloud, works for you around the clock, and sometimes has something to tell you or needs your approval.

An agent app like Grok Bot may have iPad, phone, and desktop apps, and eventually a watch app, so users can talk to it anytime.

It can't just push a message to the phone and call it done. Open your laptop a second later, and the message isn't there.

The best practice:

1. Record and store on the producer side: wherever a message is produced, first record its metadata (what it is, when, and which agent produced it in which reasoning turn). Then every message goes into a single message store.
2. Pull-based sync on the consumer side: each client pulls with a Sync Key or version number, sending its state (e.g. the last sequence number it saw, and when) and asking for everything after that number.

Each platform then pulls the latest messages based on its own progress and read state.

If you've been paying attention, you're probably thinking: whoa, why does this feel familiar again? 🤔

**The layering looks a lot like a network protocol stack. And this multi-client push problem: isn't it just POP3 vs. IMAP in email clients?**

POP3 downloads mail to one device and usually deletes it from the server. Download an email at home, and you can't see it at the office: exactly the problem with "only pushing to the phone over WebSocket".

With IMAP, mail stays on the server. Each message gets a unique, ever-increasing number (the UID); each client remembers the highest one it has seen and pulls only newer ones. Your phone, laptop, and tablet each keep their own view without stepping on each other: exactly our design for agent messages.

## 10. Tired of juggling sessions? Keep it to one conversation

When Claude Code came out, the norm was lots of sessions: power users open one per task, because separate sessions mean isolated context.

But consumers don't want to learn these concepts, and developers, who find sessions a pain themselves, won't push that onto users. So we absorb the complexity behind the scenes.

> How painful is juggling sessions? There's a whole crop of tools just for this, like [Herdr](https://herdr.dev) and [cmux](https://cmux.com), and I hand-built one myself, called [leader](https://github.com/Coiggahou2002/leader).

Since we want the agent to feel "human", someone you can talk to anytime, there's no need for so many sessions.

The key: in the UI, each agent has just one conversation, like a WeChat or iMessage chat window that holds years of messages.

The interface shows one conversation; underneath, it splits into separate sessions:

1. When the context window fills up (the most common approach): compact it, then start a new session
2. When the user has been away a while (say, over a day): once they're back, summarize what came before and start from there
3. Search the history anytime: give the agent a message search tool to look up the gist of earlier conversations
4. Dynamic intent detection: go a step further and judge how related the user's latest message is to the current context. If it isn't, summarize right away and start fresh, instead of letting context pile up to a high threshold like 80% before compacting, which burns tokens and is inefficient

Really, this is how people talk to each other too.

![One conversation in the interface, cut into several sessions underneath](/images/posts/agent-12-lessons/en/single-session.png)

Another point: old messages should be searchable.

Remember the append-only log from earlier? A compaction is itself an event and gets appended too: a dividing line in the log.

So every old message stays in the append-only EventLog.

How the EventLog's backend stores it (a plain file, some specially optimized file system, or a few fields in a database table) doesn't matter for now.

What matters: everything the user and the agent said is still there, and all of it should be searchable.

Search covers two layers:

1. The messages: what the user and the agent said, which matters most;
2. The agent's reasoning: its internal thinking and tool calls can be made searchable later too.

With a message search tool (say, message.search), conversations get much freer. Old messages come back two ways:

- **Pre-recall**: the user brings up the World Cup again, 5 weeks later; the harness first finds the relevant old messages and adds a note to the agent's prompt: "the user talked with you about this topic 5 weeks ago";
- **Active recall**: when the agent needs to, it calls the search tool itself and digs through the full history.

People work the same way.

Even close friends still have to search WeChat for what they said a month ago.

## Closing thoughts

Two last points (honestly, they're pretty similar), a sentence or two each:

11. The speaker's closing advice: keep the client very thin and put more logic on the server. The client might only handle showing messages, clicks, and a few interaction animations. Then the server can iterate very fast without any client updates.

12. Writing code is cheap now. So what sets you apart from other engineering teams and makes your team move faster? Whether your architecture is sound: decoupled, high cohesion and low coupling, able to support extremely fast iteration and scale well.

---

This post was originally published in Chinese as a four-part series on my WeChat account 罗里戴行思录:

1. [Persistence & Wake-Ups](https://mp.weixin.qq.com/s/cs5yDd9X0DbbsVAIjxLpmg)
2. [Sandboxes, Time & External State](https://mp.weixin.qq.com/s/kXav02NzeinLelCZ0QjSKA)
3. [Context, Tool Results & Compaction](https://mp.weixin.qq.com/s/b2Nm7swxc-3rV6-EzaD0nA)
4. [Delivery & a Single Conversation](https://mp.weixin.qq.com/s/PBSTawC9e9vn7SK_aY3YuQ)
