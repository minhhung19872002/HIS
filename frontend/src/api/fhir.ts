/**
 * API Client cho HL7 FHIR R4 Server
 * Endpoints: /api/fhir/*
 */

import apiClient from './client';

// ==================== FHIR Types ====================

export interface FhirResource {
  resourceType: string;
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    profile?: string[];
  };
}

export interface FhirBundle extends FhirResource {
  resourceType: 'Bundle';
  type: string;
  total: number;
  link?: Array<{ relation: string; url: string }>;
  entry?: Array<{
    fullUrl?: string;
    resource?: FhirResource;
    search?: { mode: string };
  }>;
}

export interface FhirCapabilityStatement extends FhirResource {
  resourceType: 'CapabilityStatement';
  name?: string;
  title?: string;
  status: string;
  date?: string;
  publisher?: string;
  description?: string;
  fhirVersion: string;
  format: string[];
  software?: { name?: string; version?: string };
  rest?: Array<{
    mode: string;
    resource?: Array<{
      type: string;
      interaction?: Array<{ code: string }>;
      searchParam?: Array<{ name: string; type: string }>;
    }>;
  }>;
}

export interface FhirPatient extends FhirResource {
  resourceType: 'Patient';
  identifier?: Array<{ use?: string; system?: string; value?: string }>;
  active?: boolean;
  name?: Array<{ use?: string; text?: string; family?: string; given?: string[] }>;
  telecom?: Array<{ system?: string; value?: string; use?: string }>;
  gender?: string;
  birthDate?: string;
  address?: Array<{ use?: string; text?: string; line?: string[]; city?: string; state?: string; country?: string }>;
}

export interface FhirOperationOutcome extends FhirResource {
  resourceType: 'OperationOutcome';
  issue?: Array<{ severity: string; code: string; diagnostics?: string }>;
}

// ==================== FHIR API Functions ====================

/**
 * GET /api/fhir/metadata - Capability Statement (no auth required)
 */
export const getMetadata = async (): Promise<FhirCapabilityStatement> => {
  const response = await apiClient.get('/fhir/metadata');
  return response.data;
};

/**
 * Search FHIR resources by type
 */
export const searchResource = async (
  resourceType: string,
  params: Record<string, string | number | undefined> = {}
): Promise<FhirBundle> => {
  const cleanParams: Record<string, string | number> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      cleanParams[key] = value;
    }
  });
  const response = await apiClient.get(`/fhir/${resourceType}`, { params: cleanParams });
  return response.data;
};

/**
 * Read a single FHIR resource by type and ID
 */
export const readResource = async (resourceType: string, id: string): Promise<FhirResource> => {
  const response = await apiClient.get(`/fhir/${resourceType}/${id}`);
  return response.data;
};

// ==================== Convenience Methods ====================

export const searchPatients = (params: { name?: string; identifier?: string; phone?: string; _count?: number; _offset?: number }) =>
  searchResource('Patient', params);

export const searchEncounters = (params: { patient?: string; status?: string; date?: string; _count?: number; _offset?: number }) =>
  searchResource('Encounter', params);

export const searchObservations = (params: { patient?: string; category?: string; code?: string; date?: string; _count?: number; _offset?: number }) =>
  searchResource('Observation', params);

export const searchMedicationRequests = (params: { patient?: string; status?: string; authoredon?: string; _count?: number; _offset?: number }) =>
  searchResource('MedicationRequest', params);

export const searchDiagnosticReports = (params: { patient?: string; category?: string; date?: string; _count?: number; _offset?: number }) =>
  searchResource('DiagnosticReport', params);

export const searchConditions = (params: { patient?: string; code?: string; _count?: number; _offset?: number }) =>
  searchResource('Condition', params);

export const searchAllergyIntolerances = (params: { patient?: string; _count?: number; _offset?: number }) =>
  searchResource('AllergyIntolerance', params);

export const searchProcedures = (params: { patient?: string; date?: string; _count?: number; _offset?: number }) =>
  searchResource('Procedure', params);

// ==================== External FHIR Server Functions ====================

export const fetchExternalMetadata = async (serverUrl: string): Promise<FhirCapabilityStatement | null> => {
  try {
    const response = await apiClient.get('/fhir/external/metadata', { params: { serverUrl } });
    return response.data;
  } catch {
    return null;
  }
};

export const fetchExternalPatient = async (serverUrl: string, patientId: string): Promise<FhirPatient | null> => {
  try {
    const response = await apiClient.get(`/fhir/external/Patient/${patientId}`, { params: { serverUrl } });
    return response.data;
  } catch {
    return null;
  }
};

/**
 * Export patient data as FHIR Bundle (collects all resources for a patient)
 */
export const exportPatientBundle = async (patientId: string): Promise<FhirBundle> => {
  const [patient, encounters, observations, medications, conditions, allergies, procedures, diagnostics] = await Promise.allSettled([
    readResource('Patient', patientId),
    searchResource('Encounter', { patient: patientId, _count: 100 }),
    searchResource('Observation', { patient: patientId, _count: 100 }),
    searchResource('MedicationRequest', { patient: patientId, _count: 100 }),
    searchResource('Condition', { patient: patientId, _count: 100 }),
    searchResource('AllergyIntolerance', { patient: patientId, _count: 100 }),
    searchResource('Procedure', { patient: patientId, _count: 100 }),
    searchResource('DiagnosticReport', { patient: patientId, _count: 100 }),
  ]);

  const entries: Array<{ fullUrl?: string; resource?: FhirResource }> = [];

  if (patient.status === 'fulfilled') {
    entries.push({ fullUrl: `Patient/${patientId}`, resource: patient.value });
  }

  const bundles = [encounters, observations, medications, conditions, allergies, procedures, diagnostics];
  for (const result of bundles) {
    if (result.status === 'fulfilled') {
      const bundle = result.value as FhirBundle;
      if (bundle.entry) {
        entries.push(...bundle.entry.map(e => ({ fullUrl: e.fullUrl, resource: e.resource })));
      }
    }
  }

  return {
    resourceType: 'Bundle',
    type: 'collection',
    total: entries.length,
    entry: entries,
  };
};
