import { init, parse } from "es-module-lexer";
import MagicString from "magic-string";
import path from "path";
import { Plugin } from "../plugin";
import {
  cleanUrl,
  getShortName,
  isInternalRequest,
  isJSRequest,
  normalizePath,
} from "../utils";
import { ServerContext } from "../server";
import {
  BARE_IMPORT_RE,
  CLIENT_PUBLIC_PATH,
  PRE_BUNDLE_DIR,
} from "../constants";
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
      if (!isJSRequest(id) || isInternalRequest(id)) {
        return null;
      }
      // 解析 import 语句
      await init;
      // 更新模块之间的依赖关系
      const { moduleGraph } = serverContext;
      const curMod = moduleGraph.getModuleById(id)!;
      const importedModules = new Set<string>();
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
        const cleanId = cleanUrl(resolved.id);
        const mod = moduleGraph.getModuleById(cleanId);
        let resolvedId = `/${getShortName(
          resolved.id,
          normalizePath(serverContext.root)
        )}`;
        if (mod && mod.lastHMRTimestamp > 0) {
          resolvedId += "?t=" + mod.lastHMRTimestamp;
        }
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
          s.overwrite(modStart, modEnd, `${resolvedUrl}?import`);
          continue;
        }
        // 第三方库：重写到预构建目录中
        if (BARE_IMPORT_RE.test(modSource)) {
          const bundlePath = normalizePath(
            path.join("/", PRE_BUNDLE_DIR, `${modSource}.js`)
          );
          s.overwrite(modStart, modEnd, bundlePath);
          importedModules.add(bundlePath);
        }
        // 相对路径：调用插件上下文的resolve方法，自动经过路径解析插件的处理
        else if (modSource.startsWith(".") || modSource.startsWith("/")) {
          const resolvedId = await resolve(modSource, id);
          if (resolvedId) {
            s.overwrite(modStart, modEnd, resolvedId);
            importedModules.add(resolvedId);
          }
        }
      }
      // 只对业务源码注入
      if (!id.includes("node_modules")) {
        // 注入 HMR 相关的工具函数,实现 import.meta.hot
        s.prepend(
          `import { createHotContext as __vite__createHotContext } from "${CLIENT_PUBLIC_PATH}";` +
            `import.meta.hot = __vite__createHotContext(${JSON.stringify(
              cleanUrl(curMod.url)
            )});`
        );
      }

      moduleGraph.updateModuleInfo(curMod, importedModules);

      return {
        code: s.toString(),
        map: s.generateMap(),
      };
    },
  };
}
