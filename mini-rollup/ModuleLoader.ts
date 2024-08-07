import { readFile } from "fs-extra";
import { Bundle } from "./Bundle";
import { Module } from "./Module";
import { defaultResolver } from "./utils/resolve";

export class ModuleLoader {
  bundle: Bundle;
  resolveIdsMap: Map<string, string | false> = new Map();
  constructor(bundle: Bundle) {
    this.bundle = bundle;
  }

  // 解析模块逻辑
  resolveId(id: string, importer: string | null) {
    const cacheKey = id + importer;
    if (this.resolveIdsMap.has(cacheKey)) {
      return this.resolveIdsMap.get(cacheKey)!;
    }
    const resolved = defaultResolver(id, importer);
    this.resolveIdsMap.set(cacheKey, resolved);
    return resolved;
  }

  // 加载模块内容并解析
  async fetchModule(
    id: string,
    importer: null | string,
    isEntry = false,
    bundle: Bundle = this.bundle,
    loader: ModuleLoader = this
  ): Promise<Module | null> {
    const path = this.resolveId(id, importer);
    if (!path) {
      // external module
      return null;
    }
    // 查找缓存
    const existModule = this.bundle.getModuleById(path);
    if (existModule) {
      return existModule;
    }
    const code = await readFile(path, { encoding: "utf-8" });
    // 初始化模块，解析 AST
    const module = new Module({
      path,
      code,
      bundle,
      loader,
      isEntry,
    });
    // 添加进模块依赖图
    this.bundle.addModule(module);
    // 拉取所有的依赖模块
    await this.fetchAllDependencies(module);
    return module;
  }
  // 递归拉取依赖
  async fetchAllDependencies(module: Module) {
    await Promise.all(
      module.dependencies.map((dep) => {
        return this.fetchModule(dep, module.path);
      })
    );
  }
}
