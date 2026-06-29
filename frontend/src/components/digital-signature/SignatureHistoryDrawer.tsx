/**
 * #84 — Drawer lịch sử ký số + ký/hủy ký per y lệnh.
 * Dùng cho mọi màn hình cần hiển thị lịch sử chữ ký của 1 HSBA.
 *
 * Props:
 *   medicalRecordId — ID hồ sơ bệnh án
 *   documentType    — lọc theo loại tài liệu (rỗng = tất cả)
 *   open / onClose  — điều khiển drawer
 *   currentDocumentId + currentDocumentType — nếu có: hiển thị nút Ký / Hủy ký
 *     cho tài liệu đang xem (y lệnh cụ thể)
 */

import { useState, useEffect, useCallback } from 'react';
import { Drawer, Table, Tag, Button, Modal, Input, Space, Typography, Tooltip, message } from 'antd';
import {
  SafetyCertificateOutlined,
  StopOutlined,
  ReloadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getRecordSignatures,
  signOrder,
  revokeOrder,
  downloadSignedPdf,
  getSessionStatus,
  type DocumentSignatureHistoryDto,
  type SignDocumentRequest,
} from '../../api/digitalSignature';

const { Text } = Typography;

interface Props {
  medicalRecordId: string;
  documentType?: string;
  open: boolean;
  onClose: () => void;
  /** ID y lệnh cụ thể để hiện nút Ký / Hủy ký */
  currentDocumentId?: string;
  currentDocumentType?: string;
}

export default function SignatureHistoryDrawer({
  medicalRecordId,
  documentType,
  open,
  onClose,
  currentDocumentId,
  currentDocumentType,
}: Props) {
  const [rows, setRows] = useState<DocumentSignatureHistoryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);

  // Ký y lệnh
  const [pinVisible, setPinVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [signing, setSigning] = useState(false);

  // Hủy ký
  const [revokeVisible, setRevokeVisible] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(async () => {
    if (!medicalRecordId) return;
    setLoading(true);
    try {
      const res = await getRecordSignatures(medicalRecordId, documentType);
      setRows(res.data);
    } catch (err) {
      message.warning('Không thể tải lịch sử ký');
    } finally {
      setLoading(false);
    }
  }, [medicalRecordId, documentType]);

  const checkSession = useCallback(async () => {
    try {
      const status = await getSessionStatus();
      setSessionActive(status.data.active);
    } catch {
      setSessionActive(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      load();
      checkSession();
    }
  }, [open, load, checkSession]);

  // ── Ký y lệnh ──
  const handleSign = async () => {
    if (!currentDocumentId || !currentDocumentType) return;
    setSigning(true);
    try {
      const req: SignDocumentRequest = {
        documentId: currentDocumentId,
        documentType: currentDocumentType,
        pin: pin || undefined,
        reason: 'Ký xác nhận y lệnh',
        location: 'Việt Nam',
      };
      const res = (await signOrder(req)).data;
      if (res.success) {
        message.success(`Ký số thành công — ${res.signerName ?? ''}`);
        setPinVisible(false);
        setPin('');
        await load();
      } else {
        message.error(res.message ?? 'Ký số thất bại');
      }
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Lỗi ký số');
    } finally {
      setSigning(false);
    }
  };

  // ── Hủy ký ──
  const openRevoke = (sigId: string) => {
    setRevokeTarget(sigId);
    setRevokeReason('');
    setRevokeVisible(true);
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await revokeOrder(revokeTarget, revokeReason || 'Người dùng yêu cầu hủy ký');
      message.success('Đã hủy chữ ký');
      setRevokeVisible(false);
      setRevokeTarget(null);
      await load();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Hủy ký thất bại');
    } finally {
      setRevoking(false);
    }
  };

  const columns: ColumnsType<DocumentSignatureHistoryDto> = [
    {
      title: 'Loại tài liệu',
      dataIndex: 'documentType',
      width: 140,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Người ký',
      dataIndex: 'signerName',
      ellipsis: true,
    },
    {
      title: 'Ngày ký',
      dataIndex: 'signedAt',
      width: 155,
    },
    {
      title: 'CA',
      dataIndex: 'caProvider',
      width: 100,
      ellipsis: true,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 115,
      render: (s: number, row) =>
        s === 0 ? (
          <Tag color="success" icon={<SafetyCertificateOutlined />}>
            Hiệu lực
          </Tag>
        ) : (
          <Tooltip title={row.revokeReason}>
            <Tag color="error" icon={<StopOutlined />}>
              Đã thu hồi
            </Tag>
          </Tooltip>
        ),
    },
    {
      title: '',
      key: 'actions',
      width: 90,
      render: (_: unknown, row) => (
        <Space size={4}>
          {row.signedDocumentUrl && (
            <Tooltip title="Tải PDF đã ký">
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => downloadSignedPdf(row.id)}
              />
            </Tooltip>
          )}
          {row.status === 0 && (
            <Tooltip title="Hủy ký">
              <Button
                size="small"
                danger
                icon={<StopOutlined />}
                onClick={() => openRevoke(row.id)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const activeSignature =
    currentDocumentId && rows.find((r) => r.documentId === currentDocumentId && r.status === 0);

  return (
    <>
      <Drawer
        title="Lịch sử ký số"
        placement="right"
        size="large"
        open={open}
        onClose={onClose}
        extra={
          <Button icon={<ReloadOutlined />} size="small" onClick={load} loading={loading}>
            Làm mới
          </Button>
        }
      >
        {/* Nút ký / hủy ký cho y lệnh hiện tại */}
        {currentDocumentId && currentDocumentType && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Y lệnh hiện tại ({currentDocumentType})
            </Text>
            <Space>
              {!activeSignature ? (
                <Button
                  type="primary"
                  icon={<SafetyCertificateOutlined />}
                  onClick={() => setPinVisible(true)}
                >
                  Ký số y lệnh này
                </Button>
              ) : (
                <>
                  <Tag color="success" icon={<SafetyCertificateOutlined />}>
                    Đã ký — {activeSignature.signerName}
                  </Tag>
                  <Button
                    danger
                    size="small"
                    icon={<StopOutlined />}
                    onClick={() => openRevoke(activeSignature.id)}
                  >
                    Hủy ký
                  </Button>
                </>
              )}
              {!sessionActive && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  (Cần mở phiên ký số trước)
                </Text>
              )}
            </Space>
          </div>
        )}

        <Table
          columns={columns}
          dataSource={rows}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 20, showSizeChanger: false }}
          locale={{ emptyText: 'Chưa có chữ ký nào' }}
        />
      </Drawer>

      {/* Modal nhập PIN để ký */}
      <Modal
        title="Ký số y lệnh"
        open={pinVisible}
        onCancel={() => setPinVisible(false)}
        onOk={handleSign}
        okText="Ký ngay"
        cancelText="Hủy"
        confirmLoading={signing}
        destroyOnHidden
      >
        {sessionActive ? (
          <Text>Phiên ký số đang hoạt động — ký ngay không cần PIN?</Text>
        ) : (
          <>
            <Text>Nhập PIN USB Token để ký:</Text>
            <Input.Password
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              style={{ marginTop: 8 }}
              onPressEnter={handleSign}
              autoFocus
            />
          </>
        )}
      </Modal>

      {/* Modal nhập lý do hủy ký */}
      <Modal
        title="Hủy chữ ký số"
        open={revokeVisible}
        onCancel={() => setRevokeVisible(false)}
        onOk={handleRevoke}
        okText="Xác nhận hủy ký"
        okButtonProps={{ danger: true }}
        cancelText="Đóng"
        confirmLoading={revoking}
        destroyOnHidden
      >
        <Text>Lý do hủy ký (tùy chọn):</Text>
        <Input.TextArea
          value={revokeReason}
          onChange={(e) => setRevokeReason(e.target.value)}
          rows={3}
          placeholder="VD: Sửa lại nội dung y lệnh"
          style={{ marginTop: 8 }}
          autoFocus
        />
      </Modal>
    </>
  );
}
