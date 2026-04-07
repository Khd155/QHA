const express = require('express');
const path = require('path');
const app = express();
const cors = require('cors');

// إعدادات لرفع الملفات الكبيرة (مثل الشواهد والمرفقات)
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 1. ربط الدوال (Functions) بمسارات Express
// تأكد أن هذه الملفات موجودة فعلياً في مجلد netlify/functions
const auth = require('./netlify/functions/auth').handler;
const getMeetings = require('./netlify/functions/getMeetings').handler;

// 2. محاكاة لبيئة نيتليفاي (لجعل كودك القديم يعمل بدون تعديل)
const runFunction = async (fn, req, res) => {
    try {
        const event = {
            body: JSON.stringify(req.body),
            httpMethod: req.method,
            queryStringParameters: req.query
        };
        const result = await fn(event);
        res.status(result.statusCode || 200)
           .set(result.headers || {})
           .send(result.body);
    } catch (error) {
        console.error("Function Error:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
};

// مسارات الدوال
app.all('/.netlify/functions/auth', (req, res) => runFunction(auth, req, res));
app.all('/.netlify/functions/getMeetings', (req, res) => runFunction(getMeetings, req, res));

// 3. تشغيل ملفات React (الواجهة الأمامية)
// نخدم ملفات الـ Static أولاً
app.use(express.static(path.join(__dirname, 'dist')));

// 4. الإصلاح النهائي للمسارات (لحل مشكلة Crashed في Railway)
// نستخدم تعبير نمطي (Regex) بدلاً من النجمة المباشرة ليتوافق مع pathToRegexp
app.get(/^(?!\/api|\/\.netlify).+/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// في حالة لم يطابق أي مسار أعلاه (مثل طلب الصفحة الرئيسية مباشرة)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server is active on port ${PORT}`);
    console.log(`🚀 Site: http://localhost:${PORT}`);
});