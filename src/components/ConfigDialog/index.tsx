import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Form, Input, InputNumber, Switch, Select, Divider, Upload, Button, message, Tabs, ColorPicker, Radio, Slider, Collapse, Space } from 'antd';
import { UploadOutlined, LoadingOutlined, PlusOutlined, DeleteOutlined, CloseOutlined, SettingOutlined } from '@ant-design/icons';
import { Widget, MicroAppModule, FloatingModuleConfig, FormField } from '@/types';
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
import IconPicker from '@/components/IconPicker';
import { getIconValueType } from '@/components/IconPicker/types';
import { LinkConfig, SearchConfig, CustomFormConfig, CustomFormStyleConfig, DataTableConfig, CarouselConfig, CarouselDataConfig } from './configs';
import './index.scss';

interface ConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  widget: Widget;
}

const DEFAULT_STATS_ITEMS = [
  { key: 'activeUsers', label: '活跃用户', precision: 0, trend: 'up', color: '#3f8600' },
  { key: 'idleRate', label: '空闲率', precision: 2, suffix: '%', trend: 'down', color: '#cf1322' },
];

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

const ConfigDialog: React.FC<ConfigDialogProps> = ({ isOpen, onClose, widget }) => {
  const { updateWidget, updateFloatingModule, updateFloatingModuleConfig, floatingModules, groups, updateGroup, updateGroupConfig } = useStore();
  const { styleTokens } = useCanvasTheme();
  const [form] = Form.useForm();
  const showNavMenuValue = Form.useWatch('showNavMenu', form);
  const navItemsValue = Form.useWatch('navItems', form);
  const statsItemsValue = Form.useWatch('statsItems', form);
  const [fileList, setFileList] = useState<any[]>([]);
  const prevWidgetIdRef = useRef<string | null>(null);
  const [bgUploading, setBgUploading] = useState(false);

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
      // 仅在切换到不同组件时重置表单，防止前一个组件的配置值残留
      // 同一组件保存后不重置，避免 Form.List（如 navItems）因 resetFields 导致数据丢失
      const currentId = isGroup ? group?.id : widget?.id;
      if (currentId !== prevWidgetIdRef.current) {
        form.resetFields();
        prevWidgetIdRef.current = currentId || null;
      }

      // 分组配置初始化
      if (isGroup && group) {
        const config = group.config || {};
        form.setFieldsValue({
          title: group.title,
          showTitle: config.showTitle !== false,
          titleColor: config.titleColor,
          titleFontSize: config.titleFontSize,
          titleFontWeight: config.titleFontWeight,
          backgroundType: config.backgroundType || 'color',
          backgroundColor: config.backgroundColor,
          backgroundImage: config.backgroundImage,
          backgroundGradient: config.backgroundGradient,
          backgroundSize: config.backgroundSize,
          backgroundRepeat: config.backgroundRepeat,
          backgroundPosition: config.backgroundPosition,
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
          displayMode: widget.config.displayMode || 'text',
          navDataSource: widget.config.navDataSource || (widget.config.navItems?.length ? 'static' : 'api'),
          navItems: widget.config.navItems || [],
          navTextColor: normalizeColorForForm(widget.config.navTextColor),
        };

        form.setFieldsValue({
          ...normalizedConfig,
          // title ???? normalizedConfig ??????? widget.config.title????????
          title: widget.title,
          refreshInterval: widget.config.refreshInterval,
          apiEndpoint: widget.config.apiEndpoint,
          showTitle: widget.config.showTitle !== false,
          backgroundType: widget.config.backgroundType || 'color',
          backgroundImage: widget.config.backgroundImage,
          backgroundGradient: widget.config.backgroundGradient,
          // backdropBlur 由 BackgroundSettings 组件根据主题自动设置默认值
        });

        if (widget.type === 'chart') {
          form.setFieldsValue({
            xAxisField: widget.config.xAxisField || 'xAxis',
            yAxisField: widget.config.yAxisField || 'series',
          });
        }

        if (widget.type === 'stats') {
          const statsItems = widget.config.statsItems && widget.config.statsItems.length > 0
            ? widget.config.statsItems
            : DEFAULT_STATS_ITEMS;
          form.setFieldsValue({ statsItems });
        }

        // navGroup 特有配置：数据来源和静态导航项
        if (widget.type === 'navGroup') {
          const hasStaticItems = widget.config.staticItems && widget.config.staticItems.length > 0;
          form.setFieldsValue({
            dataSource: hasStaticItems ? 'static' : 'api',
            staticItems: widget.config.staticItems || [],
            apiMethod: widget.config.apiMethod || 'GET',
            apiBody: widget.config.apiBody || '',
          });
        }

        // headerBar 导航接口配置初始化
        if (widget.type === 'headerBar') {
          form.setFieldsValue({
            navApiMethod: widget.config.navApiMethod || 'GET',
            navApiBody: widget.config.navApiBody || '',
            navApiHeadersList: widget.config.navApiHeaders
              ? Object.entries(widget.config.navApiHeaders).map(([key, value]) => ({ key, value }))
              : [],
            navFieldMapping: widget.config.navFieldMapping || {},
          });
        }

        // 通用接口请求头初始化（dataTable/topList/news/navGroup/chart/stats）
        if (['chart', 'stats', 'dataTable', 'news', 'topList', 'navGroup'].includes(widget.type) && widget.config.apiHeaders) {
          form.setFieldsValue({
            apiHeadersList: Object.entries(widget.config.apiHeaders).map(([key, value]) => ({ key, value })),
          });
        }

        // carousel 接口请求头初始化
        if (widget.type === 'carousel' && widget.config.apiConfig?.headers) {
          const headersList = Object.entries(widget.config.apiConfig.headers).map(([key, value]) => ({ key, value }));
          form.setFieldsValue({
            apiConfig: {
              ...form.getFieldValue('apiConfig'),
              headersList,
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
            apiHeadersList: widget.config.apiHeaders
              ? Object.entries(widget.config.apiHeaders).map(([key, value]) => ({ key, value }))
              : [],
            successMessage: widget.config.successMessage || '提交成功',
            failureMessage: widget.config.failureMessage || '提交失败',
            successResetForm: widget.config.successResetForm ?? false,
          });
        }

        // search 特有配置初始化
        if (widget.type === 'search') {
          form.setFieldsValue({
            submitMethod: widget.config.submitMethod === 'both' ? 'eventRoute' : (widget.config.submitMethod || 'eventRoute'),
            apiMethod: widget.config.apiMethod || 'GET',
            apiHeadersList: widget.config.apiHeaders
              ? Object.entries(widget.config.apiHeaders).map(([key, value]) => ({ key, value }))
              : [],
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
          collapsedIcon: widget.config.collapsedIcon || widget.config.icon || '',
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

  const handleOk = async () => {
    try {
      const values = await form.validateFields();

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
          return;
        }
      }

      // 分组配置保存
      if (isGroup && group) {
        const {
          title,
          showTitle,
          titleColor,
          titleFontSize,
          titleFontWeight,
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
          titleColor: normalizedTitleColor,
          titleFontSize,
          titleFontWeight,
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
        });

        message.success('配置保存成功');
        return;
      }

      if (isFloatingModule) {
        // 悬浮模块配置
        const {
          title,
          showTitle,
          titleColor,
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
            titleColor: normalizedTitleColor,
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
            titleColor: normalizedTitleColor,
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
            title, showTitle, titleColor, refreshInterval, systemId, moduleId, sync, alive, eventRoutes, icon: rawIcon,
            backgroundType, backgroundColor, backgroundImage, backgroundGradient,
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
              titleColor: normalizedTitleColor,
              refreshInterval,
              systemId,
              moduleId,
              sync,
              alive,
              icon,
              iconSvg: cleanedIconSvg || undefined,
              forceIconOnly: normalizedForceIcon,
              eventRoutes: eventRoutes || [],
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
          const { title, showTitle, titleColor, refreshInterval, apiEndpoint, backgroundType, backgroundColor, backgroundImage, backgroundGradient, contentPadding, ...restConfig } = values;

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

          if (normalizedRestConfig.backgroundColor) {
            normalizedRestConfig.backgroundColor = normalizeColorValue(
              normalizedRestConfig.backgroundColor,
              normalizedBgColor,
            );
          }

          // navGroup 特殊处理：数据来源和静态导航项
          if (widget.type === 'navGroup') {
            const dataSource = normalizedRestConfig.dataSource;
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
              normalizedRestConfig.apiEndpoint = undefined;
              normalizedRestConfig.apiHeaders = undefined;
              normalizedRestConfig.apiMethod = undefined;
              normalizedRestConfig.apiBody = undefined;
            } else {
              // 接口模式：清除 staticItems
              normalizedRestConfig.staticItems = undefined;
              // 非 POST 时清除请求体
              if (normalizedRestConfig.apiMethod !== 'POST') {
                normalizedRestConfig.apiBody = undefined;
              }
            }
          } else if (widget.type === 'headerBar') {
            const navSource = normalizedRestConfig.navDataSource || (normalizedRestConfig.navItems?.length ? 'static' : 'api');
            if (navSource === 'static') {
              normalizedRestConfig.navApiEndpoint = undefined;
              normalizedRestConfig.navApiMethod = undefined;
              normalizedRestConfig.navApiHeaders = undefined;
              normalizedRestConfig.navApiBody = undefined;
              normalizedRestConfig.navFieldMapping = undefined;
              delete normalizedRestConfig.navApiHeadersList;
              if (!Array.isArray(normalizedRestConfig.navItems)) {
                normalizedRestConfig.navItems = [];
              }
            } else {
              normalizedRestConfig.navItems = undefined;
              // 非 POST 时清除请求体
              if (normalizedRestConfig.navApiMethod !== 'POST') {
                normalizedRestConfig.navApiBody = undefined;
              }
              // navApiHeadersList 数组转换为 navApiHeaders 对象
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
          }

          updateWidget(widget.id, {
            title,
            config: {
              ...widget.config,
              showTitle,
              titleColor: normalizedTitleColor,
              refreshInterval,
              apiEndpoint,
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
    } catch (error) {
      console.error('Failed to save widget config:', error);
    }
  };

  const renderBasicTab = () => (
    <>
      <Form.Item
        name="title"
        label="标题"
        rules={[{ required: true, message: '请输入标题' }]}
      >
        <Input />
      </Form.Item>

      <div className="form-row-2">
        <Form.Item
          name="showTitle"
          label="显示标题"
          valuePropName="checked"
          tooltip={
            isFloatingModule
              ? "关闭后将显示透明拖拽条，编辑模式下仍可进行操作"
              : "关闭后小部件将不显示头部标题栏"
          }
        >
          <Switch />
        </Form.Item>
        <Form.Item name="titleColor" label="标题颜色">
          <ColorPicker showText allowClear />
        </Form.Item>
      </div>

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
      <BackgroundSettings
        form={form}
        initialValues={widget.config as any}
      />
    </>
  );

  const renderComponentTab = () => {
    // 检查是否有特定组件配置
    const hasComponentConfig = [
      'typography', 'headerBar', 'link', 'dataTable',
      'customForm', 'pageNavigator', 'microApp',
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
              tooltip="开启后可在“导航配置”页签设置数据来源与内容"
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
        {widget.type === 'carousel' && <CarouselConfig form={form} widget={widget} />}

        {widget.type === 'dataTable' && <DataTableConfig form={form} widget={widget} />}

        {widget.type === 'customForm' && (
          <>
            <Form.Item name="fields" label="表单字段">
              <FormFieldBuilder />
            </Form.Item>
            <CustomFormStyleConfig form={form} widget={widget} />
          </>
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
                        {/* 第三行：图标和打开方式 */}
                        <div className="form-row-2" style={{ marginBottom: 0 }}>
                          <Form.Item {...restField} name={[name, 'icon']} label="图标" style={{ marginBottom: 0 }}>
                            <IconPicker mode="simple" />
                          </Form.Item>
                          <Form.Item {...restField} name={[name, 'openInNew']} label="打开方式" initialValue={false} style={{ marginBottom: 0 }}>
                            <Select options={[
                              { label: '当前页', value: false },
                              { label: '新窗口', value: true },
                            ]} />
                          </Form.Item>
                        </div>
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
                          const navName = navItemsValue?.[name]?.name || `导航项 ${index + 1}`;
                          return (
                            <Collapse.Panel
                              key={key}
                              header={navName}
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
                          <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                            <Form.Item {...restField} name={[name, 'key']} noStyle rules={[{ required: true, message: '请输入Key' }]}>
                              <Input placeholder="Header Key" style={{ width: 160 }} />
                            </Form.Item>
                            <Form.Item {...restField} name={[name, 'value']} noStyle rules={[{ required: true, message: '请输入Value' }]}>
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
      'chart', 'stats', 'customForm', 'dataTable',
      'microApp', 'search', 'navGroup', 'carousel',
      'news', 'topList'
    ].includes(widget.type);

    if (!hasDataConfig) {
      return <div className="empty-hint">当前组件无数据或交互配置</div>;
    }

    const apiPlaceholderMap: Record<string, string> = {
      chart: '/api/chart-data',
      stats: '/api/stats',
      dataTable: '/api/table-data',
      news: '/api/news',
      topList: '/api/top-list',
    };
    const apiPlaceholder = apiPlaceholderMap[widget.type] || '/api/data';
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
                      <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        <Form.Item {...restField} name={[name, 'key']} noStyle rules={[{ required: true, message: '请输入Key' }]}>
                          <Input placeholder="Header Key" style={{ width: 160 }} />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'value']} noStyle rules={[{ required: true, message: '请输入Value' }]}>
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

        {widget.type === 'chart' && (
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
              <Form.Item name="valueLabel" label="数值标签">
                <Input placeholder="例如：销量" />
              </Form.Item>
            </div>
            <Form.Item name="changeLabel" label="变化标签">
              <Input placeholder="例如：变化" />
            </Form.Item>
          </>
        )}

        {widget.type === 'navGroup' && (
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
                if (dataSource === 'api') {
                  return (
                    <>
                      <Form.Item name="apiEndpoint" label="数据接口">
                        <Input placeholder="/api/nav-items" />
                      </Form.Item>
                      <div className="form-row-2">
                        <Form.Item name="apiMethod" label="请求方式" initialValue="GET">
                          <Select>
                            <Select.Option value="GET">GET</Select.Option>
                            <Select.Option value="POST">POST</Select.Option>
                          </Select>
                        </Form.Item>
                      </div>
                      <Form.Item noStyle shouldUpdate={(prev, cur) => prev.apiMethod !== cur.apiMethod}>
                        {({ getFieldValue: getVal }) => {
                          if (getVal('apiMethod') !== 'POST') return null;
                          return (
                            <Form.Item
                              name="apiBody"
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
                        <Form.List name="apiHeadersList">
                          {(fields, { add, remove }) => (
                            <>
                              {fields.map(({ key, name, ...restField }) => (
                                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                  <Form.Item {...restField} name={[name, 'key']} noStyle rules={[{ required: true, message: '请输入Key' }]}>
                                    <Input placeholder="Header Key" style={{ width: 160 }} />
                                  </Form.Item>
                                  <Form.Item {...restField} name={[name, 'value']} noStyle rules={[{ required: true, message: '请输入Value' }]}>
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
                      <div className="empty-hint" style={{ marginTop: 8 }}>
                        接口应返回格式：{`{ code: 0, data: [{ url, icon, name, description?, iconBgColor?, iconColor?, textColor? }] }`}
                      </div>
                    </>
                  );
                }
                // 手动配置模式
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
                                <div className="form-row-2" style={{ marginBottom: 0 }}>
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
          <IconPicker mode="full" placeholder="CustomerServiceOutlined" />
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

      <div className="form-row-2">
        <Form.Item name="showTitle" label="显示标题" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="titleColor" label="标题颜色">
          <ColorPicker showText allowClear />
        </Form.Item>
      </div>
      <div className="form-row-2">
        <Form.Item name="titleFontSize" label="标题字号" rules={[{ type: 'number', min: 12 }]}>
          <InputNumber style={{ width: '100%' }} suffix="px" placeholder="14" />
        </Form.Item>
        <Form.Item name="titleFontWeight" label="标题字重">
          <Select placeholder="500">
            <Select.Option value={400}>常规 (400)</Select.Option>
            <Select.Option value={500}>中等 (500)</Select.Option>
            <Select.Option value={600}>半粗 (600)</Select.Option>
            <Select.Option value={700}>粗体 (700)</Select.Option>
          </Select>
        </Form.Item>
      </div>

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
      <BackgroundSettings
        form={form}
        initialValues={group?.config as any}
      />
    </>
  );

  // 判断是否有组件配置
  const hasComponentConfig = [
    'typography', 'headerBar', 'link', 'dataTable',
    'customForm', 'pageNavigator', 'microApp',
    'iconNav', 'navGroup', 'carousel', 'myDocuments'
  ].includes(widget.type) || isAssistantHub;

  // 判断是否有数据与交互配置
  const hasDataConfig = [
    'chart', 'stats', 'customForm', 'dataTable',
    'microApp', 'search', 'navGroup', 'carousel',
    'news', 'topList'
  ].includes(widget.type);

  const hasHeaderNavTab = !isGroup && widget.type === 'headerBar';
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
