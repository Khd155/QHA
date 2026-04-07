// netlify/functions/_db.js
// ══════════════════════════════════════════════════════
// مساعدات قاعدة البيانات — Netlify Blobs كـ persistent storage
// ══════════════════════════════════════════════════════

const { getStore } = require("@netlify/blobs");

const STORE_NAME = "minutes-db";

// الحصول على store
function getDB() {
  return getStore(STORE_NAME);
}

// جلب قيمة من DB
async function dbGet(key) {
  try {
    const store = getDB();
    const raw = await store.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`dbGet error [${key}]:`, e.message);
    return null;
  }
}

// حفظ قيمة في DB
async function dbSet(key, value) {
  try {
    const store = getDB();
    await store.set(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`dbSet error [${key}]:`, e.message);
    return false;
  }
}

// جلب كل المحاضر
async function getMinutes() {
  return (await dbGet("minutes")) || [];
}

// حفظ كل المحاضر
async function saveMinutes(minutes) {
  return dbSet("minutes", minutes);
}

// جلب المستخدمين
async function getUsers() {
  const users = await dbGet("users");
  if (users) return users;
  // المستخدمون الافتراضيون
  return [
    { id: "u0", username: "superadmin", password: "123456", role: "superadmin", name: "المدير العام",    companyIds: [],           deptIds: [], createdBy: null },
    { id: "u1", username: "admin_q",    password: "123456", role: "admin",      name: "مدير قريش",     companyIds: ["quraish"],   deptIds: [], createdBy: null },
    { id: "u2", username: "admin_a",    password: "123456", role: "admin",      name: "مدير أذان",      companyIds: ["adhan"],     deptIds: [], createdBy: null },
  ];
}

// حفظ المستخدمين
async function saveUsers(users) {
  return dbSet("users", users);
}

// جلب الإدارات
async function getDepartments() {
  const depts = await dbGet("departments");
  if (depts) return depts;
  // الإدارات الافتراضية
  const COMPANIES = ["quraish", "adhan"];
  const DEPT_LIST = [
    { id: "d01", name: "مخيم منى" },
    { id: "d02", name: "الشؤون الإدارية والمالية" },
    { id: "d03", name: "التسجيل" },
    { id: "d04", name: "اللجنة الثقافية" },
    { id: "d05", name: "التقنية ومتابعة التقييم" },
    { id: "d06", name: "اللجنة الإعلامية" },
    { id: "d07", name: "تجهيز موقع منى" },
    { id: "d08", name: "عرفة" },
    { id: "d09", name: "مزدلفة" },
    { id: "d10", name: "المستودعات وتجهيزات منى وعرفة ومزدلفة" },
    { id: "d11", name: "الإشراف على المشرفين المرافقين" },
    { id: "d12", name: "لجنة الجودة" },
    { id: "d13", name: "الحركة والنقل" },
    { id: "d14", name: "المرشدين والمفوجين" },
    { id: "d15", name: "المشرفين المساندين الطائف" },
    { id: "d16", name: "الإشراف على التغذية" },
    { id: "d17", name: "البرامج الثقافية والدعوية النسائية" },
    { id: "d18", name: "فريق السعادة" },
    { id: "d19", name: "الإبداع والريادة" },
    { id: "d20", name: "مبادرة حج بلا حقيبة" },
    { id: "d21", name: "التدريب" },
  ];
  return DEPT_LIST.flatMap(d =>
    COMPANIES.map(cId => ({
      id: `${cId}-${d.id}`,
      name: d.name,
      companyId: cId,
      baseDeptId: d.id,
    }))
  );
}

// حفظ الإدارات
async function saveDepartments(departments) {
  return dbSet("departments", departments);
}

// جلب العدادات (للأرقام التسلسلية)
async function getCounters() {
  return (await dbGet("counters")) || {};
}

// توليد رقم تسلسلي
async function generateSerial(companyId) {
  const counters = await getCounters();
  const key = `${companyId}-min`;
  const n = (counters[key] || 0) + 1;
  const year = (() => {
    try {
      const y = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { year: "numeric" })
        .format(new Date());
      return y.replace(/[^0-9]/g, "");
    } catch {
      return "1447";
    }
  })();
  const serial = `${year}/${String(n).padStart(4, "0")}`;
  counters[key] = n;
  await dbSet("counters", counters);
  return serial;
}

// جلب الإعدادات (شعارات)
async function getSettings() {
  return (await dbGet("settings")) || { logos: {}, loginLogo: null };
}

// حفظ الإعدادات
async function saveSettings(settings) {
  return dbSet("settings", settings);
}

// CORS headers
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Content-Type": "application/json",
};

// رد JSON موحّد
function ok(data, status = 200) {
  return { statusCode: status, headers: CORS, body: JSON.stringify(data) };
}

function err(message, status = 400) {
  return { statusCode: status, headers: CORS, body: JSON.stringify({ error: message }) };
}

// التحقق من الـ token البسيط (user id مشفّر)
function parseAuth(event) {
  const auth = event.headers?.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  try {
    const decoded = Buffer.from(auth.slice(7), "base64").toString();
    return JSON.parse(decoded); // { id, role, companyIds }
  } catch {
    return null;
  }
}

module.exports = {
  dbGet, dbSet,
  getMinutes, saveMinutes,
  getUsers, saveUsers,
  getDepartments, saveDepartments,
  generateSerial,
  getSettings, saveSettings,
  CORS, ok, err, parseAuth,
};
