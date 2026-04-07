const express = require('express');
const path = require('path');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

// ربط الدوال (Functions) بمسارات Express
const auth = require('./netlify/functions/auth').handler;
const getMeetings = require('./netlify/functions/getMeetings').handler;

// محاكاة لبيئة نيتليفاي
const runFunction = async (fn, req, res) => {
    const event = {
        body: JSON.stringify(req.body),
        httpMethod: req.method,
        queryStringParameters: req.query
    };
    const result = await fn(event);
    res.status(result.statusCode).set(result.headers).send(result.body);
};

app.all('/.netlify/functions/auth', (req, res) => runFunction(auth, req, res));
app.all('/.netlify/functions/getMeetings', (req, res) => runFunction(getMeetings, req, res));

// تشغيل ملفات React (الواجهة)
app.use(express.static(path.join(__dirname, 'dist')));
app.get('(.*)', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));