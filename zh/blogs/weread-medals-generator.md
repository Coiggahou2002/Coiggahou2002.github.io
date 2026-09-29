# 使用 puppeteer 批量生成微信读书 423 活动勋章

- Author: Rory Cai (https://coiggahou2002.github.io/)
- Published: 2025-04-25 (Asia/Shanghai; 2025-04-25T00:00:00.000Z)
- Language: zh-CN
- Canonical: https://coiggahou2002.github.io/zh/blogs/weread-medals-generator/
- English version: https://coiggahou2002.github.io/blogs/weread-medals-generator/

## 背景

众所周知，每年 4 月 23 日是世界读书日，微信读书这次又搞活动了，要给每个用户生成一个独特的勋章。

这个勋章有多独特呢？勋章上面会有两个数字，左上角的数字代表用户注册微信读书到现在的总年数，右下角的数字代表用户这些年来总共读过多少本书。

例如我注册了 8 年，读过 230 本书，勋章就是下面这个样子👇（惭愧，没怎么好好读书

![我的勋章](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/y8_b230.png)

微信读书 App 上架至今总共 10 年，所以左上角数字的范围是 1～10。

当然，一个人可以读过很多本书，我们这里做了限制，如果读过超过 1000 本书，就展示 999+

所以，最尊贵的勋章，是这个样子的：

![10周年999+勋章](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/y10_b1000.png)

勋章需要 2 种尺寸，可能的组合有:

```
10 年 * 1000 本 * 2 种尺寸 = 20000 个
```

这样的量级，让设计师手撸，画到明年 423 才能画完。

于是简单搞个工具来批量生产它！解放人力。

我们主要用到:

- **Node.js**: 作为主要的运行环境
- **[Puppeteer](https://pptr.dev/)**: 用于网页渲染和截图
- **[EJS](https://www.npmjs.com/package/ejs)**: 用于模板渲染
- **[Sharp](https://www.npmjs.com/package/sharp)**: 用于图片处理和优化
- **[Yargs](https://www.npmjs.com/package/yargs)**: 用于构建命令行接口

## 一、使用合适的方式表达设计结构

## 二、模板渲染

使用 EJS 模板引擎，我们可以将勋章的设计模板化：

```html
<div class="diagram">
    <div class="circle">
        <div class="rectangle">
            <div class="number-image-container">
                <!-- 动态渲染数字 -->
            </div>
        </div>
    </div>
</div>
```
## 三、使用 Puppeteer 截图

Puppeteer 是一个 Node.js 库，它提供了一个高级 API 来通过 DevTools 协议控制 Chrome/Chromium。在我们的项目中，它扮演着关键角色：

1. **创建无头浏览器实例**
```javascript
const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
});
```

2. **初始化画布**
```javascript
const page = await browser.newPage();
await page.setViewport({
    width: w,
    height: h,
    deviceScaleFactor: scale
});
```

3. **加载 HTML**
```javascript
await page.setContent(html, {
    waitUntil: 'networkidle0',
    timeout: waitTime
});
```

4. **截图**
```javascript
const screenshotBuffer = await page.screenshot({
    type: 'png',
    omitBackground: true,
    encoding: 'binary',
    fromSurface: true
});
```

## 四、让勋章生成得更快

为了提高生成效率，我们实现了多层次的并行处理机制：

1. **工作进程池**
```javascript
const workers = Array.from({ length: parallelCount }, async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor });
    return { browser, page, busy: false };
});
```

2. **任务分配机制**
```javascript
const processTask = async (worker, number) => {
    worker.busy = true;
    try {
        const result = await createMedal(
            worker.page,
            year,
            number,
            worker.index,
            quality,
            compressionLevel,
            waitTime
        );
        return result;
    } finally {
        worker.busy = false;
    }
};
```

3. **动态负载均衡**
```javascript
const getIdleWorker = () => workers.find(w => !w.busy);
const allWorkersIdle = () => workers.every(w => !w.busy);
```

4. **进度监控**
```javascript
const updateProgress = (success = true) => {
    if (success) {
        completed++;
    } else {
        failed++;
    }
    if ((completed + failed) % 10 === 0 || (completed + failed) === total) {
        console.log(`进度: ${completed}/${total} (${Math.floor(completed/total*100)}%), 失败: ${failed}`);
    }
};
```

## 五、性能优化策略

1. **资源管理**
   - 复用浏览器实例
   - 动态调整并行数量
   - 及时释放内存

2. **渲染优化**
   - 使用 `networkidle0` 等待策略
   - 优化页面加载超时
   - 控制内存使用

3. **并发控制**
   - 避免资源竞争
   - 动态任务分配
   - 错误重试机制


> **Info**
>
> Puppeteer 提供了[多种页面生命周期 hook](https://pptr.dev/api/puppeteer.puppeteerlifecycleevent)，每种都有其特定的使用场景：
>
> - **networkidle0**: 当网络连接数在 500ms 内为 0 时，认为页面加载完成（最严格，确保所有网络请求都完成）
>
> - **networkidle2**: 当网络连接数在 500ms 内不超过 2 个时，认为页面加载完成（允许少量后台请求继续运行）
>
> - **load**: 当 `load` 事件触发时，认为页面加载完成（速度快，只需要等待 DOM 加载完成）
>
> - **domcontentloaded**: 当 `DOMContentLoaded` 事件触发时，认为页面加载完成（速度最快，但可能错过样式和图片加载）

在我们的项目中，选择 `networkidle0` 策略的原因是：
1. 确保所有图片资源完全加载
2. 避免截图时出现未加载完成的内容
3. 保证生成的勋章图片质量

## 六、图片压缩

勋章生成是生成完了，发现每一张都要 200-400 KB

一个几百 KB 的勋章，对于 H5 展示来说还是太大了，我们要压一下大小。

Sharp 是一个 Node.js 图片处理库，用它来搞一搞。

1. **基础配置**
```javascript
const sharp = require('sharp');

// 配置默认参数
const defaultOptions = {
    quality: 80,        // 图片质量（0-100）
    compressionLevel: 9 // 压缩级别（0-9）
};
```

2. **图片处理流程**
```javascript
// 处理并保存图片
await sharp(screenshotBuffer)
    .png({
        quality: quality,           // 控制图片质量
        compressionLevel: compressionLevel, // 控制压缩级别
        palette: false,             // 不希望减少颜色，所以不使用调色板优化
        effort: 10                 // 压缩努力程度（1-10）
    })
    .toFile(outputPath);
```

3. **压缩策略详解**

- **质量控制（quality）**
  - 范围：0-100
  - 值越大，图片质量越高，文件越大
  - 值越小，图片质量越低，文件越小
  - 建议值：80-90 之间，平衡质量和大小

- **压缩级别（compressionLevel）**
  - 范围：0-9
  - 0：最快但压缩率最低
  - 9：最慢但压缩率最高
  - 建议值：6-9 之间，根据需求平衡


- **批量处理**
```javascript
// 并行处理多张图片
const processImage = async (buffer, options) => {
    return sharp(buffer)
        .png(options)
        .toBuffer();
};

const results = await Promise.all(
    images.map(img => processImage(img, options))
);
```

- **错误处理**
```javascript
try {
    await sharp(buffer)
        .png(options)
        .toFile(outputPath);
} catch (error) {
    console.error('图片处理失败:', error);
    // 降级处理或重试
}
```

在我们的项目中，通过调整这些参数，我们实现了：
- 文件大小减少 40-60%
- 保持图片清晰度
- 处理速度提升 30-50%

## 七、使用示例

```bash
# 生成单个勋章
node index.js --year 2023 --number 42

# 生成某年的所有勋章
node index.js --year 2023 --all

# 使用并行模式生成
node index.js --year 2023 --all --parallel 4
```

## 八、技术要点总结

1. **模板化设计**
   - 使用 EJS 模板引擎实现勋章的动态渲染
   - 支持自定义背景图片和数字样式
   - 灵活处理不同位数的数字显示

2. **自动化生成**
   - 支持批量生成指定年份的所有勋章
   - 支持并行处理提高效率
   - 自动处理图片压缩和优化

3. **命令行工具**
   - 提供友好的命令行接口
   - 支持多种参数配置
   - 灵活控制生成过程

## 九、结语

这个项目展示了如何将现代 Web 技术应用于图片生成领域。通过合理的架构设计和性能优化，我们实现了一个高效、可靠的勋章生成工具。这不仅提高了工作效率，也为类似需求提供了可参考的解决方案。
