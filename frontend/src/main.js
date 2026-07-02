import { createApp } from "vue";
import { createPinia } from "pinia";
import { gsap } from "gsap";
import { motionTokens, syncMotionHtmlClass, resetMotionRevealState, dispatchRouteEnterComplete } from "./design/motionTokens";
import { installGlobalMicroMotion } from "./lib/installGlobalMicroMotion";
import { BRAND_ASSETS } from "./constants/brandAssets";
import { ensurePlusJakartaSans } from "./utils/brandFonts";
import App from "./App.vue";
import router from "./router";
import "./style.css";

const faviconLink = document.querySelector('link[rel="icon"]');
if (faviconLink) {
  faviconLink.href = BRAND_ASSETS.favicon;
}

gsap.defaults({
  duration: motionTokens.duration.fast,
  ease: motionTokens.ease.standardOut,
});

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
syncMotionHtmlClass();
ensurePlusJakartaSans();
app.mount("#app");
installGlobalMicroMotion();
window.addEventListener("siec:motion-preference", () => {
  syncMotionHtmlClass();
  resetMotionRevealState();
});
