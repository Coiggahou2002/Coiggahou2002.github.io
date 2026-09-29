# Piping Mobile WebView Console Logs into Native App Logs

- Author: Rory Cai (https://coiggahou2002.github.io/)
- Published: 2025-04-08 (Asia/Shanghai; 2025-04-08T00:00:00.000Z)
- Language: en
- Canonical: https://coiggahou2002.github.io/blogs/hook-webview-console/
- Chinese version: https://coiggahou2002.github.io/zh/blogs/hook-webview-console/

## Background

In hybrid mobile development, we often embed RN or a WebView, and their JS runs in its own engine.

For example: 
- [RN](https://reactnative.dev/) runs its JS in [Hermes](https://github.com/facebook/hermes)
- In iOS's WKWebView, JS runs on the [JavaScriptCore](https://docs.webkit.org/Deep%20Dive/JSC/JavaScriptCore.html) engine
- In Android's WebView, JS runs in the [V8](https://v8.dev/) engine.

By default, nothing printed through their `console.log` (or info/warn/error and the rest of the family) makes it into the native app's logs.

So when a bug shows up and you need to reconstruct what happened, on iOS you usually have to **open Safari and inspect the console to read the logs**, which is a real pain.

Logs are usually the most complete record of the "crime scene", so the idea is to route WebView logs into the native app's own logs.

Here's a quick walkthrough of how to hook web page logs into the native side on iOS and Android. **The two platforms work a bit differently.**

## Groundwork

On **iOS**, pages are usually loaded in a WKWebView, and we can intercept logs via the WKScriptMessageHandler protocol. The steps are:
1. In the HTML page, override the methods on the `console` object so they send log messages to native code through `window.webkit.messageHandlers`
2. On the native side, in the VC that owns the WebView, implement the [WKScriptMessageHandler](https://developer.apple.com/documentation/webkit/wkscriptmessagehandler?language=objc) protocol method `(void)userContentController:(WKUserContentController *)userContentController didReceiveScriptMessage:(WKScriptMessage *)message `

**Android** provides the WebChromeClient class. A WebView can take your own implementation via `setWebChromeClient(new WebChromeClient(...))`, and you can log by overriding the [onConsoleMessage](https://developer.android.com/reference/android/webkit/WebChromeClient#onConsoleMessage(android.webkit.ConsoleMessage)) method in that class.

> **Info**
>
> Note that iOS needs cooperation from the HTML. The script that overrides the console methods should, in principle, run before any console.log call so we don't miss any logs. Putting it at the very top of the head tag works.

## Approach
1. In the HTML page, override `console.log`, `console.error`, `console.warn` and friends so they first pass the message to WKWebView via `window.webkit.messageHandler.postMessage`, then run their original logic.
2. In iOS native code, have the VC that owns the WebView implement the `WKScriptMessageHandler` protocol to capture these logs, then call the native logging method.
3. In Android native code, hook console output manually via setWebChromeClient and call the native logging method.

## The HTML side

### Plain HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Console Hook Example</title>
    <script>
        // Override console methods
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
    <button onclick="console.log('This is a log message')">Print log</button>
    <button onclick="console.info('This is an info message')">Print log</button>
    <button onclick="console.error('This is an error message')">Print error</button>
    <button onclick="console.warn('This is a warning message')">Print warning</button>
</body>
</html>
```

> **Note**
>
> This simply joins the arguments together, so you may end up with output like `my log: [object Object]`. Depending on your needs, you can `JSON.stringify` each argument before joining. Just remember to wrap it in a try-catch.

### Next.js

If you're on Next.js, you can do it like this:

Next.js provides a `<Script/>` component with a prop called [strategy](https://nextjs.org/docs/pages/api-reference/components/script#strategy) that controls where the script gets injected.

The loading strategy of the script. There are four different strategies that can be used:

- `beforeInteractive`: Load before any Next.js code and before any page hydration occurs.
- `afterInteractive`: (default) Load early but after some hydration on the page occurs.
- `lazyOnload`: Load during browser idle time.
- `worker`: (experimental) Load in a web worker.

> Scripts with `beforeInteractive` will always be injected inside the head of the HTML document regardless of where it's placed in the component. This strategy should only be used for critical scripts that need to be fetched as soon as possible.

We can pick the `beforeInteractive` strategy so the script is injected as early as possible.

```tsx
<Script id="hook-console-log" strategy="beforeInteractive">
    {/* Put the script from above here`*/}
</Script>
```

And sure enough, it ends up inside the head:

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202504082344198.png)


## iOS

### Steps

Make `MyWebViewController` conform to the `WKScriptMessageHandler` protocol

```objc
// MyWebViewController.h
#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>

@interface MyWebViewController : UIViewController <WKScriptMessageHandler>

// Other property and method declarations
@end
```

Implement the `userContentController:didReceiveScriptMessage:` method of the `WKScriptMessageHandler` protocol.

```objc
// MyWebViewController.m
#import "MyWebViewController.h"

@implementation MyWebViewController

// Implement the WKScriptMessageHandler protocol method
- (void)userContentController:(WKUserContentController *)userContentController didReceiveScriptMessage:(WKScriptMessage *)message {
    // Handle the received message
    if ([message.name isEqualToString:@"ConsoleLog"]) {
        // Handle this specific message
        NSLog(@"Received message: %@", message.body);
    }
}

// Other method implementations
@end
```

Create a `WKUserContentController` instance that receives the event, then assign it to the userContentController of `WKWebViewConfiguration`

```objc
// Set up the message handler in some method
WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];

WKUserContentController *userContentController = [[WKUserContentController alloc] init];

[userContentController addScriptMessageHandler:self name:@"ConsoleLog"]; // self here is the MyWebViewController instance
config.userContentController = userContentController;

WKWebView *webView = [[WKWebView alloc] initWithFrame:self.view.bounds configuration:config];
```

### Code example

Here's a complete example:

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

// Handle messages sent from JavaScript
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

This example shows how to make `MyWebViewController` conform to the `WKScriptMessageHandler` protocol and handle messages sent from JavaScript. 

> **Tip**
>
> In practice, you'll usually swap `NSLog` out for whatever logging method your app actually uses

> **Note**
>
> - On iOS 14 and later, to use `WKScriptMessageHandler` you need to add an `NSAppTransportSecurity` dictionary to `Info.plist` and set `NSAllowsArbitraryLoads` to `YES`.


## Android

### Code example

In `MainActivity.java`, configure the WebView: enable JavaScript, set a WebChromeClient, and override `onConsoleMessage` to intercept and handle the page's console output. Based on the message level (`LOG`, `ERROR`, `WARN`, etc.), forward each message to Android's logging system.

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

        // Enable JavaScript
        webView.settings.javaScriptEnabled = true

        // Set a WebViewClient
        webView.webViewClient = WebViewClient()

        // Set a WebChromeClient to handle console output
        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                // Handle console output
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

        // Load an HTML file or URL
        webView.loadUrl("file:///android_asset/index.html")
    }
}
```


## Summary

To wrap up:
- iOS can't hook console output directly from native code, so we inject a script at the very top of the HTML that overrides every console logging method up front, and add messaging logic on both the web and native sides. In effect, every log gets a copy siphoned off to native;
- Android can hook console output directly, so no messaging layer is needed.
