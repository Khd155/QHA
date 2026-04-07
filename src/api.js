// src/api.js
// ══════════════════════════════════════════════════════
// مكتبة الاتصال بـ Netlify Functions من الـ Frontend
// ══════════════════════════════════════════════════════

const BASE = "/api";

// ── Token Management ──────────────────────────────────
export const Auth = {
  setToken(token) {
    localStorage.setItem("mn_token", token);
  },
  getToken() {
    return localStorage.getItem("mn_token");
  },
  setUser(user) {
    localStorage.setItem("mn_user", JSON.stringify(user));
  },
  getUser() {
    try {
      return JSON.parse(localStorage.getItem("mn_user"));
    } catch {
      return null;
    }
  },
  clear() {
    localStorage.removeItem("mn_token");
    localStorage.removeItem("mn_user");
  },
  isLoggedIn() {
    return !!this.getToken();
  },
};

// ── Base Fetch ────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = Auth.getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = { error: "Invalid response from server" };
  }

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data;
}

// ── Auth API ──────────────────────────────────────────
export const authAPI = {
  /**
   * تسجيل الدخول
   * @param {string} username
   * @param {string} password
   * @returns {{ token, user }}
   */
  async login(username, password) {
    const data = await apiFetch("/auth", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    Auth.setToken(data.token);
    Auth.setUser(data.user);
    return data;
  },

  logout() {
    Auth.clear();
  },
};

// ── Minutes API ───────────────────────────────────────
export const minutesAPI = {
  /**
   * جلب المحاضر مع فلترة
   * @param {{ companyId?, deptId?, search?, limit?, offset? }} params
   */
  async getAll(params = {}) {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
    );
    return apiFetch(`/getMeetings?${q}`);
  },

  /**
   * إنشاء محضر جديد
   * @param {object} minute
   */
  async create(minute) {
    return apiFetch("/createMeeting", {
      method: "POST",
      body: JSON.stringify(minute),
    });
  },

  /**
   * تعديل محضر
   * @param {object} minute - يجب أن يحتوي على id
   */
  async update(minute) {
    return apiFetch("/createMeeting", {
      method: "PUT",
      body: JSON.stringify(minute),
    });
  },

  /**
   * حذف محضر
   * @param {string} id
   */
  async delete(id) {
    return apiFetch(`/deleteMeeting?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};

// ── Users API ─────────────────────────────────────────
export const usersAPI = {
  /** جلب المستخدمين */
  async getAll() {
    return apiFetch("/getUsers");
  },

  /**
   * إضافة مستخدم
   * @param {object} user
   */
  async create(user) {
    return apiFetch("/getUsers", {
      method: "POST",
      body: JSON.stringify(user),
    });
  },

  /**
   * تعديل مستخدم
   * @param {object} user - يجب أن يحتوي على id
   */
  async update(user) {
    return apiFetch("/getUsers", {
      method: "PUT",
      body: JSON.stringify(user),
    });
  },

  /**
   * حذف مستخدم
   * @param {string} id
   */
  async delete(id) {
    return apiFetch(`/getUsers?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};

// ── Departments API ───────────────────────────────────
export const deptsAPI = {
  /**
   * جلب الإدارات
   * @param {{ companyId? }} params
   */
  async getAll(params = {}) {
    const q = params.companyId ? `?companyId=${params.companyId}` : "";
    return apiFetch(`/getDepartments${q}`);
  },

  async create(dept) {
    return apiFetch("/getDepartments", {
      method: "POST",
      body: JSON.stringify(dept),
    });
  },

  async update(dept) {
    return apiFetch("/getDepartments", {
      method: "PUT",
      body: JSON.stringify(dept),
    });
  },

  async delete(id) {
    return apiFetch(`/getDepartments?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};

// ── Files API ─────────────────────────────────────────
export const filesAPI = {
  /**
   * رفع ملف (مرفق / شاهد)
   * @param {File} file - كائن File من input
   * @param {{ companyId?, minuteId? }} meta
   * @returns {{ url, key, fileName, mimeType, sizeMB }}
   */
  async upload(file, meta = {}) {
    // تحويل الملف إلى base64
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        // إزالة "data:mime/type;base64," prefix
        const result = e.target.result;
        const b64 = result.split(",")[1];
        resolve(b64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    return apiFetch("/uploadFile", {
      method: "POST",
      body: JSON.stringify({
        fileName: file.name,
        fileData: base64,
        mimeType: file.type,
        companyId: meta.companyId || "",
        minuteId: meta.minuteId || "",
      }),
    });
  },

  /**
   * الحصول على رابط الملف (مع auth header)
   * يُستخدم لعرض الصورة أو PDF داخل المتصفح
   */
  getUrl(key) {
    return `/api/getFile?key=${encodeURIComponent(key)}`;
  },
};

// ── Settings API ──────────────────────────────────────
export const settingsAPI = {
  async get() {
    return apiFetch("/settings");
  },

  /**
   * رفع شعار شركة
   * @param {string} companyId
   * @param {File} file
   */
  async uploadCompanyLogo(companyId, file) {
    const base64 = await fileToBase64(file);
    return apiFetch("/settings", {
      method: "POST",
      body: JSON.stringify({
        type: "companyLogo",
        companyId,
        imageData: base64,
        mimeType: file.type,
      }),
    });
  },

  /**
   * رفع شعار صفحة الدخول
   * @param {File} file
   */
  async uploadLoginLogo(file) {
    const base64 = await fileToBase64(file);
    return apiFetch("/settings", {
      method: "POST",
      body: JSON.stringify({
        type: "loginLogo",
        imageData: base64,
        mimeType: file.type,
      }),
    });
  },
};

// ── Helpers ───────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * استخدام مع React — hook بسيط لجلب البيانات
 *
 * مثال:
 *   const { data, loading, error, refetch } = useAPI(() => minutesAPI.getAll({ companyId: "quraish" }));
 */
export function useAPI(fetchFn, deps = []) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, deps);

  return { data, loading, error, refetch: fetch };
}

// إعادة export لـ useState و useEffect (تُستخدم في useAPI)
import { useState, useEffect } from "react";
