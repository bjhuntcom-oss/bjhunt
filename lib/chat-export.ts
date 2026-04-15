import type { ChatMessage } from "@/components/chat/message-bubble";

export function exportToMarkdown(title: string, messages: ChatMessage[]): string {
  const lines: string[] = [`# ${title}\n`, `*Exporté le ${new Date().toLocaleDateString("fr-FR")}*\n`];
  for (const msg of messages) {
    const role = msg.role === "user" ? "**Vous**" : "**BJHUNT AI**";
    lines.push(`\n---\n\n${role}\n\n${msg.content}`);
    if (msg.sources?.length) {
      lines.push("\n\n*Sources :*");
      msg.sources.forEach((s, i) => lines.push(`\n${i + 1}. [${s.title}](${s.url})`));
    }
  }
  return lines.join("\n");
}

export function exportToJSON(title: string, messages: ChatMessage[]): string {
  return JSON.stringify({ title, exportedAt: new Date().toISOString(), messages }, null, 2);
}

export function downloadString(content: string, filename: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
