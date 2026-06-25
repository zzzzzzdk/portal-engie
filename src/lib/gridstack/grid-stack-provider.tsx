import type { GridItemHTMLElement, GridStack, GridStackOptions, GridStackWidget } from "gridstack";
import { type PropsWithChildren, useCallback, useState } from "react";
import { GridStackContext } from "./grid-stack-context";

export function GridStackProvider({
  children,
  initialOptions,
}: PropsWithChildren<{ initialOptions: GridStackOptions }>) {
  const [gridStack, setGridStack] = useState<GridStack | null>(null);
  const [rawWidgetMetaMap, setRawWidgetMetaMap] = useState(() => {
    const map = new Map<string, GridStackWidget>();
    const deepFindNodeWithContent = (obj: GridStackWidget) => {
      if (obj.id && obj.content) {
        map.set(obj.id, obj);
      }
      if (obj.subGridOpts?.children) {
        obj.subGridOpts.children.forEach((child: GridStackWidget) => {
          deepFindNodeWithContent(child);
        });
      }
    };
    initialOptions.children?.forEach((child: GridStackWidget) => {
      deepFindNodeWithContent(child);
    });
    return map;
  });

  const addWidget = useCallback(
    (widget: GridStackWidget & { id: Required<GridStackWidget>["id"] }) => {
      if (!gridStack) return;

      console.log('[GridStackProvider.addWidget] Adding widget:', widget.id);

      // 调用 GridStack API
      gridStack.addWidget(widget);

      // 手动更新 Map（renderCB 只存储容器引用，不更新 metadata）
      setRawWidgetMetaMap((prev) => {
        const newMap = new Map<string, GridStackWidget>(prev);
        newMap.set(widget.id, widget);
        return newMap;
      });

      console.log('[GridStackProvider.addWidget] Done');
    },
    [gridStack]
  );

  const addSubGrid = useCallback(
    (subGrid: GridStackWidget & {
      id: Required<GridStackWidget>["id"];
      subGridOpts: Required<GridStackWidget>["subGridOpts"] & {
        children: Array<GridStackWidget & { id: Required<GridStackWidget>["id"] }>
      }
    }) => {
      gridStack?.addWidget(subGrid);

      setRawWidgetMetaMap((prev) => {
        const newMap = new Map<string, GridStackWidget>(prev);
        subGrid.subGridOpts?.children?.forEach((meta: GridStackWidget & { id: Required<GridStackWidget>["id"] }) => {
          newMap.set(meta.id, meta);
        }
        );

        return newMap;
      });
    },
    [gridStack]
  );

  const removeWidget = useCallback(
    (id: string) => {
      const element = document.body.querySelector<GridItemHTMLElement>(`[gs-id="${id}"]`);
      if (element) {
        if (element.gridstackNode?.grid) {
          element.gridstackNode.grid.removeWidget(element);
        } else {
          gridStack?.removeWidget(element);
        }
      }

      setRawWidgetMetaMap((prev) => {
        const newMap = new Map<string, GridStackWidget>(prev);
        const target = newMap.get(id);
        if (target?.subGridOpts?.children) {
          target.subGridOpts.children.forEach((meta: GridStackWidget & { id?: string }) => {
            if (meta.id) {
              newMap.delete(meta.id as string);
            }
          });
        }
        newMap.delete(id);
        return newMap;
      });
    },
    [gridStack]
  );

  const saveOptions = useCallback(() => {
    if (!gridStack?.el?.isConnected) {
      return undefined;
    }
    return gridStack.save(true, true, (_, widget) => widget);
  }, [gridStack]);

  const removeAll = useCallback(() => {
    gridStack?.removeAll();
    setRawWidgetMetaMap(new Map<string, GridStackWidget>());
  }, [gridStack]);

  return (
    <GridStackContext.Provider
      value={{
        initialOptions,
        gridStack,

        addWidget,
        removeWidget,
        addSubGrid,
        saveOptions,
        removeAll,

        _gridStack: {
          value: gridStack,
          set: setGridStack,
        },
        _rawWidgetMetaMap: {
          value: rawWidgetMetaMap,
          set: setRawWidgetMetaMap,
        },
      }}
    >
      {children}
    </GridStackContext.Provider>
  );
}
