import React, { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  KpiStrip, TopTabs, DataTable, SearchBox, StatusBadge,
  DrawerShell, ActBtn, DrSec, DrField,
  type ColumnDef, type TopTab, tk, te
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';
import {
  deAn06,
  type BirthCertificateDto,
  type DeathCertificateDto,
  type DrivingLicenseHealthCheckDto
} from '../api/nangcap23';

type TabKey = 'birth' | 'death' | 'driver';
const TOP_TABS: TopTab<TabKey>[] = [
  { v: 'birth',  l: 'Giấy chứng sinh',         ic: 'heart' },
  { v: 'death',  l: 'Giấy báo tử',             ic: 'file-text' },
  { v: 'driver', l: 'Giấy KSK lái xe',         ic: 'card' },
];

const fmtDT = (s?: string) => s ? dayjs(s).format('DD/MM/YYYY HH:mm') : '—';
const fmtD = (s?: string) => s ? dayjs(s).format('DD/MM/YYYY') : '—';

const toneOfDa06 = (s: number): 'ok' | 'warn' | 'crit' | 'info' =>
  s === 2 ? 'ok' : s === 1 ? 'warn' : s === 3 ? 'crit' : 'info';

const DeAn06LiaisonV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('birth');
  return (
    <div className="ab-stack" data-testid="de-an-06-page">
      <TopTabs tab={tab} setTab={setTab} tabs={TOP_TABS} />
      {tab === 'birth' && <BirthPanel />}
      {tab === 'death' && <DeathPanel />}
      {tab === 'driver' && <DriverPanel />}
    </div>
  );
};

const BirthPanel: React.FC = () => {
  const [rows, setRows] = useState<BirthCertificateDto[]>([]);
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<BirthCertificateDto | null>(null);

  const load = useCallback(async () => {
    try { setRows((await deAn06.searchBirths({ keyword: keyword.trim() || undefined, pageSize: 100 })) || []); }
    catch { te('Không tải được'); }
  }, [keyword]);
  useEffect(() => { load(); }, [load]);

  const submit = async (r: BirthCertificateDto) => {
    try { const d = await deAn06.submitBirth(r.id); tk(`Đã gửi lên cổng (${d.da06StatusName})`); load(); }
    catch { te('Gửi cổng thất bại'); }
  };

  const columns: ColumnDef<BirthCertificateDto>[] = [
    { key: 'cert', label: 'Số GCS', mono: true, width: 220, render: r => r.certificateNumber },
    { key: 'mother', label: 'Mẹ', render: r => (
      <div><b>{r.motherFullName || '—'}</b><br /><span className="mono" style={{ color: 'var(--t-2)' }}>{r.motherIdNumber}</span></div>
    )},
    { key: 'birth', label: 'Ngày sinh', mono: true, width: 140, render: r => fmtDT(r.birthDateTime) },
    { key: 'gender', label: 'Giới', width: 80, render: r => r.childGender === 'Male' ? 'Nam' : r.childGender === 'Female' ? 'Nữ' : '—' },
    { key: 'weight', label: 'Cân nặng', mono: true, width: 100, render: r => `${r.birthWeight} kg` },
    { key: 'live', label: 'Sống/Chết', width: 100, render: r => r.isLiveBirth ? 'Sống' : 'Chết lưu' },
    { key: 'da06', label: 'Đề án 06', width: 160, render: r => <StatusBadge tone={toneOfDa06(r.da06Status)} dot>{r.da06StatusName}</StatusBadge> },
  ];

  const actions = (r: BirthCertificateDto) =>
    r.da06Status < 2 ? <ActBtn ic="send" title="Gửi lên cổng Đề án 06" onClick={() => submit(r)} /> : null;

  return (
    <>
      <KpiStrip items={[
        { lbl: 'Tổng GCS', val: rows.length },
        { lbl: 'Cổng xác nhận', val: rows.filter(r => r.da06Status === 2).length, tone: 'ok' },
        { lbl: 'Chưa gửi', val: rows.filter(r => r.da06Status === 0).length, tone: 'warn' },
        { lbl: 'Lỗi', val: rows.filter(r => r.da06Status === 3).length, tone: 'crit' },
      ]} />
      <div className="ab-toolbar">
        <SearchBox value={keyword} onChange={setKeyword} placeholder="Tìm theo số GCS / tên mẹ / CCCD…" minWidth={320} />
        <button type="button" className="ab-btn" onClick={load}><TermIcon name="rotate-cw" size={12}/> Tải lại</button>
      </div>
      <DataTable<BirthCertificateDto> data={rows} rowKey={r => r.id} columns={columns} actions={actions} onRowClick={setDetail} />
      <DrawerShell open={!!detail} onClose={() => setDetail(null)} title={`Giấy chứng sinh — ${detail?.certificateNumber || ''}`}>
        {detail && (
          <>
            <DrSec title="MẸ">
              <DrField lbl="Họ tên">{detail.motherFullName}</DrField>
              <DrField lbl="CCCD"><span className="mono">{detail.motherIdNumber}</span></DrField>
            </DrSec>
            {detail.fatherFullName && (
              <DrSec title="BỐ">
                <DrField lbl="Họ tên">{detail.fatherFullName}</DrField>
                <DrField lbl="CCCD"><span className="mono">{detail.fatherIdNumber || '—'}</span></DrField>
              </DrSec>
            )}
            <DrSec title="TRẺ">
              <DrField lbl="Ngày sinh"><span className="mono">{fmtDT(detail.birthDateTime)}</span></DrField>
              <DrField lbl="Giới tính">{detail.childGender}</DrField>
              <DrField lbl="Tên">{detail.childName || '—'}</DrField>
              <DrField lbl="Cân nặng"><span className="mono">{detail.birthWeight} kg</span></DrField>
              <DrField lbl="Tuổi thai">{detail.gestationalAgeWeeks} tuần</DrField>
              <DrField lbl="Phương pháp">{detail.birthMethod}</DrField>
              <DrField lbl="Nơi sinh">{detail.birthLocation}</DrField>
              <DrField lbl="Sống/Chết">{detail.isLiveBirth ? 'Sống' : 'Chết lưu'}</DrField>
            </DrSec>
            <DrSec title="ĐỀ ÁN 06">
              <DrField lbl="Trạng thái"><StatusBadge tone={toneOfDa06(detail.da06Status)} dot>{detail.da06StatusName}</StatusBadge></DrField>
              <DrField lbl="Mã giao dịch"><span className="mono">{detail.da06SubmissionId || '—'}</span></DrField>
              <DrField lbl="Gửi lúc"><span className="mono">{fmtDT(detail.da06SubmittedAt)}</span></DrField>
              <DrField lbl="Ack lúc"><span className="mono">{fmtDT(detail.da06AcknowledgedAt)}</span></DrField>
              {detail.da06ErrorMessage && <DrField lbl="Lỗi">{detail.da06ErrorMessage}</DrField>}
            </DrSec>
          </>
        )}
      </DrawerShell>
    </>
  );
};

const DeathPanel: React.FC = () => {
  const [rows, setRows] = useState<DeathCertificateDto[]>([]);
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<DeathCertificateDto | null>(null);

  const load = useCallback(async () => {
    try { setRows((await deAn06.searchDeaths({ keyword: keyword.trim() || undefined, pageSize: 100 })) || []); }
    catch { te('Không tải được'); }
  }, [keyword]);
  useEffect(() => { load(); }, [load]);

  const submit = async (r: DeathCertificateDto) => {
    try { const d = await deAn06.submitDeath(r.id); tk(`Đã gửi lên cổng (${d.da06StatusName})`); load(); }
    catch { te('Gửi cổng thất bại'); }
  };

  const columns: ColumnDef<DeathCertificateDto>[] = [
    { key: 'cert', label: 'Số GBT', mono: true, width: 220, render: r => r.certificateNumber },
    { key: 'patient', label: 'Bệnh nhân', render: r => (
      <div><b>{r.patientName || '—'}</b><br /><span className="mono" style={{ color: 'var(--t-2)' }}>{r.patientCode}</span></div>
    )},
    { key: 'death', label: 'Tử vong lúc', mono: true, width: 160, render: r => fmtDT(r.deathDateTime) },
    { key: 'cause', label: 'Nguyên nhân', render: r => r.primaryCauseDescription || r.primaryCauseIcd || '—' },
    { key: 'manner', label: 'Kiểu', width: 110, render: r => r.mannerOfDeath },
    { key: 'da06', label: 'Đề án 06', width: 160, render: r => <StatusBadge tone={toneOfDa06(r.da06Status)} dot>{r.da06StatusName}</StatusBadge> },
  ];

  const actions = (r: DeathCertificateDto) =>
    r.da06Status < 2 ? <ActBtn ic="send" title="Gửi lên cổng Đề án 06" onClick={() => submit(r)} /> : null;

  return (
    <>
      <KpiStrip items={[
        { lbl: 'Tổng GBT', val: rows.length },
        { lbl: 'Cổng xác nhận', val: rows.filter(r => r.da06Status === 2).length, tone: 'ok' },
        { lbl: 'Chưa gửi', val: rows.filter(r => r.da06Status === 0).length, tone: 'warn' },
        { lbl: 'Lỗi', val: rows.filter(r => r.da06Status === 3).length, tone: 'crit' },
      ]} />
      <div className="ab-toolbar">
        <SearchBox value={keyword} onChange={setKeyword} placeholder="Tìm theo số GBT / nguyên nhân…" minWidth={320} />
        <button type="button" className="ab-btn" onClick={load}><TermIcon name="rotate-cw" size={12}/> Tải lại</button>
      </div>
      <DataTable<DeathCertificateDto> data={rows} rowKey={r => r.id} columns={columns} actions={actions} onRowClick={setDetail} />
      <DrawerShell open={!!detail} onClose={() => setDetail(null)} title={`Giấy báo tử — ${detail?.certificateNumber || ''}`}>
        {detail && (
          <>
            <DrSec title="BỆNH NHÂN">
              <DrField lbl="Họ tên">{detail.patientName}</DrField>
              <DrField lbl="Mã BN"><span className="mono">{detail.patientCode}</span></DrField>
            </DrSec>
            <DrSec title="TỬ VONG">
              <DrField lbl="Lúc"><span className="mono">{fmtDT(detail.deathDateTime)}</span></DrField>
              <DrField lbl="Nơi">{detail.deathLocation}</DrField>
              <DrField lbl="Kiểu">{detail.mannerOfDeath}</DrField>
              <DrField lbl="ICD chính"><span className="mono">{detail.primaryCauseIcd || '—'}</span></DrField>
              <DrField lbl="Nguyên nhân chính">{detail.primaryCauseDescription || '—'}</DrField>
              {detail.secondaryCauseDescription && (
                <DrField lbl="Nguyên nhân phụ">{detail.secondaryCauseDescription}</DrField>
              )}
            </DrSec>
            <DrSec title="BS CHỨNG NHẬN">
              <DrField lbl="Họ tên">{detail.certifyingDoctorName || '—'}</DrField>
              <DrField lbl="CCHN"><span className="mono">{detail.certifyingDoctorLicense || '—'}</span></DrField>
              <DrField lbl="Ngày CN"><span className="mono">{fmtD(detail.certifyingDate)}</span></DrField>
            </DrSec>
            <DrSec title="NGƯỜI BÁO TIN">
              <DrField lbl="Họ tên">{detail.informantFullName || '—'}</DrField>
              <DrField lbl="CCCD"><span className="mono">{detail.informantIdNumber || '—'}</span></DrField>
              <DrField lbl="Quan hệ">{detail.informantRelationship || '—'}</DrField>
            </DrSec>
            <DrSec title="ĐỀ ÁN 06">
              <DrField lbl="Trạng thái"><StatusBadge tone={toneOfDa06(detail.da06Status)} dot>{detail.da06StatusName}</StatusBadge></DrField>
              <DrField lbl="Mã giao dịch"><span className="mono">{detail.da06SubmissionId || '—'}</span></DrField>
              <DrField lbl="Gửi lúc"><span className="mono">{fmtDT(detail.da06SubmittedAt)}</span></DrField>
              <DrField lbl="Ack lúc"><span className="mono">{fmtDT(detail.da06AcknowledgedAt)}</span></DrField>
              {detail.da06ErrorMessage && <DrField lbl="Lỗi">{detail.da06ErrorMessage}</DrField>}
            </DrSec>
          </>
        )}
      </DrawerShell>
    </>
  );
};

const DriverPanel: React.FC = () => {
  const [rows, setRows] = useState<DrivingLicenseHealthCheckDto[]>([]);
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<DrivingLicenseHealthCheckDto | null>(null);

  const load = useCallback(async () => {
    try { setRows((await deAn06.searchDlhc({ keyword: keyword.trim() || undefined, pageSize: 100 })) || []); }
    catch { te('Không tải được'); }
  }, [keyword]);
  useEffect(() => { load(); }, [load]);

  const submit = async (r: DrivingLicenseHealthCheckDto) => {
    try { const d = await deAn06.submitDlhc(r.id); tk(`Đã gửi lên cổng (${d.da06StatusName})`); load(); }
    catch { te('Gửi cổng thất bại'); }
  };

  const columns: ColumnDef<DrivingLicenseHealthCheckDto>[] = [
    { key: 'cert', label: 'Số GCN', mono: true, width: 220, render: r => r.certificateNumber },
    { key: 'patient', label: 'Bệnh nhân', render: r => (
      <div><b>{r.patientName || '—'}</b><br /><span className="mono" style={{ color: 'var(--t-2)' }}>{r.patientCode}</span></div>
    )},
    { key: 'class', label: 'Hạng', width: 80, render: r => r.licenseClass },
    { key: 'date', label: 'Ngày khám', mono: true, width: 110, render: r => fmtD(r.examDate) },
    { key: 'elig', label: 'Đủ ĐK', width: 80, render: r => r.eligibleToDrive ? <StatusBadge tone="ok" dot>Đủ</StatusBadge> : <StatusBadge tone="crit" dot>Không</StatusBadge> },
    { key: 'da06', label: 'Đề án 06', width: 160, render: r => <StatusBadge tone={toneOfDa06(r.da06Status)} dot>{r.da06StatusName}</StatusBadge> },
  ];

  const actions = (r: DrivingLicenseHealthCheckDto) =>
    r.da06Status < 2 ? <ActBtn ic="send" title="Gửi lên cổng Đề án 06" onClick={() => submit(r)} /> : null;

  return (
    <>
      <KpiStrip items={[
        { lbl: 'Tổng GCN', val: rows.length },
        { lbl: 'Đủ điều kiện', val: rows.filter(r => r.eligibleToDrive).length, tone: 'ok' },
        { lbl: 'Cổng xác nhận', val: rows.filter(r => r.da06Status === 2).length, tone: 'info' },
        { lbl: 'Chưa gửi', val: rows.filter(r => r.da06Status === 0).length, tone: 'warn' },
      ]} />
      <div className="ab-toolbar">
        <SearchBox value={keyword} onChange={setKeyword} placeholder="Tìm theo số GCN / hạng…" minWidth={320} />
        <button type="button" className="ab-btn" onClick={load}><TermIcon name="rotate-cw" size={12}/> Tải lại</button>
      </div>
      <DataTable<DrivingLicenseHealthCheckDto> data={rows} rowKey={r => r.id} columns={columns} actions={actions} onRowClick={setDetail} />
      <DrawerShell open={!!detail} onClose={() => setDetail(null)} title={`KSK lái xe — ${detail?.certificateNumber || ''}`}>
        {detail && (
          <>
            <DrSec title="THÔNG TIN BN">
              <DrField lbl="Họ tên">{detail.patientName}</DrField>
              <DrField lbl="Mã BN"><span className="mono">{detail.patientCode}</span></DrField>
              <DrField lbl="Hạng GPLX">{detail.licenseClass}</DrField>
              <DrField lbl="Ngày khám"><span className="mono">{fmtD(detail.examDate)}</span></DrField>
            </DrSec>
            <DrSec title="THỂ CHẤT">
              <DrField lbl="Chiều cao / cân nặng"><span className="mono">{detail.heightCm}cm / {detail.weightKg}kg</span></DrField>
              <DrField lbl="Huyết áp"><span className="mono">{detail.systolicBp}/{detail.diastolicBp}</span></DrField>
              <DrField lbl="Mạch"><span className="mono">{detail.heartRate} l/p</span></DrField>
            </DrSec>
            <DrSec title="THỊ LỰC">
              <DrField lbl="Phải (không kính)">{detail.visionRightWithoutGlasses || '—'}</DrField>
              <DrField lbl="Trái (không kính)">{detail.visionLeftWithoutGlasses || '—'}</DrField>
              <DrField lbl="Mù màu">{detail.colorBlindNormal ? 'Bình thường' : detail.colorVisionDetail || 'Bất thường'}</DrField>
            </DrSec>
            <DrSec title="THÍNH LỰC / TÂM THẦN">
              <DrField lbl="Thính lực">{detail.hearingNormal ? 'Bình thường' : (detail.hearingDetail || 'Bất thường')}</DrField>
              <DrField lbl="Thần kinh">{detail.neurologicalNormal ? 'Bình thường' : (detail.neurologicalDetail || 'Bất thường')}</DrField>
              <DrField lbl="Tâm thần">{detail.psychiatricNormal ? 'Bình thường' : (detail.psychiatricDetail || 'Bất thường')}</DrField>
            </DrSec>
            <DrSec title="XN MA TÚY / CỒN">
              <DrField lbl="Ma túy">{detail.drugTestPerformed ? (detail.drugTestPositive ? 'Dương tính' : 'Âm tính') : 'Không XN'}</DrField>
              <DrField lbl="Cồn">{detail.alcoholTestPerformed ? `${detail.alcoholLevelMgPercent ?? 0} mg%` : 'Không XN'}</DrField>
            </DrSec>
            <DrSec title="KẾT LUẬN">
              <DrField lbl="Đủ ĐK">{detail.eligibleToDrive ? <StatusBadge tone="ok" dot>Đủ điều kiện</StatusBadge> : <StatusBadge tone="crit" dot>Không đủ điều kiện</StatusBadge>}</DrField>
              <DrField lbl="Kết luận">{detail.conclusion || '—'}</DrField>
              <DrField lbl="BS chứng nhận">{detail.certifyingDoctorName || '—'}</DrField>
              <DrField lbl="CCHN"><span className="mono">{detail.certifyingDoctorLicense || '—'}</span></DrField>
              <DrField lbl="Cấp lúc"><span className="mono">{fmtDT(detail.issuedAt)}</span></DrField>
              <DrField lbl="Hết hạn"><span className="mono">{fmtDT(detail.expiresAt)}</span></DrField>
            </DrSec>
            <DrSec title="ĐỀ ÁN 06">
              <DrField lbl="Trạng thái"><StatusBadge tone={toneOfDa06(detail.da06Status)} dot>{detail.da06StatusName}</StatusBadge></DrField>
              <DrField lbl="Mã giao dịch"><span className="mono">{detail.da06SubmissionId || '—'}</span></DrField>
              <DrField lbl="Gửi lúc"><span className="mono">{fmtDT(detail.da06SubmittedAt)}</span></DrField>
              {detail.da06ErrorMessage && <DrField lbl="Lỗi">{detail.da06ErrorMessage}</DrField>}
            </DrSec>
          </>
        )}
      </DrawerShell>
    </>
  );
};

export default DeAn06LiaisonV2;
