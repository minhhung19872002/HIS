import { useEffect, useState } from 'react';
import { Alert, Button, Modal, Space, Table, Tag } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import {
  getExpiringMedicines,
  type ExpiringMedicineDto,
} from '../api/pharmacyApproval';

interface Props {
  /** If true, show as a Modal once per session (first visit to Pharmacy module). */
  asModalOnFirstVisit?: boolean;
  /** sessionStorage key to mark "already shown". Must be unique per page if multiple pages use modal. */
  sessionKey?: string;
  /** Number of days ahead to check. Default 60. */
  daysAhead?: number;
}

export function PharmacyExpiryBanner({
  asModalOnFirstVisit = false,
  sessionKey = 'pharmacy-expiry-shown',
  daysAhead = 60,
}: Props) {
  const [items, setItems] = useState<ExpiringMedicineDto[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    getExpiringMedicines(daysAhead)
      .then((data) => {
        setItems(data);
        if (asModalOnFirstVisit && data.length > 0) {
          const shown = sessionStorage.getItem(sessionKey);
          if (!shown) {
            setModalOpen(true);
            sessionStorage.setItem(sessionKey, '1');
          }
        }
      })
      .catch(() => {});
  }, [daysAhead, asModalOnFirstVisit, sessionKey]);

  const expired = items.filter((i) => i.severity === 'expired');
  const critical = items.filter((i) => i.severity === 'critical');
  const warning = items.filter((i) => i.severity === 'warning');
  const criticalCount = expired.length + critical.length;

  if (items.length === 0) return null;

  const columns = [
    { title: 'Thuốc / VTYT', dataIndex: 'medicineName', key: 'medicineName' },
    { title: 'Lô', dataIndex: 'batchNumber', key: 'batchNumber', width: 100 },
    { title: 'HSD', dataIndex: 'expiryDate', key: 'expiryDate', width: 110,
      render: (v: string) => v ? new Date(v).toLocaleDateString('vi-VN') : '-' },
    { title: 'Tồn', dataIndex: 'quantity', key: 'quantity', width: 80, align: 'right' as const },
    { title: 'Kho', dataIndex: 'warehouseName', key: 'warehouseName', width: 140 },
    { title: 'Còn (ngày)', dataIndex: 'daysUntilExpiry', key: 'daysUntilExpiry', width: 100, align: 'center' as const,
      render: (d: number | undefined, row: ExpiringMedicineDto) => {
        const color = row.severity === 'expired' ? 'red' : row.severity === 'critical' ? 'volcano' : 'gold';
        const val = d ?? 0;
        return <Tag color={color}>{val < 0 ? `Hết ${Math.abs(val)}d` : `${val}d`}</Tag>;
      } },
  ];

  return (
    <>
      {criticalCount > 0 && (
        <Alert
          title={`Cảnh báo: ${criticalCount} mặt hàng sắp hoặc đã hết hạn`}
          description={
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                {expired.length > 0 && <Tag color="red">{expired.length} đã hết hạn</Tag>}
                {critical.length > 0 && <Tag color="volcano">{critical.length} ≤7 ngày</Tag>}
                {warning.length > 0 && <Tag color="gold">{warning.length} ≤30 ngày</Tag>}
              </div>
              <Button size="small" onClick={() => setDetailOpen(true)}>Xem chi tiết</Button>
            </Space>
          }
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginBottom: 16 }}
          closable
        />
      )}

      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#fa541c' }} />
            Thuốc / VTYT sắp hết hạn
          </Space>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => setModalOpen(false)}
        okText="Đã xem"
        cancelText="Đóng"
        width={900}
      >
        <Alert
          type="warning"
          showIcon
          title={`Tổng ${items.length} mặt hàng, trong đó ${expired.length} đã hết hạn, ${critical.length} sắp hết ≤7 ngày`}
          style={{ marginBottom: 12 }}
        />
        <Table
          rowKey="inventoryItemId"
          size="small"
          dataSource={items.slice(0, 50)}
          columns={columns}
          pagination={false}
          scroll={{ y: 400 }}
        />
      </Modal>

      <Modal
        title="Chi tiết mặt hàng sắp hết hạn"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={900}
      >
        <Table
          rowKey="inventoryItemId"
          size="small"
          dataSource={items}
          columns={columns}
          pagination={{ pageSize: 20 }}
          scroll={{ y: 400 }}
        />
      </Modal>
    </>
  );
}
