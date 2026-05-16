-- Fix role encoding: re-update role names with proper Unicode
-- Run this script after double-encoding issues in Roles table

UPDATE Roles SET RoleName = N'Quản trị viên', Description = N'Quản trị hệ thống' WHERE RoleCode = 'ADMIN';
UPDATE Roles SET RoleName = N'Bác sĩ', Description = N'Bác sĩ khám chữa bệnh' WHERE RoleCode = 'DOCTOR';
UPDATE Roles SET RoleName = N'Điều dưỡng', Description = N'Điều dưỡng' WHERE RoleCode = 'NURSE';
UPDATE Roles SET RoleName = N'Tiếp đón', Description = N'Nhân viên tiếp đón' WHERE RoleCode = 'RECEPTIONIST';
UPDATE Roles SET RoleName = N'Dược sĩ', Description = N'Dược sĩ' WHERE RoleCode = 'PHARMACIST';
UPDATE Roles SET RoleName = N'KTV Xét nghiệm', Description = N'Kỹ thuật viên xét nghiệm' WHERE RoleCode = 'LAB_TECH';
UPDATE Roles SET RoleName = N'Thu ngân', Description = N'Nhân viên thu ngân' WHERE RoleCode = 'CASHIER';
UPDATE Roles SET RoleName = N'Quản lý kho', Description = N'Quản lý kho dược' WHERE RoleCode = 'WAREHOUSE';

PRINT 'Role encoding fixed successfully';
