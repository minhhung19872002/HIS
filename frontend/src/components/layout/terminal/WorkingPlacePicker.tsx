/**
 * NangCap26 — I.4 "Thiết lập khoa/phòng làm việc".
 *
 * Nút trên topbar cho phép người dùng chọn khoa/phòng đang trực sau khi đăng nhập.
 * Giá trị lưu per-user qua UserSettings (hook `useWorkingDepartment`) để các màn
 * nghiệp vụ dùng làm mặc định thay vì bắt chọn lại từng màn.
 *
 * Fail-open: lỗi tải danh mục hoặc lỗi lưu server KHÔNG chặn người dùng làm việc.
 */
import React, { useEffect, useState } from 'react';
import { Popover, Select } from 'antd';
import { useWorkingDepartment } from '../../../hooks/useWorkingDepartment';
import { catalogApi } from '../../../modules/system/api/system';
import type { DepartmentCatalogDto, RoomCatalogDto } from '../../../modules/system/api/system';
import TermIcon from './Icon';

const WorkingPlacePicker: React.FC = () => {
  const { place, setWorkingPlace, loading } = useWorkingDepartment();
  const [open, setOpen] = useState(false);
  const [depts, setDepts] = useState<DepartmentCatalogDto[]>([]);
  const [rooms, setRooms] = useState<RoomCatalogDto[]>([]);

  // Chỉ tải danh mục khi người dùng thực sự mở picker — tránh gọi API mỗi lần vào trang.
  useEffect(() => {
    if (!open || depts.length > 0) return;
    catalogApi.getDepartments(undefined, undefined, true)
      .then((r) => setDepts(r.data || []))
      .catch((e) => { console.warn('[async] tải danh mục khoa thất bại:', e); });
  }, [open, depts.length]);

  useEffect(() => {
    if (!open || !place.departmentId) { setRooms([]); return; }
    catalogApi.getRooms(place.departmentId, undefined, true)
      .then((r) => setRooms(r.data || []))
      .catch((e) => { console.warn('[async] tải danh mục phòng thất bại:', e); });
  }, [open, place.departmentId]);

  const label = place.roomName || place.departmentName || 'Chọn khoa/phòng';

  const content = (
    <div style={{ width: 280, display: 'grid', gap: 10 }}>
      <div style={{ fontSize: 12, color: 'var(--t-2)' }}>
        Khoa/phòng đang trực — dùng làm mặc định cho các màn nghiệp vụ.
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t-2)', marginBottom: 4 }}>Khoa</div>
        <Select
          showSearch allowClear optionFilterProp="label" style={{ width: '100%' }}
          placeholder="Chọn khoa" value={place.departmentId} loading={loading}
          options={depts.map((d) => ({ value: d.id as string, label: `${d.code} — ${d.name}` }))}
          onChange={(v) => void setWorkingPlace({
            departmentId: v,
            departmentName: depts.find((d) => d.id === v)?.name,
            roomId: undefined, roomName: undefined,
          })}
        />
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t-2)', marginBottom: 4 }}>Phòng</div>
        <Select
          showSearch allowClear optionFilterProp="label" style={{ width: '100%' }}
          placeholder={place.departmentId ? 'Chọn phòng' : 'Chọn khoa trước'}
          disabled={!place.departmentId}
          value={place.roomId}
          options={rooms.map((r) => ({ value: r.id as string, label: `${r.code} — ${r.name}` }))}
          onChange={(v) => void setWorkingPlace({
            ...place,
            roomId: v,
            roomName: rooms.find((r) => r.id === v)?.name,
          })}
        />
      </div>
      {(place.departmentId || place.roomId) && (
        <button
          type="button"
          style={{ background: 'none', border: 'none', color: 'var(--s-crit)', fontSize: 12, cursor: 'pointer', padding: 0, textAlign: 'left' }}
          onClick={() => void setWorkingPlace({})}
        >
          Bỏ chọn khoa/phòng
        </button>
      )}
    </div>
  );

  return (
    <Popover content={content} trigger="click" placement="bottomRight" open={open} onOpenChange={setOpen}
      styles={{ content: { padding: 12 } }}>
      <button type="button" className="his-tb-btn" title={`Khoa/phòng làm việc: ${label}`} aria-label="Chọn khoa/phòng làm việc">
        <TermIcon name="grid" size={15} />
      </button>
    </Popover>
  );
};

export default WorkingPlacePicker;
