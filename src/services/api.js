import axios from "axios";
import { useAuthStore } from "../store/authStore";
import * as mock from "./mockApi";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

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
const realAuthApi = {
  login:             (username, password) => api.post("/auth/login", { username, password }),
  changePassword:    (current_password, new_password) => api.post("/auth/change-password", { current_password, new_password }),
  requestPwdChange:  ()           => api.post("/auth/request-password-change"),
  cancelPwdRequest:  ()           => api.delete("/auth/password-request"),
  setNewPassword:    (new_password) => api.post("/auth/set-new-password", { new_password }),
};

// ── Employees ─────────────────────────────────────────────────────────────────
const realEmployeesApi = {
  list:            ()        => api.get("/users/employees"),
  create:          (data)    => api.post("/users/employees", data),
  deactivate:      (id)      => api.patch(`/users/employees/${id}/deactivate`),
  approvePassword: (id)      => api.patch(`/users/employees/${id}/approve-password`),
  denyPassword:    (id)      => api.patch(`/users/employees/${id}/deny-password`),
};

// ── Pawns ─────────────────────────────────────────────────────────────────────
const realPawnsApi = {
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

// ── Boss Notes ────────────────────────────────────────────────────────────────
const realNotesApi = {
  list:   ()         => api.get("/notes/"),
  create: (data)     => api.post("/notes/", data),
  update: (id, data) => api.patch(`/notes/${id}`, data),
  delete: (id)       => api.delete(`/notes/${id}`),
};

// VITE_USE_MOCK=true (see .env.local) swaps every export below for the
// in-memory mock implementation in mockApi.js — no backend needed at all.
export const authApi = USE_MOCK ? mock.authApi : realAuthApi;
export const employeesApi = USE_MOCK ? mock.employeesApi : realEmployeesApi;
export const pawnsApi = USE_MOCK ? mock.pawnsApi : realPawnsApi;
export const notesApi = USE_MOCK ? mock.notesApi : realNotesApi;

export default api;
