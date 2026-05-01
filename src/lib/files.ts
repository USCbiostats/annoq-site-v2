export function parseRsidList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

export function parseVcfIds(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => line.split(/\t|\s+/))
    .filter((parts) => parts.length >= 5)
    .map(([chr, pos, , ref, alt]) => `${chr.replace(/^chr/i, '')}:${pos}${ref}>${alt}`);
}

export function parseConfig(text: string): string[] {
  const parsed = JSON.parse(text) as { _source?: unknown };
  if (!Array.isArray(parsed._source) || !parsed._source.every((item) => typeof item === 'string')) {
    throw new Error('Config file must contain a string array named _source');
  }
  return parsed._source;
}

export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
