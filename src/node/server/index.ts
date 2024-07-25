import connect from "connect";
import { green, blue } from "picocolors";
import { optimize } from "../optimizer";
import { createPluginContainer, PluginContainer } from "../pluginContainer";
import { Plugin } from "../plugin";
import { resolvePlugins } from "../plugins";
import { indexHtmlMiddleware } from "./middlewares/indexHtml";
import { transformMiddleware } from "./middlewares/transform";
import { staticMiddleware } from "./middlewares/static";
import chokidar, { FSWatcher } from "chokidar";
import { createWSServer } from "../ws";
import { ModuleGraph } from "../ModuleGraph";
import { normalizePath } from "../utils";
import { bindingHMREvents } from "../hmr";

export interface ServerContext {
  root: string;
  pluginContainer: PluginContainer;
  app: connect.Server;
  plugins: Plugin[];
  moduleGraph: ModuleGraph;
  ws: { send: (data: any) => void; close: () => void };
  watcher: FSWatcher;
}

export async function startDevServer() {
  const app = connect();
  const root = process.cwd();
  const startTime = Date.now();
  // 解析插件
  const plugins = resolvePlugins();
  // 创建 插件容器 模拟 rollup 插件机制
  const pluginContainer = createPluginContainer(plugins);
  // HMR
  const moduleGraph = new ModuleGraph((url) => pluginContainer.resolveId(url));
  const watcher = chokidar.watch(root, {
    ignored: ["**/node_modules/**", "**/.git/**"],
    ignoreInitial: true,
  });
  const ws = createWSServer(app);
  // 服务器上下文
  const serverContext: ServerContext = {
    root: normalizePath(process.cwd()),
    app,
    pluginContainer,
    plugins,
    moduleGraph,
    ws,
    watcher,
  };
  bindingHMREvents(serverContext);
  // 调用 configureServer hook
  for (const plugin of plugins) {
    if (plugin.configureServer) {
      await plugin.configureServer(serverContext);
    }
  }
  // 使用中间件
  app.use(indexHtmlMiddleware(serverContext));
  app.use(transformMiddleware(serverContext));
  app.use(staticMiddleware(serverContext.root));
  app.listen(3000, async () => {
    // 依赖预构建
    await optimize(root);
    console.log(
      green("🚀 No-Bundle 服务已经成功启动!"),
      `耗时: ${Date.now() - startTime}ms`
    );
    console.log(`> 本地访问路径: ${blue("http://localhost:3000")}`);
  });
}
