import { useState, useEffect } from 'react';
import { catalogApi, type DepartmentCatalogDto } from '../../system/api/system';
import {
  requestHospitalization, requestTransfer, createAppointment,
  printAdmissionForm, printTransferForm, printAppointmentSlip,
} from '../api/examination';
import {
  addFollowUpSpecialty, changeRoomBeforeExam, deleteRegistration,
  type ExamCompletionStatus,
} from '../api/multiSpecialtyExam';
import { openPdfBlob } from '../pages/_shared';
import { tk, tw, te, ti } from '../../../pages-v2/_v2kit';
import type { DxRow } from '../pages/_shared';

interface Params {
  examId: string | null;
  diagnoses: DxRow[];
  refreshCompletion: (eid: string) => Promise<void>;
  loadQueue: (rid: string) => Promise<void>;
  roomId: string;
  setSelPt: (v: null) => void;
  setCompletion: React.Dispatch<React.SetStateAction<ExamCompletionStatus | null>>;
}

export function useOpdDisposition({
  examId, diagnoses, refreshCompletion, loadQueue, roomId, setSelPt, setCompletion,
}: Params) {
  const [departments, setDepartments] = useState<DepartmentCatalogDto[]>([]);

  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpRoomId, setFollowUpRoomId] = useState('');
  const [followUpReason, setFollowUpReason] = useState('');
  const [followUpSaving, setFollowUpSaving] = useState(false);

  const [changeRoomOpen, setChangeRoomOpen] = useState(false);
  const [changeRoomNewId, setChangeRoomNewId] = useState('');
  const [changeRoomReason, setChangeRoomReason] = useState('');
  const [changeRoomSaving, setChangeRoomSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteSaving, setDeleteSaving] = useState(false);

  const [hospOpen, setHospOpen] = useState(false);
  const [hospDeptId, setHospDeptId] = useState('');
  const [hospReason, setHospReason] = useState('');
  const [hospEmergency, setHospEmergency] = useState(false);
  const [hospSaving, setHospSaving] = useState(false);

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferFacility, setTransferFacility] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferTransport, setTransferTransport] = useState('');
  const [transferSaving, setTransferSaving] = useState(false);

  const [apptOpen, setApptOpen] = useState(false);
  const [apptDate, setApptDate] = useState('');
  const [apptNotes, setApptNotes] = useState('');
  const [apptSaving, setApptSaving] = useState(false);

  useEffect(() => {
    catalogApi.getDepartments(undefined, undefined, true)
      .then((r) => setDepartments(Array.isArray(r.data) ? r.data : []))
      .catch(() => setDepartments([]));
  }, []);

  const doHospitalize = async () => {
    if (!examId) return;
    if (!hospDeptId) { tw('Chọn khoa nhập viện'); return; }
    if (!hospReason.trim()) { tw('Nhập lý do nhập viện'); return; }
    setHospSaving(true);
    try {
      const primary = diagnoses.find((d) => d.isPrimary);
      await requestHospitalization(examId, {
        departmentId: hospDeptId,
        reason: hospReason.trim(),
        diagnosisCode: primary?.icdCode,
        diagnosisName: primary?.icdName,
        isEmergency: hospEmergency,
      });
      tk('Đã tạo yêu cầu nhập viện');
      try { const r = await printAdmissionForm(examId); openPdfBlob(r.data as Blob); }
      catch { ti('Đã tạo yêu cầu nhưng không in được giấy nhập viện'); }
      setHospOpen(false);
      setHospDeptId(''); setHospReason(''); setHospEmergency(false);
      refreshCompletion(examId);
      loadQueue(roomId);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      te(msg || 'Yêu cầu nhập viện thất bại');
    } finally { setHospSaving(false); }
  };

  const doTransfer = async () => {
    if (!examId) return;
    if (!transferFacility.trim()) { tw('Nhập tên cơ sở chuyển đến'); return; }
    if (!transferReason.trim()) { tw('Nhập lý do chuyển viện'); return; }
    setTransferSaving(true);
    try {
      const primary = diagnoses.find((d) => d.isPrimary);
      await requestTransfer(examId, {
        facilityName: transferFacility.trim(),
        reason: transferReason.trim(),
        diagnosisCode: primary?.icdCode,
        diagnosisName: primary?.icdName,
        transportMethod: transferTransport.trim() || undefined,
      });
      tk('Đã tạo yêu cầu chuyển viện');
      try { const r = await printTransferForm(examId); openPdfBlob(r.data as Blob); }
      catch { ti('Đã tạo yêu cầu nhưng không in được giấy chuyển viện'); }
      setTransferOpen(false);
      setTransferFacility(''); setTransferReason(''); setTransferTransport('');
      refreshCompletion(examId);
      loadQueue(roomId);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      te(msg || 'Yêu cầu chuyển viện thất bại');
    } finally { setTransferSaving(false); }
  };

  const doAppointment = async () => {
    if (!examId) return;
    if (!apptDate) { tw('Chọn ngày hẹn tái khám'); return; }
    setApptSaving(true);
    try {
      const r = await createAppointment(examId, {
        appointmentDate: new Date(apptDate).toISOString(),
        roomId: roomId || undefined,
        notes: apptNotes.trim() || undefined,
      });
      tk('Đã tạo lịch hẹn tái khám');
      const apptId = r.data?.id;
      if (apptId) {
        try { const slip = await printAppointmentSlip(apptId); openPdfBlob(slip.data as Blob); }
        catch { /* giấy hẹn là tùy chọn */ }
      }
      setApptOpen(false);
      setApptDate(''); setApptNotes('');
      refreshCompletion(examId);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      te(msg || 'Hẹn tái khám thất bại');
    } finally { setApptSaving(false); }
  };

  const doFollowUp = async () => {
    if (!examId || !followUpRoomId) return;
    setFollowUpSaving(true);
    try {
      const result = await addFollowUpSpecialty({
        parentExaminationId: examId,
        roomId: followUpRoomId,
        reason: followUpReason || undefined,
      });
      tk(`Đã tạo phiên khám CK khác — Phòng ${result.roomName}, STT ${result.queueNumber}`);
      setFollowUpOpen(false);
      loadQueue(roomId);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      te(msg || 'Không thêm được phiên khám CK khác');
    } finally { setFollowUpSaving(false); }
  };

  const doChangeRoom = async () => {
    if (!examId || !changeRoomNewId) return;
    setChangeRoomSaving(true);
    try {
      await changeRoomBeforeExam({
        examinationId: examId,
        newRoomId: changeRoomNewId,
        reason: changeRoomReason || undefined,
      });
      tk('Đã đổi phòng trước khám');
      setChangeRoomOpen(false);
      setSelPt(null);
      loadQueue(roomId);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      te(msg || 'Không thể đổi phòng');
    } finally { setChangeRoomSaving(false); }
  };

  const doDelete = async () => {
    if (!examId || !deleteReason.trim()) return;
    setDeleteSaving(true);
    try {
      await deleteRegistration(examId, deleteReason.trim());
      tk('Đã xóa đăng ký khám');
      setDeleteOpen(false);
      setSelPt(null);
      setCompletion(null);
      loadQueue(roomId);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      te(msg || 'Không thể xóa đăng ký khám');
    } finally { setDeleteSaving(false); }
  };

  return {
    departments,
    followUpOpen, setFollowUpOpen, followUpRoomId, setFollowUpRoomId,
    followUpReason, setFollowUpReason, followUpSaving, doFollowUp,
    changeRoomOpen, setChangeRoomOpen, changeRoomNewId, setChangeRoomNewId,
    changeRoomReason, setChangeRoomReason, changeRoomSaving, doChangeRoom,
    deleteOpen, setDeleteOpen, deleteReason, setDeleteReason,
    deleteSaving, doDelete,
    hospOpen, setHospOpen, hospDeptId, setHospDeptId,
    hospReason, setHospReason, hospEmergency, setHospEmergency,
    hospSaving, doHospitalize,
    transferOpen, setTransferOpen, transferFacility, setTransferFacility,
    transferReason, setTransferReason, transferTransport, setTransferTransport,
    transferSaving, doTransfer,
    apptOpen, setApptOpen, apptDate, setApptDate,
    apptNotes, setApptNotes, apptSaving, doAppointment,
  };
}
