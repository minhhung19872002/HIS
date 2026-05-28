import React, { useState, useEffect, useCallback } from 'react';
import {
  Tabs, Table, Button, Modal, Form, Input, Select, Tag, Space, message,
  Popconfirm, DatePicker, Switch, Badge, Tooltip, Card, Row, Col,
  Timeline, Empty, Drawer, Spin, Alert,
} from 'antd';
import {
  ShareAltOutlined, LockOutlined, FileProtectOutlined, EditOutlined,
  PictureOutlined, ThunderboltOutlined, CheckCircleOutlined,
  CloseCircleOutlined, WarningOutlined, DeleteOutlined, PlusOutlined,
  ReloadOutlined, SearchOutlined, UnlockOutlined, CopyOutlined,
  OrderedListOutlined, TagOutlined, CodeOutlined, SafetyOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as emrMgmt from '../../api/emrManagement';
import type {
  EmrShareDto, ShareAccessLogDto, EmrExtractDto, EmrSpineDto,
  EmrSpineSectionDto, EmrImageDto, EmrShortcodeDto,
  AutoCheckRuleDto, AutoCheckViolationDto,
} from '../../api/emrManagement';

const { TextArea } = Input;

// ============ Tab 1: Chia se BA (Sharing B.1.2) ============

import { SharingTab } from './SharingTab';
import { ExtractTab } from './ExtractTab';
import { SpineTab } from './SpineTab';
import { ImagesTab } from './ImagesTab';
import { ShortcodesTab } from './ShortcodesTab';
import { AutoCheckTab } from './AutoCheckTab';

const EmrManagementTabs: React.FC = () => {
  const items = [
    {
      key: 'sharing',
      label: <><ShareAltOutlined /> Chia se</>,
      children: <SharingTab />,
    },
    {
      key: 'extracts',
      label: <><FileProtectOutlined /> Trich luc</>,
      children: <ExtractTab />,
    },
    {
      key: 'spine',
      label: <><OrderedListOutlined /> Gay</>,
      children: <SpineTab />,
    },
    {
      key: 'images',
      label: <><PictureOutlined /> Hinh anh</>,
      children: <ImagesTab />,
    },
    {
      key: 'shortcodes',
      label: <><CodeOutlined /> Ma tat</>,
      children: <ShortcodesTab />,
    },
    {
      key: 'autocheck',
      label: <><SafetyOutlined /> Kiem tra</>,
      children: <AutoCheckTab />,
    },
  ];

  return <Tabs items={items} size="small" tabBarGutter={8} />;
};

export default EmrManagementTabs;
