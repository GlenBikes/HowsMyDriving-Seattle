const moment = require('moment');

import { Collision, ICollision } from 'howsmydriving-utils';

export class SeattleCollision extends Collision {
  [index: string]: any;
  constructor(collision?: ICollision) {
    super(collision);
  }

  toString = (): string => {
    let now_date: Date = new Date();
    let collision_date = new Date(this.date_time);
    let now_moment = moment();
    let collision_moment = moment(new Date(this.date_time));

    let ret = `It has been ${moment
      .duration(Date.now() - this.date_time, 'ms')
      .humanize()} since the last ${this.getType()} collision in ${
      this.region
    }\n\nCollision Date: ${collision_moment.format('LLLL')}\nLocation: ${
      this.location
    }\nVehicles involved: ${this.vehicle_count}\nPeople involved: ${
      this.person_count
    }`;

    if (this.ped_count > 0) {
      ret = ret + `\nPedestrians involved: ${this.ped_count}`;
    }

    if (this.cycler_count > 0) {
      ret = ret + `\nBicyclers involved: ${this.cycler_count}`;
    }

    if (this.cycler_count > 0) {
      ret = ret + `\nBicyclers involved: ${this.cycler_count}`;
    }

    if (this.fatality_count > 0) {
      ret = ret + `\nFatalities: ${this.fatality_count}`;
    }

    if (this.serious_injury_count > 0) {
      ret = ret + `\nSerious injuries: ${this.serious_injury_count}`;
    }

    if (this.injury_count > 0) {
      ret = ret + `\nInjuries: ${this.injury_count}`;
    }

    if (this.dui) {
      ret = ret + `\nDUI: ${this.dui}`;
    }

    return ret;
  };
}
