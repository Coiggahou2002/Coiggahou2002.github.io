# 移动端 WebView 如何 hook 日志到客户端

- Author: Rory Cai (https://coiggahou2002.github.io/)
- Published: 2025-04-08
- Language: zh-CN
- Canonical: https://coiggahou2002.github.io/zh/blogs/hook-webview-console/
- English version: https://coiggahou2002.github.io/blogs/hook-webview-console/

## 背景

移动端混合开发中，我们可能会嵌入 RN 或者嵌入 WebView，他们的 JS 都是在自己的引擎里运行的。

例如: 
- [RN](https://reactnative.dev/) 的 js 在 [Hermes](https://github.com/facebook/hermes) 里运行
- iOS 上的 WKWebView 中，js 在[JavaScriptCore](https://docs.webkit.org/Deep%20Dive/JSC/JavaScriptCore.html) 引擎上运行
- Android 上的 WebView 中，js 在 [V8](https://v8.dev/) 引擎里运行。

默认情况下，它们的 `console.log`（包括 info/warn/error 等一系列方法）打印的日志都不会输出到客户端。

这种条件下，出 bug 需要还原现场的时候，以 iOS 为例，往往需要**打开 Safari 去 inspect 控制台里看日志**，非常麻烦。

最完整的「案发现场」往往是日志，所以我们想到把 WebView 的日志打到原生 App 的日志里面去。

这里简单介绍如何在 iOS 和 Android 平台上将网页日志信息 hook 到客户端，**两端实现略有差异**。

## 基础调研

在 **iOS** 中，通常使用 WKWebView 来加载网页，我们可以通过 WKScriptMessageHandler 协议来实现拦截日志。具体步骤如下：
1. 在 HTML 页面中重写 `console` 对象的方法，将日志信息通过 `window.webkit.messageHandlers` 发送给原生代码
2. 在原生代码中，在持有 WebView 的那个 VC 中，实现 [WKScriptMessageHandler](https://developer.apple.com/documentation/webkit/wkscriptmessagehandler?language=objc) 协议的 `(void)userContentController:(WKUserContentController *)userContentController didReceiveScriptMessage:(WKScriptMessage *)message `

**Android** 提供了 WebChromeClient 这个类，WebView 可以通过 `setWebChromeClient(new WebChromeClient(...))` 来设置一个自己的实现，可以通过重写这个类里面的 [onConsoleMessage](https://developer.android.com/reference/android/webkit/WebChromeClient#onConsoleMessage(android.webkit.ConsoleMessage)) 方法来打日志。

> **Info**
>
> 注意，iOS 需要在 HTML 中做配合，重写 console 方法的那段 script 理论上应该放在任何 console.log 之前，以避免我们抓漏日志，可以放在 head 标签最前面。

## 实现思路
1. 在 HTML 页面中，对 `console.log`、`console.error`、`console.warn` 等方法进行重写，让它们先走 `window.webkit.messageHandler.postMessage` 向 WKWebView 传递信息，然后再执行原本的逻辑。
2. 在 iOS 原生代码里，让持有 WebView 的 VC 实现 `WKScriptMessageHandler` 协议捕获这些日志信息，然后调用原生侧的打日志方法。
3. 在 Android 原生代码中，手动通过 setWebChromeClient 来 hook 控制台的输出，调用原生侧打日志的方法。

## HTML 侧

### 纯 HTML 写法

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Console Hook Example</title>
    <script>
        // 重写 console 方法
        const originalConsoleLog = console.log;
        const originalConsoleInfo = console.info;
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;

        console.log = function() {
            const message = Array.from(arguments).join(' ');
            window.webkit.messageHandlers.ConsoleLog.postMessage({ type: 'log', message });
            originalConsoleLog.apply(console, arguments);
        };

        console.info = function() {
            const message = Array.from(arguments).join(' ');
            window.webkit.messageHandlers.ConsoleLog.postMessage({ type: 'info', message });
            originalConsoleInfo.apply(console, arguments);
        };

        console.error = function() {
            const message = Array.from(arguments).join(' ');
            window.webkit.messageHandlers.ConsoleLog.postMessage({ type: 'error', message });
            originalConsoleError.apply(console, arguments);
        };

        console.warn = function() {
            const message = Array.from(arguments).join(' ');
            window.webkit.messageHandlers.ConsoleLog.postMessage({ type: 'warn', message });
            originalConsoleWarn.apply(console, arguments);
        };
    </script>
</head>
<body>
    <button onclick="console.log('这是一条 log 信息')">打印日志</button>
    <button onclick="console.info('这是一条 info 信息')">打印日志</button>
    <button onclick="console.error('这是一条错误信息')">打印错误</button>
    <button onclick="console.warn('这是一条警告信息')">打印警告</button>
</body>
</html>
```

> **注意**
>
> 这里只是简单的把参数拼接了起来，可能会出现 `my log: [object Object]` 这样的输出，可以视业务需要，在 join 之前把每个参数 `JSON.stringify` 一下，当然，要记得添加 try-catch

### NextJS 写法

如果框架是 NextJS 可以这么写:

Next.js 提供了 `<Script/>` 组件，有一个名为 [strategy](https://nextjs.org/docs/pages/api-reference/components/script#strategy) 的 prop 可以控制它应该被插入在哪里

The loading strategy of the script. There are four different strategies that can be used:

- `beforeInteractive`: Load before any Next.js code and before any page hydration occurs.
- `afterInteractive`: (default) Load early but after some hydration on the page occurs.
- `lazyOnload`: Load during browser idle time.
- `worker`: (experimental) Load in a web worker.

> Scripts with `beforeInteractive` will always be injected inside the head of the HTML document regardless of where it's placed in the component. This strategy should only be used for critical scripts that need to be fetched as soon as possible.

我们可以选择 `beforeInteractive` 策略，使得脚本插入位置尽可能早

```tsx
<Script id="hook-console-log" strategy="beforeInteractive">
    {/* 这里放一下上面那段脚本`*/}
</Script>
```

最后会发现它就插入在 head 里面:

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202504082344198.png)


## iOS

### 步骤

让 `MyWebViewController` 遵循 `WKScriptMessageHandler` 协议

```objc
// MyWebViewController.h
#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>

@interface MyWebViewController : UIViewController <WKScriptMessageHandler>

// 其他属性和方法声明
@end
```

实现 `WKScriptMessageHandler` 协议的 `userContentController:didReceiveScriptMessage:` 方法。

```objc
// MyWebViewController.m
#import "MyWebViewController.h"

@implementation MyWebViewController

// 实现 WKScriptMessageHandler 协议的方法
- (void)userContentController:(WKUserContentController *)userContentController didReceiveScriptMessage:(WKScriptMessage *)message {
    // 处理接收到的消息
    if ([message.name isEqualToString:@"ConsoleLog"]) {
        // 处理特定消息
        NSLog(@"Received message: %@", message.body);
    }
}

// 其他方法实现
@end
```

创建 `WKUserContentController` 实例，接收对应的事件，然后赋值给 `WKWebViewConfiguration` 的 userContentController

```objc
// 在某个方法中设置消息处理程序
WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];

WKUserContentController *userContentController = [[WKUserContentController alloc] init];

[userContentController addScriptMessageHandler:self name:@"ConsoleLog"]; // 这里的 self 就是 MyWebViewController 实例
config.userContentController = userContentController;

WKWebView *webView = [[WKWebView alloc] initWithFrame:self.view.bounds configuration:config];
```

### 代码示例

下面是一个完整的示例代码：

```objc
// MyWebViewController.h
#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>

@interface MyWebViewController : UIViewController <WKScriptMessageHandler>

@end

// MyWebViewController.m
#import "MyWebViewController.h"

@implementation MyWebViewController

- (void)viewDidLoad {
    [super viewDidLoad];

    WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
    WKUserContentController *userContentController = [[WKUserContentController alloc] init];
    [userContentController addScriptMessageHandler:self name:@"ConsoleLog"];
    config.userContentController = userContentController;

    WKWebView *webView = [[WKWebView alloc] initWithFrame:self.view.bounds configuration:config];
    [self.view addSubview:webView];

    NSString *html = @"<html><body><button onclick=\"window.webkit.messageHandlers.ConsoleLog.postMessage('Hello from JavaScript')\">Send Message</button></body></html>";
    [webView loadHTMLString:html baseURL:nil];
}

// 处理 JavaScript 发送的消息
- (void)userContentController:(WKUserContentController *)userContentController didReceiveScriptMessage:(WKScriptMessage *)message {
    if ([message.name isEqualToString:@"ConsoleLog"]) {
        NSDictionary *logInfo = message.body;
        NSString *logType = logInfo[@"type"];
        NSString *logMessage = logInfo[@"message"];

        if ([logType isEqualToString:@"log"]) {
            NSLog(@"Console Log: %@", logMessage);
        } else if ([logType isEqualToString:@"error"]) {
            NSLog(@"Console Error: %@", logMessage);
        } else if ([logType isEqualToString:@"warn"]) {
            NSLog(@"Console Warn: %@", logMessage);
        }
    }
}

@end
```

这个示例代码展示了如何让 `MyWebViewController` 遵循 `WKScriptMessageHandler` 协议，并且处理从 JavaScript 发送过来的消息。 

> **提醒**
>
> 这里的 `NSLog` 一般需要替代成业务实际使用的日志方法

> **注意**
>
> - 在 iOS 14 及以上版本中，若要使用 `WKScriptMessageHandler`，需在 `Info.plist` 文件里添加 `NSAppTransportSecurity` 字典，并将 `NSAllowsArbitraryLoads` 设置为 `YES`。


## Android

### 代码示例

在 `MainActivity.java` 中对 WebView 进行配置，启用 JavaScript 支持，设置 WebChromeClient 并重写 `onConsoleMessage` 方法，用于拦截和处理 HTML 控制台的输出。根据控制台消息的级别（如 `LOG`、`ERROR`、`WARN` 等），将消息输出到 Android 的日志系统中。

```kotlin
import android.os.Bundle
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)

        // 启用 JavaScript 支持
        webView.settings.javaScriptEnabled = true

        // 设置 WebViewClient
        webView.webViewClient = WebViewClient()

        // 设置 WebChromeClient 来处理控制台输出
        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                // 处理控制台输出
                val message = consoleMessage.message()
                val sourceId = consoleMessage.sourceId()
                val lineNumber = consoleMessage.lineNumber()
                val messageLevel = consoleMessage.messageLevel()

                when (messageLevel) {
                    ConsoleMessage.MessageLevel.LOG -> {
                        Log.d("WebViewConsole", "Log: $message (Source: $sourceId, Line: $lineNumber)")
                    }
                    ConsoleMessage.MessageLevel.ERROR -> {
                        Log.e("WebViewConsole", "Error: $message (Source: $sourceId, Line: $lineNumber)")
                    }
                    ConsoleMessage.MessageLevel.WARN -> {
                        Log.w("WebViewConsole", "Warn: $message (Source: $sourceId, Line: $lineNumber)")
                    }
                    ConsoleMessage.MessageLevel.DEBUG -> {
                        Log.d("WebViewConsole", "Debug: $message (Source: $sourceId, Line: $lineNumber)")
                    }
                    ConsoleMessage.MessageLevel.TIP -> {
                        Log.i("WebViewConsole", "Tip: $message (Source: $sourceId, Line: $lineNumber)")
                    }
                }

                return true
            }
        }

        // 加载 HTML 文件或 URL
        webView.loadUrl("file:///android_asset/index.html")
    }
}
```


## 总结

最后来总结一下：
- iOS 无法从原生直接 hook，所以在 HTML 最前面插入一段脚本，预先把所有 console 日志方法全部改写，Web 和原生两侧都加入通信逻辑，相当于所有日志旁路一份给原生；
- Android 可以直接 hook 控制台输出，所以不需要用通信的方式。
