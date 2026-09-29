# Kotlin Learning Notes

- Author: Rory Cai (https://coiggahou2002.github.io/)
- Language: en
- Canonical: https://coiggahou2002.github.io/blogs/app/learn-kotlin/
- Chinese version: https://coiggahou2002.github.io/zh/blogs/app/learn-kotlin/

I've been wanting to dig into the React Native source code lately, and starting from the Android side felt easier since I already know Java. But the project I maintain mixes Java and Kotlin, so I picked up some Kotlin along the way.

I mostly learn it by comparing it with TypeScript.

## Basic Data Types

Short, Int, Long

UShort, UInt, ULong

Boolean

String

Float

Double

## Variables

## Strings

| Kotlin            | TypeScript          |
| ----------------- | ------------------- |
| `val str = "abc"` | `const str = "abc`  |
| `str.uppercase()` | `str.toUpperCase()` |

## Collections

### A Uniform Method Interface

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

Comes in mutable and immutable flavors

Initialization:
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

## Type Annotations

```kotlin
val vList: List<Int> = listOf(1, 2)

val mMap: MutableMap<String, Boolean> = mutableMapOf("damn" to true, "fuck" to false)
```

## Null Safety

## Control Flow

### Conditionals

Exactly the same as TS

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

Ternary-style expressions

```kotlin
val a = 1
val b = 2

println(if (a > b) a else b) // Returns a value: 2
```

### Branching

Branches are checked in order, and once one matches, the rest are skipped (so it's not quite the same as switch: without a return, a switch can fall through and match several cases in a row)

#### Branch + Action

Whatever follows the arrow is the action that runs on a match

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

#### Branch + Return Value

It can be combined with an assignment expression

In TS, this kind of "synchronously pick a branch and assign the result" logic is usually written with an immediately invoked function
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

In Kotlin, you can do it with when plus a return value

```kotlin
// Kotlin

val returnedValue = when(bundle) {
    "discover" -> 1
    "bookDetail" -> 2
    "rewards" -> 3
    else -> -1
}
```

## Equality Checks

TypeScript
- `==` with implicit type coercion
- `===` strict equality

## Loops and Iteration

### Range

```kotlin
for (number in 1..5) {
    println(number); // 1,2,3,4,5
}
for (num in 1..<5) {
    println(num) // 1,2,3,4
}
```

### Iterating Over Data Structures

#### List

Just iterate over a List with for..in

This differs from TS, where for..in iterates over an object's hasOwnProperty keys. The TS equivalent is for..of, which works on any collection that has an iterator method

```kotlin
val bundles = listOf("bookDetail", "discoverV2")
for (bundle in bundles) {
    println(bundle)
}
```

#### Map

Iterating over the keys

```kotlin
val myMap = mapOf("one" to 1, "two" to 2)
for (k in myMap.keys) {
    println(k); // one, two
}
```


## Functions

### Declarations, Arguments, and Defaults

The syntax for declaring functions is basically the same as TypeScript, and so is the return type annotation

TS has one problem, though: when a function takes too many parameters, you have to bundle them into an options object so parameter order doesn't hurt readability, and then you have to write an interface XxxOptions {} too

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

Kotlin solves this nicely: the arguments in a function call expression (FunctionCallExpression) can be passed by name

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

### Anonymous Functions

They feel basically the same as TS arrow functions, with slightly different syntax

And just like in TS, anonymous functions are most often used with functions like filter and map

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

The fold function seems to do the same job as reduce

```kotlin
listOf(1, 2, 3).fold(0, { x, item -> x + item })
```



## Classes / Data Classes

### class

You don't write new to construct an instance

### data class

Signature methods:
- toString()
- equals()
- copy()

Data class instances can be compared directly with ==, because they implement equals


## Async

### Coroutine



## Key Differences and Similarities with Java

- More syntactic sugar
- OOP isn't mandatory
- Kotlin classes don't seem to have anything like static, and you don't write the `new` keyword to construct an instance

## Key Differences and Similarities with TypeScript

- TS type checking is a compile-time thing, decoupled from runtime; Kotlin is a statically typed language to begin with
- The syntax for type annotations is very similar
- Both support a functional style well

## Differences and Similarities with Golang
