/* =====================================================================
 * DispositionModals — 6 modal xử trí / đa chuyên khoa của OpdEditor.
 * Tách presentational (#362 FE-2b Phase-2): JSX verbatim từ OpdEditor,
 * nhận state + setter + handler (đã đặt tên, GIỮ trong main) qua props.
 * KHÔNG chứa logic nghiệp vụ — handler submit sống ở OpdEditor.
 *   Khám thêm CK · Đổi phòng · Xóa đăng ký · Nhập viện · Chuyển viện · Hẹn tái khám
 * ===================================================================== */

import React from 'react';
import { ModalShell, Btn } from '../../../pages-v2/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import type { RoomDto, RoomPatientListDto } from '../api/examination';
import type { DepartmentCatalogDto } from '../../system/api/system';

export interface DispositionModalsProps {
  // Ngữ cảnh chung
  rooms: RoomDto[];
  roomId: string;
  selPt: RoomPatientListDto | null;
  departments: DepartmentCatalogDto[];

  // Khám thêm CK khác
  followUpOpen: boolean; setFollowUpOpen: (v: boolean) => void;
  followUpRoomId: string; setFollowUpRoomId: (v: string) => void;
  followUpReason: string; setFollowUpReason: (v: string) => void;
  followUpSaving: boolean; onFollowUp: () => void;

  // Đổi phòng trước khám
  changeRoomOpen: boolean; setChangeRoomOpen: (v: boolean) => void;
  changeRoomNewId: string; setChangeRoomNewId: (v: string) => void;
  changeRoomReason: string; setChangeRoomReason: (v: string) => void;
  changeRoomSaving: boolean; onChangeRoom: () => void;

  // Xóa đăng ký khám
  deleteOpen: boolean; setDeleteOpen: (v: boolean) => void;
  deleteReason: string; setDeleteReason: (v: string) => void;
  deleteSaving: boolean; onDelete: () => void;

  // Nhập viện
  hospOpen: boolean; setHospOpen: (v: boolean) => void;
  hospDeptId: string; setHospDeptId: (v: string) => void;
  hospReason: string; setHospReason: (v: string) => void;
  hospEmergency: boolean; setHospEmergency: (v: boolean) => void;
  hospSaving: boolean; onHospitalize: () => void;

  // Chuyển viện
  transferOpen: boolean; setTransferOpen: (v: boolean) => void;
  transferFacility: string; setTransferFacility: (v: string) => void;
  transferReason: string; setTransferReason: (v: string) => void;
  transferTransport: string; setTransferTransport: (v: string) => void;
  transferSaving: boolean; onTransfer: () => void;

  // Hẹn tái khám
  apptOpen: boolean; setApptOpen: (v: boolean) => void;
  apptDate: string; setApptDate: (v: string) => void;
  apptNotes: string; setApptNotes: (v: string) => void;
  apptSaving: boolean; onAppointment: () => void;
}

export const DispositionModals: React.FC<DispositionModalsProps> = ({
  rooms, roomId, selPt, departments,
  followUpOpen, setFollowUpOpen, followUpRoomId, setFollowUpRoomId, followUpReason, setFollowUpReason, followUpSaving, onFollowUp,
  changeRoomOpen, setChangeRoomOpen, changeRoomNewId, setChangeRoomNewId, changeRoomReason, setChangeRoomReason, changeRoomSaving, onChangeRoom,
  deleteOpen, setDeleteOpen, deleteReason, setDeleteReason, deleteSaving, onDelete,
  hospOpen, setHospOpen, hospDeptId, setHospDeptId, hospReason, setHospReason, hospEmergency, setHospEmergency, hospSaving, onHospitalize,
  transferOpen, setTransferOpen, transferFacility, setTransferFacility, transferReason, setTransferReason, transferTransport, setTransferTransport, transferSaving, onTransfer,
  apptOpen, setApptOpen, apptDate, setApptDate, apptNotes, setApptNotes, apptSaving, onAppointment,
}) => {
  return (
    <>
      {/* ── Modal: Khám thêm CK khác ─────────────────────────────────── */}
      <ModalShell
        open={followUpOpen}
        onClose={() => setFollowUpOpen(false)}
        title="Khám thêm chuyên khoa khác"
        sub="Tạo phiên khám tại phòng chuyên khoa khác cho bệnh nhân này"
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-8)', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" size="sm" onClick={() => setFollowUpOpen(false)}>Hủy</Btn>
            <Btn
              variant="primary"
              size="sm"
              disabled={!followUpRoomId || followUpSaving}
              onClick={onFollowUp}
            >
              <TermIcon name="plus" size={11} /> Tạo phiên khám
            </Btn>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-10)' }}>
          <div>
            <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', display: 'block', marginBottom: 'var(--space-4)' }}>Phòng chuyên khoa <span style={{ color: 'var(--s-err)' }}>*</span></label>
            <select
              className="hui-inp hui-sel"
              value={followUpRoomId}
              onChange={(e) => setFollowUpRoomId(e.target.value)}
              style={{ width: '100%', height: 30 }}
            >
              <option value="">(Chọn phòng)</option>
              {rooms.filter((r) => r.id !== roomId).map((r) => (
                <option key={r.id} value={r.id}>{r.code} · {r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', display: 'block', marginBottom: 'var(--space-4)' }}>Lý do (tùy chọn)</label>
            <textarea
              className="hui-inp"
              value={followUpReason}
              onChange={(e) => setFollowUpReason(e.target.value)}
              placeholder="Lý do chuyển khám chuyên khoa…"
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </div>
      </ModalShell>

      {/* ── Modal: Đổi phòng trước khám ──────────────────────────────── */}
      <ModalShell
        open={changeRoomOpen}
        onClose={() => setChangeRoomOpen(false)}
        title="Đổi phòng trước khi khám"
        sub="Chuyển bệnh nhân sang phòng khám khác (chỉ khi chưa bắt đầu khám)"
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-8)', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" size="sm" onClick={() => setChangeRoomOpen(false)}>Hủy</Btn>
            <Btn
              variant="primary"
              size="sm"
              disabled={!changeRoomNewId || changeRoomSaving}
              onClick={onChangeRoom}
            >
              <TermIcon name="arrow-right" size={11} /> Xác nhận đổi phòng
            </Btn>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-10)' }}>
          <div>
            <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', display: 'block', marginBottom: 'var(--space-4)' }}>Phòng mới <span style={{ color: 'var(--s-err)' }}>*</span></label>
            <select
              className="hui-inp hui-sel"
              value={changeRoomNewId}
              onChange={(e) => setChangeRoomNewId(e.target.value)}
              style={{ width: '100%', height: 30 }}
            >
              <option value="">(Chọn phòng)</option>
              {rooms.filter((r) => r.id !== roomId).map((r) => (
                <option key={r.id} value={r.id}>{r.code} · {r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', display: 'block', marginBottom: 'var(--space-4)' }}>Lý do (tùy chọn)</label>
            <textarea
              className="hui-inp"
              value={changeRoomReason}
              onChange={(e) => setChangeRoomReason(e.target.value)}
              placeholder="Lý do đổi phòng…"
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </div>
      </ModalShell>

      {/* ── Modal: Xóa đăng ký khám ──────────────────────────────────── */}
      <ModalShell
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Xóa đăng ký khám"
        sub="Thao tác này không thể hoàn tác"
        size="sm"
        tone="danger"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-8)', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" size="sm" onClick={() => setDeleteOpen(false)}>Hủy</Btn>
            <Btn
              variant="crit"
              size="sm"
              disabled={!deleteReason.trim() || deleteSaving}
              onClick={onDelete}
            >
              <TermIcon name="trash" size={11} /> Xóa đăng ký
            </Btn>
          </div>
        }
      >
        <div>
          <div style={{ marginBottom: 'var(--space-10)', fontSize: 'var(--fs-sm)', color: 'var(--t-1)' }}>
            Xóa đăng ký khám của <b>{selPt?.patientName}</b> (STT {selPt?.queueNumber})?
          </div>
          <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', display: 'block', marginBottom: 'var(--space-4)' }}>
            Lý do xóa <span style={{ color: 'var(--s-err)' }}>*</span>
          </label>
          <textarea
            className="hui-inp"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            placeholder="Bắt buộc nhập lý do xóa…"
            rows={3}
            style={{ width: '100%', resize: 'vertical', borderColor: !deleteReason.trim() ? 'var(--s-err)' : undefined }}
          />
          {!deleteReason.trim() && (
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--s-err)', marginTop: 'var(--space-4)' }}>Lý do không được để trống</div>
          )}
        </div>
      </ModalShell>

      {/* ── Modal: Nhập viện ─────────────────────────────────────────── */}
      <ModalShell
        open={hospOpen}
        onClose={() => setHospOpen(false)}
        title="Yêu cầu nhập viện"
        sub={selPt ? `${selPt.patientName} · ${selPt.patientCode}` : ''}
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-8)', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" size="sm" onClick={() => setHospOpen(false)}>Hủy</Btn>
            <Btn variant="primary" size="sm" disabled={!hospDeptId || !hospReason.trim() || hospSaving} onClick={onHospitalize}>
              <TermIcon name="bed" size={11} /> Tạo yêu cầu &amp; in
            </Btn>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-10)' }}>
          <div>
            <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', display: 'block', marginBottom: 'var(--space-4)' }}>Khoa nhập viện <span style={{ color: 'var(--s-err)' }}>*</span></label>
            <select className="hui-inp hui-sel" value={hospDeptId} onChange={(e) => setHospDeptId(e.target.value)} style={{ width: '100%', height: 30 }}>
              <option value="">(Chọn khoa)</option>
              {departments.filter((d) => d.id).map((d) => (
                <option key={d.id} value={d.id}>{d.code} · {d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', display: 'block', marginBottom: 'var(--space-4)' }}>Lý do nhập viện <span style={{ color: 'var(--s-err)' }}>*</span></label>
            <textarea className="hui-inp" value={hospReason} onChange={(e) => setHospReason(e.target.value)} placeholder="Lý do nhập viện…" rows={3} style={{ width: '100%', resize: 'vertical' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', fontSize: 'var(--fs-sm)', color: 'var(--t-1)' }}>
            <input type="checkbox" checked={hospEmergency} onChange={(e) => setHospEmergency(e.target.checked)} /> Nhập viện cấp cứu
          </label>
        </div>
      </ModalShell>

      {/* ── Modal: Chuyển viện ───────────────────────────────────────── */}
      <ModalShell
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        title="Yêu cầu chuyển viện"
        sub={selPt ? `${selPt.patientName} · ${selPt.patientCode}` : ''}
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-8)', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" size="sm" onClick={() => setTransferOpen(false)}>Hủy</Btn>
            <Btn variant="primary" size="sm" disabled={!transferFacility.trim() || !transferReason.trim() || transferSaving} onClick={onTransfer}>
              <TermIcon name="arrow-right" size={11} /> Tạo yêu cầu &amp; in
            </Btn>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-10)' }}>
          <div>
            <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', display: 'block', marginBottom: 'var(--space-4)' }}>Cơ sở chuyển đến <span style={{ color: 'var(--s-err)' }}>*</span></label>
            <input className="hui-inp" value={transferFacility} onChange={(e) => setTransferFacility(e.target.value)} placeholder="Tên bệnh viện / cơ sở y tế…" style={{ width: '100%', height: 30 }} />
          </div>
          <div>
            <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', display: 'block', marginBottom: 'var(--space-4)' }}>Lý do chuyển viện <span style={{ color: 'var(--s-err)' }}>*</span></label>
            <textarea className="hui-inp" value={transferReason} onChange={(e) => setTransferReason(e.target.value)} placeholder="Lý do chuyển viện…" rows={3} style={{ width: '100%', resize: 'vertical' }} />
          </div>
          <div>
            <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', display: 'block', marginBottom: 'var(--space-4)' }}>Phương tiện vận chuyển</label>
            <input className="hui-inp" value={transferTransport} onChange={(e) => setTransferTransport(e.target.value)} placeholder="Xe cứu thương, tự túc…" style={{ width: '100%', height: 30 }} />
          </div>
        </div>
      </ModalShell>

      {/* ── Modal: Hẹn tái khám ──────────────────────────────────────── */}
      <ModalShell
        open={apptOpen}
        onClose={() => setApptOpen(false)}
        title="Hẹn tái khám"
        sub={selPt ? `${selPt.patientName} · ${selPt.patientCode}` : ''}
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-8)', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" size="sm" onClick={() => setApptOpen(false)}>Hủy</Btn>
            <Btn variant="primary" size="sm" disabled={!apptDate || apptSaving} onClick={onAppointment}>
              <TermIcon name="calendar" size={11} /> Tạo lịch hẹn
            </Btn>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-10)' }}>
          <div>
            <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', display: 'block', marginBottom: 'var(--space-4)' }}>Ngày hẹn tái khám <span style={{ color: 'var(--s-err)' }}>*</span></label>
            <input type="date" className="hui-inp" value={apptDate} onChange={(e) => setApptDate(e.target.value)} style={{ width: '100%', height: 30 }} />
          </div>
          <div>
            <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', display: 'block', marginBottom: 'var(--space-4)' }}>Lý do / ghi chú</label>
            <textarea className="hui-inp" value={apptNotes} onChange={(e) => setApptNotes(e.target.value)} placeholder="Lý do hẹn tái khám, dặn dò…" rows={3} style={{ width: '100%', resize: 'vertical' }} />
          </div>
        </div>
      </ModalShell>
    </>
  );
};

export default DispositionModals;
