# 关于 cookie 的一些总结

- Author: Rory Cai (https://coiggahou2002.github.io/)
- Published: 2025-05-16 (Asia/Shanghai; 2025-05-16T00:00:00.000Z)
- Language: zh-CN
- Canonical: https://coiggahou2002.github.io/zh/blogs/http-cookie/
- English version: https://coiggahou2002.github.io/blogs/http-cookie/

## 基本

一条 cookie 应该有什么属性？

### httpOnly
当一个 Cookie 被设置为 HttpOnly 属性后，它只能通过 HTTP（或 HTTPS）协议传输，不能被客户端的 JavaScript 脚本访问。这可以有效防止跨站脚本攻击（XSS），因为攻击者无法通过注入恶意的 JavaScript 代码来获取 HttpOnly Cookie 的信息。

### Secure
Secure 属性用于指定 Cookie 只能通过安全的 HTTPS 连接传输。当浏览器与服务器之间的连接不是 HTTPS 时，浏览器不会将带有 Secure 属性的 Cookie 发送给服务器。这可以防止 Cookie 在传输过程中被中间人截获，保护 Cookie 信息的保密性。

### Expires + Max-Age
- 当 Expires 和 Max-Age 同时出现在一个 `Set-Cookie` 头中时，Max - Age 的优先级更高。

## 结合 iOS 原生知识来理解 cookie

### NSHTTPCookie
`NSHTTPCookie` 是一个类，代表一条 cookie，以及含有 cookie 应该有的属性

```objc
/*	
    NSHTTPCookie.h
    Copyright (c) 2003-2019, Apple Inc. All rights reserved.    
    
    Public header file.
*/

#import <Foundation/NSObject.h>

@class NSArray<ObjectType>;
@class NSDate;
@class NSDictionary<KeyType, ObjectType>;
@class NSNumber;
@class NSString;
@class NSURL;

typedef NSString * NSHTTPCookiePropertyKey NS_TYPED_EXTENSIBLE_ENUM;
typedef NSString * NSHTTPCookieStringPolicy NS_TYPED_ENUM;

NS_HEADER_AUDIT_BEGIN(nullability, sendability)

- (nullable instancetype)initWithProperties:(NSDictionary<NSHTTPCookiePropertyKey, id> *)properties;

+ (nullable NSHTTPCookie *)cookieWithProperties:(NSDictionary<NSHTTPCookiePropertyKey, id> *)properties;

// 快速把一系列 cookie 对象转成可以添加到请求 header 的结构
+ (NSDictionary<NSString *, NSString *> *)requestHeaderFieldsWithCookies:(NSArray<NSHTTPCookie *> *)cookies;

// 从回包 header 里面找出 cookie
+ (NSArray<NSHTTPCookie *> *)cookiesWithResponseHeaderFields:(NSDictionary<NSString *, NSString *> *)headerFields forURL:(NSURL *)URL;

@property (nullable, readonly, copy) NSDictionary<NSHTTPCookiePropertyKey, id> *properties;

/*!
    cookie 协议版本
    Version 0 maps to "old-style" Netscape cookies.
    Version 1 maps to RFC2965 cookies. There may be future versions.
*/
@property (readonly) NSUInteger version;

@property (readonly, copy) NSString *name;
@property (readonly, copy) NSString *value;

/*!
    过期时间
    如果没有定义，cookie 会在对话结束时过期
*/
@property (nullable, readonly, copy) NSDate *expiresDate;

// 是否会话级别有效（当 Expires 和 Max-Age 都没设置的时候就是）
@property (readonly, getter=isSessionOnly) BOOL sessionOnly;

@property (readonly, copy) NSString *domain;
@property (readonly, copy) NSString *path;
@property (readonly, getter=isSecure) BOOL secure;
@property (readonly, getter=isHTTPOnly) BOOL HTTPOnly;

@property (nullable, readonly, copy) NSString *comment;
@property (nullable, readonly, copy) NSURL *commentURL;

@property (nullable, readonly, copy) NSArray<NSNumber *> *portList;

@property (nullable, readonly, copy) NSHTTPCookieStringPolicy sameSitePolicy API_AVAILABLE(macos(10.15), ios(13.0), watchos(6.0), tvos(13.0));

@end

NS_HEADER_AUDIT_END(nullability, sendability)

```

### NSHTTPCookieStorage

NSHTTPCookieStorage 是 Foundation 框架里的一个类，在 iOS、macOS 等苹果操作系统的开发中使用，主要用于管理 HTTP 协议里的 Cookie。


```objc
/*	
    NSHTTPCookieStorage.h
    Copyright (c) 2003-2019, Apple Inc. All rights reserved.    
    
    Public header file.
*/

#import <Foundation/NSObject.h>
#import <Foundation/NSNotification.h>

@class NSArray<ObjectType>;
@class NSHTTPCookie;
@class NSURL;
@class NSDate;
@class NSURLSessionTask;
@class NSSortDescriptor;

NS_HEADER_AUDIT_BEGIN(nullability, sendability)

typedef NS_ENUM(NSUInteger, NSHTTPCookieAcceptPolicy) {
    NSHTTPCookieAcceptPolicyAlways,
    NSHTTPCookieAcceptPolicyNever,
    NSHTTPCookieAcceptPolicyOnlyFromMainDocumentDomain
};

@class NSHTTPCookieStorageInternal;

NS_SWIFT_SENDABLE
API_AVAILABLE(macos(10.2), ios(2.0), watchos(2.0), tvos(9.0))
@interface NSHTTPCookieStorage : NSObject
{
    @private
    NSHTTPCookieStorageInternal *_internal;
}

@property(class, readonly, strong) NSHTTPCookieStorage *sharedHTTPCookieStorage;

+ (NSHTTPCookieStorage *)sharedCookieStorageForGroupContainerIdentifier:(NSString *)identifier API_AVAILABLE(macos(10.11), ios(9.0), watchos(2.0), tvos(9.0));

@property (nullable , readonly, copy) NSArray<NSHTTPCookie *> *cookies;

- (void)setCookie:(NSHTTPCookie *)cookie;

- (void)deleteCookie:(NSHTTPCookie *)cookie;

- (void)removeCookiesSinceDate:(NSDate *)date API_AVAILABLE(macos(10.10), ios(8.0), watchos(2.0), tvos(9.0));

- (nullable NSArray<NSHTTPCookie *> *)cookiesForURL:(NSURL *)URL;

- (void)setCookies:(NSArray<NSHTTPCookie *> *)cookies forURL:(nullable NSURL *)URL mainDocumentURL:(nullable NSURL *)mainDocumentURL;

@property NSHTTPCookieAcceptPolicy cookieAcceptPolicy;

- (NSArray<NSHTTPCookie *> *)sortedCookiesUsingDescriptors:(NSArray<NSSortDescriptor *> *) sortOrder API_AVAILABLE(macos(10.7), ios(5.0), watchos(2.0), tvos(9.0));

@end

@interface NSHTTPCookieStorage (NSURLSessionTaskAdditions)
- (void)storeCookies:(NSArray<NSHTTPCookie *> *)cookies forTask:(NSURLSessionTask *)task API_AVAILABLE(macos(10.10), ios(8.0), watchos(2.0), tvos(9.0));
- (void)getCookiesForTask:(NSURLSessionTask *)task completionHandler:(void (NS_SWIFT_SENDABLE ^) (NSArray<NSHTTPCookie *> * _Nullable cookies))completionHandler API_AVAILABLE(macos(10.10), ios(8.0), watchos(2.0), tvos(9.0));
@end

FOUNDATION_EXPORT NSNotificationName const NSHTTPCookieManagerAcceptPolicyChangedNotification API_AVAILABLE(macos(10.2), ios(2.0), watchos(2.0), tvos(9.0));

FOUNDATION_EXPORT NSNotificationName const NSHTTPCookieManagerCookiesChangedNotification API_AVAILABLE(macos(10.2), ios(2.0), watchos(2.0), tvos(9.0));

NS_HEADER_AUDIT_END(nullability, sendability)
```

### 手动给某个域注入 cookie

正好遇到这种需求，来练练手，其实比较简单，搞个输入框获取一下 cookie，然后解析，再创建 NSHTTPCookie 对象，用 NSHTTPCookieStorage 设置进去就好了

```objc
NSString* cookieString = textFromInputView;
// 先按分号和空格分割Cookie字符串
NSArray *cookiePairs = [cookieString componentsSeparatedByCharactersInSet:[NSCharacterSet characterSetWithCharactersInString:@"; "]];

for (NSString *pair in cookiePairs) {
    if (pair.length == 0) continue;
    NSArray *components = [pair componentsSeparatedByString:@"="];
    if (components.count != 2) {
        [CustomUITips showError:@"输入必须是 key1=value1;key2=value2 的形式"];
        break;
    }
    NSString *key = components[0];
    NSString *value = components[1];
    NSLog(@"setCookie key=%@", key);
    NSLog(@"setCookie value=%@", value);
    NSDictionary *cookieProperties = @{
        NSHTTPCookieDomain: @"weread.qq.com",
        NSHTTPCookiePath: @"/",
        NSHTTPCookieName: key,
        NSHTTPCookieValue: value,
        NSHTTPCookieExpires: [NSDate dateWithTimeIntervalSinceNow:3600] // 1小时后过期
    };
    NSHTTPCookie *cookie = [NSHTTPCookie cookieWithProperties:cookieProperties];
    [[NSHTTPCookieStorage sharedHTTPCookieStorage] setCookie:cookie];
}
```
