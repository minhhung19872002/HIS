import React, { useCallback, useEffect, useState } from 'react';
import {
  Card, Tabs, Table, Button, Space, Input, Tag, Drawer, Descriptions, Row, Col, Statistic, message, Typography
} from 'antd';
import { SendOutlined, ReloadOutlined, FileTextOutlined, HeartOutlined, IdcardOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  deAn06,
  type BirthCertificateDto, type DeathCertificateDto, type DrivingLicenseHealthCheckDto
} from '../api/nangcap23';

const { Text, Title } = Typography;

const DA06_TAG = (s: number, name: string) => {
  const color = s === 2 ? 'success' : s === 1 ? 'processing' : s === 3 ? 'error' : 'default';
  return <Tag color={color}>{name}</Tag>;
};

const DeAn06Liaison: React.FC = () => (
  <Card title={<><IdcardOutlined /> Đề án 06 — Liên thông giấy tờ điện tử</>}>
    <Tabs items={[
      { key: 'birth', label: <><HeartOutlined /> Giấy chứng sinh</>, children: <BirthTab /> },
      { key: 'death', label: <><FileTextOutlined /> Giấy báo tử</>, children: <DeathTab /> },
      { key: 'dlhc', label: <><IdcardOutlined /> Giấy KSK lái xe</>, children: <DlhcTab /> },
    ]} />
  </Card>
);

const BirthTab: React.FC = () => {
  const [rows, setRows] = useState<BirthCertificateDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<BirthCertificateDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows((await deAn06.searchBirths({ keyword: keyword.trim() || undefined, pageSize: 100 })) || []); }
    catch { message.error('Lỗi tải'); }
    finally { setLoading(false); }
  }, [keyword]);
  useEffect(() => { load(); }, [load]);

  const submit = async (r: BirthCertificateDto) => {
    try { await deAn06.submitBirth(r.id); message.success('Đã gửi lên cổng Đề án 06'); load(); }
    catch { message.error('Gửi cổng thất bại'); }
  };

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card><Statistic title="Tổng GCS" value={rows.length} /></Card></Col>
        <Col span={6}><Card><Statistic title="Cổng xác nhận" value={rows.filter(r => r.da06Status === 2).length} valueStyle={{ color: '#3f8600' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Chưa gửi" value={rows.filter(r => r.da06Status === 0).length} valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Lỗi" value={rows.filter(r => r.da06Status === 3).length} valueStyle={{ color: '#cf1322' }} /></Card></Col>
      </Row>
      <Space style={{ marginBottom: 12 }}>
        <Input.Search placeholder="Tìm số GCS / tên mẹ / CCCD..." value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 360 }} allowClear />
        <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
      </Space>
      <Table
        rowKey="id" dataSource={rows} loading={loading} size="small"
        columns={[
          { title: 'Số GCS', dataIndex: 'certificateNumber', width: 220, render: (v) => <Text code>{v}</Text> },
          { title: 'Mẹ', render: (_, r) => (<><b>{r.motherFullName}</b><br /><Text type="secondary">{r.motherIdNumber}</Text></>) },
          { title: 'Ngày sinh', dataIndex: 'birthDateTime', width: 150, render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm') },
          { title: 'Giới', dataIndex: 'childGender', width: 70, render: (v) => v === 'Male' ? 'Nam' : v === 'Female' ? 'Nữ' : '—' },
          { title: 'CN (kg)', dataIndex: 'birthWeight', width: 80 },
          { title: 'Sống/Chết', dataIndex: 'isLiveBirth', width: 100, render: (v) => v ? 'Sống' : 'Chết lưu' },
          { title: 'Đề án 06', width: 150, render: (_, r) => DA06_TAG(r.da06Status, r.da06StatusName) },
          {
            title: 'Hành động', width: 130, render: (_, r) => r.da06Status < 2 ? (
              <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => submit(r)}>Gửi cổng</Button>
            ) : null
          }
        ]}
        onRow={(r) => ({ onClick: () => setDetail(r), style: { cursor: 'pointer' } })}
      />
      <Drawer open={!!detail} onClose={() => setDetail(null)} width={720} title={`Giấy chứng sinh — ${detail?.certificateNumber || ''}`}>
        {detail && (
          <>
            <Descriptions bordered column={2} size="small" title="Mẹ">
              <Descriptions.Item label="Họ tên" span={2}>{detail.motherFullName}</Descriptions.Item>
              <Descriptions.Item label="CCCD">{detail.motherIdNumber}</Descriptions.Item>
            </Descriptions>
            {detail.fatherFullName && (
              <Descriptions bordered column={2} size="small" title="Bố" style={{ marginTop: 12 }}>
                <Descriptions.Item label="Họ tên" span={2}>{detail.fatherFullName}</Descriptions.Item>
                <Descriptions.Item label="CCCD">{detail.fatherIdNumber || '—'}</Descriptions.Item>
              </Descriptions>
            )}
            <Descriptions bordered column={2} size="small" title="Trẻ" style={{ marginTop: 12 }}>
              <Descriptions.Item label="Ngày sinh">{dayjs(detail.birthDateTime).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="Giới tính">{detail.childGender}</Descriptions.Item>
              <Descriptions.Item label="Tên">{detail.childName || '—'}</Descriptions.Item>
              <Descriptions.Item label="Cân nặng">{detail.birthWeight} kg</Descriptions.Item>
              <Descriptions.Item label="Tuổi thai">{detail.gestationalAgeWeeks} tuần</Descriptions.Item>
              <Descriptions.Item label="Phương pháp">{detail.birthMethod}</Descriptions.Item>
              <Descriptions.Item label="Nơi sinh">{detail.birthLocation}</Descriptions.Item>
              <Descriptions.Item label="Sống/Chết">{detail.isLiveBirth ? 'Sống' : 'Chết lưu'}</Descriptions.Item>
            </Descriptions>
            <Descriptions bordered column={2} size="small" title="Đề án 06" style={{ marginTop: 12 }}>
              <Descriptions.Item label="Trạng thái">{DA06_TAG(detail.da06Status, detail.da06StatusName)}</Descriptions.Item>
              <Descriptions.Item label="Mã giao dịch">{detail.da06SubmissionId || '—'}</Descriptions.Item>
              <Descriptions.Item label="Gửi lúc">{detail.da06SubmittedAt ? dayjs(detail.da06SubmittedAt).format('DD/MM/YYYY HH:mm') : '—'}</Descriptions.Item>
              <Descriptions.Item label="Ack lúc">{detail.da06AcknowledgedAt ? dayjs(detail.da06AcknowledgedAt).format('DD/MM/YYYY HH:mm') : '—'}</Descriptions.Item>
              {detail.da06ErrorMessage && <Descriptions.Item label="Lỗi" span={2}>{detail.da06ErrorMessage}</Descriptions.Item>}
            </Descriptions>
          </>
        )}
      </Drawer>
    </>
  );
};

const DeathTab: React.FC = () => {
  const [rows, setRows] = useState<DeathCertificateDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<DeathCertificateDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows((await deAn06.searchDeaths({ keyword: keyword.trim() || undefined, pageSize: 100 })) || []); }
    catch { message.error('Lỗi tải'); }
    finally { setLoading(false); }
  }, [keyword]);
  useEffect(() => { load(); }, [load]);

  const submit = async (r: DeathCertificateDto) => {
    try { await deAn06.submitDeath(r.id); message.success('Đã gửi lên cổng Đề án 06'); load(); }
    catch { message.error('Gửi thất bại'); }
  };

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card><Statistic title="Tổng GBT" value={rows.length} /></Card></Col>
        <Col span={6}><Card><Statistic title="Cổng xác nhận" value={rows.filter(r => r.da06Status === 2).length} valueStyle={{ color: '#3f8600' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Chưa gửi" value={rows.filter(r => r.da06Status === 0).length} valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Lỗi" value={rows.filter(r => r.da06Status === 3).length} valueStyle={{ color: '#cf1322' }} /></Card></Col>
      </Row>
      <Space style={{ marginBottom: 12 }}>
        <Input.Search placeholder="Tìm số GBT / nguyên nhân..." value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 360 }} allowClear />
        <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
      </Space>
      <Table
        rowKey="id" dataSource={rows} loading={loading} size="small"
        columns={[
          { title: 'Số GBT', dataIndex: 'certificateNumber', width: 220, render: (v) => <Text code>{v}</Text> },
          { title: 'Bệnh nhân', render: (_, r) => (<><b>{r.patientName || '—'}</b><br /><Text type="secondary">{r.patientCode}</Text></>) },
          { title: 'Tử vong lúc', dataIndex: 'deathDateTime', width: 160, render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm') },
          { title: 'Nguyên nhân chính', dataIndex: 'primaryCauseDescription' },
          { title: 'Kiểu', dataIndex: 'mannerOfDeath', width: 120 },
          { title: 'Đề án 06', width: 150, render: (_, r) => DA06_TAG(r.da06Status, r.da06StatusName) },
          {
            title: 'Hành động', width: 130, render: (_, r) => r.da06Status < 2 ? (
              <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => submit(r)}>Gửi cổng</Button>
            ) : null
          }
        ]}
        onRow={(r) => ({ onClick: () => setDetail(r), style: { cursor: 'pointer' } })}
      />
      <Drawer open={!!detail} onClose={() => setDetail(null)} width={720} title={`Giấy báo tử — ${detail?.certificateNumber || ''}`}>
        {detail && (
          <>
            <Descriptions bordered column={2} size="small" title="Bệnh nhân">
              <Descriptions.Item label="Họ tên" span={2}>{detail.patientName}</Descriptions.Item>
              <Descriptions.Item label="Mã BN">{detail.patientCode}</Descriptions.Item>
            </Descriptions>
            <Descriptions bordered column={2} size="small" title="Tử vong" style={{ marginTop: 12 }}>
              <Descriptions.Item label="Lúc">{dayjs(detail.deathDateTime).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="Nơi">{detail.deathLocation}</Descriptions.Item>
              <Descriptions.Item label="Kiểu">{detail.mannerOfDeath}</Descriptions.Item>
              <Descriptions.Item label="ICD chính">{detail.primaryCauseIcd || '—'}</Descriptions.Item>
              <Descriptions.Item label="NN chính" span={2}>{detail.primaryCauseDescription || '—'}</Descriptions.Item>
              {detail.secondaryCauseDescription && <Descriptions.Item label="NN phụ" span={2}>{detail.secondaryCauseDescription}</Descriptions.Item>}
            </Descriptions>
            <Descriptions bordered column={2} size="small" title="BS chứng nhận" style={{ marginTop: 12 }}>
              <Descriptions.Item label="Họ tên" span={2}>{detail.certifyingDoctorName || '—'}</Descriptions.Item>
              <Descriptions.Item label="CCHN">{detail.certifyingDoctorLicense || '—'}</Descriptions.Item>
              <Descriptions.Item label="Ngày CN">{dayjs(detail.certifyingDate).format('DD/MM/YYYY')}</Descriptions.Item>
            </Descriptions>
            <Descriptions bordered column={2} size="small" title="Đề án 06" style={{ marginTop: 12 }}>
              <Descriptions.Item label="Trạng thái">{DA06_TAG(detail.da06Status, detail.da06StatusName)}</Descriptions.Item>
              <Descriptions.Item label="Mã giao dịch">{detail.da06SubmissionId || '—'}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Drawer>
    </>
  );
};

const DlhcTab: React.FC = () => {
  const [rows, setRows] = useState<DrivingLicenseHealthCheckDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<DrivingLicenseHealthCheckDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows((await deAn06.searchDlhc({ keyword: keyword.trim() || undefined, pageSize: 100 })) || []); }
    catch { message.error('Lỗi tải'); }
    finally { setLoading(false); }
  }, [keyword]);
  useEffect(() => { load(); }, [load]);

  const submit = async (r: DrivingLicenseHealthCheckDto) => {
    try { await deAn06.submitDlhc(r.id); message.success('Đã gửi cổng Đề án 06'); load(); }
    catch { message.error('Gửi thất bại'); }
  };

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card><Statistic title="Tổng GCN" value={rows.length} /></Card></Col>
        <Col span={6}><Card><Statistic title="Đủ điều kiện" value={rows.filter(r => r.eligibleToDrive).length} valueStyle={{ color: '#3f8600' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Cổng xác nhận" value={rows.filter(r => r.da06Status === 2).length} /></Card></Col>
        <Col span={6}><Card><Statistic title="Chưa gửi" value={rows.filter(r => r.da06Status === 0).length} valueStyle={{ color: '#faad14' }} /></Card></Col>
      </Row>
      <Space style={{ marginBottom: 12 }}>
        <Input.Search placeholder="Tìm số GCN / hạng..." value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 360 }} allowClear />
        <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
      </Space>
      <Table
        rowKey="id" dataSource={rows} loading={loading} size="small"
        columns={[
          { title: 'Số GCN', dataIndex: 'certificateNumber', width: 220, render: (v) => <Text code>{v}</Text> },
          { title: 'Bệnh nhân', render: (_, r) => (<><b>{r.patientName || '—'}</b><br /><Text type="secondary">{r.patientCode}</Text></>) },
          { title: 'Hạng', dataIndex: 'licenseClass', width: 70 },
          { title: 'Ngày khám', dataIndex: 'examDate', width: 120, render: (v) => dayjs(v).format('DD/MM/YYYY') },
          { title: 'Đủ ĐK', dataIndex: 'eligibleToDrive', width: 90, render: (v) => v ? <Tag color="success">Đủ</Tag> : <Tag color="error">Không</Tag> },
          { title: 'Đề án 06', width: 150, render: (_, r) => DA06_TAG(r.da06Status, r.da06StatusName) },
          {
            title: 'Hành động', width: 130, render: (_, r) => r.da06Status < 2 ? (
              <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => submit(r)}>Gửi cổng</Button>
            ) : null
          }
        ]}
        onRow={(r) => ({ onClick: () => setDetail(r), style: { cursor: 'pointer' } })}
      />
      <Drawer open={!!detail} onClose={() => setDetail(null)} width={760} title={`KSK lái xe — ${detail?.certificateNumber || ''}`}>
        {detail && (
          <>
            <Descriptions bordered column={2} size="small" title="Thông tin BN">
              <Descriptions.Item label="Họ tên">{detail.patientName}</Descriptions.Item>
              <Descriptions.Item label="Mã BN">{detail.patientCode}</Descriptions.Item>
              <Descriptions.Item label="Hạng GPLX">{detail.licenseClass}</Descriptions.Item>
              <Descriptions.Item label="Ngày khám">{dayjs(detail.examDate).format('DD/MM/YYYY')}</Descriptions.Item>
            </Descriptions>
            <Descriptions bordered column={2} size="small" title="Thể chất" style={{ marginTop: 12 }}>
              <Descriptions.Item label="CC / CN">{detail.heightCm}cm / {detail.weightKg}kg</Descriptions.Item>
              <Descriptions.Item label="Huyết áp">{detail.systolicBp}/{detail.diastolicBp}</Descriptions.Item>
              <Descriptions.Item label="Mạch">{detail.heartRate} l/p</Descriptions.Item>
            </Descriptions>
            <Descriptions bordered column={2} size="small" title="Thị / Thính / TT" style={{ marginTop: 12 }}>
              <Descriptions.Item label="Thị lực P (không kính)">{detail.visionRightWithoutGlasses || '—'}</Descriptions.Item>
              <Descriptions.Item label="Thị lực T (không kính)">{detail.visionLeftWithoutGlasses || '—'}</Descriptions.Item>
              <Descriptions.Item label="Mù màu">{detail.colorBlindNormal ? 'Bình thường' : 'Bất thường'}</Descriptions.Item>
              <Descriptions.Item label="Thính lực">{detail.hearingNormal ? 'Bình thường' : 'Bất thường'}</Descriptions.Item>
              <Descriptions.Item label="Thần kinh">{detail.neurologicalNormal ? 'Bình thường' : 'Bất thường'}</Descriptions.Item>
              <Descriptions.Item label="Tâm thần">{detail.psychiatricNormal ? 'Bình thường' : 'Bất thường'}</Descriptions.Item>
            </Descriptions>
            <Descriptions bordered column={2} size="small" title="XN ma túy / cồn" style={{ marginTop: 12 }}>
              <Descriptions.Item label="Ma túy">{detail.drugTestPerformed ? (detail.drugTestPositive ? 'Dương tính' : 'Âm tính') : 'Không XN'}</Descriptions.Item>
              <Descriptions.Item label="Cồn">{detail.alcoholTestPerformed ? `${detail.alcoholLevelMgPercent ?? 0} mg%` : 'Không XN'}</Descriptions.Item>
            </Descriptions>
            <Descriptions bordered column={2} size="small" title="Kết luận" style={{ marginTop: 12 }}>
              <Descriptions.Item label="Đủ ĐK">{detail.eligibleToDrive ? <Tag color="success">Đủ điều kiện</Tag> : <Tag color="error">Không đủ</Tag>}</Descriptions.Item>
              <Descriptions.Item label="Kết luận" span={2}>{detail.conclusion || '—'}</Descriptions.Item>
              <Descriptions.Item label="BS chứng nhận">{detail.certifyingDoctorName || '—'}</Descriptions.Item>
              <Descriptions.Item label="CCHN">{detail.certifyingDoctorLicense || '—'}</Descriptions.Item>
            </Descriptions>
            <Descriptions bordered column={2} size="small" title="Đề án 06" style={{ marginTop: 12 }}>
              <Descriptions.Item label="Trạng thái">{DA06_TAG(detail.da06Status, detail.da06StatusName)}</Descriptions.Item>
              <Descriptions.Item label="Mã giao dịch">{detail.da06SubmissionId || '—'}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Drawer>
    </>
  );
};

export default DeAn06Liaison;
