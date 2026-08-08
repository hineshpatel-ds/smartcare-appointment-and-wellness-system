import React, { useState } from 'react';
import { Bot, Send, X } from 'lucide-react';
import { useApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function Chatbot() {
  const { request } = useApi();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { from: 'bot', body: 'Ask about doctors, appointments, packages, support, or navigation.' }
  ]);

  async function send(event) {
    event.preventDefault();
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    setMessages((items) => [...items, { from: 'you', body: text }]);
    try {
      const result = await request('/chatbot', {
        method: 'POST',
        body: JSON.stringify({ message: text, userId: user?.userId, role: user?.role })
      });
      setMessages((items) => [...items, { from: 'bot', body: result.reply }]);
    } catch (error) {
      setMessages((items) => [...items, { from: 'bot', body: error.message }]);
    }
  }

  if (!open) {
    return (
      <button className="chat-toggle" onClick={() => setOpen(true)} type="button">
        <Bot size={18} /> Chat
      </button>
    );
  }

  return (
    <aside className="chatbot">
      <header>
        <Bot size={18} /> Virtual Assistant
        <button onClick={() => setOpen(false)} type="button">
          <X size={14} />
        </button>
      </header>
      <div className="chat-log">
        {messages.map((message, index) => (
          <p key={index} className={message.from}>
            {message.body}
          </p>
        ))}
      </div>
      <form onSubmit={send}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a question" />
        <button type="submit">
          <Send size={16} />
        </button>
      </form>
    </aside>
  );
}
