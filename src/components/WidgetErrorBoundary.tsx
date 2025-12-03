import { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

interface WidgetErrorBoundaryProps {
  children: ReactNode;
  widgetId: string;
  widgetType: string;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class WidgetErrorBoundary extends Component<WidgetErrorBoundaryProps, WidgetErrorBoundaryState> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<WidgetErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Widget [${this.props.widgetType}] error:`, error, errorInfo);
    this.setState({ error });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px' }}>
          <Alert
            message="小部件加载失败"
            description={
              <div>
                <p>该 {this.props.widgetType} 小部件遇到错误，无法正常显示。</p>
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <pre style={{ fontSize: '12px', marginTop: '10px', color: '#ff4d4f' }}>
                    {this.state.error.toString()}
                  </pre>
                )}
              </div>
            }
            type="error"
            showIcon
            action={
              <Button size="small" icon={<ReloadOutlined />} onClick={this.handleReset}>
                重试
              </Button>
            }
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default WidgetErrorBoundary;
