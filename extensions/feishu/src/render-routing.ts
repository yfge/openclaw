// Feishu plugin helper for choosing card-capable text rendering.
export function shouldUseFeishuCardForText(text: string): boolean {
  return (
    /```[\s\S]*?```/.test(text) ||
    /\|.+\|[\r\n]+\|[-:| ]+\|/.test(text) ||
    /\r?\n\s*\r?\n/.test(text)
  );
}
