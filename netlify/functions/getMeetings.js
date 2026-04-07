// netlify/functions/getMeetings.js
// GET /api/getMeetings → جلب المحاضر مع فلترة
// ══════════════════════════════════════════
// Query params:
//   companyId  — فلترة بالشركة
//   deptId     — فلترة بالإدارة
//   search     — بحث نصي
//   limit      — حد النتائج (default 100)
//   offset     — pagination

const { getMinutes, parseAuth, CORS, ok, err } = require("./_db");

// التحقق من صلاحية الرؤية
function canSeeMinute(auth, minute) {
  if (!auth || !minute) return false;

  // superadmin يرى الكل
  if (auth.role === "superadmin") return true;

  // التحقق من الشركة
  const userCos = auth.companyIds || [];
  if (!userCos.includes(minute.companyId)) return false;

  // admin يرى كل محاضر شركته
  if (auth.role === "admin") return true;

  // deptmanager و user: يرون فقط محاضر إداراتهم
  const userDepts = auth.deptIds || [];
  if (userDepts.includes(minute.deptId)) return true;

  // تحقق من baseDeptId
  const base = minute.deptId?.includes("-")
    ? minute.deptId.split("-").slice(1).join("-")
    : minute.deptId;
  return userDepts.includes(base);
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return err("Method not allowed", 405);
  }

  const auth = parseAuth(event);
  if (!auth) return err("غير مصرح — يرجى تسجيل الدخول", 401);

  const q = event.queryStringParameters || {};
  const limit = parseInt(q.limit) || 100;
  const offset = parseInt(q.offset) || 0;

  let minutes = await getMinutes();

  // فلترة الصلاحيات
  minutes = minutes.filter((m) => canSeeMinute(auth, m));

  // فلترة بالشركة
  if (q.companyId) {
    minutes = minutes.filter((m) => m.companyId === q.companyId);
  }

  // فلترة بالإدارة
  if (q.deptId) {
    minutes = minutes.filter((m) => m.deptId === q.deptId);
  }

  // بحث نصي
  if (q.search?.trim()) {
    const searchLower = q.search.trim().toLowerCase();
    minutes = minutes.filter((m) => {
      const haystack = [
        m.title, m.serialNumber, m.hijriDate, m.location,
        ...(m.attendees || []),
        ...(m.objectives || []),
        ...(m.recommendations || []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchLower);
    });
  }

  // ترتيب: الأحدث أولاً
  minutes = [...minutes].sort((a, b) =>
    (b.createdAt || "").localeCompare(a.createdAt || "")
  );

  const total = minutes.length;
  const paginated = minutes.slice(offset, offset + limit);

  return ok({
    minutes: paginated,
    total,
    limit,
    offset,
  });
};
