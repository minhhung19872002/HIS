/* OpdEditor v2 — full-screen khám ngoại trú (native v2, ab-* design)
 * State/handlers extracted to hooks/; JSX blocks to child components.
 * Patient-safety handlers (persist/saveDraft/complete) stay here per Rule 6.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { KpiStrip, Btn, fmtVNDg, tk, tw, te, ti } from '@/_v2kit';
import { friendlyErrorMessage } from '../../../utils/friendlyError';
import { SurgeryReportModal } from '../../surgery/pages/SurgeryReportModal';
import { CabinetIssueModal } from '../../pharmacy/pages/CabinetIssueModal';
import TermIcon from '../../../components/layout/terminal/Icon';
import BarcodeScanner from '../../../components/form/BarcodeScanner';
import {
  examinationApi, printExaminationForm, updateInjuryInfo,
  type RoomPatientListDto, type InjuryInfoDto,
} from '../api/examination';
import { openPdfBlob } from './_shared';
import { InjurySection } from './InjurySection';
import { ClsResultsModal } from './ClsResultsModal';
import StockReservationModal from '../../pharmacy/components/StockReservationModal';
import { ConsultModal } from './ConsultModal';
import { TemplateModals } from './TemplateModals';
import { DispositionModals } from './DispositionModals';
import { DiagnosisOrdersSection } from './DiagnosisOrdersSection';
import { VitalsSection } from './VitalsSection';
import { AnamnesisSection } from './AnamnesisSection';
import { RightPanel } from './RightPanel';
import { QueuePanel } from './QueuePanel';
import { HistoryExamSection } from './HistoryExamSection';
import PatientFlagBanner from '../../patient/components/PatientFlagBanner';
import BusinessAlertPanel from '../../patient/components/BusinessAlertPanel';
import { useOpdQueue } from '../hooks/useOpdQueue';
import { useOpdPatientData } from '../hooks/useOpdPatientData';
import { useOpdCompletion } from '../hooks/useOpdCompletion';
import { useOpdAutoSave } from '../hooks/useOpdAutoSave';
import { useOpdTemplates } from '../hooks/useOpdTemplates';
import { useOpdClsConsult } from '../hooks/useOpdClsConsult';
import { useOpdDisposition } from '../hooks/useOpdDisposition';
import { useOpdCds } from '../hooks/useOpdCds';
import { useOpdOrderTemplates } from '../hooks/useOpdOrderTemplates';
import '../../../components/layout/terminal/ed-responsive.css';

const OpdEditorV2: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const deepLinkHandled = useRef(false);

  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const closeAll = () => { setLeftOpen(false); setRightOpen(false); };

  const [selPt, setSelPt] = useState<RoomPatientListDto | null>(null);
  const [stockOpen, setStockOpen] = useState(false);
  const [ptttOpen, setPtttOpen] = useState(false);
  const [cabinetOpen, setCabinetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSavedTs, setAutoSavedTs] = useState<number | null>(null);

  const { rooms, roomId, setRoomId, type, setType, queue, loadQueue, scanOpen, setScanOpen } = useOpdQueue();

  const {
    vitals, setVitals, history, setHistory, pastHist, setPastHist,
    familyHist, setFamilyHist, allergyHist, setAllergyHist, medHist, setMedHist,
    allergies, injuryInfo, setInjuryInfo, exam, setExam, conclusion, setConclusion,
    diagnoses, setDx, orders, setOrd, expandAbbr,
    icdQ, searchIcd, icdResults, addIcd, setPrimary, removeIcd,
    svcQ, searchSvc, svcResults, addSvc, updateQty, removeSvc, selectPatient,
  } = useOpdPatientData({ setLeftOpen, setSelPt, setAutoSavedTs });

  const openPatient = useCallback(async (patient: RoomPatientListDto) => {
    await selectPatient(patient);
    if (patient.status !== 0) return;
    try {
      await examinationApi.startExamination(patient.examinationId);
      setSelPt((current) => current?.examinationId === patient.examinationId
        ? { ...current, status: 1, statusName: 'Đang khám' }
        : current);
      await loadQueue(roomId);
      tk('Đã bắt đầu khám');
    } catch (error) {
      tw(friendlyErrorMessage(error, 'Không thể bắt đầu khám — kiểm tra phân công bác sĩ và CCHN'));
    }
  }, [loadQueue, roomId, selectPatient]);

  useEffect(() => {
    const targetRoomId = searchParams.get('roomId');
    if (targetRoomId && rooms.some((room) => room.id === targetRoomId) && roomId !== targetRoomId)
      setRoomId(targetRoomId);
  }, [roomId, rooms, searchParams, setRoomId]);

  useEffect(() => {
    const targetExamId = searchParams.get('examId');
    if (!targetExamId || deepLinkHandled.current) return;
    const patient = queue.find((item) => item.examinationId === targetExamId);
    if (!patient) return;
    deepLinkHandled.current = true;
    void openPatient(patient);
  }, [openPatient, queue, searchParams]);

  const examId = selPt?.examinationId ?? null;

  const { completion, setCompletion, refreshCompletion } = useOpdCompletion(examId);

  useOpdAutoSave({
    examId, history, pastHist, familyHist, allergyHist, medHist, exam, conclusion, vitals,
    setAutoSavedTs, setStockOpen,
  });

  const { suggestions: cdsSuggestions, alerts: cdsAlerts, ews: cdsEws, cdsLoading, hasActiveMeds, runCds } =
    useOpdCds({ examId, selPt, vitals, history, exam });

  const { orderTpls, saveOrderTpl, applyOrderTpl, removeOrderTpl } = useOpdOrderTemplates(orders, setOrd);

  const saveCurrentOrderTpl = () => {
    const name = window.prompt('Tên mẫu bộ chỉ định:')?.trim();
    if (!name) return;
    if (saveOrderTpl(name)) tk(`Đã lưu mẫu "${name}"`);
    else tw('Chưa có chỉ định nào để lưu thành mẫu');
  };

  /** Thêm chẩn đoán từ gợi ý CDS — bác sĩ chủ động chọn (không tự áp). */
  const pickCdsSuggestion = (s: { icdCode: string; icdName: string }) =>
    setDx((p) => (p.some((x) => x.icdCode === s.icdCode)
      ? p
      : [...p, { icdCode: s.icdCode, icdName: s.icdName, isPrimary: p.length === 0 }]));

  const {
    tpls, tplManageOpen, setTplManageOpen, tplSaveOpen, setTplSaveOpen,
    tplName, setTplName, tplBusy, applyTpl, saveCurrentAsTpl, removeTpl,
  } = useOpdTemplates({ history, exam, conclusion, diagnoses, setHistory, setExam, setConclusion });

  const {
    clsOpen, setClsOpen, clsData, clsLoading,
    consultOpen, setConsultOpen, consults, consultForm, setConsultForm, consultSaving,
    openClsResults, openConsults, saveConsult,
    sickFrom, setSickFrom, sickTo, setSickTo, saveSickLeave,
  } = useOpdClsConsult({ examId });

  const disp = useOpdDisposition({
    examId, diagnoses, refreshCompletion, loadQueue, roomId, setSelPt, setCompletion,
  });

  const totalSvc = orders.reduce((s, o) => s + o.unitPrice * o.qty, 0);

  // ── Patient-safety handlers (Rule 6: stay in main) ──────────────────
  const persist = async (): Promise<boolean> => {
    if (!examId) { tw('Chưa chọn bệnh nhân từ hàng đợi'); return false; }
    const primary = diagnoses.find((d) => d.isPrimary);
    const coreResults = await Promise.allSettled([
      examinationApi.updateVitalSigns(examId, { ...vitals, measuredAt: new Date().toISOString() }),
      examinationApi.updateMedicalInterview(examId, {
        historyOfPresentIllness: history, pastMedicalHistory: pastHist,
        familyHistory: familyHist, allergyHistory: allergyHist, medicationHistory: medHist,
      }),
      examinationApi.updatePhysicalExamination(examId, { generalAppearance: exam }),
      examinationApi.updateDiagnosisList(examId, {
        primaryIcdCode: primary?.icdCode, primaryDiagnosis: primary?.icdName,
        secondaryDiagnoses: diagnoses.filter((d) => !d.isPrimary).map((d) => ({ icdCode: d.icdCode, diagnosisName: d.icdName })),
      }),
    ]);
    if (orders.length > 0) {
      await examinationApi.createServiceOrders({
        examinationId: examId, diagnosisCode: primary?.icdCode, diagnosisName: primary?.icdName,
        services: orders.map((o) => ({ serviceId: o.serviceId, quantity: o.qty, paymentType: 1, isPriority: false, isEmergency: false })),
        autoSelectRoom: true, calculateOptimalPath: true,
      }).catch((e) => { tw(friendlyErrorMessage(e, 'Chỉ định CLS có thể chưa được lưu — vui lòng kiểm tra lại.')); /* hoặc đã tồn tại từ trước */ });
    }
    if (injuryInfo.injuryType) {
      await updateInjuryInfo(examId, injuryInfo as InjuryInfoDto)
        .catch((e) => { tw(friendlyErrorMessage(e, 'Khai báo TNGT (Biểu 14.5) có thể chưa được lưu — vui lòng kiểm tra lại.')); });
    }
    // patient-safety (#467): Promise.allSettled không tự reject — nếu bỏ qua, saveDraft/complete
    // báo "Đã lưu" ngay cả khi TOÀN BỘ sinh hiệu/bệnh sử/khám/chẩn đoán lưu thất bại. Kiểm tra lại
    // kết quả sau khi đã gọi đủ các API theo đúng thứ tự/điều kiện như cũ, chỉ đổi quyết định
    // thành công/thất bại cuối cùng.
    const failedCount = coreResults.filter((r) => r.status === 'rejected').length;
    if (failedCount > 0) {
      throw new Error(`Lưu thất bại ${failedCount}/${coreResults.length} mục (sinh hiệu/bệnh sử/khám/chẩn đoán)`);
    }
    return true;
  };

  const saveDraft = async () => {
    setSaving(true);
    try { if (await persist()) tk('Đã lưu nháp phiếu khám'); }
    catch { te('Lưu nháp thất bại'); } finally { setSaving(false); }
  };

  const complete = async () => {
    if (!examId) { tw('Chưa chọn bệnh nhân'); return; }
    if (diagnoses.length === 0) { tw('Cần ít nhất 1 chẩn đoán (tab Chẩn đoán)'); return; }
    if (!conclusion.trim()) { tw('Nhập kết luận khám (tab Kết luận) trước khi hoàn tất'); return; }
    setSaving(true);
    try {
      await persist();
      await examinationApi.completeExamination(examId, { conclusionType: 1, conclusionNotes: conclusion });
      tk('✓ Đã hoàn tất khám'); loadQueue(roomId);
    } catch { te('Hoàn tất khám thất bại'); } finally { setSaving(false); }
  };

  const goPrescribe = () => {
    if (!examId) { tw('Chưa chọn bệnh nhân'); return; }
    if (selPt?.status === 0) { tw('Bệnh nhân chưa bắt đầu khám — không thể kê đơn'); return; }
    if (selPt?.status === 5) { tw('Phiên khám đã hủy — không thể kê đơn'); return; }
    navigate(`/v2/prescription/edit?examId=${encodeURIComponent(examId)}`);
  };

  const printExamForm = async () => {
    if (!examId) { tw('Chưa chọn bệnh nhân'); return; }
    try { const r = await printExaminationForm(examId); openPdfBlob(r.data as Blob); }
    catch { te('Không in được phiếu khám'); }
  };

  const waitingCount = queue.filter((q) => q.status === 0 || q.status === 1).length;

  return (
    <div className="ab ed-root" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 320px', gridTemplateRows: 'auto 1fr', height: '100%' }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <KpiStrip items={[
          { lbl: 'Phòng khám', val: rooms.find((r) => r.id === roomId)?.name || '—', sub: type === 'general' ? 'Ngoại trú chung' : 'YHCT' },
          { lbl: 'BN đang khám', val: selPt?.patientName || '—', sub: selPt ? `${selPt.patientCode} · ${selPt.age}T` : '—' },
          { lbl: 'Hàng đợi', val: waitingCount, tone: 'warn', sub: `/ ${queue.length} tổng` },
          { lbl: 'Số CĐ', val: diagnoses.length, sub: `${diagnoses.filter((d) => d.isPrimary).length} chính` },
          { lbl: 'Chỉ định CLS', val: orders.length, tone: 'info', sub: fmtVNDg(totalSvc) },
        ]} />
      </div>

      <QueuePanel
        leftOpen={leftOpen} rooms={rooms} roomId={roomId} setRoomId={setRoomId}
        setSelPt={setSelPt} setScanOpen={setScanOpen} type={type} setType={setType}
        queue={queue} selPt={selPt} selectPatient={openPatient}
      />

      <main style={{ overflow: 'auto', padding: 'var(--space-14)', display: 'flex', flexDirection: 'column', gap: 'var(--space-14)' }}>
        {!selPt ? (
          <div style={{ padding: '60px 12px', textAlign: 'center', color: 'var(--t-3)' }}>
            <TermIcon name="user" size={32} />
            <div style={{ marginTop: 'var(--space-12)', fontWeight: 600, color: 'var(--t-2)' }}>Chọn bệnh nhân từ hàng đợi để bắt đầu khám</div>
          </div>
        ) : (
          <>
            <PatientFlagBanner patientId={selPt.patientId} patientName={selPt.patientName} />
            <BusinessAlertPanel patientId={selPt.patientId} examinationId={examId ?? undefined} module="OPD" />

            {/* Cảnh báo lâm sàng CDS (tương tác thuốc · dị ứng · KQ bất thường) — #433 */}
            {cdsAlerts.length > 0 && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {cdsAlerts.map((a, i) => (
                  <div key={`${a.alertType}-${i}`} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 'var(--space-8)',
                    padding: '6px 10px', borderRadius: 'var(--r-2)', fontSize: 11.5,
                    border: '1px solid var(--line)',
                    borderLeft: `3px solid ${a.severity === 'Critical' ? 'var(--s-crit)' : a.severity === 'Warning' ? 'var(--s-warn)' : 'var(--a-cy)'}`,
                    background: 'var(--d-0)',
                  }}>
                    <TermIcon name="alert" size={12} />
                    <div>
                      <strong>{a.title}</strong>
                      <div style={{ color: 'var(--t-2)' }}>
                        {a.message}{a.actionRecommendation ? ` → ${a.actionRecommendation}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {hasActiveMeds && (
              <div style={{
                padding: '6px 10px', borderRadius: 'var(--r-2)', fontSize: 11.5,
                border: '1px solid var(--line)', borderLeft: '3px solid var(--s-warn)', background: 'var(--d-0)',
              }}>
                <strong>Còn thuốc chưa lĩnh</strong>
                <span style={{ color: 'var(--t-2)' }}> — bệnh nhân có đơn thuốc chưa được cấp phát. Kiểm tra trước khi kê đơn mới.</span>
              </div>
            )}

            {cdsEws && (
              <div style={{
                padding: '6px 10px', borderRadius: 'var(--r-2)', fontSize: 11.5,
                border: '1px solid var(--line)', borderLeft: '3px solid var(--s-warn)', background: 'var(--d-0)',
              }}>
                <strong>NEWS2: {cdsEws.totalScore} — {cdsEws.riskLevel}</strong>
                <span style={{ color: 'var(--t-2)' }}> · {cdsEws.recommendation}</span>
              </div>
            )}

            <VitalsSection vitals={vitals} setVitals={setVitals} />
            <section style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', flexWrap: 'wrap' }}>
              <select className="hui-inp" value="" onChange={(e) => applyTpl(e.target.value)}
                style={{ height: 30, fontSize: 'var(--fs-sm)', flex: '0 1 340px', minWidth: 220 }}>
                <option value="">Áp mẫu HSBA{tpls.length ? ` (${tpls.length} mẫu)` : ' (chưa có mẫu)'}…</option>
                {tpls.map((t) => <option key={t.id} value={t.id}>{t.templateCode} — {t.templateName}{t.diagnosisCode ? ` (${t.diagnosisCode})` : ''}</option>)}
              </select>
              <Btn variant="ghost" onClick={() => { setTplName(''); setTplSaveOpen(true); }}><TermIcon name="plus" size={12} /> Lưu thành mẫu</Btn>
              <Btn variant="ghost" onClick={() => setTplManageOpen(true)}><TermIcon name="list" size={12} /> Quản lý mẫu</Btn>
            </section>
            <HistoryExamSection history={history} setHistory={setHistory} exam={exam} setExam={setExam} expandAbbr={expandAbbr} />
            <AnamnesisSection
              allergies={allergies} pastHist={pastHist} setPastHist={setPastHist}
              familyHist={familyHist} setFamilyHist={setFamilyHist}
              allergyHist={allergyHist} setAllergyHist={setAllergyHist}
              medHist={medHist} setMedHist={setMedHist} expandAbbr={expandAbbr}
            />
            <DiagnosisOrdersSection
              icdQ={icdQ} searchIcd={searchIcd} icdResults={icdResults} addIcd={addIcd}
              diagnoses={diagnoses} setPrimary={setPrimary} removeIcd={removeIcd}
              cdsSuggestions={cdsSuggestions} cdsLoading={cdsLoading}
              onRunCds={() => { void runCds(); }} onPickSuggestion={pickCdsSuggestion}
              svcQ={svcQ} searchSvc={searchSvc} svcResults={svcResults} addSvc={addSvc}
              orders={orders} updateQty={updateQty} removeSvc={removeSvc} totalSvc={totalSvc}
              orderTpls={orderTpls} onApplyOrderTpl={applyOrderTpl}
              onSaveOrderTpl={saveCurrentOrderTpl} onRemoveOrderTpl={removeOrderTpl}
            />
            <InjurySection injuryInfo={injuryInfo} setInjuryInfo={setInjuryInfo} />
          </>
        )}
      </main>

      <RightPanel
        rightOpen={rightOpen}
        conclusion={conclusion} setConclusion={setConclusion} expandAbbr={expandAbbr}
        examId={examId} sickFrom={sickFrom} setSickFrom={setSickFrom} sickTo={sickTo} setSickTo={setSickTo} saveSickLeave={saveSickLeave}
        saving={saving} saveDraft={saveDraft} goPrescribe={goPrescribe}
        openClsResults={openClsResults} openConsults={openConsults}
        setPtttOpen={setPtttOpen} setCabinetOpen={setCabinetOpen} setStockOpen={setStockOpen}
        printExamForm={printExamForm} complete={complete} autoSavedTs={autoSavedTs}
        selPt={selPt} completion={completion} setCompletion={setCompletion}
        roomId={roomId} loadQueue={loadQueue}
        setHospDeptId={disp.setHospDeptId} setHospReason={disp.setHospReason} setHospEmergency={disp.setHospEmergency} setHospOpen={disp.setHospOpen}
        setTransferFacility={disp.setTransferFacility} setTransferReason={disp.setTransferReason} setTransferTransport={disp.setTransferTransport} setTransferOpen={disp.setTransferOpen}
        setApptDate={disp.setApptDate} setApptNotes={disp.setApptNotes} setApptOpen={disp.setApptOpen}
        setFollowUpRoomId={disp.setFollowUpRoomId} setFollowUpReason={disp.setFollowUpReason} setFollowUpOpen={disp.setFollowUpOpen}
        setChangeRoomNewId={disp.setChangeRoomNewId} setChangeRoomReason={disp.setChangeRoomReason} setChangeRoomOpen={disp.setChangeRoomOpen}
        setDeleteReason={disp.setDeleteReason} setDeleteOpen={disp.setDeleteOpen}
      />

      <TemplateModals
        saveOpen={tplSaveOpen} setSaveOpen={setTplSaveOpen} name={tplName} setName={setTplName}
        busy={tplBusy} onSave={saveCurrentAsTpl} manageOpen={tplManageOpen} setManageOpen={setTplManageOpen}
        tpls={tpls} onRemove={removeTpl} history={history} exam={exam} conclusion={conclusion} diagnoses={diagnoses}
      />

      <DispositionModals
        rooms={rooms} roomId={roomId} selPt={selPt} departments={disp.departments}
        followUpOpen={disp.followUpOpen} setFollowUpOpen={disp.setFollowUpOpen}
        followUpRoomId={disp.followUpRoomId} setFollowUpRoomId={disp.setFollowUpRoomId}
        followUpReason={disp.followUpReason} setFollowUpReason={disp.setFollowUpReason}
        followUpSaving={disp.followUpSaving} onFollowUp={disp.doFollowUp}
        changeRoomOpen={disp.changeRoomOpen} setChangeRoomOpen={disp.setChangeRoomOpen}
        changeRoomNewId={disp.changeRoomNewId} setChangeRoomNewId={disp.setChangeRoomNewId}
        changeRoomReason={disp.changeRoomReason} setChangeRoomReason={disp.setChangeRoomReason}
        changeRoomSaving={disp.changeRoomSaving} onChangeRoom={disp.doChangeRoom}
        deleteOpen={disp.deleteOpen} setDeleteOpen={disp.setDeleteOpen}
        deleteReason={disp.deleteReason} setDeleteReason={disp.setDeleteReason}
        deleteSaving={disp.deleteSaving} onDelete={disp.doDelete}
        hospOpen={disp.hospOpen} setHospOpen={disp.setHospOpen}
        hospDeptId={disp.hospDeptId} setHospDeptId={disp.setHospDeptId}
        hospReason={disp.hospReason} setHospReason={disp.setHospReason}
        hospEmergency={disp.hospEmergency} setHospEmergency={disp.setHospEmergency}
        hospSaving={disp.hospSaving} onHospitalize={disp.doHospitalize}
        transferOpen={disp.transferOpen} setTransferOpen={disp.setTransferOpen}
        transferFacility={disp.transferFacility} setTransferFacility={disp.setTransferFacility}
        transferReason={disp.transferReason} setTransferReason={disp.setTransferReason}
        transferTransport={disp.transferTransport} setTransferTransport={disp.setTransferTransport}
        transferSaving={disp.transferSaving} onTransfer={disp.doTransfer}
        apptOpen={disp.apptOpen} setApptOpen={disp.setApptOpen}
        apptDate={disp.apptDate} setApptDate={disp.setApptDate}
        apptNotes={disp.apptNotes} setApptNotes={disp.setApptNotes}
        apptSaving={disp.apptSaving} onAppointment={disp.doAppointment}
      />

      {(leftOpen || rightOpen) && <div className="ed-panel-backdrop" onClick={closeAll} />}
      <div className="ed-panel-toggles">
        <button className="ed-panel-toggle" onClick={() => setLeftOpen((o) => !o)} title="Hàng đợi">
          <TermIcon name="list" size={18} />
          {waitingCount > 0 ? <span className="badge">{waitingCount}</span> : null}
        </button>
        <button className="ed-panel-toggle" onClick={() => setRightOpen((o) => !o)} title="Kết luận & thao tác" style={{ background: 'var(--s-warn)' }}>
          <TermIcon name="check" size={18} />
        </button>
      </div>

      <ClsResultsModal
        open={clsOpen} onClose={() => setClsOpen(false)} loading={clsLoading} data={clsData}
        sub={selPt ? `${selPt.patientName} · ${selPt.patientCode}` : ''}
      />
      <ConsultModal
        open={consultOpen} onClose={() => setConsultOpen(false)}
        consults={consults} form={consultForm} setForm={setConsultForm}
        saving={consultSaving} onSave={saveConsult}
        sub={selPt ? `${selPt.patientName} · ${selPt.patientCode}` : ''}
      />
      <SurgeryReportModal
        open={ptttOpen} onClose={() => setPtttOpen(false)} onSaved={() => setPtttOpen(false)}
        examinationId={examId} patientId={selPt?.patientId}
        patientName={selPt?.patientName} patientCode={selPt?.patientCode}
        prefillDiagnosis={diagnoses.find((d) => d.isPrimary)?.icdName}
      />
      <CabinetIssueModal
        open={cabinetOpen} onClose={() => setCabinetOpen(false)} onSaved={() => setCabinetOpen(false)}
        patientName={selPt?.patientName} patientCode={selPt?.patientCode} examinationId={examId}
      />
      <StockReservationModal
        open={stockOpen} onClose={() => setStockOpen(false)}
        patientId={selPt?.patientId || ''} patientName={selPt?.patientName}
        departmentId={rooms.find((r) => r.id === roomId)?.departmentId} defaultType={2}
      />
      <BarcodeScanner
        open={scanOpen} onClose={() => setScanOpen(false)}
        onScan={(code) => {
          setScanOpen(false);
          const key = code.trim().toLowerCase();
          const hit = queue.find((q) => q.patientCode?.toLowerCase() === key || q.examinationId?.toLowerCase() === key);
          if (hit) { selectPatient(hit); tk(`Đã chọn ${hit.patientName}`); }
          else ti(`Không thấy BN "${code}" trong hàng đợi phòng này`);
        }}
      />
    </div>
  );
};

export default OpdEditorV2;
