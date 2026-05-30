import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space, message,
  Popconfirm, Switch, Card, Row, Col,
  Alert,
} from 'antd';
import {
  EditOutlined,
  WarningOutlined, DeleteOutlined, PlusOutlined,
  ReloadOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import * as emrMgmt from '../../api/emrManagement';
import type {
  AutoCheckRuleDto, AutoCheckViolationDto,
} from '../../api/emrManagement';

const { TextArea } = Input;

// ============ Tab 1: Chia se BA (Sharing B.1.2) ============

export const AutoCheckTab: React.FC = () => {
  const [rules, setRules] = useState<AutoCheckRuleDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editingRule, setEditingRule] = useState<AutoCheckRuleDto | null>(null);
  const [checkExamId, setCheckExamId] = useState('');
  const [violations, setViolations] = useState<AutoCheckViolationDto[]>([]);
  const [checking, setChecking] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await emrMgmt.getAutoCheckRules();
      setRules(res.data || []);
    } catch {
      message.warning('Khong the tai danh sach quy tac');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await emrMgmt.saveAutoCheckRule({ id: editingRule?.id, ...values });
      message.success(editingRule ? 'Cap nhat thanh cong' : 'Them quy tac thanh cong');
      setModalOpen(false);
      fetchRules();
    } catch {
      message.warning('Khong the luu quy tac');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await emrMgmt.deleteAutoCheckRule(id);
      message.success('Da xoa');
      setRules(prev => prev.filter(r => r.id !== id));
    } catch {
      message.warning('Khong the xoa');
    }
  };

  const handleRunCheck = async () => {
    if (!checkExamId) { message.warning('Vui long nhap ma kham'); return; }
    setChecking(true);
    try {
      const res = await emrMgmt.runAutoCheck(checkExamId);
      const data = res.data;
      const nextViolations = Array.isArray(data?.violations) ? data.violations : [];
      setViolations(nextViolations);
      if (nextViolations.length === 0) {
        message.success('Khong phat hien thieu sot!');
      }
    } catch {
      message.warning('Khong the chay kiem tra');
    } finally {
      setChecking(false);
    }
  };

  const openModal = (rule?: AutoCheckRuleDto) => {
    if (rule) {
      setEditingRule(rule);
      form.setFieldsValue(rule);
    } else {
      setEditingRule(null);
      form.resetFields();
      form.setFieldsValue({ severity: 'Warning', isActive: true, ruleType: 'RequiredField' });
    }
    setModalOpen(true);
  };

  const severityColors: Record<string, string> = { Error: 'red', Warning: 'orange', Info: 'blue' };

  return (
    <div>
      <Card size="small" title="Kiem tra thieu sot benh an" style={{ marginBottom: 12 }}>
        <Space orientation="horizontal">
          <Input placeholder="Ma kham (Examination ID)" value={checkExamId}
            onChange={e => setCheckExamId(e.target.value)} style={{ width: 300 }}
            onPressEnter={handleRunCheck} />
          <Button type="primary" icon={<SafetyOutlined />} loading={checking} onClick={handleRunCheck}>
            Chay kiem tra
          </Button>
        </Space>
        {violations.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Alert title={`Phat hien ${violations.length} thieu sot`} type="warning" showIcon style={{ marginBottom: 8 }} />
            <Table size="small" dataSource={violations} rowKey={(_, i) => `v-${i}`} pagination={false}
              columns={[
                { title: 'Muc do', dataIndex: 'severity', key: 'sev', width: 90,
                  render: (v: string) => <Tag color={severityColors[v] || 'default'}>
                    {v === 'Error' ? <><WarningOutlined /> Loi</> : v === 'Warning' ? <><WarningOutlined /> Canh bao</> : 'Thong tin'}
                  </Tag> },
                { title: 'Bieu mau', dataIndex: 'formType', key: 'form', width: 130 },
                { title: 'Truong', dataIndex: 'fieldName', key: 'field', width: 130 },
                { title: 'Noi dung', dataIndex: 'message', key: 'msg' },
              ]}
            />
          </div>
        )}
      </Card>

      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 500 }}>Danh sach quy tac kiem tra</span>
        <Space orientation="horizontal">
          <Button icon={<ReloadOutlined />} onClick={fetchRules}>Tai lai</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Them quy tac</Button>
        </Space>
      </div>

      <Table
        size="small" loading={loading} dataSource={rules} rowKey="id"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        columns={[
          { title: 'Ten quy tac', dataIndex: 'name', key: 'name', width: 180, ellipsis: true },
          { title: 'Loai', dataIndex: 'ruleType', key: 'type', width: 100,
            render: (v: string) => <Tag>{v}</Tag> },
          { title: 'Bieu mau', dataIndex: 'formType', key: 'form', width: 120 },
          { title: 'Muc do', dataIndex: 'severity', key: 'sev', width: 90,
            render: (v: string) => <Tag color={severityColors[v] || 'default'}>{v === 'Error' ? 'Loi' : v === 'Warning' ? 'Canh bao' : 'Thong tin'}</Tag> },
          { title: 'Thong bao loi', dataIndex: 'errorMessage', key: 'err', ellipsis: true },
          { title: 'Trang thai', dataIndex: 'isActive', key: 'active', width: 80,
            render: (v: boolean) => v ? <Tag color="green">Hoat dong</Tag> : <Tag>Tat</Tag> },
          { title: '', key: 'actions', width: 80,
            render: (_: unknown, r: AutoCheckRuleDto) => (
              <Space orientation="horizontal" size={4}>
                <Button size="small" icon={<EditOutlined />} onClick={() => openModal(r)} />
                <Popconfirm title="Xoa quy tac?" onConfirm={() => handleDelete(r.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal title={editingRule ? 'Chinh sua quy tac' : 'Them quy tac'} open={modalOpen}
        onOk={handleSave} onCancel={() => setModalOpen(false)} okText="Luu" cancelText="Huy" width={550}>
        <Form form={form} layout="vertical" size="small">
          <Form.Item name="name" label="Ten quy tac" rules={[{ required: true, message: 'Nhap ten quy tac' }]}>
            <Input placeholder="VD: Bat buoc nhap chan doan" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="ruleType" label="Loai quy tac" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="RequiredField">Bat buoc truong</Select.Option>
                  <Select.Option value="RequiredForm">Bat buoc bieu mau</Select.Option>
                  <Select.Option value="RequiredSignature">Bat buoc chu ky</Select.Option>
                  <Select.Option value="DataValidation">Kiem tra du lieu</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="formType" label="Bieu mau ap dung">
                <Select allowClear placeholder="Tat ca">
                  <Select.Option value="examination">Kham benh</Select.Option>
                  <Select.Option value="treatment-sheet">Phieu dieu tri</Select.Option>
                  <Select.Option value="consultation">Hoi chan</Select.Option>
                  <Select.Option value="nursing-care">Cham soc</Select.Option>
                  <Select.Option value="prescription">Don thuoc</Select.Option>
                  <Select.Option value="discharge">Ra vien</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="severity" label="Muc do" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="Error">Loi (chan)</Select.Option>
                  <Select.Option value="Warning">Canh bao</Select.Option>
                  <Select.Option value="Info">Thong tin</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="fieldName" label="Ten truong">
            <Input placeholder="VD: mainIcdCode, chiefComplaint, conclusion" />
          </Form.Item>
          <Form.Item name="condition" label="Dieu kien" rules={[{ required: true, message: 'Nhap dieu kien' }]}>
            <Input placeholder="VD: NOT_EMPTY, LENGTH > 10, MATCHES [A-Z]\\d+" />
          </Form.Item>
          <Form.Item name="errorMessage" label="Thong bao loi" rules={[{ required: true, message: 'Nhap thong bao loi' }]}>
            <TextArea rows={2} placeholder="Thong bao hien khi vi pham quy tac" />
          </Form.Item>
          <Form.Item name="isActive" label="Trang thai" valuePropName="checked">
            <Switch checkedChildren="Hoat dong" unCheckedChildren="Tat" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// ============ Main Component ============
