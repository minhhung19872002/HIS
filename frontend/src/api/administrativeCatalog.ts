/**
 * Administrative Catalog API Client
 * Covers: Occupations, Genders, Administrative Divisions (Province/District/Ward),
 * Countries, Healthcare Facilities (CSKCB)
 */

import { apiClient } from './client';

// ============================================================================
// DTOs
// ============================================================================

export interface OccupationDto {
  id?: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface GenderDto {
  id?: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface AdministrativeDivisionDto {
  id?: string;
  code: string;
  name: string;
  level: number; // 1=Tinh, 2=Huyen, 3=Xa
  parentCode?: string;
  parentName?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CountryDto {
  id?: string;
  code: string;
  name: string;
  nationalityName?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface HealthcareFacilityDto {
  id?: string;
  code: string;
  name: string;
  address?: string;
  level?: string; // TW, Tinh, Huyen, Xa
  provinceCode?: string;
  sortOrder: number;
  isActive: boolean;
}

// ============================================================================
// API Functions
// ============================================================================

export const administrativeCatalogApi = {
  // Nghe nghiep (Occupation)
  getOccupations: (keyword?: string, isActive?: boolean) =>
    apiClient.get<OccupationDto[]>('/catalog/occupations', { params: { keyword, isActive } }),
  saveOccupation: (dto: OccupationDto) =>
    apiClient.post<OccupationDto>('/catalog/occupations', dto),
  deleteOccupation: (id: string) =>
    apiClient.delete<boolean>(`/catalog/occupations/${id}`),

  // Gioi tinh (Gender)
  getGenders: (keyword?: string, isActive?: boolean) =>
    apiClient.get<GenderDto[]>('/catalog/genders', { params: { keyword, isActive } }),
  saveGender: (dto: GenderDto) =>
    apiClient.post<GenderDto>('/catalog/genders', dto),
  deleteGender: (id: string) =>
    apiClient.delete<boolean>(`/catalog/genders/${id}`),

  // Tinh/Huyen/Xa (Administrative Divisions)
  getAdministrativeDivisions: (keyword?: string, level?: number, parentCode?: string, isActive?: boolean) =>
    apiClient.get<AdministrativeDivisionDto[]>('/catalog/administrative-divisions', { params: { keyword, level, parentCode, isActive } }),
  saveAdministrativeDivision: (dto: AdministrativeDivisionDto) =>
    apiClient.post<AdministrativeDivisionDto>('/catalog/administrative-divisions', dto),
  deleteAdministrativeDivision: (id: string) =>
    apiClient.delete<boolean>(`/catalog/administrative-divisions/${id}`),

  // Quoc gia (Country)
  getCountries: (keyword?: string, isActive?: boolean) =>
    apiClient.get<CountryDto[]>('/catalog/countries', { params: { keyword, isActive } }),
  saveCountry: (dto: CountryDto) =>
    apiClient.post<CountryDto>('/catalog/countries', dto),
  deleteCountry: (id: string) =>
    apiClient.delete<boolean>(`/catalog/countries/${id}`),

  // CSKCB (Healthcare Facility)
  getHealthcareFacilities: (keyword?: string, level?: string, provinceCode?: string, isActive?: boolean) =>
    apiClient.get<HealthcareFacilityDto[]>('/catalog/healthcare-facilities', { params: { keyword, level, provinceCode, isActive } }),
  saveHealthcareFacility: (dto: HealthcareFacilityDto) =>
    apiClient.post<HealthcareFacilityDto>('/catalog/healthcare-facilities', dto),
  deleteHealthcareFacility: (id: string) =>
    apiClient.delete<boolean>(`/catalog/healthcare-facilities/${id}`),
};
