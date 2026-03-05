import React, { useState, useCallback } from 'react';
import { Input, Button, message, Select, Space } from 'antd';
import { SearchOutlined, ClearOutlined } from '@ant-design/icons';
import axios from 'axios';
import WujieReact from 'wujie-react';
import { WidgetConfig, Widget, EventRouteConfig, MicroAppEventType } from '@/types';
import './index.scss'

const { bus } = WujieReact;

/**
 * 搜索字段配置
 */
interface SearchField {
  id: string;
  name: string;          // 字段名
  label: string;         // 显示标签
  type: 'input' | 'select';  // 类型
  placeholder?: string;  // 占位符
  options?: { label: string; value: string }[];  // 选项(select类型)
  defaultValue?: string; // 默认值
}

/**
 * 搜索组件配置
 */
interface SearchWidgetConfig extends WidgetConfig {
  placeholder?: string;       // 搜索框占位符
  buttonText?: string;        // 按钮文字
  searchFields?: SearchField[];  // 多字段搜索配置
  eventRoutes?: EventRouteConfig[];  // 事件路由配置
  showClearButton?: boolean;  // 是否显示清除按钮
  layout?: 'inline' | 'vertical';  // 布局方式
  // 数据交互
  submitMethod?: 'api' | 'eventRoute';
  apiEndpoint?: string;              // API 地址
  apiMethod?: 'GET' | 'POST';       // HTTP 方法
  apiHeaders?: Record<string, string>;
}

interface SearchWidgetProps {
  config?: SearchWidgetConfig;
  widget?: Widget;
}

const SearchWidget: React.FC<SearchWidgetProps> = ({ config, widget }) => {
  // 获取配置
  const searchConfig = config as SearchWidgetConfig;
  const placeholder = searchConfig?.placeholder || '请输入搜索内容...';
  const buttonText = searchConfig?.buttonText || '搜索';
  const searchFields = searchConfig?.searchFields;
  const eventRoutes = searchConfig?.eventRoutes || [];
  const showClearButton = searchConfig?.showClearButton ?? true;
  const layout = searchConfig?.layout || 'inline';
  const submitMethod = searchConfig?.submitMethod || 'eventRoute';
  const apiEndpoint = searchConfig?.apiEndpoint;
  const apiMethod = searchConfig?.apiMethod || 'GET';
  const apiHeaders = searchConfig?.apiHeaders;

  // 简单搜索状态
  const [searchValue, setSearchValue] = useState('');

  // 多字段搜索状态
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    searchFields?.forEach(field => {
      if (field.defaultValue) {
        initial[field.name] = field.defaultValue;
      }
    });
    return initial;
  });

  // 发送搜索事件到微应用（事件路由）
  const emitSearchEvent = useCallback((searchParams: Record<string, any>) => {
    const enabledRoutes = eventRoutes.filter(route => route.enabled !== false);

    if (enabledRoutes.length === 0) {
      console.log('搜索参数:', searchParams);
      message.info('搜索参数已提交（未配置事件路由）');
      return;
    }

    const fromAppId = widget?.id || 'search-widget';

    enabledRoutes.forEach(route => {
      const targetEventType = route.toEventType || route.eventType || MicroAppEventType.DATA_QUERY;
      bus.$emit(targetEventType, {
        from: fromAppId,
        to: route.toAppId,
        type: targetEventType,
        payload: {
          action: 'search',
          data: searchParams,
        },
        timestamp: Date.now(),
      });
    });

    message.success('搜索请求已发送');
  }, [eventRoutes, widget?.id]);

  // 统一搜索处理
  const handleSearchSubmit = useCallback(async (searchParams: Record<string, any>) => {
    if (submitMethod === 'api' && apiEndpoint) {
      try {
        await axios({
          method: apiMethod,
          url: apiEndpoint,
          ...(apiMethod === 'GET' ? { params: searchParams } : { data: searchParams }),
          ...(apiHeaders ? { headers: apiHeaders } : {}),
        });
        message.success('搜索请求已发送');
      } catch (error) {
        message.error('搜索请求失败');
        console.error('搜索API请求失败:', error);
      }
    } else {
      emitSearchEvent(searchParams);
    }
  }, [submitMethod, apiEndpoint, apiMethod, apiHeaders, emitSearchEvent]);

  // 简单搜索
  const handleSimpleSearch = (value: string) => {
    if (!value.trim()) {
      message.warning('请输入搜索内容');
      return;
    }
    handleSearchSubmit({ keyword: value.trim() });
  };

  // 多字段搜索
  const handleFieldSearch = () => {
    const hasValue = Object.values(fieldValues).some(v => v && v.trim());
    if (!hasValue) {
      message.warning('请至少输入一个搜索条件');
      return;
    }

    const params: Record<string, string> = {};
    Object.entries(fieldValues).forEach(([key, value]) => {
      if (value && value.trim()) {
        params[key] = value.trim();
      }
    });

    handleSearchSubmit(params);
  };

  // 清除搜索
  const handleClear = () => {
    setSearchValue('');
    const initial: Record<string, string> = {};
    searchFields?.forEach(field => {
      if (field.defaultValue) {
        initial[field.name] = field.defaultValue;
      }
    });
    setFieldValues(initial);
  };

  // 更新字段值
  const handleFieldChange = (name: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [name]: value }));
  };

  // 简单搜索模式
  if (!searchFields || searchFields.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 20px' }}>
        <Input.Search
          placeholder={placeholder}
          allowClear
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          enterButton={<Button type="primary" icon={<SearchOutlined />}>{buttonText}</Button>}
          size="large"
          onSearch={handleSimpleSearch}
        />
      </div>
    );
  }

  // 多字段搜索模式
  const isVertical = layout === 'vertical';

  return (
    <div style={{
      display: 'flex',
      flexDirection: isVertical ? 'column' : 'row',
      alignItems: isVertical ? 'stretch' : 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '16px',
      gap: '12px',
      flexWrap: 'wrap',
    }}>
      {searchFields.map(field => (
        <div key={field.id} style={{ minWidth: isVertical ? '100%' : '150px' }}>
          {isVertical && (
            <div style={{ marginBottom: '4px', fontSize: '13px', color: '#666' }}>{field.label}</div>
          )}
          {field.type === 'select' ? (
            <Select
              placeholder={field.placeholder || `请选择${field.label}`}
              value={fieldValues[field.name] || undefined}
              onChange={value => handleFieldChange(field.name, value)}
              style={{ width: '100%' }}
              allowClear
              options={field.options}
            />
          ) : (
            <Input
              placeholder={field.placeholder || `请输入${field.label}`}
              value={fieldValues[field.name] || ''}
              onChange={e => handleFieldChange(field.name, e.target.value)}
              onPressEnter={handleFieldSearch}
            />
          )}
        </div>
      ))}
      <Space>
        <Button type="primary" icon={<SearchOutlined />} onClick={handleFieldSearch}>
          {buttonText}
        </Button>
        {showClearButton && (
          <Button icon={<ClearOutlined />} onClick={handleClear}>
            清除
          </Button>
        )}
      </Space>
    </div>
  );
};

export default SearchWidget;
