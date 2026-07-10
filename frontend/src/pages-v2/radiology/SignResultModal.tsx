import React, { useEffect, useState } from 'react';
import { App as AntdApp, Input } from 'antd';
import * as risApi from '../../modules/radiology/api/ris';
import { ModalShell, Btn, AbSelect } from '../_v2kit';
import TermIcon from '../../layouts/terminal/Icon';
import { FormRow, fmtDT, type ApiErr } from './_shared';

const SIGN_TYPES = [
  { id: 'USBToken', name: 'USB Token (chữ ký số CA)' },
  { id: 'SmartCA', name: 'SmartCA (VNPT/Viettel)' },
  { id: 'SignServer', name: 'SignServer (HSM tập trung)' },
  { id: 'eKYC', name: 'eKYC / OTP' },
];

/** Ký số báo cáo CĐHA — reportId = id của RadiologyResult (báo cáo đọc phim). */
export const SignResultModal: React.FC<{
  open: boolean;
  reportId: string | null;
  onClose: () => void;
  onSigned: () => void;
}> = ({ open, reportId, onClose, onSigned }) => {
  const { message } = AntdApp.useApp();
  const [signatureType, setSignatureType] = useState('USBToken');
  const [pin, setPin] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<risApi.SignatureHistoryDto[]>([]);

  useEffect(() => {
    if (!open || !reportId) return;
    setSignatureType('USBToken'); setPin(''); setOtp('');
    risApi.getSignatureHistory(reportId)
      .then((r) => setHistory(Array.isArray(r.data) ? r.data : []))
      .catch(() => setHistory([]));
  }, [open, reportId]);

  const needsPin = signatureType === 'USBToken' || signatureType === 'SignServer';
  const needsOtp = signatureType === 'SmartCA' || signatureType === 'eKYC';

  const submit = async () => {
    if (!reportId) return;
    if (needsPin && !pin.trim()) { message.warning('Nhập mã PIN của token/chứng thư'); return; }
    if (needsOtp && !otp.trim()) { message.warning('Nhập mã OTP'); return; }
    setBusy(true);
    try {
      const r = await risApi.signResult({
        reportId,
        signatureType,
        pin: pin.trim() || undefined,
        otp: otp.trim() || undefined,
      });
      if (r.data?.success) {
        message.success('Đã ký số báo cáo thành công');
        onSigned();
        onClose();
      } else {
        message.error(r.data?.message || 'Ký số thất bại');
      }
    } catch (e) {
      message.error((e as ApiErr)?.response?.data?.message || 'Ký số thất bại');
    } finally { setBusy(false); }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="sm"
      title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
        <TermIcon name="shield" size={14} /><span>Ký số báo cáo CĐHA</span>
      </span>}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
        <Btn variant="primary" onClick={submit} loading={busy} icon="check">Ký số</Btn>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
        <FormRow label="Hình thức ký">
          <AbSelect
            options={SIGN_TYPES}
            fieldNames={{ value: 'id', label: 'name' }}
            value={signatureType}
            onChange={setSignatureType}
            placeholder="— Chọn hình thức ký —"
          />
        </FormRow>
        {needsPin && (
          <FormRow label="Mã PIN">
            <Input.Password value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Mã PIN token / chứng thư" />
          </FormRow>
        )}
        {needsOtp && (
          <FormRow label="Mã OTP">
            <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Mã OTP nhận qua app/SMS" />
          </FormRow>
        )}
        {history.length > 0 && (
          <div className="rec-section" style={{ marginTop: 'var(--space-4)' }}>
            <h5><TermIcon name="check" size={11} /> ĐÃ KÝ ({history.length})</h5>
            {history.map((h) => (
              <div key={h.id} style={{ fontSize: 11.5, color: 'var(--t-2)', padding: '3px 0' }}>
                <b style={{ color: h.isValid ? 'var(--s-ok)' : 'var(--s-crit)' }}>{h.signedByName}</b>
                {' · '}{h.signatureType}{' · '}{fmtDT(h.signedTime)}
                {!h.isValid && <span style={{ color: 'var(--s-crit)' }}> · không hợp lệ</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </ModalShell>
  );
};
