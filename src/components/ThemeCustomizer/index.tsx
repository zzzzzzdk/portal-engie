import React, { useState, useEffect } from 'react'
import { Modal, Form, ColorPicker, Space, Input, Tabs, InputNumber, Button, message } from 'antd'
import { useTheme } from '@/theme'
import type { IBaseColors } from '@/theme'
import type { Color } from 'antd/es/color-picker'
import type { ThemePresetName } from '@/theme'

interface IThemeCustomizerProps {
  open: boolean
  onClose: () => void
}

const ThemeCustomizer: React.FC<IThemeCustomizerProps> = ({ open, onClose }) => {
  const theme = useTheme()
  const [form] = Form.useForm()

  // 本地状态
  const [localColors, setLocalColors] = useState<IBaseColors>(theme.baseColors)
  const [localLayout, setLocalLayout] = useState(theme.customTokens.layout)

  // 同步 Redux 状态到本地
  useEffect(() => {
    if (open) {
      setLocalColors(theme.baseColors)
      setLocalLayout(theme.customTokens.layout)
      form.setFieldsValue({
        ...theme.baseColors,
        ...theme.customTokens.layout,
      })
    }
  }, [open, theme.baseColors, theme.customTokens])

  // 处理颜色变化
  const handleColorChange = (field: keyof IBaseColors, color: Color) => {
    const hexColor = color.toHexString()
    setLocalColors({
      ...localColors,
      [field]: hexColor,
    })
  }

  // 处理布局变化
  const handleLayoutChange = (section: string, field: string, value: any) => {
    setLocalLayout({
      ...localLayout,
      [section]: {
        ...(localLayout as any)[section],
        [field]: value,
      },
    })
  }

  // 保存设置
  const handleSave = () => {
    // 保存颜色
    theme.setColors(localColors)

    // 保存布局
    theme.updateTokens({
      layout: localLayout,
    })

    message.success('主题配置已保存')
    onClose()
  }

  // 重置为当前预设
  const handleReset = () => {
    theme.resetTheme()
    message.success('已重置为预设主题')
    onClose()
  }

  // 切换预设
  const handlePresetChange = (presetName: ThemePresetName) => {
    theme.applyPreset(presetName, true)
    message.success(`已切换到${presetName}主题`)
  }

  // 导出主题
  const handleExport = () => {
    const json = theme.exportTheme()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ant-theme-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    message.success('主题配置已导出')
  }

  // 导入主题
  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = (e: any) => {
      const file = e.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event: any) => {
          const success = theme.importTheme(event.target.result)
          if (success) {
            message.success('主题配置已导入')
            onClose()
          } else {
            message.error('导入失败，请检查文件格式')
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  return (
    <Modal
      title="主题定制器"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="export" onClick={handleExport}>
          导出主题
        </Button>,
        <Button key="import" onClick={handleImport}>
          导入主题
        </Button>,
        <Button key="reset" onClick={handleReset}>
          重置
        </Button>,
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="save" type="primary" onClick={handleSave}>
          保存
        </Button>,
      ]}
      width={700}
      className="theme-customizer"
    >
      <Tabs
        items={[
          {
            key: 'preset',
            label: '主题预设',
            children: (
              <div className="preset-section">
                <p>选择预设主题：</p>
                <Space wrap>
                  <Button
                    type={theme.themePreset === 'light' ? 'primary' : 'default'}
                    onClick={() => handlePresetChange('light')}
                  >
                    浅色主题
                  </Button>
                  <Button
                    type={theme.themePreset === 'dark' ? 'primary' : 'default'}
                    onClick={() => handlePresetChange('dark')}
                  >
                    深色主题
                  </Button>
                  <Button
                    type={theme.themePreset === 'blue' ? 'primary' : 'default'}
                    onClick={() => handlePresetChange('blue')}
                  >
                    蓝色主题
                  </Button>
                  <Button
                    type={theme.themePreset === 'purple' ? 'primary' : 'default'}
                    onClick={() => handlePresetChange('purple')}
                  >
                    紫色主题
                  </Button>
                </Space>
                <p style={{ marginTop: 16, color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
                  深色/浅色模式和极简/标准风格请在画布工具栏切换
                </p>
              </div>
            ),
          },
          {
            key: 'colors',
            label: '颜色配置',
            children: (
              <Form form={form} layout="vertical">
                <Form.Item label="主色调 (Primary)">
                  <Space>
                    <ColorPicker
                      value={localColors.primary}
                      onChange={(color) => handleColorChange('primary', color)}
                      showText
                    />
                    <Input
                      value={localColors.primary}
                      onChange={(e) =>
                        setLocalColors({ ...localColors, primary: e.target.value })
                      }
                      style={{ width: 120 }}
                    />
                  </Space>
                </Form.Item>

                <Form.Item label="品牌色 (Brand)">
                  <Space>
                    <ColorPicker
                      value={localColors.brand}
                      onChange={(color) => handleColorChange('brand', color)}
                      showText
                    />
                    <Input
                      value={localColors.brand}
                      onChange={(e) =>
                        setLocalColors({ ...localColors, brand: e.target.value })
                      }
                      style={{ width: 120 }}
                    />
                  </Space>
                </Form.Item>

                <Form.Item label="成功色 (Success)">
                  <Space>
                    <ColorPicker
                      value={localColors.success}
                      onChange={(color) => handleColorChange('success', color)}
                      showText
                    />
                    <Input
                      value={localColors.success}
                      onChange={(e) =>
                        setLocalColors({ ...localColors, success: e.target.value })
                      }
                      style={{ width: 120 }}
                    />
                  </Space>
                </Form.Item>

                <Form.Item label="警告色 (Warning)">
                  <Space>
                    <ColorPicker
                      value={localColors.warning}
                      onChange={(color) => handleColorChange('warning', color)}
                      showText
                    />
                    <Input
                      value={localColors.warning}
                      onChange={(e) =>
                        setLocalColors({ ...localColors, warning: e.target.value })
                      }
                      style={{ width: 120 }}
                    />
                  </Space>
                </Form.Item>

                <Form.Item label="错误色 (Error)">
                  <Space>
                    <ColorPicker
                      value={localColors.error}
                      onChange={(color) => handleColorChange('error', color)}
                      showText
                    />
                    <Input
                      value={localColors.error}
                      onChange={(e) =>
                        setLocalColors({ ...localColors, error: e.target.value })
                      }
                      style={{ width: 120 }}
                    />
                  </Space>
                </Form.Item>

                <Form.Item label="信息色 (Info)">
                  <Space>
                    <ColorPicker
                      value={localColors.info}
                      onChange={(color) => handleColorChange('info', color)}
                      showText
                    />
                    <Input
                      value={localColors.info}
                      onChange={(e) =>
                        setLocalColors({ ...localColors, info: e.target.value })
                      }
                      style={{ width: 120 }}
                    />
                  </Space>
                </Form.Item>
              </Form>
            ),
          },
          {
            key: 'layout',
            label: '布局配置',
            children: (
              <Form form={form} layout="vertical">
                <h4>Header 配置</h4>
                <Form.Item label="背景颜色">
                  <Space>
                    <ColorPicker
                      value={localLayout.header.gradientBg}
                      onChange={(color) =>
                        handleLayoutChange('header', 'bg', color.toHexString())
                      }
                      showText
                    />
                    <Input
                      value={localLayout.header.gradientBg}
                      onChange={(e) => handleLayoutChange('header', 'bg', e.target.value)}
                      style={{ width: 200 }}
                    />
                  </Space>
                </Form.Item>
                <Form.Item label="文字颜色">
                  <Space>
                    <ColorPicker
                      value={localLayout.header.text}
                      onChange={(color) =>
                        handleLayoutChange('header', 'text', color.toHexString())
                      }
                      showText
                    />
                    <Input
                      value={localLayout.header.text}
                      onChange={(e) => handleLayoutChange('header', 'text', e.target.value)}
                      style={{ width: 120 }}
                    />
                  </Space>
                </Form.Item>
                <Form.Item label="高度 (px)">
                  <InputNumber
                    value={localLayout.header.height}
                    onChange={(value) => handleLayoutChange('header', 'height', value)}
                    min={48}
                    max={100}
                  />
                </Form.Item>

                <h4 style={{ marginTop: 24 }}>Sidebar 配置</h4>
                <Form.Item label="背景颜色">
                  <Space>
                    <ColorPicker
                      value={localLayout.sidebar.bg}
                      onChange={(color) =>
                        handleLayoutChange('sidebar', 'bg', color.toHexString())
                      }
                      showText
                    />
                    <Input
                      value={localLayout.sidebar.bg}
                      onChange={(e) => handleLayoutChange('sidebar', 'bg', e.target.value)}
                      style={{ width: 120 }}
                    />
                  </Space>
                </Form.Item>
                <Form.Item label="文字颜色">
                  <Space>
                    <ColorPicker
                      value={localLayout.sidebar.text}
                      onChange={(color) =>
                        handleLayoutChange('sidebar', 'text', color.toHexString())
                      }
                      showText
                    />
                    <Input
                      value={localLayout.sidebar.text}
                      onChange={(e) => handleLayoutChange('sidebar', 'text', e.target.value)}
                      style={{ width: 120 }}
                    />
                  </Space>
                </Form.Item>
              </Form>
            ),
          },
        ]}
      />
    </Modal>
  )
}

export default ThemeCustomizer
