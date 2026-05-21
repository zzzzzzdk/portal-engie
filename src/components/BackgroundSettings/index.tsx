import React, { useEffect, useMemo, useState } from 'react'
import {
  Form,
  Input,
  Tabs,
  ColorPicker,
  Upload,
  Select,
  App as AntdApp,
  Slider,
  InputNumber,
} from 'antd'
import { BgColorsOutlined, PictureOutlined, UploadOutlined, LoadingOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd/es/form'
import { uploadImage } from '@/services'
import { useCanvasTheme } from '@/hooks/useCanvasTheme'

const parseBackdropBlur = (value?: string): number | undefined => {
  if (!value || value === 'none') return undefined
  const match = value.match(/blur\((\d+(?:\.\d+)?)px\)/)
  return match ? parseFloat(match[1]) : undefined
}

export const GRADIENT_PRESETS = [
  'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  'linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%)',
  'linear-gradient(to top, #cfd9df 0%, #e2ebf0 100%)',
  'linear-gradient(120deg, #fdfbfb 0%, #ebedee 100%)',
  'linear-gradient(to top, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(to right, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(to right, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(to top, #30cfd0 0%, #330867 100%)',
]

export const isValidCssGradient = (value?: string): boolean => {
  if (!value || !value.trim()) return false
  const trimmed = value.trim().toLowerCase()
  return /^(linear|radial|conic|repeating-(linear|radial|conic))-gradient\(/.test(trimmed)
}

interface BackgroundSettingsProps {
  form: FormInstance
  initialValues?: {
    backgroundType?: 'color' | 'image' | 'gradient'
    backgroundColor?: string
    backgroundImage?: string
    backgroundGradient?: string
    backgroundSize?: string
    backgroundRepeat?: string
    backgroundPosition?: string
    backdropBlur?: number
    boxShadow?: string
  }
  showEffects?: boolean
  disabled?: boolean
}

const BackgroundSettings: React.FC<BackgroundSettingsProps> = ({
  form,
  initialValues,
  showEffects = true,
  disabled = false,
}) => {
  const [activeTab, setActiveTab] = useState<string>('color')
  const [fileList, setFileList] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const { message } = AntdApp.useApp()
  const { themeMode, styleMode, styleTokens } = useCanvasTheme()
  const backgroundTypeValue = Form.useWatch('backgroundType', form)
  const backgroundImageValue = Form.useWatch('backgroundImage', form)

  const defaultBackgroundColor = useMemo(() => {
    if (styleTokens?.widget?.background) {
      return styleTokens.widget.background
    }

    return themeMode === 'dark' ? '#141414' : '#ffffff'
  }, [themeMode, styleTokens])

  const themeDefaultBlur = useMemo(() => {
    return parseBackdropBlur(styleTokens?.widget?.backdropFilter)
  }, [styleTokens])

  useEffect(() => {
    if (initialValues) {
      const type = initialValues.backgroundType || 'color'
      setActiveTab(type)
      form.setFieldValue('backgroundType', type)

      if (type === 'color' && !initialValues.backgroundColor) {
        form.setFieldValue('backgroundColor', defaultBackgroundColor)
      }

      if (initialValues.backgroundImage) {
        setFileList([
          {
            uid: '-1',
            name: 'current-bg.png',
            status: 'done',
            url: initialValues.backgroundImage,
          },
        ])
      } else {
        setFileList([])
      }

      if (initialValues.backdropBlur === undefined && themeDefaultBlur !== undefined) {
        form.setFieldValue('backdropBlur', themeDefaultBlur)
      }

      return
    }

    setActiveTab('color')
    form.setFieldValue('backgroundType', 'color')
    form.setFieldValue('backgroundColor', defaultBackgroundColor)
    setFileList([])
    if (themeDefaultBlur !== undefined) {
      form.setFieldValue('backdropBlur', themeDefaultBlur)
    }
  }, [defaultBackgroundColor, form, initialValues, themeDefaultBlur])

  useEffect(() => {
    if (backgroundTypeValue && backgroundTypeValue !== activeTab) {
      setActiveTab(backgroundTypeValue)
    }
  }, [activeTab, backgroundTypeValue])

  useEffect(() => {
    if (backgroundImageValue) {
      setFileList([
        {
          uid: '-1',
          name: 'current-bg.png',
          status: 'done',
          url: backgroundImageValue,
        },
      ])
      return
    }

    setFileList([])
  }, [backgroundImageValue])

  const handleTabChange = (key: string) => {
    if (disabled) {
      return
    }

    setActiveTab(key)
    form.setFieldValue('backgroundType', key)

    if (key === 'color' && !form.getFieldValue('backgroundColor')) {
      form.setFieldValue('backgroundColor', defaultBackgroundColor)
    }
  }

  const items = [
    {
      key: 'color',
      label: (
        <span>
          <BgColorsOutlined /> 纯色
        </span>
      ),
      disabled,
      children: (
        <Form.Item
          name="backgroundColor"
          label="选择颜色"
          tooltip="使用背景模糊时，建议设置半透明颜色"
        >
          <ColorPicker showText defaultFormat="rgb" disabled={disabled} />
        </Form.Item>
      ),
    },
    {
      key: 'image',
      label: (
        <span>
          <PictureOutlined /> 图片
        </span>
      ),
      disabled,
      children: (
        <>
          <Form.Item label="上传图片">
            <Upload
              listType="picture-card"
              maxCount={1}
              fileList={fileList}
              disabled={disabled}
              beforeUpload={async file => {
                if (disabled) {
                  return false
                }

                if (!file.type.startsWith('image/')) {
                  message.error('只能上传图片文件')
                  return false
                }

                const isLt10M = file.size / 1024 / 1024 < 10
                if (!isLt10M) {
                  message.error('图片大小不能超过 10MB')
                  return false
                }

                setUploading(true)
                setFileList([
                  {
                    uid: file.uid,
                    name: file.name,
                    status: 'uploading',
                  },
                ])

                try {
                  const res = await uploadImage(file)
                  if (res.data?.url) {
                    form.setFieldValue('backgroundImage', res.data.url)
                    setFileList([
                      {
                        uid: file.uid,
                        name: file.name,
                        status: 'done',
                        url: res.data.url,
                      },
                    ])
                    message.success('图片上传成功')
                  } else {
                    message.error(res.message || '上传失败')
                    setFileList([])
                  }
                } catch {
                  message.error('上传失败，请稍后重试')
                  setFileList([])
                } finally {
                  setUploading(false)
                }

                return false
              }}
              onRemove={() => {
                if (disabled) {
                  return false
                }

                setFileList([])
                form.setFieldValue('backgroundImage', '')
              }}
            >
              {fileList.length < 1 && (
                <div>
                  {uploading ? <LoadingOutlined /> : <UploadOutlined />}
                  <div style={{ marginTop: 8 }}>{uploading ? '上传中' : '上传'}</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          <div style={{ display: 'flex', gap: 8 }}>
            <Form.Item name="backgroundSize" label="大小" style={{ flex: 1 }}>
              <Select allowClear placeholder="默认(auto)" disabled={disabled}>
                <Select.Option value="cover">Cover</Select.Option>
                <Select.Option value="contain">Contain</Select.Option>
                <Select.Option value="100% 100%">100% 100%</Select.Option>
                <Select.Option value="auto">Auto</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="backgroundRepeat"
              label="重复"
              style={{ flex: 1 }}
              initialValue="no-repeat"
            >
              <Select allowClear placeholder="默认(repeat)" disabled={disabled}>
                <Select.Option value="no-repeat">No Repeat</Select.Option>
                <Select.Option value="repeat">Repeat</Select.Option>
                <Select.Option value="repeat-x">Repeat X</Select.Option>
                <Select.Option value="repeat-y">Repeat Y</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item name="backgroundPosition" label="位置">
            <Select allowClear placeholder="默认(center)" disabled={disabled}>
              <Select.Option value="center">Center</Select.Option>
              <Select.Option value="top">Top</Select.Option>
              <Select.Option value="bottom">Bottom</Select.Option>
              <Select.Option value="left">Left</Select.Option>
              <Select.Option value="right">Right</Select.Option>
              <Select.Option value="top left">Top Left</Select.Option>
              <Select.Option value="top right">Top Right</Select.Option>
              <Select.Option value="bottom left">Bottom Left</Select.Option>
              <Select.Option value="bottom right">Bottom Right</Select.Option>
            </Select>
          </Form.Item>
        </>
      ),
    },
    {
      key: 'gradient',
      label: (
        <span>
          <BgColorsOutlined /> 渐变
        </span>
      ),
      disabled,
      children: (
        <>
          <Form.Item
            name="backgroundGradient"
            label="CSS 渐变代码"
            rules={[
              {
                validator: (_, value) => {
                  if (!value || !value.trim()) return Promise.resolve()
                  if (isValidCssGradient(value)) return Promise.resolve()
                  return Promise.reject(new Error('请输入有效的 CSS 渐变，例如 linear-gradient(...)'))
                },
              },
            ]}
          >
            <Input.TextArea
              rows={2}
              placeholder="linear-gradient(to right, #ff0000, #0000ff)"
              disabled={disabled}
            />
          </Form.Item>
          <div style={{ marginBottom: 8 }}>预设渐变:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {GRADIENT_PRESETS.map((gradient, index) => (
              <div
                key={index}
                onClick={() => {
                  if (disabled) {
                    return
                  }
                  form.setFieldValue('backgroundGradient', gradient)
                }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 4,
                  background: gradient,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  border: '1px solid #d9d9d9',
                  opacity: disabled ? 0.6 : 1,
                }}
                title={gradient}
              />
            ))}
          </div>
        </>
      ),
    },
  ]

  return (
    <>
      <Form.Item name="backgroundType" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="backgroundImage" hidden>
        <Input />
      </Form.Item>

      <div style={disabled ? { opacity: 0.72 } : undefined}>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={items}
          type="card"
          size="small"
          style={{ marginTop: 8 }}
        />

        {showEffects && (
          <>
            <Form.Item
              label="背景模糊"
              tooltip={
                styleMode === 'minimal' && themeDefaultBlur
                  ? `极简模式默认模糊 ${themeDefaultBlur}px，设置为 0 可禁用`
                  : '设置毛玻璃效果，值越大越模糊，设置为 0 可禁用'
              }
              style={{ marginTop: 16 }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Form.Item name="backdropBlur" noStyle>
                  <Slider min={0} max={30} step={1} style={{ flex: 1 }} disabled={disabled} />
                </Form.Item>
                <Form.Item name="backdropBlur" noStyle>
                  <InputNumber
                    min={0}
                    max={30}
                    step={1}
                    style={{ width: 70 }}
                    suffix="px"
                    disabled={disabled}
                  />
                </Form.Item>
              </div>
            </Form.Item>

            <Form.Item
              name="boxShadow"
              label="阴影效果"
              tooltip="CSS box-shadow 属性，例如 0 4px 12px rgba(0,0,0,0.15)"
            >
              <Input placeholder="0 4px 12px rgba(0,0,0,0.15)" allowClear disabled={disabled} />
            </Form.Item>
          </>
        )}
      </div>
    </>
  )
}

export default BackgroundSettings
