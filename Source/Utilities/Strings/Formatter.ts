/* eslint-disable sonarjs/cognitive-complexity */
import { format as FormatStr } from "node:util";
import { TitleCase } from "./Converter.js";
import { Vehicles } from "@Typings/Resources.js";
import ERLCAgeGroups from "@Resources/ERLCAgeGroups.js";

/**
 * Formats an input multiline string of charges into a properly formatted numbered list.
 * @param Input - The input string to format and formalize.
 * @param ReturnAsArray - If the returned value should be as an array or a string.
 * @returns The list of charges either a string or an array depending on the value of `ReturnAsArray` parameter.
 */
export function ListCharges<ReturnType extends boolean = false>(
  Input: string,
  ReturnAsArray?: ReturnType
): ReturnType extends true ? string[] : string {
  const Charges: string[] =
    Input.trim()
      .replace(/[^\S\n\r]+/g, " ")
      .match(/([^\n\r]+)/g) ?? [];

  if (!Charges.length || (Charges.length === 1 && Charges[0].trim() === "")) {
    return ReturnAsArray ? Charges : ("" as any);
  }

  if (
    Charges.length === 1 &&
    Charges[0].trim().match(/, *(?! *and )|(?:, *|(?<!hit *))and[\b ]/i)
  ) {
    const Modified = Charges[0]
      .trim()
      .replace(/(, *(?! *and )|(?:, *|(?<!hit *))and[\b ])/gi, "\n")
      .match(/[^\n\r]+/g);
    Charges.pop();
    Charges.push(...(Modified as RegExpMatchArray));
  }

  const FormattedCharges = Charges.filter((Charge) => {
    return !Charge.match(/^\s*[-+=#*] Statute/i);
  }).map((Charge, Index) => {
    const Modified = Charge.trim().match(/^(?:\d+\W|\*|-|#\d+:?)?\s?(.+)$/)?.[1];
    return `${Index + 1}. ${Modified}`;
  });

  return ReturnAsArray ? FormattedCharges : (FormattedCharges.join("\n") as any);
}

/**
 * Analyses every charge in the input array and assigns it a specific California statute (law code) if possible.
 * The following template string is being used:
 * ```yaml
 * "[ChargeShortDescription]\n  - Statute: [StatuteCodeAndSubdivisionIfApplicable] [CodeGroup]"
 * ```
 *
 * So an example of an assigned law code for a charge would be as the following:
 * 1. Eluding a Peace Officer: Disregarding Safety
 *     - Statute: § 2800.2(A) VC
 *
 * @todo Instead of relying solely on regex patterns to assign a law code to a charge, use a score-based approach.
 * @param Charges - The input array of charges (strings).
 * @returns An array of charges after adding statutes to them.
 * @example
 * const CapitalizedNumberedCharges = ["Evading a Peace Officer: Disregarding Safety", "2. Failure to Comply with a Peace Officer"];
 * console.log(AddStatutes(CapitalizedNumberedCharges));
 * // Output:
 * // ["1. Evading a Peace Officer: Disregarding Safety\n  - Statute: § 2800.2(A) VC",
 * //  "2. Failure to Comply with a Peace Officer\n  - Statute: § 69(A)/148(A) PC"]
 */
export function AddStatutes(this: any, Charges: Array<string>): Array<string> {
  if (
    Charges.length === 1 &&
    Charges[0].match(/, |\band\b/i) &&
    Charges[0].match(/hit\s+and\s+run/i) === null
  ) {
    return Charges;
  }

  /**
   * Creates a regular expression pattern that matches any of the given strings.
   * @param {string[]} Args - A rest parameter of type string[]. It allows the function to accept any number of string arguments.
   * @returns A combined regular expression object.
   */
  const ORRegExp = (...Args: string[]): RegExp => {
    return new RegExp(Args.join("|"), "i");
  };

  const LEORegexString = /(?:Officer|Peace Officer|\bPolice\b|\bLEO\b|\bPO\b)s?/.source;
  const Regexes = {
    Battery: /Batt[ea]ry/i,
    Bribery: /Brib[eau]ry|Brib(?:e|ing)/i,
    Assault: /A[su]{1,3}[alut]{2,4}|Stab(?:bing|bed)|\bADW(?:\b|[-+:#])/i,
    LERegex: /Officers?|Peace Officers?|\bPolice\b|\bLEO\b|\bPO\b/i,
    HitAndRun: /Hit(?: and | ?& ?)Run/i,
    AnyRobbery: /(?:\w+) Robber(?:y|ies)|Robb(?:ing|ery) (?:of|of an?|an?) \w+/i,
    // CRRobbery: /Cash Register Robber(?:y|ies)/i,
    Tampering: /(?:Damag(?:e|ing)|Tamper(?:ing)) (?:a |an |with )?(?:Car|Vehicle)s?/i,
    Vandalism: /Graffiti|Sabotage|Vandalism|Vandali[zs](?:ing|ed?|es) \w+|Defac(?:e|ing) \w+/i,
    Threatening: /Threat[ei]n(?:ing)?|Threats (?:to|my|for|about) \\w+/i,
    DWeaponRegex: /Deadly|Weapon|Firearm|(?:Hand )?Gun|Pistol|Rifle|Bat|Knife|Hammer/i,
    Impersonation: /Impersonating|False Personation/i,

    Kidnapping: ORRegExp("\\bKidnapp?(ing)?\\b", "Abduct(?:ion|ing)"),
    Burglary: ORRegExp("Burglary", "Breaking into (?:a |an )?(?:House|Residential)"),
    Murder: ORRegExp("\\bMurd[eua]r(?:ing)?\\b", "Homicide", "Killing .+"),

    Evasion: ORRegExp(
      "(?:Evasion|Evading|Fleeing)",
      "Vehicle (?:Fleeing|Eluding|Evasion)",
      "Fail(?:ing|ure|ed)? to (?:Stop|Pull|Pullover)",
      "(?:Running from|Elud(?:e|ing)|Evade) (?:an |a )?"
    ),

    Resisting: ORRegExp(
      "Refus(?:ing|ed|e) \\w+ Orders",
      "Resist(?:ing|ed)? (?:an |a )?Arrest",
      "Obstruct(?:ing|ion)(?: of)? Justice",
      "Fail(?:ing|ure|ed)? to (?:Comply|Follow)",
      `Not (?:Listening|Complying) (?:to|with) (?:an |a )?${LEORegexString}`,
      `(?:Resist(?:ing)?|Defy(?:ing)?|Obstruct(?:ing|ion)?|Interfer(?:e|ing)? with) (?:an |a |of \\w{1,2}? ?|)?(?:${LEORegexString}|Investigation)`
    ),

    AAF: ORRegExp(
      "(?:Helping|Helping out|Assisting) (?:a |an )?(?:Criminal|Offender|Lawbreaker)",
      "(?:Accessory|Involved|Conspiracy) (?:after|to|in|with) (?:the |a |an )?(?:Fact|Murder|Homicide|Crime|Robbery|Hostage|Assault)"
    ),

    InvalidLicense: ORRegExp(
      "(?:Expired|Suspended|Invalid) (?:Driving )?License",
      "Driving (?:W/o|Without) (?:a )?(?:Driving )?License",
      "(?:Unlawful|Illegal) to Drive (?:W/o|Without) (?:a )?(?:Driving |Valid (?:Driving )?)?License"
    ),

    RecklessDriving: ORRegExp(
      "Speeding",
      "Traffic Crimes",
      "Crashing into \\w+",
      "Endangerment of \\w+",
      "Driving Reckless(?:ly)?",
      "Dangerous(?:ly)? Driving",
      "Reckless(?:ly)? (?:Driving|Endangerment)",
      "(?:Public|Citizen|Resident) End[arng]+erment",
      "R[au]n(?:ning)? (?:Multiple )?(?:Red)? Lights",
      "(?:Disregard|Disregarding|Ignor(?:ed?|ing)?|No|W/o|Without) Safety"
    ),

    BrandishingFirearm: ORRegExp(
      "(?:Brandish(?:ing|e?s)?|Point(?:ing|s)?|Draw(?:ing|s)?) (?:of )?(?:a |an )?(?:Gun|Firearm|Weapon|Pistol|Rifle)",
      "(?:Brandish(?:ing|e?s)?|Point(?:ing|s)?|Draw(?:ing|s)?) (?:or |of )?(?:Exhibit(?:s|ing) )?(?:a |an )?(?:\\w+ )?(?:Gun|Firearm|Weapon|Pistol|Rifle)"
    ),

    Arson: ORRegExp(
      "Ars[oe]n",
      "Incendiarism",
      "Raising Fire",
      "Burn(?:ing|ed) \\w+",
      "Fire(?:-| )(?:setting|raising)"
    ),

    GrandTheft: ORRegExp(
      "Grand Theft",
      "(?:Jewelry|Bank|Jewelery|jew[elar]ry|House|Residential|\\bATM\\b) (?:Store )?Robber(?:y|ies)",
      "Robb(?:ing|ery) (?:of )?(?:a |an |the )?(?:)(?:Jewelry|Bank|Jewelery|jew[elar]ry|House|Residential|\\bATM\\b)"
    ),

    PBTools: ORRegExp(
      "(?:Possess(?:es|ion|ing)?|Carry(?:es|ing)?) (?:of )?Burglary (?:Tools?|Instruments?)"
    ),

    PIFirearms: ORRegExp(
      "(?:Unlawful |Illegal |Prohibited )?(?:Possess(?:es|ion|ing)?|Carr(?:y|ies|ying)) (?:of )?(?:a |an )?(?:Unlawful|Illegal|Prohibited) (?:Weapon|Gun|Firearm)s?"
    ),

    ShootingVB: ORRegExp(
      "Pop(?:ping)? (?:Vehicle(?:s.|s)? |Car(?:s.|s)? )?T[iy]res?",
      "Discharg(?:e|ing) of (?:a|an)?(?:Firearm|Gun|Weapon)",
      "Discharg(?:e|ing) (?:a )?(?:Firearm|Gun|Weapon) (?:at|on) (?:a |an )?(?:inhabited |Uninhabited |Unoccupied |Occupied )?(?:Vehicle?|Car?|Building?|Bank|Store?|Dwelling)s?",
      "(?:Shoot(?:ing)?|Fir(?:ing|e)) (?:on |at )?(?:a |an )?(?:Inhabited |Uninhabited |Unoccupied |Occupied )?(?:Police |PO(?:s.|s)? |LEO(?:.?s.|s)? |Officer(?:s.|s)? )?(?:Vehicle?|Car?|Building?|Bank|Store?|Dwelling)s?"
    ),

    AttemptMurder: ORRegExp(
      "(?:Trying|Attempt(?:ed|ing)?) (?:to )?(?:Kill|Murder|Homicide)",
      "(?:Shoot(?:ing)?|Fir(?:ing|e)|Discharg(?:e|ing)) (?:at |on )?(?:a |an )?(?:Officer|Peace Officer|Police|Civilian|\\bLEO\\b|\\bPO\\b)s?"
    ),

    FImprisonment: ORRegExp(
      "Hostage",
      "Restraint of Liberty",
      "(?:False|Unlawful) (?:Imprisonment|Confinement)",
      "(?:Forcing|Coercing) (?:Someone|Somebody|Civilian) (?:to Stay|to Remain)",
      "(?:Taking|Having) (?:a )?(?:Human(?:being)?|Person|Civilian|Officer|Police Officer|\\bPO\\b|\\bLEO\\b) (?:as |as a )?(?:Human )?(?:Shield|Hostage)"
    ),

    CSubstances: ORRegExp(
      "(?:Drug|Controlled Substance)s? (?:Possess(?:ion|ing)?|Carry(?:ing)?)",
      "(?:Possess(?:es|ion|ing)?|Carry(?:es|ing)?) (?:of |of a )?(?:Controlled Substance|Drug)s?"
    ),

    FInformation_TC: ORRegExp(
      "(?:Giv(?:e|es|ing) |Show(?:s|ing)? )?(?:a )?( ?:False|Incorrect|Invalid) (?:(?:Driving )?License|(?:Car |Vehicle )?Registration|(?:Car |Vehicle )?Insurance)" +
        " to (?:a |an )?" +
        LEORegexString
    ),

    FInformation_NTC: ORRegExp(
      "(?:Giv(?:e|es|ing) |Show(?:s|ing)? )?(?:a )?(?:False|Incorrect|Invalid) (?:\\bID\\b|Identification)",
      " to (?:a |an )?" + LEORegexString
    ),

    Trespassing: ORRegExp(
      "Trespass(?:ing|ed?)?",
      "(?:Unauthorized Entry|Illegal Entry)",
      "Refus(?:ing|ed?) to Leave (?:a |an |the )?(?:\\w+ )?(?:Property|Building|Store|Shop)"
    ),

    FirearmInPublic: ORRegExp(
      "(Conceal(?:ed|ing)?|Loaded) (?:Firearm|Weapon|Gun|Pistol|Rifle)",
      "(?:Possess(?:es|ion|ing)?|Carry(?:es|ing)?) (?:a |of |of a )?(?:Concealed |Loaded )?(?:Firearm|Weapon|Gun|Pistol|Rifle)"
    ),
  };

  for (let i = 0; i < Charges.length; i++) {
    const AddChargeStatute = FormatStr.bind(this, "%s\n  - Statute: § %s %s");
    const Charge = Charges[i];

    // Assault/Stabbing charge statute codes
    if (Regexes.Assault.test(Charge)) {
      if (Regexes.DWeaponRegex.test(Charge)) {
        if (Charge.match(/(?:Not|Other than) (?:a )?(?:Firearm|(?:Hand )?Gun|F\/ARM)/i)) {
          if (Regexes.LERegex.test(Charge)) {
            Charges[i] = AddChargeStatute(Charge, "245(C)", "PC");
          } else {
            Charges[i] = AddChargeStatute(Charge, "245(A)(1)", "PC");
          }
        } else if (Regexes.LERegex.test(Charge)) {
          Charges[i] = AddChargeStatute(Charge, "245(D)", "PC");
        } else {
          Charges[i] = AddChargeStatute(Charge, "245(B)", "PC");
        }
      } else if (Regexes.LERegex.test(Charge)) {
        Charges[i] = AddChargeStatute(Charge, "240/241(C)", "PC");
      } else {
        Charges[i] = AddChargeStatute(Charge, "240", "PC");
      }
      continue;
    }

    // Battery
    if (Regexes.Battery.test(Charge)) {
      if (Regexes.LERegex.test(Charge)) {
        Charges[i] = AddChargeStatute(Charge, "243(B)", "PC");
      } else {
        Charges[i] = AddChargeStatute(Charge, "242", "PC");
      }
      continue;
    }

    // Evasion and Fleeing
    if (Regexes.Evasion.test(Charge)) {
      let Continue = false;
      if (Regexes.RecklessDriving.test(Charge) || /Felony/i.test(Charge)) {
        Charges[i] = AddChargeStatute(Charge, "2800.2(A)", "VC");
        Continue = true;
      } else {
        for (const RCharge of Charges) {
          if (Regexes.RecklessDriving.test(RCharge)) {
            Charges[i] = AddChargeStatute(Charge, "2800.2(A)", "VC");
            Continue = true;
            break;
          }
        }
      }
      if (!Continue) {
        Charges[i] = AddChargeStatute(Charge, "2800", "VC");
      }
      continue;
    }

    // Resisting a Peace Officer
    if (Regexes.Resisting.test(Charge)) {
      Charges[i] = AddChargeStatute(Charge, "69(A)/148(A)", "PC");
      continue;
    }

    // Reckless Driving
    if (Regexes.RecklessDriving.test(Charge)) {
      Charges[i] = AddChargeStatute(Charge, "23103", "VC");
      continue;
    }

    // Drawing a Firearm in Threatening Manner
    if (Regexes.BrandishingFirearm.test(Charge)) {
      if (Regexes.LERegex.test(Charge)) {
        Charges[i] = AddChargeStatute(Charge, "417(C)", "PC");
      } else {
        Charges[i] = AddChargeStatute(Charge, "417(A)(1)", "PC");
      }
      continue;
    }

    // Threatening Charge
    if (Regexes.Threatening.test(Charge)) {
      if (Regexes.LERegex.test(Charge)) {
        Charges[i] = AddChargeStatute(Charge, "71", "PC");
      } else {
        Charges[i] = AddChargeStatute(Charge, "422(A)", "PC");
      }
      continue;
    }

    // Accessory After the Fact; Unlawfully Helping a Criminal
    if (Regexes.AAF.test(Charge)) {
      Charges[i] = AddChargeStatute(Charge, "32", "PC");
      continue;
    }

    // Arson; Setting a Building/Property on Fire With the Intent
    if (Regexes.Arson.test(Charge)) {
      Charges[i] = AddChargeStatute(Charge, "451", "PC");
      continue;
    }

    // Bribery Charge
    if (Regexes.Bribery.test(Charge)) {
      Charges[i] = AddChargeStatute(Charge, "67", "PC");
      continue;
    }

    // Any robbery charge
    if (Regexes.AnyRobbery.test(Charge)) {
      if (
        Charge.match(/Robberies/i) ||
        Charge.match(/Bank|\bATM\b/i) ||
        Charge.match(/x[2-9]\d?/i)
      ) {
        Charges[i] = AddChargeStatute(Charge, "487", "PC");
      } else {
        Charges[i] = AddChargeStatute(Charge, "211", "PC");
      }
      continue;
    }

    // Grand theft; Jewelry Store, Bank, and ATM Robberies
    if (Regexes.GrandTheft.test(Charge)) {
      Charges[i] = AddChargeStatute(Charge, "487", "PC");
      continue;
    }

    // Driving Without a Valid License
    if (Regexes.InvalidLicense.test(Charge)) {
      Charges[i] = AddChargeStatute(Charge, "12500", "VC");
      continue;
    }

    // Possession of Burglary Tools
    if (Regexes.PBTools.test(Charge)) {
      Charges[i] = AddChargeStatute(Charge, "466", "PC");
      continue;
    }

    // House/Residential Burglary Charge
    if (Regexes.Burglary.test(Charge)) {
      Charges[i] = AddChargeStatute(Charge, "459/460(A)", "PC");
      continue;
    }

    // Illegal Possession of Weapon(s)
    if (Regexes.PIFirearms.test(Charge)) {
      Charges[i] = AddChargeStatute(Charge, "12020", "PC");
      continue;
    }

    // Attempt Murder Charges
    if (Regexes.AttemptMurder.test(Charge)) {
      if (Regexes.LERegex.test(Charge)) {
        Charges[i] = AddChargeStatute(Charge, "664(E)/187(A)", "PC");
      } else {
        Charges[i] = AddChargeStatute(Charge, "664/187(A)", "PC");
      }
      continue;
    }

    // Shooting on Vehicles/Buildings
    if (Regexes.ShootingVB.test(Charge)) {
      if (Charge.match(/Occupied|Inhabited/i) || Regexes.LERegex.test(Charge)) {
        Charges[i] = AddChargeStatute(Charge, "246", "PC");
      } else {
        Charges[i] = AddChargeStatute(Charge, "247(B)", "PC");
      }
      continue;
    }

    // Murder Charge
    if (Regexes.Murder.test(Charge)) {
      Charges[i] = AddChargeStatute(Charge, "187(A)", "PC");
      continue;
    }

    // Kidnapping Charge
    if (Regexes.Kidnapping.test(Charge)) {
      Charges[i] = AddChargeStatute(Charge, "209", "PC");
      continue;
    }

    // False Imprisonment
    if (Regexes.FImprisonment.test(Charge)) {
      Charges[i] = AddChargeStatute(Charge, "210.5", "PC");
      continue;
    }

    // Impersonation of someone
    if (Regexes.Impersonation.test(Charge)) {
      if (Regexes.LERegex.test(Charge)) {
        Charges[i] = AddChargeStatute(Charge, "538(D)", "PC");
      } else {
        Charges[i] = AddChargeStatute(Charge, "529(A)", "PC");
      }
      continue;
    }

    // Controlled Substances
    if (Regexes.CSubstances.test(Charge)) {
      Charges[i] = AddChargeStatute(Charge, "11350(A)", "HS");
      continue;
    }

    // Hit and Run Charge
    if (Regexes.HitAndRun.test(Charge)) {
      Charges[i] = AddChargeStatute(Charge, "20001/20002", "VC");
      continue;
    }

    // Tamper With Vehicles With Intent
    if (Regexes.Tampering.test(Charge)) {
      Charges[i] = AddChargeStatute(Charge, "10852", "VC");
      continue;
    }

    // Vandalism; Damaging Public/Others' Properties
    if (Regexes.Vandalism.test(Charge)) {
      Charges[i] = AddChargeStatute(Charge, "594", "PC");
      continue;
    }

    // Giving False Information to a Peace Officer
    if (Regexes.FInformation_NTC.test(Charge) || Regexes.FInformation_TC.test(Charge)) {
      if (Charge.match(/Pulled Over|Traffic Stop/i) && Regexes.FInformation_TC.test(Charge)) {
        Charges[i] = AddChargeStatute(Charge, "31", "VC");
      } else {
        Charges[i] = AddChargeStatute(Charge, "148.9", "PC");
      }
      continue;
    }

    // Trespassing in a Private Property or at an Illegal Location
    if (Regexes.Trespassing.test(Charge)) {
      Charges[i] = AddChargeStatute(Charge, "602", "PC");
      continue;
    }

    // Carrying a Firearm in Public Without a CCW (California Concealed Carry) Permit
    if (Regexes.FirearmInPublic.test(Charge)) {
      if (Charge.match(/Conceal(?:ed|ing)?|Hidden|Covered|Invisible/i)) {
        if (Charge.match(/Loaded/i)) {
          Charges[i] = AddChargeStatute(Charge, "25850(A)", "PC");
        } else {
          Charges[i] = AddChargeStatute(Charge, "25400(A)", "PC");
        }
      } else {
        Charges[i] = AddChargeStatute(Charge, "25850(A)", "PC");
      }
    }
  }
  return Charges;
}

/**
 * Formats a user input of charges text for an arrest report.
 * @param Input - The input charges text to format and formalize.
 * @returns A formatted and number listed charges with its penal codes.
 */
export function FormatCharges(Input: string): string {
  const Titled = TitleCase(Input, true);
  const Listed = ListCharges(Titled, true);
  return AddStatutes(Listed).join("\n");
}

/**
 * Properly formats an input height if it is incomplete or mistyped.
 * @param Input - The input height string.
 * @returns If succeeded, a height in the format `x'y"`; should be a maximum of `7'11"` (not enforced).
 * @example
 * FormatHeight("7")  // returns the string 7'0"
 * FormatHeight("6 ft 1 in")  // returns the string 6'1"
 * FormatHeight("5 feet 11 inches")  // returns the string 5'11"
 */
export function FormatHeight(Input: string): string {
  const Sanitized = Input.trim().replace(/\s+/g, " ");
  if (Sanitized.match(/^[1-9]+'(\d|1[01])"$/)) {
    return Sanitized.match(/^(?:[8-9]|[1-9]\d+)/) ? "7'11\"" : Sanitized;
  }

  if (Sanitized.match(/^\d+$/)) {
    return `${Sanitized}'0"`;
  } else if (Sanitized.match(/^\d'$/)) {
    return `${Sanitized}0"`;
  } else if (Sanitized.match(/^\d'\d+$/)) {
    return `${Sanitized}"`;
  } else if (Sanitized.match(/^\d\D+\d+\D*$/)) {
    const Matches = Sanitized.match(/^(\d)\D+(\d+)\D*$/);
    const Feet = Matches![1];
    const Inches = Matches![2];
    return `${Feet}'${Inches}"`;
  }

  return Input;
}

/**
 * Parses a given age integer into a string representation.
 * @param AgeInteger - The age integer as a number or string; `1`, `2`, `3`, `4` or `5`.
 * @returns - The age category string if the input is within the enum range; `"[Unknown]"` otherwise.
 * @enum
 *  - [1]: Kid (<13);
 *  - [2]: Teen (13-19);
 *  - [3]: Young Adult (20-29);
 *  - [4]: Mid Adult (30-49);
 *  - [5]: Senior (50+);
 */
export function FormatAge(AgeInteger: number | string): string {
  AgeInteger = +AgeInteger;
  return ERLCAgeGroups.find((AG) => AG.value === AgeInteger)?.name || "[Unknown]";
}

/**
 * Converts a given multiline string or an array of strings into a formatted unordered list where each line is prefixed with a hyphen.
 * @param {string | string[]} Input
 * @returns
 */
export function UnorderedList(Input: string | string[]): string {
  if (!Input.length) return Input.toString();
  const Lines = Array.isArray(Input) ? Input : Input.split(/\r?\n/);
  return Lines.map((Line) => (Line ? `- ${Line}` : "")).join("\n");
}

/**
 * Returns a formatted string representation of the user's username, display name as well as the id if requested.
 * @param UserData - The basic user data; display name if available, username, and id if also available.
 * @param IncludeId - Whether to include the user's id in the string (e.g. `"... [000000]"`).
 * @returns
 * @example
 * const UserData = {
 *   name: "builderman_fifty",
 *   display_name: "Builderman",
 *   id: 5010050100,
 * }
 *
 * // returns "Builderman (@builderman_fifty)"
 * FormatUsername(UserData);
 *
 * // returns "Builderman (@builderman_fifty) [5010050100]"
 * FormatUsername(UserData, true);
 */
export function FormatUsername(
  UserData: { name: string; display_name?: string; id?: string | number },
  IncludeId?: boolean
): string {
  if (UserData.name) {
    const Formatted = `${UserData.display_name ?? UserData.name} (@${UserData.name})`;
    if (IncludeId && UserData.id) {
      return `${Formatted} [${UserData.id}]`;
    } else {
      return Formatted;
    }
  }
  return "[Invalid]";
}

/**
 * Returns a formatted name for a given vehicle model and its brand details.
 * Vehicle model name string should be always defined and not empty for a proper result.
 * @param Model - The vehicle model data.
 * @param Brand - The brand of the vehicle model including its counterpart (ER:LC alias).
 * @returns A vehicle name in the format:
 * `[OriginalModelYear] [BrandName] [ModelName] ([AltModelYear] [BrandAlias] [ModelAlias])`.
 * @example
 * const Model = {
     name: "A-100",
     alias: "F-150",
     model_year: { org: "2022", alt: "2021" },
   };

   const Brand = {
     name: "Brand-X",
     alias: "BX",
   };

   // returns "2022 Brand-X A-100 (2021 BX F-150)"
   FormatVehicleName(Model, Brand);
 */
export function FormatVehicleName(
  Model: Omit<Vehicles.VehicleModel, "category" | "class" | "style">,
  Brand: { name: string; alias: string }
): string {
  const OrgMYear = Model.model_year.org ? `${Model.model_year.org} ` : "";
  const AltMYear = Model.model_year.alt ? `${Model.model_year.alt} ` : "";
  const BrandName = Brand.name ? `${Brand.name} ` : "";
  const BrandAlias = Brand.alias ? `${Brand.alias} ` : "";
  const Formatted = FormatStr(
    "%s%s%s (%s%s%s)",
    OrgMYear,
    BrandName,
    Model.name,
    AltMYear,
    BrandAlias,
    Model.alias
  );

  return /^[\s()]+$/.test(Formatted) ? "" : Formatted;
}

/**
 * Escapes special characters in a string so that it can be used in a regular expression.
 * @see {@link https://stackoverflow.com/q/3561493 Stack Overflow Reference}
 * @param Str - The string to escape.
 * @returns
 * @example
 * console.log(escapeRegExp("Hello [World]!"));  // Output: Hello \[World\]\!
 * console.log(escapeRegExp("123.456"));  // Output: 123\.456
 */
export function EscapeRegExp(Str: string): string {
  return Str.replace(/[-[\]{}()*+!<=:?./\\^$|]/g, "\\$&");
}
