import { apiClient } from '../services/apiClient';

export interface UserSettingItem {
  settingKey: string;
  settingValue?: string | null;
}

export interface LabDefaultRoles {
  defaultKtvName?: string | null;
  defaultKtvId?: string | null;
  defaultApproverName?: string | null;
  defaultApproverId?: string | null;
}

export const getUserSettings = async (): Promise<UserSettingItem[]> => {
  try {
    const resp = await apiClient.get<UserSettingItem[]>('/user-settings');
    return Array.isArray(resp.data) ? resp.data : [];
  } catch {
    console.warn('[userSettings] getUserSettings failed');
    return [];
  }
};

export const getSettingValue = async (key: string): Promise<string | null> => {
  try {
    const resp = await apiClient.get<UserSettingItem>(`/user-settings/${encodeURIComponent(key)}`);
    return resp.data?.settingValue ?? null;
  } catch {
    console.warn(`[userSettings] getSettingValue(${key}) failed`);
    return null;
  }
};

export const upsertSetting = async (key: string, value: string | null): Promise<void> => {
  try {
    await apiClient.put(`/user-settings/${encodeURIComponent(key)}`, { settingKey: key, settingValue: value });
  } catch {
    console.warn(`[userSettings] upsertSetting(${key}) failed`);
  }
};

export const getLabDefaultRoles = async (): Promise<LabDefaultRoles> => {
  try {
    const resp = await apiClient.get<LabDefaultRoles>('/user-settings/lab-roles');
    return resp.data || {};
  } catch {
    console.warn('[userSettings] getLabDefaultRoles failed');
    return {};
  }
};

export const saveLabDefaultRoles = async (dto: LabDefaultRoles): Promise<void> => {
  try {
    await apiClient.put('/user-settings/lab-roles', dto);
  } catch {
    console.warn('[userSettings] saveLabDefaultRoles failed');
    throw new Error('Không lưu được cài đặt vai trò mặc định');
  }
};
