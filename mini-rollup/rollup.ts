import { mkdir, pathExistsSync, writeFile } from "fs-extra";
import { dirname } from "node:path";
import { Bundle } from "./Bundle";

export interface RollupOptions {
  input: string;
  output: string;
}

function createDir(dirname: string) {
  return new Promise((resolve, reject) => {
    const path = dirname.substring(0, dirname.lastIndexOf("/"));
    mkdir(path, { recursive: true }, (error) => {
      if (error) {
        reject({ success: false });
      } else {
        resolve({ success: true });
      }
    });
  });
}

export async function rollup(options: RollupOptions) {
  const { input = "./index.js", output = "./dist/index.js" } = options;
  const bundle = new Bundle({
    entry: input,
  });
  return bundle.build().then(() => {
    const generate = () => bundle.generate();
    return {
      generate,
      write: async () => {
        const { code, map } = generate();
        if (!pathExistsSync(dirname(output))) {
          await createDir(output);
        }
        return Promise.all([
          writeFile(output, code),
          writeFile(output + ".map", map.toString()),
        ]);
      },
    };
  });
}
