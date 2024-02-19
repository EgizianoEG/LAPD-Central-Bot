import type { ExpandRecursively, Optional, OptionalKeys } from "utility-types";
import type { Snowflake, FetchGuildOptions } from "discord.js";
import type { EyeColors, HairColors } from "@Resources/ERLCPDColors.ts";
import type { OptionalPathKeys } from "mongoose/types/inferschematype.js";
import type ERLCAgeGroups from "@Resources/ERLCAgeGroups.js";

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

    /** The direct image url of the filled citation; if any. */
    img_url?: string | null;

    /** The location of violation(s) stated. A maximum of 70 characters. */
    violation_loc: string;

    /** Who issued the citation */
    citing_officer: CitingOfficerInfo;

    /**
     * A list of violations. A violation text shall have the following format: "XXX(A) CVC - XXX".
     * Where it contains the violation vehicle/penal code and it's description.
     */
    violations: (string | Violation)[];

    violator: ViolatorInfo;
    vehicle: VehicleInfo;
  }

  interface FineCitationData extends WarningCitationData {
    /** The amount of the fine in US dollars. This field is only applicable to fine citations not to warnings */
    fine_amount: number;
  }

  interface AnyCitationData extends WarningCitationData, Partial<FineCitationData> {}

  interface CitPartialData {
    violator: Pick<ViolatorInfo, "name" | "id"> & Partial<ViolatorInfo>;
    vehicle: VehicleInfo;
  }

  interface CitingOfficerInfo {
    /** Discord user Id */
    discord_id: string;
    /** Roblox user Id */
    roblox_id: number;
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

export namespace OSMetrics {
  interface OSMetricsData<HR extends boolean = false> {
    /** Running node version */
    node_ver: string;

    /** Process uptime in seconds or in a human-readable format if specified. */
    process_uptime: HR extends true ? string : number;

    system: {
      /** Running OS type. See {@link https://en.wikipedia.org/wiki/Uname#Examples}. */
      type: string;

      /** Running OS platform */
      platform: "aix" | "darwin" | "freebsd" | "linux" | "openbsd" | "sunos" | "win32";

      /** Running OS version */
      version: string;

      /** System uptime in seconds or in a human-readable format if specified. */
      uptime: HR extends true ? string : number;
    };

    /** Process CPU usage */
    cpu: {
      /** CPU utilization in general */
      utilization: number;

      /** CPU model */
      model: string;
    };

    memory: {
      /** OS memory size in Megabytes */
      total: HR extends true ? string : number;

      /** Free OS memory in Bytes Megabytes */
      available: HR extends true ? string : number;

      /** OS memory usage in Megabytes */
      used: HR extends true ? string : number;

      /** Process memory rss in Megabytes */
      rss: HR extends true ? string : number;

      heap_total: HR extends true ? string : number;
      heap_used: HR extends true ? string : number;
    };
  }
}

declare global {
  namespace Utilities {}
}
