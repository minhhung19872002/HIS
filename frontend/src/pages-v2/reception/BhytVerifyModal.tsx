import React, { useEffect, useMemo, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp, Input, Select, Radio, Checkbox, InputNumber } from 'antd';
import * as receptionApi from '../../api/reception';
import type { AdmissionDto, RoomOverviewDto } from '../../api/reception';
import { KpiStrip, TopTabs, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, DrawerShell, ModalShell, type ColumnDef, type StatusTab, type TopTab } from '../_v2kit';
import TermIcon from '../../layouts/terminal/Icon';
import type { RawRow, TopKey, StatusKey } from './shared';
import { TOP_TABS, STATUS_TABS, PRIORITY_OPTS, VISIT_TYPE_OPTS, fmtHM, statusKey, statusTone, priorityKey, priorityLabel, genderLabel, ageOf, treatmentLabel, hasValidInsurance } from './shared';
export const BhytVerifyModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { message } = AntdApp.useApp();
  const [num, setNum] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<receptionApi.InsuranceVerificationResultDto | null>(null);

  useEffect(() => {
    if (open) { setNum(''); setName(''); setResult(null); }
  }, [open]);

  const verify = async () => {
    if (!num.trim() || num.trim().length < 10) { message.warning('Nhập số thẻ BHYT hợp lệ'); return; }
    setBusy(true);
    try {
      const res = await receptionApi.verifyInsurance({ insuranceNumber: num.trim(), patientName: name.trim() || undefined });
      setResult(res.data);
    } catch {
      message.error('Tra cứu BHYT thất bại');
    } finally {
      setBusy(false);
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--t-2)', marginBottom: 4, fontWeight: 600 }}>Số thẻ BHYT *</div>
            <Input value={num} onChange={(e) => setNum(e.target.value)} placeholder="VD: HC4010112345678" onPressEnter={verify} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--t-2)', marginBottom: 4, fontWeight: 600 }}>Họ tên (tùy chọn)</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Đối chiếu tên" />
          </div>
        </div>

        {result && (
          <div className="rec-section" style={{ marginTop: 16 }}>
            <h5>
              <TermIcon name={result.isValid ? 'check' : 'x'} size={11} /> KẾT QUẢ
              <span style={{ marginLeft: 8 }}>
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
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--s-warn)' }}>
                {result.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
              </div>
            )}
            {result.errorMessage && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--s-crit)' }}>{result.errorMessage}</div>
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
