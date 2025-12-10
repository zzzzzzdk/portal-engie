import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { WidgetConfig } from '@/types';
import './index.scss';

interface NavigationItem {
  name: string;
  path: string;
}

interface PageNavigatorWidgetConfig extends WidgetConfig {
  items?: NavigationItem[];
}

interface PageNavigatorWidgetProps {
  config: PageNavigatorWidgetConfig;
}

const DEFAULT_ITEMS: NavigationItem[] = [
  { name: '沧澜架构', path: 'http://192.168.5.60:30093/#/preview/61f2c8c8-f50b-4f99-adda-8eee5bb7b92b' },
  { name: '工作台', path: 'http://192.168.5.60:30093/#/preview/61f2c8c8-f50b-4f99-adda-8eee5bb7b92b' },
  { name: '首页', path: 'http://192.168.5.60:30093/#/preview/61f2c8c8-f50b-4f99-adda-8eee5bb7b92b' }
];

const variants = {
  center: { 
    x: "-50%", 
    left: "50%", 
    scale: 1.2, 
    zIndex: 10, 
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 30 }
  },
  left: { 
    x: "-50%", 
    left: "calc(50% - 220px)", 
    scale: 0.9, 
    zIndex: 5, 
    opacity: 0.8,
    transition: { type: "spring", stiffness: 300, damping: 30 }
  },
  right: { 
    x: "-50%", 
    left: "calc(50% + 220px)", 
    scale: 0.9, 
    zIndex: 5, 
    opacity: 0.8,
    transition: { type: "spring", stiffness: 300, damping: 30 }
  },
  hidden: { 
    x: "-50%", 
    left: "50%", 
    scale: 0.5, 
    zIndex: 0, 
    opacity: 0 
  }
};

const PageNavigatorWidget: React.FC<PageNavigatorWidgetProps> = ({ config }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isEditMode } = useStore();
  const items = config.items && config.items.length > 0 ? config.items : DEFAULT_ITEMS;
  
  // State to track the active (centered) item index
  const [activeIndex, setActiveIndex] = useState<number>(1);

  // Initialize active index based on current path
  useEffect(() => {
    const currentIndex = items.findIndex(item => {
      if (item.path === location.pathname) return true;
      return false;
    });
    
    if (currentIndex !== -1) {
      setActiveIndex(currentIndex);
    } else {
      if (items.length > 0) {
         setActiveIndex(Math.floor(items.length / 2));
      }
    }
  }, [location.pathname, items]);

  const handleNavigate = (path: string, index: number) => {
    // Set active index immediately to trigger animation
    setActiveIndex(index);

    if (isEditMode) return;
    
    if (!path) return;
    
    // Delay navigation to allow animation to play
    setTimeout(() => {
      if (path.startsWith('http') || path.startsWith('//')) {
        window.open(path, '_blank');
      } else {
        navigate(path);
      }
    }, 600); // 600ms delay to allow spring animation to settle mostly
  };

  const getPositionVariant = (index: number) => {
    const len = items.length;
    // Calculate relative position based on circular buffer
    // 0 -> center, 1 -> right, len-1 -> left
    const diff = (index - activeIndex + len) % len;
    
    if (diff === 0) return 'center';
    if (diff === 1) return 'right';
    if (diff === len - 1) return 'left';
    return 'hidden';
  };

  return (
    <div className="page-navigator-widget">
      <div className="nav-container">
        {items.map((item, index) => {
          const variant = getPositionVariant(index);
          const isCenter = variant === 'center';
          
          return (
            <motion.div 
              key={`${index}-${item.name}`}
              className={`nav-item ${isCenter ? 'center-item' : ''}`}
              initial={false}
              animate={variant}
              variants={variants}
              onClick={() => handleNavigate(item.path, index)}
            >
              <span>{item.name}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default PageNavigatorWidget;
