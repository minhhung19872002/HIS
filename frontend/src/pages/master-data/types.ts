/**
 * Type definitions cho MasterData v1 — extracted khỏi pages/MasterData.tsx
 * (K21 Batch 1). Pure types.
 */

import type {
  ClinicalTermCatalogDto,
  ParaclinicalServiceCatalogDto,
  DepartmentCatalogDto,
} from '../../modules/system/api/system';
import type {
  OccupationDto,
  GenderDto,
  AdministrativeDivisionDto,
  CountryDto,
  HealthcareFacilityDto,
} from '../../modules/administration/api/administrativeCatalog';

export interface ServiceItem {
  id?: string;
  code: string;
  name: string;
  bhytCode?: string;
  groupName: string;
  price: number;
  bhytPrice?: number;
  unit: string;
  departmentId?: string;
  isActive: boolean;
}

export interface Medicine {
  id?: string;
  code: string;
  name: string;
  activeIngredient: string;
  registrationNumber: string;
  manufacturer: string;
  country: string;
  unit: string;
  dosageForm: string;
  bhytCode?: string;
  price: number;
  bhytPrice?: number;
  isActive: boolean;
}

export interface Department {
  id?: string;
  code: string;
  name: string;
  bhytCode?: string;
  type: string;
  parentId?: string;
  headDoctor?: string;
  isActive: boolean;
}

export interface IcdCode {
  id?: string;
  code: string;
  name: string;
  nameEnglish?: string;
  chapter: string;
  group: string;
  isActive: boolean;
}

export type MasterDataRecord =
  | ServiceItem
  | Medicine
  | Department
  | IcdCode
  | ClinicalTermCatalogDto
  | OccupationDto
  | GenderDto
  | AdministrativeDivisionDto
  | CountryDto
  | HealthcareFacilityDto;

export type ApiListResponse<T> =
  | T[]
  | {
      data?: T[] | { data?: T[]; items?: T[] };
    }
  | null
  | undefined;

export type KeywordSearchRecord = {
  code?: string;
  name?: string;
  bhytCode?: string;
};

export type FormValidationError = {
  errorFields?: unknown[];
};

export type ServiceCatalogLike = ParaclinicalServiceCatalogDto & {
  unit?: string;
};

export type DepartmentCatalogLike = DepartmentCatalogDto & {
  departmentCode?: string;
  departmentName?: string;
  bhxhCode?: string;
  departmentCodeBYT?: string;
};
