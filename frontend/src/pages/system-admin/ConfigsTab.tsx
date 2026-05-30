// K1 phiên 5b (2026-05-30): tách tab `configs` khỏi SystemAdmin.tsx god-file.
// Behavior-preserve: copy 1-1 column/handler/modal + props pass từ parent.
// Side-effects: KHÔNG có timer → không cần `active` prop.
import React, { useState } from 'react';
import { Button, Descriptions, Form, Input, Modal, Select, Switch, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EditOutlined, SettingOutlined } from '@ant-design/icons';
import { adminApi } from '../../api/system';
import { isFormValidationError } from './helpers';

const { Option } = Select;
const { TextArea } = Input;

export interface SystemConfig {
  id: string;
  configKey: string;
  configValue: string;
  configType: string;
  description?: string;
  isActive: boolean;
}

interface Props {
  configs: SystemConfig[];
  loading: boolean;
  onReload: () => void;
}

export const ConfigsTabLabel: React.FC = () => (
  <span><SettingOutlined /> Cấu hình hệ thống</span>
);

const ConfigsTab: React.FC<Props> = ({ configs, loading, onReload }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<SystemConfig | null>(null);
  const [form] = Form.useForm();

  const handleEdit = (config: SystemConfig) => {
    setSelected(config);
    form.setFieldsValue(config);
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await adminApi.saveSystemConfig({
        configKey: selected?.configKey || '',
        configValue: values.configValue,
        category: values.category || selected?.configType || 'General',
        description: values.description ?? selected?.description,
        dataType: selected?.configType || 'String',
        isEncrypted: false,
        isEditable: true,
      });
      message.success('Cập nhật cấu hình thành công!');
      setModalOpen(false);
      form.resetFields();
      onReload();
    } catch (error) {
      if (isFormValidationError(error)) return;
      console.warn('Error saving config:', error);
      message.warning('Cập nhật cấu hình thất bại!');
    }
  };

  const columns: ColumnsType<SystemConfig> = [
    { title: 'Khóa cấu hình', dataIndex: 'configKey', key: 'configKey', width: 250 },
    { title: 'Giá trị', dataIndex: 'configValue', key: 'configValue', width: 300 },
    { title: 'Kiểu dữ liệu', dataIndex: 'configType', key: 'configType', width: 120 },
    { title: 'Mô tả', dataIndex: 'description', key: 'description' },
    {
      title: 'Trạng thái', dataIndex: 'isActive', key: 'isActive', width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Kích hoạt' : 'Vô hiệu'}</Tag>
      ),
    },
    {
      title: 'Thao tác', key: 'action', width: 100,
      render: (_: unknown, record: SystemConfig) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>Sửa</Button>
      ),
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        dataSource={configs}
        rowKey="id"
        size="small"
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showTotal: (total) => `Tổng: ${total} cấu hình`,
        }}
        onRow={(record) => ({
          onDoubleClick: () => {
            Modal.info({
              title: `Chi tiết cấu hình - ${record.configKey}`,
              width: 500,
              content: (
                <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                  <Descriptions.Item label="Khóa">{record.configKey}</Descriptions.Item>
                  <Descriptions.Item label="Giá trị">{record.configValue}</Descriptions.Item>
                  <Descriptions.Item label="Mô tả">{record.description || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Nhóm">{record.configType || '-'}</Descriptions.Item>
                </Descriptions>
              ),
            });
          },
          style: { cursor: 'pointer' },
        })}
      />

      <Modal
        title="Cập nhật cấu hình"
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={600}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="configKey" label="Khóa cấu hình">
            <Input disabled />
          </Form.Item>
          <Form.Item
            name="configValue"
            label="Giá trị"
            rules={[{ required: true, message: 'Vui lòng nhập giá trị' }]}
          >
            <Input placeholder="Nhập giá trị" />
          </Form.Item>
          <Form.Item name="category" label="Danh mục">
            <Select placeholder="Chọn danh mục">
              <Option value="General">Chung</Option>
              <Option value="Security">Bảo mật</Option>
              <Option value="Email">Email</Option>
              <Option value="Integration">Tích hợp</Option>
              <Option value="Notification">Thông báo</Option>
              <Option value="Report">Báo cáo</Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <TextArea rows={2} placeholder="Nhập mô tả cấu hình" />
          </Form.Item>
          <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
            <Switch checkedChildren="Kích hoạt" unCheckedChildren="Vô hiệu" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ConfigsTab;
