import {
  PropsWithChildren,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useGridStackContext } from "./grid-stack-context";
import { GridStack, GridStackOptions, GridStackWidget } from "gridstack";
import { GridStackRenderContext } from "./grid-stack-render-context";
import isEqual from "react-fast-compare";

// WeakMap to store widget containers for each grid instance
export const gridWidgetContainersMap = new WeakMap<GridStack, Map<string, HTMLElement>>();

export function GridStackRenderProvider({ children }: PropsWithChildren) {
  const {
    _gridStack: { value: gridStack, set: setGridStack },
    initialOptions,
  } = useGridStackContext();

  const widgetContainersRef = useRef<Map<string, HTMLElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<GridStackOptions>(initialOptions);

  // ✅ 新增：版本号状态，用于触发重新渲染
  const [containerVersion, setContainerVersion] = useState(0);

  const renderCBFn = useCallback(
    (element: HTMLElement, widget: GridStackWidget & { grid?: GridStack }) => {
      if (widget.id && widget.grid) {
        // Get or create the widget container map for this grid instance
        let containers = gridWidgetContainersMap.get(widget.grid);
        if (!containers) {
          containers = new Map<string, HTMLElement>();
          gridWidgetContainersMap.set(widget.grid, containers);
        }
        containers.set(widget.id, element);

        // Also update the local ref for backward compatibility
        widgetContainersRef.current.set(widget.id, element);

        // 异步触发重新渲染，避免同步渲染循环导致卡死
        setTimeout(() => {
          setContainerVersion(v => v + 1);
        }, 0);
      }
    },
    []
  );

  const initGrid = useCallback(() => {
    if (containerRef.current) {
      GridStack.renderCB = renderCBFn;
      return GridStack.init(optionsRef.current, containerRef.current);
      // ! Change event not firing on nested grids (resize, move...) https://github.com/gridstack/gridstack.js/issues/2671
      // .on("change", () => {
      //   console.log("changed");
      // })
      // .on("resize", () => {
      //   console.log("resize");
      // })
    }
    return null;
  }, [renderCBFn]);

  useLayoutEffect(() => {
    if (!isEqual(initialOptions, optionsRef.current) && gridStack) {
      try {
        gridStack.removeAll(false);
        gridStack.destroy(false);
        widgetContainersRef.current.clear();
        // Clean up the WeakMap entry for this grid instance
        gridWidgetContainersMap.delete(gridStack);
        optionsRef.current = initialOptions;
        setGridStack(initGrid());
      } catch (e) {
        console.error("Error reinitializing gridstack", e);
      }
    }
  }, [initialOptions, gridStack, initGrid, setGridStack]);

  useLayoutEffect(() => {
    if (!gridStack) {
      try {
        setGridStack(initGrid());
      } catch (e) {
        console.error("Error initializing gridstack", e);
      }
    }
  }, [gridStack, initGrid, setGridStack]);

  return (
    <GridStackRenderContext.Provider
      value={useMemo(() => {
        const resolveContainer = (widgetId: string) => {
          const gridContainers = gridStack
            ? gridWidgetContainersMap.get(gridStack)
            : undefined;

          const cached =
            (gridContainers && gridContainers.get(widgetId)) ||
            widgetContainersRef.current.get(widgetId) ||
            null;

          if (cached?.isConnected) {
            return cached;
          }

          if (gridStack?.el) {
            const selector = `[gs-id="${widgetId}"] .grid-stack-item-content`;
            const fresh = gridStack.el.querySelector<HTMLElement>(selector);
            if (fresh) {
              if (gridContainers) {
                gridContainers.set(widgetId, fresh);
              }
              widgetContainersRef.current.set(widgetId, fresh);
              return fresh;
            }
          }

          return cached;
        };

        return {
          getWidgetContainer: resolveContainer,
        };
      }, [gridStack, containerVersion])}
    >
      <div ref={containerRef}>{gridStack ? children : null}</div>
    </GridStackRenderContext.Provider>
  );
}
