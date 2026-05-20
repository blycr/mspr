import { pinyin } from 'pinyin-pro';

const REGEX_PREFIX = '/';
const REGEX_SUFFIX = '/';
const REGEX_MATCH_INDEX = 1;
const REGEX_FLAGS_INDEX = 2;
const DEFAULT_REGEX_FLAGS = 'i';

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
      return new RegExp(m[REGEX_MATCH_INDEX], m[REGEX_FLAGS_INDEX]).test(name);
    }
    return new RegExp(query, DEFAULT_REGEX_FLAGS).test(name);
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

  if (fuzzyMatch(name.toLowerCase(), lowerQuery)) return true;
  if (pinyinMatch(name, lowerQuery)) return true;
  if (regexMatch(name, query)) return true;

  return false;
}
