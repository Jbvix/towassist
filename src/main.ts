import './style.css';
import { App } from '@/app/App.ts';

// Ponto de entrada do TowAssist.
const root = document.querySelector<HTMLDivElement>('#app');
if (!root) {
  throw new Error('Elemento #app não encontrado.');
}

const app = new App(root);
void app.start();

// PWA: registra o service worker (apenas em produção/HTTPS).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* sem PWA não é erro fatal */
    });
  });
}
