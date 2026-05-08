/**
 * Danh mục Dược (NangCap22 II) — 3 catalogs
 *  - Hãng sản xuất
 *  - Đường dùng (kèm mã BHXH XML 4210)
 *  - Hội đồng kiểm nhập
 */
import React from 'react';
import { Tabs, Typography } from 'antd';
import { CrudTab, InspectionCommitteeTab } from './_CrudTab';
import * as api from '../api/masterCatalog';

const { Title } = Typography;

const ManufacturerTab = () => (
  <CrudTab<api.ManufacturerDto>
    title="Hãng sản xuất"
    load={api.getManufacturers}
    save={api.saveManufacturer}
    remove={api.deleteManufacturer}
    defaults={{ sortOrder: 0, isActive: true }}
    fields={[
      { key: 'code', label: 'Mã', required: true, width: 120 },
      { key: 'name', label: 'Tên hãng', required: true },
      { key: 'country', label: 'Quốc gia', width: 140 },
      { key: 'address', label: 'Địa chỉ', type: 'textarea' },
      { key: 'note', label: 'Ghi chú', type: 'textarea' },
      { key: 'sortOrder', label: 'Thứ tự', type: 'number', width: 90 },
      { key: 'isActive', label: 'Hoạt động', type: 'switch', width: 100 },
    ]}
  />
);

const MedicationRouteTab = () => (
  <CrudTab<api.MedicationRouteDto>
    title="Đường dùng thuốc"
    load={api.getMedicationRoutes}
    save={api.saveMedicationRoute}
    remove={api.deleteMedicationRoute}
    defaults={{ sortOrder: 0, isActive: true }}
    fields={[
      { key: 'code', label: 'Mã', required: true, width: 100 },
      { key: 'name', label: 'Tên đường dùng', required: true },
      { key: 'bhxhCode', label: 'Mã BHXH (XML 4210)', width: 150 },
      { key: 'note', label: 'Ghi chú', type: 'textarea' },
      { key: 'sortOrder', label: 'Thứ tự', type: 'number', width: 90 },
      { key: 'isActive', label: 'Hoạt động', type: 'switch', width: 100 },
    ]}
  />
);

const PharmacyCatalogs: React.FC = () => (
  <div style={{ padding: 16 }}>
    <Title level={3} style={{ marginBottom: 16 }}>Danh mục Dược</Title>
    <Tabs
      type="card"
      defaultActiveKey="manufacturer"
      items={[
        { key: 'manufacturer', label: 'Hãng sản xuất', children: <ManufacturerTab /> },
        { key: 'route', label: 'Đường dùng', children: <MedicationRouteTab /> },
        { key: 'inspection', label: 'Hội đồng kiểm nhập', children: <InspectionCommitteeTab /> },
      ]}
    />
  </div>
);

export default PharmacyCatalogs;
