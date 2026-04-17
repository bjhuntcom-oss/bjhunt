import { describe, it, expect } from "bun:test";
import { splitSSEBlocks } from "../parseSSE";

describe("splitSSEBlocks", () => {
  it("splits LF-terminated frames", () => {
    const input = "event: a\ndata: {\"k\":1}\n\nevent: b\ndata: {\"k\":2}\n\n";
    const { blocks, remainder } = splitSSEBlocks(input);
    expect(blocks).toEqual(['event: a\ndata: {"k":1}', 'event: b\ndata: {"k":2}']);
    expect(remainder).toBe("");
  });

  it("splits CRLF-terminated frames (LangGraph / starlette)", () => {
    const input = "event: a\r\ndata: {\"k\":1}\r\n\r\nevent: b\r\ndata: {\"k\":2}\r\n\r\n";
    const { blocks, remainder } = splitSSEBlocks(input);
    expect(blocks).toEqual(['event: a\ndata: {"k":1}', 'event: b\ndata: {"k":2}']);
    expect(remainder).toBe("");
  });

  it("keeps an incomplete trailing frame in the remainder", () => {
    const input = "event: a\r\ndata: {\"k\":1}\r\n\r\nevent: b\r\ndata: {";
    const { blocks, remainder } = splitSSEBlocks(input);
    expect(blocks).toEqual(['event: a\ndata: {"k":1}']);
    expect(remainder).toBe('event: b\ndata: {');
  });

  it("handles mixed CRLF and LF in the same buffer", () => {
    const input = "event: a\r\ndata: 1\r\n\r\nevent: b\ndata: 2\n\n";
    const { blocks } = splitSSEBlocks(input);
    expect(blocks).toEqual(["event: a\ndata: 1", "event: b\ndata: 2"]);
  });
});
