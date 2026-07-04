import dayjs from 'dayjs';
import type { AdmissionDto } from '../../api/reception';

/* ==========================================================================
   Shared types + formatting helpers for the Dashboard sub-components.
   Extracted from Dashboard.tsx (#205 FE-2 god-component split) — pure move,
   behavior-preserving.
   ========================================================================== */

export type Kpi = {
  k: string;
  v: string;
  delta: string;
  spark: number[];
  negSpark?: boolean;
};

export function fmtDelta(n: number | undefined | null, suffix = ''): string {
  if (n === undefined || n === null || !Number.isFinite(n)) return '—';
  if (n === 0) return '±0' + suffix;
  return (n > 0 ? '+' + n : String(n)) + suffix;
}

export function fmtTime(iso: string | undefined): string {
  if (!iso) return '—';
  return dayjs(iso).format('HH:mm');
}

export function fmtRelShort(iso: string | undefined): string {
  if (!iso) return '—';
  const d = dayjs(iso);
  const now = dayjs();
  if (now.isSame(d, 'day')) return d.format('HH:mm');
  if (now.subtract(1, 'day').isSame(d, 'day')) return 'Hôm qua';
  return d.format('DD/MM');
}

export function essFromPriority(a: AdmissionDto): 'ESI-1' | 'ESI-2' | 'ESI-3' | 'ESI-4' | 'ESI-5' {
  if (a.isEmergency && a.priority >= 3) return 'ESI-1';
  if (a.isEmergency) return 'ESI-2';
  if (a.priority >= 2) return 'ESI-3';
  if (a.priority >= 1) return 'ESI-4';
  return 'ESI-5';
}
