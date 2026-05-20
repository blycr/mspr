import { pinyin } from 'pinyin-pro';

function fuzzyMatch(name: string, query: string): boolean {
  if (!query) return true;
  for (const char of query) {
    if (!name.includes(char)) return false;
  }
  return true;
}

function regexMatch(name: string, query: string): boolean {
  try {
    const m = query.match(/^\/(.+)\/([gimuy]*)$/);
    if (m) {
      return new RegExp(m[1], m[2]).test(name);
    }
    return new RegExp(query, 'i').test(name);
  } catch {
    return false;
  }
}

function pinyinMatch(name: string, query: string): boolean {
  const lowerName = name.toLowerCase();
  const lowerQuery = query.toLowerCase();
  if (fuzzyMatch(lowerName, lowerQuery)) return true;
  try {
    const py = pinyin(name, { toneType: 'none', type: 'string' }).toLowerCase();
    return fuzzyMatch(py, lowerQuery);
  } catch {
    return false;
  }
}

export function matchesQuery(name: string, query: string): boolean {
  if (!query) return true;
  const lowerQuery = query.toLowerCase();

  // Fuzzy match
  if (fuzzyMatch(name.toLowerCase(), lowerQuery)) return true;

  // Pinyin match
  if (pinyinMatch(name, lowerQuery)) return true;

  // Regex match (last, since it can throw)
  if (regexMatch(name, query)) return true;

  return false;
}
