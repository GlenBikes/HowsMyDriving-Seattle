import { SeattleRegion } from './src/seattle';

import { log } from './src/logging';

var path = require('path'),
  json_path = path.resolve(__dirname + '/../package.json'),
  pjson = require(json_path);

export var Region = new SeattleRegion();

log.info(`Module ${pjson.name} version '${pjson.version}' loaded.`);
