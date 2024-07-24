import * as MagicString from "magic-string";
import { Graph } from "./Graph";
import { Module } from "./Module";

interface BundleOptions {
  entry: string;
}

export class Bundle {
  graph: Graph;
  constructor(options: BundleOptions) {
    // 初始化模块依赖图对象
    this.graph = new Graph({
      entry: options.entry,
      bundle: this,
    });
  }

  async build() {
    // 模块打包逻辑，完成所有的 AST 相关操作
    return this.graph.build();
  }

  getModuleById(id: string) {
    return this.graph.getModuleById(id);
  }

  addModule(module: Module) {
    return this.graph.addModule(module);
  }

  generate(): { code: string; map: MagicString.SourceMap } {
    // 代码生成逻辑，拼接模块 AST 节点，产出代码
    let bundle = new MagicString.Bundle({ separator: "/" });
    this.graph.orderedModules.forEach((module) => {
      bundle.addSource({
        content: module.render(),
      });
    });
    const map = bundle.generateMap({ includeContent: true });

    return {
      code: bundle.toString(),
      map: map as MagicString.SourceMap,
    };
  }
}
