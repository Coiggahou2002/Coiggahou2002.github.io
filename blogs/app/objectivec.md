# Objective-C Learning Notes

- Author: Rory Cai (https://coiggahou2002.github.io/)
- Published: 2025-05-17
- Language: en
- Canonical: https://coiggahou2002.github.io/blogs/app/objectivec/
- Chinese version: https://coiggahou2002.github.io/zh/blogs/app/objectivec/

## Data Types

### Primitive Types

Standard C data types work too

```c
int someInt = 42;
float someFloat = 3.2f;
```

> Local variables are allocated on the stack, while objects are allocated on the heap

```objc
BOOL a = YES;
```

### Non-Primitive Types

```objc
// Root type
NSObject

// Immutable types
NSString : NSObject
NSNumber : NSObject

// Mutable types
NSMutableString : NSString
NSMutableArray : NSArray
NSMutableDictionary : NSDictionary

```

### Strings and Numbers

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

// Use the factory method, more convenient
NSNumber *num2 = [NSNumber numberWithInt:43];

// Use a boxed expression
NSNumber *num3 = @(84 / 2);
```

Objective-C requires manual boxing/unboxing
```objc
NSNumber *num1 = 10; // Won't work: no auto-boxing, you need the @
NSNumber *num1 = @10; // OK
int num2 = num1; // This only gets you the address of the num1 object
int num2 = [num1 intValue]; // OK, manual unboxing
NSLog(@"%@, %d", num1, num2);
```

`intValue` is a method of the NSValue class

### Arrays

Mutable / immutable

```objc
NSArray *arr = @[ @1, @2, @3 ];

NSMutableArray *mutArr = [[NSMutableArray alloc] initWithArray:arr];
[mutArr addObject:@4];

// Iterate with an enumerator
NSEnumerator *enumerator = [arr objectEnumerator];
id thing = nil;
while (thing = [enumerator nextObject]) {
    NSLog(@"thing: %@", thing);
}

// The C way
for (int i = 0; i < arr.count; i++) {
    NSLog(@"for: %@", arr[i]);
}

// The for-in way
for (NSNumber *num in arr) {
    NSLog(@"for in: %@", num);
}
```

### Dictionaries

Mutable / immutable

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

## Logging

```objc
NSLog(@"I am a line of log");

NSLog(@"%@", greeting);
```
> **Info**
>
> %@ works like a printf format string; %@ stands for any object (it calls the object's description method, similar to toString in a Java class). **The difference is that NSLog adds a timestamp, which printf doesn't**

## Methods

- The call syntax is a bit different from C-like languages
- Every parameter name is part of the method name (which ends up being roughly equivalent to overloading)

### Calling

```objectivec
UIViewController *vc = [[UIViewController alloc] init];
```

In a C-like language this would be 
```js
UIViewController *vc = UIViewController.alloc().init()
```

### Passing Arguments

```objc
UIView *view = [[UIView alloc] init];
view.backgroundColor = [UIColor greenColor];
view.frame = CGRectMake(150, 150, 100, 100);
[self.view addSubview:view];
```

Roughly equivalent to 
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

An example passing a single argument
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

### Declaration / Implementation / Header Files

A class declaration usually goes in a `.h` file

The class implementation goes in a `.m` file


Declaration
```objc
// MyViewController.h

@interface MyViewController : UIViewController

// Properties should go inside the interface
@property NSString *name;
@property NSNumber *id;
@property (readonly) NSString *readOnlyName;

// The minus sign means it's an instance method
- (void)someMethod;

@end
```

> **Info**
>
> A minus sign means an instance method; a plus sign means a class method

Implementation
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
> Methods declared in the header file can be thought of as public API, and methods that only exist in the implementation file as private API. In reality, though, Objective-C has no truly private methods: even if a method isn't in the header, you can still call it via reflection.


### Initialization

When initializing, alloc and init must be called back to back, and you keep the final return value

- alloc clears out any garbage data in the memory region being allocated
- init assigns appropriate initial values to the various properties

```objc
// Usage 1
MyViewController *myVc = [[MyViewController alloc] init];

// Usage 2, which is effectively the same as calling alloc and init with no arguments
MyViewController *myVc = [MyViewController new];
```

> **Info**
>
> If you call alloc first, you can follow it with a custom init method, e.g. `[[MyClass alloc] initWithBundleName:@"discoverV2"]`. You can't do that with new, which is just syntactic sugar for alloc + init.

> **Warning**
>
> The init method may return an address completely different from what alloc returned, so the usual initialization pattern is `if (self = [super init]) `, check that self isn't nil, and then `return (self)`

### No Abstract Classes or Virtual Functions?

### Properties

- Declared in the header file with `@property`
- In the implementation file, `@synthesize` automatically generates getter/setter functions for the variable (you can skip it; they're generated automatically)
- If you write custom getter/setter methods, they override the generated ones
- Externally visible properties (public properties) are declared in the header file; private properties are declared in the implementation file

| **Aspect**         | **Public properties (.h)**         | **Private properties (class extension)**      |
|------------------|-----------------------------|----------------------------|
| **Visibility**       | Visible externally, directly accessible        | Visible only inside the class               |
| **Subclass inheritance**     | Subclasses can inherit and access them            | Not visible to subclasses                 |
| **Memory management**     | Follows property attribute rules (e.g. `strong`) | Same as public properties                 |
| **Use cases**     | Properties that need outside access (e.g. UI configuration) | Internal state (e.g. caches, counters) |


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

Private properties go in the implementation file

```objc
// Person.h
@interface Person ()
@property float weight;
@end
```

> **Tip**
>
> Note: to declare private properties in the implementation file, you use the "class extension" syntax, i.e. `@interface YourClass ()`. **It must end with a pair of parentheses**, which distinguishes it from the `@interface` declaration in the header and marks it as a private extension of the class.

**A bit of history**:
- Originally there was no `@property` syntax. You had to write the getter/setter for every property yourself, and reading or setting a property always went through methods, e.g. `[person age]` and `[person setAge:28]`
- Then `@property` and `@synthesize` arrived. Now you only had to declare a property in the header or implementation file, and the compiler would generate the getter/setter for you (not through plain code generation, though; Apple hides the implementation details). Reading and setting properties still went through methods at this point
- Later came dot syntax, which finally let you read and set properties with `person.age` and `person.age = 28`. But dot syntax is just syntactic sugar too: on the left side of an assignment it implicitly calls the setter, and on the right side it calls the getter


### Writing a Class

@interface + @implementation

@class creates a forward reference to speed up compilation

### Categories

Used to add methods to an existing class

Create a header file with a plus sign in its name, `NSString+SpecialFix.h`
```objc
#import <Foundation/Foundation.h>

@interface NSString (SpecialFix)
-(NSNumber*)lengthAsNumber;
@end
```

Likewise, create an implementation file with a plus sign in its name, `NSString+SpecialFix.m`
```objc
#import "NSString+SpecialFix.h"

@implementation NSString (SpecialFix)
-(NSNumber*)lengthAsNumber {
    NSUInteger length = [self length];
    return [NSNumber numberWithUnsignedInt:length];
}
@end
```

Now anywhere else, you just import the header `NSString+SpecialFix.h` and you can use the new method on NSString
```objc
#import "NSString+SpecialFix.h"

NSNumber *len = [@"hello" lengthAsNumber];
```

> **Info**
>
> At first I was puzzled: `NSUInteger` looks like something along the lines of `NSNumber`, so why would it need this kind of boxing conversion? Jumping to its definition shows it's actually `typedef unsigned long NSUInteger`, so it's a primitive type.

### Protocols

Basically Java's interface

Protocols are declared in a header file, e.g. `Encoder.h` contains the following

```objc
@protocol Encoder <NSObject>

-(NSString*)encode;

@end
```

Class A conforming to protocol B is equivalent to `class A implements B {}` in Java

It takes two things:
1. Declare in `A.h` that A conforms to protocol B
2. Implement all of protocol B's required methods in `A.m` (there are also optional methods, which you don't have to implement)

```objc
@implementation A <B>

-(NSString*) encode {
    return @"encoded result";
}

@end
```

## Geometry

- CGFloat: a floating-point number
- CGSize: width and height
- CGPoint: a point on a 2D plane
- CGRect: a rectangular region on a 2D plane

Shorthand constructors:
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

## Header Files

C uses include; Objective-C supports both, but mostly uses import

> **Info**
>
> `#import` is smarter than `#include`: it won't import a file that's already been imported

Angle brackets mean a system header; quotes mean a header from within the project

```objc
#import <Foundation/Foundation.h>
#import "WRAIChatViewController.h"
```


## KVC

This isn't actually an Objective-C language feature; it's provided by Cocoa.

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

**Pros**:
- You can read and set properties without getter/setter methods
- Values returned by valueForKey are boxed automatically
- For setValue:forKey you have to wrap the value with @ yourself

**Cons**: it's not a good fit for pulling deeply nested values via key paths, because key paths are expressed as strings and the compiler can't check whether they're correct

## Blocks

### Definition

C function pointer syntax
```c
int (*addFunc)(int num1, int num2);

int add(int a, int b) {
    return a + b;
}

addFunc = &add;
```

JS syntax
```ts
const add = (a, b) => a + b;
```

Objective-C syntax

```objc
int (^addFunc)(int num1, int num2) = ^(int a, int b){
    return num1 + num2;
};

int ress = addFunc(1,9);
NSLog(@"ress: %d", ress);

// Without a return value
void (^printFunc)(void) = ^{
    NSLog(@" I am printFunc result");
};

```

In short, the Objective-C syntax is:
```objc
return_type (^block_name)(args) = ^(args) {
    logic
}
```

### IIFC

You can actually do an IIFC just like in JS: declare it and run it right away

In JS

```ts
const result = (() => {
    const a = "prefix";
    const b = "suffix";
    return a + b;
})(); // prefixsuffix
```

In Objective-C

```objc
NSString* result = (^{
    NSString *a = @"prefix";
    NSString *b = @"suffix";
    NSArray *components = @[a, b];
    return [components componentsJoinedByString:@""];
})();
NSLog(@"result = %d", result); // prefixsuffix
```

Now with parameters, in JS

```ts
const result = ((a, b) => a + b)("prefix", "suffix");
```

Objective-C
```objc
NSString* result = (^(NSString *a, NSString *b) {
    NSArray *components = @[a, b];
    return [components componentsJoinedByString:@""];
})(@"prefix", @"suffix"); // prefixsuffix
```

### Variable Capture

Objective-C blocks automatically capture these kinds of variables:
- Global static variables
- Local variables: variables in the same scope as the block declaration
- Parameter variables

My guess is that local variables are captured by copy, which is why you can't assign to a captured outer local variable inside a block

If you need to assign to it, you have to manually add `__block` in front of the outer variable's declaration

## References

[Official documentation](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/ProgrammingWithObjectiveC/Introduction/Introduction.html#//apple_ref/doc/uid/TP40011210-CH1-SW1)
