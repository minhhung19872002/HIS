/**
 * Cấu hình cá nhân hóa PACS Viewer — Sprint 4 Item 1.3.
 * Lưu localStorage per user:
 * - W/L presets F1-F10 (window/level cho các bộ phận)
 * - Keyboard shortcuts custom
 * - Layout defaults (1x1, 2x1, 2x2)
 * - Overlay DICOM tags drag-drop
 * - Tool visibility (hide/show)
 */

import { useEffect, useState } from 'react';
import { Modal, Tabs, Table, Form, Input, InputNumber, Select, Button, Space, Tag, message, Typography, Checkbox } from 'antd';
import { DragOutlined } from '@ant-design/icons';

const { Text } = Typography;

// Default W/L presets theo AAPM + BYT
const DEFAULT_WL_PRESETS: WlPreset[] = [
  { key: 'F1', name: 'Phổi', center: -600, width: 1500 },
  { key: 'F2', name: 'Xương', center: 400, width: 1800 },
  { key: 'F3', name: 'Não', center: 40, width: 80 },
  { key: 'F4', name: 'Gan/Bụng', center: 50, width: 400 },
  { key: 'F5', name: 'Trung thất', center: 50, width: 350 },
  { key: 'F6', name: 'Tim', center: 200, width: 600 },
  { key: 'F7', name: 'Mô mềm', center: 40, width: 350 },
  { key: 'F8', name: 'Angio', center: 300, width: 800 },
  { key: 'F9', name: 'Tùy chỉnh 1', center: 40, width: 400 },
  { key: 'F10', name: 'Tùy chỉnh 2', center: 40, width: 400 },
];

const DEFAULT_SHORTCUTS: ShortcutMapping[] = [
  { action: 'zoom', key: 'z', description: 'Zoom' },
  { action: 'pan', key: 'p', description: 'Di chuyển ảnh' },
  { action: 'measure', key: 'm', description: 'Đo khoảng cách' },
  { action: 'angle', key: 'a', description: 'Đo góc' },
  { action: 'scroll', key: 's', description: 'Cuộn ảnh' },
  { action: 'wl', key: 'w', description: 'Điều chỉnh Window/Level' },
  { action: 'reset', key: 'r', description: 'Reset view' },
  { action: 'invert', key: 'i', description: 'Lật sáng tối' },
  { action: 'rotate-left', key: 'Q', description: 'Xoay trái 90°' },
  { action: 'rotate-right', key: 'E', description: 'Xoay phải 90°' },
  { action: 'flip-h', key: 'h', description: 'Lật ngang' },
  { action: 'flip-v', key: 'v', description: 'Lật dọc' },
  { action: 'annotate', key: 'n', description: 'Ghi chú' },
  { action: 'arrow', key: 'j', description: 'Mũi tên' },
  { action: 'mpr', key: 'F11', description: 'MPR (Axial/Coronal/Sagittal)' },
  { action: '3d', key: 'F12', description: 'Dựng 3D' },
];

const DICOM_OVERLAY_TAGS = [
  'PatientName', 'PatientID', 'PatientSex', 'PatientBirthDate', 'PatientAge',
  'StudyDate', 'StudyTime', 'StudyDescription', 'StudyInstanceUID',
  'SeriesNumber', 'SeriesDescription', 'SeriesInstanceUID',
  'InstanceNumber', 'ImagePositionPatient',
  'Modality', 'Manufacturer', 'ManufacturerModelName',
  'SliceThickness', 'KVP', 'ExposureTime', 'XRayTubeCurrent',
  'WindowCenter', 'WindowWidth',
  'InstitutionName', 'ReferringPhysicianName', 'OperatorsName',
];

const OVERLAY_POSITIONS = [
  { value: 'top-left', label: 'Trên - Trái' },
  { value: 'top-right', label: 'Trên - Phải' },
  { value: 'bottom-left', label: 'Dưới - Trái' },
  { value: 'bottom-right', label: 'Dưới - Phải' },
];

interface WlPreset {
  key: string;
  name: string;
  center: number;
  width: number;
}

interface ShortcutMapping {
  action: string;
  key: string;
  description: string;
}

interface OverlayField {
  tag: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  order: number;
}

interface ViewerConfig {
  wlPresets: WlPreset[];
  shortcuts: ShortcutMapping[];
  overlayFields: OverlayField[];
  defaultLayout: '1x1' | '2x1' | '2x2' | '3x3';
  showToolbarTop: boolean;
  visibleTools: string[];
}

const STORAGE_KEY = 'dicom_viewer_config';

export function loadViewerConfig(): ViewerConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...getDefaultConfig(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return getDefaultConfig();
}

export function saveViewerConfig(config: ViewerConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function getDefaultConfig(): ViewerConfig {
  return {
    wlPresets: DEFAULT_WL_PRESETS,
    shortcuts: DEFAULT_SHORTCUTS,
    overlayFields: [
      { tag: 'PatientName', position: 'top-left', order: 0 },
      { tag: 'PatientID', position: 'top-left', order: 1 },
      { tag: 'PatientAge', position: 'top-left', order: 2 },
      { tag: 'StudyDate', position: 'top-right', order: 0 },
      { tag: 'Modality', position: 'top-right', order: 1 },
      { tag: 'SeriesDescription', position: 'bottom-left', order: 0 },
      { tag: 'InstitutionName', position: 'bottom-right', order: 0 },
      { tag: 'WindowCenter', position: 'bottom-right', order: 1 },
    ],
    defaultLayout: '1x1',
    showToolbarTop: false,
    visibleTools: ['zoom', 'pan', 'measure', 'wl', 'reset', 'scroll', 'mpr', 'annotate'],
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function DicomViewerConfig({ open, onClose }: Props) {
  const [config, setConfig] = useState<ViewerConfig>(loadViewerConfig);

  useEffect(() => {
    if (open) setConfig(loadViewerConfig());
  }, [open]);

  const handleSave = () => {
    saveViewerConfig(config);
    message.success('Đã lưu cấu hình. Tải lại viewer để áp dụng.');
    onClose();
  };

  const handleReset = () => {
    Modal.confirm({
      title: 'Khôi phục cấu hình mặc định?',
      onOk: () => {
        const def = getDefaultConfig();
        setConfig(def);
        saveViewerConfig(def);
        message.success('Đã reset về mặc định');
      },
    });
  };

  return (
    <Modal
      title="Cấu hình PACS Viewer"
      open={open}
      onCancel={onClose}
      width={960}
      destroyOnHidden
      footer={[
        <Button key="reset" danger onClick={handleReset}>Reset mặc định</Button>,
        <Button key="cancel" onClick={onClose}>Hủy</Button>,
        <Button key="save" type="primary" onClick={handleSave}>Lưu</Button>,
      ]}
    >
      <Tabs
        items={[
          {
            key: 'wl',
            label: 'W/L Presets (F1-F10)',
            children: <WlPresetsTab config={config} setConfig={setConfig} />,
          },
          {
            key: 'shortcuts',
            label: 'Phím tắt',
            children: <ShortcutsTab config={config} setConfig={setConfig} />,
          },
          {
            key: 'overlay',
            label: 'Thông tin overlay',
            children: <OverlayTab config={config} setConfig={setConfig} />,
          },
          {
            key: 'layout',
            label: 'Layout',
            children: <LayoutTab config={config} setConfig={setConfig} />,
          },
        ]}
      />
    </Modal>
  );
}

function WlPresetsTab({ config, setConfig }: { config: ViewerConfig; setConfig: (c: ViewerConfig) => void }) {
  return (
    <Table<WlPreset>
      dataSource={config.wlPresets}
      rowKey="key"
      pagination={false}
      columns={[
        { title: 'Phím', dataIndex: 'key', width: 80 },
        {
          title: 'Tên preset',
          dataIndex: 'name',
          render: (v: string, _, idx) => (
            <Input
              value={v}
              onChange={(e) => {
                const arr = [...config.wlPresets];
                arr[idx] = { ...arr[idx], name: e.target.value };
                setConfig({ ...config, wlPresets: arr });
              }}
            />
          ),
        },
        {
          title: 'Window Center (HU)',
          dataIndex: 'center',
          width: 160,
          render: (v: number, _, idx) => (
            <InputNumber
              value={v}
              onChange={(val) => {
                const arr = [...config.wlPresets];
                arr[idx] = { ...arr[idx], center: val ?? 0 };
                setConfig({ ...config, wlPresets: arr });
              }}
              style={{ width: '100%' }}
            />
          ),
        },
        {
          title: 'Window Width',
          dataIndex: 'width',
          width: 140,
          render: (v: number, _, idx) => (
            <InputNumber
              value={v}
              onChange={(val) => {
                const arr = [...config.wlPresets];
                arr[idx] = { ...arr[idx], width: val ?? 0 };
                setConfig({ ...config, wlPresets: arr });
              }}
              style={{ width: '100%' }}
            />
          ),
        },
      ]}
    />
  );
}

function ShortcutsTab({ config, setConfig }: { config: ViewerConfig; setConfig: (c: ViewerConfig) => void }) {
  return (
    <>
      <Text type="secondary" style={{ marginBottom: 12, display: 'block' }}>
        Click vào phím để nhập key mới. F1-F10 dành riêng cho W/L presets.
      </Text>
      <Table<ShortcutMapping>
        dataSource={config.shortcuts}
        rowKey="action"
        pagination={false}
        size="small"
        columns={[
          { title: 'Chức năng', dataIndex: 'description' },
          {
            title: 'Phím',
            dataIndex: 'key',
            width: 120,
            render: (v: string, _, idx) => (
              <Input
                value={v}
                maxLength={10}
                onChange={(e) => {
                  const arr = [...config.shortcuts];
                  arr[idx] = { ...arr[idx], key: e.target.value };
                  setConfig({ ...config, shortcuts: arr });
                }}
              />
            ),
          },
        ]}
      />
    </>
  );
}

function OverlayTab({ config, setConfig }: { config: ViewerConfig; setConfig: (c: ViewerConfig) => void }) {
  const positions = OVERLAY_POSITIONS.map(p => p.value as OverlayField['position']);
  return (
    <>
      <Text type="secondary" style={{ marginBottom: 12, display: 'block' }}>
        Chọn DICOM tags hiển thị ở mỗi góc màn hình viewer.
      </Text>
      <Select
        mode="multiple"
        placeholder="Thêm DICOM tag..."
        style={{ width: '100%', marginBottom: 12 }}
        value={config.overlayFields.map(f => f.tag)}
        onChange={(tags: string[]) => {
          const existing = new Map(config.overlayFields.map(f => [f.tag, f]));
          const fields: OverlayField[] = tags.map((t, i) => existing.get(t) ?? { tag: t, position: 'top-left', order: i });
          setConfig({ ...config, overlayFields: fields });
        }}
        options={DICOM_OVERLAY_TAGS.map(t => ({ value: t, label: t }))}
      />
      <Table<OverlayField>
        dataSource={config.overlayFields}
        rowKey="tag"
        pagination={false}
        size="small"
        columns={[
          { title: 'DICOM Tag', dataIndex: 'tag', render: (v: string) => <Tag color="blue">{v}</Tag> },
          {
            title: 'Vị trí',
            dataIndex: 'position',
            width: 180,
            render: (v: string, _, idx) => (
              <Select
                value={v}
                options={OVERLAY_POSITIONS}
                style={{ width: '100%' }}
                onChange={(val) => {
                  const arr = [...config.overlayFields];
                  arr[idx] = { ...arr[idx], position: val as OverlayField['position'] };
                  setConfig({ ...config, overlayFields: arr });
                }}
              />
            ),
          },
          {
            title: 'Thứ tự',
            dataIndex: 'order',
            width: 80,
            render: (v: number, _, idx) => (
              <InputNumber
                value={v}
                min={0}
                onChange={(val) => {
                  const arr = [...config.overlayFields];
                  arr[idx] = { ...arr[idx], order: val ?? 0 };
                  setConfig({ ...config, overlayFields: arr });
                }}
                style={{ width: '100%' }}
              />
            ),
          },
          {
            title: '',
            width: 60,
            render: (_, _r, idx) => (
              <Button
                size="small"
                danger
                icon={<DragOutlined />}
                onClick={() => {
                  const arr = [...config.overlayFields];
                  arr.splice(idx, 1);
                  setConfig({ ...config, overlayFields: arr });
                }}
              />
            ),
          },
        ]}
      />
      <div style={{ marginTop: 12, padding: 12, background: '#fafafa', borderRadius: 4 }}>
        <Text strong>Preview vị trí:</Text>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8, minHeight: 120, border: '1px dashed #ccc', padding: 8 }}>
          {positions.map(pos => (
            <div key={pos} style={{ textAlign: pos.includes('right') ? 'right' : 'left', verticalAlign: pos.includes('bottom') ? 'bottom' : 'top' }}>
              <Text type="secondary" style={{ fontSize: 10 }}>{pos}</Text>
              <br />
              {config.overlayFields.filter(f => f.position === pos).sort((a, b) => a.order - b.order).map(f => (
                <div key={f.tag} style={{ fontSize: 11, color: '#333' }}>{f.tag}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function LayoutTab({ config, setConfig }: { config: ViewerConfig; setConfig: (c: ViewerConfig) => void }) {
  return (
    <Form layout="vertical">
      <Form.Item label="Layout mặc định">
        <Select
          value={config.defaultLayout}
          onChange={(v) => setConfig({ ...config, defaultLayout: v })}
          options={[
            { value: '1x1', label: '1 × 1 (toàn màn hình)' },
            { value: '2x1', label: '2 × 1 (chia ngang)' },
            { value: '2x2', label: '2 × 2 (MPR 4-quadrant)' },
            { value: '3x3', label: '3 × 3 (compare)' },
          ]}
        />
      </Form.Item>
      <Form.Item>
        <Checkbox
          checked={config.showToolbarTop}
          onChange={(e) => setConfig({ ...config, showToolbarTop: e.target.checked })}
        >
          Toolbar ở trên (thay vì mặc định bên trái)
        </Checkbox>
      </Form.Item>
      <Form.Item label="Công cụ hiển thị">
        <Checkbox.Group
          value={config.visibleTools}
          onChange={(vals) => setConfig({ ...config, visibleTools: vals as string[] })}
          options={[
            { value: 'zoom', label: 'Zoom' },
            { value: 'pan', label: 'Pan' },
            { value: 'measure', label: 'Đo khoảng cách' },
            { value: 'angle', label: 'Đo góc' },
            { value: 'area', label: 'Đo diện tích' },
            { value: 'hu', label: 'Đo HU' },
            { value: 'wl', label: 'Window/Level' },
            { value: 'scroll', label: 'Cuộn ảnh' },
            { value: 'invert', label: 'Lật sáng tối' },
            { value: 'rotate', label: 'Xoay' },
            { value: 'flip', label: 'Lật' },
            { value: 'reset', label: 'Reset' },
            { value: 'mpr', label: 'MPR' },
            { value: '3d', label: '3D Volume' },
            { value: 'mip', label: 'MIP' },
            { value: 'annotate', label: 'Annotation' },
            { value: 'key-image', label: 'Key Image' },
            { value: 'capture', label: 'Capture' },
            { value: 'sync', label: 'Sync scroll' },
          ]}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}
        />
      </Form.Item>
    </Form>
  );
}
