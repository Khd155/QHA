// netlify/functions/getDepartments.js
// GET    /api/getDepartments?companyId=xxx → جلب الإدارات
// POST   /api/getDepartments → إضافة إدارة
// PUT    /api/getDepartments → تعديل إدارة
// DELETE /api/getDepartments?id=xxx → حذف إدارة
// ══════════════════════════════════════════

const {
  getDepartments, saveDepartments,
  parseAuth, ok, err, CORS,
} = require("./_db");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  const auth = parseAuth(event);
  if (!auth) return err("غير مصرح", 401);

  const depts = await getDepartments();

  // ── GET ──
  if (event.httpMethod === "GET") {
    let result = depts;

    // فلترة بالشركة
    const companyId = event.queryStringParameters?.companyId;
    if (companyId) result = result.filter((d) => d.companyId === companyId);

    // المستخدم العادي يرى فقط إداراته
    if (auth.role === "user" || auth.role === "deptmanager") {
      const userDepts = auth.deptIds || [];
      result = result.filter(
        (d) => userDepts.includes(d.id) || userDepts.includes(d.baseDeptId)
      );
    } else if (auth.role === "admin") {
      // admin يرى فقط إدارات شركته
      const cos = auth.companyIds || [];
      result = result.filter((d) => cos.includes(d.companyId));
    }

    return ok({ departments: result });
  }

  // الإدارات العمليات التالية للـ admin وما فوق فقط
  if (auth.role !== "superadmin" && auth.role !== "admin") {
    return err("غير مصرح", 403);
  }

  // ── POST: إضافة إدارة ──
  if (event.httpMethod === "POST") {
    let body;
    try { body = JSON.parse(event.body || "{}"); } catch { return err("Invalid JSON"); }

    const { name, companyId } = body;
    if (!name?.trim()) return err("اسم الإدارة مطلوب");
    if (!companyId) return err("companyId مطلوب");

    // admin يضيف فقط في شركته
    if (auth.role === "admin" && !(auth.companyIds || []).includes(companyId)) {
      return err("غير مصرح بإضافة إدارة لهذه الشركة", 403);
    }

    const newDept = {
      id: `dept-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      companyId,
      baseDeptId: null,
      createdAt: new Date().toISOString(),
    };

    await saveDepartments([...depts, newDept]);
    return ok({ department: newDept }, 201);
  }

  // ── PUT: تعديل إدارة ──
  if (event.httpMethod === "PUT") {
    let body;
    try { body = JSON.parse(event.body || "{}"); } catch { return err("Invalid JSON"); }

    const { id, name, companyId } = body;
    if (!id) return err("id الإدارة مطلوب");

    const dept = depts.find((d) => d.id === id);
    if (!dept) return err("الإدارة غير موجودة", 404);

    if (auth.role === "admin" && !(auth.companyIds || []).includes(dept.companyId)) {
      return err("غير مصرح", 403);
    }

    const updated = {
      ...dept,
      name: name?.trim() || dept.name,
      companyId: companyId || dept.companyId,
      updatedAt: new Date().toISOString(),
    };

    await saveDepartments(depts.map((d) => (d.id === id ? updated : d)));
    return ok({ department: updated });
  }

  // ── DELETE: حذف إدارة ──
  if (event.httpMethod === "DELETE") {
    const id = event.queryStringParameters?.id;
    if (!id) return err("id الإدارة مطلوب");

    const dept = depts.find((d) => d.id === id);
    if (!dept) return err("الإدارة غير موجودة", 404);

    if (auth.role === "admin" && !(auth.companyIds || []).includes(dept.companyId)) {
      return err("غير مصرح", 403);
    }

    await saveDepartments(depts.filter((d) => d.id !== id));
    return ok({ deleted: true, id });
  }

  return err("Method not allowed", 405);
};
