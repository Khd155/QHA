// netlify/functions/createMeeting.js
// POST /api/createMeeting → إنشاء محضر جديد
// PUT  /api/createMeeting → تعديل محضر موجود
// ══════════════════════════════════════════

const { getMinutes, saveMinutes, generateSerial, parseAuth, ok, err, CORS } = require("./_db");

// التحقق من صلاحية الإنشاء في إدارة معيّنة
function canCreateInDept(auth, deptId) {
  if (!auth) return false;
  if (auth.role === "superadmin" || auth.role === "admin") return true;

  const userDepts = auth.deptIds || [];
  if (userDepts.includes(deptId)) return true;

  const base = deptId?.includes("-")
    ? deptId.split("-").slice(1).join("-")
    : deptId;
  return userDepts.includes(base);
}

// التحقق من صلاحية التعديل
function canEdit(auth, minute) {
  if (!auth || !minute) return false;
  if (auth.role === "superadmin") return true;
  if (auth.role === "admin") {
    const cos = auth.companyIds || [];
    return cos.includes(minute.companyId);
  }
  // deptmanager/user يعدّلون فقط محاضرهم
  return minute.createdBy === auth.id;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  const isCreate = event.httpMethod === "POST";
  const isUpdate = event.httpMethod === "PUT";

  if (!isCreate && !isUpdate) {
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

  const {
    id,
    companyId,
    deptId,
    title,
    hijriDate,
    day,
    location,
    objectives,
    recommendations,
    attendees,
    evidenceFiles,   // [{ name, url, size, type }] — الروابط جاهزة بعد uploadFile
    notes,
  } = body;

  // التحقق من الحقول الأساسية
  if (!companyId || !deptId) return err("companyId و deptId مطلوبان");
  if (!title?.trim()) return err("عنوان المحضر مطلوب");

  if (!canCreateInDept(auth, deptId)) {
    return err("غير مصرح لك بإنشاء محضر في هذه الإدارة", 403);
  }

  const minutes = await getMinutes();

  // تعديل محضر موجود
  if (isUpdate) {
    if (!id) return err("id المحضر مطلوب للتعديل");
    const existing = minutes.find((m) => m.id === id);
    if (!existing) return err("المحضر غير موجود", 404);
    if (!canEdit(auth, existing)) return err("غير مصرح لك بتعديل هذا المحضر", 403);

    const updated = {
      ...existing,
      companyId,
      deptId,
      title: title.trim(),
      hijriDate: hijriDate || existing.hijriDate,
      day: day || existing.day,
      location: location || "",
      objectives: objectives || [],
      recommendations: recommendations || [],
      attendees: attendees || [],
      evidenceFiles: evidenceFiles || existing.evidenceFiles || [],
      notes: notes || "",
      updatedAt: new Date().toISOString(),
    };

    const newMinutes = minutes.map((m) => (m.id === id ? updated : m));
    await saveMinutes(newMinutes);
    return ok({ minute: updated });
  }

  // إنشاء محضر جديد
  const serialNumber = await generateSerial(companyId);
  const newMinute = {
    id: `min-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    companyId,
    deptId,
    title: title.trim(),
    hijriDate: hijriDate || "",
    day: day || "",
    location: location || "",
    objectives: objectives || [],
    recommendations: recommendations || [],
    attendees: attendees || [],
    evidenceFiles: evidenceFiles || [],
    notes: notes || "",
    serialNumber,
    createdBy: auth.id,
    createdAt: new Date().toISOString(),
  };

  await saveMinutes([...minutes, newMinute]);
  return ok({ minute: newMinute }, 201);
};
