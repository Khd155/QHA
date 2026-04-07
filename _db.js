# نظام المحاضر — قريش وأذان 📋

## التشغيل السريع

```bash
# 1. تثبيت الحزم
npm install

# 2. تشغيل المشروع محلياً
npm run dev
# أو
netlify dev
```

ثم افتح المتصفح على: **http://localhost:3000**

---

## بيانات الدخول الافتراضية

| المستخدم | كلمة المرور | الدور |
|----------|------------|-------|
| `superadmin` | `123456` | مدير عام |
| `admin_q` | `123456` | مدير قريش |
| `admin_a` | `123456` | مدير أذان |

---

## هيكل المشروع

```
minutes-system/
├── src/
│   ├── app.jsx          ← التطبيق الرئيسي (React)
│   ├── main.jsx         ← نقطة الدخول
│   └── api.js           ← مكتبة API للـ Frontend
├── netlify/
│   └── functions/
│       ├── _db.js           ← قاعدة البيانات (Netlify Blobs)
│       ├── auth.js          ← POST /api/auth
│       ├── getMeetings.js   ← GET  /api/getMeetings
│       ├── createMeeting.js ← POST/PUT /api/createMeeting
│       ├── deleteMeeting.js ← DELETE /api/deleteMeeting
│       ├── uploadFile.js    ← POST /api/uploadFile
│       ├── getFile.js       ← GET  /api/getFile
│       ├── getUsers.js      ← CRUD /api/getUsers
│       ├── getDepartments.js← CRUD /api/getDepartments
│       └── settings.js      ← GET/POST /api/settings
├── public/
│   └── favicon.svg
├── index.html
├── vite.config.js
├── netlify.toml
└── package.json
```

---

## النشر على Netlify

```bash
# 1. سجّل دخول في Netlify CLI
netlify login

# 2. ربط المشروع بـ Netlify
netlify init

# 3. نشر للإنتاج
netlify deploy --prod
```

---

## المميزات

- ✅ نظام محاضر متكامل (إنشاء / تعديل / حذف / PDF)
- ✅ هوية بصرية لكل شركة (قريش: خزامي / أذان: تيلي)
- ✅ أرشيف الشركة مع تصدير ZIP
- ✅ رفع المرفقات إلى Netlify Blobs
- ✅ Backend API (Netlify Functions)
- ✅ Sidebar قابل للإخفاء (جوال + كمبيوتر)
- ✅ تنزيل PDF مباشر على iPhone و Android
- ✅ صلاحيات متعددة المستويات
- ✅ يعمل بدون إنترنت (Local Mode)
