import React from 'react';
import { ModalShell, Btn, ActBtn } from '../_v2kit';
import TermIcon from '../../layouts/terminal/Icon';
import type { OutpatientRecordTemplateDto } from '../../api/clinicalNarratives';
import type { DxRow } from './_shared';

/* ==========================================================================
   Modal Lưu thành mẫu HSBA + Modal Quản lý mẫu HSBA ngoại trú (issue #30 mục 7).
   Extracted verbatim from OpdEditor.tsx (#205 FE-2 split, Phase 1). All state
   + handlers (saveCurrentAsTpl → onSave, removeTpl → onRemove, loadTpls) stay
   in the main component. history/exam/conclusion/diagnoses are threaded read-
   only so the "Mẫu sẽ gồm…" summary stays byte-identical.
   ========================================================================== */

export const TemplateModals: React.FC<{
  saveOpen: boolean;
  setSaveOpen: (v: boolean) => void;
  name: string;
  setName: (v: string) => void;
  busy: boolean;
  onSave: () => void;
  manageOpen: boolean;
  setManageOpen: (v: boolean) => void;
  tpls: OutpatientRecordTemplateDto[];
  onRemove: (id: string) => void;
  history: string;
  exam: string;
  conclusion: string;
  diagnoses: DxRow[];
}> = ({
  saveOpen, setSaveOpen, name, setName, busy, onSave,
  manageOpen, setManageOpen, tpls, onRemove,
  history, exam, conclusion, diagnoses,
}) => (
  <>
    {/* ── Modal: Lưu bản ghi hiện tại thành mẫu HSBA ───────────────── */}
    <ModalShell
      open={saveOpen}
      onClose={() => setSaveOpen(false)}
      title="Lưu thành mẫu HSBA ngoại trú"
      sub="Lưu bệnh sử / khám lâm sàng / kết luận đang nhập thành mẫu dùng lại"
      size="sm"
      footer={
        <div style={{ display: 'flex', gap: 'var(--space-8)', justifyContent: 'flex-end' }}>
          <Btn variant="ghost" size="sm" onClick={() => setSaveOpen(false)}>Hủy</Btn>
          <Btn variant="primary" size="sm" disabled={busy || !name.trim()} onClick={onSave}>
            {busy ? 'Đang lưu…' : 'Lưu mẫu'}
          </Btn>
        </div>
      }
    >
      <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>Tên mẫu</label>
      <input className="hui-inp" value={name} onChange={(e) => setName(e.target.value)}
        placeholder="VD: Viêm họng cấp người lớn" style={{ width: '100%', height: 32, fontSize: 12.5 }} autoFocus />
      <div style={{ marginTop: 'var(--space-10)', fontSize: 11.5, color: 'var(--t-2)' }}>
        Mẫu sẽ gồm: bệnh sử ({history ? history.length : 0} ký tự) · khám LS ({exam ? exam.length : 0} ký tự) ·
        kết luận ({conclusion ? conclusion.length : 0} ký tự)
        {diagnoses.length > 0 && <> · ICD {diagnoses.find((d) => d.isPrimary)?.icdCode || diagnoses[0]?.icdCode}</>}
      </div>
    </ModalShell>

    {/* ── Modal: Quản lý mẫu HSBA ──────────────────────────────────── */}
    <ModalShell
      open={manageOpen}
      onClose={() => setManageOpen(false)}
      title="Quản lý mẫu HSBA ngoại trú"
      sub={`${tpls.length} mẫu — xóa mẫu không còn dùng`}
      size="md"
    >
      {tpls.length === 0 ? (
        <div style={{ padding: 'var(--space-24)', textAlign: 'center', color: 'var(--t-3)', fontSize: 12.5 }}>
          Chưa có mẫu nào — nhập nội dung khám rồi bấm "Lưu thành mẫu".
        </div>
      ) : (
        <table className="ab-tbl ab-u-wfull">
          <thead><tr><th>Mã</th><th>Tên mẫu</th><th>ICD</th><th style={{ width: 60 }} /></tr></thead>
          <tbody>
            {tpls.map((t) => (
              <tr key={t.id}>
                <td className="mono">{t.templateCode}</td>
                <td>{t.templateName}</td>
                <td className="mono">{t.diagnosisCode || '—'}</td>
                <td className="act">
                  <ActBtn ic="x" title="Xóa mẫu" tone="crit" onClick={() => onRemove(t.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ModalShell>
  </>
);
