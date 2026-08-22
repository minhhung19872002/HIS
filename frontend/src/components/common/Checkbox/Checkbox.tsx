import React from 'react';
import { Checkbox as AntCheckbox } from 'antd';
import type { CheckboxProps as AntCheckboxProps } from 'antd';

export interface CheckboxProps extends AntCheckboxProps {
    label?: React.ReactNode;
}

export const Checkbox: React.FC<CheckboxProps> = ({
    label,
    children,
    style,
    ...props
}) => {
    return (
        <AntCheckbox {...props} style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: 12.5,
            lineHeight: 1.4,
            marginBottom: 'var(--space-8)',
            ...style,
        }}>
            {label ?? children}
        </AntCheckbox>
    );
};