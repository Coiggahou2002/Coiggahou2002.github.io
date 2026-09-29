# less 新版搞事情，tailwind 语法糖无奈躺枪

- Author: Rory Cai (https://coiggahou2002.github.io/)
- Published: 2025-09-14 (Asia/Shanghai; 2025-09-14T10:00:00.000Z)
- Language: zh-CN
- Canonical: https://coiggahou2002.github.io/zh/blogs/tailwind-less-compatibility/
- English version: https://coiggahou2002.github.io/blogs/tailwind-less-compatibility/

## 背景

我们业务某个大型项目是微前端架构，技术栈是 [SSR](https://github.com/zhangyuang/ssr) + Vue 3 + NestJS + Webpack4，样式预处理器用的是 less，项目内也集成了 [Tailwind](https://tailwindcss.com/)，平时大家习惯用 Tailwind 来快速写样式。

Tailwind 提供了一个叫 @apply 的语法糖，可以帮我们节省一些冗余代码量。

例如，在 Vue 的 template 中，我们可以这么写
```html
<template>
    <p class="font-bold text-[12px] text-gray-800 mb-4 p-1">Johnson</p>
</template>
```

产品说要多加几个人名，于是你多复制了几行
```html
<template>
    <p class="font-bold text-[12px] text-gray-800 mb-4 p-1">Johnson</p>
    <p class="font-bold text-[12px] text-gray-800 mb-4 p-1">Rory</p>
    <p class="font-bold text-[12px] text-gray-800 mb-4 p-1">Jenifer</p>
    <p class="font-bold text-[12px] text-gray-800 mb-4 p-1">Sam</p>
</template>
```

怎么办？好像有点冗余，Tailwind 给了一个 [@apply 用法](https://v3.tailwindcss.com/docs/reusing-styles#extracting-classes-with-apply)，你可以这么写，把一些固定的预设放到一个类下面：
```html
<template>
    <p class="person-name">Johnson</p>
    <p class="person-name">Rory</p>
    <p class="person-name">Jenifer</p>
    <p class="person-name">Sam</p>
</template>
<style scoped lang="css">
.person-name {
    @apply font-bold text-[12px] text-gray-800 mb-4 p-1;
}
</style>
```


## 问题来了：Tailwind @apply 用法失效

最近，业务的同事反馈：有谁改过 tailwind 的配置吗？现在只要写 @apply 都会报错，怎么办？

报错如下，直接导致编译失败 + 组件渲染失败：

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202509141052037.png)

看到这个报错，一瞬间，脑海中无数可能的疑点飘过：

1. 此大型项目是微前端架构，是某个子应用有问题，还是全部都有问题呢？
2. Tailwind 的集成需要两个关键配置文件，`tailwind.config.js` 和 `postcss.config.js`，这两个配置，最近是否有人修改？
3. Tailwind 还需要在项目的全局/公共 CSS 位置写入 `@tailwind utilities` 才能使用那一系列的预设工具类，会不会少了这个引入？
4. 从报错的信息来看，应该是 Tailwind 不认识这个 `bg-red-400` 了，会不会少引入了什么，导致 Tailwind 做处理的时候，取不到这些预设对应的规则？

以上这些都是猜想，我们一步一步来证实/证伪。

## 初步排查：范围/配置/变更

首先，我选用了同一个微前端大仓下的其他子应用来测试，其中含有一个业务子应用，一个测试用的纯净子应用，发现都能 100% 复现该问题，说明**不是某个子应用的问题，而是所有子应用的共性问题。**

第二，我们看配置文件有没有被改过，这里用 `git log --since` 的方式取了过去 10 天内修改的文件名含有 tailwind/postcss 关键字的文件，发现只有 livemanage 一个子应用改过，并且变更内容其实是全新初始化了两份配置，不可能导致大范围的问题出现，所以**基本排除配置变更这个原因。**

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202509141113371.png)

第三点就很好验证，看了一下每个子模块的公共样式文件 `common.less` 都有引入 `@tailwind utilities`，**排除此原因**。

至于第四点，有没有可能是 tailwind 抽风，突然不认识那些简写（例如 `mb-12`）了呢？换句话说，有没有可能是 tailwind 的锅？

首先，我们回头看一下这句报错，

`The 'xxx' class does not exist. If 'xxx' is a custom class, make sure it is defined within a '@layer' directive.`

我们知道，[@layer](https://v3.tailwindcss.com/docs/adding-custom-styles#using-css-and-layer)是 Tailwind 提供的一种方便组织预设样式短名的能力，所以这句话看起来是 Tailwind 抛出来的，说明 **Tailwind 在处理这份样式的过程中确实有接手**。

另外，我们还发现，如果 @apply 后面只跟一条规则而不是多条，就不会有问题，类似这样：

```css
.myClass {
    @apply mb-2; // 这样没问题
    @apply mb-2 mx-1 bg-blue-100; // 连续多个有问题
}
```

这进一步说明了，Tailwind 有接手处理，而且其实它也认识 `mb-2` 这些原子样式类，说明也不是原子样式类缺失的问题，更有可能是 **Tailwind 在提取/解析/切分 `@apply` 语句的时候出了问题**。


## 缩小范围：tailwind 背锅？

我们知道，任何华丽胡哨的样式文件最终产物不过都是 CSS 而已，Tailwind 之所以能够在样式文件里提供一些浏览器本身不支持的语法糖，意味着它必定要在得到最终 CSS 产物之前，把它的语法糖全部处理/转换成浏览器认识的样子，如下图，`mb-24` 要被转换为 `margin-bottom: 6em;`，其他以此类推。

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202509141153979.png)

那前端工具链里，什么工具能够方便地处理/转换 CSS 呢？那肯定是 [PostCSS](https://postcss.org/) 了。而且 Tailwind 也[确实是用了 PostCSS 插件来提供它的核心能力](https://github.com/tailwindlabs/tailwindcss/blob/main/packages/%40tailwindcss-postcss/package.json)。

所以，我们要看的是 Tailwind 如何基于 PostCSS 做样式替换的逻辑，实操上有个很方便的办法——用报错语句的静态部分来搜索。

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202509141159411.png)

找到下面这段代码（省略了无关的逻辑），可以看到，Tailwind 利用了 PostCSS 提供的 walk 能力，对于所有的 `@apply`，会调用 `extractApplyCandidates` 从中提取出所有的原子类，如果提取到的原子类不在 `applyClassCache` 中（也就是 Tailwind 不认识）的话，就会报这个错。

```ts
function processApply(root, context, localCache) {
    let applyCandidates = new Set();

    // Collect all @apply rules and candidates
    let applies = [];
    root.walkAtRules('apply', (rule) => {
        // ...
        applies.push(rule);
    });

    let applyClassCache = combineCaches([
        localCache,
        buildApplyCache(applyCandidates, context),
    ]);
    for (let apply of applies) {
        // ...
        let [applyCandidates, important] = extractApplyCandidates(apply.params);
        // ...
        for (let applyCandidate of applyCandidates) {
            // ...
            if (!applyClassCache.has(applyCandidate)) {
                throw apply.error(
                    `The \`${applyCandidate}\` class does not exist. If \`${applyCandidate}\` is a custom class, make sure it is defined within a \`@layer\` directive.`
                );
            }
            let rules = applyClassCache.get(applyCandidate);
            // ...
            candidates.push([applyCandidate, important, rules]);
        }
    }
    // ...
}
```
看起来没什么毛病，会不会是提取的函数有问题呢？我们看看它的代码：

```ts
function extractApplyCandidates(params) {
  let candidates = params.split(/[\s\t\n]+/g)
  if (candidates[candidates.length - 1] === '!important') {
    return [candidates.slice(0, -1), true]
  }
  return [candidates, false]
}
```
看起来没什么问题，如果一个 apply 有连续多个规则，通过空格/Tab/换行来切分，去掉最后可能的 `!important`。

例如，对于 `@apply mb-2 pb-3`，经过提取后，applyCandidates 应该是 `['mb-2', 'pb-3']`

那就奇怪了，我们直接加上打印语句，打印出来看看，拿到的 applyCandidates 长什么样：

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202509141218446.png)

好像有点诡异，为什么会有逗号？？？

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202509142041158.png)

难道 Tailwind 搞了什么骚操作吗？那我把入参打印一下：

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202509141220072.png)

什么？？Tailwind 接手的时候就已经有逗号了？？看来问题并没有这么简单。

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202509142042885.png)


## 深入探索：Webpack Loader 追踪

曾试图把锅甩给 Tailwind，没想到，事到如今，我发现必须搞清楚这个问题，才会有答案：

我们写在 `.vue` 单文件组件（下文简称 SFC）里的 `<style scoped lang="less">` 部分，从被我们写下，到这个样式最后跑在浏览器端，中间到底经过了多少次处理，中间的产物分别是什么？

这里补充一下背景，我们项目的技术栈是: [SSR](https://github.com/zhangyuang/ssr) + Vue3 + Nest.js + Webpack4，所以资源的处理和打包逻辑主要看 Webpack 的配置。

熟悉 Webpack 的同学会知道，Webpack4 内部只需实现对标准 JavaScript 代码解析/处理能力，其他资源的解析逻辑需要第三方 loader 来补充。所以我们主要关注项目的 loader 配置。

可以直接从项目配置看，一般来说会以 [chainWebpack](https://github.com/neutrinojs/webpack-chain) 函数的方式提供配置，或者以静态 `webpack.config.js` 的方式来提供。

我们使用最简单直接的方式，直接修改 `node_modules/webpack/lib/NormalModule.js` 的 `doBuild` 函数，直接打印出执行的 loader 链名称：

> 可以写一些自定义的打印条件来筛选调试的信息，比如资源名和自己的测试组件匹配的时候才打印，不然打印的信息太多了

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202509141336150.png)

打印出来的loader链，经过简化后如下：
```text
🔥 处理 resource: .../pages/list/render.vue?vue&type=style&index=0&id=5017db43&lang=less&scoped=true
🔥 将执行的 loader 链: [
    "node_modules/ssr-mini-css-extract-plugin/dist/loader.js",
    "node_modules/css-loader/dist/cjs.js",
    "node_modules/vue-loader/dist/stylePostLoader.js",
    "node_modules/postcss-loader/dist/cjs.js",
    "node_modules/less-loader/dist/cjs.js",
    "node_modules/vue-loader/dist/index.js"
]
```

诶？这一长串 resource 是什么？

当 Webpack 分析到我们 import 一个 `render.vue` 文件，会先走 vue-loader 将它分割成三部分（template, script, style）后，Webpack 再次请求它们:
- 模板：`render.vue?vue&type=template&id=123`
- 脚本：`render.vue?vue&type=script&id=123`
- 样式：`render.vue?vue&type=style&id=123&scoped=true&lang=less`

> **Info**
>
> 其实这里 vue-loader 做的事情比我们想象的要多，它改写了 Webpack 配置的 rules，插入了 pitcher 和 templateLoader；pitcher 会在 [pitch 阶段](https://webpack.js.org/api/loaders/#pitching-loader) 拦截对完整 .vue 文件的请求，将它拆分成 tempalte/script/style 三个子请求，重新走 loader 链；template 类型会打到 templateLoader 里调用 compiler 编译成 render 函数；script 类型如果是 TS 的话，要让他能够经过用户自己配置的 ts 相关的 loader里；style 类型如果是 scoped 的话还会添加 \[data-v-xxxx\] 这类样式隔离相关的逻辑。具体可以参考尤雨溪写的 [How it works](https://github.com/vuejs/vue-loader?tab=readme-ov-file#how-it-works)

简写一下，对于 style 部分，loader 链是这样的：
```js
[
    "ssr-mini-css-extract-plugin/dist/loader",
    "css-loader",
    "vue-loader/dist/stylePostLoader",
    "postcss-loader",
    "less-loader",
    "vue-loader"
]
```

如果是 template，loader 链是这样的：
```js
["babel-loader", "template-loader", "vue-loader"]
```

如果是 script，loader 链是这样的：
```js
["babel-loader", "vue-loader"]
```

> 一般来说，loader 执行会先按顺序执行（pitch阶段），再按逆序执行（normal阶段），但这里不影响讨论，可以简化地认为它们是按照逆序执行。

我们主要关注 style 部分，这个模块请求首先到达 vue-loader，然后 vue-loader 调用后续的 loader 链去处理，按照这个顺序执行：


1. **less-loader**：给 less 包了一层，核心是调用 `less.render()` 对传入的 less 代码进行转换，主要是将 Less 语法（如嵌套、变量）转换为标准 CSS
2. **postcss-loader**：这里会有很多插件对 CSS 进行处理，Tailwind 做展开和注入，autoprefixer 自动添加兼容前缀，都是在这个阶段去做的
3. **stylePostLoader**：这个是 VueLoaderPlugin 注入的一个 loader，如果你写的 style 有 scoped，就会经过这个 loader，主要处理样式隔离的问题，可以忽略
4. **css-loader**：主要作用是解析 CSS 里的 `@import()` 和 `url()`，可以先忽略
5. **ssr-mini-css-extract-plugin/loader**：主要是把 CSS 提取到单独分开的文件中，和我们要研究的问题都没什么关系，先忽略


经过这一系列操作最后处理完，产物应该是一个单独的 CSS 文件，最终通过 link 标签在 HTML 中被引用。

从这个流程考虑，我们可以发现，最有可能导致问题的环节，无疑是 less-loader 和 postcss-loader，我们可以直接改一下它们的源码，把它们的输入和输出都打印出来看看。

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202509142019405.png)

罪魁祸首似乎找到了，是 less-loader 搞的鬼。

我们来简单验证一下，把 Vue 组件里的 style 的 lang 从 less 改成 css，此时它的 loader 链是：
```ts
[
    "ssr-mini-css-extract-plugin/dist/loader",
    "css-loader",
    "vue-loader/dist/stylePostLoader",
    "postcss-loader",
    "vue-loader"
]
```

这样它就不会经过 less-loader，果然正常了。

```html
<!-- 改成 CSS 就不会报错了 -->
<style scoped lang="css">
.ryteaes {
    @apply bg-red-400 mb-24 mt-24;
}
</style>
```

这时候 less-loader 就要站出来说了：

**跟我没关系！你们去看我的代码，我只是包了一层，是 less 的问题！**

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202509142050641.png)

好吧，确实是 less 的问题。

（谁知道呢...一直没怀疑过 less，要是早点来这个 [Less Playground](https://lesscss.org/less-preview/) 试一下就好了）

## 原因总结

至此，问题的根源找到了：

less 这个预处理器会把 @apply 后面的每个 keyword 之间加上一个莫名其妙的逗号，导致下一环节到 tailwind 的 postcss 插件接手的时候，按照空格/换行分割，得到的前面几个原子类都会多一个逗号（如 `mb-4,`），从而找不到对应的映射关系，无法做替换和注入，在 Webpack 的 postcss-loader 环节直接抛异常，导致模块编译无法继续进行，影响开发。

## 为什么以前没事？

还有一个疑问，项目中其实有大量 `@apply` 后面 follow 多个规则的写法，为什么之前没出问题，最近才出了问题呢？

经验告诉我们，变更常常是导致问题发生的根源，肯定有什么东西发生了变更。

我直接打开 less 的源码仓库，处理 `@规则` 的代码就位于 `packages/less/src/less/tree/atrule.js`

五个月前，这里有一个可疑的变更：[fix(issue#4242): add support for layer at-rule](https://github.com/less/less.js/pull/4337)：

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202509142102248.png)

在他的 `CHANGELOG.md` 里搜索这个 PR 名，可以看到是 v4.4.0 版本加的这个 feature

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202509142107136.png)

到 Playground 切回 4.3.0 快速验证一下，果然。

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202509142118212.png)

## 解决方法

1. 回滚 less 版本到 4.4.0 以前，可以使用 [pnpm.overrides](https://pnpm.io/9.x/package_json#pnpmoverrides) 根据作用域锁子依赖版本。
2. 如果不回滚，可以等待新版本修复，看到已经有修复 [PR](https://github.com/less/less.js/pull/4366/files) 了，尚未被作者合入主干
3. 如果不回滚也不等待新版本修复，可以用 `~""` 来包裹 @apply 后面的规则，例如 `@apply ~"mb-2 pt-3"` 这样，less就不会插入逗号，但缺点是写的时候可能IDE 会没有 Tailwind 的自动补全了
4. 如果上面的方案都觉得麻烦，项目赶着要上线，最快的方法是直接把 style 改成 `lang="css"`，这样就不会经过 less-loader

```json
{
    "pnpm": {
        "overrides": {
            "less": "4.3.0"
        }
    }
}
```

## 排查技巧/原理总结

- 根据经验和工程化基础知识，猜测问题可能出现的原因有哪些，逐个猜想+证实/证伪
- 如果报错语句具有特征，可以直接搜索来定位
- 直接改 node_modules 是很有效的手段，但记得条件性打印

涉及到：
- Vue SFC 的原理
- Webpack 的 loader 机制和执行顺序
- Tailwind 的作用原理

## 参考

[彻底弄懂Webpack中的Loader机制](https://juejin.cn/post/7157739406835580965?searchId=20250914190226E1FE3BD8C0CA065C79ED)

[Vue SFC Playground](https://play.vuejs.org/)

[Less Preview](https://lesscss.org/less-preview/)

[Webpack - Loaders](https://v4.webpack.js.org/loaders/)
