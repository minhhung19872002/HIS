/**
 * Catalogs Admin v2 — passthrough wrapper.
 *
 * v1 page (~400 lines) is a multi-tab admin form for hospital-wide master
 * data (departments, rooms, services, ICD codes, etc.). The forms have
 * deeply nested validation and Antd-specific patterns that don't map
 * cleanly to ab-* DataTable + DrawerShell. We import v1 directly so the
 * data layer stays identical and the page renders inside terminal shell.
 */
import React from 'react';
import V1 from '../pages/CatalogsAdmin';

const CatalogsAdminV2: React.FC = () => <V1 />;

export default CatalogsAdminV2;
