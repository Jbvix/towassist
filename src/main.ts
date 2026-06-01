import './style.css';
import { App } from '@/app/App.ts';

declare const __BUILD_ID__: string;

// Ponto de entrada do TowAssist.
const root = document.querySelector<HTMLDivElement>('#app');
if (!root) {
  throw new Error('Elemento #app não encontrado.');
}

const app = new App(root);
void app.start();

// Carimbo de versão visível (canto inferior esquerdo) — confirma qual build
// está realmente em execução no navegador.
const stamp = document.createElement('div');
stamp.className = 'build-stamp';
stamp.textContent = `build ${__BUILD_ID__}`;
document.body.appendChild(stamp);

// IMPORTANTE: durante a depuração, o Service Worker (PWA) estava servindo um
// bundle antigo do cache, impedindo que correções chegassem ao navegador.
// Aqui desregistramos qualquer SW existente e limpamos os caches do app.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => undefined);
}
if ('caches' in window) {
  caches
    .keys()
    .then((keys) => keys.filter((k) => k.startsWith('towassist')).forEach((k) => caches.delete(k)))
    .catch(() => undefined);
}
