// TODO: Order things in this file

// Imports
import { Client as SOAPClient } from 'soap';
import { createClient as CreateSOAPClient } from 'soap';

import { ICitation } from 'howsmydriving-utils';
import { Citation } from 'howsmydriving-utils';
import { CitationIds } from 'howsmydriving-utils';
import { CompareNumericStrings } from 'howsmydriving-utils';
import { DumpObject } from 'howsmydriving-utils';
import { formatPlate } from 'howsmydriving-utils';
import { Region } from 'howsmydriving-utils';
import { StatesAndProvinces } from 'howsmydriving-utils';

export const __REGION_NAME__: string = 'Seattle';

import { log } from './logging';

var fs = require('fs'),
  path = require('path');

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

// interfaces - TODO: Move to declaration files.
interface ISeattleCitation extends ICitation {
  [index: string]: any;
  Citation: number;
  Type: string;
  Status: string;
  ViolationDate: string;
  ViolationLocation: string;
}

class SeattleCitation extends Citation {
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

interface ISeattleVehicle {
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

interface ISeattleGetVehicleByPlateResult {
  GetVehicleByPlateResult: string;
}

interface IGetCitationsByVehicleNumberResult {
  GetCitationsByVehicleNumberResult: string;
}

// Classes
export class SeattleRegion extends Region {
  constructor() {
    super(__REGION_NAME__);

    log.debug(
      `Creating instance of ${this.name} for region ${__REGION_NAME__}`
    );
  }

  GetCitationsByPlate(plate: string, state: string): Promise<Array<Citation>> {
    log.debug(
      `Getting citations for ${state}:${plate} in region ${__REGION_NAME__}.`
    );
    return new Promise<Array<Citation>>((resolve, reject) => {
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
              vehicle.VehicleNumber
            );

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
          let allCitations: Array<Citation> = Object.keys(
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
        //return new Date(a).getTime() - new Date(b).getTime();
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

  GetCitationsByVehicleNum(vehicleID: number): Promise<Citation[]> {
    var args = {
      VehicleNumber: vehicleID
    };

    log.debug(`Getting citations for vehicle ID: ${vehicleID}.`);

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
