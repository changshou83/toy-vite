import { Plugin } from "../plugin";
import path from "path";
import esbuild from "esbuild";
import { isJSRequest } from "../utils";
import { readFile } from "fs-extra";

// 使用 esbuild.transform 将 JS/TS/JSX/TSX 编译为 JS 语法
export function esbuildTransformPlugin(): Plugin {
  return {
    name: "t-vite:esbuild-transform",
    async load(id) {
      if (isJSRequest(id)) {
        try {
          const code = await readFile(id, "utf-8");
          return code;
        } catch (e) {
          return null;
        }
      }
    },
    async transform(code, id) {
      if (isJSRequest(id)) {
        const extname = path.extname(id).slice(1);
        const { code: transformedCode, map } = await esbuild.transform(code, {
          target: "esnext",
          format: "esm",
          sourcemap: true,
          loader: extname as "js" | "ts" | "jsx" | "tsx",
        });
        return {
          code: transformedCode,
          map,
        };
      }
      return null;
    },
  };
}
