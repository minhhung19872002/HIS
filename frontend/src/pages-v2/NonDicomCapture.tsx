/**
 * Non-DICOM Capture v2 — passthrough wrapper.
 *
 * v1 page (~470 lines) is a capture/upload UI for non-DICOM imaging
 * (photos, videos, scanned PDFs) with camera preview, file picker, and
 * upload-progress feedback. The page is media-centric — full-bleed
 * preview area + side panel for metadata. ab-* design pack assumes
 * list/table structure, which doesn't fit this page. We wrap v1.
 */
import React from 'react';
import V1 from '../pages/NonDicomCapture';

const NonDicomCaptureV2: React.FC = () => <V1 />;

export default NonDicomCaptureV2;
