const packpath = require('packpath');

import { SeattleRegion } from './src/seattle';

import { log } from './src/logging';

let packpath_parent = packpath.parent() ? packpath.parent() : packpath.self();
let packpath_self = packpath.self();

var path = require('path'),
  json_path = path.resolve(packpath_self + '/package.json'),
  pjson = require(json_path);

export var Region = new SeattleRegion();

log.info(`Module ${pjson.name} version '${pjson.version}' loaded.`);
