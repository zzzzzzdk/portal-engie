import React, { useEffect } from 'react'
import { Form, Input, Modal, Select } from 'antd'
import type { LocalTemplateCategory } from '@/types/local-component-library'
import './index.scss'

interface LocalTemplateSaveDialogProps {
  open: boolean
  loading?: boolean
  targetType?: 'widget' | 'group' | null
  initialName?: string
  categories: LocalTemplateCategory[]
  onCancel: () => void
  onSubmit: (values: { name: string; categoryId: string }) => void
}

const MAX_TEMPLATE_NAME_LENGTH = 30

const LocalTemplateSaveDialog: React.FC<LocalTemplateSaveDialogProps> = ({
  open,
  loading = false,
  targetType,
  initialName,
  categories,
  onCancel,
  onSubmit,
}) => {
  const [form] = Form.useForm()

  useEffect(() => {
    if (!open) {
      return
    }

    form.setFieldsValue({
      name: initialName || '',
      categoryId: categories[0]?.id || '',
    })
  }, [categories, form, initialName, open])

  return (
    <Modal
      className="local-template-save-dialog"
      title={targetType === 'group' ? '保存为分组模板' : '保存为组件模板'}
      open={open}
      onCancel={onCancel}
      onOk={() => void form.submit()}
      confirmLoading={loading}
      destroyOnHidden
      okText="保存"
      cancelText="取消"
      okButtonProps={{ disabled: categories.length === 0 }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
      >
        <Form.Item
          name="name"
          label="名称"
          rules={[
            { required: true, whitespace: true, message: '请输入名称' },
            { max: MAX_TEMPLATE_NAME_LENGTH, message: `名称最多 ${MAX_TEMPLATE_NAME_LENGTH} 个字符` },
          ]}
        >
          <Input
            placeholder="请输入模板名称"
            maxLength={MAX_TEMPLATE_NAME_LENGTH}
            showCount
          />
        </Form.Item>
        <Form.Item
          name="categoryId"
          label="分类"
          rules={[{ required: true, message: '请选择分类' }]}
          extra={categories.length === 0 ? '请先在左侧组件模板面板中创建分类' : undefined}
        >
          <Select
            placeholder="请选择分类"
            options={categories.map((item) => ({
              label: item.name,
              value: item.id,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default LocalTemplateSaveDialog
