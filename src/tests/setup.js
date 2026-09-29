import "@testing-library/jest-dom";
import { vi } from "vitest";

// Silence framer-motion animation warnings in tests
vi.mock("framer-motion", () => {
  const actual = vi.importActual("framer-motion");
  return {
    ...actual,
    motion: new Proxy(
      {},
      {
        get: (_, tag) => {
          const Component = ({ children, ...props }) => {
            const { initial, animate, exit, whileHover, whileTap, transition, ...rest } = props;
            const React = require("react");
            return React.createElement(tag, rest, children);
          };
          Component.displayName = `motion.${tag}`;
          return Component;
        },
      }
    ),
    AnimatePresence: ({ children }) => children,
  };
});

// Mock crypto-js so encryptedStorage works without actual encryption in tests
vi.mock("crypto-js", () => ({
  default: {
    AES: {
      encrypt: (val, key) => ({ toString: () => `enc:${key}:${val}` }),
      decrypt: (val, key) => ({
        toString: (enc) => {
          // Simulate wrong-key failure: key must match what was used to encrypt
          const match = val.match(/^enc:([^:]+):(.*)$/s);
          if (!match || match[1] !== key) {
            if (enc === "utf8") return ""; // simulates bad decrypt → empty string
            return "";
          }
          return match[2];
        },
      }),
    },
    enc: { Utf8: "utf8" },
  },
}));

// Stub localStorage
const store = {};
Object.defineProperty(window, "localStorage", {
  value: {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  },
  writable: true,
});

// Stub URL.createObjectURL
window.URL.createObjectURL = vi.fn(() => "blob:mock");
window.URL.revokeObjectURL = vi.fn();
