/* useOpdOrderTemplates — mẫu bộ chỉ định CLS/vật tư dùng nhanh (#433).
 * Lưu localStorage (parity v1 OPD supply templates, key opd_supply_templates)
 * — dữ liệu tiện dụng cá nhân, KHÔNG phải hồ sơ bệnh án nên không đẩy server.
 */

import { useState, useCallback } from 'react';
import { storage, STORAGE_KEYS } from '../../../services/storage.service';
import type { OrderRow } from '../pages/_shared';

export interface OrderTemplate { name: string; items: OrderRow[] }

const read = (): OrderTemplate[] => storage.get<OrderTemplate[]>(STORAGE_KEYS.opdSupplyTemplates) ?? [];

export function useOpdOrderTemplates(
  orders: OrderRow[],
  setOrd: React.Dispatch<React.SetStateAction<OrderRow[]>>,
) {
  const [orderTpls, setOrderTpls] = useState<OrderTemplate[]>(read);

  const persist = (next: OrderTemplate[]) => {
    setOrderTpls(next);
    storage.set(STORAGE_KEYS.opdSupplyTemplates, next);
  };

  /** Lưu bộ chỉ định hiện tại thành mẫu; trùng tên thì ghi đè. */
  const saveOrderTpl = useCallback((name: string): boolean => {
    const key = name.trim();
    if (!key || orders.length === 0) return false;
    const items = orders.map((o) => ({ ...o }));
    persist([...read().filter((t) => t.name !== key), { name: key, items }]);
    return true;
  }, [orders]);

  /** Áp mẫu — chỉ thêm dịch vụ CHƯA có trong danh sách (không nhân đôi). */
  const applyOrderTpl = useCallback((name: string) => {
    const tpl = read().find((t) => t.name === name);
    if (!tpl) return;
    setOrd((prev) => {
      const fresh = tpl.items.filter((i) => !prev.some((p) => p.serviceId === i.serviceId));
      return fresh.length === 0 ? prev : [...prev, ...fresh.map((i) => ({ ...i }))];
    });
  }, [setOrd]);

  const removeOrderTpl = useCallback((name: string) => {
    persist(read().filter((t) => t.name !== name));
  }, []);

  return { orderTpls, saveOrderTpl, applyOrderTpl, removeOrderTpl };
}
