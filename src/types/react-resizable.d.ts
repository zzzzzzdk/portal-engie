declare module 'react-resizable' {
  import { Component, CSSProperties, ReactNode } from 'react';

  export interface ResizeCallbackData {
    node: HTMLElement;
    size: { width: number; height: number };
    handle: string;
  }

  export interface ResizableProps {
    children: ReactNode;
    width: number;
    height: number;
    handle?: ReactNode | ((resizeHandle: string) => ReactNode);
    handleSize?: [number, number];
    lockAspectRatio?: boolean;
    axis?: 'both' | 'x' | 'y' | 'none';
    minConstraints?: [number, number];
    maxConstraints?: [number, number];
    onResizeStop?: (e: React.SyntheticEvent, data: ResizeCallbackData) => void;
    onResizeStart?: (e: React.SyntheticEvent, data: ResizeCallbackData) => void;
    onResize?: (e: React.SyntheticEvent, data: ResizeCallbackData) => void;
    draggableOpts?: any;
    resizeHandles?: Array<'s' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne'>;
    transformScale?: number;
    className?: string;
    style?: CSSProperties;
  }

  export class Resizable extends Component<ResizableProps> {}
}
