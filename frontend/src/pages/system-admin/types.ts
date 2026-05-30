// Shared types cho các sub-tab của SystemAdmin (v1). Tách khỏi SystemAdmin.tsx (K1 refactor)
// để các sub-component tự self-contained, behavior-preserving.

export interface Branch {
  id: string;
  code?: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
  isHeadquarter?: boolean;
  isActive?: boolean;
}

// BE trả error qua axios + Antd Form validate ném object với `errorFields` — gộp 2 case
export interface ApiErrorLike {
  response?: {
    data?: {
      message?: string;
    };
  };
  errorFields?: unknown[];
}
