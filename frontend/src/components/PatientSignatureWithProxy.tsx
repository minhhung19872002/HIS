/**
 * QW3.9 — Signature pad có hỗ trợ ký thay người thân.
 *
 * Wrap around existing `PatientSignaturePad`:
 * - Checkbox "Người bệnh không tự ký được → người thân ký thay"
 * - Khi bật: hiện form nhập Họ tên / CCCD / Quan hệ / Lý do của người thân
 * - onSave callback nhận cả signature base64 + proxy info (nếu có).
 */

import { useState } from 'react';
import { Card, Checkbox, Form, Input, Select, Space, Alert } from 'antd';
import PatientSignaturePad from './PatientSignaturePad';

export interface ProxySignerInfo {
  isProxy: boolean;
  signerName?: string;
  signerCccd?: string;
  signerRelation?: string;
  reason?: string;
}

interface Props {
  onSave?: (base64: string, proxy: ProxySignerInfo) => void;
  title?: string;
  disabled?: boolean;
  width?: number;
  height?: number;
}

const RELATION_OPTIONS = [
  { value: 'Con', label: 'Con' },
  { value: 'Cha/Mẹ', label: 'Cha / Mẹ' },
  { value: 'Chồng/Vợ', label: 'Chồng / Vợ' },
  { value: 'Anh/Chị/Em', label: 'Anh / Chị / Em' },
  { value: 'Ông/Bà', label: 'Ông / Bà' },
  { value: 'Người giám hộ', label: 'Người giám hộ hợp pháp' },
  { value: 'Khác', label: 'Khác (ghi rõ trong lý do)' },
];

export default function PatientSignatureWithProxy({ onSave, title = 'Chữ ký', disabled, width = 400, height = 200 }: Props) {
  const [isProxy, setIsProxy] = useState(false);
  const [form] = Form.useForm<{
    signerName: string;
    signerCccd: string;
    signerRelation: string;
    reason: string;
  }>();

  const handleSave = async (base64: string) => {
    if (isProxy) {
      try {
        const values = await form.validateFields();
        onSave?.(base64, {
          isProxy: true,
          signerName: values.signerName,
          signerCccd: values.signerCccd,
          signerRelation: values.signerRelation,
          reason: values.reason,
        });
      } catch {
        // Form validation failed — user sees inline errors
      }
    } else {
      onSave?.(base64, { isProxy: false });
    }
  };

  return (
    <Card title={title} size="small" data-testid="patient-signature-with-proxy">
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Checkbox
          checked={isProxy}
          onChange={(e) => setIsProxy(e.target.checked)}
          disabled={disabled}
          data-testid="proxy-toggle"
        >
          Bệnh nhân không thể tự ký — người thân ký thay
        </Checkbox>

        {isProxy && (
          <>
            <Alert
              type="warning"
              showIcon
              title="Ký thay chỉ được dùng khi BN hôn mê, sơ sinh, cao tuổi hoặc mất năng lực hành vi dân sự. Yêu cầu CCCD của người thân."
            />
            <Form form={form} layout="vertical" size="small">
              <Form.Item
                name="signerName"
                label="Họ tên người thân ký thay"
                rules={[{ required: true, message: 'Nhập họ tên người ký thay' }]}
              >
                <Input placeholder="VD: Nguyễn Văn A" />
              </Form.Item>
              <Form.Item
                name="signerCccd"
                label="Số CCCD người ký thay"
                rules={[
                  { required: true, message: 'Nhập CCCD người ký thay' },
                  { pattern: /^\d{9}$|^\d{12}$/, message: 'CCCD 9 hoặc 12 chữ số' },
                ]}
              >
                <Input placeholder="12 chữ số CCCD" maxLength={12} />
              </Form.Item>
              <Form.Item
                name="signerRelation"
                label="Quan hệ với bệnh nhân"
                rules={[{ required: true, message: 'Chọn quan hệ' }]}
              >
                <Select options={RELATION_OPTIONS} placeholder="Chọn quan hệ" />
              </Form.Item>
              <Form.Item
                name="reason"
                label="Lý do bệnh nhân không tự ký"
                rules={[{ required: true, message: 'Ghi rõ lý do' }]}
              >
                <Input.TextArea rows={2} placeholder="VD: BN hôn mê, BN sơ sinh..." />
              </Form.Item>
            </Form>
          </>
        )}

        <PatientSignaturePad
          onSave={handleSave}
          title={isProxy ? 'Chữ ký người thân' : 'Chữ ký bệnh nhân'}
          width={width}
          height={height}
          disabled={disabled}
        />
      </Space>
    </Card>
  );
}
