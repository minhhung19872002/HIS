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

export const searchHelpArticles = (data: SearchHelpDto) =>
  apiClient.post<HelpSearchResultDto>('/RISComplete/help/articles/search', data);

export const getHelpArticle = (articleId: string) =>
  apiClient.get<HelpArticleDto>(`/RISComplete/help/articles/${articleId}`);

export const saveHelpArticle = (data: SaveHelpArticleDto) =>
  apiClient.post<HelpArticleDto>('/RISComplete/help/articles', data);

export const getTroubleshootingList = (category?: string, keyword?: string) =>
  apiClient.get<TroubleshootingDto[]>('/RISComplete/help/troubleshooting', {
    params: { category, keyword }
  });

export const saveTroubleshooting = (data: SaveTroubleshootingDto) =>
  apiClient.post<TroubleshootingDto>('/RISComplete/help/troubleshooting', data);

// #endregion
