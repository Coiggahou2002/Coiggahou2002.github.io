---
title: '不找代充，自己开 ChatGPT Pro 5x：一晚上踩完的所有坑'
description: '美区 Apple ID + Amazon 买 Apple 礼品卡 + iOS App 内订阅，不找代充自己开通 ChatGPT Pro 100 的完整踩坑记录。'
pubDate: 'Oct 09 2026'
heroImage: '/blog-placeholder-1.jpg'
---

> 先说结论：**不找代充，自己开成功了。** 美区 Apple ID + Apple 礼品卡 + iOS App 内订阅，最终开通了 ChatGPT Pro 100（$100/月）。中间踩了不少坑，下面按时间线记。

## 一、为什么不找代充

目标很简单：自己订阅 ChatGPT Pro 5x。OpenAI 现在把它叫 **Pro 100**，每月 100 美元，用量约为 Plus 的 5 倍（Pro 档位分 100 / 200 / 500）。

我排除了两条路：

- **代充**：卡源可能是盗刷卡，一旦被拒付（chargeback），封的是你的账号。有说法称便宜代充平均三天左右被封——我没验证过，但不想当那个样本。
- **虚拟卡 / U 卡**：手续费、扣款失败是常态；2026 年 8 月起还有用户反馈 OpenAI 开始拦截 Bybit 卡。

翻了一圈 X、V2EX 和几篇博客，目前主流的 DIY 路线是：

**外区 Apple ID + Apple 礼品卡 + iOS App 内订阅。**

## 二、Apple ID：从台湾区绕到美区

1. 我先在 **iCloud.com** 注册了台湾区 Apple ID。经验：从 iCloud.com 入口注册比 appleid.apple.com 成功率高；**注册时关掉代理**。
2. 第一个坑：台湾 Apple 官网卖的「Apple Store 禮品卡」**只能在 Apple Store 买硬件**，不能充 App Store。

![台湾 Apple 官网的「Apple Store 禮品卡」：页面写明无法在 App Store 兑换](/images/chatgpt-pro-diy/01-taiwan-apple-store-gift-card.png)
*台湾 Apple 官网的「Apple Store 禮品卡」：页面写明无法在 App Store 兑换*

3. 第二个坑：美国礼品卡**不能**兑换到台湾区 ID。
4. 那就注册美区——直接提示"此时无法创建你的账户"。
5. 最后我选择买了一个现成的美区 Apple ID。

> ⚠️ **如果你也买现成账号，拿到后立刻：**
> - 改密码、改账号邮箱、加救援邮箱、改密保问题——否则原主人能把账号找回去，连你的余额一起带走；
> - **只在 App Store 里登录**，千万别在"设置 → iCloud"登录（有激活锁风险）；
> - 提示升级双重认证时，选"其他选项 → 不升级"。

![网页登录时弹出的双重认证升级提示：点 Other Options，别点 Continue（账号信息已打码）](/images/chatgpt-pro-diy/09-apple-2fa-prompt.png)
*网页登录时弹出的双重认证升级提示：点 Other Options，别点 Continue（账号信息已打码）*


## 三、买礼品卡：Apple 官网失败，Amazon 成功

### 在 apple.com 买：失败

用 HSBC 香港万事达卡买 110 美元的电子礼品卡，报"payment authorization failed"。

![美国 apple.com 的 Apple Gift Card 页面，选 Email 寄送](/images/chatgpt-pro-diy/02-us-apple-gift-card-page.png)
*美国 apple.com 的 Apple Gift Card 页面，选 Email 寄送*


![结账页：110 美元，Estimated Tax 为 0（收件人、卡号、账单地址已打码）](/images/chatgpt-pro-diy/03-apple-checkout.png)
*结账页：110 美元，Estimated Tax 为 0（收件人、卡号、账单地址已打码）*


![结果：payment authorization failed（卡号已打码）](/images/chatgpt-pro-diy/04-apple-payment-failed.png)
*结果：payment authorization failed（卡号已打码）*


- 第一次失败是我手滑：账单地址填了一个和银行登记不一致的广州地址；

![我当时手填的账单地址，和银行登记的不一致（具体地址已打码）](/images/chatgpt-pro-diy/05-billing-address-typed.png)
*我当时手填的账单地址，和银行登记的不一致（具体地址已打码）*

- 改成和银行登记**一字不差**的地址后，**依然失败**。我猜是发卡行对"境外商户买礼品卡"的风控，但没法确认。

小知识：Apple 礼品卡结账时本身不收销售税。

### 换 Amazon.com：成功

1. 搜索 "Apple Gift Card - Email Delivery"；

![Amazon.com 搜 apple gift card 的结果](/images/chatgpt-pro-diy/06-amazon-search.png)
*Amazon.com 搜 apple gift card 的结果*

2. 看购买框里的 **Sold by**，要是 **ACI Gift Cards LLC, an Amazon company**（Amazon 自家礼品卡子公司）；
3. 不支持自定义金额，只有固定面额（15、25、50、75、100、200……），我买了 **100 + 15 = 115 美元**；

![商品页：右侧 Shipper / Seller 是 ACI Gift Cards LLC, an Amazon company；面额只能选固定档位](/images/chatgpt-pro-diy/07-amazon-product-aci-seller.png)
*商品页：右侧 Shipper / Seller 是 ACI Gift Cards LLC, an Amazon company；面额只能选固定档位*

4. 账单地址：**Country 选 China**，填银行登记的原地址。别给卡填美国地址。

![Amazon 账单地址：Country/Region 选 China，按银行登记信息填写（姓名、电话、街道、邮编已打码）](/images/chatgpt-pro-diy/08-amazon-billing-address-china.png)
*Amazon 账单地址：Country/Region 选 China，按银行登记信息填写（姓名、电话、街道、邮编已打码）*


两张卡都到账并成功兑换。之后 Amazon 以"异常付款活动"限制了我这个新账号，要求验证身份（证件——中国护照可用——或付款证明/账单）。** 不影响已经兑换进 Apple ID 的余额。**

![Amazon 事后限制账号：要求用证件或付款证明验证（卡号已打码）](/images/chatgpt-pro-diy/15-amazon-account-limited.png)
*Amazon 事后限制账号：要求用证件或付款证明验证（卡号已打码）*


## 四、Apple ID 的账单地址

这个和信用卡的账单地址是两回事。付款方式选 **None**，填一个格式正确的美国地址就行。俄勒冈州没有销售税，比如 Portland, OR 97201。

## 五、订阅：Pro 在哪？

ChatGPT iOS App 的升级页面里**只有 Go 和 Plus，没有 Pro**。几篇教程给的路线是：

1. 先在 App 里订阅 Go（约 8 美元）或 Plus；
2. 再去 App Store → 头像 → 订阅 → ChatGPT → 查看所有方案 → 选 Pro（100 美元）；
3. 之前的小额订阅会按比例折算/几天内退回。

> ⚠️ 升级那一刻，余额要**同时够付**两笔，所以我才充了 115 而不是 100。

然后我点了 Go，弹出：

**"购买未完成，请提交申请至 Apple 支持以供审核。"**

新账号/买来的账号首次消费很容易触发这个。

> ⚠️ **别反复重试。** 越点越像异常行为。

## 六、联系 Apple 支持

1. 登录 id.apple.com（account.apple.com）→ 登录与安全 → 页面底部 → **支持 PIN** → 生成；

![Apple 账户的「登录与安全」页，往下拉到底就是支持 PIN。顺便看到：救援邮箱「Not set up」——买来的号记得补上（账号信息已打码）](/images/chatgpt-pro-diy/10-sign-in-security.png)
*Apple 账户的「登录与安全」页，往下拉到底就是支持 PIN。顺便看到：救援邮箱「Not set up」——买来的号记得补上（账号信息已打码）*

2. 打开 getsupport.apple.com → App Store → 无法购买 →（获取更多帮助）→ **Chat**；

![「Unable to purchase」页面：前面那些文章都不用看，直接点最下面的 Get more help](/images/chatgpt-pro-diy/11-unable-to-purchase.png)
*「Unable to purchase」页面：前面那些文章都不用看，直接点最下面的 Get more help*


![Chat 表单：名字、邮箱会自动带出，Additional Details 可以先空着（个人信息已打码）](/images/chatgpt-pro-diy/12-chat-form.png)
*Chat 表单：名字、邮箱会自动带出，Additional Details 可以先空着（个人信息已打码）*

3. 客服核对 PIN 后说：这是针对账单操作的**临时安全限制**，已提交解除申请，**最多 72 小时**；在此之前不要尝试购买，否则可能干扰处理流程。

![说明情况后，客服让我去 account.apple.com 拿 4 位支持 PIN（PIN 已打码）](/images/chatgpt-pro-diy/13-chat-pin-request.png)
*说明情况后，客服让我去 account.apple.com 拿 4 位支持 PIN（PIN 已打码）*


![客服的答复：临时安全限制，最多 72 小时解除，期间别再尝试购买（PIN 已打码）](/images/chatgpt-pro-diy/14-advisor-72h.png)
*客服的答复：临时安全限制，最多 72 小时解除，期间别再尝试购买（PIN 已打码）*


我用的英文开场白，直接复制即可：

```text
Hi, I'm trying to subscribe to ChatGPT in the App Store using my Apple Gift Card balance, but I get "Purchase not completed, please contact Apple Support for review." Could you please review my account and remove the purchase restriction?

(If asked for verification) Sure, here is my Support PIN: [your PIN]

(Follow-up) Thank you. Just to confirm: should I wait the full 72 hours before trying to purchase again?
```

## 七、接下来的计划

1. 等满 72 小时；
2. 订阅 Go → 在 App Store 订阅管理里升级 Pro；
3. **立刻关闭自动续费**（App Store → 订阅 → 取消订阅，当月照常可用），之后每月手动充值。

## 八、几个补充

- **和伴侣共用**：在 Windows 上登录同一个 ChatGPT 账号技术上可行（订阅绑的是 ChatGPT 账号，不是 Apple ID），但违反 OpenAI 条款、有封号风险。至少别同时用、别跨地区用。
- **Mac 也行**：如果 ChatGPT 是从 Mac App Store 装的，也能兑换和订阅；不过 iPhone 最稳。
- **网络**：除了注册 Apple ID 时关代理，全程用稳定的美国节点。
- **成本**：115 美元，约合人民币 820 元（HSBC 港币卡，含汇兑手续费约 900 港币），仅供参考。

## 九、自查清单

- [ ] 外区 Apple ID 已改密码、邮箱、救援邮箱、密保
- [ ] 只在 App Store 登录，没碰 iCloud
- [ ] 礼品卡区域 = Apple ID 区域
- [ ] 卡的账单地址与银行登记完全一致
- [ ] Amazon 卖家是 ACI Gift Cards LLC
- [ ] 余额够付"小档 + Pro"
- [ ] 遇到"购买未完成"→ 找客服，不狂点
- [x] 订阅后关闭自动续费
- [ ] 重要对话已备份

## 十、教训汇总

1. **卡的区域必须和 Apple ID 区域一致**，台湾 ID 吃不下美国卡。
2. **账单地址要和银行记录一字不差。**
3. **新账号首次付款大概率触发风控**——联系客服，别连续重试。
4. 礼品卡**用固定面额凑出需要的金额**。
5. **按月订阅，不买年付**，风险可控。
6. **备份重要聊天记录**，以防万一。
7. 在不支持的地区这么用，违反 OpenAI / Anthropic 的服务条款，**没有任何保证**，自己权衡。

## 十一、72 小时后更新结果

10 月 6 日，Apple 客服解除了美区 Apple ID 的购买限制，让我再等 72 小时，期间别重试。

72 小时到了（北京时间 10 月 9 日晚），按原计划走：

1. 先在 ChatGPT iOS App 里订阅 **Go**——成功；
2. 再打开 App Store → 头像 → 订阅 → ChatGPT → **查看所有方案**，选 **ChatGPT Pro 100**（$100/月）升级——也成功了。

![App Store「可用方案」页：Go $8、Plus $19.99、Pro 100 $100、Pro 200 $200；已选 Pro 100](/images/chatgpt-pro-diy/16-pro-plans.png)
*App Store「可用方案」页：Go $8、Plus $19.99、Pro 100 $100、Pro 200 $200；已选 Pro 100*

3. 升级完立刻在同一页点 **「取消订阅」**，关掉自动续费。取消后 Pro 仍可用到 **11 月 9 日**，到期不会再扣。

![「编辑订阅项目」页：ChatGPT Pro 100，$100/月，11 月 9 日续期；底部「取消订阅」](/images/chatgpt-pro-diy/17-cancel-autorenew.png)
*「编辑订阅项目」页：ChatGPT Pro 100，$100/月，11 月 9 日续期；底部「取消订阅」*

结论：**不找代充，自己开 ChatGPT Pro 成功了。** 整条链路就是：外区 Apple ID → Amazon 买美国 Apple 礼品卡充值 → 先订 Go → App Store 订阅管理里升级 Pro → 马上关自动续费。

---

### 参考资料

- @zureA255062 的 X 文章（2026-09-26）：https://x.com/zureA255062/status/2103672988524855361
- 大脸猪：https://www.superpig.win/blog/how-to-buy-chatgpt-pro-ios-us
- 短裤哥：https://869hr.uk/2026/tech/openai-gpt-pro-5x-5-compare-vs-guide/
- V2EX（菲区 + U 卡）：https://www.v2ex.com/t/1236473
- 王若风：https://wangruofeng007.com/blog/2026-08/us-apple-gift-card-chatgpt-claude-subscription/
