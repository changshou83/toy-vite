import createDebug from "debug";
import { ServerContext } from "..";
import {
  cleanUrl,
  isCSSRequest,
  isImportRequest,
  isJSRequest,
} from "../../utils";
import { NextHandleFunction } from "connect";

const debug = createDebug("dev");

export async function transformRequest(
  url: string,
  serverContext: ServerContext
) {
  const { pluginContainer, moduleGraph } = serverContext;
  url = cleanUrl(url);
  // 返回缓存
  let mod = await moduleGraph.ensureEntryFromUrl(url);
  if (mod && mod.transformResult) {
    return mod.transformResult;
  }
  // 依次调用 resolveId，load和transform钩子
  const resolveResult = await pluginContainer.resolveId(url);
  let transformResult;
  if (resolveResult?.id) {
    let code = await pluginContainer.load(resolveResult.id);
    if (typeof code === "object" && code !== null) {
      code = code.code;
    }
    // 在模块依赖图注册模块
    mod = await moduleGraph.ensureEntryFromUrl(url);
    if (code) {
      transformResult = await pluginContainer.transform(
        code as string,
        resolveResult?.id
      );
    }
  }
  // 缓存模块编译后产物
  if (mod) {
    mod.transformResult = transformResult;
  }
  return transformResult;
}

export function transformMiddleware(
  serverContext: ServerContext
): NextHandleFunction {
  return async (req, res, next) => {
    if (req.method !== "GET" || !req.url) {
      return next();
    }
    const url = req.url;
    debug("transformMiddleware: %s", url);
    if (isJSRequest(url) || isCSSRequest(url) || isImportRequest(url)) {
      let result = await transformRequest(url, serverContext);
      if (!result) {
        return next();
      }
      if (result && typeof result !== "string") {
        // @ts-ignore
        result = result.code;
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/javascript");
      return res.end(result);
    }
    next();
  };
}
