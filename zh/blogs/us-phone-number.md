# 搞一个真·美国手机号：从紫卡到 WiFi 通话收验证码

- Author: Rory Cai (https://coiggahou2002.github.io/)
- Published: 2026-10-08 (Asia/Shanghai; 2026-10-08T00:00:00.000Z)
- Language: zh-CN
- Canonical: https://coiggahou2002.github.io/zh/blogs/us-phone-number/
- English version: https://coiggahou2002.github.io/blogs/us-phone-number/

> 先说结论：**号码到手了，能用。** 一张 Ultra Mobile PayGo 紫卡，每月 3 美元，开了 WiFi 通话，人不在美国也能收验证码。整个过程最大的坑不在卡上，而在"怎么登录 Ultra"和"怎么给它充钱"这两件事上：花了冤枉钱买住宅 IP，又被几笔扣款失败的旧订阅绕了一大圈。

## 一、为什么要折腾一张实体卡

现在不少服务注册、做二次验证都要求美国手机号。我一开始图省事，用的是 Twilio 买的号码，结果**收不到验证码**：Twilio 后台显示短信被过滤，错误码 **30038**。

这类 API 号码，很多平台一看号段就知道是"程序号"，验证码短信直接被拦。要稳定收验证码，还是得有一张**真正由运营商发的 SIM 卡**。

## 二、买卡：Ultra Mobile PayGo 紫卡

我选的是 **Ultra Mobile 的 PayGo 套餐**，大家叫它"紫卡"：

- 走 **T-Mobile 的网络**；
- 月租 **3 美元**，包里写着 100 分钟通话 + 100 条短信 + 100MB 流量；
- 网上有卖家卖实体卡，还提供**免费代激活**。

![卖家的 Ultra Mobile 紫卡页面：实体卡 + 代激活，月付 3 美元](/images/us-phone-number/01-ultra-purple-sim-listing.png)
*卖家的 Ultra Mobile 紫卡页面：实体卡 + 代激活，月付 3 美元*

卖家页面写得很明白：**非美国原生 IP 自己去激活，容易触发风控，卡作废不补发、不退款。** 所以我老老实实选了代激活。

收到卡后，按卖家的流程提交代激活申请：填下单邮箱、订单号，上传**卡背面照片**（要拍清楚激活码 ACT CODE 和条形码）。

![代激活申请表：「期望激活地区」我填了一个俄勒冈州的邮编（邮箱、订单号已打码）](/images/us-phone-number/02-activation-request-form.png)
*代激活申请表：「期望激活地区」我填了一个俄勒冈州的邮编（邮箱、订单号已打码）*

「期望激活地区」决定号码归属地。我填的是**俄勒冈州（Oregon）的邮编**，留空的话卖家会帮你分配。

没多久就收到了激活邮件：

![激活完成的邮件：插卡后半小时左右有信号；第 4 条要求登录 Ultra 用「全局美国住宅 IP」（订单号已打码）](/images/us-phone-number/03-activation-email.png)
*激活完成的邮件：插卡后半小时左右有信号；第 4 条要求登录 Ultra 用「全局美国住宅 IP」（订单号已打码）*

插卡后**大约 30 分钟**有了信号。想知道自己号码是多少，拨 **`#686#`** 就会显示。

> 注意邮件第 4 条：**"登录 Ultra 官方 App / 官网请使用全局美国住宅 IP"**。我后面花冤枉钱，就是因为这一句。

## 三、登录 Ultra：我花 6.6 美元买了个教训

### 买住宅 IP

为了满足"美国住宅 IP"，我去 **IPRoyal** 买了一个 **ISP 静态住宅 IP**：

- 套餐：ISP / Dedicated，30 天，1 个 IP；
- 位置：United States → **Seattle (Washington)**；
- 结算 **6.60 美元**，用**支付宝**付的。

![IPRoyal 下单页：选 Seattle，30 天，合计 6.60 美元](/images/us-phone-number/04-iproyal-isp-seattle.png)
*IPRoyal 下单页：选 Seattle，30 天，合计 6.60 美元*

付完款，后台会给你 IP、端口、用户名、密码：

![IPRoyal 后台的代理信息：HOST&#58;PORT&#58;USER&#58;PASS（IP、端口、用户名、密码已打码）](/images/us-phone-number/05-iproyal-proxy-details.png)
*IPRoyal 后台的代理信息：HOST:PORT:USER:PASS（IP、端口、用户名、密码已打码）*

### 链式代理：住宅 IP 套在自建节点后面

在国内没法直连这个住宅 IP，所以要做**链式代理**：先连我自己在搬瓦工上搭的 **VLESS + Reality** 节点，再从那里出去连住宅 IP。

**电脑上（Clash Verge Rev）**：给住宅 IP 节点加一行 `dialer-proxy`，指向自建节点。大概长这样（全是占位符）：

```yaml
proxies:
  - name: US-Resi
    type: http
    server: <住宅IP>
    port: <端口>
    username: <用户名>
    password: <密码>
    dialer-proxy: <我的搬瓦工节点>
```

![Clash Verge Rev 也有图形化的「链式代理」，界面底部还提醒：链式代理会显著降低网速](/images/us-phone-number/06-clash-chain-proxy.png)
*Clash Verge Rev 也有图形化的「链式代理」，界面底部还提醒：链式代理会显著降低网速*

![折腾过程中，测延迟时 US-Resi 一度显示 Timeout](/images/us-phone-number/07-clash-us-resi-timeout.png)
*折腾过程中，测延迟时 US-Resi 一度显示 Timeout*

**手机上（Shadowrocket）**：添加一个 HTTP 节点，填住宅 IP 的地址、端口、用户名、密码，然后在「**代理通过**」里选自建节点。

![Shadowrocket 添加节点：类型 HTTP，关键是下面的「代理通过」（地址、端口、用户名、密码已打码）](/images/us-phone-number/08-shadowrocket-add-node.png)
*Shadowrocket 添加节点：类型 HTTP，关键是下面的「代理通过」（地址、端口、用户名、密码已打码）*

![配好之后，节点下面显示 HTTP / AUTO > VLESS，说明链上了（自建节点地址已打码）](/images/us-phone-number/09-shadowrocket-proxy-via.png)
*配好之后，节点下面显示 HTTP / AUTO > VLESS，说明链上了（自建节点地址已打码）*

### 然后：403

链是通了，但打开 **ultramobile.com 直接 403**，顺手试了下 **apple.com，也是 403**。

原因在 IPRoyal 自己的规则里：**账户没做身份认证，很多网站是被限制访问的**。

![IPRoyal 的身份认证页：不认证的话，ISP 和机房代理会限制访问所有政府和银行网站](/images/us-phone-number/10-iproyal-verification-limits.png)
*IPRoyal 的身份认证页：不认证的话，ISP 和机房代理会限制访问所有政府和银行网站*

那就去认证呗——结果：

![「消费满 10 美元后即可进行身份验证。」我才花了 6.6](/images/us-phone-number/11-iproyal-verify-after-10usd.png)
*「消费满 10 美元后即可进行身份验证。」我才花了 6.6*

**要先消费满 10 美元才能认证。** 我不想为了一个登录再往里砸钱。

### 朋友一句话解决

后来朋友跟我说：**别折腾住宅 IP 了，直接用你搬瓦工那台机器的 IP，开全局模式试试。**

我把代理切回搬瓦工节点、开**全局**，登录 Ultra——**直接登上了。**

> 💡 **教训：住宅 IP 不一定必要。** 卖家说"必须住宅 IP"是求稳的说法；至少我这次，用自己的美国机房 IP + 全局模式就够了。先用手头的节点试，不行再花钱。

## 四、App 里的两个小坑

1. **忘记密码**：我没记住代激活时设的密码，直接在 App 里走"忘记密码"重置就行。
2. **改姓名、邮箱**：在 **My Details** 里改。这里有个坑：**验证通过后，按「返回」，别按「保存」**。我按了保存，结果它又让我验证，验证完再保存，又让验证……无限循环。按返回反而改好了。

## 五、开 WiFi 通话：人在国外也能收短信

紫卡的灵魂是 **WiFi 通话（WLAN 通话）**：手机不需要连美国基站，只要连着 WiFi，就能用这个号收发短信、接打电话。

有教程说 iPhone 上直接开 WiFi 通话的方法已经失效了，但**我实测可以直接开**：

**iPhone 设置 → 蜂窝网络 → 选这张卡 → WLAN 通话 → 打开。**

打开时会要你填一个 **Emergency 911 地址**：

![开 WiFi 通话要填 Emergency 911 地址（街道和邮编已打码）](/images/us-phone-number/12-wifi-calling-911-address.png)
*开 WiFi 通话要填 Emergency 911 地址（街道和邮编已打码）*

> ⚠️ 这里要填一个**真实存在的美国地址**，格式对、能查到的那种。

开好之后，状态栏显示 WiFi 通话，验证码短信就能收了。

## 六、充值：被几笔旧订阅绕了一大圈

号码有了，还得往 PayGo 钱包里充钱，不然断了就白干。

### 先发现：卡里没钱，旧订阅一直在扣

我准备用来付款的卡里没钱，翻邮箱一看，一排"payment was unsuccessful again"：

![邮箱里一排扣款失败：Vercel 20 美元、Massive 29 美元、Soniox 5 美元，隔几天重试一次](/images/us-phone-number/13-unsuccessful-payment-emails.png)
*邮箱里一排扣款失败：Vercel 20 美元、Massive 29 美元、Soniox 5 美元，隔几天重试一次*

这些都是 Stripe 的自动重试。问题是：**卡里一充钱，下次重试就会扣成功。** 这几个服务我都不打算用了，所以得先处理掉，再充钱。

### Vercel：有欠款，降不了级，也删不了卡

Vercel 想降回免费的 Hobby，点 Downgrade 直接报错：

![有一张逾期账单，就不让降级：You cannot downgrade while your plan has an overdue payment（团队名、卡号已打码）](/images/us-phone-number/14-vercel-cannot-downgrade.png)
*有一张逾期账单，就不让降级：You cannot downgrade while your plan has an overdue payment（团队名、卡号已打码）*

想着那我把卡删了总行吧：

![删唯一的一张卡？要先加一张新卡（卡号已打码）](/images/us-phone-number/15-vercel-remove-card.png)
*删唯一的一张卡？要先加一张新卡（卡号已打码）*

**账上只有一张卡时，Vercel 不让删。** 能走的路只剩：付掉欠款再降级，或者提工单请他们免单取消。

### Massive：订阅已经没了，但卡只能换不能删

Massive（以前的 Polygon.io）的账单页倒是让我放心了：

![Massive：No Active Subscriptions，下次扣款为空，最后一次扣款停在 9 月 22 日（卡号、发票号已打码）](/images/us-phone-number/16-massive-no-active-subscriptions.png)
*Massive：No Active Subscriptions，下次扣款为空，最后一次扣款停在 9 月 22 日（卡号、发票号已打码）*

**没有在扣的订阅**，Next payment 也是空的。想顺手把卡删掉，结果：

![You can only have a single card associated with your account——只能换，不能删（卡号已打码）](/images/us-phone-number/17-massive-change-card-only.png)
*You can only have a single card associated with your account——只能换，不能删（卡号已打码）*

只能换卡，不能删。好在订阅已经没了，就不管它了。

### 终于充上了

卡里充上钱后，用 **PayPal（中国区账户，绑的国内卡）** 在 Ultra 付款成功，**充了 20 美元**。

> 小插曲：我有了美国号，是不是该注册美区 PayPal？不用。PayPal 是哪个区，看的是注册时选的国家，不是手机号。美区要美国地址、美国卡，额度高了还要 SSN；中国区绑国内卡就能付。美国号加进去当备用手机号就行。

### Auto Renew 要不要开？

充值后 App 会问你要不要开 **Auto Renew**：

![Auto Renew：选的金额是每个月自动往 PayGo 钱包里充多少（PayPal 账号已打码）](/images/us-phone-number/18-ultra-auto-renew.png)
*Auto Renew：选的金额是每个月自动往 PayGo 钱包里充多少（PayPal 账号已打码）*

这里的 5 / 10 / 20 美元，意思是**每次套餐续期的那天晚上，自动从 PayPal 扣这么多，充进钱包**——不管余额还剩多少，每月都充。

我的建议：

- **不开**：每月 3 美元从余额里扣，**20 美元大约够 6 个月**，到时候手动充；
- **真要开就选 5 美元**，刚好覆盖月租还略有结余。

我没开。刚经历完 Vercel 那一出，不想再有一个"卡里没钱就一直扣款失败"的东西。

## 七、能拿来干嘛，以及怎么保号

### 能注册什么

AI 工具、WhatsApp、Telegram、Signal、Discord 这类需要手机号的应用都可以试。个别平台会拦虚拟运营商的号，收不到就换个平台或联系客服。

以 **WhatsApp** 为例：美国号只在注册时收一次验证码，之后**发消息、打语音走的都是互联网**（WiFi 或国内流量都行），**不花美国号的钱**。当然，在国内用要开着代理。

### 怎么保号

- **余额别断**：每月 3 美元，余额不够扣就会停机，停太久号码会被回收。
- **开两步验证**：换手机、重新登录 WhatsApp 这类应用时，会再往这个号发验证码，号没了账号就危险了。所以 WhatsApp 里记得开「两步验证」。
- **收验证码时**：手机连着 WiFi，并且 WLAN 通话是开着的。

### 什么是"虚拟运营商"

Ultra 是**虚拟运营商（MVNO）**：自己不建基站，租大运营商的网络来卖号码和套餐。Ultra 租的是 T-Mobile 的网络，所以信号和 T-Mobile 一样，价格便宜很多。国内的类比，就是那些用移动、联通网络的 170 / 171 号段。

有些平台查号码时能看出是虚拟运营商，可能会当成风险号码拒收。我目前还没遇到大问题。

## 八、花了多少钱

- 紫卡（实体卡 + 代激活）：卖家标价 ¥276；
- IPRoyal 住宅 IP：6.60 美元（**事后看，这笔可以省**）；
- 第一次充值：20 美元，之后每月 3 美元。

仅供参考。

## 九、自查清单

- [ ] 卡是代激活的，没用国内 IP 自己乱激活
- [ ] 拨 `#686#` 记下自己的号码
- [ ] 能用美国 IP 登录 Ultra App（先试自己的节点 + 全局模式）
- [ ] 重置过密码，改好姓名、邮箱（My Details 验证后按返回）
- [ ] WLAN 通话已打开，911 地址是真实存在的美国地址
- [ ] 充值前，已处理掉会自动扣款的旧订阅
- [ ] 钱包余额够几个月，Auto Renew 不开或选 5 美元
- [ ] 用这个号注册的重要应用，都开了两步验证

## 十、教训汇总

1. **API 号码（如 Twilio）收验证码不靠谱**，要收验证码就上真 SIM 卡。
2. **激活交给卖家**，非美国 IP 自己激活容易废卡。
3. **住宅 IP 不一定必要**，先用自己的美国节点 + 全局模式试。
4. **代理商有自己的访问限制**：IPRoyal 没认证会 403，认证还得先消费满 10 美元。
5. **充钱之前，先清理旧订阅**，不然钱一进卡就被扣走。
6. **有欠款的服务往往不让降级、不让删唯一的卡**，要么付清，要么找客服。
7. **自动充值慎开**，手动充 + 定期看余额更可控。
8. **保号 = 余额不断 + 两步验证。**
