import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Switch, Select, Divider, Upload, Button, message, Tabs, ColorPicker } from 'antd';
import { UploadOutlined, LoadingOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { Widget, MicroAppModule, FloatingModuleConfig } from '@/types';
import { useStore } from '@/store/useStore';
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
import { LinkConfig, SearchConfig, CustomFormConfig, DataTableConfig } from './configs';
import './index.scss';

interface ConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  widget: Widget;
}

const ConfigDialog: React.FC<ConfigDialogProps> = ({ isOpen, onClose, widget }) => {
  const { updateWidget, updateFloatingModule, updateFloatingModuleConfig, floatingModules, groups, updateGroup, updateGroupConfig } = useStore();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);
  const [bgUploading, setBgUploading] = useState(false);

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
      // 分组配置初始化
      if (isGroup && group) {
        const config = group.config || {};
        form.setFieldsValue({
          title: group.title,
          showTitle: config.showTitle !== false,
          titleColor: config.titleColor,
          backgroundType: config.backgroundType || 'color',
          backgroundColor: config.backgroundColor,
          backgroundImage: config.backgroundImage,
          backgroundGradient: config.backgroundGradient,
          backgroundSize: config.backgroundSize,
          backgroundRepeat: config.backgroundRepeat,
          backgroundPosition: config.backgroundPosition,
          borderStyle: config.borderStyle || 'solid',
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
          refreshInterval: widget.config.refreshInterval,
          systemId: widget.config.systemId,
          moduleId: widget.config.moduleId,
          sync: widget.config.sync !== false,
          alive: widget.config.alive !== false,
          eventRoutes: widget.config.eventRoutes || [],
          icon: widget.config.icon || '',
          forceIconOnly: widget.config.forceIconOnly || false,
          iconSvg: widget.config.iconSvg || '',
          backgroundType: widget.config.backgroundType || 'color',
          backgroundColor: widget.config.backgroundColor,
          backgroundImage: widget.config.backgroundImage,
          backgroundGradient: widget.config.backgroundGradient,
          backgroundSize: widget.config.backgroundSize,
          backgroundRepeat: widget.config.backgroundRepeat,
          backgroundPosition: widget.config.backgroundPosition,
        };
        form.setFieldsValue(initialValues);

        if ((!widget.config.icon || widget.config.icon.length === 0) && widget.config.systemId && widget.config.moduleId) {
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
        form.setFieldsValue({
          title: widget.title,
          refreshInterval: widget.config.refreshInterval,
          apiEndpoint: widget.config.apiEndpoint,
          showTitle: widget.config.showTitle !== false,
          backgroundType: widget.config.backgroundType || 'color',
          backgroundColor: widget.config.backgroundColor,
          backgroundImage: widget.config.backgroundImage,
          backgroundGradient: widget.config.backgroundGradient,
          ...widget.config,
        });
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
          // 折叠状态尺寸
          collapsedWidth: widget.config.collapsedWidth || 60,
          collapsedHeight: widget.config.collapsedHeight || 60,
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
  }, [isOpen, widget, form, isFloatingModule, isGroup, group]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();

      // 分组配置保存
      if (isGroup && group) {
        const {
          title,
          showTitle,
          titleColor,
          backgroundType,
          backgroundColor,
          backgroundImage,
          backgroundGradient,
          backgroundSize,
          backgroundRepeat,
          backgroundPosition,
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
          backgroundType,
          backgroundColor: normalizedBgColor,
          backgroundImage,
          backgroundGradient,
          backgroundSize,
          backgroundRepeat,
          backgroundPosition,
          borderStyle,
          borderColor: normalizedBorderColor,
          borderWidth,
          borderRadius,
          padding,
        });

        onClose();
        return;
      }

      if (isFloatingModule) {
        // 悬浮模块配置
          const {
            title,
            showTitle,
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
            // 折叠状态尺寸
            collapsedWidth,
            collapsedHeight,
            // 微应用特定字段
            systemId,
            moduleId,
            sync,
            alive,
            eventRoutes,
            icon: rawIcon,
            forceIconOnly,
            // 助手中心特定字段
            entries,
            ...restConfig
          } = values;
          const normalizedForceIcon = !!forceIconOnly;
          // 根据图值类型分别存储到 icon 或 iconSvg
          const iconValueType = getIconValueType(rawIcon);
          const icon = iconValueType === 'svg' ? '' : (rawIcon || '');
          const cleanedIconSvg = iconValueType === 'svg' ? rawIcon?.trim() : '';

        updateFloatingModule(widget.id, { title }); // 更新 title

        if (widget.type === 'microApp') {
          // 微应用类型的悬浮模块
          updateFloatingModuleConfig(widget.id, {
            ...widget.config,
            showTitle,
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
            // 折叠状态尺寸
            collapsedWidth,
            collapsedHeight,
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
            // 折叠状态尺寸
            collapsedWidth,
            collapsedHeight,
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
            title, showTitle, refreshInterval, systemId, moduleId, sync, alive, eventRoutes, icon: rawIcon,
            backgroundType, backgroundColor, backgroundImage, backgroundGradient,
            backgroundSize, backgroundRepeat, backgroundPosition, forceIconOnly
          } = values;
          const normalizedForceIcon = !!forceIconOnly;
          // 根据图标值类型分别存储到 icon 或 iconSvg
          const iconType = getIconValueType(rawIcon);
          const icon = iconType === 'svg' ? '' : (rawIcon || '');
          const cleanedIconSvg = iconType === 'svg' ? rawIcon?.trim() : '';

          // Normalize color
          let normalizedColor = backgroundColor;
          if (typeof normalizedColor === 'object' && normalizedColor?.toHexString) {
            normalizedColor = normalizedColor.toHexString();
          }

          updateWidget(widget.id, {
            title,
            config: {
              ...widget.config,
              showTitle,
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
              backgroundColor: normalizedColor,
              backgroundImage,
              backgroundGradient,
              backgroundSize,
              backgroundRepeat,
              backgroundPosition,
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
          const { title, showTitle, refreshInterval, apiEndpoint, backgroundType, backgroundColor, backgroundImage, backgroundGradient, ...restConfig } = values;

          // Normalize color
          let normalizedColor = backgroundColor;
          if (typeof normalizedColor === 'object' && normalizedColor?.toHexString) {
            normalizedColor = normalizedColor.toHexString();
          }

          updateWidget(widget.id, {
            title,
            config: {
              ...widget.config,
              showTitle,
              refreshInterval,
              apiEndpoint,
              backgroundType,
              backgroundColor: normalizedColor,
              backgroundImage,
              backgroundGradient,
              ...restConfig,
            },
          });
        }
      }

      onClose();
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

        {['clock', 'stats', 'chart', 'news', 'topList', 'dataTable', 'microApp'].includes(widget.type) && (
          <Form.Item
            name="refreshInterval"
            label="刷新间隔 (秒)"
            rules={[{ type: 'number', min: 0 }]}
          >
            <InputNumber />
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
      'customForm', 'pageNavigator', 'microApp', 'search'
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
                <div style={{ display: 'flex', gap: 8 }}>
                   <Input type="color" style={{ width: 40, padding: 0, border: 'none', background: 'transparent' }} />
                   <Input placeholder="#000000" />
                </div>
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
                 <Input type="color" style={{ width: 60, padding: 4 }} />
               </Form.Item>
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
            </div>
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

        {widget.type === 'dataTable' && <DataTableConfig form={form} widget={widget} />}

        {widget.type === 'customForm' && (
           <Form.Item name="fields" label="表单字段">
             <FormFieldBuilder />
           </Form.Item>
        )}

        {widget.type === 'pageNavigator' && (
            <Form.List name="items">
              {(fields, { add, remove }) => (
                <div className="config-list-container">
                  {fields.map(({ key, name, ...restField }) => (
                    <div key={key} className="config-item-card">
                       <div className="card-header" style={{cursor: 'default'}}>
                          <div className="header-content">
                             <div className="form-row-2" style={{width: '100%', marginBottom: 0}}>
                                <Form.Item {...restField} name={[name, 'name']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                  <Input placeholder="名称" />
                                </Form.Item>
                                <Form.Item {...restField} name={[name, 'path']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                  <Input placeholder="路径" />
                                </Form.Item>
                             </div>
                          </div>
                          <div className="header-actions">
                             <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
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
        )}

        {widget.type === 'microApp' && (
           <>
              <Form.Item
                name="microAppSelector"
                label="微应用选择"
                rules={[{ validator: async () => {
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
                      icon: config.module?.icon || '',
                      iconSvg: config.module?.iconSvg || '',
                      forceIconOnly: config.module?.forceIconOnly ?? form.getFieldValue('forceIconOnly') ?? false,
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
        
        {widget.type === 'search' && (
           <div className="empty-hint">请在“数据与交互”标签页配置搜索路由</div>
        )}
      </>
    );
  };

  const renderDataTab = () => {
    const hasDataConfig = [
      'chart', 'stats', 'customForm', 'dataTable', 
      'microApp', 'search'
    ].includes(widget.type);

    if (!hasDataConfig) {
       return <div className="empty-hint">当前组件无数据或交互配置</div>;
    }

    return (
      <>
         {['chart', 'stats', 'customForm', 'dataTable'].includes(widget.type) && (
            <Form.Item name="apiEndpoint" label="数据接口">
              <Input placeholder="/api/data" />
            </Form.Item>
         )}

         {widget.type === 'microApp' && (
            <Form.Item name="eventRoutes" label="事件路由">
               <EventRouteConfig
                  currentWidgetId={widget.id}
                  currentSystemId={widget.config.systemId}
                  currentModuleId={widget.config.moduleId}
               />
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
              <InputNumber style={{width: '100%'}} suffix="px" />
           </Form.Item>
           <Form.Item label="最小高度" name="minHeight" rules={[{ type: 'number', min: 100 }]}>
              <InputNumber style={{width: '100%'}} suffix="px" />
           </Form.Item>
        </div>
        <div className="form-row-2">
           <Form.Item label="最大宽度" name="maxWidth" rules={[{ type: 'number', min: 200 }]}>
              <InputNumber style={{width: '100%'}} suffix="px" />
           </Form.Item>
           <Form.Item label="最大高度" name="maxHeight" rules={[{ type: 'number', min: 200 }]}>
              <InputNumber style={{width: '100%'}} suffix="px" />
           </Form.Item>
        </div>

        <div className="form-row-2">
            <Form.Item name="collapsible" label="允许折叠" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="closable" label="允许关闭" valuePropName="checked">
              <Switch />
            </Form.Item>
        </div>

        <div className="form-row-2">
           <Form.Item name="theme" label="主题">
             <Select>
               <Select.Option value="auto">跟随主应用</Select.Option>
               <Select.Option value="light">浅色</Select.Option>
               <Select.Option value="dark">暗色</Select.Option>
             </Select>
           </Form.Item>
           <Form.Item name="borderRadius" label="角大小" rules={[{ type: 'number', min: 0, max: 50 }]}>
             <InputNumber style={{ width: '100%' }} suffix="px" />
           </Form.Item>
        </div>

        <Form.Item name="zIndex" label="层级" rules={[{ type: 'number', min: 1 }]}>
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>

        <div className="form-row-2">
           <Form.Item label="折叠宽度" name="collapsedWidth" rules={[{ type: 'number', min: 40, max: 100 }]}>
              <InputNumber style={{width: '100%'}} suffix="px" />
           </Form.Item>
           <Form.Item label="折叠高度" name="collapsedHeight" rules={[{ type: 'number', min: 40, max: 100 }]}>
              <InputNumber style={{width: '100%'}} suffix="px" />
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

      <Divider>边框设置</Divider>
      <div className="form-row-2">
        <Form.Item name="borderStyle" label="边框样式">
          <Select>
            <Select.Option value="solid">实线</Select.Option>
            <Select.Option value="dashed">虚线</Select.Option>
            <Select.Option value="none">无边框</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="borderWidth" label="边框宽度" rules={[{ type: 'number', min: 0, max: 10 }]}>
          <InputNumber style={{ width: '100%' }} suffix="px" />
        </Form.Item>
      </div>
      <div className="form-row-2">
        <Form.Item name="borderColor" label="边框颜色">
          <ColorPicker showText allowClear />
        </Form.Item>
        <Form.Item name="borderRadius" label="圆角" rules={[{ type: 'number', min: 0, max: 50 }]}>
          <InputNumber style={{ width: '100%' }} suffix="px" />
        </Form.Item>
      </div>

      <Form.Item name="padding" label="内边距" rules={[{ type: 'number', min: 0, max: 100 }]}>
        <InputNumber style={{ width: '100%' }} suffix="px" />
      </Form.Item>

      <Divider>背景设置</Divider>
      <BackgroundSettings
        form={form}
        initialValues={group?.config as any}
      />
    </>
  );

  // 根据类型构建 tabs
  const items = isGroup
    ? [{ key: 'group', label: '分组配置', children: renderGroupTab() }]
    : [
        { key: 'basic', label: '基础配置', children: renderBasicTab() },
        { key: 'component', label: '组件配置', children: renderComponentTab() },
        { key: 'data', label: '数据与交互', children: renderDataTab() },
      ];

  if (isFloatingModule) {
    items.push({ key: 'floating', label: '悬浮配置', children: renderFloatingTab() });
  }

  // 确定对话框标题
  const dialogTitle = isGroup
    ? `配置分组: ${group?.title || widget.title}`
    : isFloatingModule
      ? `配置悬浮模块: ${widget.title}`
      : `配置小部件: ${widget.title}`;

  return (
    <Modal
      title={dialogTitle}
      open={isOpen}
      onOk={handleOk}
      onCancel={onClose}
      destroyOnHidden
      className="config-dialog"
      width={600}
      style={{ top: 40 }}
      styles={{ body: { maxHeight: 'calc(100vh - 240px)', overflowY: 'auto', paddingTop: 0 } }}
    >
      <Form form={form} layout="vertical" size="small">
         <Tabs defaultActiveKey={isGroup ? "group" : "component"} items={items} className="config-tabs" />
      </Form>
    </Modal>
  );
};

export default ConfigDialog;
