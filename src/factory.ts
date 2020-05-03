import { IStateStore, Region, RegionFactory } from 'howsmydriving-utils';
import { __REGION_NAME__, SeattleRegion } from './seattle';

export class SeattleRegionFactory extends RegionFactory {
  public name: string = __REGION_NAME__;

  public createRegion(state_store: IStateStore): Promise<Region> {
    let region: SeattleRegion = new SeattleRegion(state_store);

    return region.initialize_promise;
  }
}
