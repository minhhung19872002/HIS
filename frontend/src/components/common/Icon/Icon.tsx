import React from 'react';
import TermIconCmp from '../../../layouts/terminal/Icon';

export interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size, className }) => (
  <TermIconCmp name={name} size={size} className={className} />
);
