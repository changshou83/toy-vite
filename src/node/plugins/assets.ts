import { Plugin } from "../plugin";
import { ServerContext } from "../server";
import {
  cleanUrl,
  getShortName,
  normalizePath,
  removeImportQuery,
} from "../utils";

export function assetsPlugin(): Plugin {
  let serverContext: ServerContext;
  return {
    name: "t-vite:assets",
    configureServer(s) {
      serverContext = s;
    },
    async load(id) {
      // remove ?import
      const cleanedId = removeImportQuery(cleanUrl(id));
      // 解析静态资源路径
      const resolvedId = `/${getShortName(
        normalizePath(id),
        normalizePath(serverContext.root)
      )}`;
      // 处理 SVG
      if (cleanedId.endsWith(".svg")) {
        return {
          code: `export default "${resolvedId}"`,
        };
      }
    },
  };
}
