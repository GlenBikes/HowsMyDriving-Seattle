import { ICitation, Citation, DumpObject } from 'howsmydriving-utils';

import { __REGION_NAME__ } from './seattle';

export interface ISeattleCitation extends ICitation {
  [index: string]: any;
  Citation: number;
  Type: string;
  Status: string;
  ViolationDate: string;
  ViolationLocation: string;
}

export class SeattleCitation extends Citation {
  [index: string]: any;
  constructor(citation: Citation) {
    super(citation);

    // If passed an existing instance, copy over the properties.
    if (arguments.length > 0) {
      for (var p in citation) {
        if (citation.hasOwnProperty(p)) {
          this[p] = citation[p];
        }
      }
    }
    this.region = __REGION_NAME__;
  }

  Citation: number;
  Type: string;
  Status: string;
  ViolationDate: string;
  ViolationLocation: string;
}
