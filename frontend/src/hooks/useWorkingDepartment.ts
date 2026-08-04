/**
 * NangCap26 — I.4 "Thiết lập khoa/phòng": sau đăng nhập người dùng chọn khoa/phòng
 * đang trực; các màn nghiệp vụ (khám, điều trị ngoại/nội trú, thu viện phí, thực hiện
 * CLS, kê thuốc) dùng giá trị này làm mặc định thay vì bắt chọn lại từng màn.
 *
 * Lưu qua UserSettings (key-value per-user đã có sẵn) + cache localStorage để
 * không chớp giá trị khi load trang.
 */
import { useCallback, useEffect, useState } from 'react';
import apiClient from '../services/apiClient';

const KEY_DEPARTMENT = 'working-department';
const KEY_ROOM = 'working-room';
const LS_PREFIX = 'his.working.';

export interface WorkingPlace {
  departmentId?: string;
  departmentName?: string;
  roomId?: string;
  roomName?: string;
}

function readCache(): WorkingPlace {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}place`);
    return raw ? (JSON.parse(raw) as WorkingPlace) : {};
  } catch {
    return {};
  }
}

function writeCache(place: WorkingPlace) {
  try {
    localStorage.setItem(`${LS_PREFIX}place`, JSON.stringify(place));
  } catch { /* localStorage đầy/tắt — không chặn nghiệp vụ */ }
}

/**
 * Khoa/phòng làm việc hiện tại + hàm cập nhật. Đọc cache trước, đồng bộ server sau
 * để tránh nhấp nháy; lỗi mạng chỉ làm mất đồng bộ, không chặn người dùng.
 */
export function useWorkingDepartment() {
  const [place, setPlace] = useState<WorkingPlace>(readCache);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [dep, room] = await Promise.all([
          apiClient.get<{ settingValue?: string }>(`/user-settings/${KEY_DEPARTMENT}`),
          apiClient.get<{ settingValue?: string }>(`/user-settings/${KEY_ROOM}`),
        ]);
        if (!alive) return;
        const parse = (v?: string): Partial<WorkingPlace> => {
          if (!v) return {};
          try { return JSON.parse(v) as Partial<WorkingPlace>; } catch { return {}; }
        };
        const next: WorkingPlace = { ...parse(dep.data?.settingValue), ...parse(room.data?.settingValue) };
        if (next.departmentId || next.roomId) {
          setPlace(next);
          writeCache(next);
        }
      } catch (e) {
        console.warn('[async] không tải được khoa/phòng làm việc:', e);
      }
    })();
    return () => { alive = false; };
  }, []);

  const save = useCallback(async (next: WorkingPlace) => {
    setPlace(next);
    writeCache(next);
    setLoading(true);
    try {
      await Promise.all([
        apiClient.put(`/user-settings/${KEY_DEPARTMENT}`, {
          settingValue: JSON.stringify({ departmentId: next.departmentId, departmentName: next.departmentName }),
        }),
        apiClient.put(`/user-settings/${KEY_ROOM}`, {
          settingValue: JSON.stringify({ roomId: next.roomId, roomName: next.roomName }),
        }),
      ]);
    } catch (e) {
      // Đã lưu cache cục bộ → người dùng vẫn làm việc được, chỉ mất đồng bộ giữa máy.
      console.warn('[async] không lưu được khoa/phòng làm việc lên server:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => { void save({}); }, [save]);

  return { place, setWorkingPlace: save, clearWorkingPlace: clear, loading };
}
