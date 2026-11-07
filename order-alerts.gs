/* =====================================================================
   GREENSBORO HAIRCARE — AUTOMATIC ORDER ALERTS  (Google Apps Script)

   When a customer taps Submit on the order site, this script:
     1. Emails the full order to OWNER_EMAIL (sent from your Gmail, free)
     2. Texts a short version to OWNER_PHONE (Textbelt, about $3 per 50 texts)
     3. Optionally emails the customer a copy of their receipt

   ONE-TIME SETUP (about 10 minutes)
   ---------------------------------
   1. Sign in to Google as the account that should SEND the emails
      (e.g. greensborohaircarewarehouse@gmail.com). Go to script.google.com -> New project.
   2. Delete what's there, paste this whole file in, and click Save.
   3. TEXTS: go to textbelt.com, buy a credit pack, and copy the API key
      they give you. Paste it into TEXTBELT_KEY below. (Leave it blank to
      get email only.)
   4. Pick "testSetup" in the function dropdown at the top and click Run.
      Google asks for permission the first time — click through and Allow.
      You should get a test email and a test text within a minute.
   5. Click Deploy -> New deployment -> gear icon -> Web app.
        Execute as:      Me
        Who has access:  Anyone
      Click Deploy and copy the "Web app URL".
   6. Open index.html, find   const ORDER_ENDPOINT = "";
      and paste the URL between the quotes. Re-upload the site.

   DISCOUNTS: codes and the scheduled discount you save in the site's
   Owner tools are stored here (Project Settings -> Script Properties),
   so every customer gets them. The Owner tools password is ADMIN_PASSWORD.

   If you edit this script later: Deploy -> Manage deployments -> pencil ->
   Version: New version -> Deploy. (The URL stays the same.)
   ===================================================================== */

const CONFIG = {
  OWNER_EMAIL: "greensborohaircarewarehouse@gmail.com",   // where order emails go (comma-separate for more than one)
  OWNER_PHONE: "3363145959",               // where order texts go (10 digits, comma-separate for more)
  TEXTBELT_KEY: "6b22f9879b8c95659c3eb44fabb0b770ad64acd9cng1yzhv0XeN1Qzb3ycrgwQLM",                        // paste your Textbelt key here
  SEND_CUSTOMER_COPY: true,                // email the customer their receipt too
  STORE_NAME: "Greensboro Haircare",
  ADMIN_PASSWORD: "Artis"                  // the password for the ⚙ Owner tools on the site — change it to your own
};

/* ---------- discounts shared with every customer ---------- */
function loadPromos() {
  const raw = PropertiesService.getScriptProperties().getProperty("PROMOS");
  try { return raw ? JSON.parse(raw) : null; } catch (err) { return null; }
}
function cleanStamp(v) { v = String(v || "").slice(0, 16); return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? v : ""; }
function cleanTime(v, fb) { v = String(v || ""); return /^\d{2}:\d{2}$/.test(v) ? v : fb; }
function cleanPromos(p) {
  const discounts = (Array.isArray(p.discounts) ? p.discounts : []).slice(0, 100).map(function (d) {
    const type = d.type === "amt" ? "amt" : "pct";
    let value = Math.max(0, Number(d.value) || 0);
    if (type === "pct") value = Math.min(100, value);
    return {
      code: String(d.code || "").toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 30),
      type: type, value: value, min: Math.max(0, Number(d.min) || 0), on: d.on !== false,
      note: String(d.note || "").slice(0, 200), start: cleanStamp(d.start), end: cleanStamp(d.end)
    };
  }).filter(function (d) { return d.code; });
  const a = p.autoDiscount || {};
  const day = function (v, fb) { v = Number(v); return v >= 0 && v <= 6 ? Math.floor(v) : fb; };
  const autoDiscount = {
    on: !!a.on, pct: Math.min(100, Math.max(0, Number(a.pct) || 0)),
    label: String(a.label || "Weekend special").slice(0, 60),
    startDay: day(a.startDay, 6), startTime: cleanTime(a.startTime, "17:00"),
    endDay: day(a.endDay, 2), endTime: cleanTime(a.endTime, "12:00"), stack: !!a.stack
  };
  return { discounts: discounts, autoDiscount: autoDiscount };
}
/* What customers get: only codes that are switched on, without your notes. */
function publicPromos(p) {
  if (!p) return { ok: true };
  return {
    ok: true,
    discounts: p.discounts.filter(function (d) { return d.on; })
      .map(function (d) { return { code: d.code, type: d.type, value: d.value, min: d.min, on: true, start: d.start, end: d.end }; }),
    autoDiscount: p.autoDiscount
  };
}
function checkPassword(pw) {
  if (!CONFIG.ADMIN_PASSWORD) return "Set ADMIN_PASSWORD in the Google script first";
  // Slow down password guessing: max 10 wrong tries per 10 minutes.
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get("pwfails") || 0);
  if (fails >= 10) return "Too many wrong tries — wait 10 minutes";
  if (String(pw) !== String(CONFIG.ADMIN_PASSWORD)) { cache.put("pwfails", String(fails + 1), 600); return "That password didn't match"; }
  return "";
}

function doGet(e) {
  if (e && e.parameter && e.parameter.action === "promos") return reply(publicPromos(loadPromos()));
  return reply({ ok: true, service: "order alerts" });
}

function doPost(e) {
  try {
    const o = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    if (o.action === "login" || o.action === "savePromos") {
      const bad = checkPassword(o.password);
      if (bad) return reply({ ok: false, error: bad });
      if (o.action === "savePromos") {
        const clean = cleanPromos(o);
        PropertiesService.getScriptProperties().setProperty("PROMOS", JSON.stringify(clean));
        return reply({ ok: true, discounts: clean.discounts, autoDiscount: clean.autoDiscount });
      }
      const p = loadPromos();
      return reply(p ? { ok: true, discounts: p.discounts, autoDiscount: p.autoDiscount } : { ok: true });
    }

    // Ignore anything that isn't a real order from the site.
    if (!o.order_number || !/^ORD-\d{8}-\d{4}$/.test(o.order_number) || !Array.isArray(o.items) || !o.items.length) {
      return reply({ ok: false, error: "not an order" });
    }
    // Don't double-send if the customer's phone retries.
    const cache = CacheService.getScriptCache();
    if (cache.get(o.order_number)) return reply({ ok: true, duplicate: true });

    const result = { email: false, sms: false, customer: false };

    try {
      MailApp.sendEmail({
        to: CONFIG.OWNER_EMAIL,
        subject: o.subject || ("New order " + o.order_number),
        body: o.full_receipt || "",
        htmlBody: orderHtml(o, true),
        replyTo: o.email || undefined,
        name: CONFIG.STORE_NAME + " Orders"
      });
      result.email = true;
    } catch (err) { result.emailError = String(err); }

    if (CONFIG.TEXTBELT_KEY) {
      String(CONFIG.OWNER_PHONE).split(",").forEach(function (num) {
        const r = sendText(num.trim(), o.sms_text || o.subject);
        if (r.success) result.sms = true; else result.smsError = r.error || "text failed";
      });
    }

    if (CONFIG.SEND_CUSTOMER_COPY && o.email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(o.email)) {
      try {
        MailApp.sendEmail({
          to: o.email,
          subject: CONFIG.STORE_NAME + " — your order " + o.order_number,
          body: o.full_receipt || "",
          htmlBody: orderHtml(o, false),
          replyTo: CONFIG.OWNER_EMAIL.split(",")[0],
          name: CONFIG.STORE_NAME
        });
        result.customer = true;
      } catch (err) { result.customerError = String(err); }
    }

    result.ok = result.email || result.sms;
    if (result.ok) cache.put(o.order_number, "1", 6 * 60 * 60);
    return reply(result);
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}

function sendText(phone, message) {
  try {
    const res = UrlFetchApp.fetch("https://textbelt.com/text", {
      method: "post",
      payload: { phone: phone, message: message, key: CONFIG.TEXTBELT_KEY },
      muteHttpExceptions: true
    });
    return JSON.parse(res.getContentText());
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

function orderHtml(o, forOwner) {
  const esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  const td = 'style="padding:6px 8px;border-bottom:1px solid #e3e8ef"';
  const rows = o.items.map(function (l) {
    return "<tr><td " + td + ">" + esc(l.qty) + "×</td><td " + td + ">" + esc(l.name) +
      (l.shade ? " <b>" + esc(l.shade) + "</b>" : "") + " <span style=\"color:#7c8fa3\">" + esc(l.size) + "</span></td>" +
      "<td " + td + " align=\"right\">" + esc(l.line) + "</td></tr>";
  }).join("");
  const line = function (k, v) { return v ? "<tr><td style=\"padding:3px 8px;color:#53687e\">" + k + "</td><td style=\"padding:3px 8px\">" + esc(v) + "</td></tr>" : ""; };
  return '<div style="font-family:Arial,sans-serif;max-width:560px;color:#132433">' +
    '<h2 style="margin:0 0 4px">' + (forOwner ? "New order " : "Thanks for your order — ") + esc(o.order_number) + '</h2>' +
    '<p style="margin:0 0 14px;color:#53687e">' + esc(o.placed_at) + '</p>' +
    (forOwner ? '<p style="padding:10px 12px;background:' + (/^PAID/.test(o.payment_status) ? "#e4f3eb" : "#fbeedd") +
      ';border-radius:6px;font-weight:bold">' + esc(o.payment_status) + '</p>' : "") +
    '<table style="border-collapse:collapse;width:100%">' + rows + '</table>' +
    '<table style="margin-top:10px">' +
      line("Subtotal", o.subtotal) + line("Discount", o.discount) + line("Tax", o.tax) +
      line("Delivery", o.delivery) + '<tr><td style="padding:3px 8px"><b>Total</b></td><td style="padding:3px 8px"><b>' + esc(o.total) + '</b></td></tr>' +
    '</table>' +
    '<h3 style="margin:18px 0 6px">Delivering to</h3><table>' +
      line("Name", o.customer + (o.shop ? " · " + o.shop : "")) + line("License", o.license) +
      line("Phone", o.phone) + line("Email", o.email) + line("Address", o.address) +
      line("Notes", o.delivery_notes) + line("Payment", o.payment_method) +
    '</table>' +
    (forOwner ? "" : '<p style="color:#53687e">We\'ll confirm by text or call, then deliver next day. Questions? Just reply to this email.</p>') +
    '</div>';
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* Run this once from the editor to grant permissions and check everything works. */
function testSetup() {
  MailApp.sendEmail(CONFIG.OWNER_EMAIL, CONFIG.STORE_NAME + " — order alerts are working",
    "This is a test. Real orders from the site will arrive here the moment a customer taps Submit.");
  Logger.log("Test email sent to " + CONFIG.OWNER_EMAIL);
  if (CONFIG.TEXTBELT_KEY) {
    const r = sendText(String(CONFIG.OWNER_PHONE).split(",")[0].trim(), CONFIG.STORE_NAME + ": order text alerts are working.");
    Logger.log("Text result: " + JSON.stringify(r));
  } else {
    Logger.log("No TEXTBELT_KEY yet — skipping the test text.");
  }
  Logger.log("Emails left today: " + MailApp.getRemainingDailyQuota());
}
