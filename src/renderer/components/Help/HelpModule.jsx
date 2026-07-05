import React, { useState, useEffect } from 'react';

const helpTopics = {
  'getting-started': {
    title: 'Getting Started',
    content: `
      <h3>Welcome to Arynoxtech Jwellery ERP</h3>
      <p>Complete jewellery shop management software with dual-account system, AI assistant, and offline+online database.</p>
      
      <h4>Login Credentials</h4>
      <table class="help-table">
        <tr><th>Account</th><th>Username</th><th>Password</th><th>Use</th></tr>
        <tr><td>🤍 White</td><td>admin</td><td>admin@123</td><td>Legal/GST books — only white transactions visible</td></tr>
        <tr><td>🖤 Black</td><td>black</td><td>black@123</td><td>Actual business books — only black transactions visible</td></tr>
        <tr><td>⭐ Super Admin</td><td>superadmin</td><td>super@123</td><td>Full access — sees both white & black books</td></tr>
      </table>
      
      <h4>First Steps</h4>
      <ol>
        <li><strong>Setup Company:</strong> Go to Settings > General and enter your company details</li>
        <li><strong>Add Masters:</strong> Create Categories, Items, and Parties in the Masters section</li>
        <li><strong>Set Gold Rates:</strong> Update current gold/silver rates in Gold Rates section</li>
        <li><strong>Start Selling:</strong> Create your first sale in Sales / POS</li>
      </ol>
    `
  },
  'sales': {
    title: 'Sales Management',
    content: `
      <h3>Sales Management</h3>
      <p>Create and manage retail sales, wholesale invoices, estimates, orders, exchanges, and repairs.</p>
      
      <h4>Retail Sale</h4>
      <ul>
        <li>Click "+ New Sale" to create a new invoice</li>
        <li>Select customer (or leave blank for Walk-in)</li>
        <li>Add items with weight, purity, rate, making charges</li>
        <li>Enable GST toggle if customer has GSTIN</li>
        <li>Click "Save & Print" to save and print receipt</li>
      </ul>
      
      <h4>Wholesale</h4>
      <p>Similar to retail but with auto-numbering (WS prefix) and bulk pricing.</p>
      
      <h4>Editing & Cancelling</h4>
      <ul>
        <li>Click ✏️ to edit an existing invoice</li>
        <li>Click 🗑️ to cancel (soft delete — stock is restored, record kept)</li>
        <li>Cancelled invoices show with strikethrough</li>
      </ul>
    `
  },
  'purchase': {
    title: 'Purchase Management',
    content: `
      <h3>Purchase Management</h3>
      <p>Record purchases from suppliers with auto-numbering and stock updates.</p>
      <ul>
        <li>Create new purchase with supplier selection</li>
        <li>Add items with rates, making charges, and quantities</li>
        <li>Stock is automatically updated on save</li>
        <li>Edit or cancel purchases as needed</li>
      </ul>
    `
  },
  'stock': {
    title: 'Stock Management',
    content: `
      <h3>Stock & Inventory</h3>
      <ul>
        <li><strong>Inventory View:</strong> See all items with current quantities, filter by category/metal</li>
        <li><strong>Tray Transfer:</strong> Move items between trays/shelves</li>
        <li><strong>Valuation:</strong> View stock value by metal type and purity</li>
        <li><strong>Stock Register:</strong> Complete audit trail of all stock movements</li>
        <li>Low stock alerts appear on dashboard when qty < min_qty</li>
      </ul>
    `
  },
  'accounting': {
    title: 'Accounting',
    content: `
      <h3>Accounting Module</h3>
      <ul>
        <li><strong>Vouchers:</strong> Payment, Receipt, Journal, Bank entries</li>
        <li><strong>Ledgers:</strong> View all ledger accounts with balances</li>
        <li><strong>Trial Balance:</strong> Debit/credit summary of all ledgers</li>
        <li><strong>P&L:</strong> Profit & Loss statement for any period</li>
        <li><strong>Balance Sheet:</strong> Assets, Liabilities, and Capital</li>
        <li><strong>Cash Flow:</strong> Track cash inflows and outflows</li>
      </ul>
    `
  },
  'reports': {
    title: 'Reports',
    content: `
      <h3>Reports</h3>
      <ul>
        <li><strong>Day Book:</strong> All transactions for a given day</li>
        <li><strong>Sales Report:</strong> Sales summary with item breakup</li>
        <li><strong>Purchase Report:</strong> Purchase summary</li>
        <li><strong>Stock Report:</strong> Current inventory status</li>
        <li><strong>Party Report:</strong> Customer/supplier wise transactions</li>
        <li><strong>GST Report:</strong> GST-wise sales summary</li>
        <li><strong>MIS Report:</strong> Management information system</li>
        <li><strong>Festival Analysis:</strong> Compare sales during festival seasons</li>
      </ul>
    `
  },
  'settings': {
    title: 'Settings',
    content: `
      <h3>Settings</h3>
      <ul>
        <li><strong>General:</strong> Company name, GSTIN, phone, address</li>
        <li><strong>AI:</strong> Groq API key for AI Assistant</li>
        <li><strong>Database:</strong> Turso configuration for online sync</li>
        <li><strong>Email:</strong> SMTP settings for sending invoices</li>
        <li><strong>Passwords:</strong> Change account passwords</li>
        <li><strong>Backup:</strong> Create/restore database backups</li>
        <li><strong>License:</strong> Activate your software license</li>
      </ul>
    `
  },
  'shortcuts': {
    title: 'Keyboard Shortcuts',
    content: `
      <h3>Keyboard Shortcuts</h3>
      <table class="help-table">
        <tr><th>Shortcut</th><th>Action</th></tr>
        <tr><td>Ctrl+S</td><td>Save current form</td></tr>
        <tr><td>Ctrl+P</td><td>Print current document</td></tr>
        <tr><td>Ctrl+F</td><td>Search/find</td></tr>
        <tr><td>Ctrl+N</td><td>New record</td></tr>
        <tr><td>Escape</td><td>Close modal / cancel</td></tr>
        <tr><td>Tab</td><td>Next field</td></tr>
        <tr><td>Shift+Tab</td><td>Previous field</td></tr>
        <tr><td>F5</td><td>Refresh data</td></tr>
      </table>
    `
  },
  'sync': {
    title: 'Online Sync',
    content: `
      <h3>Online Database Sync</h3>
      <p>Sync your local data with Turso cloud database for backup and multi-device access.</p>
      <h4>Setup</h4>
      <ol>
        <li>Create a free Turso database at turso.tech</li>
        <li>Copy the database URL and auth token</li>
        <li>Go to Settings > Database and paste the credentials</li>
        <li>Sync runs automatically every 60 seconds</li>
      </ol>
      <h4>Conflict Resolution</h4>
      <p>When both local and remote data change, the system uses "last-write-wins" based on the updated_at timestamp. The latest change is kept.</p>
      <h4>Manual Sync</h4>
      <p>Go to the Sync page (sidebar) to view sync status, pending changes, and manually trigger a full sync.</p>
    `
  },
  'support': {
    title: 'Support',
    content: `
      <h3>Support & Contact</h3>
      <p>Need help? Contact us through any of these channels:</p>
      <ul>
        <li><strong>Email:</strong> support@arynoxtech.com</li>
        <li><strong>Phone:</strong> +91-XXXXXXXXXX</li>
        <li><strong>Website:</strong> www.arynoxtech.com</li>
      </ul>
      <h4>Version Info</h4>
      <p>You are running <strong>Arynoxtech Jwellery ERP v2.0.0</strong></p>
      <p>Built with Electron + React + SQLite</p>
    `
  }
};

export default function HelpModule() {
  const [topic, setTopic] = useState('getting-started');
  const [version, setVersion] = useState('2.0.0');

  const current = helpTopics[topic] || helpTopics['getting-started'];

  return (
    <div style={{ display: 'flex', gap: 24, height: 'calc(100vh - 120px)' }}>
      <div style={{ width: 220, flexShrink: 0 }}>
        <div className="card">
          <div className="card-header"><span>📖 Help Topics</span></div>
          <div style={{ padding: 8 }}>
            {Object.entries(helpTopics).map(([key, t]) => (
              <div
                key={key}
                onClick={() => setTopic(key)}
                style={{
                  padding: '10px 12px', cursor: 'pointer', borderRadius: 6, marginBottom: 2,
                  fontSize: 13, transition: 'all 0.2s',
                  background: topic === key ? '#1e293b' : 'transparent',
                  color: topic === key ? '#f59e0b' : '#94a3b8',
                  borderLeft: topic === key ? '3px solid #f59e0b' : '3px solid transparent'
                }}
              >
                {t.title}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div className="card">
          <div className="card-header">
            <span>{current.title}</span>
            <span style={{ fontSize: 11, color: '#64748b' }}>v{version}</span>
          </div>
          <div className="card-body help-content" dangerouslySetInnerHTML={{ __html: current.content }} />
        </div>
      </div>
      <style>{`
        .help-content h3 { color: #f59e0b; margin-bottom: 16px; font-size: 18px; }
        .help-content h4 { color: #e2e8f0; margin: 16px 0 8px; font-size: 14px; }
        .help-content p { color: #94a3b8; font-size: 13px; line-height: 1.6; margin-bottom: 12px; }
        .help-content ul, .help-content ol { color: #94a3b8; font-size: 13px; line-height: 1.8; padding-left: 20px; }
        .help-content li { margin-bottom: 4px; }
        .help-content .help-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
        .help-content .help-table th { background: #1e293b; padding: 8px 12px; text-align: left; border-bottom: 2px solid #334155; color: #f59e0b; }
        .help-content .help-table td { padding: 8px 12px; border-bottom: 1px solid #1e293b; color: #94a3b8; }
        .help-content strong { color: #e2e8f0; }
        .help-content code { background: #1e293b; padding: 2px 6px; border-radius: 4px; font-size: 12px; color: #22c55e; }
      `}</style>
    </div>
  );
}
