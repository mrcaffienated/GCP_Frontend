import CryptoJS from "crypto-js";

// AES-256 key for localStorage encryption.
// Protects stored data from plain-text snooping in browser DevTools / disk reads.
const APP_SECRET = "gupthas-register-aes256-v1-2024";

export const encryptedStorage = {
  getItem(name) {
    const raw = localStorage.getItem(name);
    if (!raw) return null;
    try {
      const bytes = CryptoJS.AES.decrypt(raw, APP_SECRET);
      const text = bytes.toString(CryptoJS.enc.Utf8);
      return text || null;
    } catch {
      // Pre-encryption data or corrupted entry — return null so store resets cleanly.
      return null;
    }
  },

  setItem(name, value) {
    const encrypted = CryptoJS.AES.encrypt(value, APP_SECRET).toString();
    localStorage.setItem(name, encrypted);
  },

  removeItem(name) {
    localStorage.removeItem(name);
  },
};

// ── Backup file encryption ────────────────────────────────────────────────────

export function encryptBackup(jsonString, password) {
  return CryptoJS.AES.encrypt(jsonString, password).toString();
}

export function decryptBackup(cipherText, password) {
  const bytes = CryptoJS.AES.decrypt(cipherText, password);
  const text = bytes.toString(CryptoJS.enc.Utf8);
  if (!text) throw new Error("Wrong password or corrupted file");
  return text;
}

export function isEncryptedBackup(raw) {
  // Encrypted CryptoJS output is base64 and starts with "U2Fs"
  return typeof raw === "string" && raw.startsWith("U2Fs");
}
