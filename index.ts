import {SeattleRegion} from './src/seattle';
import {IRegion} from 'howsmydriving-utils';

import {log} from './src/logging';

export {SeattleRegion} from './src/seattle';

export function GetRegion(): IRegion {
  return new SeattleRegion();
}

log.info(`Module howsmydriving-seattle loaded.`);
