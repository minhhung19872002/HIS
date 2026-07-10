import React from 'react';
import { Tabs } from 'antd';
import {
  ShareAltOutlined, FileProtectOutlined,
  PictureOutlined,
  OrderedListOutlined, CodeOutlined, SafetyOutlined,
} from '@ant-design/icons';

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
