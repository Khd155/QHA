// netlify/functions/deleteMeeting.js
// DELETE /api/deleteMeeting?id=xxx → حذف محضر
// ══════════════════════════════════════════

const { getMinutes, saveMinutes, parseAuth, ok, err, CORS } = require("./_db");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  if (event.httpMethod !== "DELETE") {
    return err("Method not allowed", 405);
  }

  const auth = parseAuth(event);
  if (!auth) return err("غير مصرح — يرجى تسجيل الدخول", 401);

  const id = event.queryStringParameters?.id;
  if (!id) return err("id المحضر مطلوب");

  const minutes = await getMinutes();
  const minute = minutes.find((m) => m.id === id);
  if (!minute) return err("المحضر غير موجود", 404);

  // التحقق من الصلاحية
  const canDelete =
    auth.role === "superadmin" ||
    (auth.role === "admin" && (auth.companyIds || []).includes(minute.companyId)) ||
    minute.createdBy === auth.id;

  if (!canDelete) {
    return err("غير مصرح لك بحذف هذا المحضر", 403);
  }

  const newMinutes = minutes.filter((m) => m.id !== id);
  await saveMinutes(newMinutes);
  return ok({ deleted: true, id });
};
