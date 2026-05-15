import { createApp } from "vue";
import { createPinia } from "pinia";
import { gsap } from "gsap";
import { motionTokens, syncMotionHtmlClass } from "./design/motionTokens";
import { installGlobalMicroMotion } from "./lib/installGlobalMicroMotion";
import App from "./App.vue";
import router from "./router";
import "./style.css";

gsap.defaults({
  duration: motionTokens.duration.fast,
  ease: motionTokens.ease.standardOut,
});

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
syncMotionHtmlClass();
app.mount("#app");
installGlobalMicroMotion();
window.addEventListener("siec:motion-preference", syncMotionHtmlClass);
