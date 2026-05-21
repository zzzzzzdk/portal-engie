import dayjs, { Dayjs } from 'dayjs';
import {
  QueryFilterFieldConfig,
  QueryFilterFieldType,
  QueryFilterOptionItem,
  QueryFilterRequestConfig,
} from '@/types';
import {
  getValueByPath,
  keyValueListToJsonString,
  parseJsonConfig,
} from '@/utils/widgetApi';

export const QUERY_FILTER_INPUT_NUMBER_MAX_PRECISION = 6;
export const QUERY_FILTER_FIELD_NAME_MAX_LENGTH = 50;

const isEmptyValue = (value: unknown) => {
  if (value == null) {
    return true;
  }

  if (typeof value === 'string') {
    return !value.trim();
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
};

const QUERY_FILTER_FIELD_DEFAULTS: Record<QueryFilterFieldType, Partial<QueryFilterFieldConfig>> = {
  input: {
    label: '输入框',
    field: 'input_field',
    type: 'input',
  },
  checkboxGroup: {
    label: '复选按钮组',
    field: 'checkbox_group',
    type: 'checkboxGroup',
    direction: 'horizontal',
    dataSourceType: 'manual',
  },
  cascader: {
    label: '级联选择器',
    field: 'cascader_field',
    type: 'cascader',
    dataMode: 'json',
  },
  datePicker: {
    label: '日期选择框',
    field: 'date_field',
    type: 'datePicker',
    pickerType: 'date',
  },
  inputNumber: {
    label: '数字输入框',
    field: 'number_field',
    type: 'inputNumber',
  },
  radioGroup: {
    label: '单选按钮组',
    field: 'radio_group',
    type: 'radioGroup',
    direction: 'horizontal',
    dataSourceType: 'manual',
  },
  select: {
    label: '下拉选择器',
    field: 'select_field',
    type: 'select',
    mode: 'single',
    showSearch: false,
    maxTagCount: 'responsive',
    dataSourceType: 'manual',
  },
};

const clampQueryFilterInputNumberPrecision = (precision?: number) => {
  if (typeof precision !== 'number' || !Number.isFinite(precision)) {
    return undefined;
  }

  return Math.min(
    Math.max(Math.trunc(precision), 0),
    QUERY_FILTER_INPUT_NUMBER_MAX_PRECISION,
  );
};

const normalizeQueryFilterSelectMaxTagCount = (
  maxTagCount?: QueryFilterFieldConfig['maxTagCount'],
) => {
  if (maxTagCount === 'responsive') {
    return maxTagCount;
  }

  if (typeof maxTagCount !== 'number' || !Number.isFinite(maxTagCount)) {
    return undefined;
  }

  return Math.max(Math.trunc(maxTagCount), 1);
};

export const hydrateQueryFilterFields = (fields?: QueryFilterFieldConfig[]) => {
  if (!Array.isArray(fields)) {
    return [];
  }

  return fields.map((field, index) => {
    const type = (field?.type || 'input') as QueryFilterFieldType;
    const defaults = QUERY_FILTER_FIELD_DEFAULTS[type] || QUERY_FILTER_FIELD_DEFAULTS.input;
    const nextLabel = field?.label?.trim();
    const nextField = field?.field?.trim();

    return {
      ...defaults,
      ...field,
      id: field?.id || `query-filter-field-${type}-${index + 1}`,
      type,
      label: nextLabel || `${defaults.label || '字段'}${index + 1}`,
      field: nextField || `${defaults.field || 'field'}_${index + 1}`,
      precision: type === 'inputNumber'
        ? clampQueryFilterInputNumberPrecision(field?.precision)
        : field?.precision,
    } as QueryFilterFieldConfig;
  });
};

const normalizeRequestConfig = (requestConfig?: QueryFilterRequestConfig) => {
  if (!requestConfig) {
    return undefined;
  }

  const headers = Array.isArray(requestConfig.headersList)
    ? requestConfig.headersList.reduce<Record<string, string>>((result, item) => {
      const key = item?.key?.trim();
      if (key) {
        result[key] = item?.value || '';
      }
      return result;
    }, {})
    : requestConfig.headers;

  const normalized: QueryFilterRequestConfig = {
    endpoint: requestConfig.endpoint?.trim() || undefined,
    method: requestConfig.method || 'GET',
    headers: headers && Object.keys(headers).length ? headers : undefined,
    query: 'queryList' in requestConfig
      ? keyValueListToJsonString(requestConfig.queryList)
      : typeof requestConfig.query === 'string'
        ? requestConfig.query.trim() || undefined
        : requestConfig.query,
    listField: requestConfig.listField?.trim() || undefined,
    labelField: requestConfig.labelField?.trim() || undefined,
    valueField: requestConfig.valueField?.trim() || undefined,
    childrenField: requestConfig.childrenField?.trim() || undefined,
  };

  if ((normalized.method || 'GET') !== 'GET') {
    normalized.body = 'bodyList' in requestConfig
      ? keyValueListToJsonString(requestConfig.bodyList)
      : typeof requestConfig.body === 'string'
        ? requestConfig.body.trim() || undefined
        : requestConfig.body;
  }

  return normalized;
};

const normalizeOptions = (options?: QueryFilterOptionItem[]) => {
  if (!Array.isArray(options)) {
    return undefined;
  }

  const normalized = options
    .map(item => ({
      label: item?.label?.trim() || '',
      value: typeof item?.value === 'string' ? item.value.trim() : item?.value,
    }))
    .filter(item => item.label && item.value !== undefined && item.value !== '');

  return normalized.length ? normalized : undefined;
};

const normalizeDefaultValue = (field: QueryFilterFieldConfig) => {
  const { defaultValue } = field;

  if (defaultValue == null || defaultValue === '') {
    return undefined;
  }

  if (field.type === 'inputNumber') {
    const nextValue = typeof defaultValue === 'number' ? defaultValue : Number(defaultValue);
    return Number.isFinite(nextValue) ? nextValue : undefined;
  }

  if (dayjs.isDayjs(defaultValue)) {
    return (defaultValue as Dayjs).format('YYYY-MM-DD');
  }

  if (
    Array.isArray(defaultValue) &&
    defaultValue.every(item => dayjs.isDayjs(item))
  ) {
    return defaultValue.map(item => (item as Dayjs).format('YYYY-MM-DD'));
  }

  if (typeof defaultValue === 'string') {
    const text = defaultValue.trim();
    return text || undefined;
  }

  return defaultValue;
};

export const normalizeQueryFilterFields = (fields?: QueryFilterFieldConfig[]) => {
  const hydratedFields = hydrateQueryFilterFields(fields);

  if (!hydratedFields.length) {
    return [];
  }

  const placeholderFieldTypes = ['input', 'select', 'datePicker', 'inputNumber'];

  return hydratedFields.map(field => {
    const normalizedField: QueryFilterFieldConfig = {
      ...field,
      label: field.label?.trim() || '',
      field: field.field?.trim() || '',
      placeholder: placeholderFieldTypes.includes(field.type)
        ? field.placeholder?.trim() || undefined
        : undefined,
      rangeStartPlaceholder:
        field.type === 'datePicker' && field.pickerType === 'range'
          ? field.rangeStartPlaceholder?.trim() || undefined
          : undefined,
      rangeEndPlaceholder:
        field.type === 'datePicker' && field.pickerType === 'range'
          ? field.rangeEndPlaceholder?.trim() || undefined
          : undefined,
      defaultValue: normalizeDefaultValue(field),
      maxLength: typeof field.maxLength === 'number' ? field.maxLength : undefined,
      addonBefore: field.addonBefore?.trim() || undefined,
      addonAfter: field.addonAfter?.trim() || undefined,
      min: typeof field.min === 'number' ? field.min : undefined,
      max: typeof field.max === 'number' ? field.max : undefined,
      precision: typeof field.precision === 'number' ? field.precision : undefined,
      unit: field.unit?.trim() || undefined,
      direction: field.direction || 'horizontal',
      mode: field.mode || 'single',
      showSearch: field.showSearch ?? false,
      maxTagCount: normalizeQueryFilterSelectMaxTagCount(field.maxTagCount),
      pickerType: field.pickerType || 'date',
      disablePastDates: field.disablePastDates ?? false,
      dataSourceType: field.dataSourceType || 'manual',
      dataMode: field.dataMode || 'json',
      jsonData: field.jsonData?.trim() || undefined,
    };

    normalizedField.layoutCols = undefined;

    if (['checkboxGroup', 'radioGroup', 'select'].includes(field.type)) {
      if (normalizedField.dataSourceType === 'manual') {
        normalizedField.manualOptions = normalizeOptions(field.manualOptions);
        normalizedField.requestConfig = undefined;
      } else {
        normalizedField.manualOptions = undefined;
        normalizedField.requestConfig = normalizeRequestConfig(field.requestConfig);
      }
    } else if (field.type === 'cascader') {
      if (normalizedField.dataMode === 'json') {
        normalizedField.requestConfig = undefined;
      } else {
        normalizedField.requestConfig = normalizeRequestConfig(field.requestConfig);
      }
    } else {
      normalizedField.manualOptions = undefined;
      normalizedField.requestConfig = undefined;
      normalizedField.jsonData = undefined;
      normalizedField.dataMode = undefined;
      normalizedField.dataSourceType = undefined;
    }

    if (field.type !== 'input') {
      normalizedField.maxLength = undefined;
      normalizedField.addonBefore = undefined;
      normalizedField.addonAfter = undefined;
    }

    if (field.type !== 'inputNumber') {
      normalizedField.min = undefined;
      normalizedField.max = undefined;
      normalizedField.precision = undefined;
      normalizedField.unit = undefined;
    }

    if (field.type !== 'datePicker') {
      normalizedField.pickerType = undefined;
      normalizedField.disablePastDates = undefined;
    }

    if (!['checkboxGroup', 'radioGroup'].includes(field.type)) {
      normalizedField.direction = undefined;
    }

    if (field.type !== 'select') {
      normalizedField.mode = undefined;
      normalizedField.showSearch = undefined;
      normalizedField.maxTagCount = undefined;
    } else if (field.mode !== 'multiple') {
      normalizedField.maxTagCount = undefined;
    }

    return normalizedField;
  });
};

const parseArrayValue = (value: any) => {
  const parsed = parseJsonConfig(value);
  return Array.isArray(parsed) ? parsed : undefined;
};

const parseDateValue = (value: unknown) => {
  if (value == null || value === '') {
    return undefined;
  }

  const parsed = dayjs(String(value));
  return parsed.isValid() ? parsed : undefined;
};

export const parseQueryFilterDefaultValue = (field: QueryFilterFieldConfig) => {
  const raw = field.defaultValue;

  if (raw == null || raw === '') {
    return undefined;
  }

  if (field.type === 'inputNumber') {
    return typeof raw === 'number' ? raw : Number(raw);
  }

  if (field.type === 'datePicker') {
    if (field.pickerType === 'range') {
      const rangeValue = parseArrayValue(raw);
      if (!rangeValue || rangeValue.length !== 2) {
        return undefined;
      }
      const parsedRangeValue = rangeValue.map(item => parseDateValue(item));
      return parsedRangeValue.every(Boolean) ? parsedRangeValue : undefined;
    }
    return parseDateValue(raw);
  }

  if (field.type === 'checkboxGroup' || field.type === 'cascader') {
    return parseArrayValue(raw);
  }

  if (field.type === 'select' && field.mode === 'multiple') {
    return parseArrayValue(raw);
  }

  return raw;
};

export const buildQueryFilterInitialValues = (fields?: QueryFilterFieldConfig[]) => {
  const hydratedFields = hydrateQueryFilterFields(fields);

  if (!hydratedFields.length) {
    return {};
  }

  return hydratedFields.reduce<Record<string, any>>((result, field) => {
    const value = parseQueryFilterDefaultValue(field);
    if (value !== undefined) {
      result[field.field] = value;
    }
    return result;
  }, {});
};

export const formatQueryFilterSubmitValues = (
  fields: QueryFilterFieldConfig[],
  values: Record<string, any>,
) => {
  return fields.reduce<Record<string, any>>((result, field) => {
    const value = values[field.field];

    if (field.type === 'datePicker') {
      if (field.pickerType === 'range') {
        if (Array.isArray(value) && value.length === 2 && value[0] && value[1]) {
          result.startDate = dayjs(value[0]).format('YYYY-MM-DD');
          result.endDate = dayjs(value[1]).format('YYYY-MM-DD');
        }
        return result;
      }

      if (value) {
        result[field.field] = dayjs(value).format('YYYY-MM-DD');
      }
      return result;
    }

    if (isEmptyValue(value)) {
      return result;
    }

    if (typeof value === 'string') {
      result[field.field] = value.trim();
      return result;
    }

    result[field.field] = value;
    return result;
  }, {});
};

export const mapQueryFilterOptions = (
  list: any[],
  requestConfig?: QueryFilterRequestConfig,
) => {
  const labelField = requestConfig?.labelField?.trim();
  const valueField = requestConfig?.valueField?.trim();

  const resolveLabel = (item: any) => {
    if (labelField) {
      return item?.[labelField];
    }

    const fallbackLabelField = ['label', 'name', 'title', 'text']
      .find(field => item?.[field] !== undefined);

    return fallbackLabelField ? item[fallbackLabelField] : undefined;
  };

  const resolveValue = (item: any) => {
    if (valueField) {
      return item?.[valueField];
    }

    const fallbackValueField = ['value', 'id', 'code', 'key', 'name']
      .find(field => item?.[field] !== undefined);

    return fallbackValueField ? item[fallbackValueField] : undefined;
  };

  return list.map(item => ({
    label: resolveLabel(item),
    value: resolveValue(item),
  })).filter(item => item.label !== undefined && item.value !== undefined);
};

export const resolveQueryFilterOptionList = (
  responseData: any,
  requestConfig?: QueryFilterRequestConfig,
) => {
  const explicitListField = requestConfig?.listField?.trim();

  if (explicitListField) {
    const explicitValue = getValueByPath(responseData, explicitListField);
    if (Array.isArray(explicitValue)) {
      return explicitValue;
    }
  }

  if (Array.isArray(responseData)) {
    return responseData;
  }

  const fallbackPaths = [
    'data.list',
    'data.records',
    'data.rows',
    'payload.list',
    'payload.records',
    'payload.rows',
    'list',
    'records',
    'rows',
  ];

  for (const path of fallbackPaths) {
    const value = getValueByPath(responseData, path);
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
};

export const mapQueryFilterCascaderOptions = (
  list: any[],
  requestConfig?: QueryFilterRequestConfig,
) => {
  const labelField = requestConfig?.labelField || 'label';
  const valueField = requestConfig?.valueField || 'value';
  const childrenField = requestConfig?.childrenField || 'children';

  const transform = (nodes: any[]): any[] =>
    nodes.map(node => ({
      label: node?.[labelField],
      value: node?.[valueField],
      children: Array.isArray(node?.[childrenField]) ? transform(node[childrenField]) : undefined,
    }));

  return transform(list);
};
