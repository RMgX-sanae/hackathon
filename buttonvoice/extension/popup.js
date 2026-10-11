import './pages.css';

const button = document.getElementById('inspect');
const status = document.getElementById('status');
let target;
try {
  [target] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = new URL(target?.url || 'about:blank');
  document.getElementById('target').textContent = target?.title || url.hostname;
  if (['http:', 'https:', 'file:'].includes(url.protocol)) {
    button.disabled = false;
    if (url.protocol === 'file:') status.textContent = '本地文件需要在扩展详情中允许“访问文件网址”。';
  } else {
    status.textContent = '浏览器设置页和扩展页面不能直接检查。请打开普通网页，或先体验演示页。';
  }
} catch {
  status.textContent = '无法读取当前页。请切回要检查的网站，再点击扩展图标。';
}
button.addEventListener('click', async () => {
  button.disabled = true;
  button.textContent = '正在打开检查面板…';
  try {
    await chrome.scripting.executeScript({ target: { tabId: target.id }, files: ['content.js'] });
    window.close();
  } catch {
    status.textContent = '此页面不允许扩展访问，或刚刚发生了跳转。请打开普通网页后重试；本地 HTML 请先允许“访问文件网址”。';
    button.disabled = false;
    button.textContent = '重新尝试';
  }
});
