# Some Notes on Cookies

- Author: Rory Cai (https://coiggahou2002.github.io/)
- Published: 2025-05-16 (Asia/Shanghai; 2025-05-16T00:00:00.000Z)
- Language: en
- Canonical: https://coiggahou2002.github.io/blogs/http-cookie/
- Chinese version: https://coiggahou2002.github.io/zh/blogs/http-cookie/

## The Basics

What attributes should a cookie have?

### httpOnly
When a cookie has the HttpOnly attribute, it can only be sent over HTTP (or HTTPS) and can't be accessed by client-side JavaScript. This is an effective defense against cross-site scripting (XSS), because an attacker can't read an HttpOnly cookie by injecting malicious JavaScript.

### Secure
The Secure attribute says a cookie may only be sent over a secure HTTPS connection. If the connection between the browser and the server isn't HTTPS, the browser won't send cookies marked Secure to the server. This keeps cookies from being intercepted by a man-in-the-middle in transit and protects their confidentiality.

### Expires + Max-Age
- When both Expires and Max-Age appear in the same `Set-Cookie` header, Max-Age takes precedence.

## Understanding Cookies Through Native iOS

### NSHTTPCookie
`NSHTTPCookie` is a class that represents a single cookie, along with all the attributes a cookie should have.

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

// Quickly turn an array of cookie objects into a structure you can add to request headers
+ (NSDictionary<NSString *, NSString *> *)requestHeaderFieldsWithCookies:(NSArray<NSHTTPCookie *> *)cookies;

// Pull cookies out of response headers
+ (NSArray<NSHTTPCookie *> *)cookiesWithResponseHeaderFields:(NSDictionary<NSString *, NSString *> *)headerFields forURL:(NSURL *)URL;

@property (nullable, readonly, copy) NSDictionary<NSHTTPCookiePropertyKey, id> *properties;

/*!
    Cookie protocol version
    Version 0 maps to "old-style" Netscape cookies.
    Version 1 maps to RFC2965 cookies. There may be future versions.
*/
@property (readonly) NSUInteger version;

@property (readonly, copy) NSString *name;
@property (readonly, copy) NSString *value;

/*!
    Expiration date
    If not set, the cookie expires when the session ends
*/
@property (nullable, readonly, copy) NSDate *expiresDate;

// Whether the cookie is session-only (true when neither Expires nor Max-Age is set)
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

NSHTTPCookieStorage is a class in the Foundation framework, used when developing for iOS, macOS and other Apple platforms. Its main job is managing HTTP cookies.


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

### Manually Injecting Cookies for a Domain

I happened to need this, so it was a good chance to practice. It's actually pretty simple: add an input field to grab the cookie string, parse it, create `NSHTTPCookie` objects, and set them with `NSHTTPCookieStorage`.

```objc
NSString* cookieString = textFromInputView;
// First split the cookie string on semicolons and spaces
NSArray *cookiePairs = [cookieString componentsSeparatedByCharactersInSet:[NSCharacterSet characterSetWithCharactersInString:@"; "]];

for (NSString *pair in cookiePairs) {
    if (pair.length == 0) continue;
    NSArray *components = [pair componentsSeparatedByString:@"="];
    if (components.count != 2) {
        [CustomUITips showError:@"Input must be in the form key1=value1;key2=value2"];
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
        NSHTTPCookieExpires: [NSDate dateWithTimeIntervalSinceNow:3600] // Expires in 1 hour
    };
    NSHTTPCookie *cookie = [NSHTTPCookie cookieWithProperties:cookieProperties];
    [[NSHTTPCookieStorage sharedHTTPCookieStorage] setCookie:cookie];
}
```
