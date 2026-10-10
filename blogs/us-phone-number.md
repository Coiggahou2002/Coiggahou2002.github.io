# Getting a Real US Phone Number: From the Purple SIM to Receiving Codes over Wi-Fi Calling

- Author: Rory Cai (https://coiggahou2002.github.io/)
- Published: 2026-10-08 (Asia/Shanghai; 2026-10-08T00:00:00.000Z)
- Language: en
- Canonical: https://coiggahou2002.github.io/blogs/us-phone-number/
- Chinese version: https://coiggahou2002.github.io/zh/blogs/us-phone-number/

> Short version: **I've got the number, and it works.** An Ultra Mobile PayGo purple SIM, $3 a month, with Wi-Fi Calling turned on, so I can receive verification codes even when I'm not in the US. The biggest pitfalls weren't the SIM. They were "how do I sign in to Ultra" and "how do I put money on it": I wasted money on a residential IP, then got sent in a long loop by a few old subscriptions whose charges kept failing.

## 1. Why bother with a physical SIM

A lot of sign-ups and second-factor checks now want a US phone number. I started with the easy option, a number bought from Twilio, and **the verification codes never arrived**. Twilio's dashboard showed the messages were filtered, error code **30038**.

With this kind of API number, a lot of platforms can tell from the number range that it's a "programmatic number," and they drop the verification SMS outright. If you want codes to arrive reliably, you still need a **SIM actually issued by a carrier**.

## 2. Buying the SIM: the Ultra Mobile PayGo purple card

I went with **Ultra Mobile's PayGo plan**. People call it the "purple card":

- It runs on **T-Mobile's network**.
- The monthly fee is **$3**, and the plan lists 100 minutes + 100 texts + 100MB of data.
- Sellers online offer the physical SIM and also **free activation on your behalf**.

![The seller's Ultra Mobile purple-SIM page: a physical SIM plus activation service, $3 a month](/images/us-phone-number/01-ultra-purple-sim-listing.png)
*The seller's Ultra Mobile purple-SIM page: a physical SIM plus activation service, $3 a month*

The seller's page is clear about it: **if you activate it yourself from a non-US native IP, you can easily trip risk controls. A voided SIM is not replaced and not refunded.** So I did the sensible thing and chose their activation service.

Once the SIM arrived, I submitted the activation request the way the seller asked: the order email, the order number, and a **photo of the back of the card** (the ACT CODE and the barcode need to be readable).

![The activation request form. For "preferred activation region" I entered an Oregon ZIP code (email and order number redacted)](/images/us-phone-number/02-activation-request-form.png)
*The activation request form. For "preferred activation region" I entered an Oregon ZIP code (email and order number redacted)*

"Preferred activation region" decides where the number is based. I entered a **ZIP code in Oregon**. Leave it blank and the seller assigns one for you.

The activation email showed up not long after:

![The activation-complete email: signal comes up about half an hour after you insert the SIM. Item 4 says to use a "global US residential IP" when signing in to Ultra (order number redacted)](/images/us-phone-number/03-activation-email.png)
*The activation-complete email: signal comes up about half an hour after you insert the SIM. Item 4 says to use a "global US residential IP" when signing in to Ultra (order number redacted)*

About **30 minutes** after I inserted the SIM, it had signal. To find out what your number is, dial **`#686#`** and it shows up.

> Note item 4 of the email: **"use a global US residential IP when signing in to the official Ultra app or website."** The money I wasted later started with that one sentence.

## 3. Signing in to Ultra: a $6.60 lesson

### Buying a residential IP

To satisfy "US residential IP," I went to **IPRoyal** and bought an **ISP static residential IP**:

- Plan: ISP / Dedicated, 30 days, 1 IP.
- Location: United States → **Seattle (Washington)**.
- The total was **$6.60**, paid with **Alipay**.

![The IPRoyal checkout page: Seattle selected, 30 days, $6.60 total](/images/us-phone-number/04-iproyal-isp-seattle.png)
*The IPRoyal checkout page: Seattle selected, 30 days, $6.60 total*

After payment, the dashboard gives you an IP, a port, a username, and a password:

![Proxy details in the IPRoyal dashboard: HOST&#58;PORT&#58;USER&#58;PASS (IP, port, username, and password redacted)](/images/us-phone-number/05-iproyal-proxy-details.png)
*Proxy details in the IPRoyal dashboard: HOST:PORT:USER:PASS (IP, port, username, and password redacted)*

### A proxy chain: the residential IP behind my own node

From inside China I can't connect straight to that residential IP, so I needed a **proxy chain**: first connect to the **VLESS + Reality** node I run on BandwagonHost, then go out from there to the residential IP.

**On the computer (Clash Verge Rev)**: add a `dialer-proxy` line to the residential-IP node, pointing at my own node. Roughly like this (everything is a placeholder):

```yaml
proxies:
  - name: US-Resi
    type: http
    server: <residential IP>
    port: <port>
    username: <username>
    password: <password>
    dialer-proxy: <my BandwagonHost node>
```

![Clash Verge Rev also has a graphical Chain Proxy. The bottom of the screen warns that a chain proxy will significantly slow you down](/images/us-phone-number/06-clash-chain-proxy.png)
*Clash Verge Rev also has a graphical Chain Proxy. The bottom of the screen warns that a chain proxy will significantly slow you down*

![While I was fighting with it, US-Resi showed Timeout once during a latency test](/images/us-phone-number/07-clash-us-resi-timeout.png)
*While I was fighting with it, US-Resi showed Timeout once during a latency test*

**On the phone (Shadowrocket)**: add an HTTP node, fill in the residential IP's address, port, username, and password, then under **Proxy Via** select the node I run myself.

![Adding a node in Shadowrocket: type HTTP. The important part is Proxy Via below (address, port, username, and password redacted)](/images/us-phone-number/08-shadowrocket-add-node.png)
*Adding a node in Shadowrocket: type HTTP. The important part is Proxy Via below (address, port, username, and password redacted)*

![Once it was set, the node showed HTTP / AUTO > VLESS underneath, which means the chain is up (my own node's address redacted)](/images/us-phone-number/09-shadowrocket-proxy-via.png)
*Once it was set, the node showed HTTP / AUTO > VLESS underneath, which means the chain is up (my own node's address redacted)*

### Then: 403

The chain worked, but **ultramobile.com returned 403 immediately**. I tried **apple.com while I was at it. Also 403.**

The reason is in IPRoyal's own rules: **if the account hasn't passed identity verification, access to a lot of sites is restricted.**

![IPRoyal's identity-verification page: without verification, ISP and datacenter proxies restrict access to all government and banking sites](/images/us-phone-number/10-iproyal-verification-limits.png)
*IPRoyal's identity-verification page: without verification, ISP and datacenter proxies restrict access to all government and banking sites*

So I went to verify. The result:

!["Identity verification is available after you've spent $10." I'd only spent $6.60](/images/us-phone-number/11-iproyal-verify-after-10usd.png)
*"Identity verification is available after you've spent $10." I'd only spent $6.60*

**You have to spend $10 before you can verify.** I didn't want to throw more money in just to sign in.

### A friend solved it in one sentence

A friend told me later: **stop fussing with the residential IP. Use the IP of that BandwagonHost machine, turn on Global mode, and try.**

I switched the proxy back to the BandwagonHost node, turned on **Global** mode, and signed in to Ultra. **I was in.**

> 💡 **Lesson: a residential IP isn't necessarily required.** The seller saying "it has to be a residential IP" is the safe version of the advice. At least this time, my own US datacenter IP plus Global mode was enough. Try the node you already have first. Spend money only if that fails.

## 4. Two small pitfalls inside the app

1. **Forgot the password**: I didn't remember the password set during activation. Resetting it with "Forgot password" inside the app is enough.
2. **Changing the name and email**: do it in **My Details**. There's a trap here: **after verification succeeds, tap Back. Don't tap Save.** I tapped Save, and it asked me to verify again. I verified, tapped Save, and it asked again. An infinite loop. Tapping Back is what actually saved the change.

## 5. Turning on Wi-Fi Calling: receive texts while you're abroad

The point of the purple SIM is **Wi-Fi Calling (WLAN Calling)**: the phone doesn't need to be on a US cell tower. As long as it's on Wi-Fi, this number can send and receive texts and make and take calls.

Some tutorials say the method of turning on Wi-Fi Calling directly on an iPhone no longer works, but **when I tried it, I could turn it on directly**:

**iPhone Settings → Cellular → select this SIM → WLAN Calling → On.**

Turning it on asks you for an **Emergency 911 address**:

![Turning on Wi-Fi Calling asks for an Emergency 911 address (street and ZIP redacted)](/images/us-phone-number/12-wifi-calling-911-address.png)
*Turning on Wi-Fi Calling asks for an Emergency 911 address (street and ZIP redacted)*

> ⚠️ This has to be a **US address that actually exists**, one with a valid format that can be looked up.

Once it's on, the status bar shows Wi-Fi Calling, and verification texts come through.

## 6. Topping up: a long loop through a few old subscriptions

I had the number. I still had to put money in the PayGo wallet, or the whole thing dies the moment the balance runs out.

### First discovery: the card was empty, and old subscriptions were still charging it

The card I planned to pay with was empty. I opened my inbox and found a row of "payment was unsuccessful again":

![A row of failed charges in the inbox: Vercel $20, Massive $29, Soniox $5, retried every few days](/images/us-phone-number/13-unsuccessful-payment-emails.png)
*A row of failed charges in the inbox: Vercel $20, Massive $29, Soniox $5, retried every few days*

These are Stripe's automatic retries. The problem: **the moment money lands on the card, the next retry succeeds.** I don't plan to use any of these services anymore, so I had to deal with them before topping up.

### Vercel: there's an overdue bill, so I can't downgrade, and I can't delete the card

I wanted to drop Vercel back to the free Hobby plan. Tapping Downgrade errored immediately:

![One overdue invoice and downgrade is blocked: You cannot downgrade while your plan has an overdue payment (team name and card number redacted)](/images/us-phone-number/14-vercel-cannot-downgrade.png)
*One overdue invoice and downgrade is blocked: You cannot downgrade while your plan has an overdue payment (team name and card number redacted)*

Fine, I thought, I'll just delete the card:

![Delete the only card? You have to add a new one first (card number redacted)](/images/us-phone-number/15-vercel-remove-card.png)
*Delete the only card? You have to add a new one first (card number redacted)*

**When the account has only one card, Vercel won't let you delete it.** The only paths left: pay the balance and then downgrade, or open a ticket and ask them to waive it and cancel.

### Massive: the subscription is already gone, but the card can only be swapped, not deleted

The billing page at Massive (formerly Polygon.io) was a relief:

![Massive: No Active Subscriptions, next charge is empty, and the last charge stopped on September 22 (card number and invoice number redacted)](/images/us-phone-number/16-massive-no-active-subscriptions.png)
*Massive: No Active Subscriptions, next charge is empty, and the last charge stopped on September 22 (card number and invoice number redacted)*

**No subscription currently charging.** Next payment is empty too. I tried to delete the card while I was there:

![You can only have a single card associated with your account — you can swap it, you can't delete it (card number redacted)](/images/us-phone-number/17-massive-change-card-only.png)
*You can only have a single card associated with your account — you can swap it, you can't delete it (card number redacted)*

Swap only, no delete. The subscription is already gone, so I left it alone.

### It finally went through

After I put money on the card, I paid Ultra successfully with **PayPal (a China-region account, with a domestic card linked)** and **added $20**.

> A side note: now that I have a US number, should I register a US PayPal? No. Which region a PayPal account is in depends on the country you picked at signup, not on the phone number. A US account wants a US address and a US card, and once the limits get high it also wants an SSN. A China-region account can pay with a domestic card linked. Adding the US number as a backup phone is enough.

### Should I turn on Auto Renew?

After the top-up, the app asks whether you want **Auto Renew**:

![Auto Renew: the amount you pick is how much gets added to the PayGo wallet automatically each month (PayPal account redacted)](/images/us-phone-number/18-ultra-auto-renew.png)
*Auto Renew: the amount you pick is how much gets added to the PayGo wallet automatically each month (PayPal account redacted)*

The $5 / $10 / $20 here means **on the evening the plan renews, that amount is charged to PayPal automatically and deposited into the wallet**. It doesn't matter how much balance is left. It tops up every month.

My suggestion:

- **Leave it off**: $3 comes out of the balance each month, so **$20 lasts about 6 months**. Top up by hand when it's time.
- **If you really turn it on, pick $5.** That covers the monthly fee with a little left over.

I left it off. I'd just been through the Vercel episode and didn't want another thing that "keeps failing charges whenever the card is empty."

## 7. What it's good for, and how to keep the number

### What you can sign up for

AI tools, WhatsApp, Telegram, Signal, Discord — that kind of app that wants a phone number — are all worth a try. A few platforms block virtual-carrier numbers. If a code doesn't arrive, try another platform or contact support.

Take **WhatsApp** as the example: the US number only receives a verification code once, at signup. After that, **messages and voice calls all go over the internet** (Wi-Fi or a domestic data plan both work) and **don't cost the US number anything**. Of course, using it from inside China means the proxy stays on.

### How to keep the number

- **Don't let the balance run out.** It's $3 a month. If the balance can't cover a charge, the line is suspended, and if it stays that way too long the number gets reclaimed.
- **Turn on two-step verification.** When you switch phones or sign in to something like WhatsApp again, another code gets sent to this number. If the number is gone, the account is in trouble. So turn on two-step verification inside WhatsApp.
- **When you're waiting for a code**: the phone is on Wi-Fi, and WLAN Calling is on.

### What an "MVNO" is

Ultra is an **MVNO**: it doesn't build its own towers. It rents a big carrier's network and sells numbers and plans on top. Ultra rents T-Mobile's network, so the signal is the same as T-Mobile and the price is much lower. The domestic analogy is those 170 / 171 numbers that run on China Mobile's or China Unicom's network.

Some platforms can tell a number is an MVNO when they look it up, and they may treat it as risky and refuse the message. I haven't hit a big problem with that so far.

## 8. What it cost

- Purple SIM (physical card + activation): the seller's price was ¥276.
- IPRoyal residential IP: $6.60 (**looking back, this one could have been skipped**).
- First top-up: $20, then $3 a month.

For reference only.

## 9. Checklist

- [ ] The SIM was activated by the seller. I didn't activate it myself from a China IP
- [ ] Dialed `#686#` and wrote the number down
- [ ] Can sign in to the Ultra app over a US IP (try your own node + Global mode first)
- [ ] Password reset, name and email updated (in My Details, tap Back after verification)
- [ ] WLAN Calling is on, and the 911 address is a US address that actually exists
- [ ] Before topping up, old subscriptions that auto-charge have been dealt with
- [ ] Wallet balance covers a few months. Auto Renew is off, or set to $5
- [ ] Two-step verification is on for every important app registered with this number

## 10. Lessons

1. **API numbers (Twilio, for example) are unreliable for verification codes.** If you need codes, get a real SIM.
2. **Let the seller activate it.** Activating it yourself from a non-US IP can kill the SIM.
3. **A residential IP isn't necessarily required.** Try your own US node plus Global mode first.
4. **The proxy vendor has its own access limits.** Unverified IPRoyal returns 403, and verification itself requires spending $10 first.
5. **Before you add money, clean up old subscriptions.** Otherwise the money gets charged off the moment it hits the card.
6. **A service you owe money to often won't let you downgrade, and won't let you delete the only card.** Either pay it off or talk to support.
7. **Be careful with automatic top-up.** Manual top-ups plus checking the balance regularly is easier to control.
8. **Keeping the number = never letting the balance run out + two-step verification.**
