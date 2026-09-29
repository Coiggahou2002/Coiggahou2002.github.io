# Batch-Generating WeChat Read's World Book Day Medals with Puppeteer

- Author: Rory Cai (https://coiggahou2002.github.io/)
- Published: 2025-04-25
- Language: en
- Canonical: https://coiggahou2002.github.io/blogs/weread-medals-generator/
- Chinese version: https://coiggahou2002.github.io/zh/blogs/weread-medals-generator/

## Background

As everyone knows, April 23 is World Book Day, and WeChat Read ran another campaign this year: generating a unique medal for every user.

How unique? Each medal carries two numbers. The one in the top-left is how many years the user has been on WeChat Read, and the one in the bottom-right is how many books they've read over those years.

For example, I've been on it for 8 years and read 230 books, so my medal looks like this 👇 (embarrassing, I really haven't read much

![My medal](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/y8_b230.png)

The WeChat Read app has been around for 10 years in total, so the top-left number ranges from 1 to 10.

Of course, a person can read a lot of books, so we set a cap: anyone who has read more than 1000 books gets 999+.

So the most prestigious medal looks like this:

![10-year 999+ medal](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/y10_b1000.png)

The medals are needed in 2 sizes, so the possible combinations are:

```
10 years * 1000 books * 2 sizes = 20000 medals
```

At that scale, if a designer drew them by hand, they'd still be at it by next year's April 23.

So I threw together a tool to mass-produce them and free up the humans.

The main tools:

- **Node.js**: the runtime
- **[Puppeteer](https://pptr.dev/)**: page rendering and screenshots
- **[EJS](https://www.npmjs.com/package/ejs)**: templating
- **[Sharp](https://www.npmjs.com/package/sharp)**: image processing and optimization
- **[Yargs](https://www.npmjs.com/package/yargs)**: building the command-line interface

## 1. Expressing the Design Structure the Right Way

## 2. Template Rendering

With the EJS template engine, we can turn the medal design into a template:

```html
<div class="diagram">
    <div class="circle">
        <div class="rectangle">
            <div class="number-image-container">
                <!-- Numbers rendered dynamically -->
            </div>
        </div>
    </div>
</div>
```
## 3. Taking Screenshots with Puppeteer

Puppeteer is a Node.js library that provides a high-level API for controlling Chrome/Chromium over the DevTools Protocol. It plays a key role in this project:

1. **Launch a headless browser instance**
```javascript
const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
});
```

2. **Set up the canvas**
```javascript
const page = await browser.newPage();
await page.setViewport({
    width: w,
    height: h,
    deviceScaleFactor: scale
});
```

3. **Load the HTML**
```javascript
await page.setContent(html, {
    waitUntil: 'networkidle0',
    timeout: waitTime
});
```

4. **Take the screenshot**
```javascript
const screenshotBuffer = await page.screenshot({
    type: 'png',
    omitBackground: true,
    encoding: 'binary',
    fromSurface: true
});
```

## 4. Generating Medals Faster

To speed up generation, we built parallelism in at several levels:

1. **Worker pool**
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

2. **Task dispatch**
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

3. **Dynamic load balancing**
```javascript
const getIdleWorker = () => workers.find(w => !w.busy);
const allWorkersIdle = () => workers.every(w => !w.busy);
```

4. **Progress tracking**
```javascript
const updateProgress = (success = true) => {
    if (success) {
        completed++;
    } else {
        failed++;
    }
    if ((completed + failed) % 10 === 0 || (completed + failed) === total) {
        console.log(`Progress: ${completed}/${total} (${Math.floor(completed/total*100)}%), failed: ${failed}`);
    }
};
```

## 5. Performance Optimizations

1. **Resource management**
   - Reuse browser instances
   - Adjust parallelism dynamically
   - Free memory promptly

2. **Rendering optimizations**
   - Use the `networkidle0` wait strategy
   - Tune the page load timeout
   - Keep memory usage in check

3. **Concurrency control**
   - Avoid resource contention
   - Dispatch tasks dynamically
   - Retry on errors


> **Info**
>
> Puppeteer provides [several page lifecycle hooks](https://pptr.dev/api/puppeteer.puppeteerlifecycleevent), each suited to a particular use case:
>
> - **networkidle0**: the page counts as loaded once there have been 0 network connections for 500ms (the strictest option; guarantees every network request has finished)
>
> - **networkidle2**: the page counts as loaded once there have been no more than 2 network connections for 500ms (lets a few background requests keep running)
>
> - **load**: the page counts as loaded when the `load` event fires (fast; only waits for the DOM to load)
>
> - **domcontentloaded**: the page counts as loaded when the `DOMContentLoaded` event fires (fastest, but may miss styles and images)

We chose `networkidle0` for this project because it:
1. Makes sure every image asset is fully loaded
2. Avoids capturing half-loaded content in screenshots
3. Guarantees the quality of the generated medal images

## 6. Image Compression

The medals were generated, but each one turned out to be 200-400 KB.

A medal weighing a few hundred KB is still too big to show in an H5 page, so we needed to shrink it.

Sharp is a Node.js image processing library, so we put it to work.

1. **Basic configuration**
```javascript
const sharp = require('sharp');

// Default options
const defaultOptions = {
    quality: 80,        // Image quality (0-100)
    compressionLevel: 9 // Compression level (0-9)
};
```

2. **Image processing pipeline**
```javascript
// Process and save the image
await sharp(screenshotBuffer)
    .png({
        quality: quality,           // Controls image quality
        compressionLevel: compressionLevel, // Controls compression level
        palette: false,             // We don't want to reduce colors, so skip palette optimization
        effort: 10                 // Compression effort (1-10)
    })
    .toFile(outputPath);
```

3. **Compression strategy in detail**

- **Quality (quality)**
  - Range: 0-100
  - Higher values mean better quality and larger files
  - Lower values mean worse quality and smaller files
  - Recommended: 80-90, to balance quality and size

- **Compression level (compressionLevel)**
  - Range: 0-9
  - 0: fastest, but lowest compression ratio
  - 9: slowest, but highest compression ratio
  - Recommended: 6-9, depending on your needs


- **Batch processing**
```javascript
// Process multiple images in parallel
const processImage = async (buffer, options) => {
    return sharp(buffer)
        .png(options)
        .toBuffer();
};

const results = await Promise.all(
    images.map(img => processImage(img, options))
);
```

- **Error handling**
```javascript
try {
    await sharp(buffer)
        .png(options)
        .toFile(outputPath);
} catch (error) {
    console.error('Image processing failed:', error);
    // Fall back or retry
}
```

By tuning these parameters, we got:
- 40-60% smaller files
- Images that stay sharp
- 30-50% faster processing

## 7. Usage Examples

```bash
# Generate a single medal
node index.js --year 2023 --number 42

# Generate all medals for a given year
node index.js --year 2023 --all

# Generate in parallel mode
node index.js --year 2023 --all --parallel 4
```

## 8. Key Technical Takeaways

1. **Template-driven design**
   - Dynamic medal rendering with the EJS template engine
   - Support for custom background images and number styles
   - Flexible handling of numbers with different digit counts

2. **Automated generation**
   - Batch-generate every medal for a given year
   - Parallel processing for better throughput
   - Automatic image compression and optimization

3. **Command-line tool**
   - A friendly command-line interface
   - Many configurable options
   - Fine-grained control over the generation process

## 9. Closing Thoughts

This project shows how modern web technology can be applied to image generation. With a sensible architecture and some performance tuning, we built an efficient, reliable medal generator. It saved a lot of work, and it's a reusable reference for similar needs.
