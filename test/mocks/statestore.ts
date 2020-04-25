import { IStateStore } from 'howsmydriving-utils';

export class MockStateStore implements IStateStore {
  constructor(region_name: string, last_tweeted_datetime: number = 0) {
    this.region_name = region_name;
    this.last_tweeted_datetime = last_tweeted_datetime;
  }

  readonly region_name: string;
  readonly last_tweeted_datetime: number;

  GetStateValue(keyname: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      resolve(`${this.last_tweeted_datetime}`);
    });
  }

  async GetStateValueAsync(keyname: string): Promise<string> {
    return `${this.last_tweeted_datetime}`;
  }

  PutStateValue(keyname: string, keyvalue: string) {
    return Promise.resolve();
  }

  PutStateValues(values: { [key: string]: string }): Promise<void> {
    return Promise.resolve();
  }
}
