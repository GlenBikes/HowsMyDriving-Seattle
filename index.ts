import {SeattleRegion} from './src/seattle';
import {IRegion} from 'howsmydriving-utils';

import {log} from './src/logging';

var path = require('path'),
    pjson = require(path.resolve(__dirname + '/../package.json'));

export var Region: IRegion = new SeattleRegion();

log.info(`Module ${pjson.name} version '${pjson.version}' loaded.`);
