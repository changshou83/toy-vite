import path from "path";
import resolve from "resolve";
import { OnLoadResult, Plugin } from "esbuild";
import { init, parse } from "es-module-lexer";
import fs from "fs-extra";
import createDebug from "debug";
import { BARE_IMPORT_RE } from "../constants";
import { normalizePath } from "../utils";

const debug = createDebug("dev");

export function preBundlePlugin(deps: Set<string>): Plugin {
  return {
    name: "esbuild:pre-bundle",
    setup(build) {
      build.onResolve({ filter: BARE_IMPORT_RE }, (resolveInfo) => {
        const { path: id, importer } = resolveInfo;
        const isEntry = !importer;
        // 命中需要预构建的依赖
        if (deps.has(id)) {
          return isEntry
            ? {
                path: id,
                namespace: "dep",
              }
            : {
                path: resolve.sync(id, { basedir: process.cwd() }),
              };
        }
      });
      // 拿到标记后的依赖，构造代理模块，交给esbuild打包
      build.onLoad(
        {
          filter: /.*/,
          namespace: "dep",
        },
        async (loadInfo) => {
          await init;
          const id = loadInfo.path;
          const root = process.cwd();
          const entryPath = normalizePath(resolve.sync(id, { basedir: root }));
          const code = await fs.readFile(entryPath, "utf-8");
          const [imports, exports] = parse(code);
          let proxyModule = [];
          // cjs
          if (!imports.length && !exports.length) {
            // 通过require拿到到处对象
            const res = require(entryPath);
            // 拿到具名导出
            const specifiers = Object.keys(res);
            // 构造 export 语句
            proxyModule.push(
              `export { ${specifiers.join(",")} } from "${entryPath}"`,
              `export default require("${entryPath}")`
            );
          } else {
            const isDefaultExport =
              exports.findIndex(({ n }) => n === "default") !== -1;
            if (isDefaultExport) {
              proxyModule.push(`import d from "${entryPath}";export default d`);
            }
            proxyModule.push(`export * from "${entryPath}"`);
          }
          debug("代理模块内容：%o", proxyModule.join("\n"));
          const loader = path.extname(entryPath).slice(1);
          return {
            loader: loader,
            contents: proxyModule.join("\n"),
            resolveDir: root,
          } as OnLoadResult;
        }
      );
    },
  };
}
