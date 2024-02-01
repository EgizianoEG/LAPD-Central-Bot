import type { Snowflake, FetchGuildOptions } from "discord.js";
import type ERLCAgeGroups from "@Resources/ERLCAgeGroups.js";
import type { EyeColors, HairColors } from "@Resources/ERLCPDColors.ts";
import { OptionalPathKeys } from "mongoose/types/inferschematype.js";
import { ExpandRecursively, Optional, OptionalKeys } from "utility-types";

export namespace Citations {
  type CitationType = "Warning" | "Fine";
  interface WarningCitationData {
    /** Citation number */
    num: string;

    /** Date of violation or citation issuing date */
    dov: string;

    /** Time of violation or citation issuing time in 12 hour format with hours and minutes (10:45) */
    tov: string;

    /** The day of week of the citation in numeric format (1 to 7); e.g, 1: Sunday, 7: Saturday */
    dow: number;

    /** The day period of the citation ("AM" or "PM") */
    ampm: "AM" | "PM";

    /** The location of violation(s) stated. A maximum of 70 characters. */
    violation_loc: string;

    /** Who issued the citation */
    citing_officer: CitingOfficerInfo;

    /**
     * A list of violations. A violation text shall have the following format: "XXX(A) CVC - XXX".
     * Where it contains the violation vehicle/penal code and it's description.
     */
    violations: (string | Violation)[];

    violator_info: ViolatorInfo;
    vehicle_info: VehicleInfo;
  }

  interface FineCitationData extends WarningCitationData {
    /** The amount of the fine in US dollars. This field is only applicable to fine citations not to warnings */
    fine_amount: number;
  }

  interface AnyCitationData extends WarningCitationData, Partial<FineCitationData> {}

  interface CitPartialData {
    violator_info: Pick<ViolatorInfo, "name" | "id"> & Partial<ViolatorInfo>;
    vehicle_info: VehicleInfo;
  }

  interface CitingOfficerInfo {
    /** Roblox user Id */
    id: number;
    /** Roblox username */
    name: string;
    /** Roblox display name */
    display_name: string;
  }

  interface Violation {
    /** Whether the violation is correctable or not */
    correctable?: boolean;
    /** The violation text itself */
    violation: string;
    /** Violation type. Either a misdemeanor (M) or normal infraction (I) */
    type?: "M" | "I";
  }

  interface ViolatorInfo {
    /** Roblox user Id */
    id: number;

    /** The name of the violator. Recommended to use the format: `[RobloxDisplayName] (@[RobloxUsername])` */
    name: string;

    /** The age group of the violator */
    age: (typeof ERLCAgeGroups)[number]["name"];

    gender: "Male" | "Female" | "M" | "F";

    /** Hair color */
    hair_color: (typeof HairColors)[number]["abbreviation"];

    /** Eye color */
    eye_color: (typeof EyeColors)[number]["abbreviation"];

    /** Height in the format of feet and inches (5'7") */
    height: `${number}'${number}` | string;

    /** Weight in pounds (lbs) */
    weight: number;

    /** Residence city */
    city: string;

    /** Residence address */
    address: string;

    /** The driving license number itself; not the *vehicle* license/plate number */
    lic_num: string;

    /** The driving license class */
    lic_class: string;

    /** Whether the driving license is commercial or not */
    lic_is_comm: boolean;
  }

  interface VehicleInfo {
    body_style: string;
    lic_num: string;
    year: string;
    make: string;
    model: string;
    color: string;
  }
}

declare global {
  namespace Utilities {}
}
