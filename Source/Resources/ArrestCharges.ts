export interface Charge {
  Name: string;
  Description: string;
  StatuteCode: string;
}

export const GeneralCharges = [] as Charge[];

export const VehicleCharges = [
  {
    Name: "Vehicle Evasion",
    Description: "",
    StatuteCode: "2800 (VC)",
  },
] as Charge[];
