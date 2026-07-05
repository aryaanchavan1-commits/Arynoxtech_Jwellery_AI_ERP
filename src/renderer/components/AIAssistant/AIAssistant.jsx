import React, { useState, useEffect, useRef, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';

const SUGGESTIONS = [
  'Show me today pending orders',
  'What is the current gold rate?',
  'List top 10 selling items this month',
  'Show karagir pending work',
  'Generate trial balance report',
  'Which items are low in stock?',
  'Show customer pending payments',
  'Calculate profit for this month',
  'Show me recent sales invoices',
  'List all parties with balances',
  'What is the stock value by purity?',
  'Show tray-wise stock summary'
];

const AVAILABLE_MODELS = [
  { id: 'llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B (2026)' },
  { id: 'llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick 17B (2026)' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B' },
  { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 70B' },
  { id: 'qwen-2.5-32b', name: 'Qwen 2.5 32B' },
];

export default function AIAssistant() {
  const { setPageTitle, dbQuery, formatCurrency, formatWeight, addNotification } = useContext(AppContext);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama-4-scout-17b-16e-instruct');
  const [configChecked, setConfigChecked] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setPageTitle('AI Assistant');
    checkConfig();
    addWelcomeMessage();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkConfig = async () => {
    try {
      const config = await window.electronAPI.config.get();
      if (!config.groqApiKey) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⚠️ **Groq API Key not configured!**\n\nPlease go to **Settings > AI Configuration** and add your Groq API key to enable the AI assistant.\n\nYou can get a free API key from [console.groq.com](https://console.groq.com).',
          isSystem: true
        }]);
      }
      if (config.aiModel) setSelectedModel(config.aiModel);
      setConfigChecked(true);
    } catch (e) {
      setConfigChecked(true);
    }
  };

  const addWelcomeMessage = () => {
    setMessages([
      {
        role: 'assistant',
        content: `🤖 **Welcome to Arynox AI Assistant!**

I am your intelligent assistant for **Arynoxtech Jwellery ERP Management System** - the best ever Software Product for Jewellery stores.

I can help you with:
• 📊 **Dashboard insights** - Sales, purchases, stock summary
• 💎 **Stock queries** - Check item details, low stock alerts
• 🛍️ **Sales data** - Recent invoices, top selling items
• 📒 **Accounting** - Trial balance, P&L, balance sheet
• 🔧 **Karagir management** - Nave/Jama tracking
• 📈 **Reports** - Generate MIS reports, day book

**Try asking me something!** Select a model from the dropdown and start chatting.

*Note: For specific data queries, I can fetch live data from your database.*`
      }
    ]);
  };

  const executeCommand = async (query) => {
    const q = query.toLowerCase();

    if (q.includes('gold rate') || q.includes('metal rate')) {
      const rates = await dbQuery('SELECT * FROM metal_rates ORDER BY rate_date DESC LIMIT 5');
      if (rates.length > 0) {
        const rateList = rates.map(r => `• ${r.metal_type} ${r.purity}: ₹${r.rate_per_gram}/g (${r.rate_date})`).join('\n');
        return `📈 **Today's Metal Rates:**\n\n${rateList}\n\n*Last updated: ${rates[0]?.rate_date || 'N/A'}*`;
      }
      return 'No metal rates found. Please set daily rates in Purchase > Metal Rates.';
    }

    if (q.includes('low stock') || q.includes('stock alert') || q.includes('reorder')) {
      const items = await dbQuery('SELECT * FROM items WHERE current_qty <= min_qty AND min_qty > 0 ORDER BY current_qty ASC');
      if (items.length > 0) {
        const list = items.map(i => `• **${i.name}** (${i.code}) - Current: ${formatWeight(i.current_qty)} | Min: ${formatWeight(i.min_qty)}`).join('\n');
        return `⚠️ **Low Stock Alerts - ${items.length} items:**\n\n${list}`;
      }
      return '✅ All stock levels are healthy. No low stock alerts.';
    }

    if (q.includes('trial balance')) {
      const ledgers = await dbQuery('SELECT * FROM ledgers');
      const entries = await dbQuery('SELECT te.*, l.name as ledger_name, l.group_name FROM transaction_entries te JOIN ledgers l ON te.ledger_id = l.id');
      const tb = ledgers.map(l => {
        const le = entries.filter(e => e.ledger_id === l.id);
        const d = le.reduce((s, e) => s + (e.debit || 0), 0) + (l.opening_balance > 0 ? l.opening_balance : 0);
        const c = le.reduce((s, e) => s + (e.credit || 0), 0) + (l.opening_balance < 0 ? Math.abs(l.opening_balance) : 0);
        return { name: l.name, group: l.group_name, balance: d - c, isDebit: (d - c) > 0 };
      });
      const totalDebit = tb.filter(l => l.balance > 0).reduce((s, l) => s + l.balance, 0);
      const totalCredit = tb.filter(l => l.balance < 0).reduce((s, l) => s + Math.abs(l.balance), 0);
      const top5 = tb.slice(0, 5).map(l => `• **${l.name}**: ${formatCurrency(Math.abs(l.balance))} (${l.isDebit ? 'Dr' : 'Cr'})`).join('\n');
      return `📊 **Trial Balance Summary:**\n\n${top5}\n... and ${tb.length - 5} more accounts\n\n**Total Debit:** ${formatCurrency(totalDebit)}\n**Total Credit:** ${formatCurrency(totalCredit)}\n\n*Balanced: ${Math.abs(totalDebit - totalCredit) < 0.01 ? '✅ Yes' : '❌ No - Difference: ' + formatCurrency(totalDebit - totalCredit)}*`;
    }

    if (q.includes('top selling') || q.includes('best seller') || q.includes('popular')) {
      const items = await dbQuery(`
        SELECT i.name, i.code, SUM(sii.amount) as total, SUM(sii.weight) as wt, COUNT(*) as cnt
        FROM sale_invoice_items sii JOIN items i ON sii.item_id = i.id
        JOIN transactions t ON sii.transaction_id = t.id
        WHERE t.voucher_type IN ('Sale_Retail','Sale_Wholesale')
        GROUP BY sii.item_id ORDER BY total DESC LIMIT 5
      `);
      if (items.length > 0) {
        const list = items.map((i, idx) => `#${idx + 1} **${i.name}** - ${formatCurrency(i.total)} (${i.cnt} sales)`).join('\n');
        return `🏆 **Top Selling Items:**\n\n${list}`;
      }
      return 'No sales data available yet.';
    }

    if (q.includes('pending') && (q.includes('order') || q.includes('karagir'))) {
      const karagir = await dbQuery("SELECT COUNT(*) as cnt FROM karagir_transactions WHERE status='pending'");
      const orders = await dbQuery("SELECT COUNT(*) as cnt FROM transactions WHERE voucher_type='Order' AND status='pending'");
      return `📋 **Pending Items:**\n\n• Karagir pending: **${karagir[0]?.cnt || 0}**\n• Pending orders: **${orders[0]?.cnt || 0}**`;
    }

    if (q.includes('customer') && (q.includes('pending') || q.includes('due') || q.includes('balance'))) {
      const parties = await dbQuery(`
        SELECT p.name, p.phone,
          (SELECT COALESCE(SUM(total_amount),0) FROM transactions WHERE party_id = p.id AND voucher_type IN ('Sale_Retail','Sale_Wholesale')) as sales,
          (SELECT COALESCE(SUM(total_amount),0) FROM transactions WHERE party_id = p.id AND voucher_type IN ('Payment','Receipt')) as payments
        FROM parties p WHERE p.type IN ('Customer','Both')
        ORDER BY p.name LIMIT 10
      `);
      const list = parties.map(p => {
        const bal = (p.sales || 0) - (p.payments || 0);
        return `• **${p.name}**: ${formatCurrency(bal)} ${bal > 0 ? '🔴 Due' : '✅ Clear'}`;
      }).join('\n');
      return `👥 **Customer Balances:**\n\n${list}`;
    }

    if (q.includes('profit') || q.includes('pl') || q.includes('p&l')) {
      const income = await dbQuery("SELECT COALESCE(SUM(total_amount),0) as total FROM transactions WHERE voucher_type IN ('Sale_Retail','Sale_Wholesale') AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')");
      const expenses = await dbQuery("SELECT COALESCE(SUM(total_amount),0) as total FROM transactions WHERE voucher_type='Purchase' AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')");
      const profit = (income[0]?.total || 0) - (expenses[0]?.total || 0);
      return `💰 **Monthly P&L Summary:**\n\n• Income (Sales): ${formatCurrency(income[0]?.total || 0)}\n• Expenses (Purchase): ${formatCurrency(expenses[0]?.total || 0)}\n• **Net ${profit >= 0 ? 'Profit' : 'Loss'}: ${formatCurrency(Math.abs(profit))}**`;
    }

    if (q.includes('stock value') || q.includes('inventory value')) {
      const items = await dbQuery('SELECT SUM(weight * selling_price) as total_val, SUM(weight) as total_wt FROM items WHERE status="active"');
      return `💎 **Stock Valuation:**\n\n• Total Stock Value: ${formatCurrency(items[0]?.total_val || 0)}\n• Total Gold Weight: ${formatWeight(items[0]?.total_wt || 0)}`;
    }

    if (q.includes('today sale') || q.includes('today')) {
      const today = await dbQuery("SELECT COALESCE(SUM(total_amount),0) as total, COUNT(*) as cnt FROM transactions WHERE voucher_type IN ('Sale_Retail','Sale_Wholesale') AND date = date('now')");
      return `📅 **Today's Summary:**\n\n• Sales: ${formatCurrency(today[0]?.total || 0)}\n• Invoices: ${today[0]?.cnt || 0}\n• Date: ${new Date().toLocaleDateString('en-IN')}`;
    }

    return null;
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const commandResult = await executeCommand(userMsg);

      if (commandResult) {
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'assistant', content: commandResult }]);
          setLoading(false);
        }, 500);
        return;
      }

      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const response = await window.electronAPI.ai.chat(userMsg, history, selectedModel);

      if (response.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.data.content,
          model: response.data.model
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ **Error:** ${response.error}\n\nPlease check your API key in Settings > AI Configuration.`,
          isSystem: true
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Error: ${err.message}. Please configure your Groq API key in Settings.`,
        isSystem: true
      }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="ai-container">
      <div className="ai-chat">
        <div className="ai-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`ai-message ${msg.role}`}>
              {msg.content.split('\n').map((line, i) => (
                <div key={i}>
                  {line.startsWith('•') ? (
                    <span style={{ display: 'block', paddingLeft: 8 }}>{line}</span>
                  ) : line.startsWith('#') ? (
                    <strong>{line.replace(/^#+\s*/, '')}</strong>
                  ) : (
                    line
                  )}
                </div>
              ))}
              {msg.model && (
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 8 }}>
                  via {msg.model}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="ai-message assistant">
              <div style={{ display: 'flex', gap: 4 }}>
                <span style={{ animation: 'pulse 1s infinite' }}>●</span>
                <span style={{ animation: 'pulse 1s infinite', animationDelay: '0.2s' }}>●</span>
                <span style={{ animation: 'pulse 1s infinite', animationDelay: '0.4s' }}>●</span>
              </div>
              <style>{`@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }`}</style>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="ai-input-area">
          <select
            className="form-input"
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            style={{ width: 200 }}
            title="AI Model"
          >
            {AVAILABLE_MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <textarea
            className="ai-input"
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your jewellery business..."
            disabled={loading}
          />
          <button className="btn btn-primary" onClick={handleSend} disabled={loading || !input.trim()}>
            Send
          </button>
        </div>
      </div>

      <div className="ai-sidebar">
        <h4 style={{ marginBottom: 12, fontSize: 13, color: '#94a3b8' }}>💡 Suggestions</h4>
        {SUGGESTIONS.map((s, i) => (
          <div
            key={i}
            className="ai-suggestion"
            onClick={() => {
              setInput(s);
            }}
          >
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}
