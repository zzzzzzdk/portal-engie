import React from 'react';
import { Form, Divider } from 'antd';
import EventRouteConfig from '@/components/EventRouteConfig';
import { WidgetConfigProps } from './types';

/**
 * 搜索组件配置 - 事件路由配置
 */
const SearchConfig: React.FC<WidgetConfigProps> = ({ widget }) => {
  return (
    <>
      <Divider>事件路由配置</Divider>
      <Form.Item
        name="eventRoutes"
        label="事件路由"
        tooltip="配置搜索结果发送到哪个微应用"
      >
        <EventRouteConfig
          currentWidgetId={widget.id}
          currentSystemId={undefined}
          currentModuleId={undefined}
        />
      </Form.Item>
    </>
  );
};

export default SearchConfig;
