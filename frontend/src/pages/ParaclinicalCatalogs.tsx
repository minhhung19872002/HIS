/**
 * Danh mục Cận lâm sàng (NangCap22 II) — 3 catalogs
 *  - Mã máy CDHA / XN (gửi BHXH XML 4210)
 *  - Mapping mã máy ↔ dịch vụ
 *  - Cấu hình thứ tự ưu tiên phòng CLS
 */
import React, { useEffect, useState } from 'react';
import { Tabs, Typography } from 'antd';
import { CrudTab } from './_CrudTab';
import * as api from '../api/masterCatalog';

const { Title } = Typography;

const MachineCodeTab = () => (
  <CrudTab<api.MachineCodeDto>
    title="Mã máy CDHA / Xét nghiệm"
    load={api.getMachineCodes}
    save={api.saveMachineCode}
    remove={api.deleteMachineCode}
    defaults={{ isActive: true, isLocked: false }}
    fields={[
      { key: 'code', label: 'Mã máy', required: true, width: 120 },
      { key: 'name', label: 'Tên máy', required: true },
      { key: 'manufacturer', label: 'Hãng SX', width: 140 },
      { key: 'model', label: 'Model', width: 120 },
      { key: 'serialNumber', label: 'Serial', width: 120 },
      { key: 'bhxhCode', label: 'Mã BHXH', width: 110 },
      { key: 'note', label: 'Ghi chú', type: 'textarea' },
      { key: 'isLocked', label: 'Khóa', type: 'switch', width: 80 },
      { key: 'isActive', label: 'Hoạt động', type: 'switch', width: 100 },
    ]}
  />
);

const MachineServiceTab = () => {
  const [machines, setMachines] = useState<api.MachineCodeDto[]>([]);
  useEffect(() => { api.getMachineCodes().then(setMachines).catch(() => setMachines([])); }, []);

  return (
    <CrudTab<api.MachineServiceDto>
      title="Mapping mã máy ↔ dịch vụ"
      load={() => api.getMachineServices()}
      save={api.saveMachineService}
      remove={api.deleteMachineService}
      searchable={false}
      defaults={{ isDefault: false }}
      fields={[
        {
          key: 'machineCodeId',
          label: 'Mã máy',
          type: 'select',
          required: true,
          width: 200,
          options: machines.map((m) => ({ label: `${m.code} – ${m.name}`, value: m.id })),
          render: (_, r) => r.machineName || '-',
        },
        {
          key: 'serviceId',
          label: 'Mã dịch vụ',
          required: true,
          render: (_, r) => r.serviceName || '-',
          placeholder: 'GUID dịch vụ (lấy từ /catalog/paraclinical-services)',
        },
        { key: 'isDefault', label: 'Mặc định', type: 'switch', width: 100 },
        { key: 'note', label: 'Ghi chú', type: 'textarea' },
      ]}
    />
  );
};

const ParaclinicalRoomPriorityTab = () => (
  <CrudTab<api.ParaclinicalRoomPriorityDto>
    title="Cấu hình thứ tự ưu tiên phòng CLS"
    load={() => api.getParaclinicalRoomPriorities()}
    save={api.saveParaclinicalRoomPriority}
    remove={api.deleteParaclinicalRoomPriority}
    searchable={false}
    defaults={{ priorityLevel: 1, sequence: 0 }}
    fields={[
      {
        key: 'serviceId',
        label: 'Dịch vụ',
        required: true,
        render: (_, r) => r.serviceName || '-',
        placeholder: 'GUID dịch vụ',
      },
      {
        key: 'priorityLevel',
        label: 'Mức ưu tiên',
        type: 'select',
        required: true,
        width: 160,
        options: [
          { label: '1 - Phòng cấu hình', value: 1 },
          { label: '2 - Phòng của khoa', value: 2 },
          { label: '3 - STT thiết lập', value: 3 },
        ],
        render: (v) => {
          const map: Record<number, string> = { 1: 'Phòng cấu hình', 2: 'Phòng của khoa', 3: 'STT thiết lập' };
          return map[v as number] || '-';
        },
      },
      {
        key: 'roomId',
        label: 'Phòng (Room ID)',
        render: (_, r) => r.roomName || '-',
        placeholder: 'GUID phòng (cấp 1)',
      },
      {
        key: 'departmentId',
        label: 'Khoa (Dept ID)',
        render: (_, r) => r.departmentName || '-',
        placeholder: 'GUID khoa (cấp 2)',
      },
      { key: 'sequence', label: 'STT', type: 'number', width: 90 },
      { key: 'note', label: 'Ghi chú', type: 'textarea' },
    ]}
  />
);

const ParaclinicalCatalogs: React.FC = () => (
  <div style={{ padding: 16 }}>
    <Title level={3} style={{ marginBottom: 16 }}>Danh mục Cận lâm sàng</Title>
    <Tabs
      type="card"
      defaultActiveKey="machine"
      items={[
        { key: 'machine', label: 'Mã máy', children: <MachineCodeTab /> },
        { key: 'mapping', label: 'Mã máy ↔ Dịch vụ', children: <MachineServiceTab /> },
        { key: 'priority', label: 'Thứ tự phòng CLS', children: <ParaclinicalRoomPriorityTab /> },
      ]}
    />
  </div>
);

export default ParaclinicalCatalogs;
