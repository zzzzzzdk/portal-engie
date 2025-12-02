import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getToken } from '@/utils/cookie';

interface AuthGuardProps {
  children: React.ReactNode;
  requiresAuth?: boolean;
}

/**
 * 路由守卫组件
 * 用于保护需要认证的路由
 * 通过检查 Cookie 中的 token 来判断是否已登录
 */
const AuthGuard: React.FC<AuthGuardProps> = ({ children, requiresAuth = false }) => {
  const location = useLocation();

  // 从 Cookie 中获取 token 作为最终判断依据
  const hasToken = !!getToken();

  useEffect(() => {
    // 可以在这里添加页面标题更新等逻辑
  }, [location]);

  // 如果路由不需要认证，直接渲染子组件
  if (!requiresAuth) {
    // 但如果是登录页，且用户已有 token，重定向到首页
    if (location.pathname === '/login' && hasToken) {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  }

  // 如果需要认证但用户没有 token，重定向到登录页
  if (!hasToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
