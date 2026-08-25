import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { storage, STORAGE_KEYS } from '../../../services/storage.service';
import { RefreshButton } from '../../../components/actions';
import { Field } from '../../../components/form/Field';
import { useModalForm } from '../../../hooks/useModalForm';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Button,
  Spin,
  Alert,
  Descriptions,
  Empty,
  message,
  Tag,
  Modal,
} from 'antd';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  ExpandOutlined,
  DownloadOutlined,
  FileImageOutlined,
  FolderOutlined,
  PictureOutlined,
  SettingOutlined,
  LinkOutlined,
  ExclamationCircleOutlined,
  ExportOutlined,
  VideoCameraOutlined,
  AppstoreOutlined,
  DiffOutlined,
  BlockOutlined,
  RobotOutlined,
  StarOutlined,
  StarFilled,
} from '@ant-design/icons';
import risApi from '../api/ris';
import type { DicomSeriesDto, DicomImageDto, KeyImageDto } from '../api/ris';
import { createRoom, searchRooms, joinRoom } from '../../telemedicine/api/videoConsultation';
import { openAiReportHtml, downloadAiSignedPdf, uploadAiDicomSr, mergeAiToReport, type AiLabel } from '../api/aiLabeling';
import { API_ORIGIN } from '../../../config/api.config';
import { ORTHANC_URL } from '../../../config/env.config';
import { dicomStudyLogApi } from '../../../api/nangcap24';
import { friendlyErrorMessage } from '../../../utils/friendlyError';
import AiLabelingModal from '@/modules/radiology/components/AiLabelingModal';
import AiOverlayLayer from '@/modules/radiology/components/AiOverlayLayer';
import CineControls, { type CineViewportHandle } from '@/modules/radiology/components/CineControls';
import type { CornerstoneViewerHandle } from '@/modules/radiology/components/CornerstoneViewer';
import { loadViewerConfig } from '@/modules/radiology/components/DicomViewerConfig';
import type { MammoImage } from '@/modules/radiology/components/MammoViewer';
import MprViewer from '@/modules/radiology/components/MprViewer';
import MammoViewer from '@/modules/radiology/components/MammoViewer';
import MipMinIpViewer from '@/modules/radiology/components/MipMinIpViewer';
import CornerstoneViewer from '@/modules/radiology/components/CornerstoneViewer';

// Backend returns relative paths like "/api/RISComplete/pacs/instances/.../preview".
// Resolve them against the API origin (Cloud Run) so the browser fetches them
// from the backend instead of the frontend host (Vercel) which has no such route.
function resolveApiUrl(path: string | undefined | null): string {
  if (!path) return '';
  let url = path;
  if (!/^https?:\/\//i.test(url) && API_ORIGIN) {
    url = `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return url;
}

/**
 * HTML <img> cannot attach an Authorization header. Fetch PHI with the normal bearer header and
 * render a short-lived in-memory blob URL instead; the JWT never appears in browser history,
 * proxy logs, Referer headers, or image URLs.
 */
const AuthenticatedImage: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = ({ src, ...props }) => {
  const [blobUrl, setBlobUrl] = useState<string>('');

  useEffect(() => {
    if (!src || typeof src !== 'string') { setBlobUrl(''); return; }
    const controller = new AbortController();
    let objectUrl = '';
    const token = storage.getRaw(STORAGE_KEYS.token);
    fetch(src, {
      signal: controller.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: 'include',
    })
      .then(async response => {
        if (!response.ok) throw new Error(`PACS image HTTP ${response.status}`);
        return response.blob();
      })
      .then(blob => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setBlobUrl('');
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  return blobUrl ? <img src={blobUrl} {...props} /> : null;
};

const { Title, Text } = Typography;

const ORTHANC_BASE = ORTHANC_URL;

interface StudyInfo {
  studyInstanceUID: string;
  patientName?: string;
  patientId?: string;
  studyDate?: string;
  studyDescription?: string;
  modality?: string;
  accessionNumber?: string;
  seriesCount?: number;
  instanceCount?: number;
  orthancStudyId?: string;
}

type DicomViewerError = {
  code?: string;
  message?: string;
};

/**
 * Vì sao không dùng một cờ boolean: "ca chụp chưa có ảnh" và "gọi PACS lỗi" trước đây
 * cùng rơi vào `pacsAvailable === false`, nên màn hình báo "PACS Server chưa kết nối"
 * cho cả hai. Người dùng đi khởi động lại PACS trong khi PACS vẫn sống và nguyên nhân
 * thật chỉ là chưa có ảnh nào được đẩy lên. Tách trạng thái để nói đúng nguyên nhân.
 */
type PacsState = 'loading' | 'ready' | 'empty' | 'error' | 'missing-uid';

/** Trình duyệt chỉ mở được Orthanc trực tiếp khi VITE_ORTHANC_URL được cấu hình. */
const ORTHANC_LINKABLE = !!ORTHANC_URL;
const ORTHANC_UNCONFIGURED_HINT =
  'Chưa cấu hình địa chỉ Orthanc cho trình duyệt (VITE_ORTHANC_URL) — liên hệ quản trị hệ thống';

const DicomViewer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const studyInstanceUID = searchParams.get('study') || '';

  const [loading, setLoading] = useState(true);
  const [pacsState, setPacsState] = useState<PacsState>('loading');
  const pacsAvailable = pacsState === 'ready';
  const [studyInfo, setStudyInfo] = useState<StudyInfo | null>(null);
  const [series, setSeries] = useState<DicomSeriesDto[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<DicomSeriesDto | null>(null);
  const [images, setImages] = useState<DicomImageDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  // F2.12: userId for per-user localStorage config (lấy từ cached user object)
  const currentUserId = React.useMemo(() => {
    try {
      const u = storage.get<{ id?: string; username?: string }>(STORAGE_KEYS.user) ?? {};
      return u.id || u.username || undefined;
    } catch { return undefined; }
  }, []);

  // GAP FIX 5: Apply viewer config từ localStorage — W/L presets + shortcuts + overlay
  const [viewerConfig, setViewerConfig] = useState(() => loadViewerConfig(currentUserId));
  const [activeWlPreset, setActiveWlPreset] = useState<string>('');
  const [showOverlay, setShowOverlay] = useState(true);

  // F2.12: Live WW/WL values from Cornerstone viewport (updated on applyWlPreset or preset change)
  const [liveWL, setLiveWL] = useState<{ ww: number; wl: number } | null>(null);

  // A1: Embedded OHIF iframe mode — MPR, 3D volume, MIP, Mamo sẵn có trong Orthanc plugin
  const [embedOhif, setEmbedOhif] = useState(false);
  // Phase 2: Native MPR/3D rendering via Cornerstone3D VolumeViewports
  const [useNativeMpr, setUseNativeMpr] = useState(false);
  // Phase 3: Native Mammography 2x2 hanging-protocol viewer
  const [useMammo, setUseMammo] = useState(false);
  // NangCap24 gap #9: MIP/MinIP intensity-projection viewer
  const [useMip, setUseMip] = useState(false);

  // A2: Video conference integration
  const [liveRoomId, setLiveRoomId] = useState<string | null>(null);
  const [creatingRoom, setCreatingRoom] = useState(false);

  // QW3.3: Compare 2 studies side-by-side
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareUid, setCompareUid] = useState<string>('');
  const vfCompare = useModalForm({ compareUid: { required: true, message: 'Nhập hoặc chọn Study UID để so sánh' } }, compareOpen);
  const [patientStudies, setPatientStudies] = useState<Array<{ studyInstanceUID: string; studyDate?: string; modality?: string; serviceName?: string }>>([]);

  // AI Labeling
  const [aiOpen, setAiOpen] = useState(false);
  // Phase 2 — AI overlay (bbox + heatmap) lifted up from modal so it can render
  // on top of CornerstoneViewer's canvas. Cleared when image selection changes.
  const [aiOverlayLabels, setAiOverlayLabels] = useState<AiLabel[]>([]);
  const [showAiOverlay, setShowAiOverlay] = useState(true);
  const [showAiHeatmap, setShowAiHeatmap] = useState(true);
  const [showAiBbox, setShowAiBbox] = useState(true);
  // Phase 3 — capture the audit-saved AI result id so the toolbar can call
  // export endpoints (HTML/PDF, DICOM SR upload, merge to RadiologyReport).
  const [lastAiResultId, setLastAiResultId] = useState<string | null>(null);
  const [aiExporting, setAiExporting] = useState<string | null>(null);

  // Cornerstone3D viewer toggle + handle for tool/preset commands
  const [useCs, setUseCs] = useState(true); // default to native renderer
  const csRef = useRef<CornerstoneViewerHandle>(null);

  // Key Images — loaded per study, refreshed after mark/unmark
  const [keyImages, setKeyImages] = useState<KeyImageDto[]>([]);
  // Gallery modal — quản lý danh sách key images hàng loạt
  const [keyImageGalleryOpen, setKeyImageGalleryOpen] = useState(false);
  // Guard double-submit khi bỏ đánh dấu key image trong gallery (#467) — giữ id đang xử lý
  const [keyImageRemoving, setKeyImageRemoving] = useState<string | null>(null);
  // Index within the current images[] array that is currently viewed in viewer
  const [viewerCurrentIdx, setViewerCurrentIdx] = useState(0);

  // Favorite study per-user — lưu localStorage theo userId (lấy từ JWT username)
  const FAVE_KEY = 'dicom_fave_studies_v1';
  const [isFavorite, setIsFavorite] = useState(false);
  useEffect(() => {
    if (!studyInstanceUID) return;
    try {
      const raw = storage.getRaw(FAVE_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      setIsFavorite(list.includes(studyInstanceUID));
    } catch { setIsFavorite(false); }
  }, [studyInstanceUID]);

  const toggleFavorite = useCallback(() => {
    try {
      const raw = storage.getRaw(FAVE_KEY);
      let list: string[] = raw ? JSON.parse(raw) : [];
      if (list.includes(studyInstanceUID)) {
        list = list.filter((s) => s !== studyInstanceUID);
        message.info('Đã xóa khỏi Favorite');
      } else {
        list = [studyInstanceUID, ...list].slice(0, 50); // giữ tối đa 50
        message.success('Đã thêm vào Favorite');
      }
      storage.set(FAVE_KEY, list);
      setIsFavorite(list.includes(studyInstanceUID));
    } catch { /* ignore */ }
  }, [studyInstanceUID]);

  // Build wadouri:URL list from images (raw DICOM proxy through backend)
  // Backend endpoint /pacs/instances/{id}/file streams raw DICOM bytes.
  // imageUrl pattern is `/api/RISComplete/pacs/instances/{instanceId}/(preview|rendered)?...` —
  // swap to /file to point at raw DICOM. Cornerstone needs `wadouri:` prefix.
  const cornerstoneImageIds = React.useMemo(() => {
    return images
      .map((img) => {
        const raw = img.wadoUrl
          || img.imageUrl?.replace(/\/(?:preview|rendered)(\?.*)?$/, '/file')
          || '';
        if (!raw) return '';
        const abs = resolveApiUrl(raw);
        return abs ? `wadouri:${abs}` : '';
      })
      .filter(Boolean);
  }, [images]);

  // Phase 3: build mammo image list with hanging-protocol metadata
  const mammoImages: MammoImage[] = React.useMemo(() => {
    return images
      .map((img) => {
        const raw = img.wadoUrl
          || img.imageUrl?.replace(/\/(?:preview|rendered)(\?.*)?$/, '/file')
          || '';
        if (!raw) return null;
        const abs = resolveApiUrl(raw);
        if (!abs) return null;
        return {
          imageId: `wadouri:${abs}`,
          laterality: img.laterality,
          viewPosition: img.viewPosition,
          pixelSpacing: img.pixelSpacing,
          instanceNumber: img.instanceNumber,
        } as MammoImage;
      })
      .filter((x): x is MammoImage => x !== null);
  }, [images]);

  // Detect mammography study so we can highlight/auto-suggest the mammo button
  const isMammoStudy = React.useMemo(() => {
    if (studyInfo?.modality === 'MG') return true;
    return images.some((img) => img.modality === 'MG' || !!img.viewPosition);
  }, [images, studyInfo]);

  useEffect(() => {
    // Global hotkey listener cho W/L presets F1-F10 + shortcuts customizable
    const handler = (e: KeyboardEvent) => {
      // W/L presets F1-F10
      const preset = viewerConfig.wlPresets.find(p => p.key === e.key);
      if (preset) {
        e.preventDefault();
        setActiveWlPreset(preset.key);
        // Apply W/L via Cornerstone3D viewport API
        csRef.current?.applyWlPreset(preset);
        // Update live WW/WL display on overlay
        setLiveWL({ ww: preset.width, wl: preset.center });
        message.info(`Da ap W/L preset: ${preset.name} (C=${preset.center}, W=${preset.width})`, 1);
        return;
      }

      // Customizable shortcuts
      const sc = viewerConfig.shortcuts.find(s => s.key === e.key);
      if (sc && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Chỉ apply nếu không đang gõ trong input
        const active = document.activeElement;
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        message.info(`Action: ${sc.description}`, 1);
        // TODO: hook vào Cornerstone tool switcher khi nâng cấp engine
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [viewerConfig]);

  const reloadConfig = useCallback(() => {
    setViewerConfig(loadViewerConfig(currentUserId));
    message.success('Da tai lai cau hinh viewer');
  }, [currentUserId]);

  // Load key images for the current study (called on study load + after mark/unmark)
  const loadKeyImages = useCallback(async (studyUID: string) => {
    if (!studyUID) return;
    try {
      const resp = await risApi.getKeyImages(studyUID);
      setKeyImages(resp.data ?? []);
    } catch (e) {
      // Non-critical — không chặn xem ảnh, nhưng phải báo để khỏi hiểu nhầm "0 key image"
      message.warning(friendlyErrorMessage(e, 'Không tải được danh sách Key Image của ca chụp'));
    }
  }, []);

  // Toggle mark/unmark key image for the image at given index in current series
  const handleToggleKeyImage = useCallback(async (idx: number) => {
    const img = images[idx];
    if (!img || !studyInstanceUID) return;
    const sop = img.sopInstanceUID;
    if (!sop) { message.warning('Không có SOP Instance UID cho ảnh này'); return; }
    const alreadyMarked = keyImages.some((k) => k.sopInstanceUID === sop);
    try {
      await risApi.markKeyImage({
        studyInstanceUID,
        sopInstanceUID: sop,
        description: img.imageType ?? '',
        unmark: alreadyMarked,
      });
      message.success(alreadyMarked ? 'Đã bỏ đánh dấu ảnh key' : 'Đã đánh dấu ảnh key');
      await loadKeyImages(studyInstanceUID);
    } catch {
      message.error('Không thể thực hiện thao tác ảnh key');
    }
  }, [images, keyImages, studyInstanceUID, loadKeyImages]);


  const loadStudyData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPacsState('loading');

    try {
      // Try to get series list from backend API
      const seriesResponse = await risApi.getSeries(studyInstanceUID);

      if (seriesResponse.data && seriesResponse.data.length > 0) {
        setPacsState('ready');
        setSeries(seriesResponse.data);

        // Extract study info from first series
        const firstSeries = seriesResponse.data[0];
        setStudyInfo({
          studyInstanceUID,
          patientName: firstSeries.patientName,
          patientId: firstSeries.patientId,
          studyDate: firstSeries.studyDate || firstSeries.seriesDate,
          studyDescription: firstSeries.studyDescription,
          modality: firstSeries.modality,
          seriesCount: seriesResponse.data.length,
          instanceCount: seriesResponse.data.reduce((sum, s) => sum + (s.instanceCount || s.numberOfImages || 0), 0),
          orthancStudyId: firstSeries.orthancStudyId,
        });

        // Auto-select first series
        setSelectedSeries(firstSeries);
        void loadImages(firstSeries.seriesInstanceUID);
        // Load key images for this study (non-critical)
        void loadKeyImages(studyInstanceUID);

        // Ghi log THẬT (DicomStudyActivityLog gap #9): BS/KTV mở xem ca chụp.
        // Audit log không chặn luồng xem ảnh nếu fail.
        void dicomStudyLogApi.logActivity({
          studyInstanceUid: studyInstanceUID,
          action: 'viewed',
          actionDetails: `Xem ca chụp ${firstSeries.modality || ''} trên DICOM viewer`.trim(),
          machineName: window.location.hostname,
        }).catch(() => { /* ignore audit failure */ });
      } else {
        // Máy chủ trả lời bình thường nhưng không có series nào: ảnh chưa được đẩy lên
        // PACS (hoặc ca chụp chưa gắn Study UID). KHÔNG phải sự cố kết nối.
        setPacsState('empty');
        setStudyInfo({
          studyInstanceUID,
        });
      }
    } catch (err: unknown) {
      const viewerError = err as DicomViewerError;
      console.warn('Error loading study:', err);
      setPacsState('error');
      setStudyInfo({
        studyInstanceUID,
      });

      // Check if it's a connection error
      if (viewerError.code === 'ECONNREFUSED' || viewerError.message?.includes('Network Error')) {
        setError('Không thể kết nối đến PACS Server. Vui lòng kiểm tra cấu hình.');
      }
    } finally {
      setLoading(false);
    }
  }, [studyInstanceUID, loadKeyImages]);

  // Check PACS availability and load study data
  useEffect(() => {
    if (!studyInstanceUID) {
      setPacsState('missing-uid');
      setError('Mở màn hình xem ảnh mà không kèm ca chụp nào. Hãy chọn một ca chụp từ danh sách Chẩn đoán hình ảnh.');
      setLoading(false);
      return;
    }

    void loadStudyData();
  }, [studyInstanceUID, loadStudyData]);


  const loadImages = async (seriesUID: string) => {
    try {
      const response = await risApi.getImages(seriesUID);
      setImages(response.data || []);
      // Auto-select first image for large preview
      if (response.data && response.data.length > 0 && response.data[0].imageUrl) {
        setSelectedImageUrl(resolveApiUrl(response.data[0].imageUrl));
      }
    } catch (err) {
      message.warning(friendlyErrorMessage(err, 'Không tải được danh sách ảnh của series này'));
      setImages([]);
    }
  };

  const handleSeriesSelect = (s: DicomSeriesDto) => {
    setSelectedSeries(s);
    setSelectedImageUrl(null);
    loadImages(s.seriesInstanceUID);
  };

  const handleOpenOHIF = () => {
    if (!ORTHANC_LINKABLE) {
      message.warning(ORTHANC_UNCONFIGURED_HINT);
      return;
    }
    // Open OHIF Viewer integrated in Orthanc
    const ohifUrl = `${ORTHANC_BASE}/ohif/viewer?StudyInstanceUIDs=${studyInstanceUID}`;
    window.open(ohifUrl, '_blank');
  };

  // A1: Embed OHIF Viewer inline — gives access to MPR 4-quadrant, 3D volume,
  // MIP presets, Mammography layout, Compare studies... all built-in to OHIF 3.x
  // which ships inside Orthanc's OHIF plugin.
  const ohifEmbedUrl = `${ORTHANC_BASE}/ohif/viewer?StudyInstanceUIDs=${studyInstanceUID}`;

  // QW3.3: Load patient's other studies when Compare modal opens
  const openCompareModal = useCallback(async () => {
    setCompareOpen(true);
    if (!studyInfo?.patientId) return;
    try {
      const resp = await risApi.getPatientRadiologyHistory(studyInfo.patientId);
      const raw = (resp?.data ?? []) as unknown as Array<Record<string, unknown>>;
      const list = raw
        .filter((r) => typeof r.studyInstanceUID === 'string' && r.studyInstanceUID !== studyInstanceUID)
        .map((r) => ({
          studyInstanceUID: String(r.studyInstanceUID ?? ''),
          studyDate: r.studyDate as string | undefined,
          modality: r.modality as string | undefined,
          serviceName: r.serviceName as string | undefined,
        }));
      setPatientStudies(list);
    } catch { /* ignore */ }
  }, [studyInfo, studyInstanceUID]);

  const handleCompare = useCallback(() => {
    if (!vfCompare.validate({ compareUid })) return;
    if (!ORTHANC_LINKABLE) {
      message.warning(ORTHANC_UNCONFIGURED_HINT);
      return;
    }
    // OHIF hỗ trợ multi-study qua comma-separated StudyInstanceUIDs
    const url = `${ORTHANC_BASE}/ohif/viewer?StudyInstanceUIDs=${studyInstanceUID},${compareUid.trim()}`;
    window.open(url, '_blank', 'noopener');
    setCompareOpen(false);
  }, [compareUid, studyInstanceUID, vfCompare]);

  // QW3.12: Dual monitor — open a cloned viewer on monitor 2
  const handleOpenDualMonitor = useCallback(() => {
    const features = 'width=1400,height=900,resizable=yes,scrollbars=yes';
    // Open same page on another window; user drag to monitor 2.
    // Add ?dual=1 so window title indicates it's the secondary view.
    window.open(`${window.location.pathname}${window.location.search}&dual=1`, 'his-dual-viewer', features);
  }, []);

  // A2: Check if a live consultation room already exists for this study on mount,
  // so the button can offer Join instead of Create.
  useEffect(() => {
    if (!studyInstanceUID) return;
    searchRooms({ status: 1 })
      .then((rooms) => {
        const live = rooms.find((r) => r.studyInstanceUID === studyInstanceUID);
        if (live) setLiveRoomId(live.id);
      })
      .catch(() => {});
  }, [studyInstanceUID]);

  const handleVideoConference = useCallback(async () => {
    if (!studyInstanceUID) return;
    setCreatingRoom(true);
    try {
      if (liveRoomId) {
        // Join existing live room
        const info = await joinRoom(liveRoomId, 'Người dùng HIS');
        window.open(info.jitsiUrl, '_blank', 'noopener,width=1200,height=800');
      } else {
        // Create + auto-start a new room tied to this study
        const room = await createRoom({
          title: `Hội chẩn ca chụp ${studyInstanceUID.slice(-12)}`,
          roomType: 1, // CĐHA
          studyInstanceUID,
          patientId: studyInfo?.patientId ? undefined : undefined,
          isRecorded: false,
        });
        setLiveRoomId(room.id);
        const info = await joinRoom(room.id, 'Người dùng HIS');
        window.open(info.jitsiUrl, '_blank', 'noopener,width=1200,height=800');
        message.success('Đã tạo phòng hội chẩn cho ca chụp này');
      }
    } catch (err) {
      console.warn('video conference error:', err);
      message.error('Không mở được phòng hội chẩn');
    } finally {
      setCreatingRoom(false);
    }
  }, [studyInstanceUID, liveRoomId, studyInfo]);

  const handleOpenOrthancExplorer = () => {
    if (!ORTHANC_LINKABLE) {
      message.warning(ORTHANC_UNCONFIGURED_HINT);
      return;
    }
    window.open(`${ORTHANC_BASE}/ui/app/#/filtered-studies?StudyInstanceUID=${studyInstanceUID}`, '_blank');
  };

  const handleDownloadStudy = () => {
    if (!ORTHANC_LINKABLE) {
      message.warning(ORTHANC_UNCONFIGURED_HINT);
      return;
    }
    if (studyInfo?.orthancStudyId) {
      window.open(`${ORTHANC_BASE}/studies/${studyInfo.orthancStudyId}/archive`, '_blank');
    } else {
      message.info('Không tìm thấy study trong PACS');
    }
  };

  const [exportLoading, setExportLoading] = useState(false);

  const handleExportDicom = async () => {
    if (!ORTHANC_LINKABLE) {
      message.warning(ORTHANC_UNCONFIGURED_HINT);
      return;
    }
    if (!studyInfo?.orthancStudyId) {
      message.info('Khong tim thay study de xuat');
      return;
    }
    setExportLoading(true);
    try {
      const archiveUrl = `${ORTHANC_BASE}/studies/${studyInfo.orthancStudyId}/archive`;
      const response = await fetch(archiveUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DICOM_${studyInfo.patientId || 'unknown'}_${studyInstanceUID.slice(-8)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('Da xuat DICOM thanh cong');
    } catch (err) {
      console.warn('DICOM export error:', err);
      message.warning('Khong the xuat DICOM. Vui long kiem tra ket noi PACS.');
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" tip="Đang tải dữ liệu DICOM..." />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
              Quay lại
            </Button>
            <Title level={4} style={{ margin: 0 }}>
              <FileImageOutlined /> Xem ảnh DICOM
            </Title>
          </Space>
        </Col>
        <Col>
          <Space>
            <RefreshButton onRefresh={loadStudyData} />
            {pacsAvailable && (
              <>
                <Button
                  type={useNativeMpr ? 'primary' : 'default'}
                  icon={<AppstoreOutlined />}
                  onClick={() => {
                    setUseNativeMpr((v) => !v);
                    if (!useNativeMpr) { setEmbedOhif(false); setUseMammo(false); setUseMip(false); }
                  }}
                  data-testid="dicom-native-mpr-btn"
                  disabled={!pacsAvailable}
                >
                  {useNativeMpr ? 'Ẩn MPR Native' : 'MPR / 3D Native'}
                </Button>
                <Button
                  type={useMammo ? 'primary' : (isMammoStudy ? 'dashed' : 'default')}
                  icon={<AppstoreOutlined />}
                  onClick={() => {
                    setUseMammo((v) => !v);
                    if (!useMammo) { setEmbedOhif(false); setUseNativeMpr(false); setUseMip(false); }
                  }}
                  data-testid="dicom-mammo-btn"
                  disabled={!pacsAvailable || mammoImages.length === 0}
                >
                  {useMammo ? 'Ẩn Mammography' : 'Mammography 2x2'}
                </Button>
                <Button
                  type={useMip ? 'primary' : 'default'}
                  icon={<AppstoreOutlined />}
                  onClick={() => {
                    setUseMip((v) => !v);
                    if (!useMip) { setEmbedOhif(false); setUseNativeMpr(false); setUseMammo(false); }
                  }}
                  data-testid="dicom-mip-btn"
                  disabled={!pacsAvailable || cornerstoneImageIds.length < 2}
                >
                  {useMip ? 'Ẩn MIP/MinIP' : 'MIP / MinIP'}
                </Button>
                <Button
                  type={embedOhif ? 'primary' : 'default'}
                  icon={<AppstoreOutlined />}
                  onClick={() => { setEmbedOhif((v) => !v); if (!embedOhif) { setUseNativeMpr(false); setUseMammo(false); setUseMip(false); } }}
                  data-testid="dicom-mpr-3d-btn"
                  disabled={!ORTHANC_LINKABLE}
                  title={ORTHANC_LINKABLE ? undefined : ORTHANC_UNCONFIGURED_HINT}
                >
                  {embedOhif ? 'Ẩn OHIF' : 'MPR / 3D / Mamo (OHIF)'}
                </Button>
                <Button
                  icon={<RobotOutlined />}
                  onClick={() => setAiOpen(true)}
                  disabled={!selectedImageUrl}
                  data-testid="dicom-ai-btn"
                >
                  Phân tích AI
                </Button>
                <Button
                  type={liveRoomId ? 'primary' : 'default'}
                  danger={!!liveRoomId}
                  icon={<VideoCameraOutlined />}
                  onClick={handleVideoConference}
                  loading={creatingRoom}
                  data-testid="dicom-video-conf-btn"
                >
                  {liveRoomId ? 'Tham gia hội chẩn (LIVE)' : 'Hội chẩn video'}
                </Button>
                <Button
                  icon={<DiffOutlined />}
                  onClick={openCompareModal}
                  data-testid="dicom-compare-btn"
                >
                  So sánh
                </Button>
                <Button
                  icon={<BlockOutlined />}
                  onClick={handleOpenDualMonitor}
                  data-testid="dicom-dual-monitor-btn"
                >
                  Tách màn hình
                </Button>
                <Button
                  icon={<ExpandOutlined />}
                  onClick={handleOpenOHIF}
                  disabled={!ORTHANC_LINKABLE}
                  title={ORTHANC_LINKABLE ? undefined : ORTHANC_UNCONFIGURED_HINT}
                >
                  Mở OHIF tab mới
                </Button>
                <Button
                  icon={<LinkOutlined />}
                  onClick={handleOpenOrthancExplorer}
                  disabled={!ORTHANC_LINKABLE}
                  title={ORTHANC_LINKABLE ? undefined : ORTHANC_UNCONFIGURED_HINT}
                >
                  Orthanc Explorer
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadStudy}
                  disabled={!ORTHANC_LINKABLE}
                  title={ORTHANC_LINKABLE ? undefined : ORTHANC_UNCONFIGURED_HINT}
                >
                  Tải về
                </Button>
                <Button
                  icon={<ExportOutlined />}
                  onClick={handleExportDicom}
                  loading={exportLoading}
                  disabled={!ORTHANC_LINKABLE}
                  title={ORTHANC_LINKABLE ? undefined : ORTHANC_UNCONFIGURED_HINT}
                  data-testid="dicom-export-btn"
                >
                  Xuất DICOM
                </Button>
                <Button
                  icon={isFavorite ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                  onClick={toggleFavorite}
                  title={isFavorite ? 'Xóa khỏi Favorite' : 'Thêm vào Favorite'}
                  data-testid="dicom-favorite-btn"
                >
                  {isFavorite ? 'Bỏ Favorite' : 'Favorite'}
                </Button>
                <Button
                  icon={<PictureOutlined />}
                  onClick={() => setKeyImageGalleryOpen(true)}
                  disabled={keyImages.length === 0}
                  title={`${keyImages.length} key image${keyImages.length !== 1 ? 's' : ''}`}
                  data-testid="dicom-key-gallery-btn"
                >
                  Key Images ({keyImages.length})
                </Button>
              </>
            )}
          </Space>
        </Col>
      </Row>

      {/* Error Alert — tiêu đề phải khớp nguyên nhân: thiếu Study UID không phải lỗi PACS */}
      {error && (
        <Alert
          title={pacsState === 'missing-uid' ? 'Chưa chọn ca chụp' : 'Lỗi kết nối PACS'}
          description={error}
          type={pacsState === 'missing-uid' ? 'warning' : 'error'}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Chưa có ảnh ≠ mất kết nối PACS — hai nguyên nhân, hai thông báo */}
      {(pacsState === 'empty' || pacsState === 'error') && !error && (
        <Alert
          title={
            pacsState === 'empty'
              ? 'Ca chụp chưa có ảnh DICOM'
              : 'Không lấy được dữ liệu ảnh từ máy chủ'
          }
          description={
            <div>
              {pacsState === 'empty' ? (
                <p>
                  Máy chủ trả về 0 series cho ca chụp này. Thường là do ảnh chưa được đẩy
                  từ máy chụp lên PACS, hoặc ca chụp chưa được gắn Study UID.
                </p>
              ) : (
                <p>
                  Không đọc được danh sách series. Bấm “Làm mới” để thử lại; nếu vẫn lỗi,
                  báo quản trị hệ thống kiểm tra kết nối PACS.
                </p>
              )}
              {ORTHANC_LINKABLE && <p>Orthanc Web: {ORTHANC_BASE}</p>}
              <p>
                <strong>Study UID:</strong> {studyInstanceUID}
              </p>
              <Button
                type="link"
                icon={<SettingOutlined />}
                onClick={() => navigate('/v2/radiology')}
                style={{ padding: 0 }}
              >
                Về danh sách ca chụp
              </Button>
            </div>
          }
          type="warning"
          icon={<ExclamationCircleOutlined />}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Study Info */}
      <Card title="Thông tin Study" size="small" style={{ marginBottom: 16 }}>
        <Descriptions column={4} size="small">
          <Descriptions.Item label="Study UID">
            <Text copyable style={{ fontSize: 12 }}>{studyInstanceUID}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Bệnh nhân">
            {studyInfo?.patientName || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Mã BN">
            {studyInfo?.patientId || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày chụp">
            {studyInfo?.studyDate || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Mô tả">
            {studyInfo?.studyDescription || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Modality">
            {studyInfo?.modality && <Tag color="blue">{studyInfo.modality}</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="Số Series">
            {studyInfo?.seriesCount || 0}
          </Descriptions.Item>
          <Descriptions.Item label="Số ảnh">
            {studyInfo?.instanceCount || 0}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Phase 2: Native MPR/3D viewport (4-quadrant axial/sagittal/coronal + VR) */}
      {useNativeMpr && pacsAvailable && cornerstoneImageIds.length > 0 && (
        <Card
          title={<Space><AppstoreOutlined /> MPR / 3D Native Viewer (Cornerstone3D)</Space>}
          extra={<Button size="small" onClick={() => setUseNativeMpr(false)}>Đóng</Button>}
          style={{ marginBottom: 16 }}
          styles={{ body: { padding: 8 } }}
        >
          <MprViewer imageIds={cornerstoneImageIds} height="70vh" />
        </Card>
      )}

      {/* Phase 3: Native Mammography 2x2 hanging-protocol viewer */}
      {useMammo && pacsAvailable && mammoImages.length > 0 && (
        <Card
          title={<Space><AppstoreOutlined /> Mammography 2x2 (CC + MLO) — Native Cornerstone3D</Space>}
          extra={<Button size="small" onClick={() => setUseMammo(false)}>Đóng</Button>}
          style={{ marginBottom: 16 }}
          styles={{ body: { padding: 8 } }}
          data-testid="dicom-mammo-card"
        >
          <MammoViewer images={mammoImages} height="78vh" />
        </Card>
      )}

      {/* NangCap24 gap #9: MIP/MinIP intensity-projection viewer (Cornerstone3D volume) */}
      {useMip && pacsAvailable && cornerstoneImageIds.length > 0 && (
        <Card
          title={<Space><AppstoreOutlined /> MIP / MinIP — Maximum/Minimum Intensity Projection (Cornerstone3D)</Space>}
          extra={<Button size="small" onClick={() => setUseMip(false)}>Đóng</Button>}
          style={{ marginBottom: 16 }}
          styles={{ body: { padding: 8 } }}
          data-testid="dicom-mip-card"
        >
          <MipMinIpViewer
            imageIds={cornerstoneImageIds}
            height="78vh"
            studyInfo={{
              patient: studyInfo?.patientName,
              pid: studyInfo?.patientId,
              studyDate: studyInfo?.studyDate,
              modality: studyInfo?.modality,
              description: studyInfo?.studyDescription,
              seriesCount: studyInfo?.seriesCount,
            }}
          />
        </Card>
      )}

      {/* A1: Embedded OHIF iframe — MPR 4-quadrant, 3D volume, MIP, Mamography, Compare studies */}
      {embedOhif && pacsAvailable && (
        <Card
          title={
            <Space>
              <AppstoreOutlined />
              MPR / 3D / MIP / Mamography Viewer (OHIF)
            </Space>
          }
          extra={
            <Space>
              <Button size="small" icon={<ExpandOutlined />} onClick={handleOpenOHIF}>
                Mở tab mới
              </Button>
              <Button size="small" onClick={() => setEmbedOhif(false)}>
                Đóng
              </Button>
            </Space>
          }
          style={{ marginBottom: 16 }}
          styles={{ body: { padding: 0, height: '75vh' } }}
        >
          <iframe
            title="OHIF MPR 3D Viewer"
            src={ohifEmbedUrl}
            style={{ width: '100%', height: '100%', border: 0 }}
            allow="fullscreen"
            data-testid="dicom-ohif-iframe"
          />
        </Card>
      )}

      {/* Main Content */}
      <Row gutter={16}>
        {/* Series List */}
        <Col xs={24} md={4}>
          <Card
            title={<><FolderOutlined /> Series ({series.length})</>}
            size="small"
            style={{ height: 'calc(100vh - 350px)', overflowY: 'auto' }}
          >
            {series.length > 0 ? (
              <div>
                {series.map((s) => (
                  <div
                    key={s.seriesInstanceUID}
                    onClick={() => handleSeriesSelect(s)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: selectedSeries?.seriesInstanceUID === s.seriesInstanceUID ? '#e6f7ff' : 'transparent',
                      padding: '8px',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      borderBottom: '1px solid #f0f0f0',
                    }}
                  >
                    <PictureOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                    <div>
                      <div>
                        <Space>
                          <Tag>{s.modality}</Tag>
                          <Text style={{ fontSize: 12 }}>{s.seriesDescription || 'Series'}</Text>
                        </Space>
                      </div>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {s.instanceCount || s.numberOfImages || 0} ảnh
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                description="Không có series"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>

        {/* Image Viewer - Large Preview */}
        <Col xs={24} md={14}>
          <Card
            title={
              <Space>
                <PictureOutlined />
                Ảnh DICOM
                {selectedSeries && (
                  <Tag color="blue">{selectedSeries.seriesDescription || selectedSeries.modality}</Tag>
                )}
              </Space>
            }
            size="small"
            style={{ height: 'calc(100vh - 350px)', overflowY: 'auto' }}
            extra={
              pacsAvailable && selectedSeries && (
                <Button
                  type="primary"
                  size="small"
                  icon={<ExpandOutlined />}
                  onClick={handleOpenOHIF}
                  disabled={!ORTHANC_LINKABLE}
                  title={ORTHANC_LINKABLE ? undefined : ORTHANC_UNCONFIGURED_HINT}
                >
                  Xem toàn màn hình
                </Button>
              )
            }
          >
            {pacsAvailable ? (
              selectedImageUrl ? (
                <div>
                  {/* W/L Preset bar + viewer-mode toggle */}
                  <Space wrap style={{ marginBottom: 8 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>W/L Preset:</Typography.Text>
                    {viewerConfig.wlPresets.map(p => (
                      <Button
                        key={p.key}
                        size="small"
                        type={activeWlPreset === p.key ? 'primary' : 'default'}
                        onClick={() => { setActiveWlPreset(p.key); csRef.current?.applyWlPreset(p); setLiveWL({ ww: p.width, wl: p.center }); }}
                      >
                        {p.key}: {p.name}
                      </Button>
                    ))}
                    <Button size="small" onClick={() => setShowOverlay(o => !o)}>
                      {showOverlay ? 'Ẩn' : 'Hiện'} overlay
                    </Button>
                    <Button size="small" onClick={reloadConfig} icon={<ReloadOutlined />}>
                      Reload config
                    </Button>
                    <Button
                      size="small"
                      type={useCs ? 'primary' : 'default'}
                      onClick={() => setUseCs((v) => !v)}
                      data-testid="dicom-cs-toggle"
                    >
                      {useCs ? 'Native DICOM' : 'PNG preview'}
                    </Button>
                    {aiOverlayLabels.length > 0 && (
                      <>
                        <Button
                          size="small"
                          type={showAiOverlay ? 'primary' : 'default'}
                          icon={<RobotOutlined />}
                          onClick={() => setShowAiOverlay((v) => !v)}
                          data-testid="ai-overlay-toggle"
                        >
                          AI ({aiOverlayLabels.length})
                        </Button>
                        {showAiOverlay && (
                          <>
                            <Button
                              size="small"
                              type={showAiHeatmap ? 'primary' : 'default'}
                              onClick={() => setShowAiHeatmap((v) => !v)}
                            >
                              Heatmap
                            </Button>
                            <Button
                              size="small"
                              type={showAiBbox ? 'primary' : 'default'}
                              onClick={() => setShowAiBbox((v) => !v)}
                            >
                              Bounding box
                            </Button>
                            <Button
                              size="small"
                              danger
                              onClick={() => { setAiOverlayLabels([]); setLastAiResultId(null); }}
                            >
                              Xóa overlay
                            </Button>
                          </>
                        )}
                        {lastAiResultId && (
                          <>
                            <Button
                              size="small"
                              loading={aiExporting === 'pdf'}
                              data-testid="ai-export-html"
                              onClick={() => {
                                setAiExporting('pdf');
                                try {
                                  openAiReportHtml(lastAiResultId);
                                  message.info('Báo cáo AI mở ở tab mới — Ctrl+P để in PDF');
                                } catch (e) {
                                  message.error(e instanceof Error ? e.message : 'Xuất báo cáo thất bại');
                                } finally {
                                  setTimeout(() => setAiExporting(null), 800);
                                }
                              }}
                            >
                              Xem HTML
                            </Button>
                            <Button
                              size="small"
                              type="primary"
                              icon={<DownloadOutlined />}
                              loading={aiExporting === 'signed-pdf'}
                              data-testid="ai-export-signed-pdf"
                              onClick={async () => {
                                setAiExporting('signed-pdf');
                                try {
                                  await downloadAiSignedPdf(lastAiResultId);
                                  message.success('Tải PDF đã ký số thành công');
                                } catch (e) {
                                  message.error(e instanceof Error ? e.message : 'Tải PDF thất bại');
                                } finally {
                                  setAiExporting(null);
                                }
                              }}
                            >
                              Tải PDF ký số
                            </Button>
                            <Button
                              size="small"
                              loading={aiExporting === 'dicom'}
                              data-testid="ai-export-dicom"
                              onClick={async () => {
                                setAiExporting('dicom');
                                try {
                                  const r = await uploadAiDicomSr(lastAiResultId);
                                  message.success(`Đã lưu DICOM SR vào PACS (instance ${r.instanceId.slice(0, 8)}…)`);
                                } catch (e) {
                                  const msg = e instanceof Error ? e.message : 'Upload PACS thất bại';
                                  message.error(msg);
                                } finally {
                                  setAiExporting(null);
                                }
                              }}
                            >
                              Lưu DICOM SR
                            </Button>
                            <Button
                              size="small"
                              loading={aiExporting === 'merge'}
                              data-testid="ai-merge-report"
                              onClick={async () => {
                                setAiExporting('merge');
                                try {
                                  const r = await mergeAiToReport(lastAiResultId);
                                  if (r.merged) {
                                    message.success('Đã merge AI findings vào báo cáo CĐHA');
                                  } else {
                                    message.warning(r.message || 'Không tìm thấy báo cáo CĐHA tương ứng');
                                  }
                                } catch (e) {
                                  message.error(e instanceof Error ? e.message : 'Merge thất bại');
                                } finally {
                                  setAiExporting(null);
                                }
                              }}
                            >
                              Merge vào báo cáo
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </Space>
                  {useCs && cornerstoneImageIds.length > 0 ? (
                    <>
                    <div style={{ position: 'relative' }}>
                      <CornerstoneViewer
                        ref={csRef}
                        imageIds={cornerstoneImageIds}
                        initialIndex={Math.max(0, images.findIndex((i) => resolveApiUrl(i.imageUrl || '') === selectedImageUrl))}
                        height="calc(100vh - 460px)"
                        onToggleKeyImage={handleToggleKeyImage}
                        onIndexChange={setViewerCurrentIdx}
                        isKeyImage={
                          !!images[viewerCurrentIdx]?.sopInstanceUID &&
                          keyImages.some((k) => k.sopInstanceUID === images[viewerCurrentIdx]?.sopInstanceUID)
                        }
                        studyInstanceUID={studyInstanceUID}
                        sopByIndex={(idx) => images[idx]?.sopInstanceUID ?? ''}
                        overlay={(size, imageRect) =>
                          showAiOverlay && aiOverlayLabels.length > 0 ? (
                            <AiOverlayLayer
                              labels={aiOverlayLabels}
                              width={size.width}
                              height={size.height}
                              imageRect={imageRect}
                              showHeatmap={showAiHeatmap}
                              showBbox={showAiBbox}
                            />
                          ) : null
                        }
                      />
                      {/* F2.12: Overlay DICOM tags 6 vung theo config */}
                      {showOverlay && studyInfo && (
                        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                          {(['top-left', 'top-right', 'center-left', 'center-right', 'bottom-left', 'bottom-right'] as const).map(pos => {
                            const fields = viewerConfig.overlayFields
                              .filter(f => f.position === pos)
                              .sort((a, b) => a.order - b.order);
                            if (fields.length === 0) return null;
                            const isRight = pos.includes('right');
                            const isCenter = pos.includes('center');
                            const style: React.CSSProperties = {
                              position: 'absolute',
                              color: '#fff',
                              fontFamily: 'monospace',
                              fontSize: 11,
                              textShadow: '1px 1px 2px #000',
                              padding: 8,
                              [isRight ? 'right' : 'left']: 8,
                              textAlign: isRight ? 'right' : 'left',
                              ...(isCenter
                                ? { top: '50%', transform: 'translateY(-50%)' }
                                : { [pos.includes('top') ? 'top' : 'bottom']: 8 }),
                            };
                            // Build tagMap: static DICOM metadata + live WW/WL from viewport
                            const tagMap: Record<string, string | undefined> = {
                              PatientName: studyInfo.patientName,
                              PatientID: studyInfo.patientId,
                              PatientBirthDate: undefined, // not in StudyInfo — placeholder
                              StudyDate: studyInfo.studyDate,
                              StudyDescription: studyInfo.studyDescription,
                              Modality: studyInfo.modality,
                              SeriesDescription: selectedSeries?.seriesDescription,
                              InstitutionName: undefined, // not in StudyInfo — placeholder
                              // Live from viewport (updated via preset or manual W/L drag)
                              WindowCenter: liveWL ? `WL: ${liveWL.wl}` : undefined,
                              WindowWidth: liveWL ? `WW: ${liveWL.ww}` : undefined,
                              // HU probe: only available when Probe tool is active; show placeholder label
                              HU: undefined,
                            };
                            return (
                              <div key={pos} style={style}>
                                {fields.map(f => {
                                  const val = tagMap[f.tag];
                                  return val ? <div key={f.tag}>{val}</div> : null;
                                })}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {/* NangCap24 gap #10: Cine playback bar — seeks frames in the stack viewport */}
                    <CineControls viewerRef={csRef as unknown as React.RefObject<CineViewportHandle | null>} />
                    </>
                  ) : (
                  <div style={{ textAlign: 'center', background: '#000', padding: 8, borderRadius: 4, position: 'relative' }}>
                    <AuthenticatedImage
                      src={selectedImageUrl}
                      alt="DICOM"
                      style={{
                        maxWidth: '100%',
                        maxHeight: 'calc(100vh - 500px)',
                        objectFit: 'contain',
                      }}
                    />
                    {/* F2.12: Overlay DICOM tags 6 vung (PNG preview mode) */}
                    {showOverlay && studyInfo && (
                      <>
                        {(['top-left', 'top-right', 'center-left', 'center-right', 'bottom-left', 'bottom-right'] as const).map(pos => {
                          const fields = viewerConfig.overlayFields
                            .filter(f => f.position === pos)
                            .sort((a, b) => a.order - b.order);
                          if (fields.length === 0) return null;
                          const isRight = pos.includes('right');
                          const isCenter = pos.includes('center');
                          const style: React.CSSProperties = {
                            position: 'absolute',
                            color: '#fff',
                            fontFamily: 'monospace',
                            fontSize: 11,
                            textShadow: '1px 1px 2px #000',
                            padding: 8,
                            [isRight ? 'right' : 'left']: 8,
                            textAlign: isRight ? 'right' : 'left',
                            ...(isCenter
                              ? { top: '50%', transform: 'translateY(-50%)' }
                              : { [pos.includes('top') ? 'top' : 'bottom']: 8 }),
                          };
                          const tagMap: Record<string, string | undefined> = {
                            PatientName: studyInfo.patientName,
                            PatientID: studyInfo.patientId,
                            PatientBirthDate: undefined,
                            StudyDate: studyInfo.studyDate,
                            StudyDescription: studyInfo.studyDescription,
                            Modality: studyInfo.modality,
                            SeriesDescription: selectedSeries?.seriesDescription,
                            InstitutionName: undefined,
                            WindowCenter: undefined,
                            WindowWidth: undefined,
                            HU: undefined,
                          };
                          return (
                            <div key={pos} style={style}>
                              {fields.map(f => {
                                const val = tagMap[f.tag];
                                return val ? <div key={f.tag}>{val}</div> : null;
                              })}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                  )}
                </div>
              ) : (
                <Empty description="Chọn ảnh để xem" />
              )
            ) : (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <FileImageOutlined style={{ fontSize: 64, color: '#bfbfbf' }} />
                <Title level={5} type="secondary" style={{ marginTop: 16 }}>
                  {pacsState === 'empty' ? 'Chưa có ảnh DICOM'
                    : pacsState === 'missing-uid' ? 'Chưa chọn ca chụp'
                    : pacsState === 'loading' ? 'Đang tải ảnh…'
                    : 'Không lấy được ảnh từ máy chủ'}
                </Title>
                <Text type="secondary">
                  {pacsState === 'empty' ? 'Ca chụp này chưa có ảnh nào được đẩy lên PACS'
                    : pacsState === 'missing-uid' ? 'Chọn một ca chụp ở danh sách Chẩn đoán hình ảnh để xem ảnh'
                    : pacsState === 'loading' ? 'Vui lòng đợi trong giây lát'
                    : 'Bấm “Làm mới” để thử lại; nếu vẫn lỗi, báo quản trị hệ thống'}
                </Text>
              </div>
            )}
          </Card>
        </Col>

        {/* Image Thumbnails */}
        <Col xs={24} md={6}>
          <Card
            title={<><PictureOutlined /> Thumbnails ({images.length})</>}
            size="small"
            style={{ height: 'calc(100vh - 350px)', overflowY: 'auto' }}
          >
            {images.length > 0 ? (
              <Row gutter={[4, 4]}>
                {images.map((img, index) => (
                  <Col key={img.sopInstanceUID || index} xs={12}>
                    <Card
                      hoverable
                      size="small"
                      style={{
                        border: selectedImageUrl === resolveApiUrl(img.imageUrl) ? '2px solid #1890ff' : '1px solid #d9d9d9',
                      }}
                      cover={
                        <div
                          style={{
                            height: 80,
                            background: '#000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                          }}
                        >
                          {img.thumbnailUrl ? (
                            <AuthenticatedImage
                              src={resolveApiUrl(img.thumbnailUrl)}
                              alt={`Frame ${img.instanceNumber || index + 1}`}
                              style={{ maxWidth: '100%', maxHeight: 80, objectFit: 'contain' }}
                            />
                          ) : (
                            <PictureOutlined style={{ fontSize: 24, color: '#fff' }} />
                          )}
                        </div>
                      }
                      onClick={() => { setSelectedImageUrl(resolveApiUrl(img.imageUrl || img.thumbnailUrl || '')); setAiOverlayLabels([]); }}
                    >
                      <Card.Meta
                        description={
                          <Text style={{ fontSize: 10 }} type="secondary">
                            Frame {img.instanceNumber || index + 1}
                          </Text>
                        }
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <Empty description="Chọn series để xem" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
      </Row>

      {/* QW3.3: Compare 2 studies modal */}
      <Modal
        title={<Space><DiffOutlined /> So sánh 2 ca chụp</Space>}
        open={compareOpen}
        onCancel={() => setCompareOpen(false)}
        onOk={handleCompare}
        okText="Mở OHIF so sánh"
        cancelText="Hủy"
        width={700}
        data-testid="dicom-compare-modal"
      >
        <Alert
          type="info"
          showIcon
          title="Chọn ca chụp cũ của cùng BN (hoặc dán Study UID) để mở trong OHIF side-by-side."
          style={{ marginBottom: 12 }}
        />
        <div style={{ marginBottom: 8 }}>
          <strong>Ca chụp hiện tại:</strong>
          <div><Text code>{studyInstanceUID}</Text></div>
        </div>
        {patientStudies.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <strong>Ca chụp trước của BN:</strong>
            <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #eee', borderRadius: 4, padding: 8, marginTop: 4 }}>
              {patientStudies.map((s) => (
                <div
                  key={s.studyInstanceUID}
                  onClick={() => { setCompareUid(s.studyInstanceUID); vfCompare.clear('compareUid'); }}
                  style={{
                    padding: 8,
                    cursor: 'pointer',
                    backgroundColor: compareUid === s.studyInstanceUID ? '#e6f4ff' : 'transparent',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <div>
                    {s.modality && <Tag color="blue">{s.modality}</Tag>}
                    {s.serviceName}
                    {s.studyDate && <span style={{ marginLeft: 8, color: '#999' }}>{s.studyDate}</span>}
                  </div>
                  <Text code style={{ fontSize: 11 }}>{s.studyInstanceUID}</Text>
                </div>
              ))}
            </div>
          </div>
        )}
        <Field label="Hoặc dán Study UID:" required error={vfCompare.errors.compareUid}>
          <input
            type="text"
            value={compareUid}
            onChange={(e) => { setCompareUid(e.target.value); vfCompare.clear('compareUid'); }}
            placeholder="1.2.840.113619.2.55..."
            style={{ width: '100%', padding: 6, marginTop: 4, border: '1px solid #d9d9d9', borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }}
          />
        </Field>
      </Modal>

      {/* AI Labeling */}
      {selectedImageUrl && (
        <AiLabelingModal
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          studyInstanceUID={studyInstanceUID}
          previewUrl={selectedImageUrl}
          patientId={studyInfo?.patientId}
          modality={selectedSeries?.modality || studyInfo?.modality}
          onAccepted={(labels, aiResultId) => {
            setAiOverlayLabels(labels);
            setShowAiOverlay(true);
            if (aiResultId) setLastAiResultId(aiResultId);
            message.success(`Đã hiển thị ${labels.length} dấu hiệu AI lên ảnh`);
          }}
        />
      )}

      {/* Key Image Gallery — quản lý hàng loạt */}
      <Modal
        open={keyImageGalleryOpen}
        title={`Key Images — ${studyInstanceUID || '—'} (${keyImages.length} ảnh)`}
        onCancel={() => setKeyImageGalleryOpen(false)}
        footer={[
          <Button key="close" onClick={() => setKeyImageGalleryOpen(false)}>Đóng</Button>,
        ]}
        width={700}
        destroyOnHidden
      >
        {keyImages.length === 0 ? (
          <Empty description="Chưa có key image nào được đánh dấu" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {keyImages.map((ki) => (
              <div
                key={ki.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 12px', border: '1px solid #f0f0f0', borderRadius: 6,
                }}
              >
                <PictureOutlined style={{ fontSize: 20, color: '#1677ff' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{ki.sopInstanceUID}</div>
                  {ki.description && <div style={{ fontSize: 11, color: '#888' }}>{ki.description}</div>}
                  {ki.markedTime && (
                    <div style={{ fontSize: 11, color: '#aaa' }}>
                      Đánh dấu: {new Date(ki.markedTime).toLocaleString('vi-VN')}
                      {ki.markedBy && ` · ${ki.markedBy}`}
                    </div>
                  )}
                </div>
                <Button
                  size="small"
                  danger
                  loading={keyImageRemoving === ki.id}
                  disabled={keyImageRemoving !== null && keyImageRemoving !== ki.id}
                  onClick={() => {
                    if (keyImageRemoving) return; // chặn bấm lần 2 khi đang xử lý
                    Modal.confirm({
                      title: 'Bỏ đánh dấu Key Image',
                      content: `Bỏ đánh dấu ảnh ${ki.sopInstanceUID}? Ảnh vẫn còn trên PACS, chỉ mất nhãn Key Image.`,
                      okText: 'Xóa',
                      okType: 'danger',
                      cancelText: 'Hủy',
                      onOk: async () => {
                        setKeyImageRemoving(ki.id);
                        try {
                          await risApi.markKeyImage({
                            studyInstanceUID,
                            sopInstanceUID: ki.sopInstanceUID,
                            unmark: true,
                          });
                          // Reload key images
                          const resp = await risApi.getKeyImages(studyInstanceUID);
                          setKeyImages(resp.data ?? []);
                          message.success('Đã xóa key image');
                        } catch {
                          message.error('Xóa thất bại');
                        } finally {
                          setKeyImageRemoving(null);
                        }
                      },
                    });
                  }}
                >
                  Xóa
                </Button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DicomViewer;

