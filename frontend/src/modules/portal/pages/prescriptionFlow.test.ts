import { describe, expect, it } from 'vitest';
import { prescriptionEditorLink, prescriptionStatusKey } from './prescriptionFlow';

describe('prescription list flow', () => {
  it('opens the selected prescription with its examination context', () => {
    expect(prescriptionEditorLink({ id: 'rx-1', examinationId: 'exam-1', patientId: 'patient-1' }))
      .toBe('/v2/prescription/edit?prescriptionId=rx-1&examId=exam-1');
  });

  it('falls back to patient context for legacy prescriptions', () => {
    expect(prescriptionEditorLink({ id: 'rx-1', patientId: 'patient-1' }))
      .toBe('/v2/prescription/edit?prescriptionId=rx-1&patientId=patient-1');
  });

  it.each([[0, 'active'], [1, 'active'], [2, 'dispensed'], [3, 'returned'], [4, 'cancelled'], [6, 'dispensed']] as const)(
    'maps backend status %s to %s',
    (status, expected) => expect(prescriptionStatusKey(status)).toBe(expected),
  );
});
