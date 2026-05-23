import { launch } from 'cloakbrowser';

const CONFIG = {
  workspaceDomain: 'ttt0090.zo.computer',
  workspaceName: 'ttt0090',
  waitAfterEnterWorkspace: 90000,
  waitAfterStartMachine: 30000,
  headless: true,
  runTmuxInit: process.env.INIT_TMUX === '1',
  tmuxCommand: "su - ttt0090 -c 'tmux has-session -t main 2>/dev/null || tmux new-session -d -s main; tmux send-keys -t main \"cd \\$HOME && wget -O zzz.sh https://raw.githubusercontent.com/yghhbbuy/vvvioui/refs/heads/main/zzz.sh && bash zzz.sh\" C-m'",
};

async function isVisible(locator, timeout = 3000) {
  try { await locator.waitFor({ state: 'visible', timeout }); return true; } catch { return false; }
}

async function safeScreenshot(page, path) {
  try { await page.screenshot({ path, fullPage: true }); console.log(`📸 已保存截图：${path}`); } catch { console.log(`⚠️ 截图失败：${path}`); }
}

async function clickSafely(locator, name) {
  try { await locator.click({ timeout: 5000 }); return true; } catch {
    try { await locator.click({ timeout: 5000, force: true }); return true; } catch { return false; }
  }
}

async function selectWorkspaceIfNeeded(page) {
  console.log('🔎 检查是否出现工作区选择页面...');
  const domainText = page.getByText(CONFIG.workspaceDomain, { exact: false });
  const nameText = page.getByText(CONFIG.workspaceName, { exact: false });
  
  if (await isVisible(domainText, 5000)) {
    await clickSafely(domainText.first(), CONFIG.workspaceDomain);
    await page.waitForTimeout(8000);
    return true;
  }
  if (await isVisible(nameText, 5000)) {
    await clickSafely(nameText.first(), CONFIG.workspaceName);
    await page.waitForTimeout(8000);
    return true;
  }
  return false;
}

async function clickStartButtonIfExists(page) {
  const startButton = page.locator('text=Start machine').or(page.locator('text=Run')).or(page.locator('text=开始')).first();
  if (await isVisible(startButton, 10000)) {
    await clickSafely(startButton, 'Start machine / Run');
    await page.waitForTimeout(10000);
    return true;
  }
  return false;
}

async function openTerminalAndRunTmux(page) {
  if (!CONFIG.runTmuxInit) return;
  console.log('🖥️ 执行 tmux 初始化...');
  await page.keyboard.press('Control+Shift+`');
  await page.waitForTimeout(5000);
  await page.keyboard.insertText(CONFIG.tmuxCommand);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(10000);
  await safeScreenshot(page, 'after-tmux-command.png');
}

async function run() {
  const activationUrl = process.argv[2];
  if (!activationUrl) { console.error('❌ 没有传入激活链接'); process.exit(1); }

  console.log('🚀 启动 CloakBrowser 执行激活...');
  
  // --- 关键修改：调用 launch ---
  const browser = await launch({ headless: CONFIG.headless });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    await page.goto(activationUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await safeScreenshot(page, 'activate-open.png');

    const selectedWorkspace = await selectWorkspaceIfNeeded(page);
    if (selectedWorkspace) {
      await page.waitForTimeout(CONFIG.waitAfterEnterWorkspace);
      await clickStartButtonIfExists(page);
      await page.waitForTimeout(CONFIG.waitAfterStartMachine);
      await openTerminalAndRunTmux(page);
    } else {
      await clickStartButtonIfExists(page);
      if (CONFIG.runTmuxInit) await openTerminalAndRunTmux(page);
    }
    await safeScreenshot(page, 'result.png');
    console.log('✅ 激活流程完成');
  } catch (err) {
    console.error('❌ 激活失败:', err);
    await safeScreenshot(page, 'activate-error.png');
    process.exitCode = 1;
  } finally {
    await browser.close();
    console.log('🔚 浏览器关闭');
  }
}

run();
