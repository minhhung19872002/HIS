/**
 * Tab Bệnh kèm theo — quản lý `comorbidities` state (parent owns).
 * Logic giữ NGUYÊN bao gồm cả pattern `document.getElementById` cho 2 input
 * mã ICD + ghi chú (KHÔNG đổi sang controlled input để tránh logic-change).
 *
 * Extracted khỏi pages/OPD.tsx (K13 Batch 2).
 */
import React from 'react';
import {
  Alert,
  Button,
  Form,
  Input,
  Space,
  Table,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';

const { TextArea } = Input;

export interface ComorbidityItem {
  code: string;
  name: string;
  note?: string;
}

interface TabComorbiditiesProps {
  comorbidities: ComorbidityItem[];
  setComorbidities: React.Dispatch<React.SetStateAction<ComorbidityItem[]>>;
}

const TabComorbidities: React.FC<TabComorbiditiesProps> = ({
  comorbidities,
  setComorbidities,
}) => (
  <>
    <Alert
      title="Bệnh kèm theo / Tiền sử bệnh"
      description="Ghi các bệnh lý đồng mắc (đái tháo đường, THA, hen, tim mạch...) để hệ thống tính tương kỵ + chống chỉ định."
      type="info"
      showIcon
      style={{ marginBottom: 12 }}
    />
    <Space style={{ marginBottom: 12 }} wrap>
      <Input
        placeholder="Mã ICD hoặc tên bệnh"
        style={{ width: 280 }}
        id="comorbidity-code-input"
      />
      <Input
        placeholder="Ghi chú (tùy chọn)"
        style={{ width: 280 }}
        id="comorbidity-note-input"
      />
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => {
          const codeEl = document.getElementById('comorbidity-code-input') as HTMLInputElement;
          const noteEl = document.getElementById('comorbidity-note-input') as HTMLInputElement;
          if (codeEl?.value) {
            setComorbidities(prev => [...prev, {
              code: codeEl.value,
              name: codeEl.value,
              note: noteEl?.value,
            }]);
            codeEl.value = '';
            if (noteEl) noteEl.value = '';
          }
        }}
      >
        Thêm
      </Button>
    </Space>
    <Table<ComorbidityItem>
      rowKey={(_, idx) => String(idx)}
      dataSource={comorbidities}
      pagination={false}
      size="small"
      columns={[
        { title: 'Mã ICD / Tên', dataIndex: 'code' },
        { title: 'Ghi chú', dataIndex: 'note' },
        {
          title: '',
          width: 60,
          render: (_, _r, idx) => (
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => setComorbidities(prev => prev.filter((_, i) => i !== idx))}
            />
          ),
        },
      ]}
    />
    <Form.Item
      label="Tiền sử bệnh tổng hợp (mô tả)"
      name={['medicalHistory', 'comorbidityNote']}
      style={{ marginTop: 16 }}
    >
      <TextArea rows={3} placeholder="Mô tả tổng hợp tiền sử bệnh nếu cần..." />
    </Form.Item>
  </>
);

export default TabComorbidities;
