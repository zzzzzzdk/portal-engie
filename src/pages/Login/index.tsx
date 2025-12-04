import React, { useState } from 'react';
import { Form, Input, Button, Checkbox, App } from 'antd';
import { UserOutlined, LockOutlined, AppstoreOutlined, GithubOutlined } from '@ant-design/icons';
import { useStore } from '@/store/useStore';
import { useNavigate } from 'react-router-dom';
import { loginApi } from '@/services/login';
import './index.scss';

const Login: React.FC = () => {
  const { login } = useStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // 调用真实登录接口
      const response = await loginApi({
        username: values.username,
        password: values.password,
      });

      // 登录成功
      message.success('登录成功');

      // 更新 store 状态（token 已经通过 cookie 设置）
      login(response?.user_info);

      // 跳转到首页
      navigate('/');
    } catch (error: any) {
      console.error('登录失败:', error);
      message.error(error?.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-content">
        <div className="login-header">
          <div className="logo">
            <AppstoreOutlined />
            <span className="title">Portal Engine</span>
          </div>
          <div className="desc">
            An intelligent and flexible dashboard solution
          </div>
        </div>

        <div className="login-main">
          <Form
            name="login"
            initialValues={{ remember: true }}
            onFinish={onFinish}
            size="large"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名！' }]}
              initialValue={"admin"}
            >
              <Input
                prefix={<UserOutlined className="site-form-item-icon" />}
                placeholder="用户名: admin"
              />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码！' }]}
              initialValue={'123456'}
            >
              <Input
                prefix={<LockOutlined className="site-form-item-icon" />}
                type="password"
                placeholder="密码: admin"
              />
            </Form.Item>
            <Form.Item>
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>记住我</Checkbox>
              </Form.Item>
              <a className="login-form-forgot" href="" onClick={e => e.preventDefault()} style={{ float: 'right' }}>
                忘记密码
              </a>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" className="login-form-button" block loading={loading}>
                登录
              </Button>
            </Form.Item>
          </Form>
        </div>

        <div className="login-footer">
          <div className="links">
            <a href="#" onClick={e => e.preventDefault()}>帮助</a>
            <a href="#" onClick={e => e.preventDefault()}>隐私</a>
            <a href="#" onClick={e => e.preventDefault()}>条款</a>
          </div>
          <div className="copyright">
            Copyright <GithubOutlined /> 2025 Intelligent Computing
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
