/**
 * Danh mục Báo cáo (NangCap22 II) — 2 catalogs
 *  - Loại nhóm dịch vụ báo cáo (group type)
 *  - Nhóm dịch vụ báo cáo (group, FK to type)
 */
import React, { useEffect, useState } from 'react';
import { Tabs, Typography } from 'antd';
import { CrudTab } from './_CrudTab';
import * as api from '../api/masterCatalog';

const { Title } = Typography;

const ReportGroupTypeTab = () => (
  <CrudTab<api.ReportServiceGroupTypeDto>
    title="Loại nhóm dịch vụ báo cáo"
    load={() => api.getReportServiceGroupTypes()}
    save={api.saveReportServiceGroupType}
    remove={api.deleteReportServiceGroupType}
    searchable={false}
    defaults={{ sortOrder: 0, isActive: true }}
    fields={[
      { key: 'code', label: 'Mã', required: true, width: 130 },
      { key: 'name', label: 'Tên loại nhóm', required: true },
      { key: 'reportLabel', label: 'Nhãn báo cáo', width: 200 },
      { key: 'note', label: 'Ghi chú', type: 'textarea' },
      { key: 'sortOrder', label: 'Thứ tự', type: 'number', width: 90 },
      { key: 'isActive', label: 'Hoạt động', type: 'switch', width: 100 },
    ]}
  />
);

const ReportGroupTab = () => {
  const [types, setTypes] = useState<api.ReportServiceGroupTypeDto[]>([]);
  useEffect(() => { api.getReportServiceGroupTypes().then(setTypes).catch(() => {}); }, []);
  return (
    <CrudTab<api.ReportServiceGroupDto>
      title="Nhóm dịch vụ báo cáo"
      load={() => api.getReportServiceGroups()}
      save={api.saveReportServiceGroup}
      remove={api.deleteReportServiceGroup}
      searchable={false}
      defaults={{ sortOrder: 0, isActive: true }}
      fields={[
        {
          key: 'groupTypeId',
          label: 'Loại nhóm',
          type: 'select',
          required: true,
          width: 220,
          options: types.map((t) => ({ label: t.name, value: t.id })),
          render: (_v, r) => r.groupTypeName || '-',
        },
        { key: 'code', label: 'Mã', required: true, width: 130 },
        { key: 'name', label: 'Tên nhóm', required: true },
        { key: 'note', label: 'Ghi chú', type: 'textarea' },
        { key: 'sortOrder', label: 'Thứ tự', type: 'number', width: 90 },
        { key: 'isActive', label: 'Hoạt động', type: 'switch', width: 100 },
      ]}
    />
  );
};

const ReportCatalogs: React.FC = () => (
  <div style={{ padding: 16 }}>
    <Title level={3} style={{ marginBottom: 16 }}>Danh mục Báo cáo</Title>
    <Tabs
      type="card"
      defaultActiveKey="group-type"
      items={[
        { key: 'group-type', label: 'Loại nhóm BC', children: <ReportGroupTypeTab /> },
        { key: 'group', label: 'Nhóm BC', children: <ReportGroupTab /> },
      ]}
    />
  </div>
);

export default ReportCatalogs;
