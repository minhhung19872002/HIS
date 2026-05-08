/**
 * Danh mục Lâm sàng (NangCap22 II) — 2 catalogs
 *  - Chế độ chăm sóc (cấp 1-3)
 *  - Loại bệnh án (TT 32/2023)
 */
import React from 'react';
import { Tabs, Typography } from 'antd';
import { CrudTab } from './_CrudTab';
import * as api from '../api/masterCatalog';

const { Title } = Typography;

const NursingCareLevelTab = () => (
  <CrudTab<api.NursingCareLevelDto>
    title="Chế độ chăm sóc"
    load={() => api.getNursingCareLevels()}
    save={api.saveNursingCareLevel}
    remove={api.deleteNursingCareLevel}
    searchable={false}
    defaults={{ sortOrder: 0, isActive: true, level: 1 }}
    fields={[
      { key: 'code', label: 'Mã', required: true, width: 100 },
      { key: 'name', label: 'Tên chế độ', required: true },
      { key: 'level', label: 'Cấp', type: 'number', required: true, width: 80 },
      { key: 'description', label: 'Mô tả', type: 'textarea' },
      { key: 'note', label: 'Ghi chú', type: 'textarea' },
      { key: 'sortOrder', label: 'Thứ tự', type: 'number', width: 90 },
      { key: 'isActive', label: 'Hoạt động', type: 'switch', width: 100 },
    ]}
  />
);

const MedicalRecordTypeTab = () => (
  <CrudTab<api.MedicalRecordTypeDto>
    title="Loại bệnh án"
    load={() => api.getMedicalRecordTypes()}
    save={api.saveMedicalRecordType}
    remove={api.deleteMedicalRecordType}
    searchable={false}
    defaults={{ sortOrder: 0, isActive: true, isLocked: false, category: 1 }}
    fields={[
      { key: 'code', label: 'Mã', required: true, width: 110 },
      { key: 'name', label: 'Tên loại BA', required: true },
      {
        key: 'category',
        label: 'Phân loại',
        type: 'select',
        required: true,
        width: 130,
        options: [
          { label: 'Ngoại trú', value: 1 },
          { label: 'Nội trú', value: 2 },
          { label: 'Cấp cứu', value: 3 },
          { label: 'Khám SK', value: 4 },
          { label: 'Khác', value: 5 },
        ],
        render: (v) => {
          const map: Record<number, string> = { 1: 'Ngoại trú', 2: 'Nội trú', 3: 'Cấp cứu', 4: 'Khám SK', 5: 'Khác' };
          return map[v as number] || '-';
        },
      },
      { key: 'note', label: 'Ghi chú', type: 'textarea' },
      { key: 'sortOrder', label: 'Thứ tự', type: 'number', width: 90 },
      { key: 'isLocked', label: 'Khóa', type: 'switch', width: 80 },
      { key: 'isActive', label: 'Hoạt động', type: 'switch', width: 100 },
    ]}
  />
);

const ClinicalCatalogs: React.FC = () => (
  <div style={{ padding: 16 }}>
    <Title level={3} style={{ marginBottom: 16 }}>Danh mục Lâm sàng</Title>
    <Tabs
      type="card"
      defaultActiveKey="nursing"
      items={[
        { key: 'nursing', label: 'Chế độ chăm sóc', children: <NursingCareLevelTab /> },
        { key: 'mr-type', label: 'Loại bệnh án', children: <MedicalRecordTypeTab /> },
      ]}
    />
  </div>
);

export default ClinicalCatalogs;
