import { createPortal } from "react-dom";
import { useGridStackContext } from "./grid-stack-context";
import { useGridStackRenderContext } from "./grid-stack-render-context";
import { GridStackWidgetContext } from "./grid-stack-widget-context";
import { GridStackWidget } from "gridstack";
import { ComponentType } from "react";

export interface ComponentDataType<T = object> {
  name: string;
  props: T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ComponentMap = Record<string, ComponentType<any>>;

function parseWeightMetaToComponentData(
  meta: GridStackWidget
): ComponentDataType & { error: unknown } {
  let error = null;
  let name = "";
  let props = {};
  try {
    if (meta.content) {
      const result = JSON.parse(meta.content) as {
        name: string;
        props: object;
      };
      name = result.name;
      props = result.props;
    }
  } catch (e) {
    error = e;
  }
  return {
    name,
    props,
    error,
  };
}

export function GridStackRender(props: { componentMap: ComponentMap }) {
  const { _rawWidgetMetaMap } = useGridStackContext();
  const { getWidgetContainer } = useGridStackRenderContext();

  return (
    <>
      {Array.from(_rawWidgetMetaMap.value.entries()).map(([id, meta]) => {
        const componentData = parseWeightMetaToComponentData(meta);

        const WidgetComponent = props.componentMap[componentData.name];

        const widgetContainer = getWidgetContainer(id);

        // ✅ 修复：容器不存在时跳过渲染（动态添加 widget 时会出现短暂延迟）
        if (!widgetContainer) {
          console.warn(`[GridStackRender] Container not ready for widget: ${id}, skipping render...`);
          return null;
        }

        // WidgetComponent 不存在时也跳过渲染
        if (!WidgetComponent) {
          console.error(`[GridStackRender] Component "${componentData.name}" not found in componentMap`);
          return null;
        }

        return (
          <GridStackWidgetContext.Provider key={id} value={{ widget: { id } }}>
            {createPortal(
              <WidgetComponent {...componentData.props} />,
              widgetContainer
            )}
          </GridStackWidgetContext.Provider>
        );
      })}
    </>
  );
}