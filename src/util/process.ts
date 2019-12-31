import * as path from 'path';
import * as fs from 'fs';

export function getAppRootPath(): string {
  let root_path = path.resolve(__dirname + '/../../');

  if (!fs.existsSync(path.resolve(root_path, 'package.json'))) {
    root_path = path.resolve(__dirname + '/../../../');

    if (!fs.existsSync(path.resolve(root_path, 'package.json'))) {
      throw new Error(
        `Cannot find app root path containing package.json: ${__dirname}.`
      );
    }
  }

  return root_path;
}
