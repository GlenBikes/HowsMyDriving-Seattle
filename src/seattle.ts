// TODO: Order things in this file

// Imports
import { Client as SOAPClient } from 'soap';
import { createClient as CreateSOAPClient } from 'soap';
import * as RestClient from 'typed-rest-client/RestClient';

const moment = require('moment');

import {
  Citation,
  ICitation,
  CitationIds,
  Collision,
  ICollision,
  CompareNumericStrings,
  DumpObject,
  formatPlate,
  MediaItem,
  IMediaItem,
  MediaItemsFromString,
  IRegion,
  Region,
  RegionFactory,
  StatesAndProvinces,
  IStateStore
} from 'howsmydriving-utils';

import { ISeattleCollision, SeattleCollision } from './seattleCollision';

import { ISeattleCitation } from './seattleCitation';

import {
  IGetCitationsByVehicleNumberResult,
  ISeattleGetVehicleByPlateResult,
  ISeattleVehicle
} from './seattleVehicle';

import { SeattleRegionFactory } from './factory';

export const __REGION_NAME__: string = 'Seattle';

import { log } from './logging';
import { MockStateStore } from '../test/mocks/statestore';

// TODO: Consolidate these.
const parkingAndCameraViolationsText =
    'Total __REGION__ parking and camera violations for #__LICENSE__: __COUNT__',
  violationsByYearText = 'Violations by year for #',
  violationsByStatusText = 'Violations by status for #',
  citationQueryText = 'License #__LICENSE__ has been queried __COUNT__ times.';

// The Seattle court web service to query citations.
// This could break at any time since they don't document its availability.
var url =
  'https://web6.seattle.gov/Courts/ECFPortal/JSONServices/ECFControlsService.asmx?wsdl';

export interface ISeattleRegion extends IRegion {
  shouldTweet(collision: ICollision): boolean;
}

// Classes
export class SeattleRegion extends Region implements ISeattleRegion {
  constructor(state_store: IStateStore) {
    super(__REGION_NAME__, state_store);

    log.debug(
      `Creating instance of ${this.name} for region ${__REGION_NAME__}`
    );

    this.initialize_promise = this.InitializeCollisionInfo();
  }

  readonly initialize_promise: Promise<Region>;

  collision_types = {
    fatality: {
      last_tweet_date: 0,
      tweet_frequency_days: 7
    },
    'serious injury': {
      last_tweet_date: 0,
      tweet_frequency_days: 7
    },
    injury: {
      last_tweet_date: 0,
      tweet_frequency_days: 7
    }
  };

  InitializeCollisionInfo(): Promise<Region> {
    return new Promise<Region>((resolve, reject) => {
      let state_store_promises: Array<Promise<string>> = [];

      log.info(
        `Getting last tweet date for collision types for ${__REGION_NAME__}...`
      );

      Object.keys(this.collision_types).forEach(async collision_type => {
        let key: string = `last_${collision_type}_tweet_date`;

        log.trace(`Getting key ${key}...`);

        let value: string = await this.state_store.GetStateValueAsync(key);

        log.trace(`Key ${key} has value ${value}.`);

        this.collision_types[collision_type].last_tweet_date = parseInt(value);
      });

      log.info(`Initialization completed.`);

      resolve(this);
    });
  }

  GetCitationsByPlate(plate: string, state: string): Promise<Array<ICitation>> {
    log.debug(
      `Getting citations for ${state}:${plate} in ${__REGION_NAME__} region.`
    );

    return new Promise<Array<ICitation>>((resolve, reject) => {
      let citations: Array<Citation> = [];

      log.debug(
        `Getting vehicles for ${state}:${plate} in ${__REGION_NAME__} region.`
      );
      this.GetVehicleIDs(plate, state).then(
        async (vehicles: ISeattleVehicle[]) => {
          // Make the calls to GetCitationsByVehicleNum soap method synchronously
          // Or we could get throttled by the server.

          // citations is an array of an array of citations, one for each vehicle id
          // collapse them into a hash based on
          let citationsByCitationID: { [citation_id: string]: Citation } = {};
          for (let i: number = 0; i < vehicles.length; i++) {
            let vehicle: ISeattleVehicle = vehicles[i];
            log.debug(
              `Getting citations for ${state}:${plate} vehicle ${vehicle.VehicleNumber} in ${__REGION_NAME__} region.`
            );

            let citations: Array<ICitation> = await this.GetCitationsByVehicleNum(
              vehicle.VehicleNumber,
              plate,
              state
            ).catch(err => {
              throw err;
            });

            let cases: Array<any> = await this.GetCasesByVehicleNum(
              vehicle.VehicleNumber
            ).catch(err => {
              throw err;
            });

            log.info(DumpObject(cases));

            citations.forEach((citation: ICitation) => {
              // use the Citation field as the unique citation_id.
              citation.citation_id = citation.Citation;
              citationsByCitationID[citation.citation_id] = citation;
            });
          }

          log.info(
            `Found ${
              Object.keys(citationsByCitationID).length
            } different citations for vehicle ${state}:${plate}`
          );

          // Now put the unique citations back to an array
          let allCitations: Array<ICitation> = Object.keys(
            citationsByCitationID
          ).map(function(v) {
            return citationsByCitationID[v];
          });

          resolve(allCitations);
        }
      );
    });
  }

  ProcessCitationsForRequest(
    citations: ICitation[],
    query_count: number
  ): Array<string> {
    var categorizedCitations: { [request_id: string]: number } = {};
    // TODO: Does it work to convert Date's to string for sorting? Might have to use epoch.
    var chronologicalCitations: {
      [violation_date: string]: Array<ICitation>;
    } = {};
    var violationsByYear: { [violation_year: string]: number } = {};
    var violationsByStatus: { [status: string]: number } = {};

    if (!citations || Object.keys(citations).length == 0) {
      // Should never happen. jurisdictions must return at least a dummy citation
      throw new Error(
        'Jurisdiction modules must return at least one citation, a dummy one if there are none.'
      );
    }

    var license: string;

    for (var i = 0; i < citations.length; i++) {
      var citation = citations[i];
      var year: number = 1970;
      var violationDate = new Date(Date.now());

      // All citations are from the same license
      if (license == null) {
        license = citation.license;
      }

      try {
        violationDate = new Date(Date.parse(citation.ViolationDate));
      } catch (e) {
        // TODO: refactor error handling to a separate file
        throw new Error(e);
      }

      // TODO: Is it possible to have more than 1 citation with exact same time?
      // Maybe throw an exception if we ever encounter it...
      if (!(violationDate.getTime().toString() in chronologicalCitations)) {
        chronologicalCitations[
          violationDate.getTime().toString()
        ] = new Array();
      }

      chronologicalCitations[violationDate.getTime().toString()].push(citation);

      if (!(citation.Type in categorizedCitations)) {
        categorizedCitations[citation.Type] = 0;
      }
      categorizedCitations[citation.Type]++;

      if (!(citation.Status in violationsByStatus)) {
        violationsByStatus[citation.Status] = 0;
      }
      violationsByStatus[citation.Status]++;

      year = violationDate.getFullYear();

      if (!(year.toString() in violationsByYear)) {
        violationsByYear[year.toString()] = 0;
      }

      violationsByYear[year.toString()]++;
    }

    var general_summary = parkingAndCameraViolationsText
      .replace('__LICENSE__', formatPlate(license))
      .replace('__REGION__', __REGION_NAME__)
      .replace('__COUNT__', Object.keys(citations).length.toString());

    Object.keys(categorizedCitations).forEach(key => {
      var line = key + ': ' + categorizedCitations[key];

      // Max twitter username is 15 characters, plus the @
      general_summary += '\n';
      general_summary += line;
    });

    general_summary += '\n\n';
    general_summary += citationQueryText
      .replace('__LICENSE__', formatPlate(license))
      .replace('__COUNT__', query_count.toString());

    var detailed_list = '';

    var sortedChronoCitationKeys = Object.keys(chronologicalCitations).sort(
      function(a: string, b: string) {
        return CompareNumericStrings(a, b); //(a === b) ? 0 : ( a < b ? -1 : 1);
      }
    );

    var first = true;

    for (var i = 0; i < sortedChronoCitationKeys.length; i++) {
      var key: string = sortedChronoCitationKeys[i];

      chronologicalCitations[key].forEach(citation => {
        if (first != true) {
          detailed_list += '\n';
        }
        first = false;
        detailed_list += `${citation.ViolationDate}, ${citation.Type}, ${citation.ViolationLocation}, ${citation.Status}`;
      });
    }

    var temporal_summary: string =
      violationsByYearText + formatPlate(license) + ':';
    Object.keys(violationsByYear).forEach(key => {
      temporal_summary += '\n';
      temporal_summary += `${key}: ${violationsByYear[key].toString()}`;
    });

    var type_summary = violationsByStatusText + formatPlate(license) + ':';
    Object.keys(violationsByStatus).forEach(key => {
      type_summary += '\n';
      type_summary += `${key}: ${violationsByStatus[key]}`;
    });

    // Return them in the order they should be rendered.
    return [general_summary, detailed_list, type_summary, temporal_summary];
  }

  // TODO: If we export this class, this method must be moved out
  // because there is no way to declare a function private in a class.
  GetVehicleIDs(plate: string, state: string): Promise<ISeattleVehicle[]> {
    var args = {
      Plate: plate,
      State: state
    };

    return new Promise((resolve, reject) => {
      CreateSOAPClient(url, function(err: Error, client: SOAPClient) {
        if (err) {
          throw err;
        }

        // GetVehicleByPlate returns all vehicles with plates that
        // start with the specified plate. So we have to filter the
        // results.
        client.GetVehicleByPlate(
          args,
          (err: Error, result: ISeattleGetVehicleByPlateResult) => {
            if (err) {
              throw err;
            }
            let vehicle_records: Array<ISeattleVehicle> = [];
            var jsonObj = JSON.parse(result.GetVehicleByPlateResult);
            var jsonResultSet = JSON.parse(jsonObj.Data);

            for (var i = 0; i < jsonResultSet.length; i++) {
              let vehicle: Vehicle = new Vehicle(jsonResultSet[i]);

              if (vehicle.Plate == plate) {
                vehicle_records.push(vehicle);
              }
            }
            resolve(vehicle_records);
          }
        );
      });
    });
  }

  GetCitationsByVehicleNum(
    vehicleID: number,
    plate: string,
    state: string
  ): Promise<Citation[]> {
    var args = {
      VehicleNumber: vehicleID,
      plate: plate,
      state: state
    };

    log.debug(
      `Getting citations for vehicle ID: ${vehicleID}, ${state}:${plate}.`
    );

    return new Promise<ICitation[]>((resolve, reject) => {
      CreateSOAPClient(url, (err: Error, client: SOAPClient) => {
        if (err) {
          throw err;
        }
        client.GetCitationsByVehicleNumber(
          args,
          (
            err: Error,
            citations_result: IGetCitationsByVehicleNumberResult
          ) => {
            if (err) {
              throw err;
            }

            var jsonObj = JSON.parse(
              citations_result.GetCitationsByVehicleNumberResult
            );
            var jsonResultSet = JSON.parse(jsonObj.Data);

            let citations: ICitation[] = [];

            jsonResultSet.forEach((item: any) => {
              let citation: ISeattleCitation = item as ISeattleCitation;

              // Add in the citation_id and region fields
              citation.citation_id = citation.Citation;
              citation.region = __REGION_NAME__;
              citations.push(citation);
            });

            resolve(citations);
          }
        );
      });
    });
  }

  // TODO: Implement and test this.
  GetCasesByVehicleNum(vehicleID: number): Promise<any> {
    var args = {
      VehicleNumber: vehicleID
    };
    return new Promise((resolve, reject) => {
      CreateSOAPClient(url, (err: Error, client: SOAPClient) => {
        client.GetCasesByVehicleNumber(args, function(
          err: Error,
          cases_result: any
        ) {
          // TODO: This is not right. Need JSON.parse twice.
          var cases: Array<any> = JSON.parse(
            cases_result.GetCasesByVehicleNumberResult
          );

          resolve(cases);
        });
      });
    });
  }

  GetRecentCollisions(): Promise<Array<ICollision>> {
    return new Promise<Array<ICollision>>((resolve, reject) => {
      log.info(`Getting recent ${this.name} collisions...`);

      this.initialize_promise
        .then(() => {
          Promise.all([
            this.getLastCollisionsWithCondition('FATALITIES>0', 1),
            this.getLastCollisionsWithCondition('SERIOUSINJURIES>0', 1),
            this.getLastCollisionsWithCondition('INJURIES>0', 1)
          ])
            .then(collisions => {
              log.info(`Returning ${collisions.length} collisions.`);
              resolve(collisions);
            })
            .catch(err => {
              reject(
                new Error(`Failed to get recent collisions: ${DumpObject(err)}`)
              );
            });
        })
        .catch(err => {
          reject(
            new Error(
              `Initialization of collision info failed: ${DumpObject(err)}`
            )
          );
        });
    });
  }

  ProcessCollisions(collisions: Array<ICollision>): Promise<Array<string>> {
    return this.processCollisionsForTweets(collisions);
  }

  private getLastCollisionsWithCondition(
    condition: string,
    count: number = 1
  ): Promise<ICollision> {
    return new Promise<ICollision>((resolve, reject) => {
      const restc = new RestClient.RestClient('SDOT-Crashes');
      const url = `https://gisdata.seattle.gov/server/rest/services/SDOT/SDOT_Collisions/MapServer/0/query?where=${condition}&outFields=*&outSR=4326&f=json&orderByFields=INCDATE DESC&resultRecordCount=${count}`;
      log.trace(`Making REST call: ${url}`);
      const resp = restc.get(url);
      resp
        .then(response => {
          try {
            let id: string = `${response['result']['features'][0]['attributes']['INCKEY']}-${response['result']['features'][0]['attributes']['COLDETKEY']}`;
            log.debug(
              `getLastCollisionsWithCondition: Creating collision record with id ${id}...`
            );

            let collision = new SeattleCollision({
              id: id,
              x: response['result']['features'][0]['geometry']['x'],
              y: response['result']['features'][0]['geometry']['y'],
              date_time:
                response['result']['features'][0]['attributes']['INCDATE'],
              date_time_str:
                response['result']['features'][0]['attributes']['INCDTTM'],
              location:
                response['result']['features'][0]['attributes']['LOCATION'],
              ped_count:
                response['result']['features'][0]['attributes']['PEDCOUNT'],
              cycler_count:
                response['result']['features'][0]['attributes']['PEDCYLCOUNT'],
              person_count:
                response['result']['features'][0]['attributes']['PERSONCOUNT'],
              vehicle_count:
                response['result']['features'][0]['attributes']['VEHCOUNT'],
              injury_count:
                response['result']['features'][0]['attributes']['INJURIES'],
              serious_injury_count:
                response['result']['features'][0]['attributes'][
                  'SERIOUSINJURIES'
                ],
              fatality_count:
                response['result']['features'][0]['attributes']['FATALITIES'],
              // TODO: What does a DUI crash look like?
              dui:
                response['result']['features'][0]['attributes']['UNDERINFL'] ===
                'Y'
            } as any);

            Object.assign(
              collision,
              response['result']['features'][0]['attributes']
            );

            resolve(collision);
          } catch (err) {
            log.error(`Error: ${DumpObject(err)}.`);
            reject(err);
          }
        })
        .catch(err => {
          log.error(`Error: ${DumpObject(err)}.`);
          reject(err);
        });
    });
  }

  async processCollisionsForTweets(
    collisions: Array<ICollision>
  ): Promise<Array<string>> {
    return new Promise<Array<string>>((resolve, reject) => {
      let tweets: Array<string> = [];

      let latest_collisions = {
        fatality: {
          latest_collision: undefined
        },
        'serious injury': {
          latest_collision: undefined
        },
        injury: {
          latest_collision: undefined
        }
      };

      this.initialize_promise
        .then(() => {
          let now: number = Date.now();
          let date_now: Date = new Date();

          collisions.forEach(collision => {
            let seattle_collision = new SeattleCollision(collision as any);
            let collision_type: string = SeattleRegion.getCollisionType(
              collision
            );

            log.info(`Processing collision ${seattle_collision.id}`);

            log.info(
              `About to check date_time. ${collision_type} last tweet date: ${
                this.collision_types[collision_type].last_tweet_date
              } now: ${now} difference is ${moment(date_now).diff(
                moment(this.collision_types[collision_type].last_tweet_date),
                'days'
              )} days, tweet every ${
                this.collision_types[collision_type].tweet_frequency_days
              } days...`
            );

            if (
              !latest_collisions[collision_type].latest_collision ||
              latest_collisions[collision_type].latest_collision.date_time <
                collision.date_time
            ) {
              log.debug(
                `Most recent ${collision_type} found so far is collision ${seattle_collision.id} on ${seattle_collision.date_time_str}.`
              );
              latest_collisions[
                collision_type
              ].latest_collision = seattle_collision;
            }
          });

          // Fatalities are serious injuries which are injuries.
          if (!latest_collisions['serious injury'].latest_collision) {
            latest_collisions['serious injury'].latest_collision =
              latest_collisions['fatality'].latest_collision;
          }
          if (!latest_collisions['injury'].latest_collision) {
            latest_collisions['injury'].latest_collision =
              latest_collisions['serious injury'].latest_collision;
          }

          log.debug(`Checking to see if we will tweet anything...`);

          // Tweet last fatal collision once per month and
          // whenever there is a new one.
          let store_updates: {
            [key: string]: string;
          } = {};

          Object.keys(this.collision_types).forEach(collision_type => {
            log.debug(`Checking for ${collision_type} collisions...`);

            if (
              latest_collisions[collision_type].latest_collision &&
              this.shouldTweet(
                latest_collisions[collision_type].latest_collision
              )
            ) {
              let tweet: string = this.getTweetFromCollision(
                latest_collisions[collision_type]
                  .latest_collision as SeattleCollision,
                collision_type,
                this.collision_types[collision_type].last_tweet_date
              );
              if (tweet && tweet.length) {
                let key: string = `last_${collision_type}_tweet_date`;

                log.debug(`Returning tweet ${tweet}.`);
                store_updates[key] = now.toString();

                tweets.push(tweet);
              }
            } else {
              log.trace(
                `Not tweeting ${collision_type} last tweet date: ${
                  this.collision_types[collision_type].last_tweet_date
                } now: ${now} difference is ${moment(date_now).diff(
                  moment(this.collision_types[collision_type].last_tweet_date),
                  'days'
                )} days, tweet every ${
                  this.collision_types[collision_type].tweet_frequency_days
                } days...`
              );
            }
          });

          if (Object.keys(store_updates).length > 0) {
            log.trace(`Writing state values:\n${DumpObject(store_updates)}`);

            this.state_store.PutStateValues(store_updates).then(() => {
              log.trace(`Returning tweets: ${DumpObject(tweets)}`);
              resolve(tweets);
            });
          } else {
            log.trace(`No store updates to make.`);

            resolve(tweets);
          }
        })
        .catch(err => {
          throw new Error(
            `Initialization of collision info failed: ${DumpObject(err)}`
          );
        });
    });
  }

  static getCollisionType(collision: ICollision): string {
    var type: string;

    if (collision.fatality_count > 0) {
      type = 'fatality';
    } else if (collision.serious_injury_count > 0) {
      type = 'serious injury';
    } else if (collision.injury_count > 0) {
      type = 'injury';
    } else {
      throw new Error(
        `Invalid collision record found: ${DumpObject(collision)}`
      );
    }

    return type;
  }

  getTweetFromCollision(
    collision: SeattleCollision,
    collision_type: string,
    last_tweeted: number
  ) {
    let tweet: string = undefined;
    let nowDate = new Date();
    let last_tweeted_date: Date = new Date(last_tweeted);

    if (
      collision.date_time > last_tweeted ||
      last_tweeted_date.getFullYear() != nowDate.getFullYear() ||
      last_tweeted_date.getMonth() != nowDate.getMonth()
    ) {
      log.debug(
        `Tweeting last ${collision_type} collision from ${collision.date_time_str}.`
      );

      let media_item: MediaItem = new MediaItem({
        url: `https://maps.googleapis.com/maps/api/staticmap?markers=${collision.y},${collision.x}&zoom=14&size=400x400&key=AIzaSyCK7loPQ04_Ec3uPZIHTPLuTdz1kYU1_xk`,
        alt_text: `Map with pin on ${collision.location}`
      } as IMediaItem);

      tweet = `${collision.toString()}||${JSON.stringify([media_item])}`;
    } else {
      log.debug(
        `Not tweeting last ${collision_type} collision: ${
          collision.date_time
        } <= ${last_tweeted} or ${new Date(
          last_tweeted
        ).getMonth()} >= ${new Date().getMonth()}.`
      );
    }

    return tweet;
  }

  shouldTweet(collision: ICollision): boolean {
    let collision_type: string = SeattleRegion.getCollisionType(collision);

    if (collision && this.collision_types[collision_type]) {
      let days_diff: number = moment(Date.now()).diff(
        moment(this.collision_types[collision_type].last_tweet_date),
        'days'
      );

      if (
        days_diff >= this.collision_types[collision_type].tweet_frequency_days
      ) {
        return true;
      }
    } else {
      log.error(
        `shouldTweet called with collision ${collision} and last tweet date ${this.collision_types[collision_type].last_tweet_date}`
      );
    }

    return false;
  }
}

class Vehicle implements ISeattleVehicle {
  constructor(veh: ISeattleVehicle) {
    this.VehicleNumber = veh.VehicleNumber;
    this.Make = veh.Make;
    this.Model = veh.Model;
    this.Year = veh.Year;
    this.State = veh.State;
    (this.Plate = veh.Plate), (this.ExpirationYear = veh.ExpirationYear);
    this.Color = veh.Color;
    this.Style = veh.Style;
    this.Dealer = veh.Dealer;
    this.VIN = veh.VIN;
    this.PlateType = veh.PlateType;
    this.DOLReceivedDate = veh.DOLReceivedDate;
    this.DOLRequestDate = veh.DOLRequestDate;
  }

  VehicleNumber: number;
  Make: string;
  Model: string;
  Year: string;
  State: string;
  Plate: string;
  ExpirationYear: string;
  Color: string;
  Style: string;
  Dealer: string;
  VIN: string;
  PlateType: string;
  DOLReceivedDate: string;
  DOLRequestDate: string;
}

// Print out subset of citation object properties.
function printCitation(citation: ISeattleCitation) {
  return `Citation: ${citation.id}, ${citation.Citation}, Type: ${citation.Type}, Status: ${citation.Status}, Date: ${citation.ViolationDate}, Location: ${citation.ViolationLocation}.`;
}

let Factory: RegionFactory = new SeattleRegionFactory();

export { Factory as default };
export { Factory };
