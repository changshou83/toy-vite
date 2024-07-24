import { dirname, resolve } from "path";
import { Bundle } from "./Bundle";
import { ModuleLoader } from "./ModuleLoader";
import { Module } from "./Module";
import { keys } from "./utils/object";
import { Statement } from "./Statement";

interface GraphOptions {
  entry: string;
  bundle: Bundle;
}

// 模块依赖图对象的实现
export class Graph {
  entryPath: string;
  basedir: string;
  statements: Statement[] = [];
  moduleLoader: ModuleLoader;
  modules: Module[] = [];
  moduleById: Record<string, Module> = {};
  resolveIds: Record<string, string> = {};
  orderedModules: Module[] = [];
  bundle: Bundle;

  constructor(options: GraphOptions) {
    const { entry, bundle } = options;
    this.entryPath = resolve(entry);
    this.basedir = dirname(this.entryPath);
    this.bundle = bundle;
    this.moduleLoader = new ModuleLoader(bundle);
  }

  async build() {
    // 1. 获取并解析模块信息
    const entryModule = await this.moduleLoader.fetchModule(
      this.entryPath,
      null,
      true
    );
    // 2. 构建依赖关系图
    this.modules.forEach((module) => module.bind());
    // 3. 模块拓扑排序
    this.orderedModules = this.sortModules(entryModule!);
    // 4. Tree Shaking, 标记需要包含的语句
    entryModule!.getExports().forEach((name) => {
      const declaration = entryModule!.traceExport(name);
      declaration!.use();
    });
    // 5. 处理命名冲突
    this.doConflict();
  }
  // 处理命名冲突
  doConflict() {
    const used: Record<string, true> = {};

    function getSafeName(name: string) {
      let safeName = name;
      let count = 1;
      while (used[safeName]) {
        safeName = `${name}$${count++}`;
      }
      used[safeName] = true;
      return safeName;
    }

    this.modules.forEach((module) => {
      keys(module.declarations).forEach((name) => {
        const declaration = module.declarations[name];
        declaration.name = getSafeName(declaration.name!);
      });
    });
  }

  getModuleById(id: string) {
    return this.moduleById[id];
  }
  // 添加模块节点到模块依赖图
  addModule(module: Module) {
    if (!this.moduleById[module.id]) {
      this.moduleById[module.id] = module;
      this.modules.push(module);
    }
  }

  // 后序遍历实现模块拓扑排序
  sortModules(entryModule: Module) {
    const orderedModules: Module[] = [];
    const analysedModule: Record<string, boolean> = {};
    // parent[b] = a,b依赖a
    const parent: Record<string, string> = {};
    const cyclePathList: string[][] = [];

    function getCyclePath(id: string, parentId: string): string[] {
      const paths = [id];
      let currentId = parentId;
      while (currentId !== id) {
        paths.push(currentId);
        // 向前回溯
        currentId = parent[currentId];
      }
      paths.push(paths[0]);
      return paths.reverse();
    }
    function analyseModule(module: Module) {
      if (analysedModule[module.id]) {
        return;
      }
      for (const dependency of module.dependencyModules) {
        // 检测到循环依赖
        if (parent[module.id]) {
          if (!analysedModule[dependency.id]) {
            cyclePathList.push(getCyclePath(dependency.id, module.id));
          }
          continue;
        }
        parent[dependency.id] = module.id;
        analyseModule(dependency);
      }
      analysedModule[module.id] = true;
      orderedModules.push(module);
    }

    analyseModule(entryModule);
    // 有循环依赖退出执行
    if (cyclePathList.length) {
      cyclePathList.forEach((paths) => {
        console.log(paths);
      });
      process.exit(1);
    }
    return orderedModules;
  }
}
