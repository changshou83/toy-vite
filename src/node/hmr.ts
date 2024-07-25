import { blue, green } from "picocolors";
import { ServerContext } from "./server";
import { getShortName } from "./utils";

export function bindingHMREvents(serverContext: ServerContext) {
  const { ws, watcher, root } = serverContext;
  watcher.on("change", async (file) => {
    console.log(`✨${blue("[hmr]")} ${green(file)} changed`);
    const { moduleGraph } = serverContext;
    // 清除模块依赖图中的缓存
    moduleGraph.invalidateModule(file);
    // 向客户端发送更新消息
    ws.send({
      type: "update",
      updates: [
        {
          type: "js-update",
          timestamp: Date.now(),
          path: "/" + getShortName(file, root),
          acceptedPath: "/" + getShortName(file, root),
        },
      ],
    });
  });
}
