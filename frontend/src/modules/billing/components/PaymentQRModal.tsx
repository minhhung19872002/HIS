import { useCallback, useEffect, useRef, useState } from 'react';
import { fmtDateTime } from '../../../utils/format';
import { Modal, Radio, Button, Statistic, Alert, Space, Result, Tag, message, Popconfirm } from 'antd';
import { QRCodeCanvas } from 'qrcode.react';
import {
  createPaymentUrl,
  getTransactionById,
  isBankProvider,
  type PaymentProvider,
  type PaymentTransactionDto,
  type PaymentUrlResponse,
} from '../api/paymentGateway';
import { createDynamicQr, type DynamicQrReferenceType } from '../../../api/nangcap25';
import { bankPaymentApi } from '../../../api/nangcap24';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: (txn: PaymentTransactionDto) => void;
  patientId: string;
  patientName?: string;
  amount: number;
  orderInfo?: string;
  orderType?: string;
  invoiceSummaryId?: string;
  medicalRecordId?: string;
  /** NangCap25: chế độ QR động gắn nguồn nghiệp vụ — BE tự tính tiền + cập nhật nguồn khi paid */
  referenceType?: DynamicQrReferenceType;
  referenceId?: string;
  /** Số tiền cho referenceType=deposit (các loại khác BE tự tính) */
  referenceAmount?: number;
  defaultProvider?: PaymentProvider;
}

export default function PaymentQRModal({
  open,
  onClose,
  onSuccess,
  patientId,
  patientName,
  amount,
  orderInfo,
  orderType = 'billing',
  invoiceSummaryId,
  medicalRecordId,
  referenceType,
  referenceId,
  referenceAmount,
  defaultProvider = 'vcb',
}: Props) {
  const [provider, setProvider] = useState<PaymentProvider>(defaultProvider);
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [payment, setPayment] = useState<PaymentUrlResponse | null>(null);
  const [txn, setTxn] = useState<PaymentTransactionDto | null>(null);
  const pollRef = useRef<number | null>(null);

  const clearPoll = () => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    if (!open) {
      clearPoll();
      setPayment(null);
      setTxn(null);
      setCreating(false);
      setConfirming(false);
    }
    return clearPoll;
  }, [open]);

  const startPolling = useCallback((transactionId: string) => {
    clearPoll();
    pollRef.current = window.setInterval(async () => {
      try {
        const data = await getTransactionById(transactionId);
        setTxn(data);
        if (data.status === 1 || data.status === 2 || data.status === 4) {
          clearPoll();
          if (data.status === 1) {
            message.success('Thanh toán thành công');
            onSuccess?.(data);
          } else if (data.status === 4) {
            message.warning('Phiên thanh toán đã hết hạn');
          }
        }
      } catch {
        // swallow — polling error tolerant
      }
    }, 3000);
  }, [onSuccess]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      let res: PaymentUrlResponse;
      if (referenceType && referenceId) {
        // QR động gắn nguồn — số tiền do BE tính (deposit truyền amount chỉ định)
        res = await createDynamicQr({
          referenceType,
          referenceId,
          amount: referenceType === 'deposit' ? referenceAmount : undefined,
          provider,
          orderInfo,
        });
      } else {
        res = await createPaymentUrl({
          provider,
          patientId,
          medicalRecordId,
          invoiceSummaryId,
          amount,
          orderType,
          orderInfo: orderInfo || `Thanh toán HIS - ${patientName || patientId}`,
        });
      }
      setPayment(res);
      startPolling(res.transactionId);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; error?: { message?: string } } } };
      message.error(
        error?.response?.data?.message
        || error?.response?.data?.error?.message
        || 'Không tạo được phiên thanh toán',
      );
    } finally {
      setCreating(false);
    }
  };

  // Bank VietQR không có IPN — thu ngân xác nhận sau khi thấy tiền vào tài khoản
  const handleManualConfirm = async () => {
    if (!payment) return;
    setConfirming(true);
    try {
      await bankPaymentApi.confirmTransfer({ transactionId: payment.transactionId, note: 'Xác nhận tại quầy (QR động)' });
      const data = await getTransactionById(payment.transactionId);
      clearPoll();
      setTxn(data);
      if (data.status === 1) {
        message.success('Đã xác nhận nhận tiền');
        onSuccess?.(data);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || 'Xác nhận thất bại');
    } finally {
      setConfirming(false);
    }
  };

  const handleOpenInBrowser = () => {
    if (payment?.paymentUrl) window.open(payment.paymentUrl, '_blank', 'noopener');
  };

  const renderContent = () => {
    if (txn?.status === 1) {
      return (
        <Result
          status="success"
          title="Thanh toán thành công"
          subTitle={`Mã giao dịch: ${txn.gatewayTxnRef || txn.txnRef}`}
          extra={[
            <Button key="close" type="primary" onClick={onClose}>Đóng</Button>,
          ]}
        />
      );
    }

    if (txn?.status === 2) {
      return (
        <Result
          status="error"
          title="Thanh toán thất bại"
          subTitle={txn.responseMessage || 'Giao dịch không thành công'}
          extra={[
            <Button key="retry" type="primary" onClick={() => { setTxn(null); setPayment(null); }}>
              Thử lại
            </Button>,
            <Button key="close" onClick={onClose}>Đóng</Button>,
          ]}
        />
      );
    }

    if (txn?.status === 4) {
      return (
        <Result
          status="warning"
          title="Phiên thanh toán hết hạn"
          extra={[
            <Button key="retry" type="primary" onClick={() => { setTxn(null); setPayment(null); }}>
              Tạo phiên mới
            </Button>,
            <Button key="close" onClick={onClose}>Đóng</Button>,
          ]}
        />
      );
    }

    if (payment) {
      const bank = isBankProvider(payment.provider);
      return (
        <div style={{ textAlign: 'center' }}>
          <Alert
            title="Quét mã QR để thanh toán"
            description={bank
              ? 'Mở ứng dụng ngân hàng bất kỳ, quét mã VietQR để chuyển khoản. Sau khi tiền vào tài khoản BV, thu ngân/kế toán bấm "Đã nhận tiền" để xác nhận.'
              : 'Mở ứng dụng ngân hàng hoặc ví điện tử, quét mã để hoàn tất giao dịch. Hệ thống tự động cập nhật trạng thái sau khi nhận được IPN từ cổng thanh toán.'}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <div style={{ display: 'inline-block', padding: 16, background: '#fff', border: '1px solid #f0f0f0' }}>
            <QRCodeCanvas value={payment.qrCodeContent || payment.paymentUrl} size={240} level="M" includeMargin />
          </div>
          <div style={{ marginTop: 16 }}>
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
              <div>
                <Tag color="blue">Provider: {payment.provider.toUpperCase()}</Tag>
                <Tag>Mã giao dịch: {payment.txnRef}</Tag>
              </div>
              <Statistic title="Số tiền" value={payment.amount} suffix="đ" precision={0} />
              <div style={{ color: '#999', fontSize: 12 }}>
                Hết hạn sau: {fmtDateTime(payment.expiresAt)}
              </div>
              {bank ? (
                <Popconfirm
                  title="Xác nhận đã nhận đủ tiền vào tài khoản BV?"
                  okText="Đã nhận"
                  cancelText="Chưa"
                  onConfirm={handleManualConfirm}
                >
                  <Button block type="primary" loading={confirming}>
                    Đã nhận tiền — xác nhận thủ công
                  </Button>
                </Popconfirm>
              ) : (
                <Button block type="link" onClick={handleOpenInBrowser}>
                  Hoặc mở trang thanh toán trong trình duyệt
                </Button>
              )}
            </Space>
          </div>
        </div>
      );
    }

    return (
      <div>
        <Alert
          title="Chọn phương thức thanh toán"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Radio.Group value={provider} onChange={(e) => setProvider(e.target.value)}>
          <Space orientation="vertical" size="middle">
            <Radio value="vcb">
              <strong>VietQR Vietcombank</strong> — QR động, quét bằng mọi app ngân hàng
            </Radio>
            <Radio value="vnpay">
              <strong>VNPay QR</strong> — VCB, TCB, BIDV, VietinBank, MB, VPBank, ACB...
            </Radio>
            <Radio value="momo">
              <strong>MoMo</strong> — Ví điện tử MoMo
            </Radio>
            <Radio value="zalopay">
              <strong>ZaloPay</strong> — Ví điện tử ZaloPay
            </Radio>
          </Space>
        </Radio.Group>
        <div style={{ marginTop: 24 }}>
          <Statistic title="Số tiền cần thanh toán" value={amount} suffix="đ" precision={0} />
          {patientName && <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>Bệnh nhân: {patientName}</div>}
        </div>
      </div>
    );
  };

  return (
    <Modal
      title="Thanh toán không dùng tiền mặt"
      open={open}
      onCancel={onClose}
      footer={
        !payment && !txn
          ? [
              <Button key="cancel" onClick={onClose}>Hủy</Button>,
              <Button key="ok" type="primary" loading={creating} onClick={handleCreate} disabled={amount <= 0 && !referenceType}>
                Tạo mã QR thanh toán
              </Button>,
            ]
          : null
      }
      width={520}
      destroyOnHidden
    >
      {renderContent()}
    </Modal>
  );
}
