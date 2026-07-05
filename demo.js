const { app, BrowserWindow } = require('electron');

let demoWindow;

function createDemoWindow() {
  demoWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Arynoxtech Jwellery ERP - DEMO',
    icon: __dirname + '/assets/icon.png',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    frame: true,
    backgroundColor: '#0f172a'
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Arynoxtech Jwellery ERP - Demo</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #0f172a 0%, #1a1a2e 50%, #0f172a 100%); color: #e2e8f0; min-height: 100vh; }
  .header { background: linear-gradient(90deg, #1e293b, #0f172a); padding: 40px 20px; text-align: center; border-bottom: 1px solid #334155; }
  .logo { width: 80px; height: 80px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 36px; font-weight: bold; color: #0f172a; margin-bottom: 16px; }
  .title { font-size: 32px; font-weight: 700; color: #f59e0b; margin-bottom: 8px; }
  .subtitle { font-size: 14px; color: #94a3b8; max-width: 600px; margin: 0 auto; line-height: 1.6; }
  .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
  .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 40px; }
  .feature-card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 24px; transition: all 0.3s; }
  .feature-card:hover { border-color: #f59e0b; transform: translateY(-4px); box-shadow: 0 8px 30px rgba(245,158,11,0.1); }
  .feature-icon { font-size: 32px; margin-bottom: 12px; }
  .feature-title { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
  .feature-desc { font-size: 13px; color: #94a3b8; line-height: 1.5; }
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 40px 0; }
  .stat { text-align: center; padding: 20px; background: #1e293b; border-radius: 12px; border: 1px solid #334155; }
  .stat-value { font-size: 28px; font-weight: 700; color: #f59e0b; }
  .stat-label { font-size: 12px; color: #94a3b8; margin-top: 4px; }
  .cta { text-align: center; margin: 40px 0; }
  .btn { display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #0f172a; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; text-decoration: none; transition: all 0.3s; }
  .btn:hover { transform: scale(1.05); box-shadow: 0 4px 20px rgba(245,158,11,0.3); }
  .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; border-top: 1px solid #334155; }
  .tech-badge { display: inline-block; padding: 4px 12px; background: #334155; border-radius: 20px; font-size: 11px; color: #94a3b8; margin: 4px; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">A</div>
    <div class="title">Arynoxtech Jwellery ERP</div>
    <div class="subtitle">
      The best ever Software Product developed for Jewellery stores. 
      Complete ERP solution with AI Assistant, Dual Account System, and Cloud Sync.
    </div>
  </div>

  <div class="container">
    <div class="stats">
      <div class="stat"><div class="stat-value">50+</div><div class="stat-label">Features</div></div>
      <div class="stat"><div class="stat-value">2026</div><div class="stat-label">AI Models</div></div>
      <div class="stat"><div class="stat-value">Dual</div><div class="stat-label">Accounts</div></div>
    </div>

    <div class="features">
      <div class="feature-card">
        <div class="feature-icon">💎</div>
        <div class="feature-title">Stock Management</div>
        <div class="feature-desc">Manage gold by purity, weight, tray/shelf. Track loose and tagged items. Barcode integration.</div>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🛍️</div>
        <div class="feature-title">Sales (Retail/Wholesale)</div>
        <div class="feature-desc">Create estimates, manage orders, exchange old ornaments. Cash/card/UPI payment modes.</div>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🔧</div>
        <div class="feature-title">Karagir Nave/Jama</div>
        <div class="feature-desc">Track gold given to artisans, receive finished goods, manage wastage and making charges.</div>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📒</div>
        <div class="feature-title">Full Accounting</div>
        <div class="feature-desc">Vouchers, Journal, Bank entries. Trial Balance, P&L Account, Balance Sheet.</div>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🤖</div>
        <div class="feature-title">AI Assistant</div>
        <div class="feature-desc">Powered by Groq API with 2026 models (Llama 4, DeepSeek R1, Qwen 2.5). Get instant business insights.</div>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🗄️</div>
        <div class="feature-title">Dual Database</div>
        <div class="feature-desc">Offline SQLite for local use. Online sync with Turso.tech for cloud backup and multi-branch.</div>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🖤🤍</div>
        <div class="feature-title">Dual Account System</div>
        <div class="feature-desc">Separate White and Black accounts with independent passwords. Complete data segregation.</div>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📊</div>
        <div class="feature-title">MIS Reports</div>
        <div class="feature-desc">Day Book, Sales Reports, Stock Valuation, Party Ledgers, Karagir Reports, Graphical analysis.</div>
      </div>
      <div class="feature-card">
        <div class="feature-icon">💾</div>
        <div class="feature-title">Backup & Security</div>
        <div class="feature-desc">One-click backup/restore. Audit logs, user authentication, password management.</div>
      </div>
    </div>

    <div style="text-align: center; margin: 40px 0;">
      <p style="color: #94a3b8; margin-bottom: 16px;">Built with cutting-edge 2026 technology:</p>
      <div>
        <span class="tech-badge">Electron</span>
        <span class="tech-badge">React 18</span>
        <span class="tech-badge">SQLite</span>
        <span class="tech-badge">Turso.tech</span>
        <span class="tech-badge">Groq AI</span>
        <span class="tech-badge">Llama 4</span>
        <span class="tech-badge">Chart.js</span>
      </div>
    </div>

    <div class="cta">
      <p style="color: #94a3b8; margin-bottom: 16px;">Launch the full application to experience all features:</p>
      <button class="btn" onclick="window.close()">Close Demo</button>
      <p style="color: #64748b; margin-top: 12px; font-size: 12px;">Run 'npm start' to launch the full ERP application</p>
    </div>
  </div>

  <div class="footer">
    <p>&copy; 2026 Arynoxtech. All rights reserved. | The Best Jewellery ERP Software</p>
  </div>
</body>
</html>`;

  demoWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
}

app.whenReady().then(createDemoWindow);
