// K1 phiên 6b (2026-05-30): tách tab `locked-services` khỏi SystemAdmin.tsx god-file.
// Behavior-preserve: copy 1-1 + own state cho search/modal.
// Logic side-effect: useEffect search khi modal mở + load lockedServices khi tab active.
// Pattern `active` prop — sub-component own logic, parent pass `active` để skip fetch khi inactive.
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Card, Col, Form, Input, Modal, Popconfirm, Row, Select, Space,
  Spin, Table, Tag, Typography, message,
} from 'antd';
import { CheckCircleOutlined, LockOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { adminApi, catalogApi } from '../../api/system';
import {
  getNestedData, isFormValidationError, toNumberValue, toRawItems, toStringValue,
  type RawApiItem,
} from './helpers';

const { Option } = Select;
const { TextArea } = Input;

interface ServiceSearchItem {
  id: string;
  code: string;
  name: string;
  serviceType: number;
}

type LockedServiceItem = RawApiItem;

interface Props {
  active?: boolean;
}

export const LockedServicesTabLabel: React.FC = () => (
  <span><LockOutlined /> Khóa dịch vụ</span>
);

const LockedServicesTab: React.FC<Props> = ({ active = true }) => {
  const [lockedServices, setLockedServices] = useState<LockedServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<ServiceSearchItem[]>([]);
  const [form] = Form.useForm();

  const fetchLockedServices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminApi.getLockedServices();
      setLockedServices(getNestedData<LockedServiceItem[]>(response?.data, []));
    } catch (error) {
      console.warn('Error fetching locked services:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load khi tab active (skip nếu inactive — Antd Tabs giữ mount default).
  useEffect(() => {
    if (active) fetchLockedServices();
  }, [active, fetchLockedServices]);

  // Search services khi mở modal lock + có keyword.
  useEffect(() => {
    if (modalOpen && keyword.trim()) {
      const searchServices = async () => {
        try {
          const [examRes, paraRes, medRes] = await Promise.allSettled([
            catalogApi.getExaminationServices(keyword),
            catalogApi.getParaclinicalServices(keyword),
            catalogApi.getMedicines({ keyword }),
          ]);
          const results: ServiceSearchItem[] = [];
          if (examRes.status === 'fulfilled') {
            const items = toRawItems(examRes.value.data);
            items.forEach((service) => results.push({
              id: toStringValue(service.id),
              code: toStringValue(service.serviceCode ?? service.code),
              name: toStringValue(service.serviceName ?? service.name),
              serviceType: 3,
            }));
          }
          if (paraRes.status === 'fulfilled') {
            const items = toRawItems(paraRes.value.data);
            items.forEach((service) => results.push({
              id: toStringValue(service.id),
              code: toStringValue(service.serviceCode ?? service.code),
              name: toStringValue(service.serviceName ?? service.name),
              serviceType: 3,
            }));
          }
          if (medRes.status === 'fulfilled') {
            const items = toRawItems(medRes.value.data);
            items.forEach((service) => results.push({
              id: toStringValue(service.id),
              code: toStringValue(service.medicineCode ?? service.code),
              name: toStringValue(service.medicineName ?? service.name),
              serviceType: 1,
            }));
          }
          setSearchResults(results.slice(0, 50));
        } catch {
          setSearchResults([]);
        }
      };
      searchServices();
    }
  }, [modalOpen, keyword]);

  const handleLock = async () => {
    try {
      const values = await form.validateFields();
      await adminApi.lockService(values.serviceId, values.reason);
      message.success('Đã khóa dịch vụ thành công');
      setModalOpen(false);
      form.resetFields();
      setKeyword('');
      fetchLockedServices();
    } catch (error) {
      if (isFormValidationError(error)) return;
      console.warn('Error locking service:', error);
      message.warning('Không thể khóa dịch vụ');
    }
  };

  const handleUnlock = async (serviceId: string) => {
    try {
      await adminApi.unlockService(serviceId);
      message.success('Đã mở khóa dịch vụ');
      fetchLockedServices();
    } catch (error) {
      console.warn('Error unlocking service:', error);
      message.warning('Không thể mở khóa dịch vụ');
    }
  };

  return (
    <Spin spinning={loading}>
      <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
        <Col flex="auto">
          <Typography.Text strong style={{ fontSize: 16 }}>
            <LockOutlined /> Quản lý khóa dịch vụ
          </Typography.Text>
          <Typography.Text type="secondary" style={{ marginLeft: 12 }}>
            Khi khóa, bác sĩ không thể kê dịch vụ này
          </Typography.Text>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={fetchLockedServices}>Làm mới</Button>
        </Col>
      </Row>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <Input.Search
            placeholder="Nhập tên hoặc mã dịch vụ để khóa..."
            style={{ width: 400 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={() => {
              if (!keyword.trim()) {
                message.warning('Vui lòng nhập tên hoặc mã dịch vụ');
                return;
              }
              setModalOpen(true);
            }}
            enterButton={<Button type="primary" icon={<LockOutlined />}>Khóa dịch vụ</Button>}
          />
        </Space>
      </Card>

      <Table
        columns={[
          { title: 'Mã DV', dataIndex: 'serviceCode', width: 100 },
          { title: 'Tên dịch vụ', dataIndex: 'serviceName', ellipsis: true },
          {
            title: 'Loại', dataIndex: 'serviceTypeName', width: 100,
            render: (text: string, record: LockedServiceItem) => {
              const colorMap: Record<number, string> = { 1: 'blue', 2: 'orange', 3: 'green' };
              return <Tag color={colorMap[toNumberValue(record.serviceType)] || 'default'}>{text || 'Khác'}</Tag>;
            },
          },
          {
            title: 'Trạng thái', dataIndex: 'isLocked', width: 100,
            render: (isLocked: boolean) => (
              <Tag color={isLocked ? 'red' : 'green'} icon={isLocked ? <LockOutlined /> : <CheckCircleOutlined />}>
                {isLocked ? 'Đang khóa' : 'Hoạt động'}
              </Tag>
            ),
          },
          {
            title: 'Lý do khóa', dataIndex: 'lockReason', width: 200, ellipsis: true,
            render: (text: string) => text || '-',
          },
          {
            title: 'Người khóa', dataIndex: 'lockedByName', width: 120,
            render: (text: string) => text || '-',
          },
          {
            title: 'Ngày khóa', dataIndex: 'lockedAt', width: 140,
            render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-',
          },
          {
            title: 'Thao tác', key: 'action', width: 100,
            render: (_: unknown, record: LockedServiceItem) => (
              record.isLocked ? (
                <Popconfirm
                  title="Mở khóa dịch vụ"
                  description={`Bạn có chắc muốn mở khóa "${record.serviceName}"?`}
                  onConfirm={() => handleUnlock(toStringValue(record.serviceId))}
                  okText="Mở khóa"
                  cancelText="Hủy"
                >
                  <Button type="link" size="small" icon={<CheckCircleOutlined />}>Mở khóa</Button>
                </Popconfirm>
              ) : null
            ),
          },
        ]}
        dataSource={lockedServices}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: 'Chưa có dịch vụ nào bị khóa' }}
      />

      <Modal
        title={<><LockOutlined /> Khóa dịch vụ</>}
        open={modalOpen}
        onOk={handleLock}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        okText="Khóa"
        cancelText="Hủy"
        width={500}
      >
        <Alert
          title="Khi khóa dịch vụ, bác sĩ sẽ không thể kê dịch vụ này cho bệnh nhân."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={form} layout="vertical">
          <Form.Item label="Dịch vụ cần khóa">
            <Input value={keyword} disabled />
          </Form.Item>
          <Form.Item
            name="serviceId"
            label="Chọn dịch vụ"
            rules={[{ required: true, message: 'Vui lòng chọn dịch vụ' }]}
          >
            <Select placeholder="Chọn dịch vụ từ danh sách" showSearch optionFilterProp="children">
              {searchResults.map((s) => (
                <Option key={s.id} value={s.id}>
                  {s.code} - {s.name} ({s.serviceType === 1 ? 'Thuốc' : s.serviceType === 2 ? 'Vật tư' : 'DVKT'})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="reason"
            label="Lý do khóa"
            rules={[{ required: true, message: 'Vui lòng nhập lý do khóa' }]}
          >
            <TextArea rows={3} placeholder="Nhập lý do khóa dịch vụ (VD: Hết hàng, Thu hồi, Bảo trì...)" />
          </Form.Item>
        </Form>
      </Modal>
    </Spin>
  );
};

export default LockedServicesTab;
