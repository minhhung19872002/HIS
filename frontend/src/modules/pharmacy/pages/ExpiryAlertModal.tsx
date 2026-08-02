import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Table, Tag, Button } from 'antd';
import * as pharmacyApi from '../api/pharmacy';
import type { LoginExpiryAlert } from '../api/pharmacy';
import TermIcon from '../../../components/layout/terminal/Icon';

// ── Expiry Alert Modal (GAP-DoiThu Đ3.15 / issue #28) ────────────────────────
// Hiện khi vào module Dược (Nhà thuốc / Kho dược BV), 1 lần / phiên
// (sessionStorage key dùng chung giữa các trang Dược để tránh spam).
const EXPIRY_SEEN_KEY = 'pharmacy_expiry_seen_v1';

const ExpiryAlertModal: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<LoginExpiryAlert[]>([]);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  useEffect(() => {
    // Chỉ gọi 1 lần / session
    if (sessionStorage.getItem(EXPIRY_SEEN_KEY)) return;
    pharmacyApi.getExpiryAlertsOnLogin()
      .then((r) => {
        const data = (r.data as pharmacyApi.LoginExpiryResponse | null);
        const list = data?.alerts ?? [];
        if (list.length > 0) { setAlerts(list); setOpen(true); }
        sessionStorage.setItem(EXPIRY_SEEN_KEY, '1');
      })
      .catch(() => { /* silent — không làm gián đoạn trang chính */ });
  }, []);

  const handleAcknowledge = async (id: string) => {
    setAcknowledging(id);
    try {
      await pharmacyApi.acknowledgeExpiryAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } finally {
      setAcknowledging(null);
    }
  };

  const handleAcknowledgeAll = async () => {
    await Promise.all(alerts.map((a) => pharmacyApi.acknowledgeExpiryAlert(a.id).catch(() => null)));
    setAlerts([]);
    setOpen(false);
  };

  const columns = [
    {
      title: 'Mức cảnh báo',
      dataIndex: 'alertLevel',
      width: 160,
      render: (v: number, r: LoginExpiryAlert) => (
        <Tag color={v === 1 ? 'red' : 'orange'}>{r.alertLevelName}</Tag>
      ),
    },
    { title: 'Tên thuốc', dataIndex: 'medicineName' },
    { title: 'Kho', dataIndex: 'warehouseName', width: 140 },
    { title: 'Lô', dataIndex: 'batchNumber', width: 100 },
    {
      title: 'Hạn dùng',
      dataIndex: 'expiryDate',
      width: 110,
      render: (v: string) => <span style={{ color: dayjs(v).isBefore(dayjs().add(1, 'month')) ? '#cf1322' : '#d46b08' }}>{dayjs(v).format('DD/MM/YYYY')}</span>,
    },
    { title: 'Số lượng', dataIndex: 'quantity', width: 90 },
    {
      title: '',
      width: 80,
      render: (_: unknown, r: LoginExpiryAlert) => (
        <Button
          size="small"
          loading={acknowledging === r.id}
          onClick={() => handleAcknowledge(r.id)}
        >
          Đã biết
        </Button>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      title={
        <span style={{ color: '#cf1322' }}>
          <TermIcon name="alert" size={14} /> Cảnh báo thuốc sắp hết hạn ({alerts.length} mặt hàng)
        </span>
      }
      width={820}
      destroyOnHidden
      footer={[
        <Button key="close" onClick={() => setOpen(false)}>Đóng</Button>,
        <Button key="all" type="primary" danger onClick={handleAcknowledgeAll}>
          Xác nhận tất cả
        </Button>,
      ]}
      onCancel={() => setOpen(false)}
    >
      <p style={{ marginBottom: 'var(--space-12)', color: '#595959' }}>
        Các mặt hàng dưới đây sắp hoặc đã hết hạn. Vui lòng xử lý xuất/hủy hoặc trả NCC.
      </p>
      <Table
        dataSource={alerts}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        scroll={{ y: 340 }}
      />
    </Modal>
  );
};

export default ExpiryAlertModal;
