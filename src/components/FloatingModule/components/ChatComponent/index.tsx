import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Avatar } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined } from '@ant-design/icons';
import './index.scss';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

interface ChatComponentProps {
  // 可以通过 props 传递配置
  botName?: string;
  welcomeMessage?: string;
  onSendMessage?: (message: string) => Promise<string>;
  emitWidgetEvent?: (eventName: string, payload: Record<string, any>, trigger?: 'click' | 'change' | 'submit' | 'reset' | 'system') => void;
}

const ChatComponent: React.FC<ChatComponentProps> = ({
  botName: _botName = '智能助手',
  welcomeMessage = '您好!我是您的智能助手,有什么可以帮您?',
  onSendMessage,
  emitWidgetEvent
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: welcomeMessage,
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    emitWidgetEvent?.('chat.send', { message: inputValue, conversationId: 'default', data: userMessage }, 'submit');
    setInputValue('');
    setLoading(true);

    try {
      // 调用外部处理函数或默认回复
      const botReply = onSendMessage
        ? await onSendMessage(inputValue)
        : `收到您的消息: "${inputValue}"`;

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: botReply,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
      emitWidgetEvent?.('chat.receive', { message: botReply, conversationId: 'default', data: botMessage }, 'system');
    } catch (error) {
      console.error('发送消息失败:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: '抱歉,发送消息失败,请稍后重试。',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-component">
      <div className="messages-container">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.type}`}>
            <Avatar
              icon={msg.type === 'user' ? <UserOutlined /> : <RobotOutlined />}
              className="avatar"
            />
            <div className="content">
              <div className="text">{msg.content}</div>
              <div className="time">
                {msg.timestamp.toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="input-area">
        <Input
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onPressEnter={handleSend}
          placeholder="输入消息..."
          disabled={loading}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default ChatComponent;
