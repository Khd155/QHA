// netlify/functions/uploadFile.js
// POST /api/uploadFile → رفع ملف (مرفق/شاهد) وإرجاع رابط مباشر
// ══════════════════════════════════════════════════════════════
// Body (JSON):
//   {
//     fileName: "اسم_الملف.pdf",
//     fileData: "base64...",        // base64 بدون prefix
//     mimeType: "application/pdf",
//     companyId: "quraish",
//     minuteId: "min-xxx"           // اختياري
//   }

const { getStore } = require("@netlify/blobs");
const { parseAuth, ok, err, CORS } = require("./_db");

const MAX_SIZE_MB = 20;
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip",
];

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return err("Method not allowed", 405);
  }

  const auth = parseAuth(event);
  if (!auth) return err("غير مصرح — يرجى تسجيل الدخول", 401);

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return err("Invalid JSON");
  }

  const { fileName, fileData, mimeType, companyId, minuteId } = body;

  if (!fileName || !fileData) {
    return err("fileName و fileData مطلوبان");
  }

  // التحقق من نوع الملف
  if (mimeType && !ALLOWED_TYPES.includes(mimeType)) {
    return err(`نوع الملف غير مدعوم: ${mimeType}`);
  }

  // التحقق من الحجم
  const buffer = Buffer.from(fileData, "base64");
  const sizeMB = buffer.length / (1024 * 1024);
  if (sizeMB > MAX_SIZE_MB) {
    return err(`حجم الملف يتجاوز الحد المسموح (${MAX_SIZE_MB} MB)`);
  }

  // اسم فريد للملف
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._\u0600-\u06FF-]/g, "_");
  const blobKey = `files/${companyId || "general"}/${timestamp}-${random}-${safeFileName}`;

  try {
    const store = getStore("uploads");

    // رفع الملف إلى Netlify Blobs
    await store.set(blobKey, buffer, {
      metadata: {
        fileName,
        mimeType: mimeType || "application/octet-stream",
        uploadedBy: auth.id,
        companyId: companyId || "",
        minuteId: minuteId || "",
        uploadedAt: new Date().toISOString(),
        sizeBytes: buffer.length,
      },
    });

    // رابط الوصول المباشر عبر Function مخصصة
    const fileUrl = `/.netlify/functions/getFile?key=${encodeURIComponent(blobKey)}`;

    return ok({
      url: fileUrl,
      key: blobKey,
      fileName,
      mimeType: mimeType || "application/octet-stream",
      sizeMB: parseFloat(sizeMB.toFixed(2)),
    }, 201);

  } catch (e) {
    console.error("Upload error:", e);
    return err("فشل رفع الملف: " + e.message, 500);
  }
};
