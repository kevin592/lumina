/**
 * API 相关类型定义
 *
 * 定义 API 请求和响应的通用类型
 */

/**
 * API 响应基础类型
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page: number;
  size: number;
}

/**
 * 分页响应
 */
export interface PaginationResponse<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
  hasMore: boolean;
}

/**
 * API 错误类型
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 常用 API 错误代码
 */
export enum ApiErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

/**
 * 创建 API 错误
 */
export const createApiError = (
  code: string,
  message: string,
  statusCode: number = 500,
  details?: any
): ApiError => {
  return new ApiError(code, statusCode, message, details);
};

/**
 * 处理 API 错误
 */
export const handleApiError = (error: any): ApiError => {
  if (error instanceof ApiError) {
    return error;
  }

  if (error?.response) {
    return createApiError(
      error.response.data?.code || ApiErrorCode.INTERNAL_ERROR,
      error.response.data?.message || 'Server error',
      error.response.status
    );
  }

  if (error?.request) {
    return createApiError(
      ApiErrorCode.NETWORK_ERROR,
      'Network error - no response received',
      0
    );
  }

  return createApiError(
    ApiErrorCode.INTERNAL_ERROR,
    error?.message || 'Unknown error',
    500
  );
};

/**
 * 批量操作参数
 */
export interface BatchOperationParams<T = number> {
  ids: T[];
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  errors?: Array<{
    id: number;
    error: string;
  }>;
}

/**
 * 搜索参数
 */
export interfaceSearchParams {
  keyword: string;
  page?: number;
  size?: number;
  filters?: Record<string, any>;
}

/**
 * 排序参数
 */
export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * 查询参数（组合）
 */
export interface QueryParams extends PaginationParams {
  search?: string;
  sort?: SortParams;
  filters?: Record<string, any>;
}
