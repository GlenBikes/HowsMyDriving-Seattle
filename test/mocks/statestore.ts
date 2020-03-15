import { IStateStore } from 'howsmydriving-utils';

export class MockStateStore implements IStateStore {
  constructor(region_name: string) {
    this.region_name = region_name;
  }

  readonly region_name: string;

  GetStateValue(keyname: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      resolve('0');
    });
  }

  PutStateValue(keyname: string, keyvalue: string) {
    return Promise.resolve();
  }

  PutStateValues(values: { [key: string]: string }): Promise<void> {
    return Promise.resolve();
  }
}
