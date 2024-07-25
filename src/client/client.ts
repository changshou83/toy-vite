console.log("[vite] connecting...");

// 1. 创建客户端 WebSocket 实例
// 其中的 __HMR_PORT__ 之后会被 no-bundle 服务编译成具体的端口号
const socket = new WebSocket(`ws://localhost:__HMR_PORT__`, "vite-hmr");

// 2. 接收服务端的更新信息
socket.addEventListener("message", async ({ data }) => {
  handleMessage(JSON.parse(data)).catch(console.error);
});

interface Update {
  type: "js-update" | "css-update";
  path: string;
  acceptedPath: string;
  timestamp: number;
}

// 3. 根据不同的更新类型进行更新
async function handleMessage(payload: any) {
  switch (payload.type) {
    case "connected":
      console.log(`[vite] connected.`);
      // 心跳检测
      setInterval(() => socket.send("ping"), 1000);
      break;

    case "update":
      // 进行具体的模块更新
      payload.updates.forEach((update: Update) => {
        if (update.type === "js-update") {
          // 获取最新的模块
          fetchUpdate(update);
        }
      });
      break;
  }
}

interface HotModule {
  id: string;
  callbacks: HotCallback[];
}

interface HotCallback {
  deps: string[];
  fn: (modules: object[]) => void;
}
// HMR 模块表
const hotModulesMap = new Map<string, HotModule>();
// 不在生效的模块表
const pruneMap = new Map<string, (data: any) => void | Promise<void>>();

// 为每个模块注入 HMR Context
export const createHotContext = (ownerPath: string) => {
  const mod = hotModulesMap.get(ownerPath);
  if (mod) {
    mod.callbacks = [];
  }

  function acceptDeps(deps: string[], callback: any) {
    const mod: HotModule = hotModulesMap.get(ownerPath) || {
      id: ownerPath,
      callbacks: [],
    };
    // callbacks 存放 accept 的依赖及依赖改动后对应的回调逻辑
    mod.callbacks.push({
      deps,
      fn: callback,
    });
    // 注册为热更新模块
    hotModulesMap.set(ownerPath, mod);
  }

  return {
    accept(deps: any, callback?: any) {
      // 仅考虑自身模块更新
      if (typeof deps === "function" || !deps) {
        acceptDeps([ownerPath], ([mod]: string[]) => deps && deps(mod));
      }
    },
    prune(cb: (data: any) => void) {
      pruneMap.set(ownerPath, cb);
    },
  };
};

async function fetchUpdate({ path, timestamp }: Update) {
  // 获取变更模块的热更新上下文
  const mod = hotModulesMap.get(path);
  if (!mod) return;
  // 保存更新后的模块
  const moduleMap = new Map();
  // 保存需要更新的模块的路径
  const modulesToUpdate = new Set<string>();
  modulesToUpdate.add(path);

  await Promise.all([
    Array.from(modulesToUpdate).map(async (dep) => {
      const [path, query] = dep.split("?");
      try {
        // dynamic import get latest module
        const newMod = await import(
          path + `?t=${timestamp}${query ? `&${query}` : ""}`
        );
        moduleMap.set(dep, newMod);
      } catch (e) {}
    }),
  ]);

  return () => {
    for (const { deps, fn } of mod.callbacks) {
      // 将更新后的依赖模块传给回调函数
      fn(deps.map((dep: any) => moduleMap.get(dep)));
    }
    console.log(`[vite] hot update: ${path}`);
  };
}
