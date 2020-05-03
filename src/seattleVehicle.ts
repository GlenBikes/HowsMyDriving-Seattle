export interface ISeattleVehicle {
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

export interface ISeattleGetVehicleByPlateResult {
  GetVehicleByPlateResult: string;
}

export interface IGetCitationsByVehicleNumberResult {
  GetCitationsByVehicleNumberResult: string;
}
