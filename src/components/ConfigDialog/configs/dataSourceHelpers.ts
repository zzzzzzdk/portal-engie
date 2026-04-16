import type { DataSourceItem } from '@/services/dataSource';
import type { WidgetApiFieldMeta } from '@/utils/widgetApiDefaults';

interface KeyValueItem {
  key?: string;
  value?: string;
}

interface BuildDataSourceSelectionFormValuesOptions {
  apiFieldName?: WidgetApiFieldMeta['name'];
  includePagination?: boolean;
}

export const UNIFIED_DATA_SOURCE_OPTIONS = [
  { label: '手动配置', value: 'static' },
  { label: '自定义接口', value: 'customApi' },
  { label: '数据源接口', value: 'dataSource' },
] as const;

export const normalizeDataSourceMode = (value?: string) => {
  if (value === 'api') {
    return 'customApi';
  }

  if (value === 'static' || value === 'customApi' || value === 'dataSource') {
    return value;
  }

  return undefined;
};

export const validateJson = (_: any, value: string) => {
  if (!value) {
    return Promise.resolve();
  }

  try {
    JSON.parse(value);
    return Promise.resolve();
  } catch {
    return Promise.reject(new Error('请输入合法的 JSON 格式'));
  }
};

export const buildHeaderMap = (headersList?: KeyValueItem[]) => {
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

export const cloneKeyValueItems = (items?: KeyValueItem[]) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map(item => ({
    key: item?.key || '',
    value: item?.value || '',
  }));
};

export const buildDataSourceSelectionFormValues = (
  dataSource: DataSourceItem,
  options: BuildDataSourceSelectionFormValuesOptions = {},
) => {
  const pagination = dataSource.requestConfig?.pagination;

  return {
    dataSourceId: dataSource.id,
    apiEndpoint: dataSource.url,
    apiMethod: dataSource.method,
    apiHeadersList: cloneKeyValueItems(dataSource.requestConfig?.headersList),
    apiQueryList: cloneKeyValueItems(dataSource.requestConfig?.queryList),
    apiBodyList: cloneKeyValueItems(dataSource.requestConfig?.bodyList),
    timeout: dataSource.timeout ? dataSource.timeout * 1000 : undefined,
    ...(options.apiFieldName
      ? {
        apiDataField: undefined,
        apiListField: undefined,
        [options.apiFieldName]: dataSource.listField || '',
      }
      : {}),
    ...(options.includePagination
      ? {
        paginationMode: pagination?.mode === 'pagination' ? 'pagination' : 'none',
        paginationConfig: pagination
          ? {
            page: pagination.page || 1,
            pageSize: pagination.pageSize || 10,
            pageParam: pagination.pageParam,
            pageSizeParam: pagination.pageSizeParam,
            totalField: pagination.totalField,
            currentField: pagination.currentField,
            pageSizeField: pagination.pageSizeField,
            showTotal: pagination.showTotal ?? false,
          }
          : undefined,
      }
      : {}),
  };
};
