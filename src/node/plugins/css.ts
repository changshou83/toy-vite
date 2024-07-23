import { readFile } from "fs-extra";
import { Plugin } from "../plugin";

export function cssPlugin(): Plugin {
  return {
    name: "t-vite:css",
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
const css = \`${code.replace(/\n/g, "")}\`;
const style = document.createElement("style");
style.setAttribute("type", "text/css");
style.innerHTML = css;
document.head.appendChild(style);
export default css;`.trim();
        return {
          code: jsContent,
        };
      }
      return null;
    },
  };
}
