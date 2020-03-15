import { SeattleRegion } from './src/seattle';
import { MockStateStore } from './test/mocks/statestore';

import { log } from './src/logging';

export var Region = new SeattleRegion();

Region.Initialize(new MockStateStore(Region.name));

import { __MODULE_NAME__, __MODULE_VERSION__ } from './src/logging';

log.info(
  `howsmydriving-seattle: Module ${__MODULE_NAME__} version '${__MODULE_VERSION__}' loaded.`
);
