import { readFile } from "fs-extra";
import { Plugin } from "../plugin";
import { CLIENT_PUBLIC_PATH } from "../constants";
import { getShortName, normalizePath } from "../utils";
import { ServerContext } from "../server";

export function cssPlugin(): Plugin {
  let severContext: ServerContext;
  return {
    name: "t-vite:css",
    configureServer(s) {
      severContext = s;
    },
    // 读取文件内容
    load(id) {
      if (id.endsWith("css")) {
        return readFile(id, "utf-8");
      }
    },
    // 将 css 代码包装成 JS 模块
    async transform(code, id) {
      if (id.endsWith("css")) {
        const jsContent = `
import { createHotContext as __vite__createHotContext } from "${CLIENT_PUBLIC_PATH}";
import.meta.hot = __vite__createHotContext("/${getShortName(
          normalizePath(id),
          normalizePath(severContext.root)
        )}");
import { updateStyle, removeStyle } from "${CLIENT_PUBLIC_PATH}";

const id = '${id}';
const css = \`${code.replace(/\n/g, "")}\`;

updateStyle(id, css);
import.meta.hot.accept();
export default css;
import.meta.hot.prune(() => removeStyle(id));`.trim();
        return {
          code: jsContent,
        };
      }
      return null;
    },
  };
}
