/**
 * CĐHA: chỉ định thêm + xuất thuốc/vật tư tại phòng — N1.14 + N1.15.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Card, Tabs, Input, Button, Space, Form, Select, InputNumber, message, Typography, Alert, Descriptions,
  Table, Divider, Tag,
} from 'antd';
import { SearchOutlined, PlusOutlined, ExperimentOutlined, MedicineBoxOutlined, ScanOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import { getWarehouses } from '../api/warehouse';

const { Text } = Typography;

interface Request {
  id: string; requestCode: string; patientCode: string; patientName: string;
  serviceName: string; bodyPart?: string; status: number; requestDate: string;
  medicalRecordId?: string; patientId: string;
  contrast?: boolean; priority?: number;
}

interface Service { id: string; serviceCode: string; serviceName: string; unitPrice: number }
interface Medicine { id: string; medicineCode: string; medicineName: string; unit?: string; unitPrice: number }
interface Supply { id: string; supplyCode: string; supplyName: string; unit?: string; unitPrice: number }
interface Warehouse { id: string; warehouseName: string }

export default function RadiologyOps() {
  const [keyword, setKeyword] = useState('');
  const [requests, setRequests] = useState<Request[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('add-on');

  const [services, setServices] = useState<Service[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [addOnForm] = Form.useForm();
  const [dispenseForm] = Form.useForm();

  const searchRequest = useCallback(async () => {
    if (!keyword) return;
    setLoading(true);
    try {
      const { data } = await apiClient.get('/radiology/requests/search', {
        params: { keyword, pageSize: 20 },
      }).catch(async () => {
        const { data } = await apiClient.get('/radiology/orders', { params: { keyword, pageSize: 20 } });
        return { data };
      });
      const items = data?.items || data || [];
      setRequests(items.map((r: any) => ({
        id: r.id,
        requestCode: r.requestCode || r.orderCode || r.code,
        patientCode: r.patientCode || r.patient?.patientCode,
        patientName: r.patientName || r.patient?.fullName || '',
        serviceName: r.serviceName || r.service?.serviceName || '',
        bodyPart: r.bodyPart,
        status: r.status,
        requestDate: r.requestDate || r.createdAt,
        medicalRecordId: r.medicalRecordId,
        patientId: r.patientId,
        contrast: r.contrast,
        priority: r.priority,
      })));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Tìm kiếm thất bại');
    } finally { setLoading(false); }
  }, [keyword]);

  useEffect(() => {
    (async () => {
      try {
        const { data: s } = await apiClient.get('/catalog/services', {
          params: { serviceType: 'CDHA', isActive: true, pageSize: 500 },
        });
        setServices(Array.isArray(s) ? s : (s?.items ?? []));
      } catch { /* empty */ }
      try {
        const { data: m } = await apiClient.get('/catalog/medicines', {
          params: { isActive: true, pageSize: 500 },
        });
        setMedicines(Array.isArray(m) ? m : (m?.items ?? []));
      } catch { /* empty */ }
      try {
        const { data: sp } = await apiClient.get('/catalog/supplies', {
          params: { isActive: true, pageSize: 500 },
        });
        setSupplies(Array.isArray(sp) ? sp : (sp?.items ?? []));
      } catch { /* empty */ }
      try {
        const w = await getWarehouses(1);
        setWarehouses((w as any)?.data?.items || (w as any)?.data || []);
      } catch { /* empty */ }
    })();
  }, []);

  const submitAddOn = async () => {
    if (!selectedRequest) return message.warning('Chọn 1 phiếu CĐHA trước');
    const v = await addOnForm.validateFields();
    try {
      const { data } = await apiClient.post('/radiology-ops/add-on', {
        parentRequestId: selectedRequest.id,
        serviceIds: v.serviceIds,
        reason: v.reason,
        withContrast: v.withContrast ?? false,
      });
      message.success(`Đã tạo ${data.created?.length || 0} phiếu CĐHA mới`);
      addOnForm.resetFields();
      await searchRequest();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Tạo phiếu thất bại');
    }
  };

  const submitDispense = async () => {
    if (!selectedRequest) return message.warning('Chọn 1 phiếu CĐHA trước');
    const v = await dispenseForm.validateFields();
    try {
      const { data } = await apiClient.post('/radiology-ops/dispense', {
        warehouseId: v.warehouseId,
        patientId: selectedRequest.patientId,
        radiologyRequestId: selectedRequest.id,
        medicalRecordId: selectedRequest.medicalRecordId,
        note: v.note,
        items: (v.items || []).map((it: any) => {
          const med = medicines.find(m => m.id === it.itemId);
          const sup = supplies.find(s => s.id === it.itemId);
          return {
            medicineId: med ? it.itemId : undefined,
            supplyId: sup ? it.itemId : undefined,
            quantity: it.quantity,
            unit: med?.unit || sup?.unit,
            note: it.note,
          };
        }),
      });
      message.success(`Đã xuất kho - phiếu ${data.receiptCode} - ${data.totalAmount?.toLocaleString('vi-VN')}đ`);
      dispenseForm.resetFields();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Xuất kho thất bại');
    }
  };

  return (
    <div>
      <Card title={<Space><ScanOutlined /> CĐHA Operations (N1.14 + N1.15)</Space>}>
        <Input.Search
          placeholder="Tìm mã phiếu CĐHA / mã BN / tên BN..."
          enterButton={<Button type="primary" icon={<SearchOutlined />}>Tìm phiếu</Button>}
          size="large"
          style={{ marginBottom: 16 }}
          loading={loading}
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onSearch={searchRequest}
        />

        {requests.length > 0 && (
          <Table
            size="small"
            rowKey="id"
            dataSource={requests}
            pagination={false}
            style={{ marginBottom: 16 }}
            rowSelection={{
              type: 'radio',
              selectedRowKeys: selectedRequest ? [selectedRequest.id] : [],
              onChange: (_, rows) => setSelectedRequest(rows[0] || null),
            }}
            columns={[
              { title: 'Phiếu', dataIndex: 'requestCode', width: 160 },
              { title: 'Mã BN', dataIndex: 'patientCode', width: 120 },
              { title: 'Họ tên', dataIndex: 'patientName' },
              { title: 'DV CĐHA', dataIndex: 'serviceName' },
              { title: 'Vị trí', dataIndex: 'bodyPart', width: 140 },
              { title: 'Cản quang', dataIndex: 'contrast', width: 100,
                render: (v: boolean) => v ? <Tag color="orange">Có</Tag> : '-' },
              { title: 'Ngày', dataIndex: 'requestDate', width: 130,
                render: (v: string) => dayjs(v).format('DD/MM HH:mm') },
            ]}
          />
        )}

        {selectedRequest && (
          <>
            <Alert style={{ marginBottom: 16 }} type="info"
              title={<Space>
                <Text strong>Phiếu đang chọn:</Text>
                <Tag color="blue">{selectedRequest.requestCode}</Tag>
                <Text>{selectedRequest.patientName}</Text>
                <Tag>{selectedRequest.serviceName}</Tag>
              </Space>}
            />
            <Tabs
              activeKey={tab}
              onChange={setTab}
              items={[
                {
                  key: 'add-on',
                  label: <Space><PlusOutlined /> Chỉ định thêm (N1.14)</Space>,
                  children: (
                    <Form form={addOnForm} layout="vertical" style={{ maxWidth: 720 }}>
                      <Form.Item label="Dịch vụ chỉ định thêm" name="serviceIds" rules={[{ required: true }]}>
                        <Select mode="multiple" showSearch optionFilterProp="label"
                          options={services.map(s => ({
                            label: `${s.serviceCode} - ${s.serviceName} - ${s.unitPrice?.toLocaleString('vi-VN')}đ`,
                            value: s.id,
                          }))} />
                      </Form.Item>
                      <Form.Item label="Dùng thuốc cản quang" name="withContrast" valuePropName="checked">
                        <input type="checkbox" />
                      </Form.Item>
                      <Form.Item label="Lý do chỉ định thêm" name="reason" rules={[{ required: true }]}>
                        <Input.TextArea rows={3} placeholder="VD: cần chụp thêm tư thế nghiêng để đánh giá..." />
                      </Form.Item>
                      <Button type="primary" onClick={submitAddOn} icon={<PlusOutlined />}>
                        Tạo phiếu chỉ định thêm
                      </Button>
                    </Form>
                  ),
                },
                {
                  key: 'dispense',
                  label: <Space><MedicineBoxOutlined /> Xuất thuốc tại phòng (N1.15)</Space>,
                  children: (
                    <Form form={dispenseForm} layout="vertical" style={{ maxWidth: 820 }}>
                      <Form.Item label="Kho xuất" name="warehouseId" rules={[{ required: true }]}>
                        <Select showSearch optionFilterProp="label"
                          options={warehouses.map(w => ({ label: w.warehouseName, value: w.id }))} />
                      </Form.Item>
                      <Divider>Thuốc / vật tư</Divider>
                      <Form.List name="items">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map(({ key, name }) => (
                              <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                                <Form.Item name={[name, 'itemId']} rules={[{ required: true }]} style={{ minWidth: 380 }}>
                                  <Select showSearch optionFilterProp="label" placeholder="Thuốc hoặc vật tư"
                                    options={[
                                      ...medicines.map(m => ({ label: `[Thuốc] ${m.medicineCode} - ${m.medicineName}`, value: m.id })),
                                      ...supplies.map(s => ({ label: `[VT] ${s.supplyCode} - ${s.supplyName}`, value: s.id })),
                                    ]} />
                                </Form.Item>
                                <Form.Item name={[name, 'quantity']} rules={[{ required: true }]}>
                                  <InputNumber placeholder="SL" min={0.01} step={0.01} />
                                </Form.Item>
                                <Form.Item name={[name, 'note']} style={{ minWidth: 200 }}>
                                  <Input placeholder="Ghi chú" />
                                </Form.Item>
                                <Button danger onClick={() => remove(name)}>Xóa</Button>
                              </Space>
                            ))}
                            <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>Thêm dòng</Button>
                          </>
                        )}
                      </Form.List>
                      <Form.Item label="Ghi chú phiếu" name="note" style={{ marginTop: 16 }}>
                        <Input.TextArea rows={2} />
                      </Form.Item>
                      <Button type="primary" onClick={submitDispense} icon={<MedicineBoxOutlined />}>
                        Xuất kho cho BN
                      </Button>
                    </Form>
                  ),
                },
              ]}
            />
          </>
        )}

        {!selectedRequest && requests.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <ExperimentOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">Tìm phiếu CĐHA để thực hiện chỉ định thêm hoặc xuất thuốc</Text>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
