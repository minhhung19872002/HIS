import { describe, expect, it } from 'vitest';
import { canPrescribeFromOpd, opdLinks, opdStatusKey } from './opdFlow';

describe('OPD flow', () => {
  it.each([
    [0, 'waiting'],
    [1, 'inProgress'],
    [2, 'waitingResult'],
    [3, 'waitingResult'],
    [4, 'completed'],
    [5, 'cancelled'],
    ['WaitingConclusion', 'waitingResult'],
    ['Completed', 'completed'],
    ['Cancelled', 'cancelled'],
  ] as const)('maps examination status %s', (status, expected) => {
    expect(opdStatusKey(status)).toBe(expected);
  });

  it('keeps the selected patient context in every destination', () => {
    const links = opdLinks({ patientId: 'patient-1', roomId: 'room-1', examinationId: 'exam-1' });
    expect(links.examination).toBe('/v2/opd/edit?examId=exam-1&roomId=room-1&start=1');
    expect(links.emr).toBe('/v2/emr/edit?patientId=patient-1');
    expect(links.prescription).toBe('/v2/prescription/edit?examId=exam-1');
  });

  it('opens patient context from waiting list but blocks missing/cancelled examinations', () => {
    expect(canPrescribeFromOpd({ status: 'Waiting', examinationId: 'exam-1' })).toBe(true);
    expect(canPrescribeFromOpd({ status: 'InProgress', examinationId: 'exam-1' })).toBe(true);
    expect(canPrescribeFromOpd({ status: 'Cancelled', examinationId: 'exam-1' })).toBe(false);
    expect(canPrescribeFromOpd({ status: 'InProgress' })).toBe(false);
  });
});
