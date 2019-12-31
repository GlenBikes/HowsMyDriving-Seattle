import { SeattleRegion } from './src/seattle';

import { log } from './src/logging';

export var Region = new SeattleRegion();

import { __MODULE_NAME__, __MODULE_VERSION__ } from './src/logging';

log.info(
  `howsmydriving-seattle: Module ${__MODULE_NAME__} version '${__MODULE_VERSION__}' loaded.`
);
