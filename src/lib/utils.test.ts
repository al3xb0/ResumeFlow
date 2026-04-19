import { describe, it, expect } from "vitest";
import { cn, uint8ToBase64, base64ToUint8, ensureHttp } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    const hidden = false;
    expect(cn("base", hidden && "hidden", "extra")).toBe("base extra");
  });

  it("resolves tailwind conflicts", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("returns empty string for no input", () => {
    expect(cn()).toBe("");
  });
});

describe("uint8ToBase64", () => {
  it("encodes empty array", () => {
    expect(uint8ToBase64(new Uint8Array([]))).toBe("");
  });

  it("encodes bytes to base64", () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    expect(uint8ToBase64(bytes)).toBe(btoa("Hello"));
  });

  it("round-trips with base64ToUint8", () => {
    const original = new Uint8Array([0, 1, 127, 128, 255]);
    const encoded = uint8ToBase64(original);
    const decoded = base64ToUint8(encoded);
    expect(decoded).toEqual(original);
  });
});

describe("base64ToUint8", () => {
  it("decodes base64 to bytes", () => {
    const b64 = btoa("Hello");
    const bytes = base64ToUint8(b64);
    expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111]);
  });

  it("handles empty string", () => {
    expect(base64ToUint8(btoa(""))).toEqual(new Uint8Array([]));
  });
});

describe("ensureHttp", () => {
  it("adds https:// when no protocol", () => {
    expect(ensureHttp("example.com")).toBe("https://example.com");
  });

  it("preserves existing http://", () => {
    expect(ensureHttp("http://example.com")).toBe("http://example.com");
  });

  it("preserves existing https://", () => {
    expect(ensureHttp("https://example.com")).toBe("https://example.com");
  });

  it("is case-insensitive for protocol check", () => {
    expect(ensureHttp("HTTP://example.com")).toBe("HTTP://example.com");
    expect(ensureHttp("HTTPS://example.com")).toBe("HTTPS://example.com");
  });
});
