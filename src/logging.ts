import * as packpath from 'packpath';
import * as path from 'path';
import * as fs from 'fs';

import { sleep } from 'howsmydriving-utils';

import { __REGION_NAME__ } from './seattle';

import { getAppRootPath } from './util/process';

let packpath_parent = packpath.parent() ? packpath.parent() : packpath.self();
let packpath_self = packpath.self();

let package_json_path = path.resolve(__dirname + '/../package.json');

if (!fs.existsSync(package_json_path)) {
  package_json_path = path.resolve(__dirname + '/../../package.json');

  if (!fs.existsSync(package_json_path)) {
    throw new Error(`Cannot find package.json: ${__dirname}.`);
  }
}

var pjson = require(package_json_path);

// Put this at very top so other modules can import it without taking
// dependencies on something else in the module being instantiated.
export const __MODULE_NAME__ = pjson.name;
export const __MODULE_VERSION__ = pjson.version;

export const log4js_config_path = path.resolve(
  getAppRootPath() + '/dist/config/log4js.json'
);

var log4js = require('log4js'),
  chokidar = require('chokidar');

// Load the config.
log4js.configure(log4js_config_path);

// Create default logger to log that our module was loaded and for
// config update changes.
var temp_log = log4js.getLogger('result');

temp_log.addContext('module', __REGION_NAME__);
temp_log.info(
  `howsmydriving-seattle: adding log4js (${log4js_config_path}) context: ${__REGION_NAME__}.`
);

export const log = temp_log;
/**
 * Monitor the log4js config file and reloading log instances if the file changes.
 **/
var watcher = chokidar.watch(log4js_config_path, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
  awaitWriteFinish: true
});

/**
 * Reload log4js (when config changes).
 *
 * Params:
 *   reason: Reason why logs are being reloaded. This is logged before
 *           reloading log4js.
 *
 * TODO: Test to make sure this works. Do existing loggers still work? Do
 *       they update to the new log level?
 **/
function reloadlog(reason: string) {
  /*
  log.info(`Reloading log config due to config file ${reason}.`);
  log4js.shutdown(() => {
    sleep(10000).then(() => {
      log4js.configure(config_path);
      log = log4js.getLogger('reason');
    });
  });
  */
}

// Handle the change/add events for the log4js config file.
watcher
  .on('add', (path: string) => {
    reloadlog(`add of ${path}`);
  })
  .on('change', (path: string) => {
    reloadlog(`change of ${path}`);
  });
