const packpath = require('packpath');
const appRootDir = require('app-root-dir').get();
const appRootPath = require('app-root-path');
const appRoot = require('app-root');

import * as path from 'path';

let packpath_parent = packpath.parent() ? packpath.parent() : packpath.self();
let packpath_self = packpath.self();

console.log(
  `howsmydriving-twitter:\n - packpath_self: ${packpath_self}\n - packpath_parent: ${packpath.parent()}\n - app-root-dir: ${appRootDir}\n - app-root-path: ${appRootPath}\n - app-root (current): see below\n - app-root (root): see below\n - __dirname: ${__dirname}\n - .: ${path.resolve(
    '.'
  )}`
);

appRoot({
  directory: '.',
  success: function(roots) {
    console.log(`howsmydriving-twitter:\n - app-root (current): ${roots}`);
  }
});

appRoot({
  directory: '/',
  success: function(roots) {
    console.log(`howsmydriving-twitter:\n - app-root (root): ${roots}`);
  }
});

export const log4js_config_path = path.resolve(
  appRootDir + '/dist/config/log4js.json'
);

console.log(
  `howsmydriving-twitter: log4js_config_path:\n - ${log4js_config_path}`
);

import { SeattleRegion } from './src/seattle';

import { log } from './src/logging';

var package_config_path = path.resolve(packpath_self + '/package.json'),
  pjson = require(package_config_path);

const __MODULE_NAME__ = pjson.name;
const __MODULE_VERSION__ = pjson.version;

export var Region = new SeattleRegion();

log.info(
  `howsmydriving-seattle: package_config_path: ${package_config_path}, __MODULE_NAME__: ${__MODULE_NAME__}.`
);
log.info(
  `howsmydriving-seattle: Module ${__MODULE_NAME__} version '${__MODULE_VERSION__}' loaded.`
);
