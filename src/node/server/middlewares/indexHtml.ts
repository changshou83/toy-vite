import { NextHandleFunction } from "connect";
import path from "path";
import { pathExists, readFile } from "fs-extra";
import { ServerContext } from "..";

export function indexHtmlMiddleware(
  serverContext: ServerContext
): NextHandleFunction {
  return async (req, res, next) => {
    if (req.url === "/") {
      const { root } = serverContext;
      const indexHtmlPath = path.join(root, "index.html");
      if (await pathExists(indexHtmlPath)) {
        // 读取 index.html 文件内容
        const rawHtml = await readFile(indexHtmlPath, "utf8");
        let html = rawHtml;
        // 调用 transformIndexHtml hook
        for (const plugin of serverContext.plugins) {
          if (plugin.transformIndexHtml) {
            html = await plugin.transformIndexHtml(html);
          }
        }
        // 将文件内容返回给客户端
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html");
        return res.end(html);
      }
    }
    return next();
  };
}
