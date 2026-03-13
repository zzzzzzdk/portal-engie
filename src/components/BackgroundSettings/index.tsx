import React, { useEffect, useState, useMemo } from 'react';
import { Form, Input, Tabs, ColorPicker, Upload, Select, App as AntdApp, Slider, InputNumber } from 'antd';
import { BgColorsOutlined, PictureOutlined, UploadOutlined, LoadingOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd/es/form';
import { uploadImage } from '@/services';
import { useCanvasTheme } from '@/hooks/useCanvasTheme';

/**
 * 从 CSS backdrop-filter 值中提取模糊数值
 * 例如: 'blur(23px)' => 23, 'none' => 0
 */
const parseBackdropBlur = (value?: string): number | undefined => {
  if (!value || value === 'none') return undefined;
  const match = value.match(/blur\((\d+(?:\.\d+)?)px\)/);
  return match ? parseFloat(match[1]) : undefined;
};

export const GRADIENT_PRESETS = [
  'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  'linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%)',
  'linear-gradient(to top, #cfd9df 0%, #e2ebf0 100%)',
  'linear-gradient(120deg, #fdfbfb 0%, #ebedee 100%)',
  'linear-gradient(to top, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(to right, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(to right, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(to top, #30cfd0 0%, #330867 100%)',
];

/**
 * 验证 CSS 渐变值是否有效
 * 必须以 linear-gradient/radial-gradient/conic-gradient/repeating- 开头
 */
export const isValidCssGradient = (value?: string): boolean => {
  if (!value || !value.trim()) return false;
  const trimmed = value.trim().toLowerCase();
  return /^(linear|radial|conic|repeating-(linear|radial|conic))-gradient\(/.test(trimmed);
};

interface BackgroundSettingsProps {
  form: FormInstance;
  initialValues?: {
    backgroundType?: 'color' | 'image' | 'gradient';
    backgroundColor?: string;
    backgroundImage?: string;
    backgroundGradient?: string;
    backgroundSize?: string;      // 背景图大小
    backgroundRepeat?: string;    // 背景图重复
    backgroundPosition?: string;  // 背景图位置
    backdropBlur?: number;  // 背景模糊度 (px)
    boxShadow?: string;     // 阴影效果
  };
  showEffects?: boolean; // 是否显示背景模糊和阴影效果，默认 true
}

const BackgroundSettings: React.FC<BackgroundSettingsProps> = ({ form, initialValues, showEffects = true }) => {
  const [activeTab, setActiveTab] = useState<string>('color');
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const { message } = AntdApp.useApp();
  const { themeMode, styleMode, styleTokens } = useCanvasTheme();

  // 根据主题模式和风格模式获取默认背景色
  // 优先使用风格 Token 中的 widget.background（如极简模式的半透明背景）
  const defaultBackgroundColor = useMemo(() => {
    // 如果风格 Token 中有 widget 背景色，优先使用
    if (styleTokens?.widget?.background) {
      return styleTokens.widget.background;
    }
    // 否则使用主题模式的默认背景色
    return themeMode === 'dark' ? '#141414' : '#ffffff';
  }, [themeMode, styleTokens]);

  // 获取当前风格的默认模糊值（极简模式有默认模糊效果）
  const themeDefaultBlur = useMemo(() => {
    return parseBackdropBlur(styleTokens?.widget?.backdropFilter);
  }, [styleTokens]);

  useEffect(() => {
    if (initialValues) {
      const type = initialValues.backgroundType || 'color';
      setActiveTab(type);
      form.setFieldValue('backgroundType', type);

      // 如果是纯色模式且没有设置背景色，则使用默认背景色
      if (type === 'color' && !initialValues.backgroundColor) {
        form.setFieldValue('backgroundColor', defaultBackgroundColor);
      }

      // Initialize file list if image exists
      if (initialValues.backgroundImage) {
        setFileList([
          {
            uid: '-1',
            name: 'current-bg.png',
            status: 'done',
            url: initialValues.backgroundImage,
          },
        ]);
      } else {
        setFileList([]);
      }

      // 如果未设置背景模糊且极简模式有默认值，显示主题默认值
      // 注意：这只是显示用，实际保存时如果用户没有修改，应该保持 undefined 以使用主题默认值
      if (initialValues.backdropBlur === undefined && themeDefaultBlur !== undefined) {
        form.setFieldValue('backdropBlur', themeDefaultBlur);
      }
    } else {
      // 没有初始值时，设置默认值
      setActiveTab('color');
      form.setFieldValue('backgroundType', 'color');
      form.setFieldValue('backgroundColor', defaultBackgroundColor);
      if (themeDefaultBlur !== undefined) {
        form.setFieldValue('backdropBlur', themeDefaultBlur);
      }
    }
  }, [initialValues, form, defaultBackgroundColor, themeDefaultBlur]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    form.setFieldValue('backgroundType', key);

    // 切换到纯色模式时，如果背景色未设置，使用默认背景色
    if (key === 'color' && !form.getFieldValue('backgroundColor')) {
      form.setFieldValue('backgroundColor', defaultBackgroundColor);
    }
  };

  const items = [
    {
      key: 'color',
      label: (
        <span>
          <BgColorsOutlined /> 纯色
        </span>
      ),
      children: (
        <Form.Item
          name="backgroundColor"
          label="选择颜色"
          tooltip="使用背景模糊时，建议设置半透明颜色（调低透明度滑块）"
        >
          <ColorPicker
            showText
            defaultFormat="rgb"
          />
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
      children: (
        <>
          {/* <Form.Item
            name="backgroundImage"
            label="图片 URL"
            tooltip="输入图片链接或上传本地图片"
          >
            <Input placeholder="https://example.com/bg.png" />
          </Form.Item> */}
          <Form.Item label="上传图片">
            <Upload
              listType="picture-card"
              maxCount={1}
              fileList={fileList}
              beforeUpload={async (file) => {
                // 验证文件类型
                const isImage = file.type.startsWith('image/');
                if (!isImage) {
                  message.error('只能上传图片文件');
                  return false;
                }

                // 验证文件大小 (10MB)
                const isLt10M = file.size / 1024 / 1024 < 10;
                if (!isLt10M) {
                  message.error('图片大小不能超过 10MB');
                  return false;
                }

                setUploading(true);
                setFileList([
                  {
                    uid: file.uid,
                    name: file.name,
                    status: 'uploading',
                  },
                ]);

                try {
                  const res = await uploadImage(file);
                  if (res.data?.url) {
                    form.setFieldValue('backgroundImage', res.data.url);
                    setFileList([
                      {
                        uid: file.uid,
                        name: file.name,
                        status: 'done',
                        url: res.data.url,
                      },
                    ]);
                    message.success('图片上传成功');
                  } else {
                    message.error(res.message || '上传失败');
                    setFileList([]);
                  }
                } catch (error) {
                  message.error('上传失败，请稍后重试');
                  setFileList([]);
                } finally {
                  setUploading(false);
                }

                return false;
              }}
              onRemove={() => {
                setFileList([]);
                form.setFieldValue('backgroundImage', '');
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
            <Form.Item name="backgroundSize" label="大小 (Size)" style={{ flex: 1 }}>
              <Select allowClear placeholder="默认(auto)">
                <Select.Option value="cover">Cover (铺满)</Select.Option>
                <Select.Option value="contain">Contain (包含)</Select.Option>
                <Select.Option value="100% 100%">100% 100% (拉伸)</Select.Option>
                <Select.Option value="auto">Auto (默认)</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="backgroundRepeat" label="重复 (Repeat)" style={{ flex: 1 }} initialValue={'no-repeat'}>
              <Select allowClear placeholder="默认(repeat)" >
                <Select.Option value="no-repeat">No Repeat (不重复)</Select.Option>
                <Select.Option value="repeat">Repeat (重复)</Select.Option>
                <Select.Option value="repeat-x">Repeat X (水平重复)</Select.Option>
                <Select.Option value="repeat-y">Repeat Y (垂直重复)</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item name="backgroundPosition" label="位置 (Position)">
            <Select allowClear placeholder="默认(0% 0%)">
              <Select.Option value="center">Center (居中)</Select.Option>
              <Select.Option value="top">Top (顶部)</Select.Option>
              <Select.Option value="bottom">Bottom (底部)</Select.Option>
              <Select.Option value="left">Left (左侧)</Select.Option>
              <Select.Option value="right">Right (右侧)</Select.Option>
              <Select.Option value="top left">Top Left (左上)</Select.Option>
              <Select.Option value="top right">Top Right (右上)</Select.Option>
              <Select.Option value="bottom left">Bottom Left (左下)</Select.Option>
              <Select.Option value="bottom right">Bottom Right (右下)</Select.Option>
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
      children: (
        <>
          <Form.Item
            name="backgroundGradient"
            label="CSS 渐变代码"
            rules={[{
              validator: (_, value) => {
                if (!value || !value.trim()) return Promise.resolve();
                if (isValidCssGradient(value)) return Promise.resolve();
                return Promise.reject(new Error('请输入有效的 CSS 渐变，如 linear-gradient(...)'));
              },
            }]}
          >
            <Input.TextArea
              rows={2}
              placeholder="linear-gradient(to right, #ff0000, #0000ff)"
            />
          </Form.Item>
          <div style={{ marginBottom: 8 }}>预设渐变:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {GRADIENT_PRESETS.map((gradient, index) => (
              <div
                key={index}
                onClick={() => form.setFieldValue('backgroundGradient', gradient)}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 4,
                  background: gradient,
                  cursor: 'pointer',
                  border: '1px solid #d9d9d9',
                }}
                title={gradient}
              />
            ))}
          </div>
        </>
      ),
    },
  ];

  return (
    <>
      <Form.Item name="backgroundType" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="backgroundImage" hidden>
        <Input />
      </Form.Item>
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
                ? `极简模式默认模糊 ${themeDefaultBlur}px，设置为 0 可禁用模糊效果`
                : '设置毛玻璃效果，值越大越模糊 (0-30px)，设置为 0 可禁用'
            }
            style={{ marginTop: 16 }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Form.Item name="backdropBlur" noStyle>
                <Slider
                  min={0}
                  max={30}
                  step={1}
                  style={{ flex: 1 }}
                />
              </Form.Item>
              <Form.Item name="backdropBlur" noStyle>
                <InputNumber
                  min={0}
                  max={30}
                  step={1}
                  style={{ width: 70 }}
                  suffix="px"
                />
              </Form.Item>
            </div>
          </Form.Item>
          <Form.Item
            name="boxShadow"
            label="阴影效果"
            tooltip="CSS box-shadow 属性，如: 0 4px 12px rgba(0,0,0,0.15)"
          >
            <Input placeholder="0 4px 12px rgba(0,0,0,0.15)" allowClear />
          </Form.Item>
        </>
      )}
    </>
  );
};

export default BackgroundSettings;
