import React from 'react';
import { Form, Input, InputNumber, Switch, Divider, Select, ColorPicker, Button } from 'antd';
import type { WidgetConfigProps } from './types';
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons"
import '../index.scss';

const CarouselConfig: React.FC<WidgetConfigProps> = () => {
  return (
    <>
      <Divider>播放设置</Divider>
      <div className="form-row-2">
        <Form.Item name="slidesPerView" label="每屏数量" initialValue={1}>
          <InputNumber min={1} max={5} precision={0} />
        </Form.Item>
        <Form.Item name="slidesPerGroup" label="滚动步长" initialValue={1}>
          <InputNumber min={1} max={5} precision={0} />
        </Form.Item>
      </div>
      <Form.Item name="spaceBetween" label="间距(px)" initialValue={16}>
        <InputNumber min={0} max={64} precision={0} />
      </Form.Item>
      <div className="form-row-2">
        <Form.Item name="speed" label="切换时长(ms)" initialValue={600}>
          <InputNumber min={100} max={5000} step={100} precision={0} />
        </Form.Item>
        <Form.Item name="effect" label="动画效果" initialValue="slide">
          <Select
            options={[
              { value: 'slide', label: '平移' },
              { value: 'fade', label: '淡入淡出' },
              { value: 'cube', label: '立方体' },
              { value: 'coverflow', label: 'Coverflow' },
              { value: 'creative', label: 'Creative' },
            ]}
          />
        </Form.Item>
      </div>
      <div className="form-row-2">
        <Form.Item name="loop" label="循环播放" valuePropName="checked" initialValue>
          <Switch />
        </Form.Item>
        <Form.Item name="centeredSlides" label="居中展示" valuePropName="checked">
          <Switch />
        </Form.Item>
      </div>
      <div className="form-row-3">
        <Form.Item name="grabCursor" label="抓手指针" valuePropName="checked" initialValue>
          <Switch />
        </Form.Item>
        <Form.Item name="allowTouchMove" label="允许拖拽" valuePropName="checked" initialValue>
          <Switch />
        </Form.Item>
        <Form.Item
          name={['autoplay', 'enabled']}
          label="自动播放"
          valuePropName="checked"
          initialValue
        >
          <Switch />
        </Form.Item>
      </div>
      <Form.Item noStyle shouldUpdate={(prev, curr) => prev?.autoplay?.enabled !== curr?.autoplay?.enabled}>
        {({ getFieldValue }) =>
          getFieldValue(['autoplay', 'enabled']) ? (
            <>
              <Form.Item name={['autoplay', 'delay']} label="播放间隔(ms)" initialValue={5000}>
                <InputNumber min={1000} max={15000} step={500} precision={0} />
              </Form.Item>
              <div className="form-row-2">
                <Form.Item
                  name={['autoplay', 'pauseOnMouseEnter']}
                  label="悬停暂停"
                  valuePropName="checked"
                  initialValue
                >
                  <Switch />
                </Form.Item>
                <Form.Item
                  name={['autoplay', 'disableOnInteraction']}
                  label="交互后停止"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </div>
            </>
          ) : null
        }
      </Form.Item>

      <Divider>导航与分页</Divider>
      <div className="form-row-3">
        <Form.Item name={['pagination', 'enabled']} label="分页器" valuePropName="checked" initialValue>
          <Switch />
        </Form.Item>
        <Form.Item name={['navigation', 'enabled']} label="左右箭头" valuePropName="checked" initialValue>
          <Switch />
        </Form.Item>
        <Form.Item name={['scrollbar', 'enabled']} label="滚动条" valuePropName="checked">
          <Switch />
        </Form.Item>
      </div>
      <Form.Item
        noStyle
        shouldUpdate={(prev, curr) => prev?.pagination?.enabled !== curr?.pagination?.enabled}
      >
        {({ getFieldValue }) =>
          getFieldValue(['pagination', 'enabled']) ? (
            <div className="form-row-2">
              <Form.Item name={['pagination', 'type']} label="分页类型" initialValue="bullets">
                <Select
                  options={[
                    { value: 'bullets', label: '圆点' },
                    { value: 'fraction', label: '分式' },
                    { value: 'progressbar', label: '进度条' },
                  ]}
                />
              </Form.Item>
              <Form.Item
                name={['pagination', 'clickable']}
                label="可点击"
                valuePropName="checked"
                initialValue
              >
                <Switch />
              </Form.Item>
            </div>
          ) : null
        }
      </Form.Item>
      <Form.Item
        noStyle
        shouldUpdate={(prev, curr) => prev?.scrollbar?.enabled !== curr?.scrollbar?.enabled}
      >
        {({ getFieldValue }) =>
          getFieldValue(['scrollbar', 'enabled']) ? (
            <Form.Item
              name={['scrollbar', 'draggable']}
              label="可拖拽"
              valuePropName="checked"
              initialValue
            >
              <Switch />
            </Form.Item>
          ) : null
        }
      </Form.Item>

      <Divider>响应式设置</Divider>
      <Form.List name="responsive">
        {(fields, { add, remove }) => (
          <div className="config-list-container">
            {fields.map(({ key, name, ...restField }) => (
              <div key={key} className="config-inline-card">
                <div className="form-row-2">
                  <Form.Item
                    {...restField}
                    name={[name, 'minWidth']}
                    label="屏宽 ≥(px)"
                    tooltip="当浏览器宽度大于等于该值时，此断点生效"
                    rules={[{ required: true, message: '请输入屏幕宽度' }]}
                  >
                    <InputNumber min={320} step={100} precision={0}/>
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'slidesPerView']} label="每屏数量" tooltip="同时可见的幻灯片数量">
                    <InputNumber min={1} max={5} precision={0}/>
                  </Form.Item>
                </div>
                <div className="form-row-2">
                  <Form.Item {...restField} name={[name, 'slidesPerGroup']} label="步长" tooltip="每次滑动切换的幻灯片数量，不填则默认为 1">
                    <InputNumber min={1} max={5} precision={0}/>
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'spaceBetween']} label="间距(px)" tooltip="相邻幻灯片之间的间距，不填则使用全局间距设置">
                    <InputNumber min={0} max={64} precision={0}/>
                  </Form.Item>
                </div>
                <div className="config-inline-actions">
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => remove(name)}
                  />
                </div>
              </div>
            ))}
            <Button
              type="dashed"
              block
              icon={<PlusOutlined />}
              onClick={() => add({ minWidth: 768, slidesPerView: 2 })}
            >
              添加断点
            </Button>
          </div>
        )}
      </Form.List>

      <Divider>展示样式</Divider>
      <div className="form-row-2">
        <Form.Item name="textAlign" label="文本对齐" initialValue="left">
          <Select
            options={[
              { value: 'left', label: '居左' },
              { value: 'center', label: '居中' },
              { value: 'right', label: '居右' },
            ]}
          />
        </Form.Item>
        <Form.Item name="buttonType" label="按钮样式" initialValue="primary">
          <Select
            options={[
              { value: 'primary', label: '主按钮' },
              { value: 'default', label: '默认' },
              { value: 'dashed', label: '虚线' },
              { value: 'link', label: '链接' },
              { value: 'text', label: '文字' },
            ]}
          />
        </Form.Item>
      </div>
      <div className="form-row-2">
        <Form.Item name="overlayStyle" label="遮罩样式" initialValue="gradient">
          <Select
            options={[
              { value: 'gradient', label: '渐变' },
              { value: 'solid', label: '纯色' },
              { value: 'none', label: '无' },
            ]}
          />
        </Form.Item>
        <Form.Item name="overlayColor" label="遮罩颜色">
          <ColorPicker showText allowClear />
        </Form.Item>
      </div>
      <Form.Item name="emptyMessage" label="空数据提示">
        <Input placeholder="暂无轮播内容" />
      </Form.Item>
    </>
  );
};

export default CarouselConfig;
