import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp, Input } from 'antd';
import * as receptionApi from '../api/reception';
import { getInsuranceHistory } from '../../insurance/api/insurance';
import type { InsuranceHistoryDto } from '../../insurance/api/insurance';
import { StatusBadge, ModalShell } from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
export const BhytVerifyModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { message } = AntdApp.useApp();
  const [num, setNum] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<receptionApi.InsuranceVerificationResultDto | null>(null);
  // Lịch sử KCB từ cổng BHXH (port v1 handleViewBhxhHistory — insuranceApi.getInsuranceHistory)
  const [history, setHistory] = useState<InsuranceHistoryDto | null>(null);
  const [histBusy, setHistBusy] = useState(false);
  const [histOpen, setHistOpen] = useState(false);
  // NangCap26 (Liên thông XIX.1 #1) — cảnh báo lạm dụng thẻ (KCB nhiều lần)
  const [abuse, setAbuse] = useState<receptionApi.CardAbuseCheckResultDto | null>(null);
  const [abuseDetail, setAbuseDetail] = useState(false);

  useEffect(() => {
    if (open) { setNum(''); setName(''); setResult(null); setHistory(null); setHistOpen(false); setAbuse(null); setAbuseDetail(false); }
  }, [open]);

  const verify = async () => {
    if (!num.trim() || num.trim().length < 10) { message.warning('Nhập số thẻ BHYT hợp lệ'); return; }
    setBusy(true);
    setHistory(null); setHistOpen(false); setAbuse(null); setAbuseDetail(false);
    try {
      const res = await receptionApi.verifyInsurance({ insuranceNumber: num.trim(), patientName: name.trim() || undefined });
      setResult(res.data);
      // Kiểm tra lạm dụng chạy kèm — lỗi ở đây KHÔNG được chặn luồng tra cứu thẻ.
      try {
        const card = res.data?.newInsuranceNumber || res.data?.insuranceNumber || num.trim();
        const ab = await receptionApi.checkCardAbuse(card);
        setAbuse(ab.data);
      } catch (e) { console.warn('[async] kiểm tra lạm dụng thẻ thất bại:', e); }
    } catch {
      message.error('Tra cứu BHYT thất bại');
    } finally {
      setBusy(false);
    }
  };

  const viewHistory = async () => {
    // Ưu tiên số thẻ đã CHUẨN HÓA từ kết quả xác minh (gateway có thể trả
    // newInsuranceNumber cho thẻ cũ/thẻ 20 số) — parity v1 handleViewBhxhHistory.
    const insuranceNumber = result?.newInsuranceNumber || result?.insuranceNumber || num.trim();
    if (!insuranceNumber) return;
    setHistBusy(true);
    setHistOpen(true);
    try {
      const res = await getInsuranceHistory(insuranceNumber);
      setHistory(res.data);
    } catch {
      setHistory(null);
      message.warning('Không thể tải lịch sử KCB');
    } finally {
      setHistBusy(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="md"
      title="Tra cứu thẻ BHYT"
      footer={(
        <>
          <button type="button" className="ab-btn ghost" onClick={onClose}>Đóng</button>
          <button type="button" className="ab-btn primary" disabled={busy} onClick={verify}>
            <TermIcon name="shield" size={12} /> {busy ? 'Đang tra…' : 'Tra cứu'}
          </button>
        </>
      )}
    >
      <div style={{ padding: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>Số thẻ BHYT *</div>
            <Input value={num} onChange={(e) => setNum(e.target.value)} placeholder="VD: HC4010112345678" onPressEnter={verify} />
          </div>
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>Họ tên (tùy chọn)</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Đối chiếu tên" />
          </div>
        </div>

        {result && (
          <div className="rec-section" style={{ marginTop: 'var(--space-16)' }}>
            <h5>
              <TermIcon name={result.isValid ? 'check' : 'x'} size={11} /> KẾT QUẢ
              <span style={{ marginLeft: 'var(--space-8)' }}>
                <StatusBadge tone={result.isValid && !result.isExpired ? 'ok' : 'crit'} dot>
                  {result.isBlacklisted ? 'Thẻ bị khóa' : result.isExpired ? 'Hết hạn' : result.isValid ? 'Hợp lệ' : 'Không hợp lệ'}
                </StatusBadge>
              </span>
            </h5>
            <div className="rec-kv">
              <span>Số thẻ</span><span className="mono">{result.newInsuranceNumber || result.insuranceNumber}</span>
              <span>Họ tên</span><b>{result.patientName || '—'}</b>
              {result.facilityName && (<><span>Nơi KCB</span><span>{result.facilityName}</span></>)}
              {result.endDate && (<><span>Giá trị đến</span><span className="mono">{dayjs(result.endDate).format('DD/MM/YYYY')}</span></>)}
              <span>Tuyến</span><span>{result.rightRouteName || '—'}</span>
              <span>Mức hưởng</span><b>{result.paymentRate || 0}%</b>
            </div>
            {result.warnings?.length > 0 && (
              <div style={{ marginTop: 'var(--space-8)', fontSize: 'var(--fs-sm)', color: 'var(--s-warn)' }}>
                {result.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
              </div>
            )}
            {result.errorMessage && (
              <div style={{ marginTop: 'var(--space-8)', fontSize: 'var(--fs-sm)', color: 'var(--s-crit)' }}>{result.errorMessage}</div>
            )}
            <div style={{ marginTop: 'var(--space-10)' }}>
              <button type="button" className="ab-btn ghost sm" disabled={histBusy} onClick={viewHistory}>
                <TermIcon name="clock" size={11} /> {histBusy ? 'Đang tải…' : 'Xem lịch sử KCB'}
              </button>
            </div>
          </div>
        )}

        {/* NangCap26 — cảnh báo lạm dụng thẻ BHYT (chỉ cảnh báo, KHÔNG chặn tiếp nhận) */}
        {abuse && abuse.alertLevel > 0 && (
          <div className="rec-section" style={{ marginTop: 'var(--space-12)' }}>
            <h5>
              <TermIcon name="alert" size={11} /> CẢNH BÁO LẠM DỤNG THẺ
              <span style={{ marginLeft: 'var(--space-8)' }}>
                <StatusBadge tone={abuse.alertLevel === 2 ? 'crit' : 'warn'} dot>{abuse.alertLevelName}</StatusBadge>
              </span>
            </h5>
            <div style={{ fontSize: 'var(--fs-sm)', color: abuse.alertLevel === 2 ? 'var(--s-crit)' : 'var(--s-warn)' }}>
              {abuse.message}
            </div>
            <div className="rec-kv" style={{ marginTop: 'var(--space-8)' }}>
              <span>Lượt hôm nay</span><b className="mono">{abuse.visitsToday} / {abuse.thresholdPerDay}</b>
              <span>Lượt {abuse.periodDays} ngày</span><b className="mono">{abuse.visitsInPeriod} / {abuse.thresholdPerPeriod}</b>
              <span>Số cơ sở</span><b className="mono">{abuse.distinctFacilities} / {abuse.thresholdFacilities}</b>
            </div>
            <div style={{ marginTop: 'var(--space-8)', fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
              Đây là cảnh báo tham khảo — quyết định tiếp nhận vẫn thuộc về nhân viên y tế.
            </div>
            {abuse.visits.length > 0 && (
              <div style={{ marginTop: 'var(--space-8)' }}>
                <button type="button" className="ab-btn ghost sm" onClick={() => setAbuseDetail((v) => !v)}>
                  <TermIcon name="list" size={11} /> {abuseDetail ? 'Ẩn chi tiết' : `Chi tiết ${abuse.visits.length} lượt`}
                </button>
              </div>
            )}
            {abuseDetail && (
              <div style={{ overflowX: 'auto', marginTop: 'var(--space-8)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
                  <thead>
                    <tr style={{ color: 'var(--t-2)', fontSize: 'var(--fs-xs)', textAlign: 'left' }}>
                      <th style={{ padding: '4px 8px', borderBottom: '1px solid var(--line-soft)' }}>Ngày</th>
                      <th style={{ padding: '4px 8px', borderBottom: '1px solid var(--line-soft)' }}>Số hồ sơ</th>
                      <th style={{ padding: '4px 8px', borderBottom: '1px solid var(--line-soft)' }}>Nơi KCB</th>
                      <th style={{ padding: '4px 8px', borderBottom: '1px solid var(--line-soft)' }}>Chẩn đoán</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abuse.visits.map((v, i) => (
                      <tr key={i}>
                        <td className="mono" style={{ padding: '4px 8px', borderBottom: '1px solid var(--line-soft)', whiteSpace: 'nowrap' }}>
                          {dayjs(v.visitDate).format('DD/MM/YYYY')}
                        </td>
                        <td className="mono" style={{ padding: '4px 8px', borderBottom: '1px solid var(--line-soft)' }}>{v.recordCode || '—'}</td>
                        <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--line-soft)' }}>{v.facilityName || v.facilityCode || '—'}</td>
                        <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--line-soft)' }}>{v.diagnosisName || v.diagnosisCode || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Lịch sử KCB từ cổng BHXH */}
        {histOpen && (
          <div className="rec-section" style={{ marginTop: 'var(--space-12)' }}>
            <h5><TermIcon name="clock" size={11} /> LỊCH SỬ KHÁM CHỮA BỆNH BHYT</h5>
            {histBusy && (
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)', padding: '12px 0', textAlign: 'center' }}>Đang tải…</div>
            )}
            {!histBusy && (!history || (history.visits || []).length === 0) && (
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)', padding: '12px 0', textAlign: 'center' }}>
                Không có lịch sử KCB
              </div>
            )}
            {!histBusy && history && (history.visits || []).length > 0 && (
              <>
                <div className="rec-kv" style={{ marginBottom: 'var(--space-8)' }}>
                  <span>Mã thẻ BHYT</span><span className="mono">{history.maThe}</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
                    <thead>
                      <tr style={{ color: 'var(--t-2)', fontSize: 'var(--fs-xs)', textAlign: 'left' }}>
                        <th style={{ padding: '4px 8px', borderBottom: '1px solid var(--line-soft)' }}>Ngày KCB</th>
                        <th style={{ padding: '4px 8px', borderBottom: '1px solid var(--line-soft)' }}>Tên CSKCB</th>
                        <th style={{ padding: '4px 8px', borderBottom: '1px solid var(--line-soft)' }}>Mã bệnh chính</th>
                        <th style={{ padding: '4px 8px', borderBottom: '1px solid var(--line-soft)', textAlign: 'right' }}>Tiền BHYT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(history.visits || []).map((v, idx) => (
                        <tr key={idx}>
                          <td className="mono" style={{ padding: '4px 8px', borderBottom: '1px solid var(--line-soft)', whiteSpace: 'nowrap' }}>
                            {v.ngayKcb ? dayjs(v.ngayKcb).format('DD/MM/YYYY') : '-'}
                          </td>
                          <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--line-soft)' }}>{v.tenCsKcb}</td>
                          <td className="mono" style={{ padding: '4px 8px', borderBottom: '1px solid var(--line-soft)' }}>{v.maBenhChinh}</td>
                          <td className="mono" style={{ padding: '4px 8px', borderBottom: '1px solid var(--line-soft)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {new Intl.NumberFormat('vi-VN').format(v.tienBhyt)} VND
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </ModalShell>
  );
};

/* ────────────────────────────────────────────────────────────
   Patient lookup modal — search existing patients (Tìm BN cũ)
   ──────────────────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
