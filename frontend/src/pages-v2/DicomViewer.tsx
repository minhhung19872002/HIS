/**
 * DICOM Viewer v2 — native home (pages-v2/dicom-viewer/).
 *
 * #413: gỡ import v1 cuối cùng khỏi pages-v2. DicomViewer được chuyển về
 * pages-v2/dicom-viewer/DicomViewer.tsx (verbatim, behavior-preserving).
 * Viewer là full-screen Cornerstone3D — không theo pattern ab-* KPI+table+drawer.
 */
export { default } from './dicom-viewer/DicomViewer';
