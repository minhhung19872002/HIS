/**
 * Kiểm tra dược lâm sàng — N1.04.
 * Review đầy đủ thuốc + CLS + dị ứng + tương tác trước cấp phát.
 */

import { useCallback, useState } from 'react';
import {
  Card, Input, Button, Space, Row, Col, Descriptions, Table, Tag, Alert,
  Statistic, Typography, Divider, message,
} from 'antd';
import { SearchOutlined, WarningOutlined, MedicineBoxOutlined, ExperimentOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '../api/client';

const { Title, Text } = Typography;

interface PharmacyCheckData {
  patient: {
    id: string;
    patientCode: string;
    fullName: string;
    gender: number;
    dateOfBirth?: string;
    phoneNumber?: string;
    address?: string;
    insuranceNumber?: string;
  };
  activeMedicalRecords: Array<{ id: string; medicalRecordCode: string; admissionDate: string; mainDiagnosis?: string; patientType: number }>;
  prescriptions: Array<{
    id: string;
    prescriptionCode: string;
    prescriptionDate: string;
    totalAmount: number;
    isDispensed: boolean;
    items: Array<{ id: string; medicineName: string; medicineCode: string; quantity: number; dosage?: string; days: number; usageInstructions?: string }>;
  }>;
  services: Array<{ serviceName: string; amount: number; status: number; result?: string; createdAt: string }>;
  flags: Array<{ id: string; flagType: number; color: string; note: string }>;
  interactions: Array<{ id: string; medicine1Id: string; medicine2Id: string; severity: number; description?: string; management?: string }>;
  summary: {
    totalActiveMedicines: number;
    totalPrescriptions: number;
    totalServices: number;
    warningFlagsCount: number;
    drugInteractionsCount: number;
  };
}

export default function ClinicalPharmacyCheck() {
  const [keyword, setKeyword] = useState('');
  const [data, setData] = useState<PharmacyCheckData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!keyword) return;
    setLoading(true);
    try {
      // Tìm patient trước
      const patientRes = await apiClient.get<{ items?: Array<{ id: string }> }>('/admin/patients/search', {
        params: { keyword, pageSize: 1 },
      }).catch(async () => {
        // Fallback: tìm qua reception patient search
        const r = await apiClient.get<{ items?: Array<{ id: string }> }>('/reception/patients/search', {
          params: { keyword, pageSize: 1 },
        });
        return r;
      });
      const items = patientRes.data?.items ?? [];
      if (items.length === 0) {
        message.warning('Không tìm thấy bệnh nhân');
        return;
      }
      const patientId = items[0].id;
      const { data: detail } = await apiClient.get<PharmacyCheckData>(`/clinical-pharmacy/patient-summary/${patientId}`);
      setData(detail);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Tải dữ liệu thất bại');
    } finally { setLoading(false); }
  }, [keyword]);

  return (
    <div>
      <Card title={<Space><MedicineBoxOutlined /> Kiểm tra dược lâm sàng</Space>}>
        <Input.Search
          placeholder="Nhập mã BN, CCCD, SĐT, tên BN..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onSearch={handleSearch}
          enterButton={<Button type="primary" icon={<SearchOutlined />}>Kiểm tra</Button>}
          size="large"
          style={{ marginBottom: 16 }}
          loading={loading}
        />

        {data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={16}>
                <Descriptions column={2} size="small" bordered>
                  <Descriptions.Item label="Mã BN"><strong>{data.patient.patientCode}</strong></Descriptions.Item>
                  <Descriptions.Item label="Họ tên"><strong>{data.patient.fullName}</strong></Descriptions.Item>
                  <Descriptions.Item label="Giới tính">
                    {data.patient.gender === 1 ? 'Nam' : data.patient.gender === 2 ? 'Nữ' : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày sinh">
                    {data.patient.dateOfBirth ? dayjs(data.patient.dateOfBirth).format('DD/MM/YYYY') : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="SĐT">{data.patient.phoneNumber || '-'}</Descriptions.Item>
                  <Descriptions.Item label="BHYT">{data.patient.insuranceNumber || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Địa chỉ" span={2}>{data.patient.address || '-'}</Descriptions.Item>
                </Descriptions>
              </Col>
              <Col span={8}>
                <Row gutter={[8, 8]}>
                  <Col span={12}><Statistic title="Thuốc đang dùng" value={data.summary.totalActiveMedicines} /></Col>
                  <Col span={12}><Statistic title="Đơn thuốc" value={data.summary.totalPrescriptions} /></Col>
                  <Col span={12}><Statistic title="CLS" value={data.summary.totalServices} /></Col>
                  <Col span={12}>
                    <Statistic
                      title="Cảnh báo"
                      value={data.summary.warningFlagsCount + data.summary.drugInteractionsCount}
                      valueStyle={{ color: data.summary.drugInteractionsCount > 0 ? '#cf1322' : undefined }}
                    />
                  </Col>
                </Row>
              </Col>
            </Row>

            {data.flags.length > 0 && (
              <Alert
                style={{ marginBottom: 16 }}
                title="Cảnh báo BN"
                description={
                  <Space wrap>
                    {data.flags.map(f => (
                      <Tag key={f.id} color={f.color}>{f.note}</Tag>
                    ))}
                  </Space>
                }
                type="warning"
                icon={<WarningOutlined />}
                showIcon
              />
            )}

            {data.interactions.length > 0 && (
              <Alert
                style={{ marginBottom: 16 }}
                title={`⚠️ ${data.interactions.length} tương tác thuốc được phát hiện`}
                description={
                  <Table
                    size="small"
                    pagination={false}
                    dataSource={data.interactions}
                    rowKey="id"
                    columns={[
                      {
                        title: 'Mức độ',
                        dataIndex: 'severity',
                        width: 120,
                        render: (s: number) => {
                          const colors: Record<number, string> = { 1: 'gold', 2: 'orange', 3: 'red', 4: 'volcano' };
                          const labels: Record<number, string> = { 1: 'Nhẹ', 2: 'Trung bình', 3: 'Nặng', 4: 'Chống chỉ định' };
                          return <Tag color={colors[s]}>{labels[s]}</Tag>;
                        },
                      },
                      { title: 'Mô tả', dataIndex: 'description' },
                      { title: 'Khuyến nghị', dataIndex: 'management' },
                    ]}
                  />
                }
                type="error"
                showIcon
              />
            )}

            <Divider titlePlacement="start"><Space><ExperimentOutlined /> Hồ sơ bệnh án đang hoạt động</Space></Divider>
            <Table
              size="small"
              rowKey="id"
              dataSource={data.activeMedicalRecords}
              pagination={false}
              columns={[
                { title: 'Mã HSBA', dataIndex: 'medicalRecordCode', width: 150 },
                { title: 'Ngày vào', dataIndex: 'admissionDate', render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
                { title: 'Chẩn đoán chính', dataIndex: 'mainDiagnosis' },
                {
                  title: 'Đối tượng',
                  dataIndex: 'patientType',
                  width: 100,
                  render: (v: number) => v === 1 ? <Tag color="green">BHYT</Tag> : <Tag>Thu phí</Tag>,
                },
              ]}
            />

            <Divider titlePlacement="start"><Space><MedicineBoxOutlined /> Đơn thuốc gần đây</Space></Divider>
            {data.prescriptions.map(p => (
              <Card key={p.id} size="small" style={{ marginBottom: 8 }}>
                <Space style={{ marginBottom: 8 }}>
                  <Text strong>{p.prescriptionCode}</Text>
                  <Tag>{dayjs(p.prescriptionDate).format('DD/MM/YYYY')}</Tag>
                  {p.isDispensed ? <Tag color="green">Đã phát</Tag> : <Tag color="orange">Chưa phát</Tag>}
                  <Text type="secondary">{p.totalAmount?.toLocaleString('vi-VN')}đ</Text>
                </Space>
                <Table
                  size="small"
                  dataSource={p.items}
                  rowKey="id"
                  pagination={false}
                  columns={[
                    { title: 'Mã', dataIndex: 'medicineCode', width: 100 },
                    { title: 'Thuốc', dataIndex: 'medicineName' },
                    { title: 'SL', dataIndex: 'quantity', width: 60, align: 'right' },
                    { title: 'Liều', dataIndex: 'dosage', width: 150 },
                    { title: 'Ngày', dataIndex: 'days', width: 60, align: 'right' },
                    { title: 'Cách dùng', dataIndex: 'usageInstructions' },
                  ]}
                />
              </Card>
            ))}

            {data.services.length > 0 && (
              <>
                <Divider titlePlacement="start">CLS + Dịch vụ gần đây</Divider>
                <Table
                  size="small"
                  rowKey={(_, idx) => String(idx)}
                  dataSource={data.services}
                  pagination={{ pageSize: 10 }}
                  columns={[
                    { title: 'Dịch vụ', dataIndex: 'serviceName' },
                    { title: 'Ngày', dataIndex: 'createdAt', render: (v: string) => dayjs(v).format('DD/MM HH:mm') },
                    {
                      title: 'Trạng thái',
                      dataIndex: 'status',
                      width: 120,
                      render: (s: number) => s === 2 ? <Tag color="green">Có KQ</Tag> : <Tag color="blue">Chờ</Tag>,
                    },
                    { title: 'Giá', dataIndex: 'amount', align: 'right', render: (v: number) => v?.toLocaleString('vi-VN') },
                  ]}
                />
              </>
            )}
          </>
        )}

        {!data && !loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            <Title level={4} type="secondary">Nhập thông tin BN để kiểm tra dược lâm sàng</Title>
          </div>
        )}
      </Card>
    </div>
  );
}
