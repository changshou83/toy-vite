import { Plugin } from "../plugin";
import { assetsPlugin } from "./assets";
import { cssPlugin } from "./css";
import { esbuildTransformPlugin } from "./esbuild";
import { importAnalysisPlugin } from "./importAnalysis";
import { resolvePlugin } from "./resolve";

export function resolvePlugins(): Plugin[] {
  return [
    // 路径解析插件
    resolvePlugin(),
    // esbuild 语法转译插件
    esbuildTransformPlugin(),
    // import 分析插件
    importAnalysisPlugin(),
    // css
    cssPlugin(),
    // 静态资源
    assetsPlugin(),
  ];
}
