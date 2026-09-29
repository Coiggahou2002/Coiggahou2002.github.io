# 如何缩短前端项目构建时间

- Author: Rory Cai (https://coiggahou2002.github.io/)
- Published: 2025-06-08 (Asia/Shanghai; 2025-06-08T00:00:00.000Z)
- Language: zh-CN
- Canonical: https://coiggahou2002.github.io/zh/blogs/how-to-reduce-nuxt-project-compile-time/
- English version: https://coiggahou2002.github.io/blogs/how-to-reduce-nuxt-project-compile-time/

## 核心思路

- 构建的步骤不要放在 Dockerfile 里
- Dockerfile 只负责构建运行时镜像
- 缓存 node_modules, 不要每次都安装，当 package.json 没有发生变化时复用
- 使用 `npm prune --production` 删掉 devDependencies，能有效缩减一半以上的镜像体积
- 镜像基础层尽量使用瘦身版本的，例如 `node:20-slim`，如果连 npm 都不需要（指在 Dockerfile 里用不上 npm），可以用更小的 `node:20-alpine`

> **Info**
>
> 其实明明可以安装的时候直接 `npm i --production` 来跳过 devDependencies，为什么要装了之后又删掉呢？因为多数情况下，build 的步骤是需要 devDependencies 的（例如各种 TS 类型的包），build 阶段完成之后，再用 `npm prune --production` 删掉，具体可以视项目情况而定。
