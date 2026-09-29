# Kotlin 学习笔记

- Author: Rory Cai (https://coiggahou2002.github.io/)
- Language: zh-CN
- Canonical: https://coiggahou2002.github.io/zh/blogs/app/learn-kotlin/
- English version: https://coiggahou2002.github.io/blogs/app/learn-kotlin/

最近想要深入一下 React Native 的源码，感觉从 Android 入手会相对好一点，因为本身就熟悉 Java，但是现在维护的项目是 Java 和 Kotlin 混合的，所以 Kotlin 也顺带看了一下。

主要和 TypeScript 结合对比来理解。

## 基本数据类型

Short, Int, Long

UShort, UInt, ULong

Boolean

String

Float

Double

## 变量

## 字符串

| Kotlin            | TypeScript          |
| ----------------- | ------------------- |
| `val str = "abc"` | `const str = "abc`  |
| `str.uppercase()` | `str.toUpperCase()` |

## 集合

### 统一方法接口

| Kotlin                          | TypeScript                        |
| ------------------------------- | --------------------------------- |
| `val list = listOf(1,2)`        | `const list = [1,2]`              |
| `val list = mutableListOf(1,2)` | `const list = [1,2]`              |
| `list.count()`                  | `list.length`                     |
| `list.first()`                  | `list[0]`                         |
| `list.last()`                   | `list[list.length-1]`             |
| `list.add(e)`                   | `list.push(e)`                    |
| `list.remove(e)`                | `list.filter(item => item !== e)` |


```kotlin
val vList = listOf(1,2,3)
vList.count()
vList.first()
vList.last()

val mList = mutableListOf(1,2,3)
mList.add(4)
mList.add(5)
mList.remove(0)
mList.remove(5)
println("is 5 in mList? ${5 in mList}")
```

### List

分为可变和不可变

初始化：
- `listOf()`
- `mutableListOf()`

### Set
### Map

```kotlin
val vMap = mapOf("discover" to 1, "book" to 2)
val mMap = mutableMapOf("discover" to 100, "book" to 200)

mMap["discover"] // access 100
mMap["discover"] = 10000 // modify
mMap.containsKey("discover") // true
mMap.remove("discover") // delete key
mMap.keys // ["discover", "book"]
mMap.values // [100, 200]
```

## 类型标记

```kotlin
val vList: List<Int> = listOf(1, 2)

val mMap: MutableMap<String, Boolean> = mutableMapOf("damn" to true, "fuck" to false)
```

## 空值安全

## 控制流

### 条件

和 TS 一模一样

```kotlin
val d: Int
val check = true

if (check) {
    d = 1
} else {
    d = 2
}

println(d) // 1
```

类三元表达式

```kotlin
val a = 1
val b = 2

println(if (a > b) a else b) // Returns a value: 2
```

### 分支

按顺序执行，命中一个就不会再走后面的（行为和 switch 还是不太一样的, switch 如果不写 return 是可以连续命中多个的）

#### 分支 + action

箭头后面就是命中之后的 action

```kotlin
val obj = "sofjewojfwee"

when (obj) {
    // Checks whether obj equals to "1"
    "1" -> println("One")
    // Checks whether obj equals to "Hello"
    "Hello" -> println("Greeting")
    // Default statement
    else -> println("Unknown")     
}
```

#### 分支 + 返回值

可以结合赋值表达式使用

TS 里面一般用立即执行函数来表达这种「同步分支决策赋值」的逻辑
```ts
// TypeScript

const condition = (() => {
    if (bundle === 'discover') {
        return 1;
    }
    if (bundle === 'bookDetail') {
        return 2;
    }
    if (bundle === 'rewards') {
        return 3;
    }
    return -1;
})();
```

换到 Kotlin 里可以用 when 结合返回值来做

```kotlin
// Kotlin

val returnedValue = when(bundle) {
    "discover" -> 1
    "bookDetail" -> 2
    "rewards" -> 3
    else -> -1
}
```

## 相等性判断

TypeScript
- `==` 带隐式转换
- `===` 完全相等

## 循环和迭代

### Range

```kotlin
for (number in 1..5) {
    println(number); // 1,2,3,4,5
}
for (num in 1..<5) {
    println(num) // 1,2,3,4
}
```

### 迭代数据结构

#### List

直接使用 for..in 迭代 List 即可

跟 TS 不太一样，TS 的 for..in 是用来迭代对象的 hasOwnProperty 键的，TS 里类似的迭代方法应该是 for..of，只要迭代的集合具有迭代器方法就可以使用这个方法来迭代

```kotlin
val bundles = listOf("bookDetail", "discoverV2")
for (bundle in bundles) {
    println(bundle)
}
```

#### Map

遍历 keys

```kotlin
val myMap = mapOf("one" to 1, "two" to 2)
for (k in myMap.keys) {
    println(k); // one, two
}
```


## 函数

### 声明 & 传参 & 默认值

声明函数的语法基本和 TypeScript 一样，返回值的标识也是一样

但 TS 有个问题，当参数太多的时候，需要用一个 options 收起来，以避免让参数的顺序干扰可读性，然后还要写个 interface XxxOptions {}

```ts
// TypeScript

interface MyFuncParams {
    message: string;
    prefix?: string;
}
const printMessageWithPrefix(params: MyFuncParams) {
    const { 
        message, 
        prefix = "DefaultPrefix"
    } = params || {};
    console.log(`[${prefix}] ${message}`);
}
printMessageWithPrefix({
    prefix: "Log",
    message: "hello"
})
```

Kotlin 就很好地解决了这个问题，函数调用表达式 (FunctionCallExpression) 所传的参数可以写明名字

```kotlin
// Kotlin

fun printMessageWithPrefix(message: String, prefix: String = "DefaultPrefix") {
    println("[$prefix] $message")
}

fun main() {
    // Uses named arguments with swapped parameter order
    printMessageWithPrefix(
        prefix = "Log",
        message = "Hello"
    )
    // [Log] Hello
}
```

### 匿名函数

感觉和 TS 的箭头函数基本一样，只是语法上有一点点不一样

而且和 TS 类似，匿名函数最常用在 filter, map 等函数上

```ts
// TypeScript

const annoFunc = (name: string) => {
    return name.toUpperCase();
}

const arr = [-2, -1, 0, 1, 2];
arr.filter(num => num > 0); // 1, 2
```

```kotlin
// Kotlin

val annoFunc = { name: String -> name.uppercase() }
annoFunc("abcd") // ABCD

val nums = listOf(-2, -1, 0, 1, 2)
nums.filter({ num: Int -> num > 0 }) // 1, 2
```

fold 函数，感觉和 reduce 干的是一样的事情

```kotlin
listOf(1, 2, 3).fold(0, { x, item -> x + item })
```



## 类/数据类

### class

构造实例不用写 new

### data class

标志性方法：
- toString()
- equals()
- copy()

数据类实例之间可以直接用 == 比较，因为实现了 equals 方法


## 异步

### Coroutine



## 和 Java 的主要区别和联系

- 语法糖更多
- 不强制 OOP
- Kotlin 的类似乎没有 static 一类的东西，构造实例的时候也不用写 `new` 关键字

## 和 TypeScript 的主要区别和联系

- TS 的类型检查是编译时行为，和运行时脱钩；Kotlin 本身就是静态语言
- 标记类型的语法非常相似
- 函数式风格都支持得比较好

## 和 Golang 的区别和联系
