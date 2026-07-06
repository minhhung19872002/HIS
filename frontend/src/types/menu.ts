// Navigation menu shapes — the HIS shell rail groups + items.
// Extracted from services/menu.service.ts (which now re-exports from here);
// TerminalLayout + menu.service consume these.

export type NavItem = { id: string; path: string; label: string; hot?: number };
export type NavGroup = {
  id: string;
  label: string;
  short: string;      // 3-5 char code shown in rail
  icon: string;       // TermIcon name
  hot?: number;
  items: NavItem[];
};
