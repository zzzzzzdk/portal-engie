import React, { useState } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Button,
  Divider,
  ColorPicker,
  Upload,
  Space,
  message,
} from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined, LoadingOutlined } from '@ant-design/icons';
import type { WidgetConfigProps } from './types';
import { MAX_REFRESH_INTERVAL } from '@/constants/dashboard';
import { JUMP_SYSTEM_OPTIONS } from '@/constants/jumpSystem';
import WidgetApiDebugButton from '@/components/WidgetApiDebugButton';
import {
  DEFAULT_CAROUSEL_LIST_FIELD,
  getWidgetApiEndpointPlaceholder,
} from '@/utils/widgetApiDefaults';
import '../index.scss';
import { uploadImage } from '@/services';

const validateJson = (_: any, value: string) => {
  if (!value) {
    return Promise.resolve();
  }

  try {
    JSON.parse(value);
    return Promise.resolve();
  } catch {
    return Promise.reject('请输入合法的 JSON 格式');
  }
};

const buildHeaders = (headersList?: Array<{ key?: string; value?: string }>) => {
  if (!Array.isArray(headersList)) {
    return undefined;
  }

  const headers = headersList.reduce<Record<string, string>>((result, item) => {
    const key = item?.key?.trim();
    if (key) {
      result[key] = item.value || '';
    }
    return result;
  }, {});

  return Object.keys(headers).length ? headers : undefined;
};

const CarouselDataConfig: React.FC<WidgetConfigProps> = ({ form }) => {
  const [uploadingIndex, setUploadingIndex] = useState<string | null>(null);
  const apiMethod = Form.useWatch(['apiConfig', 'method'], form) || 'GET';

  return (
    <>
      <Form.Item name="dataSourceType" label="数据来源" initialValue="static">
        <Radio.Group optionType="button">
          <Radio.Button value="static">静态列表</Radio.Button>
          <Radio.Button value="api">接口数据</Radio.Button>
        </Radio.Group>
      </Form.Item>

      <Form.Item noStyle shouldUpdate={(prev, curr) => prev.dataSourceType !== curr.dataSourceType}>
        {({ getFieldValue }) => {
          const sourceType = getFieldValue('dataSourceType') || 'static';

          if (sourceType === 'static') {
            return (
              <>
                <Divider>静态列表</Divider>
                <Form.List name="slides">
                  {(fields, { add, remove }) => (
                    <div className="config-list-container">
                      {fields.map(({ key, name, ...restField }) => (
                        <div key={key} className="config-item-card">
                          <div
                            className="card-header"
                            onClick={event => {
                              event.stopPropagation();
                              event.currentTarget.parentElement?.classList.toggle('expanded');
                            }}
                          >
                            <span>轮播项 {name + 1}</span>
                            <div className="header-actions">
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={event => {
                                  event.stopPropagation();
                                  remove(name);
                                }}
                              />
                            </div>
                          </div>
                          <div className="card-body">
                            <Form.Item
                              {...restField}
                              name={[name, 'title']}
                              label="标题"
                              rules={[{ required: true, message: '请输入标题' }]}
                            >
                              <Input placeholder="轮播标题" />
                            </Form.Item>
                            <div className="form-row-2">
                              <Form.Item {...restField} name={[name, 'subtitle']} label="副标题">
                                <Input placeholder="副标题（可选）" />
                              </Form.Item>
                              <Form.Item {...restField} name={[name, 'badge']} label="角标文案">
                                <Input placeholder="New" />
                              </Form.Item>
                            </div>
                            <Form.Item {...restField} name={[name, 'description']} label="描述">
                              <Input.TextArea rows={2} placeholder="描述信息（可选）" />
                            </Form.Item>
                            <Form.Item
                              {...restField}
                              name={[name, 'imageUrl']}
                              label="图片地址 / 上传"
                              rules={[{ required: true, message: '请提供图片' }]}
                            >
                              <Input placeholder="https://example.com/banner.png" />
                            </Form.Item>
                            <Upload
                              showUploadList={false}
                              accept=".jpg,.jpeg,.png,.gif,.bmp,.webp,.svg"
                              beforeUpload={async file => {
                                const isImage = file.type.startsWith('image/');
                                if (!isImage) {
                                  message.error('只能上传图片文件');
                                  return false;
                                }

                                const isLt10M = file.size / 1024 / 1024 < 10;
                                if (!isLt10M) {
                                  message.error('图片大小不能超过 10MB');
                                  return false;
                                }

                                setUploadingIndex(key.toString());
                                try {
                                  const res = await uploadImage(file);
                                  if (res.data?.url) {
                                    form.setFieldValue(['slides', name, 'imageUrl'], res.data.url);
                                  }
                                } finally {
                                  setUploadingIndex(null);
                                }
                                return false;
                              }}
                            >
                              <Button
                                icon={
                                  uploadingIndex === key.toString()
                                    ? <LoadingOutlined />
                                    : <UploadOutlined />
                                }
                                loading={uploadingIndex === key.toString()}
                                style={{ marginBottom: 12 }}
                              >
                                {uploadingIndex === key.toString() ? '上传中' : '上传图片'}
                              </Button>
                            </Upload>
                            <div className="form-row-2">
                              <Form.Item {...restField} name={[name, 'link']} label="点击跳转">
                                <Input placeholder="https://example.com" />
                              </Form.Item>
                              <Form.Item {...restField} name={[name, 'buttonText']} label="按钮文案">
                                <Input placeholder="查看详情" />
                              </Form.Item>
                            </div>
                            <div className="form-row-2">
                              <Form.Item {...restField} name={[name, 'buttonLink']} label="按钮链接">
                                <Input placeholder="https://example.com/action" />
                              </Form.Item>
                              <Form.Item {...restField} name={[name, 'badgeColor']} label="角标颜色">
                                <ColorPicker showText allowClear />
                              </Form.Item>
                            </div>
                            <Form.Item
                              {...restField}
                              name={[name, 'systemId']}
                              label="所属系统"
                              dependencies={[
                                ['slides', name, 'link'],
                                ['slides', name, 'buttonLink'],
                              ]}
                              rules={[
                                {
                                  validator: async (_, value) => {
                                    const slide = form.getFieldValue(['slides', name]) || {};
                                    if (!slide.link && !slide.buttonLink) {
                                      return Promise.resolve();
                                    }

                                    if (value) {
                                      return Promise.resolve();
                                    }

                                    return Promise.reject(new Error('请选择所属系统'));
                                  },
                                },
                              ]}
                            >
                              <Select
                                placeholder="请选择所属系统"
                                options={JUMP_SYSTEM_OPTIONS}
                                allowClear
                              />
                            </Form.Item>
                            <Form.Item {...restField} name={[name, 'overlayColor']} label="遮罩颜色">
                              <ColorPicker showText allowClear />
                            </Form.Item>
                          </div>
                        </div>
                      ))}
                      <Button
                        type="dashed"
                        block
                        icon={<PlusOutlined />}
                        onClick={() =>
                          add({
                            title: '新增轮播项',
                            description: '',
                            imageUrl: '',
                            buttonText: '查看详情',
                          })
                        }
                      >
                        添加轮播项
                      </Button>
                    </div>
                  )}
                </Form.List>
              </>
            );
          }

          return (
            <>
              <Divider>接口配置</Divider>
              <Form.Item
                name={['apiConfig', 'endpoint']}
                label="接口地址"
                rules={[{ required: true, message: '请输入接口地址' }]}
              >
                <Input placeholder={getWidgetApiEndpointPlaceholder('carousel')} />
              </Form.Item>
              <div className="form-row-2">
                <Form.Item name={['apiConfig', 'method']} label="请求方式" initialValue="GET">
                  <Select
                    options={[
                      { value: 'GET', label: 'GET' },
                      { value: 'POST', label: 'POST' },
                    ]}
                  />
                </Form.Item>
                <Form.Item
                  name={['apiConfig', 'listField']}
                  label="列表字段路径"
                  tooltip="默认按 data.carousel.items 取值；修改后按填写路径取值。"
                >
                  <Input placeholder={DEFAULT_CAROUSEL_LIST_FIELD} />
                </Form.Item>
              </div>
              <Form.Item label="请求头" tooltip="自定义 HTTP 请求头，如 Authorization、Content-Type 等">
                <Form.List name={['apiConfig', 'headersList']}>
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...restField }) => (
                        <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                          <Form.Item
                            {...restField}
                            name={[name, 'key']}
                            noStyle
                            rules={[{ required: true, message: '请输入 Key' }]}
                          >
                            <Input placeholder="Header Key" style={{ width: 160 }} />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, 'value']}
                            noStyle
                            rules={[{ required: true, message: '请输入 Value' }]}
                          >
                            <Input placeholder="Header Value" style={{ width: 200 }} />
                          </Form.Item>
                          <DeleteOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                        </Space>
                      ))}
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} size="small">
                        添加请求头
                      </Button>
                    </>
                  )}
                </Form.List>
              </Form.Item>
              {apiMethod === 'GET' && (
                <Form.Item
                  name={['apiConfig', 'queryParams']}
                  label="Query 参数(JSON)"
                  tooltip="GET 请求时会拼接到 URL query 中"
                  rules={[{ validator: validateJson }]}
                >
                  <Input.TextArea
                    rows={4}
                    placeholder='{"scene": "portal"}'
                    style={{ fontFamily: 'monospace' }}
                  />
                </Form.Item>
              )}
              {apiMethod === 'POST' && (
                <Form.Item
                  name={['apiConfig', 'bodyParams']}
                  label="Body 参数(JSON)"
                  tooltip="POST 请求体，请输入合法的 JSON 格式"
                  rules={[{ validator: validateJson }]}
                >
                  <Input.TextArea
                    rows={4}
                    placeholder='{"scene": "portal"}'
                    style={{ fontFamily: 'monospace' }}
                  />
                </Form.Item>
              )}
              <div style={{ marginBottom: 12 }}>
                <WidgetApiDebugButton
                  form={form}
                  buildConfig={formValues => {
                    const apiConfig = formValues.apiConfig || {};
                    return {
                      endpoint: apiConfig.endpoint,
                      method: apiConfig.method || 'GET',
                      headers: buildHeaders(apiConfig.headersList),
                      query: apiConfig.queryParams ?? apiConfig.params,
                      body: apiConfig.bodyParams ?? apiConfig.body,
                      listField: apiConfig.listField || DEFAULT_CAROUSEL_LIST_FIELD,
                    };
                  }}
                />
              </div>
              <div className="form-row-3">
                <Form.Item name={['apiConfig', 'mapping', 'titleField']} label="标题字段">
                  <Input placeholder="title" />
                </Form.Item>
                <Form.Item name={['apiConfig', 'mapping', 'subtitleField']} label="副标题字段">
                  <Input placeholder="subtitle" />
                </Form.Item>
                <Form.Item name={['apiConfig', 'mapping', 'descriptionField']} label="描述字段">
                  <Input placeholder="description" />
                </Form.Item>
              </div>
              <div className="form-row-3">
                <Form.Item name={['apiConfig', 'mapping', 'imageField']} label="图片字段">
                  <Input placeholder="imageUrl" />
                </Form.Item>
                <Form.Item name={['apiConfig', 'mapping', 'linkField']} label="跳转字段">
                  <Input placeholder="link" />
                </Form.Item>
                <Form.Item name={['apiConfig', 'mapping', 'buttonTextField']} label="按钮字段">
                  <Input placeholder="buttonText" />
                </Form.Item>
              </div>
              <div className="form-row-3">
                <Form.Item name={['apiConfig', 'mapping', 'badgeField']} label="角标字段">
                  <Input placeholder="badge" />
                </Form.Item>
                <Form.Item name="refreshInterval" label="刷新间隔(秒)">
                  <InputNumber
                    min={0}
                    max={MAX_REFRESH_INTERVAL}
                    step={5}
                    style={{ width: '100%' }}
                    placeholder="0 表示不自动刷新"
                  />
                </Form.Item>
                <div />
              </div>
            </>
          );
        }}
      </Form.Item>
    </>
  );
};

export default CarouselDataConfig;
