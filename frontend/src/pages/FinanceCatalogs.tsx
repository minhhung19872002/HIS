/**
 * Danh mục Tài chính (NangCap22 II) — 4 catalogs
 *  - Phụ thu (PT-TT)
 *  - Thu khác (ngoài BHYT)
 *  - Vận chuyển bệnh nhân
 *  - Giá xăng (auto-update vận chuyển)
 */
import React from 'react';
import { Tabs, Typography } from 'antd';
import { CrudTab } from './_CrudTab';
import * as api from '../api/masterCatalog';

const { Title } = Typography;

const AdditionalChargeTab = () => (
  <CrudTab<api.AdditionalChargeDto>
    title="Phụ thu"
    load={api.getAdditionalCharges}
    save={api.saveAdditionalCharge}
    remove={api.deleteAdditionalCharge}
    defaults={{ sortOrder: 0, isActive: true, price: 0 }}
    fields={[
      { key: 'code', label: 'Mã', required: true, width: 120 },
      { key: 'name', label: 'Tên phụ thu', required: true },
      { key: 'price', label: 'Đơn giá (VND)', type: 'number', required: true, width: 130 },
      { key: 'unit', label: 'Đơn vị', width: 100 },
      { key: 'effectiveFrom', label: 'Áp dụng từ', type: 'date', width: 130 },
      { key: 'effectiveTo', label: 'Đến', type: 'date', width: 130 },
      { key: 'note', label: 'Ghi chú', type: 'textarea' },
      { key: 'sortOrder', label: 'Thứ tự', type: 'number', width: 90 },
      { key: 'isActive', label: 'Hoạt động', type: 'switch', width: 100 },
    ]}
  />
);

const OtherIncomeTab = () => (
  <CrudTab<api.OtherIncomeDto>
    title="Thu khác"
    load={api.getOtherIncomes}
    save={api.saveOtherIncome}
    remove={api.deleteOtherIncome}
    defaults={{ sortOrder: 0, isActive: true, price: 0 }}
    fields={[
      { key: 'code', label: 'Mã', required: true, width: 120 },
      { key: 'name', label: 'Tên khoản thu', required: true },
      { key: 'price', label: 'Đơn giá (VND)', type: 'number', required: true, width: 130 },
      { key: 'unit', label: 'Đơn vị', width: 100 },
      { key: 'effectiveFrom', label: 'Áp dụng từ', type: 'date', width: 130 },
      { key: 'effectiveTo', label: 'Đến', type: 'date', width: 130 },
      { key: 'note', label: 'Ghi chú', type: 'textarea' },
      { key: 'sortOrder', label: 'Thứ tự', type: 'number', width: 90 },
      { key: 'isActive', label: 'Hoạt động', type: 'switch', width: 100 },
    ]}
  />
);

const TransportServiceTab = () => (
  <CrudTab<api.TransportServiceDto>
    title="Dịch vụ vận chuyển"
    load={api.getTransportServices}
    save={api.saveTransportService}
    remove={api.deleteTransportService}
    defaults={{ sortOrder: 0, isActive: true, calculationType: 1, unitPrice: 0 }}
    fields={[
      { key: 'code', label: 'Mã', required: true, width: 120 },
      { key: 'name', label: 'Tên dịch vụ', required: true },
      {
        key: 'calculationType',
        label: 'Cách tính',
        type: 'select',
        required: true,
        width: 130,
        options: [{ label: 'Theo km', value: 1 }, { label: 'Theo lượt', value: 2 }],
        render: (v) => (v === 2 ? 'Theo lượt' : 'Theo km'),
      },
      { key: 'unitPrice', label: 'Đơn giá', type: 'number', required: true, width: 130 },
      { key: 'gasolineFactor', label: 'Hệ số xăng', type: 'number', width: 110 },
      { key: 'note', label: 'Ghi chú', type: 'textarea' },
      { key: 'sortOrder', label: 'Thứ tự', type: 'number', width: 90 },
      { key: 'isActive', label: 'Hoạt động', type: 'switch', width: 100 },
    ]}
  />
);

const GasolinePriceTab = () => (
  <CrudTab<api.GasolinePriceDto>
    title="Giá xăng dầu"
    load={() => api.getGasolinePrices()}
    save={api.saveGasolinePrice}
    remove={api.deleteGasolinePrice}
    searchable={false}
    defaults={{ pricePerLitre: 0, effectiveFrom: new Date().toISOString() }}
    fields={[
      {
        key: 'fuelType',
        label: 'Loại nhiên liệu',
        required: true,
        type: 'select',
        width: 180,
        options: [
          { label: 'RON 95-III', value: 'RON 95-III' },
          { label: 'E5 RON 92-II', value: 'E5 RON 92-II' },
          { label: 'Diesel 0.05S-II', value: 'Diesel 0.05S-II' },
          { label: 'Dầu hỏa', value: 'Dầu hỏa' },
        ],
      },
      { key: 'pricePerLitre', label: 'Giá/lít (VND)', type: 'number', required: true, width: 140 },
      { key: 'effectiveFrom', label: 'Hiệu lực từ', type: 'date', required: true, width: 140 },
      { key: 'issuedBy', label: 'Đơn vị ban hành' },
      { key: 'note', label: 'Ghi chú', type: 'textarea' },
    ]}
  />
);

const FinanceCatalogs: React.FC = () => (
  <div style={{ padding: 16 }}>
    <Title level={3} style={{ marginBottom: 16 }}>Danh mục Tài chính</Title>
    <Tabs
      type="card"
      defaultActiveKey="additional-charge"
      items={[
        { key: 'additional-charge', label: 'Phụ thu', children: <AdditionalChargeTab /> },
        { key: 'other-income', label: 'Thu khác', children: <OtherIncomeTab /> },
        { key: 'transport', label: 'Vận chuyển', children: <TransportServiceTab /> },
        { key: 'gasoline', label: 'Giá xăng', children: <GasolinePriceTab /> },
      ]}
    />
  </div>
);

export default FinanceCatalogs;
