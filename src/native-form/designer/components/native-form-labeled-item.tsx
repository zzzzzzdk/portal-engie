import React from 'react'
import { Form, Typography } from 'antd'
import type { FormItemProps } from 'antd'

interface NativeFormLabeledItemProps extends FormItemProps {
  labelText: React.ReactNode
  hint?: React.ReactNode
  labelStrong?: boolean
}

const NativeFormLabeledItem: React.FC<NativeFormLabeledItemProps> = ({
  labelText,
  hint,
  labelStrong = false,
  children,
  ...itemProps
}) => (
  <div className="native-form-config-panel__field-block">
    <Typography.Text strong={labelStrong}>{labelText}</Typography.Text>
    {hint ? <Typography.Text type="secondary">{hint}</Typography.Text> : null}
    <Form.Item {...itemProps}>
      {children}
    </Form.Item>
  </div>
)

export default NativeFormLabeledItem
