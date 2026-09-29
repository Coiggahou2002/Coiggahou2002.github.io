# import vs. import type: A Deep Dive Into How TypeScript Imports Get Compiled

- Author: Rory Cai (https://coiggahou2002.github.io/)
- Published: 2024-06-23
- Language: en
- Canonical: https://coiggahou2002.github.io/blogs/importtype-import/
- Chinese version: https://coiggahou2002.github.io/zh/blogs/importtype-import/

## Background

At work, one page of a Nuxt 3 app that had been running reliably for a long time suddenly started returning a 500 Server Error in production, so a colleague and I started debugging it in local dev mode.

While tracking down the error locally, we found the project throwing `SyntaxError: The requested module myTypes does not provide an export named 'SomeType'`. It turned out to be caused by importing a type with import instead of import type, like this:

```ts
// How the project wrote it (causes the error)
import { SomeType, SomeInterface, SomeEnum } from "@/types/myTypes";

// A more correct way to write it
import { type SomeType, type SomeInterface, SomeEnum } from "@/types/myTypes";

// The strictest way to write it
import type { SomeType, SomeInterface } from "@/types/myTypes";
import { SomeEnum } from "@/types/myTypes";
```

> The third form is actually the most correct one, and the second form has a hidden pitfall. I'll hold off on why for now and explain it in detail later in this post.

We already knew this was a code-style issue, but Nuxt 3 had never thrown an error over it before. So why did it suddenly start failing now?

The project had just upgraded its framework, so our first thought was that the upgrade was to blame. We focused our investigation on two questions:
1. Did the Nuxt upgrade change any TypeScript-related configuration in the framework itself?
2. Most TypeScript constructs only exist at compile time, so how can a TypeScript type issue cause a runtime error?


## Prerequisites

### Types and Values

`type` and `interface` are normally stripped out entirely during TypeScript compilation and don't end up in the emitted JS, while an `enum` stays in the emitted JS [as a bidirectional map object](https://www.typescriptlang.org/docs/handbook/enums.html#reverse-mappings). Here, we'll call things like `type` and `interface` that emit no JS **pure types**, and things like `enum` that do emit JS **value-bearing types**.

Since the only difference we care about below is **whether they emit JS**, we'll simply call one **types** and the other **values**.
 
### TS Transpilers

There are plenty of tools that turn TS into JS. The official one is [typescript](https://www.npmjs.com/package/typescript) (usually called tsc), and there are others like [Babel](https://babeljs.io/docs/babel-preset-typescript), [esbuild](https://esbuild.github.io/content-types/#typescript), and [SWC](https://swc.rs/).

A quick word on esbuild:

It's a bundler written in Go. It can transpile TS to JS, but it doesn't do any type checking, so you need to run a type checker separately. Unlike tsc, it uses a single-file transpilation mode.

> Single-file transpilation is explained in detail below.


### Abbreviations

Throughout this post, TS means TypeScript, JS means JavaScript, and tsc means Microsoft's official TypeScript compiler.

## Why a Runtime Error Was Thrown

To analyze this, we need a basic understanding of the Nuxt 3 framework and how TypeScript compilation behaves.

Our runtime error message tells us that at client runtime, the project asked the `@types/myTypes` module for the value `SomeType` and didn't get it. That means the statement `import { SomeType } from '@types/myTypes'` survived into the bundled JS output (since what runs at runtime is obviously the transpiled JS, not TS).

But think about it for a moment: that statement shouldn't have survived into the bundled JS. Why not? Because `SomeType` is a pure type. It provides no value at runtime and only matters at compile time, where it helps the type checker give the developer type checking and type hints. So the statement should have been removed during compilation.

Why wasn't it removed? That's what this post is really about.

## How Does the Compiler Handle import Statements?

Generally, when file A imports something from file B, it's to split code sensibly using the module system and to use something B provides inside A.

> **Info**
>
> Usually, if you have a lint plugin installed, it will flag anything that's imported but never used as an unused import and nudge you to remove it. Still, it's possible for unused imports to remain even after formatting

We usually write TS, but what runs is JS, so the TS compiler has to do some work to turn our TS into JS.

When the compiler hits an import statement, it may do all kinds of things (resolving module references, locating files, and so on). On top of that, it has to decide whether each import statement stays or goes. For this question (which is the one we're focusing on), the compiler has two options:


**1. Remove the import statement**

- If the compiler decides the imported thing isn't used anywhere in the code, it should of course remove it
- If the compiler decides the imported thing is a pure type, it should remove it. Otherwise the final JS would contain `import { SomeType } from '@/types/myTypes'`, but `SomeType` wouldn't exist in the final JS (because the TS compiler strips all pure type declarations), which would trigger a runtime error: `SyntaxError: The requested module 'myTypes' does not provide an export named 'SomeType'`

**2. Keep the import statement**

- This is the simplest case: when the compiler isn't sure whether a statement can be removed, it keeps it

---

**Which raises two more questions:**
- First, how does the compiler decide whether an imported thing is used in the code?
- Second, how does the compiler know whether what you imported is a pure type or a value?


### How Does It Decide Whether an Import Is Used?

This can generally be done through syntax analysis. The second step of almost any compiler (the first is splitting the source string into tokens based on keywords and special symbols) turns the token list into an AST (Abstract Syntax Tree). The compiler walks the AST and the symbol table and checks whether any members of the imported module are referenced. If a member is referenced in the code, it gets marked as "used".

Of course, there are edge cases the compiler can't figure out. Take a code string wrapped in `eval()`: it's a string literal that actually means code, but the compiler only sees a string literal and never turns it into an AST, so it slips through.

```ts
// The compiler will think you never used Animal

import { Animal } from './animals'

eval('let b = new Animal()');
```

### How Does It Tell Whether an Import Is a Type or a Value?

In the first case, if you explicitly declare that you're importing a type, the compiler doesn't need to guess;

In the second case, if you don't explicitly say whether the import is a type or a value...

```ts
// Explicitly declared as a type rather than a value, so the compiler doesn't need to guess and just removes this line
import type { SomeInterface } from './types'

// Not explicitly declared, and types and values are mixed together, so the compiler has to decide one by one whether each can be removed
import { SomeInterface, SomeEnum } from './types'
```

Specifically, here's how the compiler decides:

- tsc can use the information from the entire type system across multiple files to figure out that `SomeInterface` refers to a type and `SomeEnum` is a value. It then drops SomeInterface but keeps the import of SomeEnum
- TypeScript compilers other than tsc may not be able to. For example, Babel's TS transpiler and esbuild both work in single-file transpilation mode. Unlike tsc, they can't transpile a file with the context of the whole type system, so **in some cases they can't tell whether the `A` in `import A` is a pure type**. The compiler then can't be sure the statement is safe to remove, so it keeps it.

These wrongly retained statements reference type declarations that were already stripped at compile time, which means that at runtime they reference a value that doesn't exist. So this usually leads to bugs or runtime errors (this is documented in the [official TypeScript docs](https://www.typescriptlang.org/tsconfig/#isolatedModules), in [Evan Wallace's reply](https://github.com/evanw/esbuild/issues/314#issuecomment-668401819), and in the [esbuild docs](https://esbuild.github.io/content-types/#isolated-modules))

[Here's what the official TypeScript docs say about single-file transpilation](https://www.typescriptlang.org/tsconfig/#isolatedModules):

> While you can use TypeScript to produce JavaScript code from TypeScript code, it’s also common to use other transpilers such as Babel to do this. However, other transpilers only operate on a single file at a time, which means they can’t apply code transforms that depend on understanding the full type system. This restriction also applies to TypeScript’s ts.transpileModule API which is used by some build tools.

Back to esbuild, which we set up earlier: it uses single-file transpilation, which means it can't have the full type system information at transpile time the way tsc does (but it's fast! On a TS project of the same size, esbuild, which doesn't need to care about much context, is many times faster than tsc)

**A quick aside:** this also explains why Vite uses esbuild to transpile TS in dev mode: it fits Vite's "don't bundle, serve files to the browser on demand" model perfectly

[From the official Vite docs](https://vitejs.dev/guide/features.html#transpile-only):

> The reason Vite does not perform type checking as part of the transform process is because the two jobs work fundamentally differently. Transpilation can work on a per-file basis and aligns perfectly with Vite's on-demand compile model. In comparison, type checking requires knowledge of the entire module graph. Shoe-horning type checking into Vite's transform pipeline will inevitably compromise Vite's speed benefits.

## Relevant TS Config Options

TODO: explain what each option does here

- isolatedModules: lets people using single-file compilers catch certain errors early
- importsNotUsedAsValues: specifies how imports whose values are never used should be handled, remove/preserve/error
- preserveValueImports
- verbatimModuleSyntax

## Other Notes

- Before Vite 5.3.1, production builds used @rollup/plugin-typescript; after that, they switched to esbuild
- Nuxt 3.7 shipped with isolatedModules = true
- Nuxt 3.8 shipped with verbatimModuleSyntax = true
- The project uses Nuxt 3.11 + Vite 4.5.3 + Rollup 3.2.9
- That type error actually only showed up in dev, because in this project's Nuxt version, Vite uses esbuild in dev mode while production builds still use tsc. So production was fine; the production 500 was caused by a bridge issue

TODO: remember to cover side effects, plus the matching typescript-eslint option

## References

- [The official TypeScript docs on the verbatimModuleSyntax option](https://www.typescriptlang.org/tsconfig/#verbatimModuleSyntax): Explains this option added in TypeScript 5.0, why it was added, and the history behind it.

- [The TypeScript section of the esbuild docs](https://esbuild.github.io/content-types/#typescript-caveats): Covers in detail what to watch out for when bundling a TS project with esbuild, and how to configure tsconfig.json.


- [Leverage SWC parser to transpile JSX and TypeScript · Issue #5210 · rollup/rollup](https://github.com/rollup/rollup/issues/5210): This issue suggests Rollup plans to switch to SWC as its TS and JSX transpiler in some 4.x release.

- [fix(kit): apply preferred options for esbuild transpilation #22468](https://github.com/nuxt/nuxt/releases/tag/v3.8.0): The Nuxt commit that enabled isolatedModules in tsconfig, released in 3.7.0

- [perf(nuxt): verbatim module syntax + restrict type discovery #23447](https://github.com/nuxt/nuxt/releases/tag/v3.8.0): The Nuxt commit that enabled verbatimModuleSyntax in tsconfig, released in 3.8.0

- [Release v3.8.0 · nuxt/nuxt · GitHub](https://github.com/nuxt/nuxt/releases/tag/v3.8.0): Starting with 3.8.0, Nuxt enables the verbatimModuleSyntax option in tsconfig.json by default, with a brief explanation in the release notes.

esbuild author: https://github.com/evanw/esbuild/issues/314#issuecomment-668401819

How exclude type which export by third library inside output?

https://github.com/evanw/esbuild/issues/341
