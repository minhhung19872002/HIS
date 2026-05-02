/**
 * Video Consultation v2 — passthrough wrapper.
 *
 * v1 page (~400 lines) is a Jitsi-based teleconsultation UI with full-
 * screen iframe video, room creation/join, and session metadata. Same
 * reasoning as DicomViewer: full-bleed video surface doesn't fit the ab-*
 * KPI+table+drawer pattern. We render v1 inside the terminal shell so
 * the chrome stays consistent and the data layer is identical.
 */
import React from 'react';
import V1 from '../pages/VideoConsultation';

const VideoConsultationV2: React.FC = () => <V1 />;

export default VideoConsultationV2;
