// netlify/functions/auth.js
// POST /api/auth → تسجيل الدخول وإرجاع token
// ══════════════════════════════════════════

const { getUsers, CORS, ok, err } = require("./_db");

exports.handler = async (event) => {
  // Preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return err("Method not allowed", 405);
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return err("Invalid JSON");
  }

  const { username, password } = body;
  if (!username || !password) {
    return err("username و password مطلوبان");
  }

  const users = await getUsers();
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return err("بيانات الدخول غير صحيحة", 401);
  }

  // بناء token بسيط (base64 JSON) — للإنتاج استخدم JWT
  const payload = {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    companyIds: user.companyIds || [],
    deptIds: user.deptIds || [],
  };
  const token = Buffer.from(JSON.stringify(payload)).toString("base64");

  return ok({
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      companyIds: user.companyIds || [],
      deptIds: user.deptIds || [],
    },
  });
};
