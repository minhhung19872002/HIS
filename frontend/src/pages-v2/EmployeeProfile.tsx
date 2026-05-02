/**
 * Employee Profile v2 — passthrough wrapper.
 *
 * v1 page (~700 lines) is a personal profile form with avatar, contact,
 * employment history, qualifications, certifications, and password change.
 * It's user-facing for the logged-in employee only, has its own self-
 * contained layout, and isn't a list-style admin page that benefits from
 * ab-* primitives. We render v1 inside the terminal shell as-is.
 */
import React from 'react';
import V1 from '../pages/EmployeeProfile';

const EmployeeProfileV2: React.FC = () => <V1 />;

export default EmployeeProfileV2;
