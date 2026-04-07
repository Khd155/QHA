// netlify/functions/settings.js
// GET /api/settings         → جلب الإعدادات (شعارات)
// POST /api/settings        → حفظ شعار شركة أو شعار صفحة الدخول
// ══════════════════════════════════════════════════════

const { getSettings, saveSettings, parseAuth, ok, err, CORS } = require("./_db");
const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  const auth = parseAuth(event);
  if (!auth) return err("غير مصرح", 401);

  // ── GET: جلب الإعدادات ──
  if (event.httpMethod === "GET") {
    const settings = await getSettings();
    return ok({ settings });
  }

  // تعديل الإعدادات: superadmin فقط
  if (auth.role !== "superadmin") {
    return err("غير مصرح — superadmin فقط", 403);
  }

  if (event.httpMethod !== "POST") {
    return err("Method not allowed", 405);
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return err("Invalid JSON"); }

  const { type, companyId, imageData, mimeType } = body;
  // type: "companyLogo" | "loginLogo"

  if (!type || !imageData) return err("type و imageData مطلوبان");

  // رفع الصورة إلى Blobs
  const buffer = Buffer.from(imageData, "base64");
  const sizeMB = buffer.length / (1024 * 1024);
  if (sizeMB > 5) return err("حجم الشعار يتجاوز 5 MB");

  const key =
    type === "loginLogo"
      ? "logos/login-logo"
      : `logos/company-${companyId}`;

  const store = getStore("uploads");
  await store.set(key, buffer, {
    metadata: { mimeType: mimeType || "image/png", type, companyId: companyId || "" },
  });

  const logoUrl = `/.netlify/functions/getFile?key=${encodeURIComponent(key)}`;

  const settings = await getSettings();
  if (type === "loginLogo") {
    settings.loginLogo = logoUrl;
  } else if (companyId) {
    settings.logos = settings.logos || {};
    settings.logos[companyId] = logoUrl;
  }
  await saveSettings(settings);

  return ok({ url: logoUrl, type, companyId: companyId || null });
};
