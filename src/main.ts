import './style.css';
import { App } from '@/app/App.ts';
import { Splash } from '@/ui/Splash.ts';

// Ponto de entrada do TowAssist.
const root = document.querySelector<HTMLDivElement>('#app');
if (!root) {
  throw new Error('Elemento #app não encontrado.');
}

// Splash de abertura (~30 s): apresenta o app e a barra de preparação.
// O app é inicializado por baixo, ficando pronto quando o splash termina.
const splash = new Splash();
document.body.appendChild(splash.el);

const app = new App(root);
void app.start();

splash.start(() => {
  /* app já iniciado; nada a fazer além de remover o splash (feito internamente) */
});

// O Service Worker da PWA causava confusão durante a depuração (servia bundle
// antigo do cache). Mantemos a auto-limpeza: desregistra qualquer SW e remove
// os caches do app, garantindo que o usuário sempre receba a versão atual.
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
