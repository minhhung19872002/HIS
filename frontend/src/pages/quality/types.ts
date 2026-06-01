import type { Dayjs } from 'dayjs';
import type { CreateCorrectiveActionDto } from '../../api/quality';

export type IncidentFormValues = {
  incidentDate: Dayjs;
  departmentId: string;
  locationDescription?: string;
  incidentType: string;
  severity: number;
  patientId?: string;
  description: string;
  immediateActions?: string;
  isReportable?: boolean;
  notes?: string;
};

export type InvestigationFormValues = {
  investigationFindings?: string;
  rootCauseAnalysis?: string;
  rcaMethod?: string;
  contributingFactors?: string[];
  correctiveActions?: CreateCorrectiveActionDto[];
  preventiveMeasures?: string;
  lessonLearned?: string;
};

export type AuditFormValues = {
  auditType: string;
  title: string;
  scope?: string;
  objective?: string;
  criteria?: string;
  departmentId: string;
  scheduledDate: Dayjs;
  leadAuditorId?: string;
  notes?: string;
};
