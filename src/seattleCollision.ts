const moment = require('moment');

import { Collision, ICollision } from 'howsmydriving-utils';

import { log } from './logging';

export interface ISeattleCollision extends ICollision {
  date_time: number;
  x: number;
  y: number;
  location: string;
  ped_count: number;
  cycler_count: number;
  person_count: number;
  vehicle_count: number;
  injury_count: number;
  serious_injury_count: number;
  fatality_count: number;
  dui: boolean;
}

export class SeattleCollision extends Collision implements ISeattleCollision {
  [index: string]: any;
  constructor(collision?: ISeattleCollision) {
    super(collision as ICollision);

    this.date_time = collision.date_time;
    this.x = collision.x;
    this.y = collision.y;
    this.location = collision.location;
    this.ped_count = collision.ped_count;
    this.cycler_count = collision.cycler_count;
    this.person_count = collision.person_count;
    this.vehicle_count = collision.vehicle_count;
    this.injury_count = collision.injury_count;
    this.serious_injury_count = collision.serious_injury_count;
    this.fatality_count = collision.fatality_count;
    this.dui = collision.dui;
  }

  id: string;
  date_time: number;
  x: number;
  y: number;
  location: string;
  ped_count: number = 0;
  cycler_count: number = 0;
  person_count: number = 0;
  vehicle_count: number = 0;
  injury_count: number = 0;
  serious_injury_count: number = 0;
  fatality_count: number = 0;
  dui: boolean = false;

  getCollisionType = (): string => {
    let type: string = 'unspecified';

    if (this.fatality_count > 0) {
      type = 'fatality';
    } else if (this.serious_injury_count > 0) {
      type = 'serious injury';
    } else if (this.injury_count > 0) {
      type = 'injury';
    }

    return type;
  };

  shouldTweet = (last_tweeted: number, collision_type: string): boolean => {
    let shouldTweet: boolean = false;
    let nowDate = new Date();
    let lastTweetedDate = new Date(last_tweeted);

    // TODO: Certain collisions should be tweeted more frequently based on type.
    if (
      this.date_time > last_tweeted ||
      lastTweetedDate.getFullYear() < nowDate.getFullYear() ||
      lastTweetedDate.getMonth() < nowDate.getMonth()
    ) {
      log.debug(
        `Tweeting last ${collision_type} collision from ${this.date_time_str}.`
      );

      shouldTweet = true;
    }

    return shouldTweet;
  };

  toString = (): string => {
    let now_date: Date = new Date();
    let collision_date = new Date(this.date_time);
    let now_moment = moment();
    let collision_moment = moment(new Date(this.date_time));

    let ret = `It has been ${moment
      .duration(Date.now() - this.date_time, 'ms')
      .humanize()} since the last ${this.getCollisionType()} collision in ${
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
