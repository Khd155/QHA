// netlify/functions/getUsers.js
// GET  /api/getUsers  → جلب المستخدمين
// POST /api/getUsers  → إضافة مستخدم جديد
// PUT  /api/getUsers  → تعديل مستخدم
// DELETE /api/getUsers?id=xxx → حذف مستخدم
// ══════════════════════════════════════════

const { getUsers, saveUsers, parseAuth, ok, err, CORS } = require("./_db");

// التحقق من صلاحية الإدارة
function canManageUser(auth, targetUser) {
  if (!auth || !targetUser) return false;
  if (auth.id === targetUser.id) return false; // لا يُدير نفسه
  if (auth.role === "superadmin") return true;

  const actorCos = auth.companyIds || [];
  const targetCos = targetUser.companyIds || [];
  const sharedCo = actorCos.some((c) => targetCos.includes(c));

  if (auth.role === "admin" && sharedCo &&
      targetUser.role !== "superadmin" && targetUser.role !== "admin") {
    return true;
  }

  if (auth.role === "deptmanager" && sharedCo && targetUser.role === "user") {
    const actorDepts = auth.deptIds || [];
    const targetDepts = targetUser.deptIds || [];
    const sameDept = actorDepts.some((d) => targetDepts.includes(d));
    return sameDept || targetUser.createdBy === auth.id;
  }

  return false;
}

// الأدوار المتاحة للإضافة
function availableRoles(auth) {
  if (auth.role === "superadmin") return ["admin", "deptmanager", "user"];
  if (auth.role === "admin") return ["deptmanager", "user"];
  if (auth.role === "deptmanager") return ["user"];
  return [];
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  const auth = parseAuth(event);
  if (!auth) return err("غير مصرح", 401);

  const users = await getUsers();

  // ── GET: جلب المستخدمين ──
  if (event.httpMethod === "GET") {
    // فقط admin وما فوق يجلبون القائمة
    if (auth.role !== "superadmin" && auth.role !== "admin" && auth.role !== "deptmanager") {
      return err("غير مصرح", 403);
    }

    // كل مستخدم يرى من يقدر يديره + نفسه
    const visible = users.filter(
      (u) => u.id === auth.id || canManageUser(auth, u)
    );

    // حذف كلمات المرور من الاستجابة
    const safe = visible.map(({ password, ...u }) => u);
    return ok({ users: safe });
  }

  // ── POST: إضافة مستخدم ──
  if (event.httpMethod === "POST") {
    const allowed = availableRoles(auth);
    if (!allowed.length) return err("غير مصرح بإضافة مستخدمين", 403);

    let body;
    try { body = JSON.parse(event.body || "{}"); } catch { return err("Invalid JSON"); }

    const { username, password, name, role, companyIds, deptIds } = body;

    if (!username?.trim() || !password?.trim() || !name?.trim()) {
      return err("username, password, name مطلوبة");
    }
    if (!allowed.includes(role)) {
      return err(`ليس لديك صلاحية لإنشاء دور: ${role}`, 403);
    }
    if (users.find((u) => u.username === username)) {
      return err("اسم المستخدم مستخدم بالفعل");
    }
    if ((role === "user" || role === "deptmanager") && !deptIds?.length) {
      return err("يجب ربط المستخدم بإدارة واحدة على الأقل");
    }

    // مدير الإدارة يفرض شركته على المستخدم الجديد
    let finalCos = companyIds || [];
    if (auth.role === "deptmanager") finalCos = auth.companyIds || [];

    const newUser = {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      username: username.trim(),
      password: password.trim(),
      name: name.trim(),
      role,
      companyIds: finalCos,
      deptIds: deptIds || [],
      createdBy: auth.id,
      createdAt: new Date().toISOString(),
    };

    await saveUsers([...users, newUser]);
    const { password: _, ...safeUser } = newUser;
    return ok({ user: safeUser }, 201);
  }

  // ── PUT: تعديل مستخدم ──
  if (event.httpMethod === "PUT") {
    let body;
    try { body = JSON.parse(event.body || "{}"); } catch { return err("Invalid JSON"); }

    const { id, name, password, companyIds, deptIds } = body;
    if (!id) return err("id المستخدم مطلوب");

    const target = users.find((u) => u.id === id);
    if (!target) return err("المستخدم غير موجود", 404);

    // يمكن للمستخدم تعديل بياناته الأساسية فقط
    const isSelf = id === auth.id;
    if (!isSelf && !canManageUser(auth, target)) {
      return err("غير مصرح", 403);
    }

    const updated = {
      ...target,
      name: name?.trim() || target.name,
      ...(password?.trim() ? { password: password.trim() } : {}),
      ...(!isSelf && auth.role === "superadmin" ? { companyIds: companyIds || target.companyIds } : {}),
      ...(!isSelf && (auth.role === "superadmin" || auth.role === "admin") ? { deptIds: deptIds || target.deptIds } : {}),
      updatedAt: new Date().toISOString(),
    };

    await saveUsers(users.map((u) => (u.id === id ? updated : u)));
    const { password: _, ...safeUser } = updated;
    return ok({ user: safeUser });
  }

  // ── DELETE: حذف مستخدم ──
  if (event.httpMethod === "DELETE") {
    const id = event.queryStringParameters?.id;
    if (!id) return err("id المستخدم مطلوب");

    const target = users.find((u) => u.id === id);
    if (!target) return err("المستخدم غير موجود", 404);

    if (!canManageUser(auth, target)) {
      return err("غير مصرح بحذف هذا المستخدم", 403);
    }

    await saveUsers(users.filter((u) => u.id !== id));
    return ok({ deleted: true, id });
  }

  return err("Method not allowed", 405);
};
