# 列表性能优化居然会导致曝光错误？RN FlatList removeClippedSubviews 踩坑实录

- Author: Rory Cai (https://coiggahou2002.github.io/)
- Published: 2025-01-22
- Language: zh-CN
- Canonical: https://coiggahou2002.github.io/zh/blogs/rn-remove-clip-subview/
- English version: https://coiggahou2002.github.io/blogs/rn-remove-clip-subview/

# React Native 列表 removeClippedSubviews 的坑

> 在 React Native 开发中，我们经常会使用 `FlatList` 的 `removeClippedSubviews` 属性来优化列表性能。这个看似简单的优化属性，却在我们团队中引发了一场数据统计的"灾难"：列表中的元素明明没有出现在视口中，却总是被错误地统计为"已曝光"。经过深入排查，我们发现这背后涉及到了 RN 的视图树管理机制、iOS 和 Android 的平台差异，以及新旧架构的演进。本文将详细讲述这个问题的发现过程、原因分析，以及最终的解决方案。

> **TLDR**
>
> 本文讲述了在 React Native 中使用 `FlatList` 的 `removeClippedSubviews` 属性时遇到的一个性能优化与曝光统计冲突的问题：
>
> 1. `removeClippedSubviews` 是 RN 官方推荐的列表性能优化方案，它会将不可见的列表项从视图树中卸载。
> 2. 当使用 `measure` API 测量被卸载的列表项时，由于视图树被截断，测量结果会相对于错误的参考节点，导致曝光统计出现误报。
> 3. 这个问题仅在 iOS 上出现，因为 Android 的实现有更严格的保护机制。
> 4. 临时解决方案是使用 `measureInWindow` 替代 `measure`。
> 5. 彻底解决方案是自定义 measure 方法，增加测量参考节点的判断。
> 6. 在 RN 新架构中，由于使用了 ShadowNode，这个问题已经不存在了。



## 一、属性简介

React Native 官方文档在[如何优化 FlatList 性能](https://reactnative.dev/docs/0.72/optimizing-flatlist-configuration#removeclippedsubviews) 这篇博客，提到过一个名为 `removeClippedSubviews` 的属性，说是可以减轻主线程的计算负担，从而减少掉帧的出现。

![removeClippedSubviews](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202503191118712.png)

其原理是: **把一些没出现在视图里的 view 从它的 superview 上卸载下来（但仍然保留在内存中）**

## 二、背景 

我们业务有一个 `IntersectionObserverView` 组件，它使用一个 View 包裹一个目标组件（此处简称 target），使用 RN 的 `RCTUIManager` 提供的 [measure](https://reactnative.dev/docs/0.72/direct-manipulation#measurecallback) 方法来测量 target 出现在 RCTRootView 中的面积是否达到指定的要求，从而判定此组件是否「曝光」，然后触发对应的回调，主要用于业务曝光埋点需求。

![包裹示意图](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202504171317260.png)


测量原理如下图，`measure` 方法会返回 target 相对于 `RCTRootView` 四边的距离。

![检测原理](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202504171328452.png)

根据这四个距离，我们可以计算出 **target 与 RCTRootView 相交的面积**，通过「暴露面积比例」这个指标，判定元素有百分之多少暴露在视口内，从而判定它曝光。

问题来了：在使用过程中，发现该组件在某些情况下会出现误报的情况。

> **提示**
>
> 这里所讲的问题，只有在 iOS 上才会出现，所以我们主要先讨论 iOS 上为什么会有问题，至于 Android 为什么是好的，先按下不表，留到文末对比叙述。

## 三、问题表现

我们有一个横向滑动列表（结构见下方例子），每个元素都套了一个 IntersectionObserverView，用于曝光埋点。

视图结构的简要 RN 代码表示如下：

```tsx
const CustomComponent = ({ item }) => {
    return (
        <IntersectionObserverView>
            <Book>{item}</Book>
        </IntersectionObserverView>
    );
};

const App = () => {
    const data = ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5', 'Item 6', 'Item 7'];

    return (
        <FlatList
            horizontal
            removeClippedSubviews
            data={data}
            renderItem={({ item }) => <CustomComponent item={item} />}
            keyExtractor={(item, index) => index.toString()}
        />
    );
}
```

这个列表大概有 10+ 个元素，一般来说，手机屏幕下，如果用户不滑动，只能看到 3～4 个

但我们发现:

**第 4 个及它之后的元素，总是会上报曝光，而且曝光率是 100%**

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202504171339518.png)

到这里，数据分析师们就不乐意了：你这上报都是错的，我要怎么统计！抓狂！😤

于是他们提出: 再补充一个**滑动动作埋点**，简单验证一下，如果滑动的 UV 远远少于后面书本的曝光 UV，就说明曝光是有问题的。

我们通过 `onScrollBeginDrag` 添加埋点后发现: 

**上述问题是我们的 bug，因为通过 onScrollBeginDrag 反映的滑动上报数量和「需要滑动才能看到的」元素曝光数量是对不上的。**

那就要查一查了。

## 四、分析排查

通过一波打日志 debug，发现后面那几个视觉不可见的元素， 计算出来 **「与视口相交的面积比」** 竟然是 1，说明计算面积部分的代码有问题。

我 Review 了一下计算逻辑，没有看到明显的漏洞，说明是 `left/right/top/bottom` 四个测量值有问题。

而这四个值是谁给出的呢？是 RN 官方提供的 `measure` API 给出的。

这就要看看源码里的实现了。

### measure 的具体实现

我们业务中的使用方式，是通过调用某个 View 的 ref 上面的 `measure` 方法来测量的，使用的方式如下？

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202506131631655.png)

为什么能够在 JS 层直接调用 `viewRef.current.measure` 方法呢？

那方法的逻辑在 JS 层还是 Native 层呢？

实际上，RN 框架给 React 加了一种类型，叫 HostComponent（宿主组件类型），并往上面挂了一些方法，例如 `blur`, `focus`, `measure`, `measureInWindow` 等方法，供 JS 直接调用，这些方法在 [RN 文档关于 Direct Manipulation 的部分](https://reactnative.dev/docs/legacy/direct-manipulation)有介绍。

我们找到挂载方法的地方，发现实际上调用的是 `RCTUIManager` 上面暴露的 native 方法。

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202506131636953.png)

这下知道源码在哪了，我们打开 XCode， 到 `RCTUIManager.m` 看看实现。

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202503191132453.png)

容易看出，其原理是通过 `view.superview` 向上找到最顶部（最多到达 RCTRootView 结束）的祖先 view，然后返回 target 在祖先 view 坐标下的 bounds。

![measure 原理示意图](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202504171356410.png)

看起来似乎没啥问题，但是这几行代码让我联想到了 `removeClippedSubviews`

```objc
UIView *rootView = view;
while (rootView.superview && ![rootView isReactRootView]) {
    rootView = rootView.superview;
}
```

如果，我是说如果，target 一直往上找，到达的终点不是 RCTRootView，是不是就有可能出现测量不准的情况？

例如某一坨节点被从整个 View 树上卸载了下来。

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202504171401513.png)


既然有这个疑问，再来看看 removeClippedSubviews 的实现。


### removeClippedSubviews 的逻辑

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202503191136306.png)


大致原理就是，如果对一个 View 设置了 `removeClippedSubviews={true}`，就会走下面的逻辑：
- 如果父 view 完全包含子 view，就把子 view 完整挂载上来
- 如果父 view 和子 view 有相交部分，就递归调用此方法
- 如果父 view 和子 view 完全不相交，就对子 view 调用 `[view removeFromSuperview]`

**一言以蔽之：如果一个 View 开启了 `removeClippedSubviews` 选项，它的「视口内不可见的」子 View 都会被调用 `[subview removeFromSuperview]`**

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202506131645026.png)


### 两者结合产生的问题

由上面可以知道，如果子 view 与其父容器已经不相交，就会被从它的 superview 上卸载下来。

那么很容易想到，此时如果对这个 view 调用 measure 方法，在通过 superview 往上走的过程中，并不能够到达 RCTRootView，而是在到达之前就会停在中途某个 view 上（具体中间有多少层级，取决于用户的具体布局）

这样一来，measure 得到的 bounds，就**不是** target 相对于 RCTRootView 的 bounds。

用数学一点的语言来讲，**连相对的坐标系都是错的，测量的结果肯定是错的。**

此时 IntersectionObserverView 内部逻辑计算得到的相交比例就是错误的。

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202504171410061.png)

**有一种很典型的情况:**

假设 measure 方法在 target 往上爬的时候，只爬了一层就停下来了，那么此时通过返回的 bounds 计算出来的相交比例，很有可能接近于 1。

为什么呢，因为在日常布局中，我们往往会有一两层 bounds 几乎是一样的容器。

此时，就会被误判为「**target 和根视图的相交比例很高，可以认为 target 几乎整个完全暴露在视图内了**」，从而误认为target 曝光，然后上报错误的数据。

## 五、问题的本质

- 对列表设置 removeClippedSubviews 属性，导致列表中不可见的 view 被从 superview 上卸载
- measure 得到了**不是相对于 RCTRootView 的** bounds，导致相交比例是错的，并误认为曝光 
- 从 measure 的返回值中，我们无法得知最终测量的相对祖先到底是不是 RCTRootView

## 六、解决方法

### (临时) 使用 `measureInWindow` 替代

业务上因为这个问题关联到数据，所以希望能尽快热更新出去，不受版本限制，所以想了个临时的办法——使用 `measureInWindow` 来代替。

> **注意**
>
> 使用此方法的前提是，RCTRootView 和 window 在视觉尺寸上几乎等价，或者换句话说，RCTRootView 不是以部分形式存在的，而是几乎占满整个屏幕。

measureInWindow 也是 RCTUIManager 提供的 API，不过它的逻辑和 measure 有点不同，它不会通过 superview 来一直往上爬来获取 RCTRootView，而是直接通过 `[view.window]` 获取 view 关联的 window 对象，然后使用 `convertRect` 来转换坐标。

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202503191159405.png)

而我们参考 [UIView/removeFromSuperview - Apple 文档](https://developer.apple.com/documentation/uikit/uiview/removefromsuperview()?language=objc) 可以知道：**当一个 view 被通过调用该方法移除时，它不再连接到任何 window。**

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202506131247010.png)


所以，在这种情况下，我们使用 `measureInWindow` 方法去测量一个 target 时，如果 target（或target 的某个祖先/父亲）已经被从它的父 View 移除，**则我们通过 `[view window]` 拿到的是 `nil`**，从而转换坐标得到的 bounds 是 `(0,0,0,0)`，由此得出的相交面积必然为 0，从而相交比例也是 0，恰好符合「未曝光」的性质。


### (彻底) 自定义 measure

比较彻底的解决方案是：原生桥一个自定义的 measure 方法给 RN，多带一个信息，告诉我们相对祖先是不是 RCTRootView，然后交由业务侧自己判断是否要采用 or 相信它的返回结果。

#### 背景知识补充

- 业务初始化 RN bundle 的时候，会使用 WRRCTBundleLoader 类，这个类负责初始化 RCTBridge
- 在 RN 框架内部，RN 的每个 View 都通过 reactTag 来标识
- RN 在 `UIView+React.m` 这个类别里为 UIView 增加了 isReactRootView 方法，用来判断一个 View 是不是 RCTRootView（其实逻辑很简单，就是看 `self.reactTag` 尾数是否为 1）
- RCTUIManager 是 RN 的一个核心模块，它使用 viewRegistry 来维护 JS 端组件 reactTag 与原生视图实例之间的映射关系，根据 JS 端传递的组件类型（如 RCTView、RCTText）和属性，在主线层执行 JS 发送过来的创建/更新视图的命令，在原生端创建对应的视图实例（当组件从 React 树中移除时，调用 removeSubview 或类似方法释放原生资源）。
。

#### 代码逻辑

这段代码主要是模仿 RN 原来 `RCTUIManager.m` 中的实现，主要步骤如下：
1. 先通过 bundleLoader 单例拿到 bridge 实例，从而拿到 `RCTUIManager` 实例
2. RN 的每个 View 都通过 reactTag 来标识，从参数里拿到 reactTag
3. 调用 uiManager 的 addUIBlock 方法，在 UI 线程添加一个任务
4. 根据 reactTag 从 viewRegistry 中拿到 View 实例
5. 沿着拿到的 view 的父 view 一直往上查找，找到最顶部的祖先 view
6. 调用 `[view isReactRootView]` 方法判断祖先 view 是否为 RCTRootView
7. 给回调增加一个返回值，用于表明此测量结果是否相对于 RCTRootView

```objc
- (void)customMeasureReactView:(NSDictionary *)params
                      resolver:(WRBridgeResolveBlock)resolve
                      rejecter:(WRBridgeRejectBlock)reject
{
    WRRCTBundleLoader *bundleLoader = [[WRRCTBundleLoaderManager sharedInstance] bundleLoaderWithKey:BundleLoader_Default];
    RCTBridge *bridge = bundleLoader.bridge;
    id tagObj = [params objectForKey:@"reactTag"];
    if (![tagObj isKindOfClass:NSNumber.class]) {
        if (reject) {
            reject(@"0", @"Type Error: expected parameter reactTag to be a number", nil);
        }
        return;
    }
    NSNumber *targetReactTag = (NSNumber*) tagObj;
    dispatch_async([bridge.uiManager methodQueue] , ^{
        [bridge.uiManager addUIBlock:^(RCTUIManager *uiManager, NSDictionary<NSNumber *,UIView *> *viewRegistry) {
            UIView *view = viewRegistry[targetReactTag];
            if (!view) {
                NSLog(@"invalid empty view pointer");
                if (reject) {
                    reject(@"0", @"Cannot retrieve view from viewRegistry by the given reactTag", nil);
                }
                return;
            }
                
            UIView *rootView = view;
            while (rootView.superview && ![rootView isReactRootView]) {
                rootView = rootView.superview;
            }
            BOOL relativeToRootView = [rootView isReactRootView];
            CGRect frame = view.frame;
            CGRect globalBounds = [view convertRect:view.bounds toView:rootView];
            
            NSDictionary *result = @{
                @"x": @(frame.origin.x),
                @"y": @(frame.origin.y),
                @"width": @(globalBounds.size.width),
                @"height": @(globalBounds.size.height),
                @"pageX": @(globalBounds.origin.x),
                @"pageY": @(globalBounds.origin.y),
                @"isRelativeToReactRootView": @(relativeToRootView),
            };
            if (resolve) {
                resolve(result);
            }
        }];
    });
}
```
## 七、为什么 Android 没有这个问题？

还记得我们前文说过，本文所叙述的问题只存在于 iOS 上，Android 没有这个问题。

下面让我们一探究竟。

RN 的 Android 部分封装层数比较多，measure 的入口在 UIManagerModule 的 measure 方法，实际调用链路是
```kotlin
UIManagerModule.measure(reactTag, callback)
-> mUIImplementation.measure(reactTag, callback);
-> mOperationsQueue.enqueueMeasure(reactTag, callback);
-> mOperations.add(new MeasureOperation(reactTag, callback));
-> MeasureOperation.execute()
-> mNativeViewHierarchyManager.measure(mReactTag, mMeasureBuffer);
```

最终是在 `NativeViewHierarchyManager` 类 measure 方法中完成的:

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202506131336477.png)

可以看到，大致逻辑和 RN iOS 的 measure API 差不多，先根据 reactTag 拿到 View，然后拿到祖先 view，然后计算相对坐标。

核心在这个位置，这里有一个保护性的判断，如果 getRootView 方法拿不到 rootView，就会直接抛异常，不会返回结果
```kotlin
View rootView = (View) RootViewUtil.getRootView(v);
// It is possible that the RootView can't be found because this view is no longer on the screen
// and has been removed by clipping
if (rootView == null) {
    throw new NoSuchNativeViewException("Native view " + tag + " is no longer on screen");
}
```

但这样足够了吗？还没 100% 确认呢，我们看看 getRootView 的实现

```kotlin
public static RootView getRootView(View reactView) {
    View current = reactView;
    while (true) {
        if (current instanceof RootView) {
            return (RootView) current;
        }
        ViewParent next = current.getParent();
        if (next == null) {
            return null;
        }
        Assertions.assertCondition(next instanceof View);
        current = (View) next;
    }
}
```

OK，现在很清晰了，getRootView 的实现，在两端都是通过在 View 树往上层遍历得到的，但 Android 的实现更严谨，往上走的过程中，对遇到的 View 都使用 `instanceof RootView` 来判断，**所以最终要么在路径上找到一个 RootView，要么返回空**。

所以，Android 确实没问题。

## 八、同类框架实现对比

ByteDance 开源了它的内部跨端框架 [Lynx](https://lynxjs.org/zh/)

该框架原生支持简单曝光能力和自定义曝光能力 [IntersectionObserver API](https://lynxjs.org/zh/api/lynx-api/intersection-observer.html)

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202505082053977.png)

可以看到，它提供的几个 API 中，可以指定 measure 时的参照节点：
- `IntersectionObserver.relativeTo()`
- `IntersectionObserver.relativeToViewport()`
- `IntersectionObserver.relativeToScreen()`
- `IntersectionObserver.observe()`
- `IntersectionObserver.disconnect()`

这样设计刚好解决了本文发现的痛点，API 既简单又能满足业务的常见需求。

进一步看看源码, iOS 的实现，基本就是 RN measure API 的升级版，考虑了 root 节点的可见性，对顶层节点的身份进行了更详尽的判断：

安卓的实现在 `LynxIntersectionObserver.java`，逻辑和 iOS 的几乎完全一样，这里就不贴代码了。

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202505082051055.png)


## 九、可以给 RN 提 PR 吗？

已经提了，不过意义已经不大，在 RN 新架构版本，RCTUIManager 暴露的 `measure` 和 `measureInWindow` 方法，已经被弃用了，取而代之的是新架构下统一用 C++ 实现的 `measure` 和 `measureInWindow`。

用 0.78 版本的 RN 起个 demo，可以看到，新架构下的 RN 用的是 C++ 方法（不再两端各自实现一份），方法的逻辑如下:

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202506132145312.png)

其实跟原来的逻辑都基本类似：拿到祖先节点 ancestorNode，通过 `getRelativeLayoutMetrics(ancestorNode, shadowNode)` 方法进行坐标计算和转换，得到 layoutMetrics 结构，稍作转换，返回一个 RNMeasureRect{} 结构，回调给 JS

![](https://cjpark-1304138896.cos.ap-guangzhou.myqcloud.com/blog_img/202506132149629.png)

**有个很重要的区别**：旧 RN 架构的 measure，实际上是 RCTUIManager 读取原生 View 的 frame 把坐标返回，而 removeClippedSubviews 的优化操作是在 Native 层面去做的，所以视图树的遍历会受到 s 的影响， [新架构的 RN 有一层 ShadowNode 存在于 C++ 层](https://reactnative.dev/architecture/glossary#react-shadow-tree-and-react-shadow-node)，ShadowNode 含有布局信息，测量也是发生在这一层的，所以哪怕原生对应的 view 被 remove 掉，也不影响 ShadowNode 这一层的测量结果，所以新架构已经不存在这个问题了。
