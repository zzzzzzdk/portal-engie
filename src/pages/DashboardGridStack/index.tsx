/**
 * DashboardGridStack - GridStack.js 集成实验（未完成，已封存）
 *
 * ========================================
 * 项目状态：🚧 开发中断 - 难度过大，暂时封存
 * 最后更新：2025-12-05
 * ========================================
 *
 * ## 已完成功能 ✅
 * 1. GridStack 基础初始化（12列网格，cellHeight 50，margin 10）
 * 2. 从 store 读取 widgets 并渲染
 * 3. 使用 React 18 createRoot 渲染真实组件
 * 4. 使用 'added' 事件解决 DOM 异步创建问题
 * 5. 使用 widgetsRef 解决事件监听器闭包问题
 * 6. React roots 生命周期管理（创建/卸载）
 *
 * ## 未完成功能 ❌
 * 1. ❌ 拖拽和调整大小功能
 * 2. ❌ 布局变化同步到 Zustand store
 * 3. ❌ 编辑/预览模式切换
 * 4. ❌ 添加新 widget 功能
 * 5. ❌ 删除 widget 功能
 * 6. ❌ Widget 配置功能
 * 7. ❌ 右键菜单
 * 8. ❌ 布局持久化到 localStorage
 * 9. ❌ 拖拽手柄 `.grid-drag-handle` 支持
 * 10. ❌ 全屏模式
 * 11. ❌ Widget 刷新功能
 * 12. ❌ 样式适配（网格背景、hover 效果等）
 *
 * ## 遇到的技术难点 ⚠️
 * 1. **DOM 异步创建问题**：
 *    - grid.load() 是异步的，无法用 requestAnimationFrame 解决
 *    - 解决方案：使用 GridStack 'added' 事件监听
 *
 * 2. **React 与 GridStack 集成复杂度**：
 *    - GridStack 直接操作 DOM，React 使用虚拟 DOM
 *    - 需要使用 React Portal 或 createRoot 桥接
 *    - 状态同步困难（GridStack → React → Zustand）
 *
 * 3. **闭包问题**：
 *    - 事件监听器中捕获的 widgets 是旧值
 *    - 解决方案：使用 useRef 保存最新引用
 *
 * 4. **双向数据流同步**：
 *    - Zustand store → GridStack（未实现）
 *    - GridStack → Zustand store（未实现）
 *    - 可能导致循环更新
 *
 * ## 为什么封存 🤔
 * - GridStack 与 React 集成的复杂度超出预期
 * - react-grid-layout 已经能满足需求
 * - 时间成本过高，性价比低
 * - 建议继续使用 react-grid-layout
 *
 * ## 参考资料 📚
 * - GridStack 官方文档：https://github.com/gridstack/gridstack.js
 * - React 集成示例：demo/react-hooks.html
 * - 序列化示例：demo/serialization.html
 * - 事件处理示例：demo/events.js
 *
 * ## 如需继续开发 🔧
 * 1. 研究 demo/react-hooks.html 中的 Controlled 模式
 * 2. 实现 grid.on('change') 事件同步布局到 store
 * 3. 使用 grid.batchUpdate() 避免多次重渲染
 * 4. 考虑使用 GridStack 的 save()/load() API 持久化
 *
 * ========================================
 */

import React, { useEffect, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { GridStack, GridStackOptions, GridStackWidget } from "gridstack";
import 'gridstack/dist/gridstack.min.css';
import { useStore } from '@/store/useStore';
import WidgetWrapper from '@/components/WidgetWrapper';
import ClockWidget from '@/components/widgets/ClockWidget';
import StatsWidget from '@/components/widgets/StatsWidget';
import ChartWidget from '@/components/widgets/ChartWidget';
import LinkWidget from '@/components/widgets/LinkWidget';
import NewsWidget from '@/components/widgets/NewsWidget';
import TopListWidget from '@/components/widgets/TopListWidget';
import SearchWidget from '@/components/widgets/SearchWidget';
import DataTableWidget from '@/components/widgets/DataTableWidget';
import CardGridWidget from '@/components/widgets/CardGridWidget';
import CustomFormWidget from '@/components/widgets/CustomFormWidget';
import MicroAppWidget from '@/components/widgets/MicroAppWidget';
import WidgetErrorBoundary from '@/components/WidgetErrorBoundary';
import { Widget } from '@/types';
import './index.scss';

const DashboardGridStack: React.FC = () => {
  const { widgets } = useStore();
  const gridRef = useRef<HTMLDivElement>(null);
  const gridInstanceRef = useRef<GridStack | null>(null);
  const widgetRootsRef = useRef<Map<string, Root>>(new Map()); // 管理 React roots
  const widgetsRef = useRef(widgets); // 保存最新的 widgets 引用

  // 更新 widgetsRef
  useEffect(() => {
    widgetsRef.current = widgets;
  }, [widgets]);

  // 渲染 widget 内容
  const renderWidgetContent = (widget: Widget) => {
    const commonProps = { config: widget.config, widget };
    switch (widget.type) {
      case 'clock':
        return <ClockWidget {...commonProps} />;
      case 'stats':
        return <StatsWidget {...commonProps} />;
      case 'chart':
        return <ChartWidget {...commonProps} />;
      case 'link':
        return <LinkWidget {...commonProps} />;
      case 'news':
        return <NewsWidget {...commonProps} />;
      case 'topList':
        return <TopListWidget {...commonProps} />;
      case 'search':
        return <SearchWidget {...commonProps} />;
      case 'dataTable':
        return <DataTableWidget {...commonProps} />;
      case 'cardGrid':
        return <CardGridWidget {...commonProps} />;
      case 'customForm':
        return <CustomFormWidget {...commonProps} />;
      case 'microApp':
        return <MicroAppWidget {...commonProps} />;
      default:
        return <div>Unknown Widget Type: {widget.type}</div>;
    }
  };

  // 初始化 GridStack（只运行一次）
  useEffect(() => {
    if (!gridRef.current || gridInstanceRef.current) return;

    console.log('[步骤 1] 初始化 GridStack');

    const grid = GridStack.init({
      column: 12,
      cellHeight: 50,
      margin: 10,
      float: true,
    }, gridRef.current);

    // 转换为 GridStack 格式
    const gridItems = widgets.map(widget => ({
      id: widget.id,
      x: widget.layout.x,
      y: widget.layout.y,
      w: widget.layout.w,
      h: widget.layout.h,
      content: `<div id="widget-${widget.id}"></div>`, // 占位 div
    }));
    console.log(widgets)
    // 使用 load API 一次性加载所有 widgets
    // added 事件会自动触发，然后渲染 React 组件
    grid.load(gridItems);


    gridInstanceRef.current = grid;

    // 监听 widget 添加事件，当 DOM 真正创建后渲染 React 组件
    grid.on('added', (_event, items) => {
      console.log(_event, items)
      if (!items) return;

      items.forEach(item => {
        const widgetId = item.id as string;
        // 使用 ref 获取最新的 widgets
        const widget = widgetsRef.current.find(w => w.id === widgetId);
        if (!widget) return;

        const container = document.getElementById(`widget-${widgetId}`);
        if (container) {
          console.log(`[步骤 2] 渲染 React 组件: ${widgetId} (${widget.type})`);

          // 使用 React 18 的 createRoot 渲染真实组件
          let root = widgetRootsRef.current.get(widgetId);
          if (!root) {
            root = createRoot(container);
            widgetRootsRef.current.set(widgetId, root);
          }

          // 渲染 Widget 内容
          root.render(
            <WidgetErrorBoundary widgetId={widget.id} widgetType={widget.type}>
              <WidgetWrapper widget={widget}>
                {renderWidgetContent(widget)}
              </WidgetWrapper>
            </WidgetErrorBoundary>
          );
        } else {
          console.warn(`[步骤 2] 找不到容器: widget-${widgetId}`);
        }
      });
    });

    return () => {
      console.log('[步骤 2] 清理 GridStack 和 React roots');

      // 卸载所有 React roots
      widgetRootsRef.current.forEach((root, widgetId) => {
        console.log(`[步骤 2] 卸载 root: ${widgetId}`);
        root.unmount();
      });
      widgetRootsRef.current.clear();

      // 销毁 GridStack
      if (gridInstanceRef.current) {
        gridInstanceRef.current.destroy(false);
        gridInstanceRef.current = null;
      }
    };
  }, []);

  // 加载 widgets（使用 GridStack 的 load API）
  useEffect(() => {
    const grid = gridInstanceRef.current;
    if (!grid) return;

    // console.log(`[步骤 1] 加载 ${widgets.length} 个 widgets`, widgets);


    // console.log('[步骤 1] GridStack 加载完成，等待 added 事件...');
  }, [widgets]);

  return (
    <div className="dashboard-container">
      <div style={{ padding: '20px', background: '#fff', marginBottom: '20px', borderRadius: '8px' }}>
        <h2 style={{ marginBottom: '10px' }}>
          GridStack 测试 - 步骤 2：渲染真实的 React 组件
        </h2>
        <p style={{ marginBottom: '0', color: '#666' }}>
          当前显示 <strong>{widgets.length}</strong> 个 widgets（真实组件，不可交互）
        </p>
      </div>
      <button onClick={() => {
        let el = gridInstanceRef.current?.createWidgetDivs({ content: `<div>New Make: 123</div>` })
        if (el) {
          gridInstanceRef.current?.makeWidget(el, { w: 2 });
        }
      }}>添加widget</button>
      <div ref={gridRef} className="grid-stack"></div>
    </div>
  );
};

export default DashboardGridStack;
