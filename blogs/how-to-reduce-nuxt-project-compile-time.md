# How to Speed Up Frontend Project Builds

- Author: Rory Cai (https://coiggahou2002.github.io/)
- Published: 2025-06-08 (Asia/Shanghai; 2025-06-08T00:00:00.000Z)
- Language: en
- Canonical: https://coiggahou2002.github.io/blogs/how-to-reduce-nuxt-project-compile-time/
- Chinese version: https://coiggahou2002.github.io/zh/blogs/how-to-reduce-nuxt-project-compile-time/

## Key ideas

- Don't put the build steps in the Dockerfile
- The Dockerfile should only be responsible for building the runtime image
- Cache node_modules instead of installing every time; reuse it when package.json hasn't changed
- Use `npm prune --production` to remove devDependencies, which can cut the image size by more than half
- Use slim base images wherever possible, such as `node:20-slim`. If you don't even need npm (i.e. nothing in the Dockerfile uses npm), you can go with the even smaller `node:20-alpine`

> **Info**
>
> Why install devDependencies and then delete them, when you could just skip them with `npm i --production` at install time? Because in most cases the build step needs devDependencies (all those TS type packages, for example). Once the build is done, you remove them with `npm prune --production`. Adjust this to fit your project.
