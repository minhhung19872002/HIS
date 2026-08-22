import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTabState } from '../../../hooks/useTabState';
import { Alert, App as AntdApp, Input, Select } from 'antd';
import dayjs from 'dayjs';
import {
  ActBtn,
  Btn,
  DataTable,
  ModalShell,
  StatusBadge,
  TopTabs,
  type ColumnDef,
} from '@/_v2kit';
import { RefreshButton } from '../../../components/actions';
import type {
  DicomStudyDto,
  PACSConnectionDto,
  PACSConnectionStatusDto,
  RadiologyOrderDto,
  RemotePacsServerDto,
} from '../api/ris';
import * as risApi from '../api/ris';

type PacsTab = 'studies' | 'connections';

export interface PacsWorkspaceModalProps {
  open: boolean;
  order: RadiologyOrderDto | null;
  onClose: () => void;
  onLinked: () => void;
  onOpenViewer: (studyInstanceUID: string) => void;
  onOpenViewerConfig: () => void;
  onOpenAdmin: () => void;
}

const PACS_TABS = [
  { v: 'studies' as PacsTab, l: 'Study PACS', ic: 'image' },
  { v: 'connections' as PacsTab, l: 'Kết nối', ic: 'cloud' },
];

const saveBlob = (data: BlobPart, fileName: string): void => {
  const url = URL.createObjectURL(new Blob([data], { type: 'application/zip' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

const PacsWorkspaceModal: React.FC<PacsWorkspaceModalProps> = ({
  open,
  order,
  onClose,
  onLinked,
  onOpenViewer,
  onOpenViewerConfig,
  onOpenAdmin,
}) => {
  const { message } = AntdApp.useApp();
  const [tab, setTab] = useTabState<PacsTab>('studies');
  const [studies, setStudies] = useState<DicomStudyDto[]>([]);
  const [connections, setConnections] = useState<PACSConnectionDto[]>([]);
  const [remoteServers, setRemoteServers] = useState<RemotePacsServerDto[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, PACSConnectionStatusDto>>({});
  const [selectedRemoteId, setSelectedRemoteId] = useState('');
  const [manualStudyUID, setManualStudyUID] = useState('');
  const [linkedStudyUID, setLinkedStudyUID] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [linkingUID, setLinkingUID] = useState('');
  const [exportingUID, setExportingUID] = useState('');
  const [sendingUID, setSendingUID] = useState('');
  const [checkingConnectionId, setCheckingConnectionId] = useState('');
  const loadSequence = useRef(0);

  const load = useCallback(async () => {
    if (!open) return;
    const sequence = ++loadSequence.current;
    setLoading(true);
    setLoadError('');

    const studiesRequest = order
      ? risApi.getStudiesFromPACS(order.patientCode)
      : Promise.resolve({ data: [] as DicomStudyDto[] });
    const [studyResult, connectionResult, remoteResult] = await Promise.allSettled([
      studiesRequest,
      risApi.getPACSConnections(),
      risApi.getRemoteServers(),
    ]);
    if (sequence !== loadSequence.current) return;

    setStudies(studyResult.status === 'fulfilled' && Array.isArray(studyResult.value.data)
      ? studyResult.value.data
      : []);
    setConnections(connectionResult.status === 'fulfilled' && Array.isArray(connectionResult.value.data)
      ? connectionResult.value.data
      : []);
    const remotes = remoteResult.status === 'fulfilled' && Array.isArray(remoteResult.value.data)
      ? remoteResult.value.data
      : [];
    setRemoteServers(remotes);
    setSelectedRemoteId((current) => current || remotes.find((server) => server.isActive)?.id || '');

    const failed = [studyResult, connectionResult, remoteResult].some((result) => result.status === 'rejected');
    if (failed) setLoadError('Một phần dữ liệu PACS chưa tải được. Có thể PACS đang ngoại tuyến.');
    setLoading(false);
  }, [open, order]);

  useEffect(() => {
    if (!open) return;
    setTab(order ? 'studies' : 'connections');
    setLinkedStudyUID(order?.studyInstanceUID || '');
    setManualStudyUID('');
    void load();
    return () => { loadSequence.current += 1; };
  }, [load, open, order]);

  const orderedStudies = useMemo(() => {
    const accession = order?.accessionNumber || order?.orderCode;
    return [...studies].sort((left, right) => {
      const leftMatch = left.accessionNumber === accession ? 1 : 0;
      const rightMatch = right.accessionNumber === accession ? 1 : 0;
      if (leftMatch !== rightMatch) return rightMatch - leftMatch;
      return dayjs(right.studyDate).valueOf() - dayjs(left.studyDate).valueOf();
    });
  }, [order, studies]);

  const linkStudy = async (studyInstanceUID: string) => {
    if (!order || !studyInstanceUID.trim()) return;
    setLinkingUID(studyInstanceUID);
    try {
      await risApi.linkStudyToOrder(order.items?.[0]?.id || order.id, studyInstanceUID.trim());
      setLinkedStudyUID(studyInstanceUID.trim());
      setManualStudyUID('');
      message.success('Đã liên kết Study PACS với phiếu chụp');
      onLinked();
    } catch {
      setLoadError('Không liên kết được Study. Kiểm tra Study UID có tồn tại trên PACS và chưa thuộc phiếu khác.');
    } finally {
      setLinkingUID('');
    }
  };

  const exportStudy = async (studyInstanceUID: string) => {
    setExportingUID(studyInstanceUID);
    try {
      const response = await risApi.exportDicomStudy(studyInstanceUID);
      saveBlob(response.data as BlobPart, `DICOM-${order?.orderCode || studyInstanceUID}.zip`);
      message.success('Đã tải gói DICOM');
    } catch {
      setLoadError('Không tải được DICOM. Kiểm tra kết nối PACS và dữ liệu Study.');
    } finally {
      setExportingUID('');
    }
  };

  const sendStudy = async (studyInstanceUID: string) => {
    if (!selectedRemoteId) {
      setLoadError('Chưa có Remote PACS hoạt động. Mở RIS Admin để cấu hình server đích.');
      return;
    }
    setSendingUID(studyInstanceUID);
    try {
      const response = await risApi.sendDicomToRemote({ studyId: studyInstanceUID, remoteServerId: selectedRemoteId });
      if (!response.data.success) {
        setLoadError(response.data.message || 'Remote PACS từ chối Study.');
      } else {
        setLoadError('');
        message.success(`Đã gửi Study đến ${response.data.remoteServerName || 'Remote PACS'}`);
      }
    } catch {
      setLoadError('Không gửi được Study đến Remote PACS.');
    } finally {
      setSendingUID('');
    }
  };

  const checkConnection = async (connectionId: string) => {
    setCheckingConnectionId(connectionId);
    try {
      const response = await risApi.checkPACSConnection(connectionId);
      setConnectionStatus((current) => ({ ...current, [connectionId]: response.data }));
      if (response.data.isConnected) message.success(`PACS kết nối tốt · ${response.data.pingTimeMs} ms`);
    } catch {
      setLoadError('Không kiểm tra được kết nối PACS.');
    } finally {
      setCheckingConnectionId('');
    }
  };

  const studyColumns: ColumnDef<DicomStudyDto>[] = [
    {
      key: 'date', label: 'Ngày chụp', mono: true,
      render: (study) => dayjs(study.studyDate).isValid() ? dayjs(study.studyDate).format('DD/MM/YYYY HH:mm') : '—',
    },
    { key: 'modality', label: 'Modality', code: true, render: (study) => study.modality || '—' },
    {
      key: 'description', label: 'Mô tả', render: (study) => (
        <div className="cell-2l">
          <b>{study.studyDescription || 'Study DICOM'}</b>
          <span>{study.patientName || study.patientId || '—'}</span>
        </div>
      ),
    },
    {
      key: 'accession', label: 'Accession', code: true,
      render: (study) => study.accessionNumber || '—',
    },
    {
      key: 'images', label: 'Ảnh', mono: true,
      render: (study) => `${study.numberOfSeries || 0} series · ${study.numberOfImages || 0} ảnh`,
    },
    {
      key: 'uid', label: 'Study UID', code: true,
      render: (study) => study.studyInstanceUID,
    },
  ];

  const connectionColumns: ColumnDef<PACSConnectionDto>[] = [
    { key: 'name', label: 'Kết nối', render: (connection) => <b>{connection.name}</b> },
    { key: 'type', label: 'Loại', code: true, render: (connection) => connection.serverType },
    { key: 'ae', label: 'AE Title', code: true, render: (connection) => connection.aeTitle || '—' },
    {
      key: 'endpoint', label: 'Endpoint', mono: true,
      render: (connection) => connection.ipAddress
        ? `${connection.ipAddress}:${connection.queryRetrievePort || connection.port}`
        : 'Nội bộ HIS',
    },
    {
      key: 'status', label: 'Trạng thái', render: (connection) => {
        const checked = connectionStatus[connection.id];
        if (!checked) return <StatusBadge tone="info">Chưa kiểm tra</StatusBadge>;
        return checked.isConnected
          ? <StatusBadge tone="ok" dot>Kết nối · {checked.pingTimeMs} ms</StatusBadge>
          : <StatusBadge tone="crit" dot>Ngoại tuyến</StatusBadge>;
      },
    },
  ];

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="xl"
      title={order ? `RIS/PACS · ${order.patientName}` : 'RIS/PACS'}
      footer={(
        <>
          <Btn variant="ghost" onClick={onOpenViewerConfig}>Cấu hình viewer</Btn>
          <Btn variant="ghost" onClick={onOpenAdmin}>RIS Admin</Btn>
          <Btn variant="primary" onClick={onClose}>Đóng</Btn>
        </>
      )}
    >
      <TopTabs<PacsTab> tab={tab} setTab={setTab} tabs={PACS_TABS} />

      {loadError && (
        <Alert
          type="warning"
          showIcon
          closable
          message={loadError}
          onClose={() => setLoadError('')}
          style={{ margin: 'var(--space-12)' }}
        />
      )}

      {tab === 'studies' && (
        <>
          {order ? (
            <div className="ab-toolbar" style={{ borderTop: 'none' }}>
              <div className="cell-2l">
                <b>{order.orderCode} · {order.patientCode}</b>
                <span>
                  {linkedStudyUID
                    ? `Đã liên kết: ${linkedStudyUID}`
                    : `Chưa có ảnh · Accession ${order.accessionNumber || 'chưa cấp'}`}
                </span>
              </div>
              <span className="spacer" />
              {linkedStudyUID && (
                <Btn variant="ghost" icon="image" onClick={() => onOpenViewer(linkedStudyUID)}>
                  Mở viewer
                </Btn>
              )}
              <Btn variant="ghost" icon="refresh" onClick={() => void load()} loading={loading}>
                Đồng bộ PACS
              </Btn>
            </div>
          ) : (
            <Alert
              type="info"
              showIcon
              message="Mở PACS từ một dòng bệnh nhân để tra cứu và liên kết Study."
              style={{ margin: 'var(--space-12)' }}
            />
          )}

          {order && (
            <div style={{ display: 'flex', gap: 'var(--space-8)', padding: '0 var(--space-12) var(--space-12)' }}>
              <Input
                value={manualStudyUID}
                onChange={(event) => setManualStudyUID(event.target.value)}
                onPressEnter={() => void linkStudy(manualStudyUID)}
                placeholder="Nhập Study Instance UID để liên kết thủ công"
              />
              <Btn
                variant="primary"
                icon="link"
                disabled={!manualStudyUID.trim()}
                loading={linkingUID === manualStudyUID}
                onClick={() => void linkStudy(manualStudyUID)}
              >
                Liên kết
              </Btn>
            </div>
          )}

          {remoteServers.some((server) => server.isActive) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', padding: '0 var(--space-12) var(--space-12)' }}>
              <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>Remote PACS đích</span>
              <Select
                value={selectedRemoteId || undefined}
                onChange={setSelectedRemoteId}
                style={{ minWidth: 260 }}
                placeholder="Chọn server đích"
                options={remoteServers
                  .filter((server) => server.isActive)
                  .map((server) => ({ value: server.id, label: `${server.name} · ${server.aeTitle}` }))}
              />
            </div>
          )}

          <DataTable<DicomStudyDto>
            columns={studyColumns}
            data={order ? orderedStudies : []}
            rowKey={(study) => study.studyInstanceUID}
            empty={loading ? 'Đang đồng bộ Study từ PACS…' : 'Không tìm thấy Study PACS của bệnh nhân'}
            actions={(study) => (
              <div className="ab-actions">
                <ActBtn ic="eye" title="Mở DICOM viewer" onClick={() => onOpenViewer(study.studyInstanceUID)} />
                {linkedStudyUID !== study.studyInstanceUID && order && (
                  <ActBtn
                    ic="link"
                    title="Liên kết Study với phiếu"
                    onClick={() => void linkStudy(study.studyInstanceUID)}
                  />
                )}
                <ActBtn
                  ic="download"
                  title={exportingUID === study.studyInstanceUID ? 'Đang tải DICOM…' : 'Tải DICOM ZIP'}
                  onClick={() => void exportStudy(study.studyInstanceUID)}
                />
                {selectedRemoteId && (
                  <ActBtn
                    ic="cloud"
                    title={sendingUID === study.studyInstanceUID ? 'Đang gửi Remote PACS…' : 'Gửi Remote PACS'}
                    onClick={() => void sendStudy(study.studyInstanceUID)}
                  />
                )}
              </div>
            )}
          />
        </>
      )}

      {tab === 'connections' && (
        <>
          <div className="ab-toolbar" style={{ borderTop: 'none' }}>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
              PACS lưu ảnh DICOM; HIS chỉ giữ Study UID và liên kết với phiếu chụp.
            </span>
            <span className="spacer" />
            <RefreshButton onRefresh={() => void load()} loading={loading} />
          </div>
          <DataTable<PACSConnectionDto>
            columns={connectionColumns}
            data={connections}
            rowKey={(connection) => connection.id}
            empty={loading ? 'Đang tải kết nối…' : 'Chưa cấu hình PACS'}
            actions={(connection) => (
              <ActBtn
                ic="activity"
                title={checkingConnectionId === connection.id ? 'Đang kiểm tra…' : 'Kiểm tra kết nối'}
                onClick={() => void checkConnection(connection.id)}
              />
            )}
          />
          <div style={{ padding: 'var(--space-12)', color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>
            Remote PACS đang hoạt động: {remoteServers.filter((server) => server.isActive).length}/{remoteServers.length}.
            {' '}Quản lý AE Title, host và port trong RIS Admin.
          </div>
        </>
      )}
    </ModalShell>
  );
};

export default PacsWorkspaceModal;
