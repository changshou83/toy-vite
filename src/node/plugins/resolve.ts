import path from "path";
import { Plugin } from "../plugin";
import { ServerContext } from "../server";
import { pathExists } from "fs-extra";
import { normalizePath } from "../utils";
import resolve from "resolve";
import { DEFAULT_EXTERSIONS } from "../constants";

// 路径解析插件，将文件路径解析为可用绝对路径
export function resolvePlugin(): Plugin {
  let serverContext: ServerContext;
  return {
    name: "t-vite:resolve",
    configureServer(s) {
      // 保存服务器上下文
      serverContext = s;
    },
    async resolveId(id: string, importer?: string) {
      // 1. 绝对路径则返回有效绝对路径
      if (path.isAbsolute(id)) {
        // 如果存在直接返回
        if (await pathExists(id)) {
          return { id };
        }
        // 否则拼接完整路径再次执行
        id = path.join(serverContext.root, id);
        if (await pathExists(id)) {
          return { id };
        }
      }
      // 2. 相对路径则解析出(使用resolve模块)有效绝对路径并返回
      else if (id.startsWith(".")) {
        if (!importer) {
          throw new Error("`importer` should not be undefined");
        }
        const hasExtension = path.extname(id).length > 1;
        let resolveId: string;
        // 包含文件后缀
        if (hasExtension) {
          resolveId = normalizePath(
            resolve.sync(id, { basedir: path.dirname(importer) })
          );
          if (await pathExists(resolveId)) {
            return { id: resolveId };
          }
        }
        // 不包含文件后缀
        else {
          for (const extname of DEFAULT_EXTERSIONS) {
            try {
              const withExtension = `${id}${extname}`;
              resolveId = normalizePath(
                resolve.sync(withExtension, {
                  basedir: path.dirname(importer),
                })
              );
              if (await pathExists(resolveId)) {
                return { id: resolveId };
              }
            } catch (e) {
              continue;
            }
          }
        }
      }
      return null;
    },
  };
}
