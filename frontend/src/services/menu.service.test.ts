import { describe, expect, it } from 'vitest';
import { ALL_ITEMS } from './menu.service';

describe('employee portal navigation', () => {
  it('routes staff to the staff-on-behalf patient portal', () => {
    const portal = ALL_ITEMS.find((item) => item.id === 'patient-portal-staff');

    expect(portal?.path).toBe('/v2/patient-portal-staff');
    expect(ALL_ITEMS.some((item) => item.path === '/v2/patient-portal')).toBe(false);
  });
});
