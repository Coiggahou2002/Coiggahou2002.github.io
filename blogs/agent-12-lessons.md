# After the Grok Bot Talk: 12 Lessons from Six Months of Building Agents

- Author: Rory Cai (https://coiggahou2002.github.io/)
- Published: 2026-10-14 (Asia/Shanghai; 2026-10-14T14:20:00.000Z)
- Language: en
- Canonical: https://coiggahou2002.github.io/blogs/agent-12-lessons/
- Chinese version: https://coiggahou2002.github.io/zh/blogs/agent-12-lessons/

> **How this was written**
>
> I dictated the ideas and most of the text with Typeless, then revised and polished the transcript myself. The illustrations were drawn by AI, and I also used AI to check and fill in some of the facts and numbers. Please don't republish this without my permission.
>
> I promise not to feed you AI slop.

On October 9, Lee Robinson (@leerob from here on), who works on machine learning at SpaceX and helped build Grok Bot, posted his team's take on always-on agents on X.

![Lee Robinson's tweet announcing the talk (2026-10-09)](/images/posts/agent-12-lessons/leerob-tweet.png)

My biggest takeaway from watching it: many of the design trade-offs they talked about are very similar to the pitfalls we ran into while building agent products over the past few months. So this series isn't a set of notes on the talk. Instead, it borrows the talk's framework and uses our own experience to dig into the small details of agent engineering that are easy to overlook.

## How we got here

Everybody knows the "Hello World" version of the simplest agent loop looks like this:

```python
# A minimal agent (simplified)
messages = [
    {"role": "system", "content": SYSTEM_PROMPT},
    {"role": "user", "content": user_input},
]

while True:
    reply = llm(messages, tools=TOOLS)    # Call the model once, telling it which tools it has at hand
    messages.append(reply)                # Append the model's reply to the conversation history

    if not reply.tool_calls:              # No more tool calls = this task is done
        print(reply.text)
        break

    for call in reply.tool_calls:         # It wants to call tools: actually execute them
        result = run_tool(call.name, call.args)
        messages.append({"role": "tool", "tool_call_id": call.id, "content": result})
        # Feed the tool results back and loop again
```

Using programmers' own experience with AI as the example, let's walk through how things have changed from when we first started using AI to help write code until now.

I'll use my own experience as an example.

1. In the very beginning, I'd chat with the model and ask how to write some Dockerfile. It gave me code snippets, I picked out the parts I needed, copy-pasted them into my code, and tested by hand whether it worked.
2. Then came GitHub Copilot, which completed your code when you pressed Tab.
3. Then came Cursor, which made tab completion better and smoother. Later it added a chat sidebar that could call Claude models to write code. Models gained function calling, the amount of tool-calling data kept growing, and that data in turn fed back into making the models better.
4. Claude Code came out, and engineers got a coding agent living in the terminal that could readily call tools to finish the vast majority of tasks and deliver results.
5. Work became heavily parallel: engineers had to juggle many Claude Code sessions at once, and sometimes Kimi/Codex sessions on top of that.
6. Gradually we realized we shouldn't track the agent's work by session but by task (issue), so products like Multica started to catch on, and we used Multica for a while too.
7. We found that once the team's throughput got high, getting PRs to a mergeable state ate up a lot of engineers' energy and attention, so we started building an agent that lives in a cloud sandbox and does nothing but review PRs, find problems, push fixes, and finally get each PR mergeable and merge it into trunk.
8. Agents, which first proved themselves at coding, started expanding beyond coding and into consumer products. For non-engineers, the best way to think of an agent is as a person: you just message or email it to get it to do things, without having to understand or manage multiple sessions.

That's the path as I've lived it, and it lines up closely with the slides @leerob shared.

Below are some of the more interesting things we've run into in practice.

## 1. State persistence: does an agent really need to run 24/7?

On the surface, everyone wants an agent to be something that runs around the clock.

But given how software and hardware actually work, keeping a process running nonstop in a sandbox forever doesn't make sense, and it's a huge waste of resources.

So on the implementation side, the agent has to be able to shut down wherever it is and resume from that exact spot at any time later.

**To make the system recoverable, the first thing to solve is saving the current state at any moment: in other words, persistence.**

Back to Claude Code: as you probably know, you can run `claude --resume` to restore an old session and pick up where you left off. It relies on an append-only `.jsonl` file called the transcript. Each line in the file is an event:

- Something the user said
- Something the agent said
- The agent calling tools (a single call or several in parallel)
- The agent starting to think (its reasoning gets recorded)
- A tool result coming back (single or batch)
- An error from some tool
- Extra hints given by the platform

When a new event occurs, a line is appended to the end of the file. Whether the agent crashes or exits normally, the next time it's woken up, reading this file restores the conversation history.

In fact, computer science and engineering solved this kind of problem a long time ago.

In the 1970s, IBM ran into it when building databases: **when the power goes out, what happens to a half-written transaction?**

At IBM Research, Jim Gray summarized the answer as WAL (Write-Ahead Log): first append the change you're about to make to the log, then change the data; after a crash, replay the log to redo what was committed and undo what wasn't. PostgreSQL introduced WAL in version 7.1 in 2001; in MySQL's InnoDB engine, the same thing is called the redo log. Both took the WAL approach, which as a bonus also cut down on the disk head seeking back and forth.

![MySQL's binlog vs the agent's transcript](/images/posts/agent-12-lessons/en/binlog-vs-transcript.png)

50 years later, the agent transcript is solving the same problem. But a WAL is only a log written ahead of the data: the real data still lives in the data pages, and once a checkpoint passes, the database reclaims the old log. The transcript is never reclaimed, and it reflects the state of the context on its own. So, more precisely, the better comparison is MySQL's binlog: a line-by-line record of what happened, which anyone can replay from the start to get the same state.

On top of that, append-only means what's already written never changes, which is exactly what prompt caching needs.

Compaction comes into play here too; I'll save that for when we get to context engineering.

## 2. When should the agent be woken up?

As we said earlier, with persistence, an append-only event log and prompt assembly, we can use a transcript to bring the agent back up from a given state at any time, so it doesn't need to be a process that stays resident 24/7.

So here's the question: when should it be brought up?

1. At the very beginning, it could only be brought up when a person sent it a message.
2. Then we told the agent "remind me about X in 5 minutes," and so we got scheduled wake-ups.
3. Engineers wanted more: "watch this PR, stay on it until it can be merged, then tell me." So Claude Code got Monitor Event: when the external state you care about changes, a message is injected that wakes the current session so the agent keeps working.
4. Later came /goal, and /loop is similar: in both, some external signal brings the agent back up so it keeps working.
5. Generalize the idea of a signal and there are lots of them: a new email lands in the owner's Gmail, someone pushes to a GitHub repo, a new bug is reported in production, and so on (arriving as a message or a webhook)
6. Back to agents themselves: another agent sending my agent a message is a signal too
7. A group chat with both people and agents in it: as soon as someone in the group speaks, that's another kind of signal
8. These days we often send a quick message to interrupt or steer our agent, and that's a signal too

We realized these are all the same thing underneath, which you could call a signal, or more formally, an agent Activation Event. As the slides in the video show, all kinds of signals can wake the agent up.

Which raises another question: what if a bunch of signals arrive at once? Should they be processed in parallel?

You're probably already ahead of me: just assign priorities.

As long as you can always derive a single order when multiple kinds of signals come in, and then process them one at a time, you're done.

To be a bit more defensive: emails can arrive twice and webhooks can be redelivered, so you also need an idempotency key for deduplication.

![How to handle multiple signals](/images/posts/agent-12-lessons/en/agent-signals.png)

Wait, why does this feel kind of familiar again? 🤔

**Isn't this just CPU interrupts?**

When the CPU has no work to do, it doesn't busy-wait; it just halts and sleeps until an interrupt wakes it up: a key pressed on the keyboard, a packet received by the network card, a timer going off. When several interrupts arrive at the same time, the interrupt controller sorts them by priority and handles them one by one; while one is being handled, the others are held pending.

**Sorting a bunch of signals into order, processing them serially, and removing duplicates: isn't this a message queue (MQ)?**

In Kafka, messages with the same key (under the default partitioning) land in the same partition, and within a partition they are strictly ordered; within the same consumer group, a partition is handed to only one consumer at a time. The default delivery guarantee is "at-least-once", so messages can be duplicated and consumers have to dedupe them on their own using idempotency keys.

So agent wake-up hasn't invented anything new either: CPU interrupts, 70-plus years old, and MQs, 30-plus years old, already worked all of this out.

## 3. Where does the agent work after it wakes up?

A signal has woken your agent up. Once it's awake, it needs somewhere to work: reading files, running commands, looking things up online. Where should this agent run?

You may remember that when OpenClaw first took off, lots of people rushed to buy Mac minis, to the point that they sold out for a while, and even Raspberry Pi's stock price got a speculative bump. Everyone had their own mix of reasons and worries: they wanted to see what the agent could really do, but they didn't want it blowing up their own computer.

There's a tradeoff here: the fewer tools you give the agent, the safer it is, but the less it can do; the more you give it, the more it can do, but the higher the risk that it deletes your database.

And in the end, everyone made the same choice: give it a locked-down Linux machine.

That's because models are already very good with standard Linux command-line tools: awk and sed to pull out fields, head and tail to read a file in chunks, jq to trim a JSON response down to just the fields they need.

It turns out that if we want a more capable, more composable agent harness, the best approach is still to run it in a Linux sandbox or on a Linux machine, rather than giving it only a handful of homegrown tools that limit what it can do (unless it has to work in a specific, restricted environment).

Give it all the bash tools it should have. That way it can easily inspect the network, processes and resource usage, and it gets a whole toolbox for strings, text and networking for free, with nothing extra for us to build. And thanks to pipes and the Unix philosophy, tools compose: the more tools there are, the more chains of commands it can pipe together, and in theory the more powerful the agent becomes.

![One pipeline, five transformations: which endpoint has the most errors](/images/posts/agent-12-lessons/en/unix-pipeline.png)

Lots of people are building agent sandboxes right now. An agent needs a temporary place where it can run commands freely, and people usually don't want that place to be their own machine, so a whole crop of sandbox products has sprung up.

These sandbox products mostly come down to two things:

1. Fast startup: cold start times vary a lot from product to product, and the better the product, the faster it starts. Firecracker officially claims it can boot a VM in 125 milliseconds; products like E2B add a snapshot layer on top and say restoring from a snapshot takes about a second.
2. A restricted Linux environment: every tool it should have is there, but commands beyond its permissions are blocked, hardware virtualization isolates it from the host, and the network and resources are isolated to some degree too.

![Where the agent lives: the sandbox, Firecracker and the agent](/images/posts/agent-12-lessons/en/agent-sandbox.png)

Firecracker, open-sourced by AWS, is built on KVM. At the bottom of the stack, CPU vendors provide hardware support for guest mode, which KVM builds on; sandbox tech like Firecracker sits on top of KVM, and above that sit commercial sandbox products like E2B. The whole ecosystem is already thriving.

## 4. Once awake, how does the agent know what time it is?

This is actually a fairly small point: how to let the agent know the current time, and how much time has passed between this message and the previous one.

A common approach is to put today's date in the system prompt. Just the date, not the hour, minute or second, let alone the millisecond: the time changes too often, and every change alters the prompt prefix, so you never get a cache hit; without cache hits, everything gets recomputed at full price on every request, which costs more and slows down time to first token.

A better approach is to take the date out of the system prompt and treat it as a message in the conversation:

1. Tell it today's date at the start of the conversation;
2. When the date changes (say, the conversation runs past midnight), append a message at the end of the conversation saying "The date has changed, today is X", without touching a single word of what came before, so you still get cache hits;
3. When it needs the time down to the second, give it a tool to look it up.

![Where to put the date: written into the system prompt vs. appending a message only when it changes](/images/posts/agent-12-lessons/en/agent-date-cache.png)

That is exactly what Claude Code does. The reminder it appends even goes out of its way to add one more line: no need to mention this to the user, since they can see their own clock. Otherwise the model really would solemnly tell you "It is now past midnight." For a chat agent, it's worth including the day of the week too, since it'll often be helping people schedule things.

There is also the issue of time zones. Most timestamps in a harness are in UTC, but giving the UTC date directly can be off by as much as a day: after 6 p.m. in Los Angeles, it is already the next day in UTC. So write the date in the user's time zone and say which zone it is; convert UTC timestamps before showing them to the user. We got bitten by this one for real: a `06:40Z` was shown as-is to a user in UTC+8, who took it to mean 6:40 in the morning.

![The same instant, three time zones](/images/posts/agent-12-lessons/en/agent-timezone.png)

## 5. When external state changes, how do you tell the agent?

When the date changes, you can append a reminder at the end. But what if someone else is changing something at the same time as the agent?

This is the problem of keeping external state in sync. Partway through a conversation, the model calls a tool that acts on something external (say a file, or some other stateful object) and changes its state; meanwhile, you change that same object by hand.

Here's a very simple example.

You ask the model to change the title of a WeChat Official Account draft to "Daniel Wu Is the Most Handsome", and it does.

You read it and aren't happy with it, so you open the editor yourself and change it to "I Am the Real Daniel Wu".

The model has no idea you did this.

The next time you tell it "Publish this article for me", which title will it publish?

If the agent didn't make a change itself, that change won't show up in the tool calls in its context, and the next time it reasons, it may not notice that the state has changed.

We've run into this in practice. You tell the agent to change a to-do from "To do" to "In progress", then you put your head down and work, and when you're done you check it off on the to-do list.

But the agent's tool history only shows "To do → In progress". You never asked it to mark it "Done", so how would it know the task is already finished?

There are usually two ways to notify the model that external state has changed:

1. **Modify the history directly**: if some tool call in the context involves this object, then after the state changes, go back and modify the result of that call. But this does real damage to the context, wrecks the prompt cache, makes the whole process messy, and also breaks our immutable, append-only EventLog design.
2. **Append a change hint**: a language model's attention tends to concentrate at the very beginning and the very end (the paper "Lost in the Middle", 2023), so we insert a system message at the very end of the latest turn's prompt, telling it that something's state has changed and that, if it needs that thing later, it should call a tool to check the latest state first.

![The agent's change hint](/images/posts/agent-12-lessons/en/agent-change-hint.png)

The most basic solution to this problem is to write a rule in the system prompt requiring the model to always call a tool to check the state first. But the agent easily ignores rules buried at the very top. Putting the hint at the very end makes it more likely to be noticed, and because it deliberately says only "it changed" and not "what it changed to", the agent has no choice but to call a tool and check the latest state itself.

**Think back to that computer architecture class from years ago: this is exactly what multi-core CPUs do.**

![CPU cache invalidation](/images/posts/agent-12-lessons/en/cpu-cache-invalidation.png)

Each core has its own cache, holding a copy of the same block of memory. When one core modifies the data, the other cores don't get the new value, just a notification: "The copy you're holding is invalid."

They don't need to do anything. Only the next time they actually need to read it do they find that their copy has been invalidated, and go back to memory for the latest one.

> Claude Code does this in a more fine-grained way, which is worth a brief mention:
>
> 1. For every file it has read, it records the content and modification time at that moment;
> 2. Before calling the model on the next turn, if it finds that a file on disk has been updated, it appends a reminder at the end of the prompt, attaching the changed snippet;
> 3. Right before actually writing a file, it checks once more, and if the file has been modified by someone else, it refuses the write and makes the model read the file again.

![How Claude Code notices a file has been changed](/images/posts/agent-12-lessons/en/claude-code-file-change.png)

## 6. Context management: position, down-weighting, and caching

The core principle from the video: treat a cache miss as a bug.

Every vendor's prefix cache has a time-to-live (TTL); for example, Anthropic's default is 5 minutes, and each hit resets the timer. As long as you keep interacting with the model within that window, the big unchanged prefix of the prompt should hit the cache every time and be billed at just 10% of the normal price; only the new part at the end is charged in full.

So in theory the hit rate should be close to 100%. If you see a miss somewhere in between, it usually means there's a bug in your implementation.

Often, when we run A/B tests or make other adjustments, we need to change the prompt. By the time it's sent for inference, a prompt is just one block of text, but in code it's assembled from separate sections, in a set order, with some of them deliberately down-weighted.

In other words, our prompt is really a list of sections:

- Each section has its own section ID
- Sections include things like memory and platform instructions
- The sections are assembled according to specific weights and order

Once you change one of the sections, for example a sentence in the platform instructions, the cache is invalidated from that section onward.

The question is: how do you know which section broke the cache?

![Compare the hashes of the assembly records: the first section that differs is the one that broke the cache](/images/posts/agent-12-lessons/en/prompt-section-hash.png)

The video's author suggests a neat trick: write a prompt assembly record every time you assemble the prompt. The record stores a hash for each section, so comparing the records of two calls section by section tells you immediately which one changed. Of course, just diffing the whole string works fine too; the hashes are only an implementation trick.

Here's a fun real-world example. Back in the Claude Opus 4.6 days, Claude Code had a flaw: it was often sycophantic. Whenever I corrected it, it would go along with what I said and never push back.

At the time I tried adding this to my user-level CLAUDE.md: "Don't flatter me; always answer questions objectively and truthfully; when you find I'm wrong, push back and point out the mistake." It did basically nothing.

Later I found it has a feature called output style for changing how it writes, which is also just a Markdown file.

CLAUDE.md and output style are both Markdown, and both end up concatenated into the same prompt sent to Claude, yet their effects differ a lot. It comes down to where each one sits and how it's worded:

- The output style sits very near the front of the whole prompt (at the time it was second), and is worded as explicit instructions
- CLAUDE.md, on the other hand, sits much further back and is deliberately down-weighted. The system wraps this content in special markers and explicitly tells the model: this contains the user's preferences or simple memories and should be treated as reference information, not as instructions to follow

![Where CLAUDE.md and output style go in the prompt](/images/posts/agent-12-lessons/en/claude-md-vs-output-style.png)

Because it comes so late and is explicitly down-weighted, CLAUDE.md ends up having much less effect.

**Here's a trap we fell into ourselves, and it's even more absurd 👇**

One of our engineers, writing the code that calls compaction, put the prompt in the wrong place. A compaction task normally has its own prompt (the compaction prompt) that tells the model it's now doing compaction and what it's supposed to produce.

It should have gone at the very front of the whole prompt to give it more weight, but he put it somewhere in the middle, right after some down-weighting prompts.

![Where to put the compaction instructions: before the fix vs after the fix](/images/posts/agent-12-lessons/en/compaction-prompt-position.png)

This led to some really bizarre behavior: after you'd chatted with the agent for many turns and sent a new message, it would think for a long time (that was compaction kicking in). After compaction it should have kept answering your question without losing much context, but what it actually sent back was a greeting, as if the conversation were just starting and nothing had happened.

That's because the compaction prompt was sitting in the wrong, down-weighted spot, so the very top of the prompt was still a system prompt like "You are a helpful assistant to help the user and answer the user's questions...".

So after the whole compaction finished, what came out was "Hello, how can I help you?"

Another bizarre but very typical case.

## 7. What to do when tool results are too large?

That covers context; now let's talk about how fast it grows.

When we first built our own harness, we didn't pay much attention to this, and the context grew really fast.

For the same task, Claude Code's context grew slowly, while ours grew very fast.

We dug into the traces and found that most of the growth came from huge tool results. Sure enough, they were big JSON blobs that, no exaggeration, dumped basically every field of the server-side ORM model. Hit a list of 50 items, each with eight, nine, or a dozen-plus fields, and a single call would eat a huge number of tokens.

Why doesn't Claude's context grow this fast?

Look through the traces and you'll see that every time a tool returns, it first checks how big the result is. If it's over the limit (about 25,000 tokens for MCP tools), it saves the whole result to a file, and instead of the result the model sees a message that says roughly:

> The tool call result exceeded the maximum token limit.
>
> The output has been saved for you at \~/john/.claude/projects/xxx/yyy.txt
>
> 1. If you are looking for a string, grep this file directly;
> 2. If you need to read the whole file to analyze or summarize it, use Bash to read it in chunks by character range;
> 3. If you have a tool for calling a sub-agent, have a sub-agent read it, so overly long text doesn't end up in your context.

Given a message like this, Claude finds ways to use tools to load information into its context window progressively, on demand. Information floods in more slowly, and it's more efficient too.

![What Claude Code does when a tool result is too large](/images/posts/agent-12-lessons/en/tool-result-spill.png)

Claude Code also exposes this step to users. It has 33 hook points in total, and the "after a tool returns" one (PostToolUse) can attach a prompt for the model, or even replace the result entirely. If you're building your own harness, do the same thing at this step.

![Claude Code's hook points](/images/posts/agent-12-lessons/en/claude-code-hooks.png)

A hook is basically a program you attach to one of these points, usually a shell command. When execution reaches that point, Claude Code packages its current state (tool name, tool parameters, tool result, etc.) as JSON and passes it to the hook; the hook runs its own logic and then returns JSON telling Claude Code what to do: block the operation / modify the parameters / attach a prompt / replace the tool result.

## 8. How do you compress the context when it's almost full?

This section is about context compression, and there are a lot of engineering details to get right here:

### 8.1 What information should be kept after compression?

There's a lot to figure out here, and it's the heart of the whole thing: which information must be kept after compression, and which is high-value. Going by what Claude Code and other common agent harnesses do, you usually need these key sections to preserve the user's intent reasonably well:

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

### 8.2 How do you accurately calculate the remaining tokens?

When compacting, the core context math involves a few variables:

1. The model's context window limit (for example, many models have 1 million tokens)
2. The context the user has already consumed (this usually has to be estimated; I won't get into how for now)

For example: if the window is 1 million tokens and 600,000 have been used, there are 400,000 left. When we trigger compaction, the summary the model writes absolutely can't exceed those remaining 400,000 tokens.

But there's another hard limit that's easy to miss: the model's maximum output per request (max output tokens). Even with 400,000 tokens of window left, if the model can output at most 120,000 tokens per request, your summary can be at most 120,000 tokens. You have to get this math right.

![How long can the summary be: take the shorter of the two limits](/images/posts/agent-12-lessons/en/summary-budget.png)

### 8.3 How many tokens have already been used? How to count images

Compaction needs a formula for roughly when to trigger it. The threshold varies from person to person: some like 30%, some like 75%, some like to compress only at 90%.

Which means you also need a formula for how many tokens are left. If the model's context window is 1 million tokens and you want to know how many are left, you need a way to estimate how many tokens the whole context currently takes up.

You've probably already thought of this: every time an LLM call comes back, the API tells you how many tokens it actually used, so we can use that as the baseline and only estimate what's been added since. That's exactly what Claude Code does, roughly estimating newly added text as "number of characters ÷ 4".

But here's the catch: **if we're using a multimodal model that can understand images, how do you estimate the token count of the images sent along the way**? It's a small detail, but one you really have to think about.

First you need a rough idea of how a model reads images: it cuts the image into fixed-size squares, each counting as roughly one token, so **an image's token count depends only on its pixel dimensions.**

- Anthropic counts one block per 28×28 pixels, and if the long side exceeds 1568 pixels it is scaled down first, so one image is at most about 1,568 tokens (starting with the 4.7 models, the limit goes up to 2576 pixels and 4,784 tokens)
- OpenAI's newer models count one block per 32×32 pixels and then multiply by 1.2

The key point is that images the user sends might be very small or very large.

So the harness usually needs to resize them to a set size before sending them, too.

![How many tokens an image counts as: scale down, cut into blocks, count the blocks](/images/posts/agent-12-lessons/en/image-tokens.png)

That's what Claude Code does: images are first scaled to within 2000×2000, and then every image or document is counted as a flat 2,000 tokens.

### 8.4 How does compaction show up in the event log?

Earlier we talked about how agent conversations are persisted in an append-only EventLog. So how should a compaction result be written into it? Here are a few common approaches, compared:

1. Overwrite the original file: for example, if a 20,000-character summary is returned, erase all of the preceding 500,000 characters and keep only the summary. This is the worst approach; if you later need a tool to pull up the full conversation history, whatever was erased is gone for good.
2. Open a new file to record the compaction result: this isn't great either, because it's still the same session, and physically splitting it up doesn't make sense.
3. The best method: treat the append-only EventLog as a continuous timeline. Insert a boundary event at the point where compaction is triggered, and record the generated summary in that event's metadata. When assembling the prompt in later turns, scan backward to the most recent compact boundary and ignore the raw history before it; when necessary, allow the agent to recall specific earlier messages on demand through tools such as search session or search messages.

![Three ways to record the compression result: overwrite, open a new file, insert a boundary](/images/posts/agent-12-lessons/en/compaction-boundary.png)

### 8.5 MicroCompact

Side note: Claude Code also has a lighter kind of compression called MicroCompact. Rather than producing a summary, it uses a list to clear out tool results that are too old.

The list names the tools whose results "can be cleared": file reads, bash, grep, web search, and web fetch.

By default it keeps the 5 most recent results and replaces older ToolResults with a line saying "old tool result cleared."

Two things trigger MicroCompact:

1. When a request is sent and the API reports "context too long," it clears them and immediately resends
2. After a relatively long time has passed

![Micro-compaction: old tool results replaced with a single "cleared"](/images/posts/agent-12-lessons/en/micro-compact.png)

Why is it safe to clear these results?

For example, search results from Google or Baidu, web page summaries, links, ads, and so on: **whatever conclusions came out of them are already in the agent's text reply for that turn**, so erasing the old results costs nothing, and if you need them later you can just search again. The same goes for reading files and running commands.

## 9. How does the agent's reply reach you?

Remember our original goal: we want an agent that's on call 24/7, that always seems to be working, and that keeps serving you. We want it to act like a person: for example, when it finishes a task, it can message you on its own.

So how do people usually get in touch with each other?

It comes down to talking, texting, calling, or emailing: urgent stuff by phone, less urgent stuff by text or email.

These are all just channels for passing information, some real-time, some not.

At its core, it's just back and forth: you say something, I say something.

On the technical side, there are a few things to watch out for.

We need to completely separate "**how the agent comes up with a reply**" from "**how that reply gets delivered to you**".

![The four layers of an agent](/images/posts/agent-12-lessons/en/agent-four-layers.png)

From bottom to top, it can be broken into four layers:

1. **Model call (model inference)**: The bottom layer. The LLM does only one thing: predict the next token.
2. **Agent execution**: When you say something to the agent, it thinks for a while, finishes reasoning, and replies. During this reasoning process, the system injects a huge amount of information: the current UTC time, your time zone (e.g. Los Angeles, USA), the user profile, the chat history, and, when needed, the tools used to recall these memories; there are also the agent's code of conduct, the tools currently available, the progressive-disclosure logic that loads things on demand, and even meta-tool calls to load more tools. All of that gets assembled into one big prompt, and together with the user's latest message and the recalled history, it's what finally produces a sensible natural-language reply. The harness wraps next token prediction into next message prediction.
3. **Message producer**: The output of the previous layer is a message. From this layer's point of view, the agent is an asynchronous message producer.
4. **Message channel**: The channel the message is delivered through: a Slack thread, an iMessage conversation, or an email. Just as people can chat over WeChat, WhatsApp, or email, no channel should own the messages, and it should be easy to switch between them.

So the message channel, message producer, agent execution, and model call / model inference need to be kept clearly apart; architecturally, they're completely decoupled concepts.

Besides decoupling the channel from the message, there's also the problem of syncing across multiple clients.

The future is definitely going to be people and agents working together. The agent lives in the cloud, working for you around the clock; sometimes it has something to tell you, or needs your approval.

An agent app like Grok Bot may have an iPad app, a phone app, and a desktop app all at once, and eventually a watch app too, so users can talk to the agent whenever they want.

When it pushes a message, it can't just push it to the phone and be done with it. Otherwise, when you open your laptop a second later, the message isn't there, which obviously doesn't work.

The best practice here is:

1. Recording and storage on the producer side: wherever a message is produced, first record its metadata (what the message is, when it was produced, and which agent produced it in which reasoning turn). Once generated, every message goes into a single message store.
2. Pull-based sync on the consumer side: each client pulls messages using a Sync Key or a version number. When pulling, each client sends its state (for example, the last sequence number it saw, and when), and asks for all new messages after that sequence number.

This way, different platforms can pull the latest messages according to their own progress and read state.

If you've been paying attention, you're probably thinking: whoa, why does this feel familiar again? 🤔

**The layering looks a lot like a network protocol stack, and this multi-client push problem, isn't it just POP3 vs. IMAP in email clients?**

POP3 downloads mail to one device and usually deletes it from the server in the process. So if you download an email on your home computer, you can't see it at the office, which is exactly the problem you run into with "only pushing to the phone over WebSocket".

With IMAP, mail stays on the server. Each message gets a unique, ever-increasing number (the UID); each client remembers the highest number it has seen and only pulls messages with higher numbers. Your phone, laptop, and tablet each keep their own view without stepping on each other, which is exactly the design we use for agent messages.

## 10. Don't want to juggle multiple sessions? How to keep it to a single conversation

When Claude Code came out, the usual pattern was to open lots of sessions: power users open a separate session for each task, because they know separate sessions mean isolated context.

But for products ultimately aimed at consumers, users don't want to learn these concepts; developers find managing sessions a pain themselves and don't want to make users do it, so we have to absorb the technical complexity behind the scenes.

> How painful is managing multiple sessions? There's already a whole crop of tools built just for this, like [Herdr](https://herdr.dev) and [cmux](https://cmux.com), and I've hand-built something similar myself, called [leader](https://github.com/Coiggahou2002/leader).

Since we want the agent to come across as "human", something you can talk to anytime like a real person, there's no need to split things into so many sessions.

The catch: in the UI, each agent only ever has one conversation, just like a chat window in WeChat or iMessage, where no matter how many years you chat, it's all in that one conversation.

To pull this off, the interface shows one conversation, but underneath it can be split into separate sessions:

1. When the chat fills up the context window (the most common approach): compact it, then start a new session
2. When the user has been away a while (say, more than a day): when they come back, summarize what came before and start from the summary
3. Search the history anytime: give the agent a message search tool so it can look up the gist of earlier conversations whenever it needs to
4. Dynamic intent detection: go a step further and judge how related the user's latest message is to the current context. If it isn't very related, trigger a summary right away and start a fresh context, instead of letting it pile up to a high threshold like 80% before compacting, which burns tokens and is inefficient

Really, this is how communication between people works too.

![One conversation in the interface, cut into several sessions underneath](/images/posts/agent-12-lessons/en/single-session.png)

Another point: old messages should be searchable.

Earlier we talked about the append-only log. When a compaction happens, the compaction itself is also an event and should be appended too; it's essentially a dividing line in the log.

This way, all old messages are fully preserved in the append-only EventLog.

As for how the EventLog's storage backend stores it (it could be a plain file, some specially optimized file system, or a few fields in a database table), don't worry about it for now.

The key is that all old messages are preserved: everything said between the user and the agent is still there, and all of it should be searchable.

What can be searched comes in two layers:

1. The messages themselves: what the user and the agent said, which matters most;
2. The agent's reasoning process: its internal thinking and the tools it called can also be made searchable later.

With a message search tool (say, one called message.search), conversations can be much freer. There are two ways to retrieve old messages:

- **Pre-recall**: the user chatted about the World Cup 5 weeks ago and now brings it up again; the harness first finds the relevant old messages and adds a note to the agent's prompt saying "the user talked with you about this topic 5 weeks ago";
- **Active recall**: when the agent decides it needs to, it calls the search tool itself and digs through the full history.

People work the same way.

Even two people who know each other really well still have to search WeChat to find what they said a month ago.

## Closing thoughts

Two more points to wrap up (honestly, I think they're pretty similar), just a sentence or two each:

11. What the speaker said at the end: keep the client very thin and the server thicker, putting more logic on the server side. The client might only handle displaying messages, clicks, and a few interaction animations. That way the server side can iterate very fast without any client updates.

12. These days, writing code has gotten very cheap. So what can set you apart from other engineering teams and make your team move faster? Essentially, it's whether your architecture is sound: whether it's decoupled, whether it has high cohesion and low coupling, and whether it can support extremely fast iteration and scale well.

---

This post was originally published in Chinese as a four-part series on my WeChat account 罗里戴行思录:

1. [Persistence & Wake-Ups](https://mp.weixin.qq.com/s/cs5yDd9X0DbbsVAIjxLpmg)
2. [Sandboxes, Time & External State](https://mp.weixin.qq.com/s/kXav02NzeinLelCZ0QjSKA)
3. [Context, Tool Results & Compaction](https://mp.weixin.qq.com/s/b2Nm7swxc-3rV6-EzaD0nA)
4. [Delivery & a Single Conversation](https://mp.weixin.qq.com/s/PBSTawC9e9vn7SK_aY3YuQ)
