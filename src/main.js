import './index.css';
import { createChatApp } from './app.js';

const rootEl = document.getElementById('app');

function renderErrorBoundary(message) {
  if (!rootEl) return;
  let friendly = 'An unexpected error occurred while syncing with Firebase.';
  try {
    const parsed = JSON.parse(message);
    if (parsed?.error) {
      friendly = parsed.error;
    }
  } catch {
    if (typeof message === 'string' && message.trim()) {
      friendly = message;
    }
  }

  rootEl.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'min-h-[100dvh] w-full flex items-center justify-center p-4 bg-[#eae6df] dark:bg-[#0b141a]';

  const card = document.createElement('div');
  card.className = 'max-w-md w-full bg-white dark:bg-[#202c33] rounded-2xl p-6 shadow-xl border border-black/10 dark:border-white/10 text-center space-y-4';

  const title = document.createElement('h2');
  title.className = 'text-lg font-semibold text-[#111b21] dark:text-[#e9edef]';
  title.textContent = 'Connection or permission issue';

  const desc = document.createElement('p');
  desc.className = 'text-xs text-[#667781] dark:text-[#8696a0] break-words leading-relaxed';
  desc.textContent = friendly;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'px-5 py-2.5 rounded-xl bg-[#008069] hover:bg-[#017561] text-white text-sm font-semibold cursor-pointer';
  btn.textContent = 'Reload app';
  btn.addEventListener('click', () => window.location.reload());

  card.appendChild(title);
  card.appendChild(desc);
  card.appendChild(btn);
  wrapper.appendChild(card);
  rootEl.appendChild(wrapper);
}

window.addEventListener('error', (event) => {
  if (event?.message?.includes('Quota exceeded')) {
    renderErrorBoundary('Daily Firestore free-tier quota exceeded. Quota resets tomorrow.');
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const msg = event?.reason?.message || String(event?.reason || '');
  if (msg.includes('Missing or insufficient permissions') || msg.includes('operationType')) {
    renderErrorBoundary(msg);
  }
});

if (rootEl) {
  createChatApp(rootEl);
}
