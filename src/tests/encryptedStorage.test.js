import { describe, it, expect, beforeEach } from "vitest";
import { encryptedStorage, encryptBackup, decryptBackup, isEncryptedBackup } from "../services/encryptedStorage";

beforeEach(() => localStorage.clear());

describe("encryptedStorage", () => {
  it("stores and retrieves a value", () => {
    encryptedStorage.setItem("key", "hello");
    expect(encryptedStorage.getItem("key")).toBe("hello");
  });

  it("returns null for missing key", () => {
    expect(encryptedStorage.getItem("missing")).toBeNull();
  });

  it("removes a key", () => {
    encryptedStorage.setItem("key", "value");
    encryptedStorage.removeItem("key");
    expect(encryptedStorage.getItem("key")).toBeNull();
  });

  it("raw localStorage value is not plain text", () => {
    encryptedStorage.setItem("secret", '{"password":"admin123"}');
    const raw = localStorage.getItem("secret");
    expect(raw).not.toBe('{"password":"admin123"}');
  });
});

describe("backup encryption", () => {
  it("encryptBackup returns a string", () => {
    const result = encryptBackup('{"pawns":[]}', "testpass");
    expect(typeof result).toBe("string");
  });

  it("decryptBackup round-trips correctly", () => {
    const original = '{"pawns":[{"id":"1"}]}';
    const cipher = encryptBackup(original, "mypassword");
    expect(decryptBackup(cipher, "mypassword")).toBe(original);
  });

  it("decryptBackup throws on wrong password", () => {
    const cipher = encryptBackup("data", "correct");
    expect(() => decryptBackup(cipher, "wrong")).toThrow();
  });

  it("isEncryptedBackup detects encrypted files", () => {
    expect(isEncryptedBackup("U2FsdGVkX1abcdef")).toBe(true);
    expect(isEncryptedBackup('{"pawns":[]}')).toBe(false);
    expect(isEncryptedBackup(null)).toBe(false);
  });
});
