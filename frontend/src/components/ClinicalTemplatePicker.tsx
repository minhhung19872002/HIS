/**
 * Template picker modal — dùng chung cho HSBA mẫu, PTTT mẫu, Kết luận mẫu, v.v.
 * Sprint 3 Item 2.1
 */

import { useEffect, useState } from 'react';
import { Modal, Input, List, Tag, Button, Space, Empty, Spin } from 'antd';
import { SearchOutlined, FileTextOutlined } from '@ant-design/icons';
import {
  searchTemplates,
  incrementTemplateUsage,
  TEMPLATE_TYPE_LABELS,
  type ClinicalTemplateDto,
} from '../api/clinicalTemplate';

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (template: ClinicalTemplateDto) => void;
  templateType: number;
  icdCode?: string;
  departmentId?: string;
  gender?: number;
  ageYears?: number;
}

export default function ClinicalTemplatePicker({
  open, onClose, onPick, templateType, icdCode, departmentId, gender, ageYears,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<ClinicalTemplateDto[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await searchTemplates({
        templateType,
        icdCode,
        departmentId,
        gender,
        ageYears,
        keyword: keyword || undefined,
        onlyActive: true,
        pageSize: 100,
      });
      setItems(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open, templateType, icdCode, departmentId]);

  const handlePick = async (t: ClinicalTemplateDto) => {
    incrementTemplateUsage(t.id).catch(() => {});
    onPick(t);
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          Chọn mẫu — {TEMPLATE_TYPE_LABELS[templateType]}
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnHidden
    >
      <Input
        prefix={<SearchOutlined />}
        placeholder="Tìm theo tên mẫu hoặc mã ICD"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        onPressEnter={load}
        style={{ marginBottom: 12 }}
      />
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : items.length === 0 ? (
        <Empty description="Chưa có mẫu phù hợp" />
      ) : (
        <List<ClinicalTemplateDto>
          dataSource={items}
          renderItem={(t) => (
            <List.Item
              actions={[
                <Button type="primary" size="small" onClick={() => handlePick(t)} key="pick">Dùng</Button>,
              ]}
              style={{ cursor: 'pointer' }}
              onDoubleClick={() => handlePick(t)}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <strong>{t.templateName}</strong>
                    {t.icdCode && <Tag color="blue">{t.icdCode}</Tag>}
                    {t.departmentName && <Tag>{t.departmentName}</Tag>}
                    {t.gender === 1 && <Tag color="geekblue">Nam</Tag>}
                    {t.gender === 2 && <Tag color="magenta">Nữ</Tag>}
                    {t.usageCount > 0 && <Tag color="green">Dùng {t.usageCount} lần</Tag>}
                  </Space>
                }
                description={
                  <div style={{ color: '#666', maxHeight: 60, overflow: 'hidden' }}>
                    {t.content.substring(0, 150)}{t.content.length > 150 ? '...' : ''}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Modal>
  );
}
