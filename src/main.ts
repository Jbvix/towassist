import './style.css';
import { App } from '@/app/App.ts';

// Ponto de entrada do TowAssist.
const root = document.querySelector<HTMLDivElement>('#app');
if (!root) {
  throw new Error('Elemento #app não encontrado.');
}

const app = new App(root);
void app.start();
