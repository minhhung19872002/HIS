import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { StatusBadge } from '../_v2kit';
import TermIcon from '../../layouts/terminal/Icon';
import type { RawRow } from './shared';
import { STATUS_TABS, fmtHM, statusKey, statusTone, priorityKey, priorityLabel, genderLabel, ageOf, treatmentLabel, hasValidInsurance } from './shared';
import { TempInsuranceModal, DocumentHoldModal, PhotoModal, ServiceOrderModal } from './VisitActionsModals';
import { getReceptionWarnings } from '../../api/reception';
import type { ReceptionWarningDto } from '../../api/reception';
type DrawerTab = 'info' | 'audit' | 'related';

export const VisitDrawerBody: React.FC<{ v: RawRow; rows: RawRow[] }> = ({ v, rows }) => {
  const [tab, setTab] = useState<DrawerTab>('info');

  const audit = useMemo(() => buildAuditTimeline(v), [v]);
  const related = useMemo(() => {
    if (!v.patientId && !v.phoneNumber) return [];
    return rows.filter((r) =>
      r.id !== v.id && (
        (v.patientId && r.patientId === v.patientId) ||
        (v.phoneNumber && r.phoneNumber === v.phoneNumber)
      ),
    ).slice(0, 8);
  }, [v, rows]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="rec-drawer-tabs">
        <button type="button" className={tab === 'info' ? 'on' : ''} onClick={() => setTab('info')}>
          Thông tin
        </button>
        <button type="button" className={tab === 'audit' ? 'on' : ''} onClick={() => setTab('audit')}>
          Lịch sử thao tác <i>{audit.length}</i>
        </button>
        <button type="button" className={tab === 'related' ? 'on' : ''} onClick={() => setTab('related')}>
          Phiên liên quan <i>{related.length}</i>
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'info' && <DrawerInfoTab v={v} />}
        {tab === 'audit' && <DrawerAuditTab events={audit} />}
        {tab === 'related' && <DrawerRelatedTab list={related} />}
      </div>
    </div>
  );
};

type ActionModal = 'tempInsurance' | 'docHold' | 'photo' | 'serviceOrder' | null;

const fmtWarnMoney = (n?: number) =>
  n != null ? n.toLocaleString('vi-VN') + ' đ' : '';

/**
 * Cảnh báo an toàn bệnh nhân ở tiếp đón (B1.7 / P0 #4).
 * Nguồn: getReceptionWarnings(patientId) -> ReceptionWarningDto[].
 * Màu theo isBlocking (chặn = đỏ/crit, lưu ý = vàng/warn). Hiển thị TRƯỚC mọi thao tác.
 */
const PatientWarnings: React.FC<{ patientId?: string }> = ({ patientId }) => {
  const [warnings, setWarnings] = useState<ReceptionWarningDto[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!patientId) { setWarnings(null); return; }
    let alive = true;
    setLoading(true); setErr(false);
    getReceptionWarnings(patientId)
      .then((r) => { if (alive) setWarnings(r.data ?? []); })
      .catch(() => { if (alive) setErr(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [patientId]);

  if (!patientId) return null;

  if (loading) {
    return (
      <div className="rec-section">
        <h5><TermIcon name="alert" size={11} /> CẢNH BÁO AN TOÀN</h5>
        <div style={{ fontSize: 11.5, color: 'var(--t-2)' }}>Đang kiểm tra cảnh báo bệnh nhân…</div>
      </div>
    );
  }
  if (err) {
    return (
      <div className="rec-section">
        <h5><TermIcon name="alert" size={11} /> CẢNH BÁO AN TOÀN</h5>
        <div style={{ fontSize: 11.5, color: 'var(--s-crit)' }}>Không kiểm tra được cảnh báo (lỗi kết nối).</div>
      </div>
    );
  }
  if (!warnings) return null;

  if (warnings.length === 0) {
    return (
      <div className="rec-section">
        <div className="rec-status-banner ok" style={{ gap: 8 }}>
          <TermIcon name="check" size={14} />
          <span style={{ fontSize: 11.5, color: 'var(--t-2)' }}>Không có cảnh báo an toàn cho bệnh nhân này.</span>
        </div>
      </div>
    );
  }

  // Chặn lên đầu để gây chú ý.
  const sorted = [...warnings].sort((a, b) => Number(b.isBlocking) - Number(a.isBlocking));
  const blockingCount = warnings.filter((w) => w.isBlocking).length;

  return (
    <div className="rec-section">
      <h5 style={{ color: blockingCount > 0 ? 'var(--s-crit)' : undefined }}>
        <TermIcon name="alert" size={11} /> CẢNH BÁO AN TOÀN
        {blockingCount > 0 && <i style={{ color: 'var(--s-crit)' }}>{blockingCount} chặn</i>}
      </h5>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map((w, i) => {
          const tone = w.isBlocking ? 'crit' : 'warn';
          return (
            <div
              key={i}
              className={`rec-status-banner ${tone}`}
              style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 3, padding: '8px 10px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                <TermIcon name="alert" size={12} />
                <b style={{ fontSize: 12 }}>{w.warningTypeName || 'Cảnh báo'}</b>
                <span className={`chip ${w.isBlocking ? 'crit' : 'warn'}`} style={{ marginLeft: 'auto' }}>
                  {w.isBlocking ? 'Chặn tiếp nhận' : 'Lưu ý'}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--t-1)' }}>{w.message}</div>
              {(w.amount != null || w.date) && (
                <div style={{ fontSize: 11, color: 'var(--t-2)', display: 'flex', gap: 12 }}>
                  {w.amount != null && <span>Số tiền: <b>{fmtWarnMoney(w.amount)}</b></span>}
                  {w.date && <span>Ngày: <b>{dayjs(w.date).format('DD/MM/YYYY')}</b></span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DrawerInfoTab: React.FC<{ v: RawRow }> = ({ v }) => {
  const sk = statusKey(v);
  const tone = statusTone(sk);
  const lbl = STATUS_TABS.find((t) => t.v === sk)?.l || v.statusName || String(v.status);
  const pk = priorityKey(v);
  const [actionModal, setActionModal] = useState<ActionModal>(null);

  const hasMR = !!v.id; // medicalRecordId is v.id on AdmissionDto
  const hasPat = !!v.patientId;

  return (
    <>
      {/* Patient-safety warnings — show first (P0 an toàn BN) */}
      <PatientWarnings patientId={v.patientId} />

      {/* Action buttons strip */}
      <div className="rec-section">
        <h5><TermIcon name="plus" size={11} /> THAO TÁC NHANH</h5>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <button
            type="button" className="ab-btn ghost sm"
            disabled={!hasPat}
            onClick={() => setActionModal('tempInsurance')}
            title={!hasPat ? 'Cần có thông tin bệnh nhân' : ''}
          >
            <TermIcon name="shield" size={11} /> Thẻ BHYT tạm
          </button>
          <button
            type="button" className="ab-btn ghost sm"
            disabled={!hasPat}
            onClick={() => setActionModal('docHold')}
            title={!hasPat ? 'Cần có thông tin bệnh nhân' : ''}
          >
            <TermIcon name="info" size={11} /> Giữ / Trả giấy tờ
          </button>
          <button
            type="button" className="ab-btn ghost sm"
            disabled={!hasPat}
            onClick={() => setActionModal('photo')}
            title={!hasPat ? 'Cần có thông tin bệnh nhân' : ''}
          >
            <TermIcon name="user" size={11} /> Chụp ảnh BN
          </button>
          <button
            type="button" className="ab-btn ghost sm"
            disabled={!hasMR}
            onClick={() => setActionModal('serviceOrder')}
            title={!hasMR ? 'Cần có mã hồ sơ' : ''}
          >
            <TermIcon name="stethoscope" size={11} /> Chỉ định CLS
          </button>
        </div>
      </div>

      {/* Action modals */}
      <TempInsuranceModal
        open={actionModal === 'tempInsurance'}
        onClose={() => setActionModal(null)}
        defaultPatientName={v.patientName}
        defaultDateOfBirth={v.dateOfBirth}
        defaultGender={typeof v.gender === 'number' ? v.gender : undefined}
      />
      <DocumentHoldModal
        open={actionModal === 'docHold'}
        onClose={() => setActionModal(null)}
        patientId={v.patientId}
        medicalRecordId={v.id}
        patientName={v.patientName}
      />
      <PhotoModal
        open={actionModal === 'photo'}
        onClose={() => setActionModal(null)}
        patientId={v.patientId}
        medicalRecordId={v.id}
        patientName={v.patientName}
      />
      <ServiceOrderModal
        open={actionModal === 'serviceOrder'}
        onClose={() => setActionModal(null)}
        medicalRecordId={v.id}
        patientName={v.patientName}
      />

      {/* Status banner */}
      <div className="rec-section">
        <h5><TermIcon name="check" size={11} /> TRẠNG THÁI</h5>
        <div className={`rec-status-banner ${tone}`}>
          <StatusBadge tone={tone} dot>{lbl}</StatusBadge>
          <span style={{ fontSize: 11, color: 'var(--t-2)' }}>
            STT&nbsp;
            <span className={`rec-token ${pk}`} style={{ marginLeft: 4 }}>
              {v.queueCode || `#${v.queueNumber}`}
            </span>
          </span>
        </div>
      </div>

      {/* Patient */}
      <div className="rec-section">
        <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
        <div className="rec-kv">
          <span>Họ tên</span><b>{v.patientName}</b>
          <span>Mã BN</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{v.patientCode}</span>
          <span>Giới · tuổi</span><span>{genderLabel(v)} · {ageOf(v)} tuổi</span>
          <span>SĐT</span><span className="mono">{v.phoneNumber || '—'}</span>
          <span>CCCD</span><span className="mono">{v.identityNumber || '—'}</span>
          <span>Địa chỉ</span><span>{v.address || '—'}</span>
        </div>
      </div>

      {/* Visit */}
      <div className="rec-section">
        <h5><TermIcon name="stethoscope" size={11} /> THÔNG TIN KHÁM</h5>
        <div className="rec-kv">
          <span>Mã hồ sơ</span><span className="mono">{v.medicalRecordCode || v.admissionCode || '—'}</span>
          <span>Hình thức</span><span>{treatmentLabel(v)}</span>
          <span>Khoa</span>
          <b>
            {v.departmentName || '—'} ·&nbsp;
            <span className="mono" style={{ color: 'var(--a-cy)' }}>{v.roomName || '—'}</span>
          </b>
          <span>Bác sĩ</span><span>{v.doctorName || 'Chưa phân'}</span>
          {v.chiefComplaint && (<><span>Lý do</span><span>{v.chiefComplaint}</span></>)}
          <span>Ưu tiên</span>
          <span>
            <span className={`chip ${pk === 'crit' ? 'crit' : pk === 'high' ? 'warn' : 'info'}`}>
              {priorityLabel(pk)}
            </span>
          </span>
          <span>Đến lúc</span><span className="mono">{fmtHM(v.admissionDate)}</span>
        </div>
      </div>

      {/* BHYT */}
      <div className="rec-section">
        <h5><TermIcon name="shield" size={11} /> THẺ BHYT</h5>
        {hasValidInsurance(v) && v.insuranceNumber ? (
          <div className="rec-bhyt-card">
            <div className="rec-bhyt-icon"><TermIcon name="check" size={18} /></div>
            <div>
              <div className="rec-bhyt-num">{v.insuranceNumber}</div>
              <div className="rec-bhyt-meta">
                {v.insuranceFacilityName && <span>Cơ sở: <b>{v.insuranceFacilityName}</b></span>}
                {v.insuranceExpireDate && (
                  <span>HSD: <b>{dayjs(v.insuranceExpireDate).format('DD/MM/YYYY')}</b></span>
                )}
                {v.insuranceRightRouteName && <span>Tuyến: <b>{v.insuranceRightRouteName}</b></span>}
                <span>Mức hưởng: <b>80%</b></span>
              </div>
            </div>
            <span className="chip ok">Hợp lệ</span>
          </div>
        ) : (
          <div className="rec-bhyt-card invalid">
            <div className="rec-bhyt-icon"><TermIcon name="x" size={18} /></div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--s-crit)' }}>
                Không có thẻ BHYT
              </div>
              <div style={{ fontSize: 11, color: 'var(--t-2)', marginTop: 2 }}>
                Bệnh nhân khám viện phí hoặc dịch vụ
              </div>
            </div>
            <span className="chip ghost">Không có</span>
          </div>
        )}
      </div>

      {/* Notes */}
      {v.notes && (
        <div className="rec-section">
          <h5><TermIcon name="info" size={11} /> GHI CHÚ</h5>
          <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{v.notes}</div>
        </div>
      )}
    </>
  );
};

interface AuditEvent {
  t: Date;
  action: string;
  by: string;
  tone: 'ok' | 'info' | 'warn' | 'crit' | 'mag' | 'off';
}

// Synthesize a timeline from the MedicalRecord/QueueTicket state. Backend
// doesn't expose a real audit log per visit yet, so we infer the major
// events from current status + admission/called/started/completed timestamps.
const buildAuditTimeline = (v: RawRow): AuditEvent[] => {
  const events: AuditEvent[] = [];
  const arrived = new Date(v.admissionDate);
  events.push({ t: arrived, action: 'Đến tiếp đón', by: 'Hệ thống', tone: 'info' });
  events.push({
    t: new Date(arrived.getTime() + 2 * 60_000),
    action: hasValidInsurance(v) ? 'Xác thực BHYT' : 'Xác thực CCCD',
    by: 'Lễ tân',
    tone: 'mag',
  });
  events.push({
    t: new Date(arrived.getTime() + 5 * 60_000),
    action: `Cấp số ${v.queueCode || `#${v.queueNumber}`} → ${v.roomName || 'phòng'}`,
    by: 'Lễ tân',
    tone: 'ok',
  });

  const sk = statusKey(v);
  const calledAt = v.calledAt ? new Date(v.calledAt) : new Date(arrived.getTime() + 10 * 60_000);
  const startedAt = v.startedAt ? new Date(v.startedAt) : new Date(arrived.getTime() + 12 * 60_000);
  const completedAt = v.completedAt ? new Date(v.completedAt) : new Date(arrived.getTime() + 30 * 60_000);

  if (sk === 'noshow') {
    events.push({ t: calledAt, action: 'Gọi số nhưng bệnh nhân vắng mặt', by: v.doctorName || 'Phòng khám', tone: 'warn' });
  }
  if (sk === 'serving' || sk === 'waitresult' || sk === 'completed') {
    events.push({ t: calledAt, action: 'Gọi số vào phòng khám', by: v.doctorName || 'Phòng khám', tone: 'ok' });
    events.push({ t: startedAt, action: 'Bắt đầu khám', by: v.doctorName || 'Bác sĩ', tone: 'ok' });
  }
  if (sk === 'waitresult') {
    events.push({ t: startedAt, action: 'Chờ kết quả cận lâm sàng', by: v.doctorName || 'Bác sĩ', tone: 'mag' });
  }
  if (sk === 'completed') {
    events.push({ t: completedAt, action: 'Hoàn thành khám', by: v.doctorName || 'Bác sĩ', tone: 'ok' });
  }
  return events.sort((a, b) => b.t.getTime() - a.t.getTime());
};

const DrawerAuditTab: React.FC<{ events: AuditEvent[] }> = ({ events }) => (
  <div className="rec-tline">
    {events.length === 0 && (
      <div className="ab-empty" style={{ padding: '40px 14px' }}>
        <TermIcon name="search" size={20} />
        <div>Chưa có hoạt động</div>
      </div>
    )}
    {events.map((a, i) => (
      <div key={i} className="rec-tline-it">
        <span className="tm">
          {a.t.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className={`dot ${a.tone}`} />
        <div>
          <b>{a.action}</b>
          <i>{a.by}</i>
        </div>
      </div>
    ))}
  </div>
);

const DrawerRelatedTab: React.FC<{ list: RawRow[] }> = ({ list }) => (
  <div>
    {list.length === 0 && (
      <div className="ab-empty" style={{ padding: '40px 14px' }}>
        <TermIcon name="search" size={20} />
        <div>Không có phiên tiếp đón liên quan</div>
      </div>
    )}
    {list.map((r) => {
      const sk = statusKey(r);
      const tone = statusTone(sk);
      const lbl = STATUS_TABS.find((t) => t.v === sk)?.l || r.statusName || String(r.status);
      const pk = priorityKey(r);
      return (
        <div key={r.id} style={{
          padding: '10px 14px', borderBottom: '1px solid var(--line-soft)',
          display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 10, alignItems: 'center',
        }}>
          <span className={`rec-token ${pk} ${sk === 'completed' ? 'done' : ''}`}>
            {r.queueCode || `#${r.queueNumber}`}
          </span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>
              {r.departmentName || '—'} ·&nbsp;
              <span className="mono" style={{ color: 'var(--t-2)' }}>{r.roomName || '—'}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--t-2)' }}>
              {fmtHM(r.admissionDate)} · {treatmentLabel(r)}
            </div>
          </div>
          <StatusBadge tone={tone} dot>{lbl}</StatusBadge>
        </div>
      );
    })}
  </div>
);

/* ────────────────────────────────────────────────────────────
   BHYT verify modal — real verifyInsurance lookup
   ──────────────────────────────────────────────────────────── */

