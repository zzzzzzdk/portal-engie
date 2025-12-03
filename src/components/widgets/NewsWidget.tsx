import React from 'react';
import { List, Avatar, Typography } from 'antd';
import { WidgetConfig } from '@/types';

interface NewsWidgetProps {
  config?: WidgetConfig;
}

const data = [
  {
    title: 'React 19 Beta Now Available',
    description: 'The React team has just released the beta version of React 19.',
  },
  {
    title: 'Vite 6.0 Roadmap',
    description: 'Next generation frontend tooling is getting even faster.',
  },
  {
    title: 'TypeScript 5.4 Released',
    description: 'New features include NoInfer utility type and more.',
  },
  {
    title: 'Ant Design 6.0 Coming Soon',
    description: 'A sneak peek into the future of the world\'s second most popular UI library.',
  },
];

const NewsWidget: React.FC<NewsWidgetProps> = ({ config: _config }) => {
  return (
    <List
      itemLayout="horizontal"
      dataSource={data}
      renderItem={(item, index) => (
        <List.Item>
          <List.Item.Meta
            avatar={<Avatar style={{ backgroundColor: `hsl(${index * 60}, 70%, 60%)` }}>{item.title.charAt(0)}</Avatar>}
            title={<a href="#">{item.title}</a>}
            description={<Typography.Text ellipsis>{item.description}</Typography.Text>}
          />
        </List.Item>
      )}
    />
  );
};

export default NewsWidget;
