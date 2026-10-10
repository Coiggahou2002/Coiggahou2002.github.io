# No Reseller: I Opened ChatGPT Pro 5x Myself, and Every Pitfall I Hit in One Night

- Author: Rory Cai (https://coiggahou2002.github.io/)
- Published: 2026-10-09 (Asia/Shanghai; 2026-10-09T00:00:00.000Z)
- Language: en
- Canonical: https://coiggahou2002.github.io/blogs/chatgpt-pro-diy/
- Chinese version: https://coiggahou2002.github.io/zh/blogs/chatgpt-pro-diy/

> Short version: **I did it myself. No reseller.** A US Apple ID, an Apple gift card, and an in-app iOS subscription, and I ended up on ChatGPT Pro 100 ($100/month). I hit plenty of pitfalls along the way. Here's the timeline.

## 1. Why I didn't use a reseller

The goal was simple: subscribe to ChatGPT Pro 5x myself. OpenAI now calls it **Pro 100** — $100 a month, with usage about 5× Plus. The Pro tiers are 100 / 200 / 500.

I ruled out two paths:

- **Resellers**: the card may be stolen. Once there's a chargeback, the account that gets banned is yours. There's a claim that cheap reseller subscriptions get banned in about three days on average. I never verified that, but I didn't want to be the sample.
- **Virtual cards / U cards**: fees and failed charges are the norm. Starting in August 2026, some users have also reported that OpenAI began blocking Bybit cards.

After a pass through X, V2EX, and a few blogs, the mainstream DIY route right now is:

**A foreign-region Apple ID + an Apple gift card + an in-app iOS subscription.**

## 2. Apple ID: the long way from Taiwan to the US

1. I first registered a Taiwan-region Apple ID on **iCloud.com**. From experience, signing up through iCloud.com succeeds more often than appleid.apple.com. **Turn the proxy off while you register.**
2. First pitfall: the "Apple Store Gift Card" sold on Taiwan's Apple site **can only buy hardware at the Apple Store**. It cannot top up the App Store.

![The "Apple Store Gift Card" on Taiwan's Apple site: the page says it cannot be redeemed in the App Store](/images/chatgpt-pro-diy/01-taiwan-apple-store-gift-card.png)
*The "Apple Store Gift Card" on Taiwan's Apple site: the page says it cannot be redeemed in the App Store*

3. Second pitfall: a US gift card **cannot** be redeemed onto a Taiwan-region ID.
4. So I tried to register a US one, and got told "Your account cannot be created at this time."
5. In the end I bought a ready-made US Apple ID.

> ⚠️ **If you buy a ready-made account too, do this the moment you get it:**
> - Change the password, change the account email, add a rescue email, and change the security questions. Otherwise the original owner can recover the account and take your balance with it.
> - **Only sign in inside the App Store.** Never sign in under Settings → iCloud. There's an Activation Lock risk.
> - When it prompts you to upgrade to two-factor authentication, pick "Other Options → Don't Upgrade."

![The two-factor upgrade prompt on web sign-in: tap Other Options, not Continue (account details redacted)](/images/chatgpt-pro-diy/09-apple-2fa-prompt.png)
*The two-factor upgrade prompt on web sign-in: tap Other Options, not Continue (account details redacted)*

## 3. Buying the gift card: apple.com failed, Amazon worked

### Buying on apple.com: failed

I tried to buy a $110 electronic gift card with an HSBC Hong Kong Mastercard. It came back "payment authorization failed."

![The Apple Gift Card page on US apple.com, with Email delivery selected](/images/chatgpt-pro-diy/02-us-apple-gift-card-page.png)
*The Apple Gift Card page on US apple.com, with Email delivery selected*

![Checkout: $110, Estimated Tax is 0 (recipient, card number, and billing address redacted)](/images/chatgpt-pro-diy/03-apple-checkout.png)
*Checkout: $110, Estimated Tax is 0 (recipient, card number, and billing address redacted)*

![The result: payment authorization failed (card number redacted)](/images/chatgpt-pro-diy/04-apple-payment-failed.png)
*The result: payment authorization failed (card number redacted)*

- The first failure was my own slip: I typed a Guangzhou billing address that didn't match what the bank had on file.

![The billing address I typed by hand. It didn't match the bank's records (the actual address is redacted)](/images/chatgpt-pro-diy/05-billing-address-typed.png)
*The billing address I typed by hand. It didn't match the bank's records (the actual address is redacted)*

- After I changed it to the address that matched the bank's records **character for character**, **it still failed**. My guess is the issuing bank's risk check on "buying a gift card from an overseas merchant," but I couldn't confirm that.

Side note: Apple gift card checkout itself doesn't charge sales tax.

### Switching to Amazon.com: it worked

1. Search for "Apple Gift Card - Email Delivery".

![Amazon.com search results for apple gift card](/images/chatgpt-pro-diy/06-amazon-search.png)
*Amazon.com search results for apple gift card*

2. Check **Sold by** in the buy box. It needs to be **ACI Gift Cards LLC, an Amazon company** (Amazon's own gift-card subsidiary).
3. Custom amounts aren't supported, only fixed denominations (15, 25, 50, 75, 100, 200, and so on). I bought **100 + 15 = $115**.

![Product page: Shipper / Seller on the right is ACI Gift Cards LLC, an Amazon company. Denominations are fixed tiers only](/images/chatgpt-pro-diy/07-amazon-product-aci-seller.png)
*Product page: Shipper / Seller on the right is ACI Gift Cards LLC, an Amazon company. Denominations are fixed tiers only*

4. Billing address: **set Country to China**, and fill in the original address on file with the bank. Don't put a US address on the card.

![Amazon billing address: Country/Region set to China, filled in from the bank's records (name, phone, street, and postal code redacted)](/images/chatgpt-pro-diy/08-amazon-billing-address-china.png)
*Amazon billing address: Country/Region set to China, filled in from the bank's records (name, phone, street, and postal code redacted)*

Both cards arrived and redeemed successfully. Amazon then restricted this new account for "unusual payment activity" and asked me to verify my identity (an ID — a Chinese passport works — or proof of payment / a statement). **That does not affect the balance already redeemed into the Apple ID.**

![Amazon later restricted the account and asked me to verify with an ID or proof of payment (card number redacted)](/images/chatgpt-pro-diy/15-amazon-account-limited.png)
*Amazon later restricted the account and asked me to verify with an ID or proof of payment (card number redacted)*

## 4. The Apple ID's billing address

This is a different thing from the credit card's billing address. Set the payment method to **None**, and fill in a correctly formatted US address. Oregon has no sales tax. Portland, OR 97201, for example.

## 5. Subscribing: where is Pro?

The upgrade screen in the ChatGPT iOS app **only shows Go and Plus. No Pro.** The route from a few tutorials is:

1. First subscribe to Go (about $8) or Plus inside the app.
2. Then go to the App Store → your avatar → Subscriptions → ChatGPT → See All Plans → pick Pro ($100).
3. The smaller subscription from before gets prorated / refunded within a few days.

> ⚠️ At the moment you upgrade, the balance has to **cover both charges at the same time**. That's why I loaded $115 instead of $100.

Then I tapped Go, and this popped up:

**"Purchase not completed. Please submit a request to Apple Support for review."**

A new account, or a bought one, very easily triggers this on the first purchase.

> ⚠️ **Don't keep retrying.** The more you tap, the more it looks like abnormal behavior.

## 6. Contacting Apple Support

1. Sign in at id.apple.com (account.apple.com) → Sign-In and Security → scroll to the bottom of the page → **Support PIN** → generate one.

![The Apple Account "Sign-In and Security" page. Scroll to the bottom and the Support PIN is there. Also visible: rescue email "Not set up" — if you bought the account, add one (account details redacted)](/images/chatgpt-pro-diy/10-sign-in-security.png)
*The Apple Account "Sign-In and Security" page. Scroll to the bottom and the Support PIN is there. Also visible: rescue email "Not set up" — if you bought the account, add one (account details redacted)*

2. Open getsupport.apple.com → App Store → Unable to purchase → (Get more help) → **Chat**.

![The "Unable to purchase" page: skip the articles above and tap Get more help at the very bottom](/images/chatgpt-pro-diy/11-unable-to-purchase.png)
*The "Unable to purchase" page: skip the articles above and tap Get more help at the very bottom*

![The Chat form: name and email are filled in automatically. Additional Details can stay empty for now (personal details redacted)](/images/chatgpt-pro-diy/12-chat-form.png)
*The Chat form: name and email are filled in automatically. Additional Details can stay empty for now (personal details redacted)*

3. After the advisor checked the PIN, they said this was a **temporary security restriction** on billing activity, that a request to lift it had been submitted, and that it would take **up to 72 hours**. Don't try to purchase before then, or you may interfere with the review.

![After I explained, the advisor sent me to account.apple.com for a 4-digit Support PIN (PIN redacted)](/images/chatgpt-pro-diy/13-chat-pin-request.png)
*After I explained, the advisor sent me to account.apple.com for a 4-digit Support PIN (PIN redacted)*

![The advisor's reply: a temporary security restriction, lifted within 72 hours at most, and don't try to purchase in the meantime (PIN redacted)](/images/chatgpt-pro-diy/14-advisor-72h.png)
*The advisor's reply: a temporary security restriction, lifted within 72 hours at most, and don't try to purchase in the meantime (PIN redacted)*

I opened in English. Copy it straight across:

```text
Hi, I'm trying to subscribe to ChatGPT in the App Store using my Apple Gift Card balance, but I get "Purchase not completed, please contact Apple Support for review." Could you please review my account and remove the purchase restriction?

(If asked for verification) Sure, here is my Support PIN: [your PIN]

(Follow-up) Thank you. Just to confirm: should I wait the full 72 hours before trying to purchase again?
```

## 7. What I planned to do next

1. Wait out the full 72 hours.
2. Subscribe to Go, then upgrade to Pro in App Store subscription management.
3. **Turn off auto-renew immediately** (App Store → Subscriptions → Cancel Subscription; the current month still works). After that, top up manually each month.

## 8. A few extras

- **Sharing with a partner**: signing in to the same ChatGPT account on Windows is technically possible (the subscription is tied to the ChatGPT account, not the Apple ID), but it violates OpenAI's terms and can get the account banned. At the very least, don't use it at the same time, and don't use it across regions.
- **A Mac works too**: if ChatGPT was installed from the Mac App Store, you can redeem and subscribe there as well. An iPhone is still the most reliable.
- **Network**: other than turning the proxy off while registering the Apple ID, use a stable US node the whole way.
- **Cost**: $115, about 820 yuan (an HSBC HKD card, roughly 900 HKD including the FX fee). For reference only.

## 9. Checklist

- [ ] Foreign-region Apple ID: password, email, rescue email, and security questions changed
- [ ] Signed in only in the App Store, never touched iCloud
- [ ] Gift card region = Apple ID region
- [ ] The card's billing address matches the bank's records exactly
- [ ] The Amazon seller is ACI Gift Cards LLC
- [ ] Balance covers "the small tier + Pro"
- [ ] Hit "purchase not completed" → contact support, don't mash the button
- [x] Auto-renew turned off after subscribing
- [ ] Important chats backed up

## 10. Lessons

1. **The card's region has to match the Apple ID's region.** A Taiwan ID cannot take a US card.
2. **The billing address has to match the bank's records character for character.**
3. **A new account's first payment will probably trip risk controls.** Contact support. Don't retry in a loop.
4. **Make the amount you need out of fixed gift-card denominations.**
5. **Subscribe month to month. Don't buy the annual plan.** The risk stays manageable.
6. **Back up important chats**, just in case.
7. Using it this way from an unsupported region violates OpenAI's and Anthropic's terms of service. **There is no guarantee.** Weigh it yourself.

## 11. What happened after 72 hours

On October 6, Apple Support lifted the purchase restriction on the US Apple ID and told me to wait another 72 hours, and not to retry during that time.

When the 72 hours were up (the evening of October 9, Beijing time), I followed the original plan:

1. Subscribe to **Go** in the ChatGPT iOS app first. It went through.
2. Then open the App Store → avatar → Subscriptions → ChatGPT → **See All Plans**, pick **ChatGPT Pro 100** ($100/month), and upgrade. That went through too.

![The App Store "Available Plans" page: Go $8, Plus $19.99, Pro 100 $100, Pro 200 $200. Pro 100 is selected](/images/chatgpt-pro-diy/16-pro-plans.png)
*The App Store "Available Plans" page: Go $8, Plus $19.99, Pro 100 $100, Pro 200 $200. Pro 100 is selected*

3. Right after the upgrade, on the same page, tap **Cancel Subscription** and turn off auto-renew. After canceling, Pro stays usable until **November 9**, and it won't charge again when that date hits.

![The "Edit Subscription" page: ChatGPT Pro 100, $100/month, renews November 9. "Cancel Subscription" is at the bottom](/images/chatgpt-pro-diy/17-cancel-autorenew.png)
*The "Edit Subscription" page: ChatGPT Pro 100, $100/month, renews November 9. "Cancel Subscription" is at the bottom*

The conclusion: **I opened ChatGPT Pro myself, with no reseller.** The whole chain is: a foreign-region Apple ID → buy a US Apple gift card on Amazon and redeem it → subscribe to Go first → upgrade to Pro in App Store subscription management → turn off auto-renew immediately.

---

### References

- @zureA255062's X article (2026-09-26): https://x.com/zureA255062/status/2103672988524855361
- 大脸猪: https://www.superpig.win/blog/how-to-buy-chatgpt-pro-ios-us
- 短裤哥: https://869hr.uk/2026/tech/openai-gpt-pro-5x-5-compare-vs-guide/
- V2EX (Philippines region + U card): https://www.v2ex.com/t/1236473
- 王若风: https://wangruofeng007.com/blog/2026-08/us-apple-gift-card-chatgpt-claude-subscription/
