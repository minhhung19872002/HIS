/**
 * RIS Admin v2 — passthrough wrapper.
 *
 * RisAdmin v1 has 8 sub-modules (PermissionMatrix, Areas, Folders, IcdMapping,
 * Machines, Supplies, HospitalConfig, Stats) with deep nested state and ~570
 * lines of forms. Re-implementing each sub-tab with ab-* primitives would
 * triple the file. Since this is admin-only and uses the same terminal shell
 * for chrome, we wrap v1 directly. The data layer is identical.
 *
 * If individual sub-tabs become user-facing pain points, port them one at a
 * time to dedicated v2 modules.
 */
import React from 'react';
import V1RisAdmin from '../pages/RisAdmin';

const RisAdminV2: React.FC = () => <V1RisAdmin />;

export default RisAdminV2;
