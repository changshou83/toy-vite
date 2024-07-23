import { init, parse } from "es-module-lexer";
import MagicString from "magic-string";
import path from "path";
import { Plugin } from "../plugin";
import { cleanUrl, getShortName, isJSRequest, normalizePath } from "../utils";
import { ServerContext } from "../server";
import { BARE_IMPORT_RE, PRE_BUNDLE_DIR } from "../constants";
import { PluginContext } from "rollup";

// 重写依赖路径
export function importAnalysisPlugin(): Plugin {
  let serverContext: ServerContext;
  return {
    name: "t-vite:import-analysis",
    configureServer(s) {
      serverContext = s;
    },
    async transform(this: PluginContext, code: string, id: string) {
      if (!isJSRequest(id)) {
        return null;
      }
      // 解析 import 语句
      await init;
      const [imports] = parse(code);
      const s = new MagicString(code);
      const resolve = async (id: string, importer?: string) => {
        const resolved = await serverContext.pluginContainer.resolveId(
          id,
          normalizePath(importer!)
        );
        if (!resolved) {
          return;
        }
        let resolvedId = `/${getShortName(
          resolved.id,
          normalizePath(serverContext.root)
        )}`;
        return resolvedId;
      };
      // 对于每个 import 语句依次分析
      for (const importInfo of imports) {
        const { s: modStart, e: modEnd, n: modSource } = importInfo;
        if (!modSource) continue;
        // 静态资源
        if (modSource.endsWith(".svg")) {
          // 带上 ?import 标签
          const resolvedUrl = await resolve(modSource, id);
          console.log({ resolvedUrl });
          s.overwrite(modStart, modEnd, `${resolvedUrl}?import`);
          continue;
        }
        // 第三方库：重写到预构建目录中
        if (BARE_IMPORT_RE.test(modSource)) {
          const bundlePath = normalizePath(
            path.join("/", PRE_BUNDLE_DIR, `${modSource}.js`)
          );
          s.overwrite(modStart, modEnd, bundlePath);
        }
        // 相对路径：调用插件上下文的resolve方法，自动经过路径解析插件的处理
        // else if (modSource.startsWith(".") || modSource.startsWith("/")) {
        //   const resolved = await this.resolve(modSource, id);
        //   if (resolved) {
        //     s.overwrite(modStart, modEnd, resolved.id);
        //   }
        // }
      }
      return {
        code: s.toString(),
        map: s.generateMap(),
      };
    },
  };
}
