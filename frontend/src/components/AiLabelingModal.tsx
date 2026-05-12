/**
 * AI labeling — modal chạy inference + hiển thị kết quả + review.
 * Mở từ DicomViewer khi BS click "Phân tích AI".
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Checkbox, Empty, Input, Modal, Progress, Space, Spin, Table, Tag, Typography, message,
} from 'antd';
import { RobotOutlined, CheckOutlined, CloseOutlined, HistoryOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getAiHistoryByStudy,
  getModelConfig,
  reviewAiResult,
  saveAiResult,
  type AiLabel,
  type AiModelConfig,
  type AiResultDto,
} from '../api/aiLabeling';
import { runInference, computeOcclusionHeatmaps, type InferenceResult } from '../services/aiLabelingService';

const { Text, Title } = Typography;

/**
 * Backend `PatientId` / `RadiologyRequestId` are typed `Guid?` on the DTO.
 * For PACS-only views (DICOM CD imports, ACRIN test data) the patient
 * identifier is a free-text string like "ACRIN-NSCLC-FDG-PET-042" — sending
 * it back as `patientId` makes ASP.NET model binding 400 the whole request,
 * which silently kills the modal close path. Only pass the value when it
 * actually parses as a UUID.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function asGuidOrUndef(v: string | undefined): string | undefined {
  return v && UUID_RE.test(v) ? v : undefined;
}

interface Props {
  open: boolean;
  onClose: () => void;
  studyInstanceUID: string;
  previewUrl: string;
  patientId?: string;
  radiologyRequestId?: string;
  /** DICOM Modality (CR, DX, CT, US, MG, MR…). When set, the modal asks the
   *  backend for the modality-specific model. Falls back to default (CR) when
   *  omitted. Backend returns 404 + Available:false if the modality has no
   *  model configured. */
  modality?: string;
  onAccepted?: (labels: AiLabel[]) => void;
}

export default function AiLabelingModal({
  open,
  onClose,
  studyInstanceUID,
  previewUrl,
  patientId,
  radiologyRequestId,
  modality,
  onAccepted,
}: Props) {
  const [config, setConfig] = useState<AiModelConfig | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [savedResult, setSavedResult] = useState<AiResultDto | null>(null);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [reviewNote, setReviewNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AiResultDto[]>([]);
  const [tab, setTab] = useState<'new' | 'history'>('new');

  // Load config + history on open
  useEffect(() => {
    if (!open) return;
    setError(null);
    setResult(null);
    setSavedResult(null);
    setAccepted({});
    setReviewNote('');
    setConfig(null);

    getModelConfig(modality)
      .then((c) => {
        // Backward-compat: pre-Phase-1 backends don't return `modality` or
        // `available`. Treat absence as "yes, available" so the modal keeps
        // working on older deploys.
        const normalized: AiModelConfig = {
          ...c,
          modality: c.modality ?? modality ?? 'CR',
          available: c.available ?? true,
        };
        setConfig(normalized);
        // Only block Run when the backend explicitly says unavailable.
        if (c.available === false) {
          setError(
            `Model AI cho modality "${normalized.modality}" chưa cài đặt. ` +
            'Admin cần chạy scripts/convert_*.py hoặc cấu hình ModelUrl trỏ về CDN/R2.',
          );
        }
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : '';
        if (/404|not.found|Modality.*không hỗ trợ/i.test(msg)) {
          setError(`Modality "${modality ?? 'mặc định'}" chưa được cấu hình AI trong appsettings.AiLabeling.Models[].`);
        } else {
          setError('Không tải được cấu hình model AI');
        }
      });
    getAiHistoryByStudy(studyInstanceUID).then(setHistory).catch(() => {});
  }, [open, studyInstanceUID, modality]);

  const handleRun = useCallback(async () => {
    if (!config) return;
    if (!config.modelUrl) {
      setError('Chưa cấu hình model URL. Liên hệ admin cấu hình appsettings > AiLabeling > ModelUrl.');
      return;
    }
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const token = localStorage.getItem('token');
      const authHeader = token ? `Bearer ${token}` : undefined;
      const inf = await runInference(config, previewUrl, {
        onProgress: setProgress,
        authHeader,
      });

      // Phase 2 — compute heatmaps for labels with score >= 0.4 (BS thấy được
      // mức TB+). Top 4 only to cap occlusion cost (~2s per heatmap on WASM).
      try {
        const hotLabels = inf.labels
          .map((l, _i) => ({ l, idx: config.labels.indexOf(l.label) }))
          .filter((x) => x.idx >= 0 && x.l.score >= 0.4)
          .slice(0, 4);
        if (hotLabels.length > 0 && inf._cachedTensor) {
          setProgress('Tính heatmap vùng nghi ngờ…');
          const scores = config.labels.map((lbl) =>
            inf.labels.find((x) => x.label === lbl)?.score ?? 0,
          );
          const heats = await computeOcclusionHeatmaps(
            config,
            inf._cachedTensor,
            scores,
            hotLabels.map((x) => x.idx),
            { onProgress: setProgress },
          );
          // Attach heatmap to each label by index.
          for (const x of hotLabels) {
            const h = heats[x.idx];
            if (h) x.l.heatmap = h;
          }
        }
      } catch (heatErr) {
        // Heatmap is best-effort — failure must not block the main result.
        console.warn('[AI] heatmap pass failed:', heatErr);
      }

      setResult(inf);
      // Save audit log
      const labelsJson = JSON.stringify(inf.labels);
      try {
        const saved = await saveAiResult({
          studyInstanceUID,
          patientId: asGuidOrUndef(patientId),
          radiologyRequestId: asGuidOrUndef(radiologyRequestId),
          modelName: config.modelName,
          modelVersion: config.modelVersion,
          modelUrl: config.modelUrl,
          durationMs: inf.durationMs,
          labelsJson,
          inputImageHash: inf.inputImageHash,
          inputWidth: inf.inputWidth,
          inputHeight: inf.inputHeight,
        });
        setSavedResult(saved);
      } catch {
        message.warning('Đã chạy AI xong nhưng không lưu được audit (kiểm tra quyền)');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Lỗi không xác định';
      setError(msg);
      // Save error to audit as well
      try {
        await saveAiResult({
          studyInstanceUID,
          patientId: asGuidOrUndef(patientId),
          radiologyRequestId: asGuidOrUndef(radiologyRequestId),
          modelName: config.modelName,
          modelVersion: config.modelVersion,
          modelUrl: config.modelUrl,
          durationMs: 0,
          labelsJson: '[]',
          errorMessage: msg,
        });
      } catch { /* ignore */ }
    } finally {
      setRunning(false);
      setProgress('');
    }
  }, [config, previewUrl, studyInstanceUID, patientId, radiologyRequestId]);

  const handleReview = async (status: 1 | 2 | 3) => {
    if (!result) return;
    const acceptedLabels = status === 1
      ? result.labels
      : status === 2
        ? result.labels.filter((l) => accepted[l.label])
        : [];
    // Audit review is best-effort: if the save audit call hadn't completed
    // yet (race) or the network 4xx-ed, we still hand the labels back to
    // the parent so the overlay renders. Audit gap is logged as warning.
    if (savedResult) {
      try {
        await reviewAiResult(savedResult.id, {
          reviewStatus: status,
          acceptedLabelsJson: JSON.stringify(acceptedLabels),
          reviewNote,
        });
      } catch {
        message.warning('Không lưu được audit review (overlay vẫn hiển thị)');
      }
    }
    if (status !== 3) onAccepted?.(acceptedLabels);
    message.success(
      status === 1 ? 'Đã chấp nhận toàn bộ AI suggest'
      : status === 2 ? `Đã chấp nhận ${acceptedLabels.length} nhãn`
      : 'Đã từ chối kết quả AI'
    );
    onClose();
  };

  const severityColor = (score: number) =>
    score >= 0.7 ? '#cf1322' : score >= 0.4 ? '#fa8c16' : '#8c8c8c';

  return (
    <Modal
      title={
        <Space>
          <RobotOutlined />
          AI Labeling — Phân tích tự động
          {config && <Tag color="blue">{config.modality}</Tag>}
          {config && <Tag color="blue">{config.modelName}</Tag>}
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={850}
      destroyOnClose
      data-testid="ai-labeling-modal"
    >
      <Space style={{ marginBottom: 12 }}>
        <Button
          type={tab === 'new' ? 'primary' : 'default'}
          onClick={() => setTab('new')}
          icon={<RobotOutlined />}
          size="small"
        >
          Phân tích mới
        </Button>
        <Button
          type={tab === 'history' ? 'primary' : 'default'}
          onClick={() => setTab('history')}
          icon={<HistoryOutlined />}
          size="small"
        >
          Lịch sử ({history.length})
        </Button>
      </Space>

      {tab === 'new' && (
        <div>
          {error && (
            <Alert
              type="error"
              showIcon
              title="Lỗi AI"
              description={error}
              style={{ marginBottom: 12 }}
            />
          )}

          {!result && !running && (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Alert
                type="info"
                showIcon
                title="AI hỗ trợ đọc phim — không thay thế chẩn đoán của BS"
                description={
                  <div>
                    Model chạy trực tiếp trong browser. Ảnh không rời máy, tuân thủ quy định bảo mật y tế.
                    BS xem kết quả gợi ý rồi quyết định accept hoặc reject — AI không tự ký duyệt.
                  </div>
                }
                style={{ marginBottom: 12, textAlign: 'left' }}
              />
              <Button
                type="primary"
                size="large"
                icon={<RobotOutlined />}
                onClick={handleRun}
                disabled={!config || !config.available}
                data-testid="ai-labeling-run-btn"
              >
                Chạy phân tích AI
              </Button>
            </div>
          )}

          {running && (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Spin size="large" />
              <div style={{ marginTop: 12 }}>{progress || 'Đang xử lý…'}</div>
            </div>
          )}

          {result && (
            <div>
              <Alert
                type={result.labels.some((l) => l.score >= 0.5) ? 'warning' : 'success'}
                showIcon
                icon={<ExclamationCircleOutlined />}
                title={`Phát hiện ${result.labels.filter((l) => l.score >= 0.5).length} dấu hiệu bất thường (≥50% confidence) trong ${result.durationMs}ms`}
                style={{ marginBottom: 12 }}
              />
              <Title level={5}>Kết quả phân loại</Title>
              <Table
                rowKey="label"
                size="small"
                pagination={false}
                dataSource={result.labels}
                columns={[
                  {
                    title: 'Chẩn đoán gợi ý',
                    dataIndex: 'labelVi',
                    render: (v: string, row: AiLabel) => (
                      <>
                        <strong>{v}</strong>
                        <div style={{ color: '#999', fontSize: 11 }}>{row.label}</div>
                      </>
                    ),
                  },
                  {
                    title: 'Độ tin cậy',
                    dataIndex: 'score',
                    width: 260,
                    render: (s: number) => (
                      <Progress
                        percent={Math.round(s * 100)}
                        size="small"
                        strokeColor={severityColor(s)}
                        format={(p) => `${p}%`}
                      />
                    ),
                  },
                  {
                    title: 'Mức độ',
                    dataIndex: 'score',
                    width: 110,
                    render: (s: number) =>
                      s >= 0.7 ? <Tag color="red">Cao</Tag>
                      : s >= 0.4 ? <Tag color="orange">TB</Tag>
                      : <Tag>Thấp</Tag>,
                  },
                  {
                    title: 'Chấp nhận',
                    width: 90,
                    align: 'center' as const,
                    render: (_: unknown, row: AiLabel) => (
                      <Checkbox
                        checked={!!accepted[row.label]}
                        onChange={(e) => setAccepted({ ...accepted, [row.label]: e.target.checked })}
                      />
                    ),
                  },
                ]}
              />
              <div style={{ marginTop: 12 }}>
                <Text strong>Ghi chú BS:</Text>
                <Input.TextArea
                  rows={2}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="BS có thể ghi thêm ý kiến về kết quả AI…"
                  style={{ marginTop: 4 }}
                />
              </div>
              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <Space>
                  <Button
                    icon={<CloseOutlined />}
                    danger
                    onClick={() => handleReview(3)}
                  >
                    Từ chối toàn bộ
                  </Button>
                  <Button
                    icon={<CheckOutlined />}
                    onClick={() => handleReview(2)}
                    disabled={Object.values(accepted).every((v) => !v)}
                  >
                    Chấp nhận các mục đã tick
                  </Button>
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    onClick={() => handleReview(1)}
                  >
                    Chấp nhận toàn bộ
                  </Button>
                </Space>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        history.length === 0 ? (
          <Empty description="Chưa có lần chạy AI nào trước đây" />
        ) : (
          <Table
            rowKey="id"
            size="small"
            dataSource={history}
            columns={[
              {
                title: 'Thời gian',
                dataIndex: 'createdAt',
                width: 140,
                render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm'),
              },
              { title: 'Người chạy', dataIndex: 'createdByName', width: 160 },
              {
                title: 'Model',
                dataIndex: 'modelName',
                render: (v: string, row: AiResultDto) => (
                  <>
                    {v}
                    {row.modelVersion && <Tag style={{ marginLeft: 4 }}>{row.modelVersion}</Tag>}
                  </>
                ),
              },
              {
                title: 'Trạng thái',
                dataIndex: 'reviewStatusLabel',
                width: 160,
                render: (label: string, row: AiResultDto) => {
                  const color = row.reviewStatus === 1 ? 'green'
                    : row.reviewStatus === 2 ? 'gold'
                    : row.reviewStatus === 3 ? 'red' : 'blue';
                  return <Tag color={color}>{label}</Tag>;
                },
              },
              {
                title: 'TG chạy',
                dataIndex: 'durationMs',
                width: 90,
                render: (v: number) => `${v}ms`,
              },
            ]}
            expandable={{
              expandedRowRender: (row) => {
                try {
                  const labels: AiLabel[] = JSON.parse(row.labelsJson ?? '[]');
                  if (!labels.length) return <i>(Không có nhãn)</i>;
                  return (
                    <Space wrap>
                      {labels.filter((l) => l.score >= 0.2).slice(0, 10).map((l) => (
                        <Tag key={l.label} color={l.score >= 0.7 ? 'red' : l.score >= 0.4 ? 'orange' : 'default'}>
                          {l.labelVi} ({Math.round(l.score * 100)}%)
                        </Tag>
                      ))}
                    </Space>
                  );
                } catch {
                  return <i>Lỗi đọc labels JSON</i>;
                }
              },
            }}
          />
        )
      )}
    </Modal>
  );
}
