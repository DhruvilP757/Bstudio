import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './assets/styles/main.css';
import './assets/styles/xterm.css';

import { setupMonacoEnvironment } from './utils/monaco-env';

setupMonacoEnvironment();

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.mount('#app');
