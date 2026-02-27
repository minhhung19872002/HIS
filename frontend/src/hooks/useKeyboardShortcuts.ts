import { useEffect, useCallback } from 'react';

export interface ShortcutConfig {
  key: string;          // e.g. 'F2', 'n', 's'
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  handler: () => void;
  description: string;  // e.g. 'Lưu bản ghi'
}

/**
 * Hook to register keyboard shortcuts.
 * Ignores shortcuts when user is typing in input/textarea/select.
 *
 * @param shortcuts Array of shortcut configs
 * @param enabled Whether shortcuts are active (default true)
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[], enabled = true) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in form fields
    const target = e.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    const isEditable = target.isContentEditable;
    const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';

    // For function keys (F1-F12), always trigger even in inputs
    const isFunctionKey = e.key.startsWith('F') && e.key.length <= 3 && !isNaN(Number(e.key.slice(1)));

    for (const shortcut of shortcuts) {
      const keyMatch = e.key === shortcut.key || e.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = !!shortcut.ctrl === (e.ctrlKey || e.metaKey);
      const altMatch = !!shortcut.alt === e.altKey;
      const shiftMatch = !!shortcut.shift === e.shiftKey;

      if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
        // Skip if in input (unless function key or Ctrl combo)
        if ((isInput || isEditable) && !isFunctionKey && !shortcut.ctrl) {
          continue;
        }
        e.preventDefault();
        shortcut.handler();
        return;
      }
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Format shortcut for display in tooltips
 */
export function formatShortcut(config: Omit<ShortcutConfig, 'handler' | 'description'>): string {
  const parts: string[] = [];
  if (config.ctrl) parts.push('Ctrl');
  if (config.alt) parts.push('Alt');
  if (config.shift) parts.push('Shift');
  parts.push(config.key.length === 1 ? config.key.toUpperCase() : config.key);
  return parts.join('+');
}
