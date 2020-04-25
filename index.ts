import { __REGION_NAME__ } from './src/seattle';

import { log } from './src/logging';

import { __MODULE_NAME__, __MODULE_VERSION__ } from './src/logging';

export { Factory } from './src/seattle';

log.info(
  `howsmydriving-seattle: Module ${__MODULE_NAME__} version '${__MODULE_VERSION__}' loaded.`
);
