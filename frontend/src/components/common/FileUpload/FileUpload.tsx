import React from 'react';
import { Button, Upload } from 'antd';
import type { UploadProps } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

export type FileUploadType =
  | 'image'
  | 'excel'
  | 'pdf'
  | 'document'
  | 'any';

export interface FileUploadProps
  extends Omit<UploadProps, 'accept' | 'beforeUpload'> {
  fileType?: FileUploadType;
  maxSize?: number;
  onFileSelect?: (file: File) => void;
}

const ACCEPT_MAP: Record<FileUploadType, string> = {
  image: 'image/*',

  excel: [
    '.xls',
    '.xlsx',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ].join(','),

  pdf: 'application/pdf',

  document: [
    '.doc',
    '.docx',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ].join(','),

  any: '',
};

export const FileUpload: React.FC<FileUploadProps> = ({
  fileType = 'any',
  maxSize,
  onFileSelect,
  children,
  ...props
}) => {
  const handleBeforeUpload = (file: File) => {
    if (maxSize && file.size > maxSize * 1024 * 1024) {
      return false;
    }

    onFileSelect?.(file);

    return false;
  };

  return (
    <Upload
      {...props}
      accept={ACCEPT_MAP[fileType]}
      beforeUpload={handleBeforeUpload}
      showUploadList={false}
    >
      {children ?? (
        <Button icon={<UploadOutlined />}>
          Chọn file
        </Button>
      )}
    </Upload>
  );
};