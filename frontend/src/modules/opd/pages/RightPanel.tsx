import React from 'react';
import { Btn, te, tk, tw } from '../../../pages-v2/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { printSickLeave, type RoomPatientListDto } from '../api/examination';
import {
  printBill, cancelPrintBill, cancelCompletion,
  type ExamCompletionStatus,
} from '../api/multiSpecialtyExam';
import { openPdfBlob } from './_shared';

interface RightPanelProps {
  rightOpen: boolean;
  // Kết luận
  conclusion: string;
  setConclusion: React.Dispatch<React.SetStateAction<string>>;
  expandAbbr: (s: string) => string;
  // Giấy nghỉ ốm
  examId: string | null;
  sickFrom: string;
  setSickFrom: React.Dispatch<React.SetStateAction<string>>;
  sickTo: string;
  setSickTo: React.Dispatch<React.SetStateAction<string>>;
  saveSickLeave: () => Promise<void>;
  // Actions
  saving: boolean;
  saveDraft: () => void;
  goPrescribe: () => void;
  openClsResults: () => void;
  openConsults: () => void;
  setPtttOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setCabinetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setStockOpen: React.Dispatch<React.SetStateAction<boolean>>;
  printExamForm: () => void;
  complete: () => void;
  autoSavedTs: number | null;
  // Đa chuyên khoa — completion status
  selPt: RoomPatientListDto | null;
  completion: ExamCompletionStatus | null;
  setCompletion: React.Dispatch<React.SetStateAction<ExamCompletionStatus | null>>;
  roomId: string;
  loadQueue: (rid: string) => void;
  // Xử trí modal triggers
  setHospDeptId: React.Dispatch<React.SetStateAction<string>>;
  setHospReason: React.Dispatch<React.SetStateAction<string>>;
  setHospEmergency: React.Dispatch<React.SetStateAction<boolean>>;
  setHospOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setTransferFacility: React.Dispatch<React.SetStateAction<string>>;
  setTransferReason: React.Dispatch<React.SetStateAction<string>>;
  setTransferTransport: React.Dispatch<React.SetStateAction<string>>;
  setTransferOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setApptDate: React.Dispatch<React.SetStateAction<string>>;
  setApptNotes: React.Dispatch<React.SetStateAction<string>>;
  setApptOpen: React.Dispatch<React.SetStateAction<boolean>>;
  // Đa chuyên khoa modal triggers
  setFollowUpRoomId: React.Dispatch<React.SetStateAction<string>>;
  setFollowUpReason: React.Dispatch<React.SetStateAction<string>>;
  setFollowUpOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setChangeRoomNewId: React.Dispatch<React.SetStateAction<string>>;
  setChangeRoomReason: React.Dispatch<React.SetStateAction<string>>;
  setChangeRoomOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setDeleteReason: React.Dispatch<React.SetStateAction<string>>;
  setDeleteOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  rightOpen, conclusion, setConclusion, expandAbbr,
  examId, sickFrom, setSickFrom, sickTo, setSickTo, saveSickLeave,
  saving, saveDraft, goPrescribe, openClsResults, openConsults,
  setPtttOpen, setCabinetOpen, setStockOpen, printExamForm, complete, autoSavedTs,
  selPt, completion, setCompletion, roomId, loadQueue,
  setHospDeptId, setHospReason, setHospEmergency, setHospOpen,
  setTransferFacility, setTransferReason, setTransferTransport, setTransferOpen,
  setApptDate, setApptNotes, setApptOpen,
  setFollowUpRoomId, setFollowUpReason, setFollowUpOpen,
  setChangeRoomNewId, setChangeRoomReason, setChangeRoomOpen,
  setDeleteReason, setDeleteOpen,
}) => (
  <aside className={'ed-right-panel ' + (rightOpen ? 'is-open' : '')} style={{ borderLeft: '1px solid var(--line)', padding: 'var(--space-12)', background: 'var(--d-1)', display: 'flex', flexDirection: 'column', gap: 'var(--space-10)', overflow: 'auto' }}>
    <section style={{ padding: 'var(--space-12)', background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)' }}>
      <h4 style={{ margin: '0 0 8px', fontSize: 'var(--fs-xs)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Kết luận</h4>
      <textarea value={conclusion} onChange={(e) => setConclusion(expandAbbr(e.target.value))} placeholder="Kết luận khám, hướng xử trí, hẹn tái khám…" style={{ width: '100%', minHeight: 80, padding: 'var(--space-8)', border: '1px solid var(--line)', borderRadius: 4, fontSize: 11.5, background: 'var(--d-0)', color: 'var(--t-0)' }} />
    </section>

    <section style={{ padding: 'var(--space-12)', background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)' }}>
      <h4 style={{ margin: '0 0 8px', fontSize: 'var(--fs-xs)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Giấy nghỉ ốm</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        <div><label style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)' }}>Từ ngày</label><input type="date" className="hui-inp" style={{ width: '100%', height: 26 }} value={sickFrom} onChange={(e) => setSickFrom(e.target.value)} /></div>
        <div><label style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)' }}>Đến ngày</label><input type="date" className="hui-inp" style={{ width: '100%', height: 26 }} value={sickTo} onChange={(e) => setSickTo(e.target.value)} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginTop: 'var(--space-8)' }}>
        <Btn variant="ghost" size="sm" style={{ justifyContent: 'center' }} disabled={!sickFrom || !sickTo} onClick={saveSickLeave}>
          <TermIcon name="file-text" size={11} /> Lưu giấy nghỉ
        </Btn>
        <Btn variant="ghost" size="sm" style={{ justifyContent: 'center' }} disabled={!examId} onClick={async () => {
          if (!examId) return;
          try { const r = await printSickLeave(examId); openPdfBlob(r.data as Blob); }
          catch { te('Không in được giấy nghỉ'); }
        }}>
          <TermIcon name="print" size={11} /> In giấy nghỉ
        </Btn>
      </div>
    </section>

    <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
      <Btn variant="ghost" disabled={saving} onClick={saveDraft}><TermIcon name="folder" size={12} /> Lưu nháp</Btn>
      <Btn variant="ghost" onClick={goPrescribe}><TermIcon name="pill" size={12} /> Kê đơn thuốc →</Btn>
      <Btn variant="ghost" onClick={openClsResults}><TermIcon name="flask" size={12} /> KQ XN · CĐHA</Btn>
      <Btn variant="ghost" onClick={openConsults}><TermIcon name="users" size={12} /> Sổ hội chẩn</Btn>
      <Btn variant="ghost" onClick={() => {
        if (!examId) { tw('Chưa chọn bệnh nhân'); return; }
        setPtttOpen(true);
      }}><TermIcon name="scissors" size={12} /> PTTT (F6)</Btn>
      <Btn variant="ghost" onClick={() => {
        if (!examId) { tw('Chưa chọn bệnh nhân'); return; }
        setCabinetOpen(true);
      }}><TermIcon name="package" size={12} /> Xuất tủ trực</Btn>
      <Btn variant="ghost" onClick={() => {
        if (!examId) { tw('Chưa chọn bệnh nhân'); return; }
        setStockOpen(true);
      }}><TermIcon name="archive" size={12} /> Xuất dự trù (F10)</Btn>
      <Btn variant="ghost" onClick={printExamForm}><TermIcon name="print" size={12} /> In phiếu khám</Btn>
      <Btn variant="primary" disabled={saving} onClick={complete}><TermIcon name="check" size={12} /> Hoàn tất khám</Btn>
      {autoSavedTs != null && (
        <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-3)', textAlign: 'center', marginTop: 2 }}>
          ✓ Tự lưu {Math.round((Date.now() - autoSavedTs) / 1000)}s trước
        </div>
      )}
    </div>

    {/* ── XỬ TRÍ ─────────────────────────────────────────── */}
    <section style={{ padding: 'var(--space-12)', background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)' }}>
      <h4 style={{ margin: '0 0 10px', fontSize: 'var(--fs-xs)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t-2)' }}>Xử trí</h4>
      <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
        <Btn
          variant="ghost"
          size="sm"
          onClick={() => {
            if (!examId) { tw('Chưa chọn bệnh nhân'); return; }
            setHospDeptId(''); setHospReason(''); setHospEmergency(false);
            setHospOpen(true);
          }}
        >
          <TermIcon name="bed" size={11} /> Nhập viện
        </Btn>
        <Btn
          variant="ghost"
          size="sm"
          onClick={() => {
            if (!examId) { tw('Chưa chọn bệnh nhân'); return; }
            setTransferFacility(''); setTransferReason(''); setTransferTransport('');
            setTransferOpen(true);
          }}
        >
          <TermIcon name="arrow-right" size={11} /> Chuyển viện
        </Btn>
        <Btn
          variant="ghost"
          size="sm"
          onClick={() => {
            if (!examId) { tw('Chưa chọn bệnh nhân'); return; }
            setApptDate(''); setApptNotes('');
            setApptOpen(true);
          }}
        >
          <TermIcon name="calendar" size={11} /> Hẹn tái khám
        </Btn>
      </div>
    </section>

    {/* ── ĐA CHUYÊN KHOA ─────────────────────────────────── */}
    <section style={{ padding: 'var(--space-12)', background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)' }}>
      <h4 style={{ margin: '0 0 10px', fontSize: 'var(--fs-xs)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t-2)' }}>Đa chuyên khoa</h4>

      {/* 1. Khám thêm CK khác */}
      <div style={{ display: 'grid', gap: 'var(--space-6)', marginBottom: 'var(--space-10)' }}>
        <Btn
          variant="ghost"
          size="sm"
          onClick={() => {
            if (!examId) { tw('Chưa chọn bệnh nhân'); return; }
            setFollowUpRoomId('');
            setFollowUpReason('');
            setFollowUpOpen(true);
          }}
        >
          <TermIcon name="plus" size={11} /> Khám thêm CK khác
        </Btn>

        {/* 2. Đổi phòng (trước khám) — chỉ khi status Chờ hoặc Gọi */}
        <Btn
          variant="ghost"
          size="sm"
          onClick={() => {
            if (!examId) { tw('Chưa chọn bệnh nhân'); return; }
            if (selPt?.status !== 0 && selPt?.status !== 1) {
              tw('Chỉ có thể đổi phòng khi bệnh nhân đang Chờ hoặc Gọi');
              return;
            }
            setChangeRoomNewId('');
            setChangeRoomReason('');
            setChangeRoomOpen(true);
          }}
          disabled={examId !== null && selPt?.status !== 0 && selPt?.status !== 1}
        >
          <TermIcon name="arrow-right" size={11} /> Đổi phòng (trước khám)
        </Btn>
      </div>

      {/* 3. Bảng kê chi phí — completion status */}
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 'var(--space-8)', marginBottom: 'var(--space-8)' }}>
        <div style={{ fontSize: 'var(--fs-xxs)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)', marginBottom: 'var(--space-6)' }}>Bảng kê chi phí</div>
        {completion ? (
          <>
            <div style={{ display: 'flex', gap: 'var(--space-8)', flexWrap: 'wrap', marginBottom: 'var(--space-6)', fontSize: 'var(--fs-xs)' }}>
              <span>Hoàn tất: <b style={{ color: completion.isCompleted ? 'var(--s-ok)' : 'var(--t-2)' }}>{completion.isCompleted ? '✓' : '✗'}</b></span>
              <span>Đã in BK: <b style={{ color: completion.isBillPrinted ? 'var(--s-ok)' : 'var(--t-2)' }}>{completion.isBillPrinted ? '✓' : '✗'}</b></span>
              {completion.totalExamsInChain > 1 && (
                <span className="ab-u-muted">{completion.completedExamsInChain}/{completion.totalExamsInChain} CK</span>
              )}
            </div>
            {completion.blockReason && (
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--s-warn)', marginBottom: 'var(--space-6)', padding: '4px 6px', background: 'var(--d-1)', borderRadius: 4, borderLeft: '3px solid var(--s-warn)' }}>
                {completion.blockReason}
              </div>
            )}
            <div style={{ display: 'grid', gap: 5 }}>
              {/* In bảng kê */}
              {completion.canPrintBill && (
                <Btn
                  variant="ok"
                  size="sm"
                  onClick={async () => {
                    if (!examId) return;
                    try {
                      const result = await printBill(examId);
                      tk('Đã in chi phí (bảng kê)');
                      setCompletion(result);
                    } catch (err: unknown) {
                      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                      te(msg || 'Không thể in bảng kê chi phí');
                    }
                  }}
                >
                  <TermIcon name="print" size={11} /> In bảng kê chi phí
                </Btn>
              )}
              {/* Hủy in chi phí */}
              {completion.isBillPrinted && (
                <Btn
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (!examId) return;
                    try {
                      const result = await cancelPrintBill(examId);
                      tk('Đã hủy in chi phí');
                      setCompletion(result);
                    } catch (err: unknown) {
                      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                      te(msg || 'Không thể hủy in chi phí');
                    }
                  }}
                >
                  <TermIcon name="x" size={11} /> Hủy in chi phí
                </Btn>
              )}
              {/* Hủy hoàn tất */}
              {completion.isCompleted && (
                <Btn
                  variant="crit"
                  size="sm"
                  onClick={async () => {
                    if (!examId) return;
                    // Cảnh báo nếu đã in bảng kê
                    const confirmed = window.confirm(
                      'Hủy hoàn tất? Phiên khám trở về Đang khám.' +
                      (completion.isBillPrinted ? ' Cần hủy in chi phí trước nếu có.' : ''),
                    );
                    if (!confirmed) return;
                    try {
                      const result = await cancelCompletion(examId);
                      tk('Đã hủy hoàn tất');
                      setCompletion(result);
                      loadQueue(roomId);
                    } catch (err: unknown) {
                      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                      te(msg || 'Không thể hủy hoàn tất');
                    }
                  }}
                >
                  <TermIcon name="refresh" size={11} /> Hủy hoàn tất (về Đang khám)
                </Btn>
              )}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-3)' }}>{examId ? 'Đang tải…' : 'Chọn bệnh nhân để xem trạng thái'}</div>
        )}
      </div>

      {/* 4. Xóa đăng ký — destructive */}
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 'var(--space-8)' }}>
        <Btn
          variant="crit"
          size="sm"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => {
            if (!examId) { tw('Chưa chọn bệnh nhân'); return; }
            setDeleteReason('');
            setDeleteOpen(true);
          }}
        >
          <TermIcon name="trash" size={11} /> Xóa đăng ký khám
        </Btn>
      </div>
    </section>
  </aside>
);
