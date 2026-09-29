import axios from "axios";
import { useAuthStore } from "../store/authStore";

const BACKEND_URL = "https://gcp-backend-exdy.onrender.com";

const api = axios.create({ baseURL: `${BACKEND_URL}/api` });

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login:             (username, password) => api.post("/auth/login", { username, password }),
  changePassword:    (current_password, new_password) => api.post("/auth/change-password", { current_password, new_password }),
  requestPwdChange:  ()           => api.post("/auth/request-password-change"),
  cancelPwdRequest:  ()           => api.delete("/auth/password-request"),
  setNewPassword:    (new_password) => api.post("/auth/set-new-password", { new_password }),
};

// ── Employees ─────────────────────────────────────────────────────────────────
export const employeesApi = {
  list:            ()        => api.get("/users/employees"),
  create:          (data)    => api.post("/users/employees", data),
  deactivate:      (id)      => api.patch(`/users/employees/${id}/deactivate`),
  approvePassword: (id)      => api.patch(`/users/employees/${id}/approve-password`),
  denyPassword:    (id)      => api.patch(`/users/employees/${id}/deny-password`),
};

// ── Pawns ─────────────────────────────────────────────────────────────────────
export const pawnsApi = {
  list:             (params)       => api.get("/pawns/", { params }),
  get:              (id)           => api.get(`/pawns/${id}`),
  nextSerial:       ()             => api.get("/pawns/next-serial"),
  create:           (data)         => api.post("/pawns/", data),
  update:           (id, data)     => api.patch(`/pawns/${id}`, data),
  release:          (id, date, actualAmount) => api.patch(`/pawns/${id}/release`, { released_date: date, ...(actualAmount != null ? { actual_release_amount: parseFloat(actualAmount) } : {}) }),
  markActive:       (id)           => api.patch(`/pawns/${id}/mark-active`),
  cancel:           (id)           => api.patch(`/pawns/${id}/cancel`),
  markSold:         (id, date)     => api.patch(`/pawns/${id}/sold`, { sold_date: date }),
  renew:            (id, data)     => api.post(`/pawns/${id}/renew`, data),
  linkRenewal:      (id, data)     => api.post(`/pawns/${id}/link-renewal`, data),
  addAdditionalAmt:    (id, data)  => api.post(`/pawns/${id}/additional-amounts`, data),
  deleteAdditionalAmt: (itemId)    => api.delete(`/pawns/additional-amounts/${itemId}`),
  addPrepayment:       (id, data)  => api.post(`/pawns/${id}/prepayments`, data),
  deletePrepayment:    (itemId)    => api.delete(`/pawns/prepayments/${itemId}`),
  addInterestPmt:   (id, data)     => api.post(`/pawns/${id}/interest-payments`, data),
  exportExcel:      ()             => api.get("/pawns/export/excel", { responseType: "blob" }),
};

// ── Old-gold Purchases (no-objection forms) ───────────────────────────────────
export const purchasesApi = {
  list:       (params)     => api.get("/purchases/", { params }),
  nextSerial: ()           => api.get("/purchases/next-serial"),
  create:     (data)       => api.post("/purchases/", data),
  update:     (id, data)   => api.patch(`/purchases/${id}`, data),
  delete:     (id)         => api.delete(`/purchases/${id}`),
};

// ── Chatbot ───────────────────────────────────────────────────────────────────
export const chatApi = {
  // Non-streaming (backward compat)
  ask: (message, history) => api.post("/chat/", { message, history }, { timeout: 120000 }),

  // Streaming via SSE — calls onChunk(text), onDone(), onError(msg) as events arrive
  askStream: async (message, history, { onChunk, onDone, onError }) => {
    const token = useAuthStore.getState().token;
    const response = await fetch(`${BACKEND_URL}/api/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, history }),
    });

    if (!response.ok) {
      let detail = "Chat request failed.";
      try {
        const body = await response.json();
        detail = body.detail || detail;
      } catch {}
      onError(detail);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === "text") onChunk(data.content);
          else if (data.type === "thinking") onChunk(`\u0000THINKING:${data.content}`);
          else if (data.type === "reset") onChunk("\u0000RESET");
          else if (data.type === "done") onDone();
          else if (data.type === "error") onError(data.content);
        } catch {}
      }
    }

    // Process any remaining buffer
    if (buffer.startsWith("data: ")) {
      try {
        const data = JSON.parse(buffer.slice(6));
        if (data.type === "done") onDone();
        else if (data.type === "error") onError(data.content);
      } catch {}
    }
  },
};

// ── Boss Notes ────────────────────────────────────────────────────────────────
export const notesApi = {
  list:   ()         => api.get("/notes/"),
  create: (data)     => api.post("/notes/", data),
  update: (id, data) => api.patch(`/notes/${id}`, data),
  delete: (id)       => api.delete(`/notes/${id}`),
};

export default api;
