import React, { useEffect, useState } from 'react';
import { Form, Input, Tabs, ColorPicker, Upload, Select, App as AntdApp, Slider, InputNumber } from 'antd';
import { BgColorsOutlined, PictureOutlined, UploadOutlined, LoadingOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd/es/form';
import { uploadImage } from '@/services';

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

interface BackgroundSettingsProps {
  form: FormInstance;
  initialValues?: {
    backgroundType?: 'color' | 'image' | 'gradient';
    backgroundColor?: string;
    backgroundImage?: string;
    backgroundGradient?: string;
    backdropBlur?: number;  // 背景模糊度 (px)
  };
}

const BackgroundSettings: React.FC<BackgroundSettingsProps> = ({ form, initialValues }) => {
  const [activeTab, setActiveTab] = useState<string>('color');
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const { message } = AntdApp.useApp();

  useEffect(() => {
    if (initialValues) {
      const type = initialValues.backgroundType || 'color';
      setActiveTab(type);
      form.setFieldValue('backgroundType', type);

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
      }
    }
  }, [initialValues, form]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    form.setFieldValue('backgroundType', key);
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
            format="rgb"
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
          <Form.Item name="backgroundGradient" label="CSS 渐变代码">
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
      <Form.Item
        label="背景模糊"
        tooltip="设置毛玻璃效果，值越大越模糊 (0-20px)"
        style={{ marginTop: 16 }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Form.Item name="backdropBlur" noStyle>
            <Slider
              min={0}
              max={20}
              step={1}
              style={{ flex: 1 }}
            />
          </Form.Item>
          <Form.Item name="backdropBlur" noStyle>
            <InputNumber
              min={0}
              max={20}
              step={1}
              style={{ width: 70 }}
              suffix="px"
            />
          </Form.Item>
        </div>
      </Form.Item>
    </>
  );
};

export default BackgroundSettings;
