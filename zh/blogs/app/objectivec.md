# Objective-C 学习笔记

- Author: Rory Cai (https://coiggahou2002.github.io/)
- Published: 2025-05-17
- Language: zh-CN
- Canonical: https://coiggahou2002.github.io/zh/blogs/app/objectivec/
- English version: https://coiggahou2002.github.io/blogs/app/objectivec/

## 数据类型

### 基本数据类型

标准 C 数据类型也是可以用的

```c
int someInt = 42;
float someFloat = 3.2f;
```

> 局部变量在栈上分配，而对象在堆上分配

```objc
BOOL a = YES;
```

### 非基本

```objc
// 根类型
NSObject

// 不可变类型
NSString : NSObject
NSNumber : NSObject

// 可变类型
NSMutableString : NSString
NSMutableArray : NSArray
NSMutableDictionary : NSDictionary

```

### 字符串和数字

```objc
NSString *str = @"fuckyou";
NSString *str2 = @"yes";

NSUInteger len = [str length]; // 7
NSUInteger len2 = str.length; // 7

BOOL eq = [str isEqualToString:str2];
BOOL endsWithU = [str hasSuffix:@"u"];

// split
NSArray *components = [pair componentsSeparatedByString:@"="];
```

```objc
NSNumber *num = [[NSNumber alloc] initWithInt:42];

// 使用工厂方法 更方便
NSNumber *num2 = [NSNumber numberWithInt:43];

// 使用 boxed expression
NSNumber *num3 = @(84 / 2);
```

oc 需要手动装箱/拆箱
```objc
NSNumber *num1 = 10; // 不行，不会自动装箱，需要加 @
NSNumber *num1 = @10; // OK
int num2 = num1; // 这样只会拿到 num1 对象的地址
int num2 = [num1 intValue]; // OK 手动拆箱
NSLog(@"%@, %d", num1, num2);
```

`intValue` 是 NSValue 类的方法

### 数组

可变 / 不可变

```objc
NSArray *arr = @[ @1, @2, @3 ];

NSMutableArray *mutArr = [[NSMutableArray alloc] initWithArray:arr];
[mutArr addObject:@4];

// enumerator 遍历
NSEnumerator *enumerator = [arr objectEnumerator];
id thing = nil;
while (thing = [enumerator nextObject]) {
    NSLog(@"thing: %@", thing);
}

// C 语言方式
for (int i = 0; i < arr.count; i++) {
    NSLog(@"for: %@", arr[i]);
}

// for-in 方式
for (NSNumber *num in arr) {
    NSLog(@"for in: %@", num);
}
```

### 字典

可变 / 不可变

```objc
NSDictionary *myDict = @{
    @"name": @"John",
    @"age": @123,
    @"male": @YES,
};

NSMutableDictionary *mutDict = [[NSMutableDictionary alloc] initWithDictionary:myDict];
[mutDict addEntriesFromDictionary:@{
            @"dynamic": @YES,
        }];
```

## 打印

```objc
NSLog(@"I am a line of log");

NSLog(@"%@", greeting);
```
> **Info**
>
> %@ 的行为类似 printf 的模板串，%@表示任何对象（会调用对象的 description 方法，类似 Java 类的 toString 方法），**不同的是，NSLog 比 printf 多了时间戳**

## 方法

- 调用的语法和类 C 语法略有不同
- 每个参数名都是方法名的一部分（这样一来跟重载也差不多了）

### 调用

```objectivec
UIViewController *vc = [[UIViewController alloc] init];
```

在类 C 语言中相当于 
```js
UIViewController *vc = UIViewController.alloc().init()
```

### 传参

```objc
UIView *view = [[UIView alloc] init];
view.backgroundColor = [UIColor greenColor];
view.frame = CGRectMake(150, 150, 100, 100);
[self.view addSubview:view];
```

类似于 
```js
UIView *view = UIView.alloc().init();
view.backgroundColor = UIColor.greenColor();
view.frame = {
    x: 150,
    y: 150,
    width: 100,
    height: 100
};
self.view.addSubView(view);
```

传单个参数的例子
```objc
#import "Foundation/NSObjCRuntime.h"
#import "XYZPerson.h"

@implementation XYZPerson


- (void) saySomething:(NSString *)word {
    NSLog(@"%@", word);
}

- (void) sayHello{
    [self saySomething:@"Hello"];
}

@end
```


## OOP

### 声明/实现/头文件

类的声明一般放在 `.h` 文件

类的实现放在 `.m` 文件


声明
```objc
// MyViewController.h

@interface MyViewController : UIViewController

// 属性应该写到 interface 里面
@property NSString *name;
@property NSNumber *id;
@property (readonly) NSString *readOnlyName;

// 减号表示是实例的方法
- (void)someMethod;

@end
```

> **Info**
>
> 减号表示是实例的方法，加号表示是类的方法

实现
```objc
#import "MyViewController.h"

@implementation MyViewController

- (instancetype)init{
    self = [super init];
    if (self) {
        
    }
    return self;
}

- (void)viewDidDisappear:(BOOL)animated{
    [super viewDidDisappear:animated];
}


@end
```

> **Warning**
>
> 在头文件有声明的方法可以认为是公有 API，只在实现文件里的方法可以认为是私有 API，但实际上，在 oc 里面没有真正的私有方法，因为即使头文件没写，也可以通过反射方式调用。


### 初始化

初始化的时候，alloc 和 init 必须连续调用，然后拿最后那个返回值

- alloc 的作用是清除要分配的内存区域的脏数据
- init 的作用是给各种属性分配合适的初始值

```objc
// 用法 1
MyViewController *myVc = [[MyViewController alloc] init];

// 用法 2, 它实际上与不带参数调用alloc和init相同
MyViewController *myVc = [MyViewController new];
```

> **Info**
>
> 先用 alloc 的话，可以再调用自定义的 init 方法，例如 `[[MyClass alloc] initWithBundleName:@"discoverV2"]`，用 new 的话就不行，相当于 alloc + init 的语法糖。

> **Warning**
>
> init 方法可能返回跟 alloc 返回值完全不同的地址，所以初始化的模式一般都是 `if (self = [super init]) ` 之后再判断 self 不为空，然后 `return (self)`

### 似乎没有抽象类和虚函数？

### 属性

- 在头文件中使用 `@property` 声明
- 在实现文件中使用 `@synthesize` 为变量自动创建 getter/setter 函数（可以忽略，会自动创建）
- 如果有自定义的 getter/setter 方法，会覆盖默认创建的方法
- 外部可见的属性（公开属性），在头文件里写声明；私有属性在实现文件里写声明

| **特性**         | **公开属性（.h）**         | **私有属性（类扩展）**      |
|------------------|-----------------------------|----------------------------|
| **可见性**       | 外部可见，可直接访问        | 仅类内部可见               |
| **子类继承**     | 子类可继承和访问            | 子类不可见                 |
| **内存管理**     | 需遵循属性修饰符规则（如 `strong`） | 同公开属性                 |
| **适用场景**     | 需外部访问的属性（如 UI 配置） | 内部状态（如缓存、计数器） |


```objc
// Person.h
@interface Person : NSObject
@property float age;
@property BOOL isMan;

-(void)somePublicMethod;
@end
```

```objc
// Person.m
@implementation Person

@end
```

私有属性在实现文件里写

```objc
// Person.h
@interface Person ()
@property float weight;
@end
```

> **提示**
>
> 注意：在实现文件里声明私有属性，需要用「类扩展」写法，也就是 `@interface YourClass ()`，**最后面要跟一个括号**，括号用来和头文件的 `@interface` 声明区分开，表示这是类的私有扩展。

**一些发展历程**：
- 最开始的时候没有 `@property` 语法，每个属性的 getter/setter 方法要自己去写，访问属性/设置属性，都是通过方法来进行的，例如 `[person age]` 和 `[person setAge:28]`
- 后来有了 `@property` 和 `@synthesize` 之后，属性只需要在头文件或者实现文件里声明，编译器会自动生成 getter/setter 方法（但走的不是单纯代码生成的逻辑，苹果隐藏了实现细节），此时访问属性和设置属性，仍然都要用方法
- 再后来有了点语法，才能够通过点语法来访问和设置属性，例如 `person.age` 和 `person.age = 28`，但其实点语法也只是语法糖，出现在等号左边的时候其实是会隐式调用 setter 方法，出现在等号右边的时候会调用 getter 方法


### 类的写法

@interface + @implementation

@class 用来创建一个前向引用，加快编译速度

### 类别 category

用于给现有的类添加方法

创建一个带加号的头文件 `NSString+SpecialFix.h`
```objc
#import <Foundation/Foundation.h>

@interface NSString (SpecialFix)
-(NSNumber*)lengthAsNumber;
@end
```

同样地，创建一个带加号的实现文件 `NSString+SpecialFix.m`
```objc
#import "NSString+SpecialFix.h"

@implementation NSString (SpecialFix)
-(NSNumber*)lengthAsNumber {
    NSUInteger length = [self length];
    return [NSNumber numberWithUnsignedInt:length];
}
@end
```

此时在其他地方，只需要引入头文件 `NSString+SpecialFix.h`，就能够在 NSString 上使用新方法了
```objc
#import "NSString+SpecialFix.h"

NSNumber *len = [@"hello" lengthAsNumber];
```

> **Info**
>
> 一开始我还在疑惑，`NSUInteger` 看起来像是个 `NSNumber` 之类的样子，为什么需要有这种装箱转换，点进去一看，其实是 `typedef unsigned long NSUInteger`，其实他是个基本类型。

### 协议 protocol

基本上就是 Java 的 interface

协议用头文件声明，例如 `Encoder.h` 写以下内容

```objc
@protocol Encoder <NSObject>

-(NSString*)encode;

@end
```

类 A 遵守协议 B，等同于 Java 里面 `class A implements B {}`

需要做两件事情：
1. 需要在 `A.h` 里说明 A 遵守协议 B
2. 需要在 `A.m` 里实现协议 B 的所有必须实现的方法（也有可选实现的方法，这种可以不实现）

```objc
@implementation A <B>

-(NSString*) encode {
    return @"encoded result";
}

@end
```

## 几何

- CGFloat 浮点数
- CGSize 宽高
- CGPoint 二维平面点
- CGRect 二维矩形区域表示

快速创建的方法：
- CGSizeMake
- CGPointMake
- CGRectMake

```objc
CGFloat w = 100;
CGFloat h = 200;
CGSize size = CGSizeMake(w, h);

CGFloat x = 10;
CGFloat y = 20;
CGPoint point = CGPointMake(x, y);

CGRect rect = CGRectMake(point.x, point.y, size.width, size.height);
NSLog(@"%f, %f, %f, %f", rect.origin.x, rect.origin.y, rect.size.width, rect.size.height);
// 10 20 100 200

```

## 头文件

C 语言用 include，oc 两种都可以，主要用 import

> **Info**
>
> `#import` 比 `#include` 聪明，不会重复导入已导入的文件

尖括号表示系统头文件，引号表示是项目内的头文件

```objc
#import <Foundation/Foundation.h>
#import "WRAIChatViewController.h"
```


## KVC

该特性不是 Objective-C 的特性，其实是 Cocoa 提供的特性。

```objc
// Shape.h
@interface Shape : NSObject <RYCopying, RYSerializable>

@property float age;

@end

// test.m
Shape *sh = [[Shape alloc] init];
[sh setAge:23.2];
float aggg = [[sh valueForKey:@"age"] floatValue];
NSLog(@"valueForKey: %f", aggg); // 23.20001
NSLog(@"valueForKey at: %@", [sh valueForKey:@"age"]); // 23.2
[sh setValue:@54.3 forKey:@"age"];
NSLog(@"valueForKey at: %@", [sh valueForKey:@"age"]); // 54.3
```

**优点**：
- 不需要 getter/setter 方法也能访问和设置属性
- valueForKey 拿出来的值会自动装箱
- setValue:forKey 需要自己用 @ 包装

**缺点**：不适合用键路径方式来取深嵌套的属性值，因为键路径用字符串来表达，编译器无法检查它是否正确

## block

### 定义

C 语言函数指针写法
```c
int (*addFunc)(int num1, int num2);

int add(int a, int b) {
    return a + b;
}

addFunc = &add;
```

JS 写法
```ts
const add = (a, b) => a + b;
```

OC 写法

```objc
int (^addFunc)(int num1, int num2) = ^(int a, int b){
    return num1 + num2;
};

int ress = addFunc(1,9);
NSLog(@"ress: %d", ress);

// 没返回值的写法
void (^printFunc)(void) = ^{
    NSLog(@" I am printFunc result");
};

```

总而言之，OC 的语法：
```objc
return_type (^block_name)(args) = ^(args) {
    logic
}
```

### IIFC

其实也可以像 JS 一样搞一个 IIFC，声明完马上执行

JS 这样写

```ts
const result = (() => {
    const a = "prefix";
    const b = "suffix";
    return a + b;
})(); // prefixsuffix
```

OC 这样写

```objc
NSString* result = (^{
    NSString *a = @"prefix";
    NSString *b = @"suffix";
    NSArray *components = @[a, b];
    return [components componentsJoinedByString:@""];
})();
NSLog(@"result = %d", result); // prefixsuffix
```

再加个参数，JS

```ts
const result = ((a, b) => a + b)("prefix", "suffix");
```

OC
```objc
NSString* result = (^(NSString *a, NSString *b) {
    NSArray *components = @[a, b];
    return [components componentsJoinedByString:@""];
})(@"prefix", @"suffix"); // prefixsuffix
```

### 变量捕获

OC block 自动捕获这些类型的变量：
- 全局静态变量
- 本地变量：和 block 声明处在同一作用域内的变量
- 参数变量

捕获本地变量的时候，我猜是拷贝方式的捕获，所以在 block 中无法对引用的外部本地变量赋值

需要赋值的话，引用的外部变量需要手动在声明前加一个 `__block`

## 参考资料备忘

[官方文档](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/ProgrammingWithObjectiveC/Introduction/Introduction.html#//apple_ref/doc/uid/TP40011210-CH1-SW1)
