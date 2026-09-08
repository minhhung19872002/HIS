/**
 * Module tra cứu cho nhân viên CSKH — HSMT I.3 #2.3 (bản web).
 *
 * Một ô tìm kiếm, ba cách tra: mã bệnh nhân, số điện thoại, số CCCD. Chọn một người là hiện đủ những
 * gì cần để trả lời họ ngay — lịch hẹn, kết quả gần đây, đơn thuốc, số thứ tự hôm nay, và trạng thái
 * tài khoản app.
 *
 * Nhân viên chưa được cấp vai trò tra cứu sẽ nhận 403 từ máy chủ; trang nói rõ điều đó thay vì hiện
 * một danh sách rỗng.
 */

import React, { useCallback, useState } from 'react';
import { Alert, Modal } from 'antd';
import {
  searchPatients,
  getPatientSummary,
  resetPatientAppPassword,
  getPatientAccessLog,
  type StaffPatient,
  type StaffPatientSummary,
  type PatientAppAuditLog,
} from '@/api/patientApp';
import {
  Btn, DataTable, DrawerShell, DrSec, DrField, LoadingState, SearchBox,
  StatusBadge, fmtDMYg, fmtDTg, tk, te,
  type ColumnDef,
} from '@/_v2kit';

const ACTION_LABELS: Record<string, string> = {
  view_visits: 'Xem lượt khám',
  view_lab_results: 'Xem danh sách xét nghiệm',
  view_lab_result: 'Xem chi tiết xét nghiệm',
  view_imaging_results: 'Xem danh sách CĐHA',
  view_imaging_result: 'Xem chi tiết CĐHA',
  view_imaging_images: 'Xem ảnh CĐHA',
  view_imaging_image: 'Tải ảnh CĐHA',
  view_functional_results: 'Xem thăm dò chức năng',
  view_prescriptions: 'Xem đơn thuốc',
  view_health_checkups: 'Xem khám sức khoẻ',
  view_admissions: 'Xem đợt nội trú',
  view_medicine_disclosure: 'Xem công khai thuốc',
  view_service_orders: 'Xem chỉ định CLS',
  take_queue_number: 'Lấy số thứ tự',
  family_link_verified: 'Xác minh liên kết gia đình',
  family_link_revoked: 'Gỡ liên kết gia đình',
  staff_search_patient: 'Nhân viên tra cứu',
  staff_view_patient_summary: 'Nhân viên xem hồ sơ',
  staff_reset_app_password: 'Nhân viên đặt lại mật khẩu',
  admin_lock: 'Quản trị khoá tài khoản',
  admin_unlock: 'Quản trị mở khoá',
  admin_reset_password: 'Quản trị đặt lại mật khẩu',
  admin_revoke_family_link: 'Quản trị gỡ liên kết',
};

const PatientAppLookup: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<StaffPatient[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const [summary, setSummary] = useState<StaffPatientSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [accessLog, setAccessLog] = useState<PatientAppAuditLog[] | null>(null);

  const search = useCallback(() => {
    const term = keyword.trim();
    if (term.length < 3) {
      te('Nhập ít nhất 3 ký tự để tra cứu');
      return;
    }

    setSearching(true);
    setForbidden(false);
    searchPatients(term)
      .then((r) => { setResults(r); setSearched(true); })
      .catch((err: { response?: { status?: number } }) => {
        if (err?.response?.status === 403) setForbidden(true);
        else te('Không tra cứu được');
        setResults([]);
        setSearched(true);
      })
      .finally(() => setSearching(false));
  }, [keyword]);

  const openPatient = (patient: StaffPatient) => {
    setLoadingSummary(true);
    setAccessLog(null);
    getPatientSummary(patient.patientId)
      .then(setSummary)
      .catch(() => te('Không lấy được hồ sơ'))
      .finally(() => setLoadingSummary(false));
  };

  const resetPassword = (patient: StaffPatient) => {
    Modal.confirm({
      title: `Đặt lại mật khẩu app cho ${patient.fullName}?`,
      content: 'Mật khẩu tạm sẽ hiện ra để bạn đọc cho người bệnh.',
      okText: 'Đặt lại',
      cancelText: 'Huỷ',
      onOk: () => resetPatientAppPassword(patient.patientId)
        .then((r) => Modal.success({
          title: 'Mật khẩu tạm',
          content: (
            <div>
              <p style={{ fontSize: 24, fontFamily: 'monospace', letterSpacing: 2 }}>
                {r.temporaryPassword}
              </p>
              <p>Đọc cho người bệnh và nhắc họ đổi ngay sau khi đăng nhập.</p>
            </div>
          ),
        }))
        .catch(() => te('Không đặt lại được mật khẩu')),
    });
  };

  const loadAccessLog = (patientId: string) => {
    getPatientAccessLog(patientId)
      .then(setAccessLog)
      .catch(() => te('Không tải được nhật ký'));
  };

  const columns: ColumnDef<StaffPatient>[] = [
    { key: 'code', label: 'Mã BN', render: (p) => p.patientCode, mono: true },
    { key: 'name', label: 'Họ tên', render: (p) => p.fullName },
    { key: 'dob', label: 'Ngày sinh', render: (p) => p.dateOfBirth ? fmtDMYg(p.dateOfBirth) : '—' },
    { key: 'phone', label: 'Điện thoại', render: (p) => p.phoneNumber || '—' },
    {
      key: 'app',
      label: 'Tài khoản app',
      render: (p) => !p.hasAppAccount
        ? <StatusBadge tone="info">Chưa có</StatusBadge>
        : p.appAccountStatus !== 'Active'
          ? <StatusBadge tone="crit">Bị khoá</StatusBadge>
          : p.appMustChangePassword
            ? <StatusBadge tone="warn">Chờ đổi mật khẩu</StatusBadge>
            : <StatusBadge tone="ok">Hoạt động</StatusBadge>,
    },
    {
      key: 'last',
      label: 'Đăng nhập cuối',
      render: (p) => p.appLastLoginAt ? fmtDTg(p.appLastLoginAt) : '—',
    },
  ];

  return (
    <div className="ab">
      <div className="ab-tools">
        <SearchBox
          value={keyword}
          onChange={setKeyword}
          placeholder="Mã bệnh nhân, số điện thoại hoặc số CCCD…"
        />
        <Btn variant="primary" icon="search" loading={searching} onClick={search}>
          Tra cứu
        </Btn>
      </div>

      {forbidden && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message="Tài khoản của bạn chưa được cấp quyền tra cứu"
          description="Liên hệ quản trị hệ thống để được gán vai trò có quyền dùng module tra cứu."
        />
      )}

      {!forbidden && (
        <DataTable
          data={results}
          columns={columns}
          rowKey={(p) => p.patientId}
          onRowClick={openPatient}
          loading={searching}
          empty={searched
            ? 'Không tìm thấy người bệnh nào khớp thông tin đã nhập.'
            : 'Nhập mã bệnh nhân, số điện thoại hoặc CCCD rồi bấm Tra cứu.'}
          actions={(p) => (
            p.hasAppAccount
              ? <Btn variant="ghost" onClick={() => resetPassword(p)}>Đặt lại mật khẩu</Btn>
              : null
          )}
        />
      )}

      <DrawerShell
        open={summary !== null || loadingSummary}
        onClose={() => { setSummary(null); setAccessLog(null); }}
        title={summary?.patient.fullName ?? 'Đang tải…'}
        sub={summary ? `${summary.patient.patientCode} · ${summary.patient.phoneNumber ?? ''}` : ''}
        size="xl"
      >
        {loadingSummary || !summary ? <LoadingState /> : (
          <>
            <DrSec title="Tài khoản app">
              <DrField lbl="Trạng thái">
                {summary.patient.hasAppAccount
                  ? (
                    <StatusBadge tone={summary.patient.appAccountStatus === 'Active' ? 'ok' : 'crit'}>
                      {summary.patient.appAccountStatus === 'Active' ? 'Hoạt động' : 'Bị khoá'}
                    </StatusBadge>
                  )
                  : <StatusBadge tone="info">Chưa có tài khoản app</StatusBadge>}
              </DrField>
              {summary.patient.hasAppAccount && (
                <>
                  <DrField lbl="Buộc đổi mật khẩu">
                    {summary.patient.appMustChangePassword ? 'Có' : 'Không'}
                  </DrField>
                  <DrField lbl="Đăng nhập cuối">
                    {summary.patient.appLastLoginAt ? fmtDTg(summary.patient.appLastLoginAt) : '—'}
                  </DrField>
                </>
              )}
            </DrSec>

            <DrSec title={`Số thứ tự hôm nay (${summary.queueTicketsToday.length})`}>
              {summary.queueTicketsToday.length === 0
                ? <DrField lbl="">Hôm nay chưa lấy số.</DrField>
                : summary.queueTicketsToday.map((t) => (
                  <DrField key={t.id} lbl={t.ticketCode}>
                    {t.roomName ?? ''}{t.priority > 0 ? ' · số ưu tiên' : ''}
                  </DrField>
                ))}
            </DrSec>

            <DrSec title={`Lịch hẹn (${summary.appointments.length})`}>
              {summary.appointments.length === 0
                ? <DrField lbl="">Không có lịch hẹn.</DrField>
                : summary.appointments.map((a) => (
                  <DrField key={a.appointmentCode} lbl={a.appointmentCode}>
                    {fmtDMYg(a.appointmentDate)}
                    {a.departmentName ? ` · ${a.departmentName}` : ''}
                    {a.statusName ? ` · ${a.statusName}` : ''}
                  </DrField>
                ))}
            </DrSec>

            <DrSec title={`Xét nghiệm gần đây (${summary.labResults.length})`}>
              {summary.labResults.length === 0
                ? <DrField lbl="">Chưa có kết quả xét nghiệm.</DrField>
                : summary.labResults.map((l) => (
                  <DrField key={l.id} lbl={l.serviceName || l.orderCode || '—'}>
                    {l.resultDate ? fmtDMYg(l.resultDate) : 'đang chờ'}
                    {l.hasAbnormal ? ' · có chỉ số bất thường' : ''}
                  </DrField>
                ))}
            </DrSec>

            <DrSec title={`Chẩn đoán hình ảnh (${summary.imagingResults.length})`}>
              {summary.imagingResults.length === 0
                ? <DrField lbl="">Chưa có kết quả CĐHA.</DrField>
                : summary.imagingResults.map((i) => (
                  <DrField key={i.id} lbl={[i.modality, i.bodyPart].filter(Boolean).join(' · ') || '—'}>
                    {i.studyDate ? fmtDMYg(i.studyDate) : ''}
                    {i.impression ? ` · ${i.impression}` : ''}
                  </DrField>
                ))}
            </DrSec>

            <DrSec title={`Đơn thuốc (${summary.prescriptions.length})`}>
              {summary.prescriptions.length === 0
                ? <DrField lbl="">Chưa có đơn thuốc.</DrField>
                : summary.prescriptions.map((p) => (
                  <DrField key={p.id} lbl={p.prescriptionCode || '—'}>
                    {fmtDMYg(p.prescriptionDate)}
                    {p.doctorName ? ` · BS ${p.doctorName}` : ''}
                  </DrField>
                ))}
            </DrSec>

            <DrSec title={`Đợt nội trú (${summary.admissions.length})`}>
              {summary.admissions.length === 0
                ? <DrField lbl="">Chưa có đợt nội trú.</DrField>
                : summary.admissions.map((a) => (
                  <DrField key={a.id} lbl={fmtDMYg(a.admissionDate)}>
                    {a.departmentName ?? ''} · {a.statusName ?? ''} · {a.daysOfStay} ngày
                  </DrField>
                ))}
            </DrSec>

            <DrSec title="Nhật ký truy cập hồ sơ">
              {accessLog === null ? (
                <Btn
                  variant="ghost"
                  onClick={() => loadAccessLog(summary.patient.patientId)}
                >
                  Xem ai đã mở hồ sơ này
                </Btn>
              ) : accessLog.length === 0 ? (
                <DrField lbl="">Chưa có lượt truy cập nào được ghi nhận.</DrField>
              ) : (
                accessLog.slice(0, 30).map((log) => (
                  <DrField key={log.id} lbl={fmtDTg(log.createdAt)}>
                    {ACTION_LABELS[log.action] ?? log.action}
                    {log.actorName ? ` — ${log.actorName}` : ''}
                    {log.actorType === 'staff' ? ' (nhân viên)' : ''}
                  </DrField>
                ))
              )}
            </DrSec>
          </>
        )}
      </DrawerShell>
    </div>
  );
};

export default PatientAppLookup;
