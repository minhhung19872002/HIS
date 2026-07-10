import React, { useEffect, useRef, useState } from 'react';
import { Button, Slider, InputNumber, Space, Tooltip } from 'antd';
import { CaretRightOutlined, PauseOutlined, StepBackwardOutlined, StepForwardOutlined } from '@ant-design/icons';

/**
 * DICOM Cine controls — play/pause through stack frames at configurable FPS.
 * Works with any Cornerstone3D StackViewport. Use the imperative API exposed
 * via the viewer ref to seek frames + monitor current index.
 *
 * NangCap24 Gap #7 — PACS Animation per HSMT II.2.3
 */

export interface CineViewportHandle {
  /** Get total frame count in current stack */
  getFrameCount: () => number;
  /** Get current image index */
  getCurrentIndex: () => number;
  /** Jump to a specific frame index */
  setIndex: (idx: number) => Promise<void> | void;
}

interface Props {
  viewerRef: React.RefObject<CineViewportHandle | null>;
  defaultFps?: number;
  minFps?: number;
  maxFps?: number;
  height?: number;
}

const CineControls: React.FC<Props> = ({ viewerRef, defaultFps = 10, minFps = 1, maxFps = 60 }) => {
  const [playing, setPlaying] = useState(false);
  const [fps, setFps] = useState(defaultFps);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [loop, setLoop] = useState(true);
  const timerRef = useRef<number | null>(null);

  // Polling refresh frame counter
  useEffect(() => {
    const tick = () => {
      try {
        const count = viewerRef.current?.getFrameCount() ?? 0;
        const idx = viewerRef.current?.getCurrentIndex() ?? 0;
        setTotalFrames(count);
        setCurrentIdx(idx);
      } catch {}
    };
    const id = window.setInterval(tick, 500);
    tick();
    return () => window.clearInterval(id);
  }, [viewerRef]);

  // Play loop
  useEffect(() => {
    if (!playing || totalFrames < 2) return;
    const intervalMs = Math.max(15, Math.floor(1000 / fps));
    const id = window.setInterval(() => {
      const cur = viewerRef.current?.getCurrentIndex() ?? 0;
      const cnt = viewerRef.current?.getFrameCount() ?? 0;
      if (cnt < 2) return;
      let next = cur + 1;
      if (next >= cnt) {
        if (loop) next = 0;
        else { setPlaying(false); return; }
      }
      viewerRef.current?.setIndex(next);
      setCurrentIdx(next);
    }, intervalMs);
    timerRef.current = id;
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [playing, fps, totalFrames, loop, viewerRef]);

  if (totalFrames < 2) return null;

  return (
    <div
      data-testid="cine-controls"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '6px 12px',
        background: 'rgba(15, 23, 42, 0.85)',
        color: '#e2e8f0',
        borderRadius: 6,
      }}
    >
      <Space>
        <Tooltip title="Lùi 1 khung">
          <Button
            size="small"
            ghost
            icon={<StepBackwardOutlined />}
            onClick={() => viewerRef.current?.setIndex(Math.max(0, currentIdx - 1))}
          />
        </Tooltip>

        <Tooltip title={playing ? 'Tạm dừng (Space)' : 'Phát (Space)'}>
          <Button
            size="small"
            type="primary"
            icon={playing ? <PauseOutlined /> : <CaretRightOutlined />}
            onClick={() => setPlaying(p => !p)}
            data-testid="cine-play-btn"
          >
            {playing ? 'Dừng' : 'Phát'}
          </Button>
        </Tooltip>

        <Tooltip title="Tiến 1 khung">
          <Button
            size="small"
            ghost
            icon={<StepForwardOutlined />}
            onClick={() => viewerRef.current?.setIndex(Math.min(totalFrames - 1, currentIdx + 1))}
          />
        </Tooltip>
      </Space>

      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono, monospace)', minWidth: 80 }}>
        {currentIdx + 1} / {totalFrames}
      </span>

      <div style={{ flex: 1, minWidth: 160 }}>
        <Slider
          min={0}
          max={Math.max(1, totalFrames - 1)}
          value={currentIdx}
          onChange={(v) => {
            setCurrentIdx(v);
            viewerRef.current?.setIndex(v);
          }}
          tooltip={{ formatter: (v) => `Khung ${(v ?? 0) + 1}/${totalFrames}` }}
        />
      </div>

      <Space size={4}>
        <span style={{ fontSize: 11 }}>FPS:</span>
        <InputNumber
          size="small"
          min={minFps}
          max={maxFps}
          value={fps}
          onChange={(v) => setFps(v ?? defaultFps)}
          style={{ width: 60 }}
        />
      </Space>

      <Tooltip title={loop ? 'Lặp lại' : 'Phát 1 lần'}>
        <Button
          size="small"
          ghost={!loop}
          type={loop ? 'primary' : 'default'}
          onClick={() => setLoop(l => !l)}
        >
          ↺
        </Button>
      </Tooltip>
    </div>
  );
};

export default CineControls;
