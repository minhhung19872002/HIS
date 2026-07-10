import React, { useState, useEffect, useCallback } from 'react';
import {
  Button, Modal, Form, Input, Select, Tag, Space, message,
  Popconfirm, Switch, Card, Row, Col,
  Empty, Spin,
} from 'antd';
import {
  EditOutlined,
  PictureOutlined,
  DeleteOutlined, PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import * as emrMgmt from '../../../../api/emrManagement';
import type {
  EmrImageDto,
} from '../../../../api/emrManagement';

const { TextArea } = Input;

// ============ Tab 1: Chia se BA (Sharing B.1.2) ============

export const ImagesTab: React.FC = () => {
  const [images, setImages] = useState<EmrImageDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editingImage, setEditingImage] = useState<EmrImageDto | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await emrMgmt.getEmrImages();
      setImages(res.data || []);
    } catch {
      message.warning('Khong the tai thu vien hinh anh');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await emrMgmt.saveEmrImage({
        id: editingImage?.id,
        ...values,
        tags: values.tags?.join(','),
      });
      message.success(editingImage ? 'Cap nhat thanh cong' : 'Them hinh anh thanh cong');
      setModalOpen(false);
      fetchImages();
    } catch {
      message.warning('Khong the luu hinh anh');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await emrMgmt.deleteEmrImage(id);
      message.success('Da xoa');
      setImages(prev => prev.filter(i => i.id !== id));
    } catch {
      message.warning('Khong the xoa');
    }
  };

  const openModal = (img?: EmrImageDto) => {
    if (img) {
      setEditingImage(img);
      form.setFieldsValue({ ...img, tags: img.tags?.split(',').filter(Boolean) });
    } else {
      setEditingImage(null);
      form.resetFields();
    }
    setModalOpen(true);
  };

  const categoryOptions = [
    { value: 'anatomy', label: 'Giai phau' },
    { value: 'radiology', label: 'CDHA' },
    { value: 'pathology', label: 'Giai phau benh' },
    { value: 'clinical', label: 'Lam sang' },
    { value: 'diagram', label: 'So do' },
    { value: 'other', label: 'Khac' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 500 }}>Thu vien hinh anh EMR</span>
        <Space orientation="horizontal">
          <Button icon={<ReloadOutlined />} onClick={fetchImages}>Tai lai</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Them hinh anh</Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        {images.length === 0 ? (
          <Empty description="Chua co hinh anh trong thu vien" />
        ) : (
          <Row gutter={[12, 12]}>
            {images.map(img => (
              <Col key={img.id} xs={12} sm={8} md={6}>
                <Card
                  size="small"
                  hoverable
                  cover={img.imageData ? (
                    <div style={{ height: 120, overflow: 'hidden', cursor: 'pointer', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => { setPreviewImage(img.imageData || ''); setPreviewOpen(true); }}>
                      <img src={img.imageData} alt={img.title} style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain' }} />
                    </div>
                  ) : (
                    <div style={{ height: 120, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PictureOutlined style={{ fontSize: 36, color: '#ccc' }} />
                    </div>
                  )}
                  actions={[
                    <EditOutlined key="edit" onClick={() => openModal(img)} />,
                    <Popconfirm key="del" title="Xoa hinh anh?" onConfirm={() => handleDelete(img.id)}>
                      <DeleteOutlined />
                    </Popconfirm>,
                  ]}
                >
                  <Card.Meta
                    title={<span style={{ fontSize: 12 }}>{img.title}</span>}
                    description={
                      <div style={{ fontSize: 11 }}>
                        {img.category && <Tag style={{ fontSize: 10 }}>{categoryOptions.find(c => c.value === img.category)?.label || img.category}</Tag>}
                        {img.isShared && <Tag color="blue" style={{ fontSize: 10 }}>Chia se</Tag>}
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      <Modal title={editingImage ? 'Chinh sua hinh anh' : 'Them hinh anh'} open={modalOpen}
        onOk={handleSave} onCancel={() => setModalOpen(false)} okText="Luu" cancelText="Huy" width={500}>
        <Form form={form} layout="vertical" size="small">
          <Form.Item name="title" label="Tieu de" rules={[{ required: true, message: 'Nhap tieu de' }]}>
            <Input placeholder="Ten hinh anh" />
          </Form.Item>
          <Form.Item name="description" label="Mo ta">
            <TextArea rows={2} placeholder="Mo ta hinh anh..." />
          </Form.Item>
          <Form.Item name="category" label="Danh muc">
            <Select placeholder="Chon danh muc" options={categoryOptions} allowClear />
          </Form.Item>
          <Form.Item name="tags" label="The (tags)">
            <Select mode="tags" placeholder="Nhap tag va nhan Enter" />
          </Form.Item>
          <Form.Item name="imageData" label="Hinh anh (base64)">
            <TextArea rows={3} placeholder="Paste base64 image data tai day (data:image/png;base64,...)" />
          </Form.Item>
          <Form.Item name="isShared" label="Chia se voi tat ca" valuePropName="checked">
            <Switch checkedChildren="Co" unCheckedChildren="Khong" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={previewOpen} footer={null} onCancel={() => setPreviewOpen(false)} width={700}>
        <img src={previewImage} alt="Preview" style={{ width: '100%' }} />
      </Modal>
    </div>
  );
};

// ============ Tab 5: Ma tat (Shortcodes B.1.22) ============
