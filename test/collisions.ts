var assert = require('assert'),
  sinon = require('sinon');

import { DumpObject, ICollision } from 'howsmydriving-utils';

import { Region } from '../index';

describe('Collision history', function() {
  describe('Get last fatal/injury collision', function() {
    it('Should return a single ICollision with a date prior to today', () => {
      console.log(`Checking for collisions in ${Region.name}...`);

      Region.GetRecentCollisions().then((collisions: Array<ICollision>) => {
        if (collisions.length == 0) {
          assert(true);
        }

        collisions.forEach(collision => {
          assert(collision.date_time < Date.now());
          assert(
            collision.fatality_count > 0 ||
              collision.serious_injury_count > 0 ||
              collision.injury_count > 0
          );
        });
      });
    });
  });
});
