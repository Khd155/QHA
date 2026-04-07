// netlify/functions/getFile.js
// GET /api/getFile?key=files/... → تقديم الملف المرفوع مع رابط مباشر
// ══════════════════════════════════════════════════════════════════

const { getStore } = require("@netlify/blobs");
const { parseAuth, err, CORS } = require("./_db");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return err("Method not allowed", 405);
  }

  // ملاحظة: الملفات متاحة للمستخدمين المسجلين فقط
  // يمكن تعديلها لتكون عامة إذا احتجت
  const auth = parseAuth(event);
  if (!auth) return err("غير مصرح", 401);

  const key = event.queryStringParameters?.key;
  if (!key) return err("مفتاح الملف مطلوب");

  // التحقق الأمني: منع path traversal
  if (key.includes("..") || key.includes("\\")) {
    return err("مسار الملف غير صالح", 400);
  }

  try {
    const store = getStore("uploads");
    const result = await store.getWithMetadata(key);

    if (!result) {
      return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: "الملف غير موجود" }) };
    }

    const { data, metadata } = result;
    const mimeType = metadata?.mimeType || "application/octet-stream";
    const fileName = metadata?.fileName || key.split("/").pop();

    // إرجاع الملف كـ base64 مع headers مناسبة
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

    return {
      statusCode: 200,
      headers: {
        ...CORS,
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "private, max-age=3600",
      },
      body: buffer.toString("base64"),
      isBase64Encoded: true,
    };

  } catch (e) {
    console.error("getFile error:", e);
    return err("فشل جلب الملف: " + e.message, 500);
  }
};
