/**
 * Modal chia sẻ ca chụp DICOM — Sprint 4 Item 2.18.
 * BS set password + TTL + max views → gen link + QR → copy gửi BN/đồng nghiệp.
 */

import { useState } from 'react';
import { Modal, Form, Input, Select, Checkbox, Button, Space, Tag, message, InputNumber, Divider, Typography } from 'antd';
import { CopyOutlined, QrcodeOutlined, LinkOutlined } from '@ant-design/icons';
import { QRCodeCanvas } from 'qrcode.react';
import { createShareLink, type ShareLinkDto } from '../api/studyShare';

const { Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
  studyInstanceUID: string;
  orthancStudyId?: string;
  patientId?: string;
}

export default function ShareStudyModal({
  open, onClose, studyInstanceUID, orthancStudyId, patientId,
}: Props) {
  const [form] = Form.useForm<{
    usePassword: boolean;
    password?: string;
    hideDemographics: boolean;
    ttl: 'none' | '60' | '240' | '1440' | '10080';
    customTtl?: number;
    maxViews?: number;
  }>();
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<ShareLinkDto | null>(null);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const ttlMin = values.ttl === 'none' ? undefined
        : values.ttl ? parseInt(values.ttl, 10)
        : values.customTtl;
      const res = await createShareLink({
        studyInstanceUID,
        orthancStudyId,
        patientId,
        password: values.usePassword ? values.password : undefined,
        hideDemographics: values.hideDemographics,
        expiresInMinutes: ttlMin,
        maxViews: values.maxViews,
      });
      setLink(res);
      message.success('Đã tạo link chia sẻ');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      if (err?.response?.data?.message) message.error(err.response.data.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!link) return;
    navigator.clipboard.writeText(link.url).then(() => message.success('Đã copy link'));
  };

  const handleClose = () => {
    form.resetFields();
    setLink(null);
    onClose();
  };

  return (
    <Modal
      title={<Space><LinkOutlined /> Chia sẻ ca chụp DICOM</Space>}
      open={open}
      onCancel={handleClose}
      footer={
        link ? [
          <Button key="close" onClick={handleClose}>Đóng</Button>,
          <Button key="new" type="primary" onClick={() => setLink(null)}>Tạo link mới</Button>,
        ] : [
          <Button key="cancel" onClick={handleClose}>Hủy</Button>,
          <Button key="ok" type="primary" loading={loading} onClick={handleCreate}>
            Tạo link chia sẻ
          </Button>,
        ]
      }
      width={640}
      destroyOnHidden
    >
      {link ? (
        <div>
          <div style={{ marginBottom: 12 }}>
            <Text strong>Link chia sẻ:</Text>
            <Input.Group compact style={{ marginTop: 4 }}>
              <Input value={link.url} readOnly style={{ width: 'calc(100% - 110px)' }} />
              <Button icon={<CopyOutlined />} onClick={handleCopy}>Copy</Button>
            </Input.Group>
          </div>
          <Divider />
          <Space direction="vertical" align="center" style={{ width: '100%' }}>
            <Text strong><QrcodeOutlined /> Mã QR cho điện thoại/tablet:</Text>
            <div style={{ padding: 16, background: '#fff', border: '1px solid #eee' }}>
              <QRCodeCanvas value={link.url} size={220} level="M" includeMargin />
            </div>
          </Space>
          <Divider />
          <Space direction="vertical" style={{ width: '100%' }}>
            {link.hasPassword && <Tag color="volcano">Có mật khẩu</Tag>}
            {link.hideDemographics && <Tag color="gold">Ẩn thông tin BN</Tag>}
            {link.expiresAt && (
              <div>
                <Text type="secondary">Hết hạn: {new Date(link.expiresAt).toLocaleString('vi-VN')}</Text>
              </div>
            )}
            {link.maxViews != null && (
              <div>
                <Text type="secondary">Tối đa {link.maxViews} lượt xem</Text>
              </div>
            )}
          </Space>
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            usePassword: true,
            hideDemographics: false,
            ttl: '240',
          }}
        >
          <Form.Item name="usePassword" valuePropName="checked">
            <Checkbox>Bảo vệ bằng mật khẩu (khuyến nghị)</Checkbox>
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.usePassword !== cur.usePassword}>
            {({ getFieldValue }) =>
              getFieldValue('usePassword') && (
                <Form.Item
                  name="password"
                  label="Mật khẩu"
                  rules={[{ required: true, min: 4, message: 'Tối thiểu 4 ký tự' }]}
                >
                  <Input.Password placeholder="Mật khẩu BN cần nhập để mở link" />
                </Form.Item>
              )
            }
          </Form.Item>
          <Form.Item name="ttl" label="Thời gian hết hạn">
            <Select
              options={[
                { value: '60', label: '1 giờ' },
                { value: '240', label: '4 giờ' },
                { value: '1440', label: '1 ngày' },
                { value: '10080', label: '7 ngày' },
                { value: 'none', label: 'Không hết hạn (không khuyến nghị)' },
              ]}
            />
          </Form.Item>
          <Form.Item name="maxViews" label="Tối đa số lượt xem (tùy chọn)">
            <InputNumber style={{ width: '100%' }} min={1} placeholder="Bỏ trống = không giới hạn" />
          </Form.Item>
          <Form.Item name="hideDemographics" valuePropName="checked">
            <Checkbox>Ẩn thông tin BN (tên, mã, ngày sinh) khi xem qua link</Checkbox>
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
