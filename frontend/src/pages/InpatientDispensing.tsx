/**
 * Phát thuốc nội trú theo khoa — N1.05.
 * Gộp các đơn thuốc nội trú của 1 khoa thành 1 phiếu xuất tổng hợp.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card, Button, Space, Table, Tag, Select, message, Modal, Typography, Alert, Input, Divider,
} from 'antd';
import { ReloadOutlined, CheckCircleOutlined, PrinterOutlined, MedicineBoxOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import systemApi from '../api/system';
import { getWarehouses } from '../api/warehouse';

const { Title, Text } = Typography;

interface PendingItem {
  id: string;
  medicineId: string;
  medicineName: string;
  medicineCode: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
}

interface PendingPrescription {
  id: string;
  prescriptionCode: string;
  prescriptionDate: string;
  patientCode: string;
  patientName: string;
  medicalRecordCode: string;
  warehouseId?: string;
  items: PendingItem[];
}

interface PendingGroup {
  departmentId: string;
  departmentName: string;
  totalPrescriptions: number;
  totalItems: number;
  totalAmount: number;
  prescriptions: PendingPrescription[];
}

interface Department { id: string; departmentName: string }
interface Warehouse { id: string; warehouseName: string }

export default function InpatientDispensing() {
  const [groups, setGroups] = useState<PendingGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [filterDept, setFilterDept] = useState<string | undefined>();
  const [warehouseId, setWarehouseId] = useState<string | undefined>();
  const [selectedIds, setSelectedIds] = useState<Record<string, string[]>>({}); // departmentId -> prescriptionIds
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [printData, setPrintData] = useState<any>(null);

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterDept) params.departmentId = filterDept;
      if (warehouseId) params.warehouseId = warehouseId;
      const { data } = await apiClient.get<PendingGroup[]>('/inpatient-dispensing/pending', { params });
      setGroups(data || []);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Tải danh sách thất bại');
    } finally { setLoading(false); }
  }, [filterDept, warehouseId]);

  useEffect(() => {
    (async () => {
      try {
        const [d, w] = await Promise.all([systemApi.catalog.getDepartments(), getWarehouses(1)]);
        setDepartments((d as any)?.data?.items || (d as any)?.data || []);
        setWarehouses((w as any)?.data?.items || (w as any)?.data || []);
      } catch { /* empty */ }
    })();
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);

  const toggleSelection = (departmentId: string, ids: string[]) => {
    setSelectedIds(prev => ({ ...prev, [departmentId]: ids }));
  };

  const submitBatch = async (g: PendingGroup) => {
    const ids = selectedIds[g.departmentId] || [];
    if (ids.length === 0) return message.warning('Chưa chọn đơn thuốc');
    if (!warehouseId) return message.warning('Chọn kho xuất trước');
    setSubmitting(true);
    try {
      const { data } = await apiClient.post('/inpatient-dispensing/batch', {
        warehouseId,
        departmentId: g.departmentId,
        prescriptionIds: ids,
        note,
      });
      message.success(`Đã tạo phiếu ${data.receiptCode} (${ids.length} đơn, ${data.totalAmount?.toLocaleString('vi-VN')}đ)`);
      setSelectedIds(prev => ({ ...prev, [g.departmentId]: [] }));
      // Load detail for printing
      const { data: detail } = await apiClient.get(`/inpatient-dispensing/receipt/${data.exportReceiptId}`);
      setPrintData(detail);
      await loadPending();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Tạo phiếu thất bại');
    } finally { setSubmitting(false); }
  };

  const handlePrint = () => {
    if (!printData) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${printData.receiptCode}</title>
      <style>body{font-family:"Times New Roman",serif;padding:24px} h2{text-align:center} table{width:100%;border-collapse:collapse;margin-top:12px}
      th,td{border:1px solid #333;padding:4px 8px;font-size:13px} th{background:#eee}</style></head><body>
      <h2>PHIẾU LĨNH THUỐC NỘI TRÚ</h2>
      <p>Số: <b>${printData.receiptCode}</b> &nbsp; Ngày: ${dayjs(printData.receiptDate).format('DD/MM/YYYY HH:mm')}</p>
      <p>Kho xuất: <b>${printData.warehouseName || ''}</b> &nbsp; Khoa nhận: <b>${printData.departmentName || ''}</b></p>
      <p>${printData.note || ''}</p>
      <table><thead><tr><th>STT</th><th>Tên thuốc</th><th>Mã</th><th>Lô</th><th>HSD</th><th>SL</th><th>ĐV</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>
      ${(printData.items || []).map((it: any, i: number) => `<tr>
        <td>${i + 1}</td><td>${it.medicineName}</td><td>${it.medicineCode}</td>
        <td>${it.batchNumber || ''}</td><td>${it.expiryDate ? dayjs(it.expiryDate).format('DD/MM/YYYY') : ''}</td>
        <td style="text-align:right">${it.quantity}</td><td>${it.unit || ''}</td>
        <td style="text-align:right">${it.unitPrice?.toLocaleString('vi-VN')}</td>
        <td style="text-align:right">${it.amount?.toLocaleString('vi-VN')}</td>
      </tr>`).join('')}
      </tbody></table>
      <p style="text-align:right;margin-top:12px"><b>Tổng cộng: ${printData.totalAmount?.toLocaleString('vi-VN')}đ</b></p>
      <div style="display:flex;justify-content:space-around;margin-top:60px"><div>Người lập phiếu</div><div>Trưởng khoa</div><div>Thủ kho</div><div>Người nhận</div></div>
      </body></html>`;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const totalAmount = useMemo(() => groups.reduce((s, g) => s + g.totalAmount, 0), [groups]);

  return (
    <div>
      <Card title={<Space><MedicineBoxOutlined /> Phát thuốc nội trú theo khoa (N1.05)</Space>}
        extra={<Button icon={<ReloadOutlined />} onClick={loadPending} loading={loading}>Làm mới</Button>}>
        <Space wrap style={{ marginBottom: 16 }}>
          <Select
            placeholder="Kho xuất"
            style={{ width: 240 }}
            value={warehouseId}
            onChange={setWarehouseId}
            options={warehouses.map(w => ({ label: w.warehouseName, value: w.id }))}
            showSearch
            optionFilterProp="label"
          />
          <Select
            placeholder="Lọc khoa"
            style={{ width: 240 }}
            allowClear
            value={filterDept}
            onChange={setFilterDept}
            options={departments.map(d => ({ label: d.departmentName, value: d.id }))}
            showSearch
            optionFilterProp="label"
          />
          <Input placeholder="Ghi chú phiếu (nếu có)" value={note} onChange={e => setNote(e.target.value)} style={{ width: 300 }} />
        </Space>

        <Alert style={{ marginBottom: 16 }} showIcon type="info"
          title={`${groups.length} khoa có đơn chờ phát - Tổng ${groups.reduce((s, g) => s + g.totalPrescriptions, 0)} đơn - ${totalAmount.toLocaleString('vi-VN')}đ`}
        />

        {groups.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            <Title level={4} type="secondary">Không có đơn thuốc nội trú chờ phát</Title>
          </div>
        )}

        {groups.map(g => (
          <Card
            key={g.departmentId}
            type="inner"
            size="small"
            style={{ marginBottom: 16 }}
            title={<Space><Text strong>{g.departmentName}</Text>
              <Tag color="blue">{g.totalPrescriptions} đơn</Tag>
              <Tag color="green">{g.totalItems} dòng thuốc</Tag>
              <Tag color="gold">{g.totalAmount.toLocaleString('vi-VN')}đ</Tag>
            </Space>}
            extra={
              <Button type="primary" icon={<CheckCircleOutlined />} loading={submitting}
                disabled={!warehouseId || !(selectedIds[g.departmentId]?.length)}
                onClick={() => submitBatch(g)}>
                Xuất tổng hợp ({selectedIds[g.departmentId]?.length || 0})
              </Button>
            }
          >
            <Table
              size="small"
              rowKey="id"
              dataSource={g.prescriptions}
              pagination={false}
              rowSelection={{
                selectedRowKeys: selectedIds[g.departmentId] || [],
                onChange: (keys) => toggleSelection(g.departmentId, keys as string[]),
              }}
              columns={[
                { title: 'Đơn', dataIndex: 'prescriptionCode', width: 160 },
                { title: 'Ngày', dataIndex: 'prescriptionDate', width: 110,
                  render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
                { title: 'Mã BN', dataIndex: 'patientCode', width: 120 },
                { title: 'Họ tên', dataIndex: 'patientName' },
                { title: 'HSBA', dataIndex: 'medicalRecordCode', width: 140 },
                { title: 'SL thuốc', width: 90, align: 'right',
                  render: (_, p) => p.items.length },
                { title: 'Thành tiền', width: 120, align: 'right',
                  render: (_, p) => p.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0).toLocaleString('vi-VN') },
              ]}
              expandable={{
                expandedRowRender: (p: PendingPrescription) => (
                  <Table
                    size="small"
                    rowKey="id"
                    dataSource={p.items}
                    pagination={false}
                    columns={[
                      { title: 'Mã', dataIndex: 'medicineCode', width: 100 },
                      { title: 'Thuốc', dataIndex: 'medicineName' },
                      { title: 'SL', dataIndex: 'quantity', width: 70, align: 'right' },
                      { title: 'ĐV', dataIndex: 'unit', width: 70 },
                      { title: 'Đơn giá', dataIndex: 'unitPrice', width: 110, align: 'right',
                        render: (v: number) => v?.toLocaleString('vi-VN') },
                    ]}
                  />
                ),
              }}
            />
          </Card>
        ))}
      </Card>

      <Modal
        open={!!printData}
        title={<Space><PrinterOutlined /> Phiếu xuất tổng hợp</Space>}
        onCancel={() => setPrintData(null)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setPrintData(null)}>Đóng</Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>In phiếu</Button>,
        ]}
      >
        {printData && (
          <>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Text strong>{printData.receiptCode}</Text>
              <Text type="secondary">Kho xuất: {printData.warehouseName} → Khoa nhận: {printData.departmentName}</Text>
              <Text>{printData.note}</Text>
              <Divider style={{ margin: '8px 0' }} />
              <Table
                size="small"
                rowKey="id"
                dataSource={printData.items}
                pagination={false}
                columns={[
                  { title: 'Thuốc', dataIndex: 'medicineName' },
                  { title: 'Lô', dataIndex: 'batchNumber', width: 100 },
                  { title: 'HSD', dataIndex: 'expiryDate', width: 110,
                    render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-' },
                  { title: 'SL', dataIndex: 'quantity', width: 70, align: 'right' },
                  { title: 'ĐV', dataIndex: 'unit', width: 70 },
                  { title: 'Thành tiền', dataIndex: 'amount', width: 120, align: 'right',
                    render: (v: number) => v?.toLocaleString('vi-VN') },
                ]}
              />
              <Text strong style={{ textAlign: 'right', display: 'block' }}>
                Tổng: {printData.totalAmount?.toLocaleString('vi-VN')}đ
              </Text>
            </Space>
          </>
        )}
      </Modal>
    </div>
  );
}
