// =====================================================================
// CommandContext — hệ thống phím lệnh toàn cục cho shell v2 (TerminalLayout)
// ---------------------------------------------------------------------
// Shell lắng nghe phím (F1/F2/F3/F4/F8/F5/Esc + Ctrl+K/S/F/P) và phân phối
// tới handler do TRANG hiện tại đăng ký qua useRegisterCommands(). Nếu trang
// không đăng ký, shell dùng fallback hợp lý (DOM generic / điều hướng / toast)
// nên phím luôn phản hồi ở mọi trang.
//
// Trang dùng:  useRegisterCommands({ save: handleSave, new: openCreate, ... });
// Status bar dùng: useCommandCtx().has(id) để biết phím nào đang khả dụng.
// =====================================================================
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type CmdId = 'help' | 'commandPalette' | 'save' | 'new' | 'search' | 'print' | 'refresh' | 'cancel';

export interface CommandDef {
  id: CmdId;
  label: string;     // nhãn tiếng Việt hiển thị
  keyHint: string;   // phím hiển thị, vd 'F2'
  pageOwned: boolean; // true = thường do trang cung cấp handler (mới dim khi thiếu)
}

// Thứ tự hiển thị trên status bar.
export const COMMANDS: CommandDef[] = [
  { id: 'help',           label: 'Trợ giúp', keyHint: 'F1',  pageOwned: false },
  { id: 'commandPalette', label: 'Lệnh',     keyHint: '⌘K',  pageOwned: false },
  { id: 'new',            label: 'Thêm mới', keyHint: 'F3',  pageOwned: false }, // fallback: click .ab-btn.primary
  { id: 'save',           label: 'Lưu',      keyHint: 'F2',  pageOwned: true  }, // no generic fallback
  { id: 'search',         label: 'Tìm',      keyHint: 'F4',  pageOwned: false }, // fallback: focus .ab-search, then CmdK
  { id: 'print',          label: 'In',       keyHint: 'F8',  pageOwned: true  }, // no generic fallback
  { id: 'refresh',        label: 'Làm mới',  keyHint: 'F5',  pageOwned: false }, // fallback: window.location.reload()
  { id: 'cancel',         label: 'Hủy',      keyHint: 'Esc', pageOwned: false }, // fallback: close flyout/cmdk
];

export type CommandHandlers = Partial<Record<CmdId, () => void>>;

interface CommandCtxValue {
  register: (h: CommandHandlers) => () => void;
  invoke: (id: CmdId) => boolean; // true nếu có handler trang xử lý
  has: (id: CmdId) => boolean;
}

const CommandCtx = createContext<CommandCtxValue | null>(null);

export const CommandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [version, setVersion] = useState(0);          // chỉ để StatusBar re-render khi handler đổi
  const handlersRef = useRef<CommandHandlers>({});

  const register = useCallback((h: CommandHandlers) => {
    handlersRef.current = { ...handlersRef.current, ...h };
    setVersion((v) => v + 1);
    return () => {
      const next = { ...handlersRef.current };
      (Object.keys(h) as CmdId[]).forEach((k) => { if (next[k] === h[k]) delete next[k]; });
      handlersRef.current = next;
      setVersion((v) => v + 1);
    };
  }, []);

  const invoke = useCallback((id: CmdId) => {
    const fn = handlersRef.current[id];
    if (fn) { fn(); return true; }
    return false;
  }, []);

  const has = useCallback((id: CmdId) => !!handlersRef.current[id], []);

  // version đưa vào value để has() phản ánh đúng sau mỗi lần register/unregister.
  const value = useMemo<CommandCtxValue>(() => ({ register, invoke, has }), [register, invoke, has, version]);

  return <CommandCtx.Provider value={value}>{children}</CommandCtx.Provider>;
};

export function useCommandCtx(): CommandCtxValue {
  const c = useContext(CommandCtx);
  if (!c) throw new Error('useCommandCtx phải dùng bên trong <CommandProvider>');
  return c;
}

/**
 * Trang đăng ký các lệnh nó hỗ trợ. Wrapper được đăng ký một lần khi mount,
 * luôn gọi tới handler MỚI NHẤT (qua ref) nên không bị churn khi trang re-render.
 *
 *   useRegisterCommands({ save: handleSave, new: openCreate, refresh: load });
 */
export function useRegisterCommands(map: CommandHandlers): void {
  const { register } = useCommandCtx();
  const mapRef = useRef<CommandHandlers>(map);
  mapRef.current = map;
  // Khoá danh sách phím tại thời điểm mount (các trang dùng tập phím tĩnh).
  const keysRef = useRef<CmdId[]>(Object.keys(map) as CmdId[]);

  useEffect(() => {
    const wrapped: CommandHandlers = {};
    keysRef.current.forEach((k) => { wrapped[k] = () => mapRef.current[k]?.(); });
    return register(wrapped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
