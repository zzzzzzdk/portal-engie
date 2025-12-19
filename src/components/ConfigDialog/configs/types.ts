import { FormInstance } from 'antd';
import { Widget } from '@/types';

/**
 * 配置组件通用 Props
 */
export interface WidgetConfigProps {
  form: FormInstance;
  widget: Widget;
}
