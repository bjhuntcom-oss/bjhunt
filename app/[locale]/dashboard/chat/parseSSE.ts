export function splitSSEBlocks(buffer: string): {
  blocks: string[];
  remainder: string;
} {
  const normalised = buffer.replace(/\r\n/g, "\n");
  const parts = normalised.split("\n\n");
  const remainder = parts.pop() ?? "";
  return { blocks: parts, remainder };
}
