import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Form, Input, InputNumber, Switch, Select, Divider, Upload, Button, message, Tabs, ColorPicker, Radio, Slider, Collapse } from 'antd';
import { UploadOutlined, LoadingOutlined, PlusOutlined, DeleteOutlined, CloseOutlined, SettingOutlined } from '@ant-design/icons';
import { Widget, WidgetType, MicroAppModule, FloatingModuleConfig, FormField, QueryFilterFieldConfig } from '@/types';
import { useStore } from '@/store/useStore';
import { useCanvasTheme } from '@/hooks/useCanvasTheme';
import { REFRESHABLE_WIDGET_TYPES, MAX_REFRESH_INTERVAL } from '@/constants/dashboard';
import { microAppCommunication } from '@/utils/microAppCommunication';
import { microAppConfigLoader } from '@/utils/microAppConfig';
import { uploadImage } from '@/services';
import FormFieldBuilder from '../FormFieldBuilder';
import MicroAppSelector from '../MicroAppSelector';
import EventRouteConfig from '../EventRouteConfig';
import BackgroundSettings from '@/components/BackgroundSettings';
import AssistantHubConfig from '@/components/AssistantHubConfig';
import GlobalThemeReferenceFields from '@/components/GlobalThemeReferenceFields';
import IconPicker from '@/components/IconPicker';
import WidgetApiDebugButton from '@/components/WidgetApiDebugButton';
import WidgetApiConfigTabs from '@/components/WidgetApiConfigTabs';
import WidgetTitleSettings from '@/components/WidgetTitleSettings';
import RichTextEditor from '@/components/RichTextEditor';
import { getIconValueType } from '@/components/IconPicker/types';
import { useGlobalConfigStore } from '@/store/useGlobalConfigStore';
import {
  LinkConfig,
  SearchConfig,
  QueryFilterConfig,
  QueryFilterDataConfig,
  CustomFormConfig,
  CustomFormStyleConfig,
  DataTableConfig,
  CarouselConfig,
  CarouselDataConfig,
  ChartConfig,
  ChartDataConfig,
  IndicatorCardConfig,
  ConfigDialogDataTab,
} from './configs';
import { normalizeDataSourceMode } from './configs/dataSourceHelpers';
import { JUMP_SYSTEM_OPTIONS } from '@/constants/jumpSystem';
import {
  DEFAULT_NAV_GROUP_LIST_FIELD,
  getWidgetApiEndpointPlaceholder,
  getWidgetApiFieldMeta,
  getWidgetPaginationDefaults,
} from '@/utils/widgetApiDefaults';
import {
  buildBackgroundFormValues,
  buildWidgetTitleStyleFormValues,
  getDefaultGlobalThemeId,
  getGlobalMessageCopy,
  getGlobalThemeOptions,
  getGlobalThemeScheme,
  getInvalidGlobalThemeFallbackBackground,
  getInvalidGlobalThemeFallbackWidgetTitle,
  hasGlobalThemeScheme,
} from '@/utils/global-config';
import { keyValueListToJsonString, keyValueListToObject, objectToKeyValueList } from '@/utils/widgetApi';
import {
  hydrateQueryFilterFields,
  normalizeQueryFilterFields,
  QUERY_FILTER_FIELD_NAME_MAX_LENGTH,
} from '@/utils/queryFilter';
import { getChartPresetDefinition, resolveChartLegacyPreset } from '@/components/widgets/chart/presets';
import './index.scss';

interface ConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  widget: Widget;
  onRegisterSaveHandler?: (handler: (() => Promise<boolean>) | null) => void;
}

const validateJson = (_: any, value: string) => {
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

const stringifyJsonValue = (value: any): string => {
  if (value == null || value === '') {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '';
  }
};

const getQueryFilterFieldsFormValue = (fields?: QueryFilterFieldConfig[]) => {
  const hydratedFields = hydrateQueryFilterFields(fields);

  if (!hydratedFields.length) {
    return [];
  }

  return hydratedFields.map(field => ({
    ...field,
    manualOptions: Array.isArray(field.manualOptions)
      ? field.manualOptions.map(option => ({ ...option }))
      : field.manualOptions,
    defaultValue:
      typeof field.defaultValue === 'number'
        ? field.defaultValue
        : stringifyJsonValue(field.defaultValue),
    requestConfig: field.requestConfig
      ? {
        ...field.requestConfig,
        headersList: objectToKeyValueList(field.requestConfig.headers),
        queryList: objectToKeyValueList(field.requestConfig.query),
        bodyList: objectToKeyValueList(field.requestConfig.body),
      }
      : field.requestConfig,
  }));
};

const COMMON_STATIC_DATA_WIDGET_TYPES = ['chart', 'stats', 'dataTable', 'news', 'topList'];

const getCommonStaticDataInitialValue = (widget: Widget): string => {
  const config = widget.config as Record<string, any>;

  if (config.staticData != null && config.staticData !== '') {
    return stringifyJsonValue(config.staticData);
  }

  if (widget.type === 'dataTable' && Array.isArray(config.tableData)) {
    return stringifyJsonValue(config.tableData);
  }

  if (widget.type === 'news' && Array.isArray(config.newsItems)) {
    return stringifyJsonValue(config.newsItems);
  }

  if (widget.type === 'topList' && Array.isArray(config.listItems)) {
    return stringifyJsonValue(config.listItems);
  }

  return '';
};

const buildHeaderMap = (headersList?: Array<{ key?: string; value?: string }>) => {
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

const DEFAULT_STATS_ITEMS = [
  { key: 'activeUsers', label: '活跃用户', precision: 0, trend: 'up', color: '#3f8600' },
  { key: 'idleRate', label: '空闲率', precision: 2, suffix: '%', trend: 'down', color: '#cf1322' },
];

interface StaticDataEditorMeta {
  placeholder: string;
  extra: string;
}

const buildJsonPlaceholder = (value: any) => JSON.stringify(value, null, 2);

const getStaticDataEditorMeta = (
  widgetType: WidgetType,
  options: {
    statsItems?: Array<{ key?: string; label?: string }>;
    chartPreset?: string;
    rowKey?: string;
    columns?: Array<{ dataIndex?: string; title?: string; type?: string }>;
    xAxisField?: string;
    yAxisField?: string;
    titleField?: string;
    descriptionField?: string;
    avatarField?: string;
    urlField?: string;
    nameField?: string;
    valueField?: string;
    changeField?: string;
    unitField?: string;
  } = {},
): StaticDataEditorMeta => {
  switch (widgetType) {
    case 'chart': {
      const definition = getChartPresetDefinition(options.chartPreset);
      if (definition.key === 'gauge') {
        return {
          extra: '仪表盘组件支持对象或单条数组数据，字段名建议与名称、数值、最小值、最大值映射保持一致。',
          placeholder: buildJsonPlaceholder(definition.staticDataExample),
        };
      }
      const xAxisField = options.xAxisField || 'xAxis';
      const yAxisField = options.yAxisField || 'series';
      return {
        extra: '图表组件需要对象结构，字段名建议与 X 轴字段、Y 轴字段配置保持一致。',
        placeholder: buildJsonPlaceholder({
          [xAxisField]: ['周一', '周二', '周三', '周四', '周五'],
          [yAxisField]: [120, 200, 150, 80, 70],
        }),
      };
    }
    case 'stats': {
      const statsItems = Array.isArray(options.statsItems) && options.statsItems.length
        ? options.statsItems
        : DEFAULT_STATS_ITEMS;
      const sample = statsItems.reduce<Record<string, number>>((result, item, index) => {
        const key = item?.key?.trim();
        if (key) {
          result[key] = index === 0 ? 1286 : 98.6;
        }
        return result;
      }, {});
      return {
        extra: '统计组件需要对象结构，键名应与“统计项配置”中的 key 一一对应。',
        placeholder: buildJsonPlaceholder(
          Object.keys(sample).length
            ? sample
            : {
              activeUsers: 1286,
              idleRate: 98.6,
            },
        ),
      };
    }
    case 'dataTable': {
      const rowKey = options.rowKey || 'key';
      const columns = Array.isArray(options.columns) ? options.columns.filter(item => item?.dataIndex) : [];
      const sampleRow = columns.reduce<Record<string, any>>((result, column, index) => {
        const dataIndex = column?.dataIndex?.trim();
        if (!dataIndex) {
          return result;
        }
        switch (column?.type) {
          case 'number':
            result[dataIndex] = index + 1;
            break;
          case 'date':
            result[dataIndex] = '2026-03-23';
            break;
          case 'tag':
          case 'status':
            result[dataIndex] = '正常';
            break;
          default:
            result[dataIndex] = column?.title || `${dataIndex} 示例`;
            break;
        }
        return result;
      }, { [rowKey]: 'row-1' });

      return {
        extra: '表格组件需要数组结构，每一项对应一行数据，字段名应与“数据列配置”中的 dataIndex 保持一致。',
        placeholder: buildJsonPlaceholder([
          Object.keys(sampleRow).length > 1
            ? sampleRow
            : {
              [rowKey]: 'row-1',
              name: '示例名称',
              value: 1286,
              status: '正常',
            },
        ]),
      };
    }
    case 'news': {
      const titleField = options.titleField || 'title';
      const descriptionField = options.descriptionField || 'description';
      const avatarField = options.avatarField || 'avatar';
      const urlField = options.urlField || 'url';
      return {
        extra: '新闻组件需要数组结构，每一项是一条新闻，字段名建议与标题、摘要、头像、链接映射保持一致。',
        placeholder: buildJsonPlaceholder([
          {
            id: 'news-1',
            [titleField]: '港口巡检日报已生成',
            [descriptionField]: '今日完成 12 个重点区域巡检，异常事件 2 起。',
            [avatarField]: 'https://example.com/news-cover.png',
            [urlField]: 'https://example.com/news/1',
            time: '2026-03-23 09:30:00',
            source: '指挥中心',
          },
        ]),
      };
    }
    case 'topList': {
      const nameField = options.nameField || 'name';
      const valueField = options.valueField || 'value';
      const changeField = options.changeField || 'change';
      const unitField = options.unitField || 'unit';
      return {
        extra: '排行榜组件需要数组结构，每一项是一条排行记录，字段名建议与名称、数值、变化、单位映射保持一致。',
        placeholder: buildJsonPlaceholder([
          {
            id: 'top-01',
            [nameField]: '一号海域',
            [valueField]: 1286,
            [changeField]: '+12.8%',
            [unitField]: '次',
          },
        ]),
      };
    }
    default:
      return {
        extra: '直接输入 JSON 格式的静态数据，支持数组或对象。',
        placeholder: '[\n  {\n    \"name\": \"示例\",\n    \"value\": 100\n  }\n]',
      };
  }
};

// 规范化颜色值（处理 ColorPicker 对象和序列化后的 JSON 对象）
const normalizeColorValue = (color: any, defaultColor?: string): string | undefined => {
  if (!color) return defaultColor;
  if (typeof color === 'string') return color;
  // 优先使用 toRgbString 保留透明度信息
  if (typeof color === 'object' && color?.toRgbString) {
    return color.toRgbString();
  }
  if (typeof color === 'object' && color?.toHexString) {
    return color.toHexString();
  }
  // 处理序列化后的 ColorPicker 对象（包含 metaColor）
  if (typeof color === 'object' && color?.metaColor) {
    const { r, g, b, a } = color.metaColor;
    if (a !== undefined && a < 1) {
      return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
    }
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  }
  return defaultColor;
};

const ConfigDialog: React.FC<ConfigDialogProps> = ({ isOpen, onClose, widget, onRegisterSaveHandler }) => {
  const { updateWidget, updateFloatingModule, updateFloatingModuleConfig, floatingModules, groups, updateGroup, updateGroupConfig } = useStore();
  const { styleTokens } = useCanvasTheme();
  const globalConfigDetail = useGlobalConfigStore(state => state.detail);
  const ensureGlobalConfigLoaded = useGlobalConfigStore(state => state.ensureLoaded);
  const [form] = Form.useForm();
  const showNavMenuValue = Form.useWatch('showNavMenu', form);
  const titleUseGlobalConfig = Form.useWatch('titleUseGlobalConfig', form) ?? false;
  const titleGlobalThemeId = Form.useWatch('titleGlobalThemeId', form);
  const backgroundUseGlobalConfig = Form.useWatch('backgroundUseGlobalConfig', form) ?? false;
  const backgroundGlobalThemeId = Form.useWatch('backgroundGlobalThemeId', form);
  const statsItemsValue = Form.useWatch('statsItems', form);
  const columnsValue = Form.useWatch('columns', form);
  const rowKeyValue = Form.useWatch('rowKey', form);
  const chartPresetValue = Form.useWatch('chartPreset', form);
  const xAxisFieldValue = Form.useWatch('xAxisField', form);
  const yAxisFieldValue = Form.useWatch('yAxisField', form);
  const titleFieldValue = Form.useWatch('titleField', form);
  const descriptionFieldValue = Form.useWatch('descriptionField', form);
  const avatarFieldValue = Form.useWatch('avatarField', form);
  const urlFieldValue = Form.useWatch('urlField', form);
  const nameFieldValue = Form.useWatch('nameField', form);
  const valueFieldValue = Form.useWatch('valueField', form);
  const changeFieldValue = Form.useWatch('changeField', form);
  const unitFieldValue = Form.useWatch('unitField', form);
  const genericDataSourceValue = Form.useWatch('dataSource', form) || 'customApi';
  const genericStaticDataValue = Form.useWatch('staticData', form) || '';
  const genericStaticDataText =
    typeof genericStaticDataValue === 'string'
      ? genericStaticDataValue
      : stringifyJsonValue(genericStaticDataValue);
  const [fileList, setFileList] = useState<any[]>([]);
  const prevWidgetIdRef = useRef<string | null>(null);
  const [bgUploading, setBgUploading] = useState(false);
  const globalThemeOptions = useMemo(() => getGlobalThemeOptions(globalConfigDetail), [globalConfigDetail]);
  const genericStaticDataEditorMeta = useMemo(
    () =>
      getStaticDataEditorMeta(widget.type, {
        statsItems: statsItemsValue,
        chartPreset: chartPresetValue,
        rowKey: rowKeyValue,
        columns: columnsValue,
        xAxisField: xAxisFieldValue,
        yAxisField: yAxisFieldValue,
        titleField: titleFieldValue,
        descriptionField: descriptionFieldValue,
        avatarField: avatarFieldValue,
        urlField: urlFieldValue,
        nameField: nameFieldValue,
        valueField: valueFieldValue,
        changeField: changeFieldValue,
        unitField: unitFieldValue,
      }),
    [
      avatarFieldValue,
      chartPresetValue,
      changeFieldValue,
      columnsValue,
      descriptionFieldValue,
      nameFieldValue,
      rowKeyValue,
      statsItemsValue,
      titleFieldValue,
      unitFieldValue,
      urlFieldValue,
      valueFieldValue,
      widget.type,
      xAxisFieldValue,
      yAxisFieldValue,
    ],
  );
  const genericStaticDataPreview = useMemo(() => {
    if (!COMMON_STATIC_DATA_WIDGET_TYPES.includes(widget.type)) {
      return {
        title: '数据预览将在此显示',
        content: '[]',
      };
    }

    if (!genericStaticDataText.trim()) {
      return {
        title: '数据预览将在此显示',
        content: '[]',
      };
    }

    try {
      const parsed = JSON.parse(genericStaticDataText);
      if (Array.isArray(parsed)) {
        return {
          title: `当前共 ${parsed.length} 条数据`,
          content: JSON.stringify(parsed, null, 2),
        };
      }

      if (parsed && typeof parsed === 'object') {
        return {
          title: `当前共 ${Object.keys(parsed).length} 个字段`,
          content: JSON.stringify(parsed, null, 2),
        };
      }

      return {
        title: `当前数据类型：${typeof parsed}`,
        content: JSON.stringify(parsed, null, 2),
      };
    } catch {
      return {
        title: '请输入合法的 JSON 格式以便预览',
        content: '[]',
      };
    }
  }, [genericStaticDataText, widget.type]);

  // 计算 navGroup 导航项的默认样式（基于当前风格 Token）
  const navGroupItemDefaults = useMemo(() => {
    // 使用风格 Token 中的 card 背景色作为导航项默认背景
    const defaultBgColor = styleTokens?.card?.background || 'rgba(255, 255, 255, 0.2)';
    // 使用风格 Token 中的 widget 文字颜色作为导航项默认文字颜色
    const defaultTextColor = styleTokens?.widget?.textColor || '#222222';
    return {
      itemBgColor: defaultBgColor,
      itemTextColor: defaultTextColor,
    };
  }, [styleTokens]);

  // 判断是否为分组（通过 widget.type === 'group' 或在 groups 中查找）
  const isGroup = (widget as any).type === 'group' || groups.some(g => g.id === widget.id);
  const group = isGroup ? groups.find(g => g.id === widget.id) : null;

  // 判断是否为悬浮模块
  const isFloatingModule = !isGroup && floatingModules.some(m => m.id === widget.id);

  // 判断是否为助手中心
  const floatingModuleConfig = widget.config as FloatingModuleConfig;
  const isAssistantHub = isFloatingModule &&
    floatingModuleConfig.contentType === 'localComponent' &&
    floatingModuleConfig.localComponent?.componentType === 'assistantHub';

  const syncModuleConfig = useCallback(
    async (systemId?: string, moduleId?: string, updates?: Partial<MicroAppModule>) => {
      if (!systemId || !moduleId || !updates) {
        return;
      }
      try {
        await microAppConfigLoader.updateModuleConfig(systemId, moduleId, updates);
      } catch (error) {
        console.error('Failed to sync micro app config:', error);
        message.error('同步微应用配置失败，请稍后重试');
      }
    },
    []
  );

  useEffect(() => {
    if (isOpen) {
      void ensureGlobalConfigLoaded();
    }
  }, [ensureGlobalConfigLoaded, isOpen]);

  const resetTitleGlobalThemeReference = useCallback(() => {
    form.setFieldsValue({
      titleUseGlobalConfig: false,
      titleGlobalThemeId: undefined,
      ...buildWidgetTitleStyleFormValues(
        getInvalidGlobalThemeFallbackWidgetTitle(isGroup ? 'group' : widget.type),
      ),
    });
  }, [form, isGroup, widget.type]);

  const resetBackgroundGlobalThemeReference = useCallback(() => {
    form.setFieldsValue({
      backgroundUseGlobalConfig: false,
      backgroundGlobalThemeId: undefined,
      ...buildBackgroundFormValues(
        getInvalidGlobalThemeFallbackBackground(isGroup ? 'group' : 'widget'),
      ),
    });
    setFileList([]);
  }, [form, isGroup]);

  useEffect(() => {
    if (isOpen) {
      // 仅在切换到不同组件时重置表单，防止前一个组件的配置值残留
      // 同一组件保存后不重置，避免 Form.List（如 navItems）因 resetFields 导致数据丢失
      const currentId = isGroup ? group?.id : widget?.id;
      if (currentId !== prevWidgetIdRef.current) {
        form.resetFields();
        prevWidgetIdRef.current = currentId || null;
      }

      // 分组配置初始化
      if (isGroup && group) {
        const config = (group.config || {}) as any;
        form.setFieldsValue({
          title: group.title,
          titleUseGlobalConfig: config.titleUseGlobalConfig ?? false,
          titleGlobalThemeId: config.titleGlobalThemeId,
          backgroundUseGlobalConfig: config.backgroundUseGlobalConfig ?? false,
          backgroundGlobalThemeId: config.backgroundGlobalThemeId,
          ...buildWidgetTitleStyleFormValues(config),
          ...buildBackgroundFormValues(config),
          borderStyle: config.borderStyle || 'none',
          borderColor: config.borderColor,
          borderWidth: config.borderWidth ?? 2,
          borderRadius: config.borderRadius ?? 8,
          padding: config.padding,
        });

        // 初始化背景图片上传列表
        if (config.backgroundImage) {
          setFileList([
            { uid: '-1', name: 'current-bg.png', status: 'done', url: config.backgroundImage },
          ]);
        } else {
          setFileList([]);
        }
        return;
      }

      // 初始化背景图片上传列表
      if (widget.config.backgroundImage) {
        setFileList([
          {
            uid: '-1',
            name: 'current-bg.png',
            status: 'done',
            url: widget.config.backgroundImage,
          },
        ]);
      } else {
        setFileList([]);
      }

      // 对于微应用类型,需要特殊处理配置
      if (widget.type === 'microApp') {
        const initialValues = {
          title: widget.title,
          showTitle: widget.config.showTitle !== false,
          showNavMenu: widget.config.showNavMenu ?? false,
          titleUseGlobalConfig: widget.config.titleUseGlobalConfig ?? false,
          titleGlobalThemeId: widget.config.titleGlobalThemeId,
          backgroundUseGlobalConfig: widget.config.backgroundUseGlobalConfig ?? false,
          backgroundGlobalThemeId: widget.config.backgroundGlobalThemeId,
          titleColor: widget.config.titleColor,
          titleFontSize: widget.config.titleFontSize,
          titleFontWeight: widget.config.titleFontWeight,
          refreshInterval: widget.config.refreshInterval,
          systemId: widget.config.systemId,
          moduleId: widget.config.moduleId,
          sync: widget.config.sync !== false,
          alive: widget.config.alive !== false,
          eventRoutes: widget.config.eventRoutes || [],
          icon: widget.config.iconSvg || widget.config.icon || '',
          forceIconOnly: widget.config.forceIconOnly || false,
          backgroundType: widget.config.backgroundType || 'color',
          backgroundColor: widget.config.backgroundColor,
          backgroundImage: widget.config.backgroundImage,
          backgroundGradient: widget.config.backgroundGradient,
          backgroundSize: widget.config.backgroundSize,
          backgroundRepeat: widget.config.backgroundRepeat,
          backgroundPosition: widget.config.backgroundPosition,
          contentPadding: widget.config.contentPadding,
        };
        form.setFieldsValue(initialValues);

        if (!widget.config.icon && !widget.config.iconSvg && widget.config.systemId && widget.config.moduleId) {
          microAppConfigLoader
            .getModule(widget.config.systemId, widget.config.moduleId)
            .then(module => {
              if (!module) return;
              form.setFieldsValue({
                icon: module.icon || '',
                iconSvg: module.iconSvg || '',
                forceIconOnly: module.forceIconOnly ?? form.getFieldValue('forceIconOnly') ?? false,
              });
            })
            .catch(error => console.warn('Failed to load module for icon:', error));
        }
      } else {
        // 规范化颜色值的辅助函数（用于初始化表单，保留透明度）
        const normalizeColorForForm = (color: any, defaultColor?: string): string | undefined => {
          if (!color) return defaultColor;
          if (typeof color === 'string') return color;
          // 优先使用 toRgbString 保留透明度信息
          if (typeof color === 'object' && color?.toRgbString) {
            return color.toRgbString();
          }
          if (typeof color === 'object' && color?.toHexString) {
            return color.toHexString();
          }
          // 处理序列化后的 ColorPicker 对象（包含 metaColor）
          if (typeof color === 'object' && color?.metaColor) {
            const { r, g, b, a } = color.metaColor;
            if (a !== undefined && a < 1) {
              return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
            }
            return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
          }
          return defaultColor;
        };

        // 规范化 config 中的颜色值，防止 ColorPicker 报错
        const normalizedConfig = {
          ...widget.config,
          iconColor: normalizeColorForForm(widget.config.iconColor),
          itemIconColor: normalizeColorForForm(widget.config.itemIconColor),
          itemColor: normalizeColorForForm(widget.config.itemColor),
          backgroundColor: normalizeColorForForm(widget.config.backgroundColor, styleTokens?.widget?.background || '#FFFFFF'),
          // 标题颜色默认值
          titleColor: normalizeColorForForm(widget.config.titleColor, '#222222'),
          // navGroup 导航项样式颜色（使用风格 Token 默认值）
          itemBgColor: normalizeColorForForm(widget.config.itemBgColor, widget.type === 'navGroup' ? navGroupItemDefaults.itemBgColor : undefined),
          itemTextColor: normalizeColorForForm(widget.config.itemTextColor, widget.type === 'navGroup' ? navGroupItemDefaults.itemTextColor : undefined),
          overlayColor: normalizeColorForForm(widget.config.overlayColor),
          mapAreaColor: normalizeColorForForm(widget.config.mapAreaColor),
          mapBorderColor: normalizeColorForForm(widget.config.mapBorderColor),
          mapEmphasisAreaColor: normalizeColorForForm(widget.config.mapEmphasisAreaColor),
          flowLineColor: normalizeColorForForm(widget.config.flowLineColor),
          flowNodeColor: normalizeColorForForm(widget.config.flowNodeColor),
          visualMapStartColor: normalizeColorForForm(widget.config.visualMapStartColor),
          visualMapEndColor: normalizeColorForForm(widget.config.visualMapEndColor),
          indicatorValueColor: normalizeColorForForm(widget.config.indicatorValueColor),
          indicatorDescriptionColor: normalizeColorForForm(widget.config.indicatorDescriptionColor),
          displayMode: widget.config.displayMode || 'text',
          navDataSource:
            normalizeDataSourceMode(widget.config.navDataSource) ||
            (widget.config.navDataSourceId ? 'dataSource' : (widget.config.navItems?.length ? 'static' : 'customApi')),
          navItems: widget.config.navItems || [],
          navTextColor: normalizeColorForForm(widget.config.navTextColor),
        };

        form.setFieldsValue({
          ...normalizedConfig,
          // title uses widget.title to avoid being overwritten by config.title
          title: widget.title,
          titleUseGlobalConfig: widget.config.titleUseGlobalConfig ?? false,
          titleGlobalThemeId: widget.config.titleGlobalThemeId,
          backgroundUseGlobalConfig: widget.config.backgroundUseGlobalConfig ?? false,
          backgroundGlobalThemeId: widget.config.backgroundGlobalThemeId,
          refreshInterval: widget.config.refreshInterval,
          apiEndpoint: widget.config.apiEndpoint,
          apiMethod: widget.config.apiMethod || 'GET',
          apiQuery: stringifyJsonValue(widget.config.apiQuery),
          apiQueryList: objectToKeyValueList(widget.config.apiQuery),
          apiBody: stringifyJsonValue(widget.config.apiBody),
          apiBodyList: objectToKeyValueList(widget.config.apiBody),
          apiDataField: widget.config.apiDataField,
          apiListField: widget.config.apiListField,
          dataSourceId: (widget.config as any).dataSourceId,
          timeout: widget.config.timeout,
          paginationMode: widget.config.paginationMode || 'none',
          paginationConfig: {
            page: widget.config.paginationConfig?.page || 1,
            pageSize: widget.config.paginationConfig?.pageSize || 10,
            pageParam: widget.config.paginationConfig?.pageParam,
            pageSizeParam: widget.config.paginationConfig?.pageSizeParam,
            totalField: widget.config.paginationConfig?.totalField,
            currentField: widget.config.paginationConfig?.currentField,
            pageSizeField: widget.config.paginationConfig?.pageSizeField,
            showTotal: widget.config.paginationConfig?.showTotal,
          },
          showTitle: widget.config.showTitle !== false,
          backgroundType: widget.config.backgroundType || 'color',
          backgroundImage: widget.config.backgroundImage,
          backgroundGradient: widget.config.backgroundGradient,
          // backdropBlur 由 BackgroundSettings 组件根据主题自动设置默认值
        });

        if (widget.type === 'chart') {
          form.setFieldsValue({
            chartPreset: resolveChartLegacyPreset(widget.config),
            xAxisField: widget.config.xAxisField || 'xAxis',
            yAxisField: widget.config.yAxisField || 'series',
            legendPosition: widget.config.legendPosition || 'top',
            showAxisLabel: widget.config.showAxisLabel !== false,
            showSplitLine: widget.config.showSplitLine !== false,
          });
        }

        if (widget.type === 'stats') {
          const statsItems = widget.config.statsItems && widget.config.statsItems.length > 0
            ? widget.config.statsItems
            : DEFAULT_STATS_ITEMS;
          form.setFieldsValue({ statsItems });
        }

        if (widget.type === 'indicatorCard') {
          form.setFieldsValue({
            dataSource:
              normalizeDataSourceMode(widget.config.dataSource) ||
              ((widget.config as any).dataSourceId ? 'dataSource' : (widget.config.apiEndpoint ? 'customApi' : 'static')),
            apiMethod: widget.config.apiMethod || 'GET',
            valueField: widget.config.valueField || 'value',
            descriptionField: widget.config.descriptionField || 'description',
          });
        }

        // navGroup 特有配置：数据来源和静态导航项
        if (widget.type === 'navGroup') {
          const hasStaticItems = widget.config.staticItems && widget.config.staticItems.length > 0;
          form.setFieldsValue({
            dataSource:
              normalizeDataSourceMode((widget.config as any).dataSource) ||
              ((widget.config as any).dataSourceId ? 'dataSource' : (hasStaticItems ? 'static' : 'customApi')),
            staticItems: widget.config.staticItems || [],
            apiMethod: widget.config.apiMethod || 'GET',
            apiQuery: stringifyJsonValue(widget.config.apiQuery),
            apiBody: stringifyJsonValue(widget.config.apiBody),
            apiListField: widget.config.apiListField || DEFAULT_NAV_GROUP_LIST_FIELD,
          });
        }

        // headerBar 导航接口配置初始化
        if (widget.type === 'headerBar') {
          const hasStaticNav = widget.config.navItems && widget.config.navItems.length > 0;
          form.setFieldsValue({
            navDataSource:
              normalizeDataSourceMode(widget.config.navDataSource) ||
              (widget.config.navDataSourceId ? 'dataSource' : (hasStaticNav ? 'static' : 'customApi')),
            navApiMethod: widget.config.navApiMethod || 'GET',
            navDataSourceId: widget.config.navDataSourceId,
            navTimeout: widget.config.navTimeout,
            navApiQuery: stringifyJsonValue(widget.config.navApiQuery),
            navApiQueryList: objectToKeyValueList(widget.config.navApiQuery),
            navApiBody: stringifyJsonValue(widget.config.navApiBody),
            navApiBodyList: objectToKeyValueList(widget.config.navApiBody),
            navApiListField: widget.config.navApiListField || '',
            navApiHeadersList: widget.config.navApiHeaders
              ? Object.entries(widget.config.navApiHeaders).map(([key, value]) => ({ key, value }))
              : [],
            navFieldMapping: widget.config.navFieldMapping || {},
          });
        }

        // 通用接口请求头初始化（dataTable/topList/news/navGroup/chart/stats）
        if (['chart', 'stats', 'indicatorCard', 'dataTable', 'news', 'topList', 'navGroup'].includes(widget.type) && widget.config.apiHeaders) {
          form.setFieldsValue({
            apiHeadersList: Object.entries(widget.config.apiHeaders).map(([key, value]) => ({ key, value })),
          });
        }

        // carousel 接口请求头初始化
        if (widget.type === 'carousel' && widget.config.apiConfig) {
          form.setFieldsValue({
            dataSourceType:
              normalizeDataSourceMode(widget.config.dataSourceType) ||
              (widget.config.apiConfig.dataSourceId ? 'dataSource' : ((widget.config.dataSourceType || 'static') === 'static' ? 'static' : 'customApi')),
            apiConfig: {
              ...widget.config.apiConfig,
              dataSourceId: widget.config.apiConfig.dataSourceId,
              timeout: widget.config.apiConfig.timeout,
              ...(widget.config.apiConfig.headers
                ? {
                  headersList: Object.entries(widget.config.apiConfig.headers).map(([key, value]) => ({ key, value })),
                }
                : {}),
              queryParams: stringifyJsonValue(
                widget.config.apiConfig.queryParams ?? widget.config.apiConfig.params,
              ),
              queryParamsList: objectToKeyValueList(
                widget.config.apiConfig.queryParams ?? widget.config.apiConfig.params,
              ),
              bodyParams: typeof (widget.config.apiConfig.body ?? widget.config.apiConfig.bodyParams) === 'string'
                ? (widget.config.apiConfig.body ?? widget.config.apiConfig.bodyParams)
                : (widget.config.apiConfig.body ?? widget.config.apiConfig.bodyParams)
                  ? JSON.stringify(widget.config.apiConfig.body ?? widget.config.apiConfig.bodyParams, null, 2)
                  : '',
              bodyParamsList: objectToKeyValueList(
                widget.config.apiConfig.body ?? widget.config.apiConfig.bodyParams,
              ),
            },
          });
        }

        if (widget.type === 'myDocuments') {
          form.setFieldsValue({
            btnColor: normalizeColorForForm(widget.config.btnColor, '#1677ff'),
            btnTextColor: normalizeColorForForm(widget.config.btnTextColor, '#ffffff'),
          });
        }

        // customForm 特有配置初始化
        if (widget.type === 'customForm') {
          form.setFieldsValue({
            submitButtonText: widget.config.submitButtonText || '提交',
            submitButtonSize: widget.config.submitButtonSize || 'middle',
            submitButtonColor: normalizeColorForForm(widget.config.submitButtonColor),
            submitButtonTextColor: normalizeColorForForm(widget.config.submitButtonTextColor, '#FFFFFF'),
            showResetButton: widget.config.showResetButton ?? true,
            resetButtonText: widget.config.resetButtonText || '重置',
            resetButtonColor: normalizeColorForForm(widget.config.resetButtonColor),
            resetButtonTextColor: normalizeColorForForm(widget.config.resetButtonTextColor, '#333333'),
            buttonAlign: widget.config.buttonAlign || 'left',
            borderRadius: widget.config.borderRadius,
            fieldSpacing: widget.config.fieldSpacing,
            submitMethod: widget.config.submitMethod === 'both' ? 'eventRoute' : (widget.config.submitMethod || 'eventRoute'),
            apiMethod: widget.config.apiMethod || 'POST',
            apiBody: stringifyJsonValue(widget.config.apiBody),
            apiBodyList: objectToKeyValueList(widget.config.apiBody),
            apiHeadersList: widget.config.apiHeaders
              ? Object.entries(widget.config.apiHeaders).map(([key, value]) => ({ key, value }))
              : [],
            successMessage: widget.config.successMessage,
            failureMessage: widget.config.failureMessage,
            successAction: widget.config.successAction || (widget.config.successResetForm ? 'resetForm' : 'none'),
            failureAction: widget.config.failureAction || 'none',
          });
        }

        // search ???????
        if (widget.type === 'search') {
          form.setFieldsValue({
            submitMethod: widget.config.submitMethod === 'both' ? 'eventRoute' : (widget.config.submitMethod || 'eventRoute'),
            apiMethod: widget.config.apiMethod || 'GET',
            apiQuery: stringifyJsonValue(widget.config.apiQuery),
            apiQueryList: objectToKeyValueList(widget.config.apiQuery),
            apiBody: stringifyJsonValue(widget.config.apiBody),
            apiBodyList: objectToKeyValueList(widget.config.apiBody),
            apiHeadersList: widget.config.apiHeaders
              ? Object.entries(widget.config.apiHeaders).map(([key, value]) => ({ key, value }))
              : [],
          });
        }

        if (widget.type === 'queryFilter') {
          form.setFieldsValue({
            queryFields: getQueryFilterFieldsFormValue(widget.config.queryFields),
            formLayout: widget.config.formLayout || 'vertical',
            labelVerticalAlign: widget.config.labelVerticalAlign || 'top',
            labelTextAlign: widget.config.labelTextAlign || 'left',
            labelWidth: typeof widget.config.labelWidth === 'number' ? widget.config.labelWidth : 96,
            layoutCols: widget.config.layoutCols || 4,
            submitButtonText: widget.config.submitButtonText || '查询',
            showResetButton: widget.config.showResetButton ?? true,
            resetButtonText: widget.config.resetButtonText || '重置',
            buttonAlign: widget.config.buttonAlign || 'right',
            fieldSpacing: widget.config.fieldSpacing ?? 16,
            submitMethod: widget.config.submitMethod === 'both' ? 'eventRoute' : (widget.config.submitMethod || 'eventRoute'),
            apiMethod: widget.config.apiMethod || 'GET',
            apiQuery: stringifyJsonValue(widget.config.apiQuery),
            apiQueryList: objectToKeyValueList(widget.config.apiQuery),
            apiBody: stringifyJsonValue(widget.config.apiBody),
            apiBodyList: objectToKeyValueList(widget.config.apiBody),
            apiHeadersList: widget.config.apiHeaders
              ? Object.entries(widget.config.apiHeaders).map(([key, value]) => ({ key, value }))
              : [],
          });
        }

        if (COMMON_STATIC_DATA_WIDGET_TYPES.includes(widget.type)) {
          const hasLegacyStaticData =
            (widget.type === 'dataTable' && Array.isArray((widget.config as any).tableData) && (widget.config as any).tableData.length > 0) ||
            (widget.type === 'news' && Array.isArray((widget.config as any).newsItems) && (widget.config as any).newsItems.length > 0) ||
            (widget.type === 'topList' && Array.isArray((widget.config as any).listItems) && (widget.config as any).listItems.length > 0);
          const hasStaticData =
            ((widget.config as any).staticData != null && (widget.config as any).staticData !== '') ||
            hasLegacyStaticData;

          form.setFieldsValue({
            dataSource:
              hasStaticData
                ? 'static'
                : (
                  normalizeDataSourceMode((widget.config as any).dataSource) ||
                  ((widget.config as any).dataSourceId ? 'dataSource' : 'customApi')
                ),
            staticData: getCommonStaticDataInitialValue(widget),
          });
        }
      }

      // 如果是悬浮模块，添加悬浮模块特有的配置
      if (isFloatingModule) {
        form.setFieldsValue({
          // 尺寸配置
          width: widget.config.width || 380,
          height: widget.config.height || 400,
          minWidth: widget.config.minWidth || 300,
          minHeight: widget.config.minHeight || 200,
          maxWidth: widget.config.maxWidth || 800,
          maxHeight: widget.config.maxHeight || 900,
          // 行为配置
          collapsible: widget.config.collapsible !== false,
          closable: widget.config.closable !== false,
          showHeader: widget.config.showHeader !== false,
          // 样式配置
          theme: widget.config.theme || 'auto',
          borderRadius: widget.config.borderRadius || 12,
          zIndex: widget.config.zIndex || 9999,
          // 折叠状态配置
          collapsedWidth: widget.config.collapsedWidth || 60,
          collapsedHeight: widget.config.collapsedHeight || 60,
          collapsedIcon: widget.config.collapsedIcon || '',
          collapsedBgColor: normalizeColorValue(widget.config.collapsedBgColor, '#1677ff'),
          collapsedIconSize: widget.config.collapsedIconSize || 28,
        });

        // 助手中心特有配置
        const fmConfig = widget.config as FloatingModuleConfig;
        if (fmConfig.contentType === 'localComponent' &&
          fmConfig.localComponent?.componentType === 'assistantHub') {
          form.setFieldsValue({
            entries: fmConfig.localComponent.componentProps?.entries || [],
          });
        }
      }
    }
  }, [isOpen, widget, form, isFloatingModule, isGroup, group, navGroupItemDefaults, styleTokens]);

  useEffect(() => {
    if (!isOpen || !globalConfigDetail || !titleUseGlobalConfig) {
      return;
    }

    if (titleGlobalThemeId && !hasGlobalThemeScheme(globalConfigDetail, titleGlobalThemeId)) {
      resetTitleGlobalThemeReference();
      return;
    }

    const nextThemeId = titleGlobalThemeId || getDefaultGlobalThemeId(globalConfigDetail);
    if (!titleGlobalThemeId && nextThemeId) {
      form.setFieldValue('titleGlobalThemeId', nextThemeId);
      return;
    }

    const theme = getGlobalThemeScheme(globalConfigDetail, nextThemeId);
    if (!theme?.widgetTitle) {
      return;
    }

    form.setFieldsValue(buildWidgetTitleStyleFormValues(theme.widgetTitle));
  }, [
    form,
    globalConfigDetail,
    isOpen,
    resetTitleGlobalThemeReference,
    titleGlobalThemeId,
    titleUseGlobalConfig,
  ]);

  useEffect(() => {
    if (!isOpen || !globalConfigDetail || !backgroundUseGlobalConfig) {
      return;
    }

    if (
      backgroundGlobalThemeId
      && !hasGlobalThemeScheme(globalConfigDetail, backgroundGlobalThemeId)
    ) {
      resetBackgroundGlobalThemeReference();
      return;
    }

    const nextThemeId = backgroundGlobalThemeId || getDefaultGlobalThemeId(globalConfigDetail);
    if (!backgroundGlobalThemeId && nextThemeId) {
      form.setFieldValue('backgroundGlobalThemeId', nextThemeId);
      return;
    }

    const theme = getGlobalThemeScheme(globalConfigDetail, nextThemeId);
    if (!theme?.widgetBackground) {
      return;
    }

    form.setFieldsValue(buildBackgroundFormValues(theme.widgetBackground));
  }, [
    backgroundGlobalThemeId,
    backgroundUseGlobalConfig,
    form,
    globalConfigDetail,
    isOpen,
    resetBackgroundGlobalThemeReference,
  ]);

  useEffect(() => {
    if (!isOpen || !globalConfigDetail || !['search', 'queryFilter', 'customForm'].includes(widget.type)) {
      return;
    }

    const nextValues: Record<string, string> = {};
    if (!form.getFieldValue('successMessage')) {
      nextValues.successMessage = getGlobalMessageCopy(globalConfigDetail, 'form.success');
    }
    if (!form.getFieldValue('failureMessage')) {
      nextValues.failureMessage = getGlobalMessageCopy(globalConfigDetail, 'form.error');
    }

    if (Object.keys(nextValues).length > 0) {
      form.setFieldsValue(nextValues);
    }
  }, [form, globalConfigDetail, isOpen, widget.type]);

  const handleOk = useCallback(async (): Promise<boolean> => {
    try {
      const values = await form.validateFields();
      if (widget?.type === 'chart' && values.chartPreset === 'gauge') {
        const gaugeMin = values.gaugeMin
        const gaugeMax = values.gaugeMax

        if (
          gaugeMin != null
          && gaugeMax != null
          && Number(gaugeMax) < Number(gaugeMin)
        ) {
          form.setFields([
            { name: 'gaugeMin', errors: ['最小值不能大于最大值'] },
            { name: 'gaugeMax', errors: ['最大值不能小于最小值'] },
          ])
          message.warning('最大值不能小于最小值')
          return false
        }

        form.setFields([
          { name: 'gaugeMin', errors: [] },
          { name: 'gaugeMax', errors: [] },
        ])
      }

      if (widget?.type === 'queryFilter') {
        const rawQueryFields = form.getFieldValue('queryFields') || values.queryFields;
        values.queryFields = Array.isArray(rawQueryFields)
          ? rawQueryFields.map((field: QueryFilterFieldConfig) => ({
            ...field,
            manualOptions: Array.isArray(field.manualOptions)
              ? field.manualOptions.map(option => ({ ...option }))
              : field.manualOptions,
          }))
          : rawQueryFields;
      }

      // customForm: 校验字段名及 Select/Radio 选项
      if (widget?.type === 'customForm' && values.fields) {
        const formFields = values.fields as FormField[];
        let fieldError = '';

        // 校验字段名不能为空或重复
        const nameCountMap: Record<string, number> = {};
        for (const field of formFields) {
          if (!field.name || !field.name.trim()) {
            fieldError = `字段「${field.label}」的字段名不能为空`;
            break;
          }
          nameCountMap[field.name] = (nameCountMap[field.name] || 0) + 1;
        }
        if (!fieldError) {
          const dupName = Object.keys(nameCountMap).find(k => nameCountMap[k] > 1);
          if (dupName) {
            fieldError = `字段名「${dupName}」重复，请修改`;
          }
        }

        // 校验 Select/Radio 选项的 value 不能为空或重复
        if (!fieldError) {
          for (const field of formFields) {
            if (['select', 'radio'].includes(field.type) && field.options?.length) {
              const hasEmpty = field.options.some((o: { label: string; value: string | number }) => !String(o.value).trim());
              if (hasEmpty) {
                fieldError = `字段「${field.label}」的选项值不能为空`;
                break;
              }
              const vals = field.options.map((o: { label: string; value: string | number }) => String(o.value));
              if (vals.length !== new Set(vals).size) {
                fieldError = `字段「${field.label}」的选项值不能重复`;
                break;
              }
            }
          }
        }

        if (fieldError) {
          message.warning(fieldError);
          return false;
        }
      }

      if (widget?.type === 'queryFilter' && values.queryFields) {
        const queryFields = values.queryFields as QueryFilterFieldConfig[];
        let fieldError = '';
        const fieldNameCountMap: Record<string, number> = {};

        for (const field of queryFields) {
          const trimmedFieldName = field.field?.trim();

          if (!trimmedFieldName) {
            fieldError = `字段「${field.label || '未命名字段'}」的 field 名不能为空`;
            break;
          }
          if (trimmedFieldName.length > QUERY_FILTER_FIELD_NAME_MAX_LENGTH) {
            fieldError = `字段「${field.label || '未命名字段'}」的 field 名不能超过 ${QUERY_FILTER_FIELD_NAME_MAX_LENGTH} 个字符`;
            break;
          }
          fieldNameCountMap[trimmedFieldName] = (fieldNameCountMap[trimmedFieldName] || 0) + 1;
        }

        if (!fieldError) {
          const duplicatedField = Object.keys(fieldNameCountMap).find(key => fieldNameCountMap[key] > 1);
          if (duplicatedField) {
            fieldError = `字段名「${duplicatedField}」重复，请修改`;
          }
        }

        if (!fieldError) {
          for (const field of queryFields) {
            if (['checkboxGroup', 'radioGroup', 'select'].includes(field.type)) {
              const options = field.manualOptions || [];
              if (field.dataSourceType === 'manual' && options.length > 0) {
                const hasEmpty = options.some(option => !String(option.value ?? '').trim());
                if (hasEmpty) {
                  fieldError = `字段「${field.label}」的选项值不能为空`;
                  break;
                }
                const valuesSet = options.map(option => String(option.value));
                if (valuesSet.length !== new Set(valuesSet).size) {
                  fieldError = `字段「${field.label}」的选项值不能重复`;
                  break;
                }
              }
            }

            if (field.type === 'cascader' && field.dataMode === 'json' && field.jsonData?.trim()) {
              try {
                JSON.parse(field.jsonData);
              } catch {
                fieldError = `字段「${field.label}」的级联 JSON 格式不正确`;
                break;
              }
            }
          }
        }

        if (fieldError) {
          message.warning(fieldError);
          return false;
        }
      }

      // 分组配置保存
      if (isGroup && group) {
        const {
          title,
          showTitle,
          titleUseGlobalConfig,
          titleGlobalThemeId,
          titleColor,
          titleFontSize,
          titleFontWeight,
          backgroundUseGlobalConfig,
          backgroundGlobalThemeId,
          backgroundType,
          backgroundColor,
          backgroundImage,
          backgroundGradient,
          backgroundSize,
          backgroundRepeat,
          backgroundPosition,
          backdropBlur,
          borderStyle,
          borderColor,
          borderWidth,
          borderRadius,
          padding,
        } = values;

        // Normalize color
        let normalizedBgColor = backgroundColor;
        if (typeof normalizedBgColor === 'object' && normalizedBgColor?.toHexString) {
          normalizedBgColor = normalizedBgColor.toHexString();
        }
        let normalizedBorderColor = borderColor;
        if (typeof normalizedBorderColor === 'object' && normalizedBorderColor?.toHexString) {
          normalizedBorderColor = normalizedBorderColor.toHexString();
        }
        let normalizedTitleColor = titleColor;
        if (typeof normalizedTitleColor === 'object' && normalizedTitleColor?.toHexString) {
          normalizedTitleColor = normalizedTitleColor.toHexString();
        }

        // 更新分组标题
        updateGroup(group.id, { title });

        // 更新分组配置
        updateGroupConfig(group.id, {
          showTitle,
          titleUseGlobalConfig,
          titleGlobalThemeId,
          titleColor: normalizedTitleColor,
          titleFontSize,
          titleFontWeight,
          backgroundUseGlobalConfig,
          backgroundGlobalThemeId,
          backgroundType,
          backgroundColor: normalizedBgColor,
          backgroundImage,
          backgroundGradient,
          backgroundSize,
          backgroundRepeat,
          backgroundPosition,
          backdropBlur,
          borderStyle,
          borderColor: normalizedBorderColor,
          borderWidth,
          borderRadius,
          padding,
        } as any);

        message.success('配置保存成功');
        return true;
      }

      if (isFloatingModule) {
        // 悬浮模块配置
        const {
          title,
          showTitle,
          titleUseGlobalConfig,
          titleGlobalThemeId,
          titleColor,
          titleFontSize,
          titleFontWeight,
          refreshInterval,
          // 尺寸配置
          width,
          height,
          minWidth,
          minHeight,
          maxWidth,
          maxHeight,
          // 行为配置
          collapsible,
          closable,
          // 样式配置
          theme,
          borderRadius,
          zIndex,
          // 折叠状态配置
          collapsedWidth,
          collapsedHeight,
          collapsedIcon,
          collapsedBgColor,
          collapsedIconSize,
          // 微应用特定字段
          systemId,
          moduleId,
          sync,
          alive,
          eventRoutes,
          icon: rawIcon,
          forceIconOnly,
          // 背景配置
          backgroundUseGlobalConfig,
          backgroundGlobalThemeId,
          backgroundType,
          backgroundColor,
          backgroundImage,
          backgroundGradient,
          backgroundSize,
          backgroundRepeat,
          backgroundPosition,
          headerColor,
          // 助手中心特定字段
          entries,
          ...restConfig
        } = values;
        const normalizedForceIcon = !!forceIconOnly;
        // 根据图值类型分别存储到 icon 或 iconSvg
        const iconValueType = getIconValueType(rawIcon);
        const icon = iconValueType === 'svg' ? '' : (rawIcon || '');
        const cleanedIconSvg = iconValueType === 'svg' ? rawIcon?.trim() : '';
        // 规范化折叠背景色
        const normalizedCollapsedBgColor = normalizeColorValue(collapsedBgColor);
        // 规范化标题颜色
        const normalizedTitleColor = normalizeColorValue(titleColor);
        // 规范化背景色（保留 alpha 透明度）
        const normalizedBgColor = normalizeColorValue(backgroundColor);
        // 规范化头部颜色
        const normalizedHeaderColor = normalizeColorValue(headerColor);

        updateFloatingModule(widget.id, { title }); // 更新 title

        if (widget.type === 'microApp') {
          // 微应用类型的悬浮模块
          updateFloatingModuleConfig(widget.id, {
            ...widget.config,
            showTitle,
            titleUseGlobalConfig,
            titleGlobalThemeId,
            titleColor: normalizedTitleColor,
            titleFontSize,
            titleFontWeight,
            refreshInterval,
            // 尺寸配置
            width,
            height,
            minWidth,
            minHeight,
            maxWidth,
            maxHeight,
            // 行为配置
            collapsible,
            closable,
            showHeader: showTitle, // showHeader 使用 showTitle 的值
            // 样式配置
            theme,
            borderRadius,
            zIndex,
            // 背景配置
            backgroundType,
            backgroundUseGlobalConfig,
            backgroundGlobalThemeId,
            backgroundColor: normalizedBgColor,
            backgroundImage,
            backgroundGradient,
            backgroundSize,
            backgroundRepeat,
            backgroundPosition,
            headerColor: normalizedHeaderColor,
            // 折叠状态配置
            collapsedWidth,
            collapsedHeight,
            collapsedIcon,
            collapsedBgColor: normalizedCollapsedBgColor,
            collapsedIconSize,
            // 微应用配置
            microApp: {
              ...widget.config.microApp,
              systemId,
              moduleId,
              sync,
              alive,
              icon,
              iconSvg: cleanedIconSvg || undefined,
              forceIconOnly: normalizedForceIcon,
            },
            eventRoutes: eventRoutes || [],
            icon,
            iconSvg: cleanedIconSvg || undefined,
            forceIconOnly: normalizedForceIcon,
          });

          // 重新设置事件监听器
          setTimeout(() => {
            microAppCommunication.setupEventListeners();
          }, 100);

          await syncModuleConfig(systemId, moduleId, {
            icon: icon || '',
            iconSvg: cleanedIconSvg || '',
            forceIconOnly: normalizedForceIcon,
          });
        } else {
          // 本地组件类型的悬浮模块
          const fmConfig = widget.config as FloatingModuleConfig;
          const updatedLocalComponent = fmConfig.localComponent ? {
            ...fmConfig.localComponent,
            componentProps: {
              ...fmConfig.localComponent.componentProps,
              // 如果是助手中心，保存 entries 配置
              ...(entries ? { entries } : {}),
            },
          } : undefined;

          updateFloatingModuleConfig(widget.id, {
            ...widget.config,
            showTitle,
            titleUseGlobalConfig,
            titleGlobalThemeId,
            titleColor: normalizedTitleColor,
            titleFontSize,
            titleFontWeight,
            refreshInterval,
            // 尺寸配置
            width,
            height,
            minWidth,
            minHeight,
            maxWidth,
            maxHeight,
            // 行为配置
            collapsible,
            closable,
            showHeader: showTitle, // showHeader 使用 showTitle 的值
            // 样式配置
            theme,
            borderRadius,
            zIndex,
            // 背景配置
            backgroundType,
            backgroundUseGlobalConfig,
            backgroundGlobalThemeId,
            backgroundColor: normalizedBgColor,
            backgroundImage,
            backgroundGradient,
            backgroundSize,
            backgroundRepeat,
            backgroundPosition,
            headerColor: normalizedHeaderColor,
            // 折叠状态配置
            collapsedWidth,
            collapsedHeight,
            collapsedIcon,
            collapsedBgColor: normalizedCollapsedBgColor,
            collapsedIconSize,
            // 本地组件配置
            localComponent: updatedLocalComponent,
            ...restConfig,
          });
        }
      } else {
        // 普通小部件配置
        if (widget.type === 'microApp') {
          // 微应用配置
          const {
            title, showTitle, titleUseGlobalConfig, titleGlobalThemeId, titleColor, titleFontSize,
            titleFontWeight, refreshInterval, systemId, moduleId, sync, alive, eventRoutes, icon: rawIcon,
            backgroundUseGlobalConfig, backgroundGlobalThemeId, backgroundType, backgroundColor, backgroundImage, backgroundGradient,
            backgroundSize, backgroundRepeat, backgroundPosition, forceIconOnly, contentPadding
          } = values;
          const normalizedForceIcon = !!forceIconOnly;
          // 根据图标值类型分别存储到 icon 或 iconSvg
          const iconType = getIconValueType(rawIcon);
          const icon = iconType === 'svg' ? '' : (rawIcon || '');
          const cleanedIconSvg = iconType === 'svg' ? rawIcon?.trim() : '';

          // Normalize colors
          let normalizedBgColor = backgroundColor;
          if (typeof normalizedBgColor === 'object' && normalizedBgColor?.toHexString) {
            normalizedBgColor = normalizedBgColor.toHexString();
          }
          let normalizedTitleColor = titleColor;
          if (typeof normalizedTitleColor === 'object' && normalizedTitleColor?.toRgbString) {
            normalizedTitleColor = normalizedTitleColor.toRgbString();
          } else if (typeof normalizedTitleColor === 'object' && normalizedTitleColor?.toHexString) {
            normalizedTitleColor = normalizedTitleColor.toHexString();
          }

          updateWidget(widget.id, {
            title,
            config: {
              ...widget.config,
              showTitle,
              titleUseGlobalConfig,
              titleGlobalThemeId,
              titleColor: normalizedTitleColor,
              titleFontSize,
              titleFontWeight,
              refreshInterval,
              systemId,
              moduleId,
              sync,
              alive,
              icon,
              iconSvg: cleanedIconSvg || undefined,
              forceIconOnly: normalizedForceIcon,
              eventRoutes: eventRoutes || [],
              backgroundUseGlobalConfig,
              backgroundGlobalThemeId,
              backgroundType,
              backgroundColor: normalizedBgColor,
              backgroundImage,
              backgroundGradient,
              backgroundSize,
              backgroundRepeat,
              backgroundPosition,
              contentPadding,
            },
          });

          // 重新设置事件监听器
          setTimeout(() => {
            microAppCommunication.setupEventListeners();
          }, 100);

          await syncModuleConfig(systemId, moduleId, {
            icon: icon || '',
            iconSvg: cleanedIconSvg || '',
            forceIconOnly: normalizedForceIcon,
          });
        } else {
          // 其他小部件配置
          const {
            title,
            showTitle,
            titleUseGlobalConfig,
            titleGlobalThemeId,
            titleColor,
            titleFontSize,
            titleFontWeight,
            refreshInterval,
            apiEndpoint,
            backgroundUseGlobalConfig,
            backgroundGlobalThemeId,
            backgroundType,
            backgroundColor,
            backgroundImage,
            backgroundGradient,
            contentPadding,
            ...restConfig
          } = values;

          // 规范化颜色值的辅助函数
          const normalizeColor = (color: any): string | undefined => {
            if (!color) return undefined;
            if (typeof color === 'string') return color;
            // 优先使用 toRgbString 保留透明度信息
            if (typeof color === 'object' && color?.toRgbString) {
              return color.toRgbString();
            }
            if (typeof color === 'object' && color?.toHexString) {
              return color.toHexString();
            }
            return undefined;
          };

          // Normalize background color (使用 rgba 格式保留透明度)
          const normalizedBgColor = normalizeColor(backgroundColor);
          // Normalize title color
          const normalizedTitleColor = normalizeColor(titleColor);

          // 规范化 restConfig 中的所有颜色值
          const normalizedRestConfig = { ...restConfig };
          // typography 组件字体颜色
          if (normalizedRestConfig.color) {
            normalizedRestConfig.color = normalizeColor(normalizedRestConfig.color);
          }
          // headerBar 组件文字颜色
          if (normalizedRestConfig.textColor) {
            normalizedRestConfig.textColor = normalizeColor(normalizedRestConfig.textColor);
          }
          // myDocuments 按钮颜色
          if (normalizedRestConfig.btnColor) {
            normalizedRestConfig.btnColor = normalizeColor(normalizedRestConfig.btnColor);
          }
          if (normalizedRestConfig.btnTextColor) {
            normalizedRestConfig.btnTextColor = normalizeColor(normalizedRestConfig.btnTextColor);
          }
          if (normalizedRestConfig.iconColor) {
            normalizedRestConfig.iconColor = normalizeColor(normalizedRestConfig.iconColor);
          }
          if (normalizedRestConfig.itemIconColor) {
            normalizedRestConfig.itemIconColor = normalizeColor(normalizedRestConfig.itemIconColor);
          }
          if (normalizedRestConfig.itemBgColor) {
            normalizedRestConfig.itemBgColor = normalizeColor(normalizedRestConfig.itemBgColor);
          }
          if (normalizedRestConfig.itemTextColor) {
            normalizedRestConfig.itemTextColor = normalizeColor(normalizedRestConfig.itemTextColor);
          }
          if (normalizedRestConfig.navTextColor) {
            normalizedRestConfig.navTextColor = normalizeColor(normalizedRestConfig.navTextColor);
          }
          // pageNavigator 的颜色字段
          if (normalizedRestConfig.itemColor) {
            normalizedRestConfig.itemColor = normalizeColor(normalizedRestConfig.itemColor);
          }
          // customForm 按钮颜色
          if (normalizedRestConfig.submitButtonColor) {
            normalizedRestConfig.submitButtonColor = normalizeColor(normalizedRestConfig.submitButtonColor);
          }
          if (normalizedRestConfig.submitButtonTextColor) {
            normalizedRestConfig.submitButtonTextColor = normalizeColor(normalizedRestConfig.submitButtonTextColor);
          }
          if (normalizedRestConfig.resetButtonColor) {
            normalizedRestConfig.resetButtonColor = normalizeColor(normalizedRestConfig.resetButtonColor);
          }
          if (normalizedRestConfig.resetButtonTextColor) {
            normalizedRestConfig.resetButtonTextColor = normalizeColor(normalizedRestConfig.resetButtonTextColor);
          }

          // apiHeadersList 数组转换为 apiHeaders 对象
          if (normalizedRestConfig.apiHeadersList) {
            const headers: Record<string, string> = {};
            (normalizedRestConfig.apiHeadersList as { key: string; value: string }[]).forEach(item => {
              if (item.key?.trim()) {
                headers[item.key.trim()] = item.value || '';
              }
            });
            normalizedRestConfig.apiHeaders = Object.keys(headers).length > 0 ? headers : undefined;
            delete normalizedRestConfig.apiHeadersList;
          }

          if ('apiQueryList' in normalizedRestConfig) {
            normalizedRestConfig.apiQuery = keyValueListToJsonString(normalizedRestConfig.apiQueryList);
            delete normalizedRestConfig.apiQueryList;
          } else if (typeof normalizedRestConfig.apiQuery === 'string') {
            normalizedRestConfig.apiQuery = normalizedRestConfig.apiQuery.trim() || undefined;
          }

          if ('apiBodyList' in normalizedRestConfig) {
            normalizedRestConfig.apiBody = keyValueListToJsonString(normalizedRestConfig.apiBodyList);
            delete normalizedRestConfig.apiBodyList;
          } else if (typeof normalizedRestConfig.apiBody === 'string') {
            normalizedRestConfig.apiBody = normalizedRestConfig.apiBody.trim() || undefined;
          }
          if (typeof normalizedRestConfig.apiDataField === 'string') {
            normalizedRestConfig.apiDataField = normalizedRestConfig.apiDataField.trim() || undefined;
          }
          if (typeof normalizedRestConfig.apiListField === 'string') {
            normalizedRestConfig.apiListField = normalizedRestConfig.apiListField.trim() || undefined;
          }

          if (widget.type === 'queryFilter') {
            normalizedRestConfig.queryFields = normalizeQueryFilterFields(normalizedRestConfig.queryFields);
            normalizedRestConfig.formLayout = ['vertical', 'horizontal', 'inline'].includes(normalizedRestConfig.formLayout)
              ? normalizedRestConfig.formLayout
              : 'vertical';
            normalizedRestConfig.labelVerticalAlign = ['top', 'center', 'bottom'].includes(normalizedRestConfig.labelVerticalAlign)
              ? normalizedRestConfig.labelVerticalAlign
              : 'top';
            normalizedRestConfig.labelTextAlign = ['left', 'center', 'right'].includes(normalizedRestConfig.labelTextAlign)
              ? normalizedRestConfig.labelTextAlign
              : 'left';
            normalizedRestConfig.labelWidth = normalizedRestConfig.formLayout === 'horizontal' &&
              typeof normalizedRestConfig.labelWidth === 'number'
              ? normalizedRestConfig.labelWidth
              : 96;
            normalizedRestConfig.layoutCols = [1, 2, 3, 4].includes(normalizedRestConfig.layoutCols)
              ? normalizedRestConfig.layoutCols
              : 4;
            normalizedRestConfig.submitButtonText = typeof normalizedRestConfig.submitButtonText === 'string'
              ? normalizedRestConfig.submitButtonText.trim() || '查询'
              : '查询';
            normalizedRestConfig.resetButtonText = typeof normalizedRestConfig.resetButtonText === 'string'
              ? normalizedRestConfig.resetButtonText.trim() || '重置'
              : '重置';
            normalizedRestConfig.buttonAlign = normalizedRestConfig.buttonAlign || 'right';
            normalizedRestConfig.fieldSpacing = typeof normalizedRestConfig.fieldSpacing === 'number'
              ? normalizedRestConfig.fieldSpacing
              : 16;

            if (normalizedRestConfig.apiMethod === 'GET') {
              normalizedRestConfig.apiBody = undefined;
            }
          }

          if (COMMON_STATIC_DATA_WIDGET_TYPES.includes(widget.type)) {
            const dataSource = normalizeDataSourceMode(normalizedRestConfig.dataSource) || 'customApi';
            const staticDataText =
              typeof normalizedRestConfig.staticData === 'string'
                ? normalizedRestConfig.staticData.trim()
                : '';

            if (dataSource === 'static') {
              normalizedRestConfig.staticData = staticDataText ? JSON.parse(staticDataText) : undefined;
              normalizedRestConfig.dataSourceId = undefined;
              normalizedRestConfig.timeout = undefined;
              normalizedRestConfig.apiEndpoint = undefined;
              normalizedRestConfig.apiMethod = undefined;
              normalizedRestConfig.apiHeaders = undefined;
              normalizedRestConfig.apiQuery = undefined;
              normalizedRestConfig.apiBody = undefined;
              normalizedRestConfig.apiDataField = undefined;
              normalizedRestConfig.apiListField = undefined;

              if (widget.type === 'dataTable') {
                normalizedRestConfig.tableData = Array.isArray(normalizedRestConfig.staticData)
                  ? normalizedRestConfig.staticData
                  : [];
              }

              if (widget.type === 'news') {
                normalizedRestConfig.newsItems = Array.isArray(normalizedRestConfig.staticData)
                  ? normalizedRestConfig.staticData
                  : [];
              }

              if (widget.type === 'topList') {
                normalizedRestConfig.listItems = Array.isArray(normalizedRestConfig.staticData)
                  ? normalizedRestConfig.staticData
                  : [];
              }
            } else {
              normalizedRestConfig.staticData = undefined;

              if (widget.type === 'dataTable') {
                normalizedRestConfig.tableData = undefined;
              }

              if (widget.type === 'news') {
                normalizedRestConfig.newsItems = undefined;
              }

              if (widget.type === 'topList') {
                normalizedRestConfig.listItems = undefined;
              }

              if (dataSource === 'customApi') {
                normalizedRestConfig.dataSourceId = undefined;
                normalizedRestConfig.timeout = undefined;
              }

              if (normalizedRestConfig.apiMethod !== 'POST') {
                normalizedRestConfig.apiBody = undefined;
              }
            }
          }

          if (widget.type === 'indicatorCard') {
            normalizedRestConfig.indicatorValueColor = normalizeColorValue(normalizedRestConfig.indicatorValueColor);
            normalizedRestConfig.indicatorDescriptionColor = normalizeColorValue(normalizedRestConfig.indicatorDescriptionColor);
            normalizedRestConfig.indicatorValueFontSize = typeof normalizedRestConfig.indicatorValueFontSize === 'number'
              ? normalizedRestConfig.indicatorValueFontSize
              : undefined;
            normalizedRestConfig.indicatorDescriptionFontSize = typeof normalizedRestConfig.indicatorDescriptionFontSize === 'number'
              ? normalizedRestConfig.indicatorDescriptionFontSize
              : undefined;
            normalizedRestConfig.staticValue = typeof normalizedRestConfig.staticValue === 'string'
              ? normalizedRestConfig.staticValue.trim() || undefined
              : normalizedRestConfig.staticValue;
            normalizedRestConfig.staticDescription = typeof normalizedRestConfig.staticDescription === 'string'
              ? normalizedRestConfig.staticDescription.trim() || undefined
              : normalizedRestConfig.staticDescription;
            normalizedRestConfig.valueField = typeof normalizedRestConfig.valueField === 'string'
              ? normalizedRestConfig.valueField.trim() || undefined
              : normalizedRestConfig.valueField;
            normalizedRestConfig.descriptionField = typeof normalizedRestConfig.descriptionField === 'string'
              ? normalizedRestConfig.descriptionField.trim() || undefined
              : normalizedRestConfig.descriptionField;

            const dataSource = normalizeDataSourceMode(normalizedRestConfig.dataSource) || 'static';

            if (dataSource === 'static') {
              normalizedRestConfig.dataSourceId = undefined;
              normalizedRestConfig.timeout = undefined;
              normalizedRestConfig.apiEndpoint = undefined;
              normalizedRestConfig.apiMethod = undefined;
              normalizedRestConfig.apiHeaders = undefined;
              normalizedRestConfig.apiQuery = undefined;
              normalizedRestConfig.apiBody = undefined;
              normalizedRestConfig.apiDataField = undefined;
            } else {
              normalizedRestConfig.staticValue = undefined;
              normalizedRestConfig.staticDescription = undefined;

              if (dataSource === 'customApi') {
                normalizedRestConfig.dataSourceId = undefined;
                normalizedRestConfig.timeout = undefined;
              }

              if (normalizedRestConfig.apiMethod !== 'POST') {
                normalizedRestConfig.apiBody = undefined;
              }
            }
          }

          if (widget.type === 'chart') {
            normalizedRestConfig.emitInteraction = undefined;
            normalizedRestConfig.listenInteraction = undefined;
            normalizedRestConfig.gridTop = typeof normalizedRestConfig.gridTop === 'string'
              ? normalizedRestConfig.gridTop.trim() || undefined
              : normalizedRestConfig.gridTop;
            normalizedRestConfig.gridBottom = typeof normalizedRestConfig.gridBottom === 'string'
              ? normalizedRestConfig.gridBottom.trim() || undefined
              : normalizedRestConfig.gridBottom;
            normalizedRestConfig.gridLeft = typeof normalizedRestConfig.gridLeft === 'string'
              ? normalizedRestConfig.gridLeft.trim() || undefined
              : normalizedRestConfig.gridLeft;
            normalizedRestConfig.gridRight = typeof normalizedRestConfig.gridRight === 'string'
              ? normalizedRestConfig.gridRight.trim() || undefined
              : normalizedRestConfig.gridRight;
            normalizedRestConfig.geoJsonText = typeof normalizedRestConfig.geoJsonText === 'string'
              ? normalizedRestConfig.geoJsonText.trim() || undefined
              : normalizedRestConfig.geoJsonText;
            normalizedRestConfig.geoJsonUrl = typeof normalizedRestConfig.geoJsonUrl === 'string'
              ? normalizedRestConfig.geoJsonUrl.trim() || undefined
              : normalizedRestConfig.geoJsonUrl;
            normalizedRestConfig.geoJsonNameProperty = typeof normalizedRestConfig.geoJsonNameProperty === 'string'
              ? normalizedRestConfig.geoJsonNameProperty.trim() || 'name'
              : normalizedRestConfig.geoJsonNameProperty;
            normalizedRestConfig.xAxisName = typeof normalizedRestConfig.xAxisName === 'string'
              ? normalizedRestConfig.xAxisName.trim() || undefined
              : normalizedRestConfig.xAxisName;
            normalizedRestConfig.yAxisName = typeof normalizedRestConfig.yAxisName === 'string'
              ? normalizedRestConfig.yAxisName.trim() || undefined
              : normalizedRestConfig.yAxisName;
            normalizedRestConfig.yAxisName2 = typeof normalizedRestConfig.yAxisName2 === 'string'
              ? normalizedRestConfig.yAxisName2.trim() || undefined
              : normalizedRestConfig.yAxisName2;
            normalizedRestConfig.mapAreaColor = normalizeColorValue(normalizedRestConfig.mapAreaColor);
            normalizedRestConfig.mapBorderColor = normalizeColorValue(normalizedRestConfig.mapBorderColor);
            normalizedRestConfig.mapEmphasisAreaColor = normalizeColorValue(normalizedRestConfig.mapEmphasisAreaColor);
            normalizedRestConfig.flowLineColor = normalizeColorValue(normalizedRestConfig.flowLineColor);
            normalizedRestConfig.flowNodeColor = normalizeColorValue(normalizedRestConfig.flowNodeColor);
            normalizedRestConfig.visualMapStartColor = normalizeColorValue(normalizedRestConfig.visualMapStartColor);
            normalizedRestConfig.visualMapEndColor = normalizeColorValue(normalizedRestConfig.visualMapEndColor);

            if (normalizedRestConfig.geoJsonSource === 'url') {
              normalizedRestConfig.geoJsonText = undefined;
            } else {
              normalizedRestConfig.geoJsonUrl = undefined;
            }
          }

          if (['news', 'topList'].includes(widget.type)) {
            normalizedRestConfig.paginationMode = undefined;
            normalizedRestConfig.paginationConfig = undefined;
          } else if (normalizedRestConfig.paginationMode !== 'pagination') {
            normalizedRestConfig.paginationConfig = undefined;
          } else if (normalizedRestConfig.paginationConfig) {
            normalizedRestConfig.paginationConfig = {
              ...normalizedRestConfig.paginationConfig,
              page: Number(normalizedRestConfig.paginationConfig.page) || 1,
              pageSize: Number(normalizedRestConfig.paginationConfig.pageSize) || 10,
              pageParam: normalizedRestConfig.paginationConfig.pageParam?.trim() || undefined,
              pageSizeParam: normalizedRestConfig.paginationConfig.pageSizeParam?.trim() || undefined,
              totalField: normalizedRestConfig.paginationConfig.totalField?.trim() || undefined,
              currentField: normalizedRestConfig.paginationConfig.currentField?.trim() || undefined,
              pageSizeField: normalizedRestConfig.paginationConfig.pageSizeField?.trim() || undefined,
              showTotal: normalizedRestConfig.paginationConfig.showTotal ?? false,
            };
          }

          if (normalizedRestConfig.backgroundColor) {
            normalizedRestConfig.backgroundColor = normalizeColorValue(
              normalizedRestConfig.backgroundColor,
              normalizedBgColor,
            );
          }

          if (normalizedRestConfig.overlayColor) {
            normalizedRestConfig.overlayColor = normalizeColorValue(normalizedRestConfig.overlayColor);
          }

          // navGroup 特殊处理：数据来源和静态导航项
          if (widget.type === 'navGroup') {
            const dataSource = normalizeDataSourceMode(normalizedRestConfig.dataSource) || 'customApi';
            if (dataSource === 'static') {
              // 手动配置模式：规范化 staticItems 中的颜色值，清除 apiEndpoint
              if (normalizedRestConfig.staticItems && Array.isArray(normalizedRestConfig.staticItems)) {
                normalizedRestConfig.staticItems = normalizedRestConfig.staticItems.map((item: any) => ({
                  ...item,
                  iconBgColor: normalizeColor(item.iconBgColor),
                  iconColor: normalizeColor(item.iconColor),
                  textColor: normalizeColor(item.textColor),
                }));
              }
              // 清除 apiEndpoint、apiHeaders、apiMethod、apiBody
              normalizedRestConfig.dataSourceId = undefined;
              normalizedRestConfig.timeout = undefined;
              normalizedRestConfig.apiEndpoint = undefined;
              normalizedRestConfig.apiHeaders = undefined;
              normalizedRestConfig.apiMethod = undefined;
              normalizedRestConfig.apiQuery = undefined;
              normalizedRestConfig.apiBody = undefined;
              normalizedRestConfig.apiDataField = undefined;
              normalizedRestConfig.apiListField = undefined;
            } else {
              // 接口模式：清除 staticItems
              normalizedRestConfig.staticItems = undefined;
              if (dataSource === 'customApi') {
                normalizedRestConfig.dataSourceId = undefined;
                normalizedRestConfig.timeout = undefined;
              }
              // 非 POST 时清除请求体
              if (normalizedRestConfig.apiMethod !== 'POST') {
                normalizedRestConfig.apiBody = undefined;
              }
            }
          } else if (widget.type === 'headerBar') {
            const navSource =
              normalizeDataSourceMode(normalizedRestConfig.navDataSource) ||
              (normalizedRestConfig.navDataSourceId
                ? 'dataSource'
                : (normalizedRestConfig.navItems?.length ? 'static' : 'customApi'));
            normalizedRestConfig.navDataSource = navSource;
            if (navSource === 'static') {
              normalizedRestConfig.navDataSourceId = undefined;
              normalizedRestConfig.navTimeout = undefined;
              normalizedRestConfig.navApiEndpoint = undefined;
              normalizedRestConfig.navApiMethod = undefined;
              normalizedRestConfig.navApiHeaders = undefined;
              normalizedRestConfig.navApiQuery = undefined;
              normalizedRestConfig.navApiBody = undefined;
              normalizedRestConfig.navApiListField = undefined;
              normalizedRestConfig.navFieldMapping = undefined;
              delete normalizedRestConfig.navApiHeadersList;
              delete normalizedRestConfig.navApiQueryList;
              delete normalizedRestConfig.navApiBodyList;
              if (!Array.isArray(normalizedRestConfig.navItems)) {
                normalizedRestConfig.navItems = [];
              }
            } else {
              normalizedRestConfig.navItems = undefined;
              if (navSource === 'customApi') {
                normalizedRestConfig.navDataSourceId = undefined;
                normalizedRestConfig.navTimeout = undefined;
              }

              if (normalizedRestConfig.navApiHeadersList) {
                const headers: Record<string, string> = {};
                (normalizedRestConfig.navApiHeadersList as { key: string; value: string }[]).forEach(item => {
                  if (item.key?.trim()) {
                    headers[item.key.trim()] = item.value || '';
                  }
                });
                normalizedRestConfig.navApiHeaders = Object.keys(headers).length > 0 ? headers : undefined;
                delete normalizedRestConfig.navApiHeadersList;
              }

              if ('navApiQueryList' in normalizedRestConfig) {
                normalizedRestConfig.navApiQuery =
                  keyValueListToObject(normalizedRestConfig.navApiQueryList);
                delete normalizedRestConfig.navApiQueryList;
              } else if (typeof normalizedRestConfig.navApiQuery === 'string') {
                normalizedRestConfig.navApiQuery =
                  normalizedRestConfig.navApiQuery.trim() || undefined;
              }

              if (typeof normalizedRestConfig.navApiListField === 'string') {
                normalizedRestConfig.navApiListField =
                  normalizedRestConfig.navApiListField.trim() || undefined;
              }

              if (normalizedRestConfig.navApiMethod !== 'POST') {
                normalizedRestConfig.navApiBody = undefined;
                delete normalizedRestConfig.navApiBodyList;
              } else if ('navApiBodyList' in normalizedRestConfig) {
                normalizedRestConfig.navApiBody =
                  keyValueListToObject(normalizedRestConfig.navApiBodyList);
                delete normalizedRestConfig.navApiBodyList;
              } else if (typeof normalizedRestConfig.navApiBody === 'string') {
                const bodyText = normalizedRestConfig.navApiBody.trim();
                normalizedRestConfig.navApiBody = bodyText ? JSON.parse(bodyText) : undefined;
              }
            }
          }

          // link 快捷链接：规范化 links 中的颜色值
          if (normalizedRestConfig.links && Array.isArray(normalizedRestConfig.links)) {
            normalizedRestConfig.links = normalizedRestConfig.links.map((item: any) => ({
              ...item,
              iconBgColor: normalizeColor(item.iconBgColor),
              iconColor: normalizeColor(item.iconColor),
            }));
          }

          // stats 统计卡片：规范化 statsItems 中的颜色值
          if (normalizedRestConfig.statsItems && Array.isArray(normalizedRestConfig.statsItems)) {
            normalizedRestConfig.statsItems = normalizedRestConfig.statsItems.map((item: any) => ({
              ...item,
              color: normalizeColor(item.color),
            }));
          }

          if (
            widget.type === 'carousel' &&
            normalizedRestConfig.slides &&
            Array.isArray(normalizedRestConfig.slides)
          ) {
            normalizedRestConfig.slides = normalizedRestConfig.slides.map((slide: any) => ({
              ...slide,
              badgeColor: normalizeColorValue(slide.badgeColor),
              overlayColor: normalizeColorValue(slide.overlayColor),
            }));
          }

          // carousel apiConfig.headersList 数组转换为 headers 对象
          if (widget.type === 'carousel' && normalizedRestConfig.apiConfig) {
            const carouselSourceType =
              normalizeDataSourceMode(normalizedRestConfig.dataSourceType) ||
              (normalizedRestConfig.apiConfig.dataSourceId
                ? 'dataSource'
                : ((normalizedRestConfig.dataSourceType || 'static') === 'static' ? 'static' : 'customApi'));
            normalizedRestConfig.dataSourceType = carouselSourceType;

            if (carouselSourceType === 'static') {
              normalizedRestConfig.apiConfig = undefined;
            } else if (carouselSourceType === 'customApi') {
              normalizedRestConfig.apiConfig.dataSourceId = undefined;
              normalizedRestConfig.apiConfig.timeout = undefined;
            }

            if (normalizedRestConfig.apiConfig) {
              const headersList = normalizedRestConfig.apiConfig.headersList;
              if (headersList && Array.isArray(headersList)) {
                const headers: Record<string, string> = {};
                headersList.forEach((item: { key: string; value: string }) => {
                  if (item.key?.trim()) {
                    headers[item.key.trim()] = item.value || '';
                  }
                });
                normalizedRestConfig.apiConfig.headers = Object.keys(headers).length > 0 ? headers : undefined;
                delete normalizedRestConfig.apiConfig.headersList;
              }

              if ('queryParamsList' in normalizedRestConfig.apiConfig) {
                normalizedRestConfig.apiConfig.queryParams =
                  keyValueListToObject(normalizedRestConfig.apiConfig.queryParamsList);
                delete normalizedRestConfig.apiConfig.queryParamsList;
              } else if (typeof normalizedRestConfig.apiConfig.queryParams === 'string') {
                normalizedRestConfig.apiConfig.queryParams =
                  normalizedRestConfig.apiConfig.queryParams.trim() || undefined;
              }

              if (typeof normalizedRestConfig.apiConfig.listField === 'string') {
                normalizedRestConfig.apiConfig.listField =
                  normalizedRestConfig.apiConfig.listField.trim() || undefined;
              }

              delete normalizedRestConfig.apiConfig.dataField;
              delete normalizedRestConfig.apiConfig.params;

              if (normalizedRestConfig.apiConfig.method !== 'POST') {
                normalizedRestConfig.apiConfig.body = undefined;
                delete normalizedRestConfig.apiConfig.bodyParams;
                delete normalizedRestConfig.apiConfig.bodyParamsList;
              } else if ('bodyParamsList' in normalizedRestConfig.apiConfig) {
                normalizedRestConfig.apiConfig.body =
                  keyValueListToObject(normalizedRestConfig.apiConfig.bodyParamsList);
                delete normalizedRestConfig.apiConfig.bodyParamsList;
                delete normalizedRestConfig.apiConfig.bodyParams;
              } else if (typeof normalizedRestConfig.apiConfig.bodyParams === 'string') {
                const bodyText = normalizedRestConfig.apiConfig.bodyParams.trim();
                normalizedRestConfig.apiConfig.body = bodyText ? JSON.parse(bodyText) : undefined;
                delete normalizedRestConfig.apiConfig.bodyParams;
              } else if (normalizedRestConfig.apiConfig.bodyParams) {
                normalizedRestConfig.apiConfig.body = normalizedRestConfig.apiConfig.bodyParams;
                delete normalizedRestConfig.apiConfig.bodyParams;
              }
            }
          }

          updateWidget(widget.id, {
            title,
            config: {
              ...widget.config,
              showTitle,
              titleUseGlobalConfig,
              titleGlobalThemeId,
              titleColor: normalizedTitleColor,
              titleFontSize,
              titleFontWeight,
              refreshInterval,
              apiEndpoint,
              backgroundUseGlobalConfig,
              backgroundGlobalThemeId,
              backgroundType,
              backgroundColor: normalizedBgColor,
              backgroundImage,
              backgroundGradient,
              contentPadding,
              ...normalizedRestConfig,
            },
          });
        }
      }

      message.success('配置保存成功');
      return true;
    } catch (error: any) {
      if (error?.errorFields) {
        message.warning('当前组件配置存在未完成的必填项，请先处理表单中的报错后再保存');
        return false;
      }

      console.error('Failed to save widget config:', error);
      return false;
    }
  }, [form, group, isGroup, isAssistantHub, isFloatingModule, message, navGroupItemDefaults.itemBgColor, navGroupItemDefaults.itemTextColor, syncModuleConfig, updateFloatingModule, updateFloatingModuleConfig, updateGroup, updateGroupConfig, updateWidget, widget]);

  useEffect(() => {
    onRegisterSaveHandler?.(handleOk);
    return () => {
      onRegisterSaveHandler?.(null);
    };
  }, [handleOk, onRegisterSaveHandler]);

  const renderBasicTab = () => (
    <>
      <Form.Item
        name="title"
        label="标题"
        rules={[{ required: true, message: '请输入标题' }]}
      >
        <Input />
      </Form.Item>

      <div className="config-section-title">标题设置</div>
      <GlobalThemeReferenceFields
        form={form}
        useFieldName="titleUseGlobalConfig"
        themeIdFieldName="titleGlobalThemeId"
        options={globalThemeOptions}
        hint="开启后会自动填充全局主题中的组件标题设置，引用期间不可编辑。"
      />
      <WidgetTitleSettings disabled={titleUseGlobalConfig} />

      <div className="form-row-2">
        <Form.Item
          name="contentPadding"
          label="内容边距"
          tooltip="设置组件内容区域的内边距（单位：像素）"
        >
          <InputNumber min={0} max={100} placeholder="12" addonAfter="px" style={{ width: '100%' }} />
        </Form.Item>
        <div></div>
      </div>

      {REFRESHABLE_WIDGET_TYPES.has(widget.type) && (
        <Form.Item
          name="refreshInterval"
          label="刷新间隔 (秒)"
          rules={[{ type: 'number', min: 0, max: MAX_REFRESH_INTERVAL }]}
        >
          <InputNumber min={0} max={MAX_REFRESH_INTERVAL} placeholder="0 表示不自动刷新" />
        </Form.Item>
      )}

      <div className="config-section-title">背景设置</div>
      <GlobalThemeReferenceFields
        form={form}
        useFieldName="backgroundUseGlobalConfig"
        themeIdFieldName="backgroundGlobalThemeId"
        options={globalThemeOptions}
        hint="开启后会自动填充全局主题中的组件背景设置，引用期间不可编辑。"
      />
      <BackgroundSettings
        form={form}
        initialValues={widget.config as any}
        disabled={backgroundUseGlobalConfig}
      />
    </>
  );

  const renderComponentTab = () => {
    // 检查是否有特定组件配置
    const hasComponentConfig = [
      'typography', 'headerBar', 'link', 'dataTable', 'chart', 'indicatorCard',
      'customForm', 'queryFilter', 'pageNavigator', 'microApp', 'richText',
      'iconNav', 'navGroup', 'carousel', 'myDocuments'
    ].includes(widget.type) || isAssistantHub;

    if (!hasComponentConfig) {
      return <div className="empty-hint">当前组件无需特定组件配置</div>;
    }

    return (
      <>
        {widget.type === 'typography' && (
          <>
            <Form.Item
              name="content"
              label="文本内容"
              rules={[{ required: true, message: '请输入文本内容' }]}
            >
              <Input.TextArea rows={4} />
            </Form.Item>
            <Form.Item name="level" label="标题等级">
              <Select allowClear placeholder="选择标题等级 (默认普通文本)">
                <Select.Option value={1}>H1</Select.Option>
                <Select.Option value={2}>H2</Select.Option>
                <Select.Option value={3}>H3</Select.Option>
                <Select.Option value={4}>H4</Select.Option>
                <Select.Option value={5}>H5</Select.Option>
              </Select>
            </Form.Item>
            <div className="form-row-2">
              <Form.Item name="color" label="字体颜色">
                <ColorPicker showText allowClear />
              </Form.Item>
              <Form.Item name="textAlign" label="对齐方式">
                <Select allowClear>
                  <Select.Option value="left">左对齐</Select.Option>
                  <Select.Option value="center">居中</Select.Option>
                  <Select.Option value="right">右对齐</Select.Option>
                </Select>
              </Form.Item>
            </div>
            <div className="form-row-2">
              <Form.Item name="fontSize" label="字体大小 (px)">
                <InputNumber min={12} max={200} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="fontWeight" label="字体粗细">
                <Select allowClear>
                  <Select.Option value="normal">正常</Select.Option>
                  <Select.Option value="bold">加粗</Select.Option>
                  <Select.Option value={500}>500</Select.Option>
                  <Select.Option value={600}>600</Select.Option>
                </Select>
              </Form.Item>
            </div>
            <div className="form-row-2">
              <Form.Item name="linkUrl" label="跳转链接">
                <Input placeholder="输入链接地址，点击文本可跳转" />
              </Form.Item>
              <Form.Item name="linkTarget" label="打开方式">
                <Select allowClear placeholder="默认当前页面">
                  <Select.Option value="_self">当前页面</Select.Option>
                  <Select.Option value="_blank">新窗口</Select.Option>
                </Select>
              </Form.Item>
            </div>
          </>
        )}

        {widget.type === 'richText' && (
          <>
            <Form.Item
              name="html"
              label="内容"
              rules={[{ required: true, message: '请输入富文本内容' }]}
            >
              <RichTextEditor
                key="rich-text-editor"
                placeholder="请输入富文本内容"
                minHeight={220}
              />
            </Form.Item>
          </>
        )}

        {widget.type === 'headerBar' && (
          <>
            <Form.Item name="headerTitle" label="Header 内容">
              <Input placeholder="请输入Header内容" />
            </Form.Item>
            <div className="form-row-2">
              <Form.Item name="headerAlignment" label="对齐方式" initialValue="left">
                <Select>
                  <Select.Option value="left">左对齐</Select.Option>
                  <Select.Option value="center">居中对齐</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="showUserProfile" label="显示个人中心" valuePropName="checked">
                <Switch />
              </Form.Item>
            </div>
            <div className="form-row-2">
              <Form.Item name="textColor" label="文字颜色">
                <ColorPicker showText allowClear />
              </Form.Item>
              <Form.Item name="headerFontSize" label="字体大小">
                <InputNumber min={12} max={48} placeholder="24" addonAfter="px" />
              </Form.Item>
            </div>
            <div className="form-row-2">
              <Form.Item name="fontFamily" label="字体">
                <Select showSearch allowClear options={[
                  { value: 'YouSheBiaoTiHei', label: 'YouSheBiaoTiHei (优设标题黑)' },
                  { value: 'Microsoft YaHei', label: 'Microsoft YaHei (微软雅黑)' },
                  { value: 'SimHei', label: 'SimHei (黑体)' },
                  { value: 'Arial', label: 'Arial' },
                  { value: 'sans-serif', label: 'sans-serif (无衬线)' },
                ]}
                />
              </Form.Item>
              <Form.Item name="showThemeSwitcher" label="显示换肤按钮" valuePropName="checked">
                <Switch />
              </Form.Item>
            </div>
            <Form.Item
              name="showNavMenu"
              label="显示导航区域"
              tooltip="开启后可在“数据与交互”页签设置数据来源与内容"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item name="icon" label="图标">
              <IconPicker mode="simple" placeholder="选择图标" />
            </Form.Item>
            <Form.Item name="backgroundImage" label="背景图片">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Upload
                  listType="picture"
                  maxCount={1}
                  fileList={fileList}
                  beforeUpload={async (file) => {
                    const isImage = file.type.startsWith('image/');
                    if (!isImage) {
                      message.error('只能上传图片');
                      return false;
                    }
                    setBgUploading(true);
                    setFileList([{ uid: file.uid, name: file.name, status: 'uploading' }]);
                    try {
                      const res = await uploadImage(file);
                      if (res.data?.url) {
                        form.setFieldValue('backgroundImage', res.data.url);
                        setFileList([{ uid: file.uid, name: file.name, status: 'done', url: res.data.url }]);
                        message.success('上传成功');
                      } else {
                        message.error('上传失败');
                        setFileList([]);
                      }
                    } catch {
                      message.error('上传失败');
                      setFileList([]);
                    } finally {
                      setBgUploading(false);
                    }
                    return false;
                  }}
                  onRemove={() => { setFileList([]); form.setFieldValue('backgroundImage', ''); }}
                >
                  <Button icon={bgUploading ? <LoadingOutlined /> : <UploadOutlined />}>
                    {bgUploading ? '上传中' : '上传图片'}
                  </Button>
                </Upload>
              </div>
            </Form.Item>
          </>
        )}

        {widget.type === 'link' && <LinkConfig form={form} widget={widget} />}
        {widget.type === 'chart' && <ChartConfig form={form} widget={widget} />}
        {widget.type === 'indicatorCard' && <IndicatorCardConfig form={form} widget={widget} />}
        {widget.type === 'carousel' && <CarouselConfig form={form} widget={widget} />}

        {widget.type === 'dataTable' && <DataTableConfig form={form} widget={widget} />}

        {widget.type === 'customForm' && (
          <>
            <Divider>表单字段</Divider>
            <Form.Item name="fields" label="字段">
              <FormFieldBuilder />
            </Form.Item>
            <CustomFormStyleConfig form={form} widget={widget} />
          </>
        )}

        {widget.type === 'queryFilter' && (
          <QueryFilterConfig form={form} widget={widget} />
        )}

        {widget.type === 'pageNavigator' && (
          <>
            <div className="form-row-2">
              <Form.Item name="displayMode" label="显示模式">
                <Radio.Group>
                  <Radio.Button value="text">文字</Radio.Button>
                  <Radio.Button value="icon">图标</Radio.Button>
                </Radio.Group>
              </Form.Item>
              <Form.Item name="itemColor" label="颜色">
                <ColorPicker showText allowClear />
              </Form.Item>
            </div>
            <Divider style={{ margin: '12px 0' }} />
            <Form.List name="items">
              {(fields, { add, remove }) => (
                <div className="config-list-container">
                  {fields.map(({ key, name, ...restField }) => (
                    <div key={key} className="config-item-card">
                      <div className="card-content" style={{ padding: '12px', position: 'relative' }}>
                        {/* 删除按钮 */}
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => remove(name)}
                          style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
                        />
                        {/* 第一行：名称 */}
                        <Form.Item
                          {...restField}
                          name={[name, 'name']}
                          label="名称"
                          rules={[{ required: true, message: '请输入名称' }]}
                          style={{ marginBottom: 12 }}
                        >
                          <Input placeholder="请输入导航名称" />
                        </Form.Item>
                        {/* 第二行：路径 */}
                        <Form.Item
                          {...restField}
                          name={[name, 'path']}
                          label="路径"
                          rules={[
                            { required: true, message: '请输入路径' },
                            { pattern: /^(\/|https?:\/\/|\/\/)/, message: '路径需以 / 或 http(s):// 开头' }
                          ]}
                          style={{ marginBottom: 12 }}
                        >
                          <Input placeholder="如: /dashboard 或 https://example.com" />
                        </Form.Item>
                        <div className="form-row-2" style={{ marginBottom: 12 }}>
                          <Form.Item {...restField} name={[name, 'icon']} label="图标" style={{ marginBottom: 0 }}>
                            <IconPicker mode="simple" />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, 'systemId']}
                            label="所属系统"

                            style={{ marginBottom: 0 }}
                          >
                            <Select placeholder="请选择所属系统" options={JUMP_SYSTEM_OPTIONS} />
                          </Form.Item>
                        </div>
                        <Form.Item {...restField} name={[name, 'openInNew']} label="打开方式" initialValue={false} style={{ marginBottom: 0 }}>
                          <Select options={[
                            { label: '当前页', value: false },
                            { label: '新窗口', value: true },
                          ]} />
                        </Form.Item>
                        {/* <Form.Item
                          name="apiListField"
                          label="列表字段路径"
                          tooltip="默认按 payload.groups.list 取值；修改后按填写路径取值。"
                        >
                          <Input placeholder={DEFAULT_NAV_GROUP_LIST_FIELD} />
                        </Form.Item> */}
                      </div>
                    </div>
                  ))}
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    添加导航项
                  </Button>
                </div>
              )}
            </Form.List>
          </>
        )}

        {widget.type === 'microApp' && (
          <>
            <Form.Item
              name="microAppSelector"
              label="微应用选择"
              rules={[{
                validator: async () => {
                  if (!form.getFieldValue('systemId') || !form.getFieldValue('moduleId')) {
                    return Promise.reject(new Error('请选择系统和模块'));
                  }
                  return Promise.resolve();
                }
              }]}
            >
              <MicroAppSelector
                systemId={widget.config.systemId}
                moduleId={widget.config.moduleId}
                onChange={(config: any) => {
                  form.setFieldsValue({
                    systemId: config.systemId,
                    moduleId: config.moduleId,
                    icon: config.module?.iconSvg || config.module?.icon || '',
                    forceIconOnly: config.module?.forceIconOnly ?? form.getFieldValue('forceIconOnly') ?? false,
                    // 切换系统/模块时清空事件路由，避免残留旧模块的配置
                    eventRoutes: [],
                  });
                  form.validateFields(['microAppSelector']);
                }}
              />
            </Form.Item>
            <Form.Item name="systemId" hidden><Input /></Form.Item>
            <Form.Item name="moduleId" hidden><Input /></Form.Item>

            <div className="form-row-2">
              <Form.Item name="sync" label="同步路由" valuePropName="checked"><Switch /></Form.Item>
              <Form.Item name="alive" label="保持存活" valuePropName="checked"><Switch /></Form.Item>
            </div>
            <div className="form-row-2">
              <Form.Item name="icon" label="图标"><IconPicker mode="full" /></Form.Item>
              <Form.Item name="forceIconOnly" label="强制图标" valuePropName="checked"><Switch /></Form.Item>
            </div>
          </>
        )}

        {isAssistantHub && (
          <Form.Item name="entries" label="入口配置">
            <AssistantHubConfig />
          </Form.Item>
        )}

        {widget.type === 'iconNav' && (
          <>
            <Form.Item name="icon" label="图标">
              <IconPicker mode="full" />
            </Form.Item>
            <Form.Item name="url" label="跳转链接">
              <Input placeholder="请输入跳转链接" />
            </Form.Item>
            <Form.Item name="systemId" label="所属系统">
              <Select
                placeholder="请选择所属系统"
                options={JUMP_SYSTEM_OPTIONS}
                allowClear
              />
            </Form.Item>
            <div className="form-row-2">
              <Form.Item name="openInNew" label="新窗口打开" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="iconSize" label="图标大小" rules={[{ type: 'number', min: 16 }]}>
                <InputNumber style={{ width: '100%' }} suffix="px" />
              </Form.Item>
            </div>
            <Form.Item name="iconColor" label="图标颜色">
              <ColorPicker showText allowClear />
            </Form.Item>
            {/* <Form.Item name="tooltip" label="提示文本">
              <Input placeholder="鼠标悬停时显示的提示文本" />
            </Form.Item> */}
          </>
        )}

        {false && widget.type === 'navGroup' && (
          <>
            <Form.Item name="dataSource" label="数据来源" initialValue="api">
              <Radio.Group>
                <Radio value="api">接口获取</Radio>
                <Radio value="static">手动配置</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.dataSource !== cur.dataSource}>
              {({ getFieldValue }) => {
                const dataSource = getFieldValue('dataSource');
                if (dataSource !== 'api') {
                  return null;
                }

                return (
                  <>
                    <Form.Item name="apiEndpoint" label="数据接口">
                      <Input placeholder={getWidgetApiEndpointPlaceholder('navGroup')} />
                    </Form.Item>
                    <div className="form-row-2">
                      <Form.Item name="apiMethod" label="请求方式" initialValue="GET">
                        <Select>
                          <Select.Option value="GET">GET</Select.Option>
                          <Select.Option value="POST">POST</Select.Option>
                        </Select>
                      </Form.Item>
                      <Form.Item
                        name="apiListField"
                        label="列表字段路径"
                        tooltip="默认按 payload.groups.list 取值；修改后按填写路径取值。"
                      >
                        <Input placeholder={DEFAULT_NAV_GROUP_LIST_FIELD} />
                      </Form.Item>
                    </div>
                    <Form.Item label="请求头" tooltip="自定义 HTTP 请求头，如 Authorization、Content-Type 等">
                      <Form.List name="apiHeadersList">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map(({ key, name, ...restField }) => (
                              <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'baseline' }}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'key']}
                                  noStyle
                                  rules={[{ required: true, message: '请输入 Key' }]}
                                >
                                  <Input placeholder="Header Key" />
                                </Form.Item>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'value']}
                                  noStyle
                                  rules={[{ required: true, message: '请输入 Value' }]}
                                >
                                  <Input placeholder="Header Value" />
                                </Form.Item>
                                <DeleteOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f', flexShrink: 0 }} />
                              </div>
                            ))}
                            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} size="small">
                              添加请求头
                            </Button>
                          </>
                        )}
                      </Form.List>
                    </Form.Item>
                    <Form.Item noStyle shouldUpdate={(prev, cur) => prev.apiMethod !== cur.apiMethod}>
                      {({ getFieldValue: getValue }) => {
                        const apiMethod = getValue('apiMethod') || 'GET';
                        if (apiMethod === 'GET') {
                          return (
                            <Form.Item
                              name="apiQuery"
                              label="Query 参数(JSON)"
                              tooltip="GET 请求时会拼接到 URL query 中"
                              rules={[{ validator: validateJson }]}
                            >
                              <Input.TextArea rows={4} placeholder='{"groupType":"portal"}' />
                            </Form.Item>
                          );
                        }

                        return (
                          <Form.Item
                            name="apiBody"
                            label="Body 参数(JSON)"
                            tooltip="POST 请求体，请输入合法的 JSON 格式"
                            rules={[{ validator: validateJson }]}
                          >
                            <Input.TextArea rows={4} placeholder='{"groupType":"portal"}' />
                          </Form.Item>
                        );
                      }}
                    </Form.Item>
                    <div style={{ marginBottom: 12 }}>
                      <WidgetApiDebugButton
                        form={form}
                        buildConfig={formValues => ({
                          endpoint: formValues.apiEndpoint,
                          method: formValues.apiMethod || 'GET',
                          headers: buildHeaderMap(formValues.apiHeadersList),
                          query: formValues.apiQuery,
                          body: formValues.apiBody,
                          listField: formValues.apiListField || DEFAULT_NAV_GROUP_LIST_FIELD,
                        })}
                      />
                    </div>
                    <div className="empty-hint" style={{ marginTop: 8 }}>
                      接口返回中导航数组默认读取 `payload.groups.list`，修改后会严格按你填写的路径取值。
                    </div>
                  </>
                );
              }}
            </Form.Item>
          </>
        )}

        {widget.type === 'navGroup' && (
          <>
            <Form.Item name="layout" label="布局模式">
              <Select>
                <Select.Option value="flex">自适应布局</Select.Option>
                <Select.Option value="grid">网格布局</Select.Option>
                <Select.Option value="list">列表布局</Select.Option>
                <Select.Option value="text">文本列表</Select.Option>
                <Select.Option value="tag">标签导航</Select.Option>
              </Select>
            </Form.Item>

            {/* flex/grid/list 图标模式的特有配置 */}
            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.layout !== cur.layout}>
              {({ getFieldValue }) => {
                const layout = getFieldValue('layout');
                const isIconMode = ['flex', 'grid', 'list'].includes(layout);
                if (!isIconMode) return null;
                return (
                  <>
                    <div className="form-row-2">
                      <Form.Item name="columns" label="列数" rules={[{ type: 'number', min: 2, max: 8 }]} tooltip="仅网格布局生效">
                        <InputNumber style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item name="iconSize" label="图标大小" rules={[{ type: 'number', min: 16 }]}>
                        <InputNumber style={{ width: '100%' }} suffix="px" />
                      </Form.Item>
                    </div>
                    <Form.Item name="showLabel" label="显示名称" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                  </>
                );
              }}
            </Form.Item>

            {/* text 文本列表模式的特有配置 */}
            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.layout !== cur.layout}>
              {({ getFieldValue }) => {
                const layout = getFieldValue('layout');
                if (layout !== 'text') return null;
                return (
                  <>
                    <div className="form-row-2">
                      <Form.Item name="textIcon" label="统一图标" tooltip="留空则使用各项自己的图标">
                        <IconPicker mode="simple" placeholder="SearchOutlined" />
                      </Form.Item>
                      <Form.Item name="textIconSize" label="图标大小" rules={[{ type: 'number', min: 12 }]}>
                        <InputNumber style={{ width: '100%' }} suffix="px" placeholder="16" />
                      </Form.Item>
                    </div>
                    <Form.Item name="textColumns" label="列数" rules={[{ type: 'number', min: 1, max: 4 }]}>
                      <InputNumber style={{ width: '100%' }} placeholder="1" />
                    </Form.Item>
                  </>
                );
              }}
            </Form.Item>

            {/* 所有模式共用的样式配置 */}
            <Divider style={{ margin: '12px 0' }}>导航项样式</Divider>

            {/* 根据布局模式显示提示信息 */}
            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.layout !== cur.layout}>
              {({ getFieldValue }) => {
                const layout = getFieldValue('layout');
                const isIconMode = ['flex', 'grid', 'list'].includes(layout);
                if (isIconMode) {
                  return (
                    <div className="config-hint" style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(22, 119, 255, 0.1)', borderRadius: 6, fontSize: 12, color: '#1677ff' }}>
                      提示：当前模式下，颜色优先级为：数据配置 &gt; 组件配置 &gt; 默认值（随机渐变/主题色）
                    </div>
                  );
                }
                return null;
              }}
            </Form.Item>

            {/* 尺寸配置仅在 text/tag 模式下显示 */}
            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.layout !== cur.layout}>
              {({ getFieldValue }) => {
                const layout = getFieldValue('layout');
                const showSizeConfig = ['text', 'tag'].includes(layout);
                return (
                  <div className="form-row-2">
                    {showSizeConfig && (
                      <Form.Item name="itemSize" label="尺寸">
                        <Select placeholder="中">
                          <Select.Option value="small">小</Select.Option>
                          <Select.Option value="middle">中</Select.Option>
                          <Select.Option value="large">大</Select.Option>
                        </Select>
                      </Form.Item>
                    )}
                    <Form.Item name="itemBorderRadius" label="圆角" rules={[{ type: 'number', min: 0 }]}>
                      <InputNumber style={{ width: '100%' }} suffix="px" placeholder="4" />
                    </Form.Item>
                  </div>
                );
              }}
            </Form.Item>
            <div className="form-row-2">
              <Form.Item name="itemBgColor" label="背景色">
                <ColorPicker showText allowClear />
              </Form.Item>
              <Form.Item name="itemTextColor" label="文字颜色">
                <ColorPicker showText allowClear />
              </Form.Item>
            </div>
            <div className="form-row-2">
              <Form.Item name="itemIconColor" label="图标颜色">
                <ColorPicker showText allowClear />
              </Form.Item>
              <Form.Item name="itemGap" label="间距" rules={[{ type: 'number', min: 0 }]}>
                <InputNumber style={{ width: '100%' }} suffix="px" />
              </Form.Item>
            </div>
            <Form.Item
              label="背景模糊"
              tooltip="背景模糊效果，需配合半透明背景色使用"
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Form.Item name="itemBlur" noStyle>
                  <Slider min={0} max={30} step={1} style={{ flex: 1 }} />
                </Form.Item>
                <Form.Item name="itemBlur" noStyle>
                  <InputNumber min={0} max={30} step={1} style={{ width: 70 }} suffix="px" />
                </Form.Item>
              </div>
            </Form.Item>
          </>
        )}

        {widget.type === 'myDocuments' && (
          <>
            <Form.Item name="btnColor" label="按钮颜色">
              <ColorPicker showText allowClear />
            </Form.Item>
            <Form.Item name="btnTextColor" label="字体颜色">
              <ColorPicker showText allowClear />
            </Form.Item>
          </>
        )}
      </>
    );
  };

  const renderHeaderNavTab = () => {
    if (widget.type !== 'headerBar') {
      return <div className="empty-hint">当前组件无导航配置</div>;
    }

    if (!showNavMenuValue) {
      return <div className="empty-hint">请先在“组件配置”中开启“显示导航区域”开关</div>;
    }

    return (
      <>
        <Form.Item name="navDataSource" label="数据来源">
          <Radio.Group>
            <Radio value="api">接口获取</Radio>
            <Radio value="static">手动配置</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item name="navTextColor" label="文字颜色">
          <ColorPicker showText allowClear />
        </Form.Item>
        <Form.Item noStyle shouldUpdate={(prev, cur) => prev.navDataSource !== cur.navDataSource}>
          {({ getFieldValue }) => {
            const source = getFieldValue('navDataSource') || 'api';
            if (source === 'static') {
              return (
                <Form.List name="navItems">
                  {(fields, { add, remove }) => (
                    <>
                      <Collapse
                        bordered={false}
                        className="nav-items-collapse"
                        expandIconPosition="end"
                      >
                        {fields.map(({ key, name, ...restField }, index) => {
                          return (
                            <Collapse.Panel
                              key={key}
                              forceRender
                              header={(
                                <Form.Item
                                  noStyle
                                  shouldUpdate={(prev, cur) =>
                                    prev.navItems?.[name]?.name !== cur.navItems?.[name]?.name
                                  }
                                >
                                  {() => form.getFieldValue(['navItems', name, 'name']) || `导航项 ${index + 1}`}
                                </Form.Item>
                              )}
                              extra={
                                <Button
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    remove(name);
                                  }}
                                />
                              }
                            >
                              <div className="config-item-card">
                                <div className="card-content" style={{ padding: 12 }}>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'name']}
                                    label="导航名称"
                                    rules={[{ required: true, message: '请输入导航名称' }]}
                                  >
                                    <Input placeholder="例如：工作台" />
                                  </Form.Item>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'url']}
                                    label="跳转链接"
                                    rules={[{ required: true, message: '请输入跳转链接' }]}
                                  >
                                    <Input placeholder="/dashboard 或 https://example.com" />
                                  </Form.Item>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'systemId']}
                                    label="所属系统"
        
                                  >
                                    <Select placeholder="请选择所属系统" options={JUMP_SYSTEM_OPTIONS} />
                                  </Form.Item>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'openInNew']}
                                    label="新窗口打开"
                                    valuePropName="checked"
                                  >
                                    <Switch />
                                  </Form.Item>
                                </div>
                              </div>
                            </Collapse.Panel>
                          );
                        })}
                      </Collapse>
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} style={{ marginTop: 12 }}>
                        添加导航项
                      </Button>
                    </>
                  )}
                </Form.List>
              );
            }
            return (
              <>
                <Form.Item
                  name="navApiEndpoint"
                  label="接口地址"
                  rules={[{ required: true, message: '请输入接口地址' }]}
                >
                  <Input placeholder="/api/nav-items" />
                </Form.Item>
                <div className="form-row-2">
                  <Form.Item name="navApiMethod" label="请求方式">
                    <Select placeholder="GET">
                      <Select.Option value="GET">GET</Select.Option>
                      <Select.Option value="POST">POST</Select.Option>
                    </Select>
                  </Form.Item>
                </div>
                <Form.Item noStyle shouldUpdate={(prev, cur) => prev.navApiMethod !== cur.navApiMethod}>
                  {({ getFieldValue }) => {
                    if (getFieldValue('navApiMethod') !== 'POST') return null;
                    return (
                      <Form.Item
                        name="navApiBody"
                        label="请求参数(JSON)"
                        tooltip="POST 请求体，请输入合法的 JSON 格式"
                        rules={[{
                          validator: (_, value) => {
                            if (!value) return Promise.resolve();
                            try { JSON.parse(value); return Promise.resolve(); }
                            catch { return Promise.reject(new Error('请输入合法的 JSON 格式')); }
                          }
                        }]}
                      >
                        <Input.TextArea rows={4} placeholder='{"key": "value"}' />
                      </Form.Item>
                    );
                  }}
                </Form.Item>
                <Form.Item label="请求头" tooltip="自定义 HTTP 请求头，如 Authorization 等">
                  <Form.List name="navApiHeadersList">
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map(({ key, name, ...restField }) => (
                          <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'baseline' }}>
                            <Form.Item {...restField} name={[name, 'key']} noStyle rules={[{ required: true, message: '请输入Key' }]}>
                              <Input placeholder="Header Key" />
                            </Form.Item>
                            <Form.Item {...restField} name={[name, 'value']} noStyle rules={[{ required: true, message: '请输入Value' }]}>
                              <Input placeholder="Header Value" />
                            </Form.Item>
                            <DeleteOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f', flexShrink: 0 }} />
                          </div>
                        ))}
                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} size="small">
                          添加请求头
                        </Button>
                      </>
                    )}
                  </Form.List>
                </Form.Item>
                <Divider>响应字段映射</Divider>
                <div className="empty-hint" style={{ marginBottom: 8 }}>
                  接口返回数组或 {'{ data: [...] }'} 格式，下方配置接口字段与组件字段的映射关系，留空则使用默认值
                </div>
                <div className="form-row-3">
                  <Form.Item name={['navFieldMapping', 'name']} label="名称字段">
                    <Input placeholder="name" />
                  </Form.Item>
                  <Form.Item name={['navFieldMapping', 'url']} label="链接字段">
                    <Input placeholder="url" />
                  </Form.Item>
                  <Form.Item name={['navFieldMapping', 'icon']} label="图标字段">
                    <Input placeholder="icon" />
                  </Form.Item>
                </div>
              </>
            );
          }}
        </Form.Item>
      </>
    );
  };

  const renderDataTab = () => {
    const hasDataConfig = [
      'chart', 'stats', 'indicatorCard', 'customForm', 'dataTable',
      'microApp', 'search', 'queryFilter', 'navGroup', 'carousel', 'headerBar',
      'news', 'topList'
    ].includes(widget.type);

    if (!hasDataConfig) {
      return <div className="empty-hint">当前组件无数据或交互配置</div>;
    }

    const apiPlaceholder = getWidgetApiEndpointPlaceholder(widget.type);
    const apiFieldMeta = getWidgetApiFieldMeta(widget.type);
    const paginationDefaults = getWidgetPaginationDefaults(widget.type);

    return (
      <ConfigDialogDataTab
        form={form}
        widget={widget}
        apiPlaceholder={apiPlaceholder}
        apiFieldMeta={apiFieldMeta}
        paginationDefaults={paginationDefaults}
        staticDataEditorMeta={genericStaticDataEditorMeta}
        staticDataPreview={genericStaticDataPreview}
      />
    );

    const statsFieldPreview = (Array.isArray(statsItemsValue) && statsItemsValue.length > 0
      ? statsItemsValue
      : DEFAULT_STATS_ITEMS)
      .map((item: any) => item?.key)
      .filter(Boolean)
      .join('、');

    return (
      <>
        {['chart', 'stats', 'dataTable', 'news', 'topList'].includes(widget.type) && (
          <>
            <Form.Item
              name="dataSource"
              label="数据来源"
              initialValue="customApi"
              rules={[{ required: true, message: '请选择数据来源' }]}
            >
              <Select
                options={[
                  { label: '自定义接口', value: 'customApi' },
                  { label: '静态数据', value: 'static' },
                ]}
              />
            </Form.Item>
            {genericDataSourceValue === 'static' ? (
              <>
                <Form.Item
                  name="staticData"
                  label="静态数据编辑器"
                  rules={[
                    { required: true, message: '请输入静态数据' },
                    { validator: validateJson },
                  ]}
                  extra={genericStaticDataEditorMeta.extra}
                  className="static-data-editor"
                >
                  <Input.TextArea
                    rows={10}
                    placeholder={genericStaticDataEditorMeta.placeholder}
                    autoSize={{minRows: 6, maxRows: 16}} />
                </Form.Item>
                <div className="static-data-preview">
                  <div className="static-data-preview__summary">{genericStaticDataPreview.title}</div>
                  <pre className="static-data-preview__content">{genericStaticDataPreview.content}</pre>
                </div>
              </>
            ) : (
              <>
                <Form.Item
                  label="接口地址"
                  required
                  extra={
                    widget.type === 'news'
                      ? '接口返回需包含新闻列表字段，以及标题、摘要、链接等映射字段。'
                      : widget.type === 'topList'
                        ? '接口返回需包含排行榜列表字段，以及名称、数值、变化等映射字段。'
                        : undefined
                  }
                  className="widget-api-form-item"
                >
                  <div className="widget-api-endpoint-row">
                    <Form.Item name="apiMethod" noStyle initialValue="GET">
                      <Select
                        className="widget-api-endpoint-row__method"
                        options={[
                          { value: 'GET', label: 'GET' },
                          { value: 'POST', label: 'POST' },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item
                      name="apiEndpoint"
                      noStyle
                      rules={[{ required: true, message: '请输入接口地址' }]}
                    >
                      <Input className="widget-api-endpoint-row__input" placeholder={apiPlaceholder} />
                    </Form.Item>
                  </div>
                </Form.Item>
                {apiFieldMeta ? (
                  <Form.Item name={apiFieldMeta!.name} label={apiFieldMeta!.label} tooltip={apiFieldMeta!.tooltip}>
                    <Input placeholder={apiFieldMeta!.placeholder} />
                  </Form.Item>
                ) : null}
                <Form.Item label="参数配置" className="widget-api-form-item">
                  <WidgetApiConfigTabs
                    form={form}
                    methodName="apiMethod"
                    headersName="apiHeadersList"
                    queryName="apiQueryList"
                    bodyName="apiBodyList"
                    debugContent={
                      <WidgetApiDebugButton
                        form={form}
                        buildConfig={formValues => ({
                          endpoint: formValues.apiEndpoint,
                          method: formValues.apiMethod || 'GET',
                          headers: buildHeaderMap(formValues.apiHeadersList),
                          query: keyValueListToObject(formValues.apiQueryList),
                          body: keyValueListToObject(formValues.apiBodyList),
                          dataField:
                            apiFieldMeta?.name === 'apiDataField'
                              ? (formValues.apiDataField || apiFieldMeta.defaultValue)
                              : undefined,
                          listField:
                            apiFieldMeta?.name === 'apiListField'
                              ? (formValues.apiListField || apiFieldMeta.defaultValue)
                              : undefined,
                          pagination:
                            ['dataTable'].includes(widget.type) &&
                              formValues.paginationMode === 'pagination'
                              ? {
                                mode: 'pagination',
                                pageParam: formValues.paginationConfig?.pageParam || paginationDefaults?.pageParam,
                                pageSizeParam:
                                  formValues.paginationConfig?.pageSizeParam || paginationDefaults?.pageSizeParam,
                                totalField: formValues.paginationConfig?.totalField || paginationDefaults?.totalField,
                                currentField:
                                  formValues.paginationConfig?.currentField || paginationDefaults?.currentField,
                                pageSizeField:
                                  formValues.paginationConfig?.pageSizeField || paginationDefaults?.pageSizeField,
                              }
                              : undefined,
                        })}
                        buildPageState={formValues =>
                          ['dataTable'].includes(widget.type) &&
                            formValues.paginationMode === 'pagination'
                            ? {
                              current: formValues.paginationConfig?.page || 1,
                              pageSize: formValues.paginationConfig?.pageSize || 10,
                            }
                            : undefined
                        }
                      />
                    }
                    debugHint="调试时将使用当前表单里的接口地址、参数配置和字段路径。"
                  />
                </Form.Item>
              </>
            )}
            {['dataTable'].includes(widget.type) && (
              <>
                <Form.Item name="paginationMode" label="分页模式" initialValue="none">
                  <Select
                    options={[
                      { label: '不分页', value: 'none' },
                      { label: '分页', value: 'pagination' },
                    ]}
                  />
                </Form.Item>
                <Form.Item noStyle shouldUpdate={(prev, cur) => prev.paginationMode !== cur.paginationMode}>
                  {({ getFieldValue }) => {
                    if (getFieldValue('paginationMode') !== 'pagination') {
                      return null;
                    }

                    return (
                      <>
                        <div className="form-row-3">
                          <Form.Item name={['paginationConfig', 'page']} label="初始页码" initialValue={1}>
                            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                          </Form.Item>
                          <Form.Item name={['paginationConfig', 'pageSize']} label="每页条数" initialValue={10}>
                            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                          </Form.Item>
                          <Form.Item
                            name={['paginationConfig', 'showTotal']}
                            label="显示总数"
                            valuePropName="checked"
                            initialValue={false}
                          >
                            <Switch />
                          </Form.Item>
                        </div>
                        <div className="form-row-2">
                          <Form.Item name={['paginationConfig', 'pageParam']} label="页码参数名">
                            <Input placeholder={paginationDefaults?.pageParam || 'page'} />
                          </Form.Item>
                          <Form.Item name={['paginationConfig', 'pageSizeParam']} label="每页条数参数名">
                            <Input placeholder={paginationDefaults?.pageSizeParam || 'page_size'} />
                          </Form.Item>
                        </div>
                        <div className="form-row-3">
                          <Form.Item name={['paginationConfig', 'totalField']} label="总数字段路径">
                            <Input placeholder={paginationDefaults?.totalField || 'data.total'} />
                          </Form.Item>
                          {/* <Form.Item name={['paginationConfig', 'currentField']} label="当前页字段路径">
                            <Input placeholder={paginationDefaults?.currentField || 'data.page'} />
                          </Form.Item>
                          <Form.Item name={['paginationConfig', 'pageSizeField']} label="每页条数字段路径">
                            <Input placeholder={paginationDefaults?.pageSizeField || 'data.page_size'} />
                          </Form.Item> */}
                        </div>
                      </>
                    );
                  }}
                </Form.Item>
              </>
            )}
          </>
        )}

        {false && ['chart', 'stats', 'dataTable', 'news', 'topList'].includes(widget.type) && (
          <>
            <Form.Item
              name="apiEndpoint"
              label="数据接口"
              extra={
                widget.type === 'news'
                  ? '接口需返回数组或 { data/list } 格式，包含标题、摘要、链接、封面等字段'
                  : widget.type === 'topList'
                    ? '接口需返回数组或 { data/list } 格式，包含名称、数值、变化、单位等字段'
                    : undefined
              }
            >
              <Input placeholder={apiPlaceholder} />
            </Form.Item>
            <Form.Item label="请求头" tooltip="自定义 HTTP 请求头，如 Authorization 等">
              <Form.List name="apiHeadersList">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'baseline' }}>
                        <Form.Item {...restField} name={[name, 'key']} noStyle rules={[{ required: true, message: '请输入Key' }]}>
                          <Input placeholder="Header Key" />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'value']} noStyle rules={[{ required: true, message: '请输入Value' }]}>
                          <Input placeholder="Header Value" />
                        </Form.Item>
                        <DeleteOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f', flexShrink: 0 }} />
                      </div>
                    ))}
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} size="small">
                      添加请求头
                    </Button>
                  </>
                )}
              </Form.List>
            </Form.Item>
          </>
        )}

        {widget.type === 'stats' && (
          <>
            <div className="empty-hint" style={{ marginBottom: 12 }}>
              {`接口需返回形如 { 字段: 数值 } 的对象，下方“数据字段”即接口字段名。当前字段：${statsFieldPreview || 'activeUsers、idleRate'}`}
            </div>
            <Form.List name="statsItems">
              {(fields, { add, remove }) => (
                <div className="config-list-container">
                  {fields.map(({ key, name, ...restField }) => (
                    <div key={key} className="config-item-card">
                      <div className="card-content" style={{ padding: '12px', position: 'relative' }}>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => remove(name)}
                          style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
                        />
                        <div className="form-row-2">
                          <Form.Item
                            {...restField}
                            name={[name, 'label']}
                            label="显示名称"
                            rules={[{ required: true, message: '请输入显示名称' }]}
                          >
                            <Input placeholder="例如：活跃用户" />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, 'key']}
                            label="数据字段"
                            rules={[{ required: true, message: '请输入数据字段名' }]}
                            tooltip="接口响应对象中的字段名"
                          >
                            <Input placeholder="activeUsers" />
                          </Form.Item>
                        </div>
                        <div className="form-row-3">
                          <Form.Item {...restField} name={[name, 'precision']} label="小数位数">
                            <InputNumber min={0} max={6} precision={0} style={{ width: '100%' }} />
                          </Form.Item>
                          <Form.Item {...restField} name={[name, 'suffix']} label="数值后缀">
                            <Input placeholder="例如：%" />
                          </Form.Item>
                          <Form.Item {...restField} name={[name, 'trend']} label="趋势方向">
                            <Select allowClear placeholder="自动">
                              <Select.Option value="up">上涨</Select.Option>
                              <Select.Option value="down">下降</Select.Option>
                              <Select.Option value="none">不显示</Select.Option>
                            </Select>
                          </Form.Item>
                        </div>
                        <Form.Item {...restField} name={[name, 'color']} label="自定义颜色">
                          <ColorPicker showText allowClear />
                        </Form.Item>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="dashed"
                    onClick={() => add({ key: `metric_${fields.length + 1}`, label: '新的指标' })}
                    block
                    icon={<PlusOutlined />}
                  >
                    添加统计项
                  </Button>
                </div>
              )}
            </Form.List>
          </>
        )}

        {false && widget.type === 'chart' && (
          <>
            <div className="empty-hint" style={{ marginBottom: 12 }}>
              接口需返回包含 X 轴类目数组与数值数组的对象（可在下方指定字段），示例：{`{ xAxis: ['一月'], series: [120] }`}
            </div>
            <div className="form-row-2">
              <Form.Item name="xAxisField" label="X 轴字段" initialValue="xAxis">
                <Input placeholder="xAxis" />
              </Form.Item>
              <Form.Item name="yAxisField" label="数值字段" initialValue="series">
                <Input placeholder="series" />
              </Form.Item>
            </div>
          </>
        )}

        {widget.type === 'chart' && <ChartDataConfig form={form} widget={widget} />}

        {widget.type === 'indicatorCard' && (
          <>
            <Form.Item
              name="dataSource"
              label="数据来源"
              initialValue="static"
              rules={[{ required: true, message: '请选择数据来源' }]}
            >
              <Select
                options={[
                  { label: '手动输入', value: 'static' },
                  { label: '自定义接口', value: 'customApi' },
                ]}
              />
            </Form.Item>

            {genericDataSourceValue === 'static' ? (
              <div className="form-row-2">
                <Form.Item
                  name="staticValue"
                  label="数值内容"
                  rules={[{ required: true, message: '请输入数值内容' }]}
                >
                  <Input placeholder="例如 22,522.75万" />
                </Form.Item>
                <Form.Item name="staticDescription" label="描述内容">
                  <Input placeholder="例如 总签约" />
                </Form.Item>
              </div>
            ) : (
              <>
                <div className="empty-hint" style={{ marginBottom: 12 }}>
                  接口返回对象示例：{`{ value: 22522.75, description: '总签约' }`}
                </div>
                <Form.Item
                  label="接口地址"
                  required
                  className="widget-api-form-item"
                >
                  <div className="widget-api-endpoint-row">
                    <Form.Item name="apiMethod" noStyle initialValue="GET">
                      <Select
                        className="widget-api-endpoint-row__method"
                        options={[
                          { value: 'GET', label: 'GET' },
                          { value: 'POST', label: 'POST' },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item
                      name="apiEndpoint"
                      noStyle
                      rules={[{ required: true, message: '请输入接口地址' }]}
                    >
                      <Input className="widget-api-endpoint-row__input" placeholder={apiPlaceholder} />
                    </Form.Item>
                  </div>
                </Form.Item>
                {apiFieldMeta ? (
                  <Form.Item name={apiFieldMeta!.name} label={apiFieldMeta!.label} tooltip={apiFieldMeta!.tooltip}>
                    <Input placeholder={apiFieldMeta!.placeholder} />
                  </Form.Item>
                ) : null}
                <Form.Item label="参数配置" className="widget-api-form-item">
                  <WidgetApiConfigTabs
                    form={form}
                    methodName="apiMethod"
                    headersName="apiHeadersList"
                    queryName="apiQueryList"
                    bodyName="apiBodyList"
                    debugContent={
                      <WidgetApiDebugButton
                        form={form}
                        buildConfig={formValues => ({
                          endpoint: formValues.apiEndpoint,
                          method: formValues.apiMethod || 'GET',
                          headers: buildHeaderMap(formValues.apiHeadersList),
                          query: keyValueListToObject(formValues.apiQueryList),
                          body: keyValueListToObject(formValues.apiBodyList),
                          dataField:
                            apiFieldMeta?.name === 'apiDataField'
                              ? (formValues.apiDataField || apiFieldMeta.defaultValue)
                              : undefined,
                        })}
                      />
                    }
                    debugHint="调试时将使用当前表单中的接口地址、参数配置和数据字段路径。"
                  />
                </Form.Item>
                <div className="form-row-2">
                  <Form.Item name="valueField" label="数值字段" initialValue="value">
                    <Input placeholder="value" />
                  </Form.Item>
                  <Form.Item name="descriptionField" label="描述字段" initialValue="description">
                    <Input placeholder="description" />
                  </Form.Item>
                </div>
              </>
            )}
          </>
        )}

        {widget.type === 'news' && (
          <>
            <div className="form-row-2">
              <Form.Item name="maxItems" label="最大条数" initialValue={10}>
                <InputNumber min={1} max={50} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="avatarField" label="封面字段" initialValue="avatar">
                <Input placeholder="avatar" />
              </Form.Item>
            </div>
            <div className="form-row-2">
              <Form.Item name="titleField" label="标题字段" initialValue="title">
                <Input placeholder="title" />
              </Form.Item>
              <Form.Item name="descriptionField" label="摘要字段" initialValue="description">
                <Input placeholder="description" />
              </Form.Item>
            </div>
            <div className="form-row-2">
              <Form.Item name="urlField" label="链接字段" initialValue="url">
                <Input placeholder="url" />
              </Form.Item>
              <div></div>
            </div>
          </>
        )}

        {widget.type === 'topList' && (
          <>
            <div className="form-row-2">
              <Form.Item name="nameField" label="名称字段" initialValue="name">
                <Input placeholder="name" />
              </Form.Item>
              <Form.Item name="valueField" label="数值字段" initialValue="value">
                <Input placeholder="value" />
              </Form.Item>
            </div>
            <div className="form-row-2">
              <Form.Item name="changeField" label="变化字段" initialValue="change">
                <Input placeholder="change" />
              </Form.Item>
              <Form.Item name="unitField" label="单位字段" initialValue="unit">
                <Input placeholder="unit" />
              </Form.Item>
            </div>
            <div className="form-row-2">
              <Form.Item name="maxItems" label="显示条数" initialValue={10}>
                <InputNumber min={1} max={50} precision={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="highlightTop" label="高亮前N名" initialValue={3}>
                <InputNumber min={0} max={10} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </div>
            <div className="form-row-2">
              <Form.Item name="listTitle" label="列表标题">
                <Input placeholder="例如：当月销量排行榜" />
              </Form.Item>
              {/* <Form.Item name="valueLabel" label="数值标签">
                <Input placeholder="例如：销量" />
              </Form.Item> */}
            </div>
            {/* <Form.Item name="changeLabel" label="变化标签">
              <Input placeholder="例如：变化" />
            </Form.Item> */}
          </>
        )}

        {widget.type === 'navGroup' && (
          <>
            <Form.Item name="dataSource" label="数据来源" initialValue="api">
              <Select
                options={[
                  { label: '接口获取', value: 'api' },
                  { label: '手动配置', value: 'static' },
                ]}
              />
            </Form.Item>

            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.dataSource !== cur.dataSource}>
              {({ getFieldValue }) => {
                const dataSource = getFieldValue('dataSource');
                if (dataSource === 'api') {
                  return (
                    <>
                      <Form.Item label="接口地址" required className="widget-api-form-item">
                        <div className="widget-api-endpoint-row">
                          <Form.Item name="apiMethod" noStyle initialValue="GET">
                            <Select
                              className="widget-api-endpoint-row__method"
                              options={[
                                { value: 'GET', label: 'GET' },
                                { value: 'POST', label: 'POST' },
                              ]}
                            />
                          </Form.Item>
                          <Form.Item
                            name="apiEndpoint"
                            noStyle
                            rules={[{ required: true, message: '请输入接口地址' }]}
                          >
                            <Input
                              className="widget-api-endpoint-row__input"
                              placeholder={getWidgetApiEndpointPlaceholder('navGroup')}
                            />
                          </Form.Item>
                        </div>
                      </Form.Item>
                      <Form.Item
                        name="apiListField"
                        label="列表字段路径"
                        tooltip="默认按 payload.groups.list 取值；修改后按填写路径取值。"
                      >
                        <Input placeholder={DEFAULT_NAV_GROUP_LIST_FIELD} />
                      </Form.Item>
                      <Form.Item label="参数配置" className="widget-api-form-item">
                        <WidgetApiConfigTabs
                          form={form}
                          methodName="apiMethod"
                          headersName="apiHeadersList"
                          queryName="apiQueryList"
                          bodyName="apiBodyList"
                          debugContent={
                            <WidgetApiDebugButton
                              form={form}
                              buildConfig={formValues => ({
                                endpoint: formValues.apiEndpoint,
                                method: formValues.apiMethod || 'GET',
                                headers: buildHeaderMap(formValues.apiHeadersList),
                                query: keyValueListToObject(formValues.apiQueryList),
                                body: keyValueListToObject(formValues.apiBodyList),
                                listField: formValues.apiListField || DEFAULT_NAV_GROUP_LIST_FIELD,
                              })}
                            />
                          }
                          debugHint="调试时将使用当前接口地址、参数配置和列表字段路径。"
                        />
                      </Form.Item>
                      <div className="empty-hint" style={{ marginTop: 8 }}>
                        {'接口返回中的导航数组默认读取 payload.groups.list，修改后会严格按填写路径取值。'}
                      </div>
                    </>
                  );
                }
                return (
                  <>
                    <Divider style={{ margin: '12px 0' }}>导航项配置</Divider>
                    <Form.List name="staticItems">
                      {(fields, { add, remove }) => (
                        <div className="config-list-container">
                          {fields.map(({ key, name, ...restField }) => (
                            <div key={key} className="config-item-card">
                              <div className="card-content" style={{ padding: '12px', position: 'relative' }}>
                                <Button
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => remove(name)}
                                  style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
                                />
                                <div className="form-row-2" style={{ marginBottom: 8 }}>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'name']}
                                    label="名称"
                                    rules={[{ required: true, message: '请输入名称' }]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <Input placeholder="导航名称" />
                                  </Form.Item>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'icon']}
                                    label="图标"
                                    style={{ marginBottom: 0 }}
                                  >
                                    <IconPicker mode="simple" />
                                  </Form.Item>
                                </div>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'url']}
                                  label="链接地址"
                                  rules={[{ required: true, message: '请输入链接地址' }]}
                                  style={{ marginBottom: 8 }}
                                >
                                  <Input placeholder="如: /dashboard 或 https://example.com" />
                                </Form.Item>
                                <div className="form-row-2" style={{ marginBottom: 8 }}>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'iconBgColor']}
                                    label="图标背景色"
                                    style={{ marginBottom: 0 }}
                                  >
                                    <ColorPicker showText allowClear />
                                  </Form.Item>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'iconColor']}
                                    label="图标颜色"
                                    style={{ marginBottom: 0 }}
                                  >
                                    <ColorPicker showText allowClear />
                                  </Form.Item>
                                </div>
                                <div className="form-row-2" style={{ marginBottom: 8 }}>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'textColor']}
                                    label="文字颜色"
                                    style={{ marginBottom: 0 }}
                                  >
                                    <ColorPicker showText allowClear />
                                  </Form.Item>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'systemId']}
                                    label="所属系统"
        
                                    style={{ marginBottom: 0 }}
                                  >
                                    <Select placeholder="请选择所属系统" options={JUMP_SYSTEM_OPTIONS} />
                                  </Form.Item>
                                </div>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'openInNew']}
                                  label="打开方式"
                                  initialValue={true}
                                  style={{ marginBottom: 0 }}
                                >
                                  <Select options={[
                                    { label: '新窗口', value: true },
                                    { label: '当前页', value: false },
                                  ]} />
                                </Form.Item>
                              </div>
                            </div>
                          ))}
                          <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                            添加导航项
                          </Button>
                        </div>
                      )}
                    </Form.List>
                  </>
                );
              }}
            </Form.Item>
          </>
        )}

        {widget.type === 'carousel' && (
          <CarouselDataConfig form={form} widget={widget} />
        )}

        {widget.type === 'microApp' && (
          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.systemId !== curr.systemId || prev.moduleId !== curr.moduleId}
          >
            {({ getFieldValue }) => (
              <Form.Item name="eventRoutes" label="事件路由">
                <EventRouteConfig
                  currentWidgetId={widget.id}
                  currentSystemId={getFieldValue('systemId')}
                  currentModuleId={getFieldValue('moduleId')}
                />
              </Form.Item>
            )}
          </Form.Item>
        )}

        {widget.type === 'search' && <SearchConfig form={form} widget={widget} />}
        {widget.type === 'queryFilter' && <QueryFilterDataConfig form={form} widget={widget} />}
        {widget.type === 'customForm' && <CustomFormConfig form={form} widget={widget} />}
      </>
    );
  };

  const renderFloatingTab = () => (
    <>
      <div className="form-row-2">
        <Form.Item label="最小宽度" name="minWidth" rules={[{ type: 'number', min: 100 }]}>
          <InputNumber style={{ width: '100%' }} suffix="px" />
        </Form.Item>
        <Form.Item label="最小高度" name="minHeight" rules={[{ type: 'number', min: 100 }]}>
          <InputNumber style={{ width: '100%' }} suffix="px" />
        </Form.Item>
      </div>
      <div className="form-row-2">
        <Form.Item label="最大宽度" name="maxWidth" rules={[{ type: 'number', min: 200 }]}>
          <InputNumber style={{ width: '100%' }} suffix="px" />
        </Form.Item>
        <Form.Item label="最大高度" name="maxHeight" rules={[{ type: 'number', min: 200 }]}>
          <InputNumber style={{ width: '100%' }} suffix="px" />
        </Form.Item>
      </div>

      <div className="form-row-2">
        <Form.Item name="collapsible" label="允许折叠" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="borderRadius" label="圆角大小" rules={[{ type: 'number', min: 0, max: 30 }]}>
          <InputNumber style={{ width: '100%' }} min={0} max={30} suffix="px" />
        </Form.Item>
      </div>

      <Form.Item name="zIndex" label="层级" rules={[{ type: 'number', min: 1 }]}>
        <InputNumber style={{ width: '100%' }} />
      </Form.Item>

      <Divider>折叠状态</Divider>
      <div className="form-row-2">
        <Form.Item label="折叠宽度" name="collapsedWidth" rules={[{ type: 'number', min: 40 }]}>
          <InputNumber style={{ width: '100%' }} suffix="px" />
        </Form.Item>
        <Form.Item label="折叠高度" name="collapsedHeight" rules={[{ type: 'number', min: 40 }]}>
          <InputNumber style={{ width: '100%' }} suffix="px" />
        </Form.Item>
      </div>
      <div className="form-row-3">
        <Form.Item label="折叠图标" name="collapsedIcon" tooltip="支持图标名称、图片URL、上传图片或SVG代码">
          <IconPicker mode="full" placeholder="" />
        </Form.Item>
        <Form.Item label="图标大小" name="collapsedIconSize" rules={[{ type: 'number', min: 12 }]}>
          <InputNumber style={{ width: '100%' }} suffix="px" />
        </Form.Item>
      </div>
      <div className="form-row-3">
        <Form.Item label="折叠背景" name="collapsedBgColor">
          <ColorPicker showText allowClear />
        </Form.Item>
      </div>
    </>
  );

  // 分组配置表单
  const renderGroupTab = () => (
    <>
      <Form.Item
        name="title"
        label="分组标题"
        rules={[{ required: true, message: '请输入分组标题' }]}
      >
        <Input />
      </Form.Item>

      <Divider>标题设置</Divider>
      <GlobalThemeReferenceFields
        form={form}
        useFieldName="titleUseGlobalConfig"
        themeIdFieldName="titleGlobalThemeId"
        options={globalThemeOptions}
        hint="开启后会自动填充分组标题样式，引用期间不可编辑。"
      />
      <WidgetTitleSettings disabled={titleUseGlobalConfig} />

      <Divider>边框设置</Divider>
      <div className="form-row-2">
        <Form.Item name="borderStyle" label="边框样式">
          <Select>
            <Select.Option value="none">无边框</Select.Option>
            <Select.Option value="solid">实线</Select.Option>
            <Select.Option value="dashed">虚线</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="borderWidth" label="边框宽度" rules={[{ type: 'number', min: 0 }]}>
          <InputNumber style={{ width: '100%' }} suffix="px" />
        </Form.Item>
      </div>
      <div className="form-row-2">
        <Form.Item name="borderColor" label="边框颜色">
          <ColorPicker showText allowClear />
        </Form.Item>
        <Form.Item name="borderRadius" label="圆角" rules={[{ type: 'number', min: 0, max: 100 }]}>
          <InputNumber style={{ width: '100%' }} min={0} max={100} suffix="px" />
        </Form.Item>
      </div>

      <Divider>背景设置</Divider>
      <GlobalThemeReferenceFields
        form={form}
        useFieldName="backgroundUseGlobalConfig"
        themeIdFieldName="backgroundGlobalThemeId"
        options={globalThemeOptions}
        hint="开启后会自动填充分组背景设置，引用期间不可编辑。"
      />
      <BackgroundSettings
        form={form}
        initialValues={group?.config as any}
        disabled={backgroundUseGlobalConfig}
      />
    </>
  );

  // 判断是否有组件配置
  const hasComponentConfig = [
    'typography', 'headerBar', 'link', 'chart', 'dataTable', 'indicatorCard',
    'customForm', 'queryFilter', 'pageNavigator', 'microApp', 'richText',
    'iconNav', 'navGroup', 'carousel', 'myDocuments'
  ].includes(widget.type) || isAssistantHub;

  // 判断是否有数据与交互配置
  const hasDataConfig = [
    'chart', 'stats', 'indicatorCard', 'customForm', 'dataTable',
    'microApp', 'search', 'queryFilter', 'navGroup', 'carousel', 'headerBar',
    'news', 'topList'
  ].includes(widget.type);

  const hasHeaderNavTab = false;
  const headerNavTabs = hasHeaderNavTab
    ? [{ key: 'nav', label: '导航配置', children: renderHeaderNavTab(), forceRender: true }]
    : [];

  // 根据类型构建 tabs（按需显示）
  const items = isGroup
    ? [{ key: 'group', label: '分组配置', children: renderGroupTab(), forceRender: true }]
    : [
      { key: 'basic', label: '基础配置', children: renderBasicTab(), forceRender: true },
      ...(hasComponentConfig ? [{ key: 'component', label: '组件配置', children: renderComponentTab(), forceRender: true }] : []),
      ...headerNavTabs,
      ...(hasDataConfig ? [{ key: 'data', label: '数据与交互', children: renderDataTab(), forceRender: true }] : []),
    ];

  if (isFloatingModule) {
    items.push({ key: 'floating', label: '悬浮配置', children: renderFloatingTab(), forceRender: true });
  }

  // 确定对话框标题
  const dialogTitle = isGroup
    ? `配置分组: ${group?.title || widget.title}`
    : isFloatingModule
      ? `${widget.title}`
      : `${widget.title}`;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="config-panel config-dialog">
      <div className="config-panel__header">
        <div className="config-panel__title"><SettingOutlined />{dialogTitle}</div>
        <Button type="text" icon={<CloseOutlined />} onClick={onClose} />
      </div>
      <div className="config-panel__body">
        <Form form={form} layout="vertical" size="small">
          <Tabs defaultActiveKey={isGroup ? 'group' : 'component'} items={items} className="config-tabs" />
        </Form>
      </div>
      <div className="config-panel__footer">
        <Button onClick={onClose}>取消</Button>
        <Button type="primary" onClick={handleOk}>保存</Button>
      </div>
    </div>
  );
};

export default ConfigDialog;
