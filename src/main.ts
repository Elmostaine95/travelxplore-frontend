import { createApp } from "vue";
import { createPinia } from "pinia";
import { MotionPlugin } from "@vueuse/motion";
import App from "./App.vue";
import router from "./router";
import { i18n } from "./i18n";
import { useLocaleStore } from "./stores/locale";
import "./styles/index.css";

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(i18n);
app.use(router);
app.use(MotionPlugin);
useLocaleStore().init();
app.mount("#app");
