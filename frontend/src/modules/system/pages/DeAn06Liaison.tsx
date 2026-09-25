import React, { useCallback, useState } from 'react';
import {
  KpiStrip, TopTabs, DataTable, StatusBadge,
  DrawerShell, Btn, DrSec, DrField, useListData,
  type ColumnDef, type TopTab, type KpiItem, type StatusTone,
  tk, te, fmtDTg, fmtDMYg
} from '@/_v2kit';
import { RowActions } from '../../../components/actions';
import { friendlyErrorMessage } from '@/utils/friendlyError';
import TermIcon from '../../../components/layout/terminal/Icon';
import {
  deAn06,
  type BirthCertificateDto,
  type DeathCertificateDto,
  type DrivingLicenseHealthCheckDto
} from '../../../api/nangcap23';

type TabKey = 'birth' | 'death' | 'driver';
const TOP_TABS: TopTab<TabKey>[] = [
  { v: 'birth',  l: 'Giấy chứng sinh', ic: 'heart' },
  { v: 'death',  l: 'Giấy báo tử',     ic: 'folder' },
  { v: 'driver', l: 'KSK lái xe',      ic: 'receipt' },
];

const DA06_STATUS: { v: number; l: string; tone: StatusTone }[] = [
  { v: 0, l: 'Chưa gửi',      tone: 'warn' },
  { v: 1, l: 'Đang xử lý',    tone: 'info' },
  { v: 2, l: 'Cổng xác nhận', tone: 'ok'   },
  { v: 3, l: 'Lỗi',           tone: 'crit' },
];
const da06Tone = (s: number): StatusTone => DA06_STATUS.find((x) => x.v === s)?.tone || 'info';
const da06Label = (s: number): string => DA06_STATUS.find((x) => x.v === s)?.l || '—';
// QA-R11: acks of the InMemory Đề án 06 fake (server NationalGateway:MockMode=true) carry a "MOCK-" id — not a receipt
// from gdbhyt.baohiemxahoi.gov.vn, but they were shown and counted as "Cổng xác nhận".
const isMockAck = (id?: string | null) => !!id && id.startsWith('MOCK-');
type Da06Row = { da06Status: number; da06StatusName?: string; da06SubmissionId?: string; da06ErrorMessage?: string };
const Da06Badge: React.FC<{ r: Da06Row }> = ({ r }) => {
  const name = r.da06StatusName || da06Label(r.da06Status);
  return isMockAck(r.da06SubmissionId)
    ? <StatusBadge tone="info" dot>{name.includes('MOCK') ? name : `${name} (MOCK — chưa gửi cổng thật)`}</StatusBadge>
    : <StatusBadge tone={da06Tone(r.da06Status)} dot>{name}</StatusBadge>;
};
const Da06Fields: React.FC<{ r: Da06Row }> = ({ r }) => (
  <>
    <DrField lbl="Trạng thái"><Da06Badge r={r} /></DrField>
    <DrField lbl="Mã tiếp nhận"><span className="mono">{r.da06SubmissionId || '—'}</span></DrField>
    {r.da06ErrorMessage && <DrField lbl="Lỗi"><span style={{ color: 'var(--s-crit)' }}>{r.da06ErrorMessage}</span></DrField>}
  </>
);
const da06Kpis = (rows: Da06Row[], total: string): KpiItem[] => [
  { lbl: total,           val: rows.length },
  { lbl: 'Cổng xác nhận', val: rows.filter((r) => r.da06Status === 2 && !isMockAck(r.da06SubmissionId)).length, tone: 'ok' },
  { lbl: 'Chưa gửi',      val: rows.filter((r) => r.da06Status === 0).length, tone: 'warn' },
  { lbl: 'Lỗi',           val: rows.filter((r) => r.da06Status === 3).length, tone: 'crit' },
  { lbl: 'Mock (chưa gửi thật)', val: rows.filter((r) => isMockAck(r.da06SubmissionId)).length, tone: 'info' },
];

const DeAn06LiaisonV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('birth');
  return (
    <div className="ab" data-testid="de-an-06-page">
      <TopTabs<TabKey> tab={tab} setTab={setTab} tabs={TOP_TABS} />
      {tab === 'birth'  && <BirthTab />}
      {tab === 'death'  && <DeathTab />}
      {tab === 'driver' && <DlhcTab />}
    </div>
  );
};

// ────────────────────────── Birth ──────────────────────────

const BirthTab: React.FC = () => {
  const { rows, loading, reload } = useListData<BirthCertificateDto>(
    useCallback(() => deAn06.searchBirths({ pageSize: 200 }), []),
    useCallback(() => te('Không tải được'), []),
  );
  const [detail, setDetail] = useState<BirthCertificateDto | null>(null);
  const [busy, setBusy] = useState(false); // #467: chống double-submit gửi cổng ĐA06

  const submit = async (r: BirthCertificateDto) => {
    if (busy) return;
    setBusy(true);
    try {
      await deAn06.submitBirth(r.id);
      tk(`Đã gửi lên cổng Đề án 06 — ${r.certificateNumber}`);
      reload();
      setDetail(null);
    } catch (e) { te(friendlyErrorMessage(e, 'Gửi cổng Đề án 06 thất bại. Vui lòng thử lại.')); }
    finally { setBusy(false); }
  };

  const kpis = da06Kpis(rows, 'Tổng GCS');

  const columns: ColumnDef<BirthCertificateDto>[] = [
    { key: 'certificateNumber', label: 'Số GCS', mono: true, code: true, width: 200 },
    { key: 'motherFullName', label: 'Mẹ',
      render: (r) => (
        <div>
          <b>{r.motherFullName || '—'}</b>
          <div className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.motherIdNumber}</div>
        </div>
      ) },
    { key: 'birthDateTime', label: 'Ngày sinh', mono: true,
      render: (r) => fmtDTg(r.birthDateTime) },
    { key: 'childGender', label: 'Giới', width: 80,
      render: (r) => r.childGender === 'Male' ? 'Nam' : r.childGender === 'Female' ? 'Nữ' : '—' },
    { key: 'birthWeight', label: 'Cân nặng', mono: true, width: 100,
      render: (r) => `${r.birthWeight} kg` },
    { key: 'isLiveBirth', label: 'Sống/Chết', width: 110,
      render: (r) => r.isLiveBirth ? 'Sống' : <span style={{ color: 'var(--s-crit)' }}>Chết lưu</span> },
    { key: 'da06Status', label: 'Đề án 06', width: 160,
      render: (r) => <Da06Badge r={r} /> },
  ];

  return (
    <>
      <KpiStrip items={kpis} />
      <DataTable<BirthCertificateDto>
        rowKey={(r) => r.id} data={rows} columns={columns} loading={loading}
        onRowClick={setDetail}
        actions={(r) => (
          <RowActions actions={[
            { key: 'submit', icon: 'external', label: 'Gửi lên cổng Đề án 06', primary: true,
              hidden: r.da06Status >= 2, disabled: busy, onClick: () => submit(r) },
          ]} />
        )}
      />
      <DrawerShell open={!!detail} onClose={() => setDetail(null)} size="lg"
        title={`Chứng sinh · ${detail?.certificateNumber || ''}`}
        footer={detail && detail.da06Status < 2 ? (
          <>
            <Btn variant="ghost" onClick={() => setDetail(null)}>Đóng</Btn>
            <Btn variant="primary" onClick={() => detail && submit(detail)} disabled={busy}>
              <TermIcon name="external" size={12} /> {busy ? 'Đang gửi…' : 'Gửi cổng Đề án 06'}
            </Btn>
          </>
        ) : <Btn variant="ghost" onClick={() => setDetail(null)}>Đóng</Btn>}>
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
              <DrField lbl="Ngày sinh">{fmtDTg(detail.birthDateTime)}</DrField>
              <DrField lbl="Giới tính">{detail.childGender === 'Male' ? 'Nam' : detail.childGender === 'Female' ? 'Nữ' : '—'}</DrField>
              <DrField lbl="Cân nặng">{detail.birthWeight} kg</DrField>
              <DrField lbl="Tuổi thai">{detail.gestationalAgeWeeks} tuần</DrField>
              <DrField lbl="Phương pháp">{detail.birthMethod}</DrField>
              <DrField lbl="Nơi sinh">{detail.birthLocation}</DrField>
            </DrSec>
            <DrSec title="ĐỀ ÁN 06">
              <Da06Fields r={detail} />
            </DrSec>
          </>
        )}
      </DrawerShell>
    </>
  );
};

// ────────────────────────── Death ──────────────────────────

const DeathTab: React.FC = () => {
  const { rows, loading, reload } = useListData<DeathCertificateDto>(
    useCallback(() => deAn06.searchDeaths({ pageSize: 200 }), []),
    useCallback(() => te('Không tải được'), []),
  );
  const [detail, setDetail] = useState<DeathCertificateDto | null>(null);
  const [busy, setBusy] = useState(false); // #467: chống double-submit gửi cổng ĐA06

  const submit = async (r: DeathCertificateDto) => {
    if (busy) return;
    setBusy(true);
    try { await deAn06.submitDeath(r.id); tk(`Đã gửi lên cổng Đề án 06 — ${r.certificateNumber}`); reload(); setDetail(null); }
    catch (e) { te(friendlyErrorMessage(e, 'Gửi cổng Đề án 06 thất bại. Vui lòng thử lại.')); }
    finally { setBusy(false); }
  };

  const kpis = da06Kpis(rows, 'Tổng GBT');

  const columns: ColumnDef<DeathCertificateDto>[] = [
    { key: 'certificateNumber', label: 'Số GBT', mono: true, code: true, width: 200 },
    { key: 'patientName', label: 'BN tử vong',
      render: (r) => (
        <div>
          <b>{r.patientName || '—'}</b>
          <div className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.patientCode}</div>
        </div>
      ) },
    { key: 'deathDateTime', label: 'Tử vong lúc', mono: true,
      render: (r) => fmtDTg(r.deathDateTime) },
    { key: 'cause', label: 'Nguyên nhân',
      render: (r) => (
        <div>
          <span className="mono">{r.primaryCauseIcd || '—'}</span>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.primaryCauseDescription || '—'}</div>
        </div>
      ) },
    { key: 'mannerOfDeath', label: 'Kiểu', width: 110 },
    { key: 'da06Status', label: 'Đề án 06', width: 160,
      render: (r) => <Da06Badge r={r} /> },
  ];

  return (
    <>
      <KpiStrip items={kpis} />
      <DataTable<DeathCertificateDto>
        rowKey={(r) => r.id} data={rows} columns={columns} loading={loading}
        onRowClick={setDetail}
        actions={(r) => (
          <RowActions actions={[
            { key: 'submit', icon: 'external', label: 'Gửi lên cổng Đề án 06', primary: true,
              hidden: r.da06Status >= 2, disabled: busy, onClick: () => submit(r) },
          ]} />
        )}
      />
      <DrawerShell open={!!detail} onClose={() => setDetail(null)} size="lg"
        title={`Báo tử · ${detail?.certificateNumber || ''}`}
        footer={detail && detail.da06Status < 2 ? (
          <>
            <Btn variant="ghost" onClick={() => setDetail(null)}>Đóng</Btn>
            <Btn variant="primary" onClick={() => detail && submit(detail)} disabled={busy}>
              <TermIcon name="external" size={12} /> {busy ? 'Đang gửi…' : 'Gửi cổng Đề án 06'}
            </Btn>
          </>
        ) : <Btn variant="ghost" onClick={() => setDetail(null)}>Đóng</Btn>}>
        {detail && (
          <>
            <DrSec title="BỆNH NHÂN">
              <DrField lbl="Họ tên">{detail.patientName}</DrField>
              <DrField lbl="Mã BN"><span className="mono">{detail.patientCode}</span></DrField>
            </DrSec>
            <DrSec title="TỬ VONG">
              <DrField lbl="Lúc">{fmtDTg(detail.deathDateTime)}</DrField>
              <DrField lbl="Nơi">{detail.deathLocation}</DrField>
              <DrField lbl="Kiểu">{detail.mannerOfDeath}</DrField>
              <DrField lbl="ICD chính"><code>{detail.primaryCauseIcd || '—'}</code></DrField>
              <DrField lbl="Nguyên nhân chính">{detail.primaryCauseDescription || '—'}</DrField>
              {detail.secondaryCauseDescription && (
                <DrField lbl="Nguyên nhân phụ">{detail.secondaryCauseDescription}</DrField>
              )}
            </DrSec>
            <DrSec title="BS CHỨNG NHẬN">
              <DrField lbl="Họ tên">{detail.certifyingDoctorName || '—'}</DrField>
              <DrField lbl="CCHN"><span className="mono">{detail.certifyingDoctorLicense || '—'}</span></DrField>
            </DrSec>
            <DrSec title="NGƯỜI BÁO TIN">
              <DrField lbl="Họ tên">{detail.informantFullName || '—'}</DrField>
              <DrField lbl="CCCD"><span className="mono">{detail.informantIdNumber || '—'}</span></DrField>
              <DrField lbl="Quan hệ">{detail.informantRelationship || '—'}</DrField>
            </DrSec>
            <DrSec title="ĐỀ ÁN 06">
              <Da06Fields r={detail} />
            </DrSec>
          </>
        )}
      </DrawerShell>
    </>
  );
};

// ────────────────────────── Dlhc (KSK lái xe) ──────────────────────────

const DlhcTab: React.FC = () => {
  const { rows, loading, reload } = useListData<DrivingLicenseHealthCheckDto>(
    useCallback(() => deAn06.searchDlhc({ pageSize: 200 }), []),
    useCallback(() => te('Không tải được'), []),
  );
  const [detail, setDetail] = useState<DrivingLicenseHealthCheckDto | null>(null);
  const [busy, setBusy] = useState(false); // #467: chống double-submit gửi cổng ĐA06

  const submit = async (r: DrivingLicenseHealthCheckDto) => {
    if (busy) return;
    setBusy(true);
    try { await deAn06.submitDlhc(r.id); tk(`Đã gửi lên cổng Đề án 06 — ${r.certificateNumber}`); reload(); setDetail(null); }
    catch (e) { te(friendlyErrorMessage(e, 'Gửi cổng Đề án 06 thất bại. Vui lòng thử lại.')); }
    finally { setBusy(false); }
  };

  const kpis = da06Kpis(rows, 'Tổng GCN');

  const columns: ColumnDef<DrivingLicenseHealthCheckDto>[] = [
    { key: 'certificateNumber', label: 'Số GCN', mono: true, code: true, width: 220 },
    { key: 'patientName', label: 'BN',
      render: (r) => (
        <div>
          <b>{r.patientName || '—'}</b>
          <div className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.patientCode}</div>
        </div>
      ) },
    { key: 'licenseClass', label: 'Hạng GPLX', width: 90,
      render: (r) => <code style={{ padding: '1px 6px', background: 'var(--d-2)', borderRadius: 'var(--r-1)' }}>{r.licenseClass}</code> },
    { key: 'examDate', label: 'Ngày khám', mono: true,
      render: (r) => fmtDMYg(r.examDate) },
    { key: 'eligibleToDrive', label: 'Đủ ĐK', width: 110,
      render: (r) => r.eligibleToDrive
        ? <StatusBadge tone="ok" dot>Đủ</StatusBadge>
        : <StatusBadge tone="crit" dot>Không</StatusBadge> },
    { key: 'da06Status', label: 'Đề án 06', width: 160,
      render: (r) => <Da06Badge r={r} /> },
  ];

  return (
    <>
      <KpiStrip items={kpis} />
      <DataTable<DrivingLicenseHealthCheckDto>
        rowKey={(r) => r.id} data={rows} columns={columns} loading={loading}
        onRowClick={setDetail}
        actions={(r) => (
          <RowActions actions={[
            { key: 'submit', icon: 'external', label: 'Gửi lên cổng Đề án 06', primary: true,
              hidden: r.da06Status >= 2, disabled: busy, onClick: () => submit(r) },
          ]} />
        )}
      />
      <DrawerShell open={!!detail} onClose={() => setDetail(null)} size="lg"
        title={`KSK lái xe · ${detail?.certificateNumber || ''}`}
        footer={detail && detail.da06Status < 2 ? (
          <>
            <Btn variant="ghost" onClick={() => setDetail(null)}>Đóng</Btn>
            <Btn variant="primary" onClick={() => detail && submit(detail)} disabled={busy}>
              <TermIcon name="external" size={12} /> {busy ? 'Đang gửi…' : 'Gửi cổng Đề án 06'}
            </Btn>
          </>
        ) : <Btn variant="ghost" onClick={() => setDetail(null)}>Đóng</Btn>}>
        {detail && (
          <>
            <DrSec title="BN">
              <DrField lbl="Họ tên">{detail.patientName}</DrField>
              <DrField lbl="Mã BN"><span className="mono">{detail.patientCode}</span></DrField>
              <DrField lbl="Hạng GPLX">{detail.licenseClass}</DrField>
              <DrField lbl="Ngày khám">{fmtDMYg(detail.examDate)}</DrField>
            </DrSec>
            <DrSec title="THỂ CHẤT">
              <DrField lbl="Chiều cao / cân nặng">
                <span className="mono">{detail.heightCm}cm / {detail.weightKg}kg</span>
              </DrField>
              <DrField lbl="Huyết áp">
                <span className="mono">{detail.systolicBp}/{detail.diastolicBp}</span>
              </DrField>
              <DrField lbl="Mạch"><span className="mono">{detail.heartRate} l/p</span></DrField>
            </DrSec>
            <DrSec title="THỊ / THÍNH / THẦN KINH / TÂM THẦN">
              <DrField lbl="Phải (không kính)">{detail.visionRightWithoutGlasses || '—'}</DrField>
              <DrField lbl="Trái (không kính)">{detail.visionLeftWithoutGlasses || '—'}</DrField>
              <DrField lbl="Mù màu">
                {detail.colorBlindNormal ? 'Bình thường' : (detail.colorVisionDetail || 'Bất thường')}
              </DrField>
              <DrField lbl="Thính lực">
                {detail.hearingNormal ? 'Bình thường' : (detail.hearingDetail || 'Bất thường')}
              </DrField>
              <DrField lbl="Thần kinh">
                {detail.neurologicalNormal ? 'Bình thường' : (detail.neurologicalDetail || 'Bất thường')}
              </DrField>
              <DrField lbl="Tâm thần">
                {detail.psychiatricNormal ? 'Bình thường' : (detail.psychiatricDetail || 'Bất thường')}
              </DrField>
            </DrSec>
            <DrSec title="XN MA TUÝ / CỒN">
              <DrField lbl="Ma tuý">
                {detail.drugTestPositive
                  ? <span style={{ color: 'var(--s-crit)' }}>Dương tính</span>
                  : 'Âm tính'}
              </DrField>
              <DrField lbl="Cồn">{detail.alcoholLevelMgPercent ?? 0} mg%</DrField>
            </DrSec>
            <DrSec title="KẾT LUẬN">
              <DrField lbl="Đủ ĐK">
                {detail.eligibleToDrive
                  ? <StatusBadge tone="ok" dot>Đủ ĐK</StatusBadge>
                  : <StatusBadge tone="crit" dot>Không đủ ĐK</StatusBadge>}
              </DrField>
              <DrField lbl="Kết luận">{detail.conclusion || '—'}</DrField>
              <DrField lbl="BS chứng nhận">{detail.certifyingDoctorName || '—'}</DrField>
            </DrSec>
            <DrSec title="ĐỀ ÁN 06">
              <Da06Fields r={detail} />
            </DrSec>
          </>
        )}
      </DrawerShell>
    </>
  );
};

export default DeAn06LiaisonV2;
