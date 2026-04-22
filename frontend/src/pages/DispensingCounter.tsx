/**
 * Quầy phát thuốc ngoại trú — theo MQ Solutions Dược.
 * Chọn ngày/giờ/quầy → BN chờ → tick "Phát" → In tem thuốc + Lưu.
 * Hủy phát: bỏ tick, BN về "Chưa phát".
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card, Row, Col, Select, DatePicker, Button, Table, Tag, Space,
  Input, Badge, message, Checkbox, Typography, Drawer, List, Divider,
} from 'antd';
import {
  SearchOutlined, PrinterOutlined, CheckCircleOutlined, UndoOutlined,
  ReloadOutlined, BarcodeOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import apiClient from '../api/client';

const { Title, Text } = Typography;

interface DispenseRow {
  prescriptionId: string;
  prescriptionCode: string;
  patientCode: string;
  patientName: string;
  patientAge?: number;
  gender?: number;
  prescribedAt: string;
  doctorName?: string;
  totalItems: number;
  totalAmount: number;
  insuranceType: string;
  isDispensed: boolean;
  items: {
    id: string;
    medicineName: string;
    quantity: number;
    unit?: string;
    dosage?: string;
    days?: number;
  }[];
}

const COUNTER_OPTIONS = [
  { value: 'quay1', label: 'Quầy 1 — Ngoại trú BHYT' },
  { value: 'quay2', label: 'Quầy 2 — Ngoại trú thu phí' },
  { value: 'quay3', label: 'Quầy 3 — Dịch vụ' },
  { value: 'quay4', label: 'Quầy 4 — YHCT' },
  { value: 'quay5', label: 'Quầy 5 — Cấp cứu' },
];

export default function DispensingCounter() {
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [counter, setCounter] = useState<string>('quay1');
  const [keyword, setKeyword] = useState('');
  const [tab, setTab] = useState<'pending' | 'dispensed'>('pending');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DispenseRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailDrawer, setDetailDrawer] = useState<DispenseRow | null>(null);
  const [printCount, setPrintCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<Array<Record<string, unknown>>>('/examination/prescriptions/recent', {
        params: {
          pageSize: 100,
          fromDate: date.startOf('day').toISOString(),
          toDate: date.endOf('day').toISOString(),
          keyword: keyword || undefined,
        },
      });
      const mapped: DispenseRow[] = (data || []).map((p) => ({
        prescriptionId: (p.id || p.prescriptionId) as string,
        prescriptionCode: (p.prescriptionCode || p.code || '') as string,
        patientCode: (p.patientCode || '') as string,
        patientName: (p.patientName || '') as string,
        gender: p.gender as number | undefined,
        prescribedAt: (p.prescribedAt || p.prescriptionDate || p.createdAt || new Date().toISOString()) as string,
        doctorName: (p.doctorName || p.prescribedBy) as string | undefined,
        totalItems: ((p.items as unknown[]) || []).length,
        totalAmount: (p.totalAmount || 0) as number,
        insuranceType: (p.insuranceType || p.diagnosis || 'Thu phí') as string,
        isDispensed: Boolean(p.isDispensed),
        items: ((p.items as unknown[]) || []) as DispenseRow['items'],
      }));
      setRows(mapped);
    } catch (e: unknown) {
      console.warn('Load dispense rows failed', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [date, keyword]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => rows.filter(r => tab === 'pending' ? !r.isDispensed : r.isDispensed),
    [rows, tab],
  );

  const handleDispenseSelected = async () => {
    if (selectedIds.length === 0) { message.warning('Chưa chọn đơn thuốc'); return; }
    try {
      for (const id of selectedIds) {
        await apiClient.post(`/warehousecomplete/issues/dispense-outpatient/${id}`);
      }
      message.success(`Đã phát ${selectedIds.length} đơn`);
      setSelectedIds([]);
      load();
      setPrintCount(c => c + selectedIds.length);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Phát thuốc thất bại');
    }
  };

  const handleCancelDispense = async (id: string) => {
    try {
      await apiClient.post(`/warehousecomplete/issues/${id}/cancel`);
      message.success('Đã hủy phát thuốc');
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Hủy thất bại');
    }
  };

  const handlePrintLabels = (row: DispenseRow) => {
    // Mở preview in tem thuốc A5 với barcode BN + mã thuốc
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Tem thuốc ${row.patientCode}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
  .label { border: 1px solid #000; padding: 8px 12px; margin-bottom: 8px; page-break-inside: avoid; width: 260px; }
  .label h3 { margin: 0 0 4px; font-size: 13px; }
  .label p { margin: 2px 0; font-size: 11px; }
  .barcode { font-family: 'Libre Barcode 128', monospace; font-size: 32px; text-align: center; letter-spacing: 2px; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 12px;">
    <button onclick="window.print()">In</button>
    <button onclick="window.close()">Đóng</button>
  </div>
  ${row.items.map(it => `
    <div class="label">
      <h3>${it.medicineName}</h3>
      <p><strong>BN:</strong> ${row.patientName} (${row.patientCode})</p>
      <p><strong>SL:</strong> ${it.quantity} ${it.unit || ''} × ${it.days || 1} ngày</p>
      <p><strong>Cách dùng:</strong> ${it.dosage || '-'}</p>
      <p class="barcode">*${row.prescriptionCode}*</p>
    </div>
  `).join('')}
</body>
</html>`;
    const win = window.open('', '_blank', 'width=400,height=600');
    win?.document.write(html);
    win?.document.close();
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <Title level={4} style={{ margin: 0 }}>Quầy phát thuốc ngoại trú</Title>
          </Col>
          <Col flex="auto">
            <Space wrap>
              <Text strong>Ngày phát:</Text>
              <DatePicker value={date} onChange={(v) => v && setDate(v)} format="DD/MM/YYYY" />
              <Text strong>Quầy:</Text>
              <Select value={counter} onChange={setCounter} options={COUNTER_OPTIONS} style={{ width: 280 }} />
              <Input
                placeholder="Tìm mã BN / tên BN / mã đơn"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onPressEnter={load}
                prefix={<SearchOutlined />}
                style={{ width: 240 }}
              />
              <Button icon={<ReloadOutlined />} onClick={load}>Làm mới</Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Card>
        <Space style={{ marginBottom: 12 }}>
          <Button.Group>
            <Button
              type={tab === 'pending' ? 'primary' : 'default'}
              onClick={() => setTab('pending')}
            >
              <Badge count={rows.filter(r => !r.isDispensed).length} offset={[10, 0]}>
                Chưa phát
              </Badge>
            </Button>
            <Button
              type={tab === 'dispensed' ? 'primary' : 'default'}
              onClick={() => setTab('dispensed')}
            >
              Đã phát ({rows.filter(r => r.isDispensed).length})
            </Button>
          </Button.Group>
          {tab === 'pending' && (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleDispenseSelected}
              disabled={selectedIds.length === 0}
            >
              Phát {selectedIds.length > 0 ? `(${selectedIds.length})` : ''} + In tem
            </Button>
          )}
          {printCount > 0 && (
            <Tag color="blue">Đã phát phiên này: {printCount} đơn</Tag>
          )}
        </Space>

        <Table<DispenseRow>
          rowKey="prescriptionId"
          dataSource={filtered}
          loading={loading}
          rowSelection={tab === 'pending' ? {
            selectedRowKeys: selectedIds,
            onChange: (keys) => setSelectedIds(keys as string[]),
          } : undefined}
          pagination={{ pageSize: 20 }}
          columns={[
            { title: 'Mã đơn', dataIndex: 'prescriptionCode', width: 160 },
            { title: 'Mã BN', dataIndex: 'patientCode', width: 110 },
            { title: 'Họ tên', dataIndex: 'patientName' },
            {
              title: 'Giới',
              dataIndex: 'gender',
              width: 60,
              render: (g: number) => g === 1 ? 'Nam' : g === 2 ? 'Nữ' : '-',
            },
            { title: 'Đối tượng', dataIndex: 'insuranceType', width: 110 },
            { title: 'BS kê', dataIndex: 'doctorName', width: 140 },
            { title: 'Số thuốc', dataIndex: 'totalItems', width: 80, align: 'right' },
            {
              title: 'Tổng tiền',
              dataIndex: 'totalAmount',
              width: 120,
              align: 'right',
              render: (v: number) => v.toLocaleString('vi-VN'),
            },
            {
              title: 'Thời gian',
              dataIndex: 'prescribedAt',
              width: 140,
              render: (v: string) => dayjs(v).format('HH:mm DD/MM'),
            },
            {
              title: 'Hành động',
              width: 220,
              render: (_, row) => (
                <Space size="small">
                  <Button size="small" onClick={() => setDetailDrawer(row)}>Xem</Button>
                  <Button
                    size="small"
                    icon={<PrinterOutlined />}
                    onClick={() => handlePrintLabels(row)}
                  >
                    In tem
                  </Button>
                  {row.isDispensed ? (
                    <Button
                      size="small"
                      danger
                      icon={<UndoOutlined />}
                      onClick={() => handleCancelDispense(row.prescriptionId)}
                    >
                      Hủy phát
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      onClick={async () => {
                        try {
                          await apiClient.post(`/warehousecomplete/issues/dispense-outpatient/${row.prescriptionId}`);
                          message.success('Đã phát');
                          handlePrintLabels(row);
                          load();
                        } catch { message.error('Phát thất bại'); }
                      }}
                    >
                      Phát + In
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Drawer
        title={`Chi tiết đơn: ${detailDrawer?.prescriptionCode}`}
        open={detailDrawer !== null}
        onClose={() => setDetailDrawer(null)}
        width={560}
      >
        {detailDrawer && (
          <>
            <p><strong>BN:</strong> {detailDrawer.patientName} ({detailDrawer.patientCode})</p>
            <p><strong>BS kê:</strong> {detailDrawer.doctorName || '-'}</p>
            <p><strong>Kê lúc:</strong> {dayjs(detailDrawer.prescribedAt).format('DD/MM/YYYY HH:mm')}</p>
            <Divider />
            <List
              dataSource={detailDrawer.items}
              renderItem={it => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<BarcodeOutlined style={{ fontSize: 20 }} />}
                    title={it.medicineName}
                    description={
                      <Space direction="vertical" size={2}>
                        <span><strong>SL:</strong> {it.quantity} {it.unit} × {it.days || 1} ngày</span>
                        <span><strong>Liều:</strong> {it.dosage || '-'}</span>
                      </Space>
                    }
                  />
                  <Checkbox defaultChecked={detailDrawer.isDispensed} />
                </List.Item>
              )}
            />
          </>
        )}
      </Drawer>
    </div>
  );
}
