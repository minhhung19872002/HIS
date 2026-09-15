/**
 * RIS API — Help categories/articles, troubleshooting, CLS screen config,
 * service-description templates.
 */

import apiClient from '../../../../services/apiClient';

// #region Interfaces

export interface HelpCategoryDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  parentCategoryId?: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface SaveHelpCategoryDto {
  id?: string;
  code: string;
  name: string;
  description?: string;
  parentCategoryId?: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface HelpArticleDto {
  id: string;
  title: string;
  summary?: string;
  content?: string;
  categoryId?: string;
  categoryName?: string;
  videoUrl?: string;
  attachments?: string;
  tags?: string;
  viewCount: number;
  sortOrder: number;
  isActive: boolean;
}

export interface SaveHelpArticleDto {
  id?: string;
  title: string;
  summary?: string;
  content?: string;
  categoryId?: string;
  videoUrl?: string;
  attachments?: string;
  tags?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface SearchHelpDto {
  categoryId?: string;
  keyword?: string;
  page: number;
  pageSize: number;
}

export interface HelpSearchResultDto {
  items: HelpArticleDto[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export interface TroubleshootingDto {
  id: string;
  code: string;
  category: string;
  problem: string;
  solution: string;
  steps?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface SaveTroubleshootingDto {
  id?: string;
  code: string;
  category: string;
  problem: string;
  solution: string;
  steps?: string;
  sortOrder: number;
  isActive: boolean;
}

// #endregion

// #region IX. Online Help APIs

export const getHelpCategories = (parentId?: string) =>
  apiClient.get<HelpCategoryDto[]>('/RISComplete/help/categories', {
    params: { parentId }
  });

export const saveHelpCategory = (data: SaveHelpCategoryDto) =>
  apiClient.post<HelpCategoryDto>('/RISComplete/help/categories', data);

// BE HelpArticleDto exposes `isPublished`, not `isActive` → every article showed "Ẩn" and KPI "0 hiển thị".
type RawHelpArticle = HelpArticleDto & { isPublished?: boolean };
const normalizeArticle = (a: RawHelpArticle): HelpArticleDto => ({ ...a, isActive: a.isActive ?? a.isPublished ?? false });

export const searchHelpArticles = (data: SearchHelpDto) =>
  apiClient.post<HelpSearchResultDto>('/RISComplete/help/articles/search', data)
    .then((res) => ({
      ...res,
      data: res.data ? { ...res.data, items: (res.data.items || []).map(normalizeArticle) } : res.data,
    }));

export const getHelpArticle = (articleId: string) =>
  apiClient.get<RawHelpArticle>(`/RISComplete/help/articles/${articleId}`)
    .then((res) => ({ ...res, data: res.data ? normalizeArticle(res.data) : res.data }));

export const saveHelpArticle = (data: SaveHelpArticleDto) =>
  apiClient.post<HelpArticleDto>('/RISComplete/help/articles', data);

// BE TroubleshootingDto: errorCode / errorTitle / relatedModule / causes — the v2 Help tab rendered
// blank code, category and problem for every entry.
type RawTroubleshooting = Partial<TroubleshootingDto> & {
  errorCode?: string; errorTitle?: string; relatedModule?: string; causes?: string;
};
export const getTroubleshootingList = (category?: string, keyword?: string) =>
  apiClient.get<RawTroubleshooting[]>('/RISComplete/help/troubleshooting', {
    params: { category, keyword }
  }).then((res) => ({
    ...res,
    data: (Array.isArray(res.data) ? res.data : []).map((t): TroubleshootingDto => ({
      id: t.id ?? '',
      code: t.code ?? t.errorCode ?? '',
      category: t.category ?? t.relatedModule ?? '',
      problem: t.problem ?? t.errorTitle ?? '',
      solution: t.solution ?? '',
      steps: t.steps ?? t.causes,
      sortOrder: t.sortOrder ?? 0,
      isActive: t.isActive ?? true,
    })),
  }));

export const saveTroubleshooting = (data: SaveTroubleshootingDto) =>
  apiClient.post<TroubleshootingDto>('/RISComplete/help/troubleshooting', data);

// #endregion
