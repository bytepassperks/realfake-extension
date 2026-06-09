import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "RealFake — Realistic Fake Identities",
  version: "1.0.0",
  description:
    "One-click realistic (but fictional) names, addresses & phone numbers for every country. Private, local, and clearly fake.",
  icons: {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png",
  },
  action: {
    default_popup: "index.html",
    default_title: "RealFake",
    default_icon: {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
    },
  },
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/content.ts"],
      run_at: "document_idle",
    },
  ],
  permissions: ["clipboardWrite", "storage", "activeTab", "scripting"],
  optional_host_permissions: ["https://nominatim.openstreetmap.org/*"],
});
