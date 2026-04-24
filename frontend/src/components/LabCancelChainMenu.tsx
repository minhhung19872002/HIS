/**
 * M3.14 — Reverse workflow cancel menu for LabRequestItem.
 * Drop into Laboratory results page or sample-tracking row actions.
 * Buttons enabled/disabled based on current status so user can't skip steps.
 */

import { useState } from 'react';
import { Button, Dropdown, Form, Input, Modal, Tag, message } from 'antd';
import { DownOutlined, UndoOutlined } from '@ant-design/icons';
import { cancelApproval, cancelCollection, cancelResult } from '../api/labCancelChain';

interface Props {
  labRequestItemId: string;
  /** 0=Pending 1=Collected 2=Processing 3=Completed 4=Approved */
  currentStatus: number;
  onChanged?: (newStatus: number, label: string) => void;
  buttonSize?: 'small' | 'middle' | 'large';
}

export default function LabCancelChainMenu({ labRequestItemId, currentStatus, onChanged, buttonSize = 'small' }: Props) {
  const [promptOpen, setPromptOpen] = useState<null | 'approval' | 'result' | 'collection'>(null);
  const [form] = Form.useForm<{ reason: string }>();

  const canCancelApproval = currentStatus === 4;
  const canCancelResult = currentStatus === 2 || currentStatus === 3;
  const canCancelCollection = currentStatus === 1;

  const handleConfirm = async () => {
    if (!promptOpen) return;
    try {
      const values = await form.validateFields();
      const fn = promptOpen === 'approval' ? cancelApproval
        : promptOpen === 'result' ? cancelResult
        : cancelCollection;
      const res = await fn(labRequestItemId, values.reason);
      if (res.success) {
        message.success(res.message);
        onChanged?.(res.newStatus, res.newStatusLabel);
      } else {
        message.warning(res.message);
      }
      setPromptOpen(null);
      form.resetFields();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      const msg = err?.response?.data?.message;
      if (msg) message.error(msg);
    }
  };

  const items = [
    {
      key: 'approval',
      label: 'Bước 1: Hủy duyệt KQ',
      disabled: !canCancelApproval,
    },
    {
      key: 'result',
      label: 'Bước 2: Hủy KQ + xác nhận mẫu',
      disabled: !canCancelResult,
    },
    {
      key: 'collection',
      label: 'Bước 3: Hủy lấy mẫu',
      disabled: !canCancelCollection,
    },
  ];

  return (
    <>
      <Dropdown
        menu={{
          items,
          onClick: (e) => setPromptOpen(e.key as 'approval' | 'result' | 'collection'),
        }}
        trigger={['click']}
      >
        <Button size={buttonSize} icon={<UndoOutlined />} data-testid="lab-cancel-chain-btn">
          Hủy ngược <DownOutlined />
        </Button>
      </Dropdown>

      <Modal
        title={
          promptOpen === 'approval'
            ? 'Hủy duyệt kết quả'
            : promptOpen === 'result'
              ? 'Hủy kết quả + xác nhận mẫu'
              : 'Hủy lấy mẫu'
        }
        open={promptOpen !== null}
        onCancel={() => {
          setPromptOpen(null);
          form.resetFields();
        }}
        onOk={handleConfirm}
        okText="Xác nhận hủy"
        okButtonProps={{ danger: true }}
        cancelText="Đóng"
        data-testid="lab-cancel-chain-modal"
      >
        <p>
          Trạng thái hiện tại: <Tag color="blue">
            {currentStatus === 4 ? 'Đã duyệt' : currentStatus === 3 ? 'Đã có KQ' : currentStatus === 2 ? 'Đang xử lý' : currentStatus === 1 ? 'Đã lấy mẫu' : 'Chờ'}
          </Tag>
        </p>
        <Form form={form} layout="vertical">
          <Form.Item
            name="reason"
            label="Lý do"
            rules={[{ required: true, message: 'Bắt buộc ghi lý do hủy' }, { min: 10, message: 'Lý do tối thiểu 10 ký tự' }]}
          >
            <Input.TextArea rows={3} placeholder="VD: Nhầm BN, máy hỏng, mẫu bị nhiễm…" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
