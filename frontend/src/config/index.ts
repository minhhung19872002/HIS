/**
 * Config barrel — điểm vào thống nhất cho config dùng chung toàn hệ thống.
 * #config-consolidation
 *
 * (app.config / route.config / permission.config để trống — chưa có config
 * system-wide thật; sẽ thêm khi có nhu cầu, tránh over-build.)
 */
export * from './api.config';
export * from './env.config';
export * from './theme.config';
