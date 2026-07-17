/**
 * DICOM Viewer v2 — passthrough.
 *
 * The viewer is fundamentally a full-screen image surface (Cornerstone3D
 * StackViewport / MPR / 3D / Mammography) with its own toolbar, slice
 * scrubber, W/L presets, and tool palette. It doesn't fit the ab-*
 * KPI+table+drawer pattern used by every other v2 page, so we render the
 * v1 component as-is. The v2 route bypasses the terminal-shell background
 * + Suspense fallback wrapper so the canvas can occupy the full content
 * pane without a `var(--d-1)` strip behind it.
 *
 * If the design pack ever ships a viewer skin we'd port that here.
 */
import React from 'react';
import V1DicomViewer from '../pages/DicomViewer';

const DicomViewerV2: React.FC = () => <V1DicomViewer />;

export default DicomViewerV2;
