import React, { useState, useCallback, useEffect } from 'react';
import { Input, Button, message, Select, Space } from 'antd';
import { SearchOutlined, ClearOutlined } from '@ant-design/icons';
import axios from 'axios';
import WujieReact from 'wujie-react';
import { WidgetConfig, Widget, EventRouteConfig, MicroAppEventType } from '@/types';
import { parseJsonConfig } from '@/utils/widgetApi';
import { useGlobalConfigStore } from '@/store/useGlobalConfigStore';
import { getGlobalMessageCopy } from '@/utils/global-config';
import './index.scss';

const { bus } = WujieReact;

/**
 * 搜索字段配置
 */
interface SearchField {
  id: string;
  name: string;
  label: string;
  type: 'input' | 'select';
  placeholder?: string;
  options?: { label: string; value: string }[];
  defaultValue?: string;
}

/**
 * 搜索组件配置
 */
interface SearchWidgetConfig extends WidgetConfig {
  placeholder?: string;
  buttonText?: string;
  searchFields?: SearchField[];
  eventRoutes?: EventRouteConfig[];
  showClearButton?: boolean;
  layout?: 'inline' | 'vertical';
  submitMethod?: 'api' | 'eventRoute';
  apiEndpoint?: string;
  apiMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  apiHeaders?: Record<string, string>;
  apiQuery?: string | Record<string, any>;
  apiBody?: string | Record<string, any>;
}

interface SearchWidgetProps {
  config?: SearchWidgetConfig;
  widget?: Widget;
}

const SearchWidget: React.FC<SearchWidgetProps> = ({ config, widget }) => {
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
  const apiQuery = searchConfig?.apiQuery;
  const apiBody = searchConfig?.apiBody;
  const globalConfigDetail = useGlobalConfigStore(state => state.detail);
  const ensureGlobalConfigLoaded = useGlobalConfigStore(state => state.ensureLoaded);
  const successMessage =
    searchConfig?.successMessage || getGlobalMessageCopy(globalConfigDetail, 'form.success');
  const failureMessage =
    searchConfig?.failureMessage || getGlobalMessageCopy(globalConfigDetail, 'form.error');

  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    if (!searchConfig?.successMessage || !searchConfig?.failureMessage) {
      void ensureGlobalConfigLoaded();
    }
  }, [ensureGlobalConfigLoaded, searchConfig?.failureMessage, searchConfig?.successMessage]);

  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    searchFields?.forEach(field => {
      if (field.defaultValue) {
        initial[field.name] = field.defaultValue;
      }
    });
    return initial;
  });

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

    message.success(successMessage);
  }, [eventRoutes, successMessage, widget?.id]);

  const buildApiQuery = useCallback((searchParams: Record<string, any>) => {
    const configuredQuery = parseJsonConfig(apiQuery);

    if (configuredQuery && typeof configuredQuery === 'object' && !Array.isArray(configuredQuery)) {
      return apiMethod === 'GET'
        ? {
            ...configuredQuery,
            ...searchParams,
          }
        : configuredQuery;
    }

    return apiMethod === 'GET' ? searchParams : undefined;
  }, [apiMethod, apiQuery]);

  const buildApiPayload = useCallback((searchParams: Record<string, any>) => {
    const configuredBody = parseJsonConfig(apiBody);

    if (configuredBody && typeof configuredBody === 'object' && !Array.isArray(configuredBody)) {
      return {
        ...configuredBody,
        ...searchParams,
      };
    }

    return searchParams;
  }, [apiBody]);

  const handleSearchSubmit = useCallback(async (searchParams: Record<string, any>) => {
    if (submitMethod === 'api' && apiEndpoint) {
      try {
        const requestQuery = buildApiQuery(searchParams);
        const requestPayload = buildApiPayload(searchParams);
        await axios({
          method: apiMethod,
          url: apiEndpoint,
          ...(requestQuery ? { params: requestQuery } : {}),
          ...(apiMethod === 'GET' ? {} : { data: requestPayload }),
          ...(apiHeaders ? { headers: apiHeaders } : {}),
        });
        message.success(successMessage);
      } catch (error) {
        message.error(failureMessage);
        console.error('搜索 API 请求失败:', error);
      }
    } else {
      emitSearchEvent(searchParams);
    }
  }, [submitMethod, apiEndpoint, apiMethod, apiHeaders, buildApiQuery, buildApiPayload, emitSearchEvent, failureMessage, successMessage]);

  const handleSimpleSearch = (value: string) => {
    if (!value.trim()) {
      message.warning('请输入搜索内容');
      return;
    }
    handleSearchSubmit({ keyword: value.trim() });
  };

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

  const handleFieldChange = (name: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [name]: value }));
  };

  if (!searchFields || searchFields.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 20px' }}>
        <Input.Search
          placeholder={placeholder}
          allowClear
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          enterButton={<Button type="primary" icon={<SearchOutlined />}>{buttonText}</Button>}
          onSearch={handleSimpleSearch}
        />
      </div>
    );
  }

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
