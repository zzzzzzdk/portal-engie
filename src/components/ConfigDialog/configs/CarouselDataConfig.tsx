import React, { useState } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Divider,
  ColorPicker,
  Upload,
  message,
} from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined, LoadingOutlined } from '@ant-design/icons';
import type { WidgetConfigProps } from './types';
import { MAX_REFRESH_INTERVAL } from '@/constants/dashboard';
import { JUMP_SYSTEM_OPTIONS } from '@/constants/jumpSystem';
import WidgetApiDebugButton from '@/components/WidgetApiDebugButton';
import WidgetApiConfigTabs from '@/components/WidgetApiConfigTabs';
import {
  DEFAULT_CAROUSEL_LIST_FIELD,
  getWidgetApiEndpointPlaceholder,
} from '@/utils/widgetApiDefaults';
import '../index.scss';
import { keyValueListToObject } from '@/utils/widgetApi';
import { uploadImage } from '@/services';

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

  return (
    <>
      <Form.Item name="dataSourceType" label="数据来源" initialValue="static">
        <Select
          options={[
            { label: '静态列表', value: 'static' },
            { label: '接口数据', value: 'api' },
          ]}
        />
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
                            <span>{'轮播项' + (name + 1)}</span>
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
              <Form.Item label="接口地址" required className="widget-api-form-item">
                <div className="widget-api-endpoint-row">
                  <Form.Item name={['apiConfig', 'method']} noStyle initialValue="GET">
                    <Select
                      className="widget-api-endpoint-row__method"
                      options={[
                        { value: 'GET', label: 'GET' },
                        { value: 'POST', label: 'POST' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item
                    name={['apiConfig', 'endpoint']}
                    noStyle
                    rules={[{ required: true, message: '请输入接口地址' }]}
                  >
                    <Input
                      className="widget-api-endpoint-row__input"
                      placeholder={getWidgetApiEndpointPlaceholder('carousel')}
                    />
                  </Form.Item>
                </div>
              </Form.Item>
              <Form.Item
                name={['apiConfig', 'listField']}
                label="列表字段路径"
                tooltip="默认按 data.carousel.items 取值；修改后按填写路径取值。"
              >
                <Input placeholder={DEFAULT_CAROUSEL_LIST_FIELD} />
              </Form.Item>
              <Form.Item label="参数配置" className="widget-api-form-item">
                <WidgetApiConfigTabs
                  form={form}
                  methodName={['apiConfig', 'method']}
                  headersName={['apiConfig', 'headersList']}
                  queryName={['apiConfig', 'queryParamsList']}
                  bodyName={['apiConfig', 'bodyParamsList']}
                  debugContent={
                    <WidgetApiDebugButton
                      form={form}
                      buildConfig={formValues => {
                        const apiConfig = formValues.apiConfig || {};
                        return {
                          endpoint: apiConfig.endpoint,
                          method: apiConfig.method || 'GET',
                          headers: buildHeaders(apiConfig.headersList),
                          query: keyValueListToObject(apiConfig.queryParamsList),
                          body: keyValueListToObject(apiConfig.bodyParamsList),
                          listField: apiConfig.listField || DEFAULT_CAROUSEL_LIST_FIELD,
                        };
                      }}
                    />
                  }
                  debugHint="调试时将使用当前轮播图的接口地址、参数配置和列表路径。"
                />
              </Form.Item>

              <Divider>字段配置</Divider>
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
