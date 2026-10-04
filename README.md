# Triad Beauty Supply — order app

## Why your buttons weren't working

GitHub has two completely different ways of showing an HTML file, and only one
of them actually runs the page.

**These do NOT run the page** — buttons will look right but do nothing:

| What you're looking at | Why it's dead |
|---|---|
| `github.com/you/repo/blob/main/index.html` | This is the *source code viewer*. It shows your HTML as text. |
| `raw.githubusercontent.com/...` | Serves the file as `text/plain`, so the browser prints it instead of running it. |
| The file preview inside the GitHub editor | Same thing — source, not a live page. |

**This DOES run the page:**

```
https://YOUR-USERNAME.github.io/YOUR-REPO/
```

That address only exists once you turn GitHub Pages **on**. Until you do, there
is no live site — just a file sitting in a repo. Turning it on is the whole fix.

---

## Turn on GitHub Pages (2 minutes)

1. Upload `index.html` and `.nojekyll` to your repository. **The file must be
   named exactly `index.html`** — lowercase, in the root of the repo, not in a
   folder.
2. In your repo, click **Settings** (top row, far right).
3. In the left sidebar, click **Pages**.
4. Under **Source**, choose **Deploy from a branch**.
5. Under **Branch**, pick **main** and the folder **/ (root)**. Click **Save**.
6. Wait about a minute, then refresh that Settings → Pages screen. A green box
   appears with your live link:

   ```
   Your site is live at https://YOUR-USERNAME.github.io/YOUR-REPO/
   ```

7. Open **that** link. Every button works there.

**The repo must be Public** for free GitHub Pages. If it's private, either make
it public (Settings → General → scroll to the bottom → Change visibility) or use
Netlify instead (below).

### Still not working?

- **404 page?** Pages isn't finished building yet — wait another minute, or
  check the file is named `index.html` in the root.
- **Page loads but looks like plain text?** You're still on the `blob/` or
  `raw.` address. Go back to Settings → Pages and use the link shown there.
- **Page loads but a red bar appears at the top?** That bar names the actual
  error — send me what it says and I'll fix it.
- **Old version showing?** Hard refresh: `Ctrl+Shift+R` (Windows) or
  `Cmd+Shift+R` (Mac). GitHub caches aggressively.

---

## Faster alternative: Netlify Drop

If GitHub is fighting you, this takes 30 seconds and needs no account:

1. Go to **app.netlify.com/drop**
2. Drag the `index.html` file onto the page.
3. You get a live, working link immediately.

To update it later, drag the new file onto the same site.

---

## Turn on automatic order emails (free, 3 minutes)

Right now the customer has to tap "Text us" or "Email us" to send you the order.
To have orders land in your inbox automatically instead:

1. Go to **formspree.io**, make a free account.
2. **+ New Form** → name it `Orders` → set the destination to your email.
3. Formspree gives you an endpoint like `https://formspree.io/f/abcdwxyz`.
   Copy the part after `/f/` — here, `abcdwxyz`.
4. Open `index.html` in a text editor, search for `FORMSPREE_ID`, and paste it in:

   ```js
   const FORMSPREE_ID = "abcdwxyz";
   ```

5. Save and re-upload the file.

Free plan covers 50 orders/month.

**Want a text too?** In Formspree, add a second recipient using your carrier's
email-to-text gateway for your own number:

| Carrier | Address |
|---|---|
| Verizon | `3365550142@vtext.com` |
| AT&T | `3365550142@txt.att.net` |
| T-Mobile | `3365550142@tmomail.net` |

---

## Set up your shop

Open the live site, tap **⚙** in the top right, PIN `1234`.

**Change the PIN first.** Then fill in:

- **Store & tax** — business name, tagline, phone, order email.
  Tax is preset to **6.75%** (NC state 4.75% + Guilford County 2.00%).
- **Payment handles** — Cash App, Venmo, PayPal, Zelle. Blank ones disappear
  from checkout. Cash App, Venmo and PayPal each get a one-tap button on the
  receipt with the exact total pre-filled.
- **Products & prices** — all 139 items from your Influance price list are
  loaded; edit any price or reset back to the printed list.

One thing to know: these settings save in **the browser you're using**, so set
them up on the device you'll run the business from. They don't follow you to
another phone or computer.

---

## Sales tax

North Carolina expects sales tax on retail sales of these products. The app adds
**6.75%** for Guilford County and shows it as its own line on every receipt.

Shops buying to **resell** can check the tax-exempt box, but they must give you
their NC Certificate of Resale number — the app asks for it and prints it on the
receipt. Keep those; that number is what proves to NCDOR why you didn't collect
tax on that sale.

If you aren't registered to collect NC sales tax yet, register for a Certificate
of Registration with NCDOR (free) before you start charging it.
