/**
 * Global F2 abbreviation expander — Sprint 3 Item 2.2
 * Install once at App root. Listens for F2 key globally, inspects the focused
 * textarea/input, extracts the word before caret, and replaces with expansion.
 *
 * Lookup: merge các scope có sẵn trong cache (user-load theo nhu cầu).
 * Increment usage async — fire & forget.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  searchAbbreviations,
  incrementAbbreviationUsage,
  type AbbreviationDto,
} from '../api/abbreviation';

const cache = new Map<string, AbbreviationDto[]>();

async function loadDict(scope: number | undefined): Promise<AbbreviationDto[]> {
  const key = `${scope ?? 'any'}`;
  if (cache.has(key)) return cache.get(key)!;
  try {
    const list = await searchAbbreviations(scope);
    cache.set(key, list);
    return list;
  } catch {
    return [];
  }
}

/**
 * Install global F2 handler. Loads all-scope dict on mount.
 * @param initialScopes các scope cần preload (ưu tiên lookup trước)
 */
export function useGlobalAbbreviationExpander(initialScopes: number[] = [0, 1, 2, 3, 4, 5]) {
  const [dict, setDict] = useState<AbbreviationDto[]>([]);

  useEffect(() => {
    Promise.all(initialScopes.map(loadDict))
      .then((arrs) => {
        const merged = new Map<string, AbbreviationDto>();
        for (const arr of arrs) for (const a of arr) {
          // user-scope (scope 0) is fallback if no more specific match
          if (!merged.has(a.code) || merged.get(a.code)!.scope === 0) merged.set(a.code, a);
        }
        setDict(Array.from(merged.values()));
      })
      .catch(() => {});
  }, []);

  const handler = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'F2') return;
    const el = document.activeElement;
    if (!(el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement)) return;
    if (el.type && ['password', 'checkbox', 'radio', 'button', 'submit', 'file'].includes(el.type)) return;
    const value = el.value ?? '';
    const caret = el.selectionStart ?? value.length;
    const before = value.substring(0, caret);
    const tokenMatch = before.match(/(\S+)$/);
    if (!tokenMatch) return;
    const token = tokenMatch[1].toLowerCase();
    const abbr = dict.find(d => d.code === token);
    if (!abbr) return;

    e.preventDefault();
    const start = caret - tokenMatch[1].length;
    const newValue = value.substring(0, start) + abbr.expansion + value.substring(caret);

    const Proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(Proto, 'value')?.set;
    setter?.call(el, newValue);
    el.dispatchEvent(new Event('input', { bubbles: true }));

    const newCaret = start + abbr.expansion.length;
    setTimeout(() => el.setSelectionRange(newCaret, newCaret), 0);

    incrementAbbreviationUsage(abbr.id).catch(() => {});
  }, [dict]);

  useEffect(() => {
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handler]);
}

/** Invalidate cache after user CRUD a new abbreviation. */
export function invalidateAbbreviationCache() {
  cache.clear();
}
