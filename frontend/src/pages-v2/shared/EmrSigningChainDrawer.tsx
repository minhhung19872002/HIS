/* =====================================================================
 * EmrSigningChainDrawer — Trình ký nhiều cấp từ EMR (plan-emr-signing-chain)
 * - Drawer liệt kê các giấy cần ký NHIỀU CẤP (tóm tắt/giấy ra viện, chuyển viện,
 *   GCN phẫu thuật, biên bản hội chẩn, kiểm thảo tử vong) + trạng thái chuỗi ký.
 * - Modal trình ký: chuỗi cấp prefill từ danh mục EmrSigningOperations theo
 *   documentType; mỗi cấp chọn người ký từ danh mục emr-admin/signers.
 * - Nội dung trình = snapshot HTML biểu mẫu (PrintTemplateRenderer render ẩn).
 * - Gộp TT46: ký đủ cấp giấy ra viện/tóm tắt BA → gợi ý Kết thúc & khóa HSBA.
 * KHÔNG áp cho phiếu KQ XN (duyệt KTV riêng) và đơn thuốc (1 chữ ký BS).
 * ===================================================================== */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DrawerShell, ModalShell, Btn, StatusBadge, tk, te, tw, fmtDTg } from '../_v2kit';
import TermIcon from '../../layouts/terminal/Icon';
import PrintTemplateRenderer from '../../components/PrintTemplateRenderer';
import {
  getDocumentChain, getChainTemplate, submitSigningChain, cancelSigningChain,
  type DocumentChain, type SigningChainStepInput,
} from '../../api/signingWorkflow';
import { getSigners, getSigningRoles, finalizeRecord, type EmrSignerCatalogDto, type EmrSigningRoleDto } from '../../api/emrAdmin';
import type {
  MedicalRecordFullDto, TreatmentSheetDto, ConsultationRecordDto, NursingCareSheetDto,
} from '../../api/examination';

/** Giấy ký nhiều cấp gắn trình ký (printType = documentType của SigningRequest). */
const SIGNABLE_FORMS: { label: string; printType: string; finalizeHint?: boolean }[] = [
  { label: 'MS-01 · Tóm tắt bệnh án ra viện', printType: 'summary', finalizeHint: true },
  { label: 'Giấy ra viện', printType: 'discharge', finalizeHint: true },
  { label: 'Giấy chuyển viện', printType: 'referral' },
  { label: 'Giấy chứng nhận phẫu thuật (TT32)', printType: 'ls-surgery-cert' },
  { label: 'Biên bản hội chẩn', printType: 'consultation' },
  { label: 'Biên bản kiểm thảo tử vong', printType: 'deathreview' },
];

interface StepDraft {
  signerRole?: string;
  roleName?: string;
  assignedToId: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  record: MedicalRecordFullDto | null;
  patientId?: string;
  patientName?: string;
  patientCode?: string;
  departmentName?: string;
  treatments: TreatmentSheetDto[];
  consultations: ConsultationRecordDto[];
  nursingSheets: NursingCareSheetDto[];
  isFinalized: boolean;
  /** Gọi sau khi finalize TT46 thành công để parent refresh badge khóa. */
  onFinalized: () => void;
}

const chainChip = (chain: DocumentChain | null): React.ReactNode => {
  if (!chain) return <StatusBadge tone="info">Chưa trình ký</StatusBadge>;
  switch (chain.chainStatus) {
    case 'Completed':
      return <StatusBadge tone="ok">Đã ký đủ {chain.totalSteps} cấp</StatusBadge>;
    case 'Rejected': {
      const rej = chain.steps.find((s) => s.status === 2);
      return <StatusBadge tone="crit">Từ chối{rej?.rejectReason ? `: ${rej.rejectReason}` : ''}</StatusBadge>;
    }
    case 'Cancelled':
      return <StatusBadge tone="info">Đã hủy trình</StatusBadge>;
    default: {
      const cur = chain.steps.find((s) => s.status === 0);
      return (
        <StatusBadge tone="warn">
          Chờ ký cấp {chain.currentStep ?? '?'}/{chain.totalSteps}{cur ? ` — ${cur.assignedToName}` : ''}
        </StatusBadge>
      );
    }
  }
};

const EmrSigningChainDrawer: React.FC<Props> = ({
  open, onClose, record, patientId, patientName, patientCode, departmentName,
  treatments, consultations, nursingSheets, isFinalized, onFinalized,
}) => {
  const recordId = record?.id;
  const [chains, setChains] = useState<Record<string, DocumentChain | null>>({});
  const [loading, setLoading] = useState(false);

  // Modal trình ký
  const [submitTarget, setSubmitTarget] = useState<{ label: string; printType: string } | null>(null);
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [signers, setSigners] = useState<EmrSignerCatalogDto[]>([]);
  const [roles, setRoles] = useState<EmrSigningRoleDto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const snapshotRef = useRef<HTMLDivElement>(null);

  // Finalize TT46
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const loadChains = useCallback(async () => {
    if (!recordId) return;
    setLoading(true);
    try {
      const results = await Promise.all(
        SIGNABLE_FORMS.map((f) => getDocumentChain(f.printType, recordId)),
      );
      const map: Record<string, DocumentChain | null> = {};
      SIGNABLE_FORMS.forEach((f, i) => { map[f.printType] = results[i]; });
      setChains(map);
    } finally { setLoading(false); }
  }, [recordId]);

  useEffect(() => { if (open && recordId) void loadChains(); }, [open, recordId, loadChains]);

  const openSubmitModal = async (form: { label: string; printType: string }) => {
    if (!recordId) { tw('Chọn bệnh nhân và tải đủ dữ liệu HSBA trước'); return; }
    setSubmitTarget(form);
    setSteps([]);
    const [tpl, signerList, roleList] = await Promise.all([
      getChainTemplate(form.printType),
      signers.length > 0 ? Promise.resolve(signers) : getSigners(),
      roles.length > 0 ? Promise.resolve(roles) : getSigningRoles(),
    ]);
    setSigners(signerList);
    setRoles(roleList.filter((r) => r.isActive !== false));
    setSteps(
      tpl.length > 0
        ? tpl.map((t) => ({ signerRole: t.roleCode ?? undefined, roleName: t.roleName ?? t.operationName, assignedToId: '' }))
        : [{ signerRole: 'BSDT', roleName: 'Bác sĩ điều trị', assignedToId: '' }, { signerRole: 'TK', roleName: 'Trưởng khoa', assignedToId: '' }],
    );
  };

  const setStep = (idx: number, patch: Partial<StepDraft>) =>
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const addStep = () => setSteps((prev) => [...prev, { signerRole: undefined, roleName: undefined, assignedToId: '' }]);
  const removeStep = (idx: number) => setSteps((prev) => prev.filter((_, i) => i !== idx));

  const doSubmit = async () => {
    if (!recordId || !submitTarget) return;
    if (steps.length === 0) { tw('Chuỗi ký phải có ít nhất 1 cấp'); return; }
    if (steps.some((s) => !s.assignedToId)) { tw('Chọn người ký cho tất cả các cấp'); return; }
    setSubmitting(true);
    try {
      // Snapshot HTML biểu mẫu tại thời điểm trình (render ẩn bên dưới modal)
      const html = snapshotRef.current?.innerHTML || '';
      const payload = {
        documentType: submitTarget.printType,
        documentId: recordId,
        documentTitle: `${submitTarget.label} — ${patientName || ''} (${patientCode || ''})`,
        documentContent: html,
        patientId,
        patientName,
        departmentName,
        medicalRecordId: recordId,
        steps: steps.map<SigningChainStepInput>((s) => {
          const signer = signers.find((x) => x.userId === s.assignedToId);
          return { assignedToId: s.assignedToId, assignedToName: signer?.fullName || '', signerRole: s.signerRole };
        }),
      };
      await submitSigningChain(payload);
      tk('Đã gửi trình ký');
      setSubmitTarget(null);
      await loadChains();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      te(msg || 'Không thể gửi trình ký');
    } finally { setSubmitting(false); }
  };

  const doCancelChain = async (chain: DocumentChain) => {
    if (!window.confirm('Hủy cả chuỗi trình ký của tài liệu này?')) return;
    const ok = await cancelSigningChain(chain.chainId);
    if (ok) { tk('Đã hủy chuỗi trình ký'); await loadChains(); }
    else te('Không thể hủy chuỗi trình ký');
  };

  const doFinalize = async () => {
    if (!recordId) return;
    setFinalizing(true);
    try {
      const r = await finalizeRecord(recordId, 'Kết thúc sau khi ký đủ cấp giấy ra viện/tóm tắt BA');
      if (r && r.success !== false) {
        tk('Đã kết thúc & khóa HSBA (TT46)');
        setFinalizeOpen(false);
        onFinalized();
      } else te(r?.message || 'Không thể kết thúc HSBA');
    } catch { te('Không thể kết thúc HSBA'); }
    finally { setFinalizing(false); }
  };

  const dischargeChainDone = SIGNABLE_FORMS.some(
    (f) => f.finalizeHint && chains[f.printType]?.chainStatus === 'Completed',
  );

  return (
    <>
      <DrawerShell open={open} onClose={onClose} title="Trình ký tài liệu HSBA" size="md">
        <div style={{ padding: 14 }}>
          {!record && (
            <div style={{ marginBottom: 10, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 6, fontSize: 12, color: 'var(--t-2)' }}>
              Chọn một bệnh nhân để trình ký tài liệu.
            </div>
          )}
          {isFinalized && (
            <div style={{ marginBottom: 10, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 6, fontSize: 12 }}>
              🔒 HSBA đã kết thúc & khóa (TT46) — nội dung không thể sửa; vẫn xem được lịch sử ký.
            </div>
          )}
          {dischargeChainDone && !isFinalized && (
            <div style={{ marginBottom: 10, padding: '10px 12px', border: '1px solid var(--s-ok)', borderRadius: 6, fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span>Giấy ra viện / tóm tắt BA đã ký đủ cấp — có thể kết thúc &amp; khóa hồ sơ theo TT46.</span>
              <Btn variant="primary" size="sm" onClick={() => setFinalizeOpen(true)}>
                <TermIcon name="check" size={11} /> Kết thúc &amp; khóa
              </Btn>
            </div>
          )}
          {SIGNABLE_FORMS.map((f) => {
            const chain = chains[f.printType] ?? null;
            const active = chain && (chain.chainStatus === 'Pending' || chain.chainStatus === 'InProgress');
            return (
              <div key={f.printType} style={{ padding: 10, border: '1px solid var(--line)', borderRadius: 6, marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{f.label}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {loading ? <span style={{ fontSize: 11, color: 'var(--t-3)' }}>…</span> : chainChip(chain)}
                    {active ? (
                      <Btn variant="ghost" size="sm" onClick={() => doCancelChain(chain!)}>Hủy trình</Btn>
                    ) : (
                      <Btn variant="ghost" size="sm" disabled={!record} onClick={() => void openSubmitModal(f)}>
                        <TermIcon name="send" size={11} /> {chain ? 'Trình lại' : 'Trình ký'}
                      </Btn>
                    )}
                  </div>
                </div>
                {chain && (
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 11, color: 'var(--t-2)' }}>
                    {chain.steps.map((s) => (
                      <span key={s.id} style={{ padding: '2px 8px', border: '1px solid var(--line-soft)', borderRadius: 10 }}>
                        Cấp {s.stepOrder}: {s.assignedToName}
                        {s.signerRole ? ` (${s.signerRole})` : ''} — {s.status === 1 ? `✓ ${s.signedAt ? fmtDTg(s.signedAt) : 'đã ký'}` : s.status === 0 ? 'chờ ký' : s.status === 4 ? 'chờ lượt' : s.status === 2 ? 'từ chối' : 'hủy'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DrawerShell>

      {/* Modal chọn chuỗi ký + người ký từng cấp */}
      <ModalShell
        open={submitTarget !== null}
        onClose={() => setSubmitTarget(null)}
        title={`Trình ký: ${submitTarget?.label ?? ''}`}
        sub={`${patientName ?? ''} (${patientCode ?? ''})`}
        size="md"
        footer={<>
          <Btn variant="ghost" onClick={() => setSubmitTarget(null)}>Hủy</Btn>
          <Btn variant="primary" disabled={submitting} onClick={doSubmit}>
            <TermIcon name="send" size={12} /> Gửi trình ký
          </Btn>
        </>}
      >
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11.5, color: 'var(--t-2)' }}>
            Ký tuần tự từ cấp 1 — mỗi cấp chỉ thấy yêu cầu khi cấp trước đã ký. Nội dung trình = biểu mẫu tại thời điểm gửi.
          </div>
          {steps.map((s, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 28px', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Cấp {idx + 1}</span>
              <select
                className="ed-fld"
                value={s.signerRole || ''}
                onChange={(e) => {
                  const role = roles.find((r) => r.code === e.target.value);
                  setStep(idx, { signerRole: e.target.value || undefined, roleName: role?.name });
                }}
              >
                <option value="">— Vai trò —</option>
                {roles.map((r) => <option key={r.id} value={r.code}>{r.name}</option>)}
              </select>
              <select
                className="ed-fld"
                value={s.assignedToId}
                onChange={(e) => setStep(idx, { assignedToId: e.target.value })}
              >
                <option value="">— Chọn người ký —</option>
                {signers.map((sg) => (
                  <option key={sg.id} value={sg.userId}>
                    {sg.fullName}{sg.title ? ` · ${sg.title}` : ''}{sg.departmentName ? ` (${sg.departmentName})` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeStep(idx)}
                title="Bỏ cấp này"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t-3)' }}
              >✕</button>
            </div>
          ))}
          <div>
            <Btn variant="ghost" size="sm" onClick={addStep}><TermIcon name="plus" size={11} /> Thêm cấp ký</Btn>
          </div>
        </div>
        {/* Render ẩn biểu mẫu để chụp snapshot HTML khi gửi */}
        {submitTarget && record && (
          <div ref={snapshotRef} style={{ position: 'fixed', left: -10000, top: 0, width: 794, pointerEvents: 'none' }} aria-hidden>
            <PrintTemplateRenderer
              printType={submitTarget.printType}
              record={record}
              printRef={snapshotRef}
              selectedConsultation={consultations[0]}
              treatmentSheets={treatments}
              nursingSheets={nursingSheets}
            />
          </div>
        )}
      </ModalShell>

      {/* Confirm finalize TT46 */}
      <ModalShell
        open={finalizeOpen}
        onClose={() => setFinalizeOpen(false)}
        title="Kết thúc & khóa HSBA (TT46)"
        sub={`${patientName ?? ''} (${patientCode ?? ''})`}
        size="sm"
        footer={<>
          <Btn variant="ghost" onClick={() => setFinalizeOpen(false)}>Hủy</Btn>
          <Btn variant="primary" disabled={finalizing} onClick={doFinalize}>
            <TermIcon name="check" size={12} /> Kết thúc &amp; khóa
          </Btn>
        </>}
      >
        <div style={{ padding: 18, fontSize: 12.5, color: 'var(--t-1)' }}>
          Hồ sơ sẽ bị <b>khóa nội dung theo TT46/2018-TT-BYT</b> (snapshot phiên bản + chặn mọi sửa đổi).
          Muốn tu chỉnh sau này phải dùng &quot;Mở lại hồ sơ&quot; (quyền hạn chế, bắt buộc lý do, lưu vết).
        </div>
      </ModalShell>
    </>
  );
};

export default EmrSigningChainDrawer;
