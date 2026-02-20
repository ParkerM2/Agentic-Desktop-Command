import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import WebSocket from 'ws';

const SCREENSHOTS_DIR = path.join('tests', 'e2e', 'screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

function getTarget() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const targets = JSON.parse(data);
        resolve(targets.find((t) => t.type === 'page'));
      });
    }).on('error', reject);
  });
}

function cdpCommand(ws, method, params = {}) {
  return new Promise((resolve) => {
    const id = Math.floor(Math.random() * 100000);
    const handler = (msg) => {
      const resp = JSON.parse(msg.toString());
      if (resp.id === id) {
        ws.removeListener('message', handler);
        resolve(resp.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function captureScreenshot(ws, name) {
  const result = await cdpCommand(ws, 'Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(result.data, 'base64');
  const outPath = path.join(SCREENSHOTS_DIR, name + '.png');
  fs.writeFileSync(outPath, buf);
  console.log('Saved:', name + '.png', '(' + buf.length + ' bytes)');
}

async function navigate(ws, url) {
  await cdpCommand(ws, 'Page.navigate', { url });
  await new Promise((r) => setTimeout(r, 3000));
}

async function clickByAriaLabel(ws, label) {
  const expr = `(function() {
    const els = document.querySelectorAll('button, [role="button"]');
    for (const el of els) {
      if (el.getAttribute('aria-label') === '${label}') {
        el.click();
        return 'clicked';
      }
    }
    return 'not found';
  })()`;
  const result = await cdpCommand(ws, 'Runtime.evaluate', {
    expression: expr,
    returnByValue: true,
  });
  console.log('  click', label, '->', result?.result?.value);
  await new Promise((r) => setTimeout(r, 2000));
}

async function clickByText(ws, text) {
  const expr = `(function() {
    const els = document.querySelectorAll('button, a, [role="button"], [role="tab"]');
    for (const el of els) {
      if (el.textContent.trim() === '${text}' || el.textContent.includes('${text}')) {
        el.click();
        return 'clicked: ' + el.tagName;
      }
    }
    return 'not found';
  })()`;
  const result = await cdpCommand(ws, 'Runtime.evaluate', {
    expression: expr,
    returnByValue: true,
  });
  console.log('  click', text, '->', result?.result?.value);
  await new Promise((r) => setTimeout(r, 2000));
}

async function main() {
  const target = await getTarget();
  console.log('Connected to:', target.url);
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.on('open', r));

  // 1. Dashboard with sidebar expanded
  console.log('\n--- Dashboard (expanded sidebar) ---');
  await navigate(ws, 'http://localhost:5173/#/dashboard');
  await captureScreenshot(ws, 'after-dashboard-expanded');

  // 2. Collapse sidebar
  console.log('\n--- Sidebar collapsed ---');
  await clickByAriaLabel(ws, 'Collapse sidebar');
  await captureScreenshot(ws, 'after-sidebar-collapsed');

  // 3. Expand sidebar
  console.log('\n--- Sidebar expanded ---');
  await clickByAriaLabel(ws, 'Expand sidebar');
  await captureScreenshot(ws, 'after-sidebar-expanded');

  // 4. Tasks / AG-Grid
  console.log('\n--- AG-Grid tasks page ---');
  await clickByText(ws, 'syrnia-helpsite');
  await new Promise((r) => setTimeout(r, 2000));
  await captureScreenshot(ws, 'after-ag-grid-tasks');

  // 5. Settings
  console.log('\n--- Settings page ---');
  await navigate(ws, 'http://localhost:5173/#/settings');
  await captureScreenshot(ws, 'after-settings');

  ws.close();
  console.log('\nAll screenshots captured!');

  // List files
  const files = fs.readdirSync(SCREENSHOTS_DIR).filter((f) => f.endsWith('.png'));
  console.log('Files in', SCREENSHOTS_DIR + ':', files.join(', '));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
