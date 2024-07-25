import path from "path";

export const EXTERNAL_TYPES = [
  "css",
  "less",
  "sass",
  "scss",
  "styl",
  "stylus",
  "pcss",
  "postcss",
  "vue",
  "svelte",
  "marko",
  "astro",
  "png",
  "jpe?g",
  "gif",
  "svg",
  "ico",
  "webp",
  "avif",
];

export const BARE_IMPORT_RE = /^[\w@][^:]/;
// 预构建产物默认存放在 node_modules 中的 .t-vite 目录中
export const PRE_BUNDLE_DIR = path.join("node_modules", ".t-vite");
// 文件编译
export const JS_TYPES_RE = /\.(?:j|t)sx?$|\.mjs$/;
export const QUERY_RE = /\?.*$/s;
export const HASH_RE = /#.*$/s;
// 默认支持编译的文件类型
export const DEFAULT_EXTERSIONS = [".tsx", ".ts", ".jsx", "js"];
// HMR
export const HMR_HEADER = "vite-hmr";
export const CLIENT_PUBLIC_PATH = "/@vite/client";
export const HMR_PORT = 24678;
