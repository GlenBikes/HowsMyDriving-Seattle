var assert = require('assert'),
  sinon = require('sinon');

import { DumpObject, ICollision } from 'howsmydriving-utils';

import { SeattleCollision } from '../src/seattleCollision';

import { Factory, ISeattleRegion, SeattleRegion } from '../src/seattle';
import { MockStateStore } from './mocks/statestore';

describe('Collision tests', function() {
  describe('Get last fatal/injury collision', function() {
    it('Should return a single ICollision with a date prior to today', done => {
      // These aren't really unit tests since they make calls to the seattle opendata endpoints.
      this.timeout(5000);

      Factory.createRegion(new MockStateStore('TestRegion', Date.now()))
        .then(region => {
          region.GetRecentCollisions().then((collisions: Array<ICollision>) => {
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

            done();
          });
        })
        .catch(err => {
          throw err;
        });
    });
  });

  describe('Render collisions correctly', () => {
    it('Should render a specific date/time', () => {
      let collision = new SeattleCollision({
        id: '111111',
        date_time: 1583539200000,
        x: -122.31346221462668,
        y: 47.567243070925294,
        location: 'In Seattle anywhere',
        region: 'Fake City',
        ped_count: 1,
        cycler_count: 2,
        person_count: 4,
        vehicle_count: 1,
        injury_count: 1,
        serious_injury_count: 1,
        fatality_count: 1,
        dui: false
      });

      assert.notEqual(
        collision.toString(),
        undefined,
        'collision.toString() is undefined.'
      );

      assert.notEqual(
        collision.toString(),
        '',
        'collision.toString() is empty.'
      );
    });
  });

  describe('Check tweet freshness logic', function() {
    it('Should not tweet again within a day', done => {
      // These aren't really unit tests since they make calls to the seattle opendata endpoints.
      this.timeout(5000);

      Factory.createRegion(new MockStateStore('TestRegion', Date.now()))
        .then(mockRegion => {
          mockRegion
            .GetRecentCollisions()
            .then((collisions: Array<ICollision>) => {
              if (collisions.length == 0) {
                assert(true);
              }

              collisions.forEach(collision => {
                let seattleRegion: ISeattleRegion = mockRegion as ISeattleRegion;

                assert(!seattleRegion.shouldTweet(collision));
              });

              done();
            });
        })
        .catch(err => {
          throw err;
        });
    });
  });
});
