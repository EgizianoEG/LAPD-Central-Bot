/* eslint-disable sonarjs/cognitive-complexity */
import { format as FormatStr } from "node:util";
import { TitleCase } from "./Converter.js";
import { Vehicles } from "@Typings/Resources.js";

/**
 * Formats a given string of charges into a properly formatted numbered list.
 * @param Input - The string to list.
 * @param RAsArray - If the returned value should be as an array.
 * @return The list of charges either a string or an array.
 */
export function ListCharges<ReturnType extends boolean = false>(
  Input: string,
  RAsArray?: ReturnType
): ReturnType extends true ? string[] : string {
  const Charges: string[] = Input.match(/([^\n\r]+)/g) ?? [];
  let FormattedCharges: string[] = [];

  if (Charges.length === 0) {
    return RAsArray ? FormattedCharges : (Input as any);
  }

  if (
    Charges.length === 1 &&
    Charges[0].match(/, |and/i) &&
    Charges[0].match(/hit and run/i) === null
  ) {
    if (RAsArray) {
      Charges.push(true as any);
      return Charges as any;
    } else {
      return Charges.join() as any;
    }
  }

  FormattedCharges = Charges.filter((Charge) => {
    return !Charge.match(/^\s*[-*#] Statute/i);
  }).map((Charge, Index) => {
    const Modified = Charge.trim()
      .replace(/\s+/g, " ")
      .match(/^(?:\d+\W|\*|-|#\d+:?)? ?(.+)$/)?.[1];
    return `${Index + 1}. ${Modified}`;
  });

  return RAsArray ? FormattedCharges : (FormattedCharges.join("\n") as any);
}

/**
 * Adds statutes (law codes) that should apply to every listed charge.
 * @param Charges - The input array of charges.
 * @return - The list of charges after adding statutes.
 */
export function AddStatutes(Charges: Array<string>): Array<string> {
  if (!Array.isArray(Charges)) return Charges;
  if (Charges.includes(true as any)) {
    Charges.pop();
    return Charges;
  }

  const LEORegexString = /(?:Officer|Peace Officer|Police|\\bLEO\\b|\\bPO\\b)s?/.source;
  const DefaultFlags = "i";
  const Regexes = {
    Battery: /Batt[ea]ry/i,
    HitAndRun: /Hit(?: and | ?& ?)Run/i,
    CRRobbery: /Cash Register Robber(?:y|ies)/i,
    Tampering: /(?:Damag(?:e|ing)|Tamper(?:ing)) (?:a |an |with )?(?:Car|Vehicle)s?/i,
    Vandalism: /Graffiti|Sabotage|Vandalism|Vandali[zs](?:ing|ed?|es) \w+|Defac(?:e|ing) \w+/i,
    Threatening: /Threat[ei]n(?:ing)?|Threats to \\w+/i,
    Bribery: /Brib[eau]ry|Brib(?:e|ing)/i,

    LERegex: /Officers?|Peace Officers?|Police|\bLEO\b|\bPO\b/,
    DWeaponRegex: /Deadly|Weapon|Firearm|Gun|Pistol|Rifle|Bat|Knife|Hammer/i,

    Evasion: new RegExp(
      "(?:Evasion|Evading)|" +
        "Vehicle (?:Fleeing|Eluding|Evasion)|" +
        "(?:Running from|Elud(?:e|ing)|Evade) (?:an |a )?",
      DefaultFlags
    ),

    Resisting: new RegExp(
      "Fail(?:ing|ure)? to Comply|" +
        "Resist(?:ing)? (?:an |a )?Arrest|" +
        "Obstruct(?:ing|ion)(?: of)? Justice|" +
        `Not (?:Listening|Complying) (?:to|with) (?:an |a )?${LEORegexString}|` +
        `(?:Resist(?:ing)?|Defy(?:ing)?|Obstruct(?:ing|ion)?|Interfer(?:e|ing)? with) (?:an |a )?${LEORegexString}`,
      DefaultFlags
    ),

    AAF: new RegExp(
      "Accessory (?:after|in) (?:the |a )?(?:Fact|Murder|Crime|Robbery)|" +
        "(?:Helping|Helping out|Assisting) (?:a |an )?(?:Criminal|Offender|Lawbreaker)",
      DefaultFlags
    ),

    InvalidLicense: new RegExp(
      "(?:Expired|Suspended|Invalid) (?:Driving )?License|" +
        "Driving (?:W/o|Without) (?:a )?(?:Driving )?License|" +
        "(?:Unlawful|Illegal) to Drive (?:W/o|Without) (?:a )?(?:Driving |Valid (?:Driving )?)?License",
      DefaultFlags
    ),

    Assault: new RegExp("A[su]{1,2}[alut]{2,4}|" + "Stab(?:bing|bed)|" + "\\bADW\\b", DefaultFlags),

    RecklessDriving: new RegExp(
      "Traffic Crimes|" +
        "Crashing into \\w+|" +
        "Endangerment of \\w+|" +
        "Driving Reckless(?:ly)?|" +
        "Dangerous(?:ly)? Driving|" +
        "Reckless(?:ly)? (?:Driving|Endangerment)|" +
        "Run(?:ning)? (?:Multiple )?(?:Red)? Lights|" +
        "(?:Disregard|Disregarding|Ignor(?:ed?|ing)?|No|W/o|Without) Safety",
      DefaultFlags
    ),

    BrandishingFirearm: new RegExp(
      "(?:Brandish(?:ing|e?s)?|Point(?:ing|s)?|Draw(?:ing|s)?) (?:a |an )?(?:Gun|Firearm|Weapon|Pistol|Rifle)|" +
        "(?:Brandish(?:ing|e?s)?|Point(?:ing|s)?|Draw(?:ing|s)?) (?:or )?(?:Exhibit(?:s|ing) )?(?:a |an )?(?:\\w+ )?(?:Gun|Firearm|Weapon|Pistol|Rifle)",
      DefaultFlags
    ),

    Arson: new RegExp(
      "Ars[oe]n|" + "Incendiarism|" + "Burn(?:ing) \\w+|" + "Fire(?:-| )(?:setting|raising)",
      DefaultFlags
    ),

    GrandTheft: new RegExp(
      "Grand Theft|" +
        "(?:Jewelry|Bank|Jewelery|jew[elar]ry|House|Residential|\\bATM\\b) (?:Store )?Robber(?:y|ies)",
      DefaultFlags
    ),

    PBTools: new RegExp(
      "(?:Possess(?:es|ion|ing)?|Carry(?:es|ing)?) (?:of )?Burglary (?:Tools?|Instruments?)",
      DefaultFlags
    ),

    Burglary: new RegExp(
      "Burglary|" + "Breaking into (?:a |an )?(?:House|Residential)",
      DefaultFlags
    ),

    PIFirearms: new RegExp(
      "(?:Unlawful |Illegal |Prohibited )?(?:Possess(?:es|ion|ing)?|Carr(?:y|ies|ying)) (?:of )?(?:a |an )?(?:Unlawful|Illegal|Prohibited) (?:Weapon|Gun|Firearm)s?",
      DefaultFlags
    ),

    ShootingVB: new RegExp(
      "Pop(?:ping)? (?:Vehicle(?:s.|s)? |Car(?:s.|s)? )?T[iy]res?|" +
        "Discharg(?:e|ing) of (?:a|an)?(?:Firearm|Gun|Weapon)|" +
        "Discharg(?:e|ing) (?:a )?(?:Firearm|Gun|Weapon) (?:at|on) (?:a |an )?(?:inhabited |Uninhabited |Unoccupied |Occupied )?(?:Vehicle?|Car?|Building?|Bank|Store?|Dwelling)s?|" +
        "(?:Shoot(?:ing)?|Fir(?:ing|e)) (?:on |at )?(?:a |an )?(?:Inhabited |Uninhabited |Unoccupied |Occupied )?(?:Police |PO(?:s.|s)? |LEO(?:.?s.|s)? |Officer(?:s.|s)? )?(?:Vehicle?|Car?|Building?|Bank|Store?|Dwelling)s?",
      DefaultFlags
    ),

    AttemptMurder: new RegExp(
      "(?:Trying|Attempt(?:ed|ing)?) (?:to )?(?:Kill|Murder|Homicide)|" +
        "(?:Shoot(?:ing)?|Fir(?:ing|e)|Discharg(?:e|ing)) (?:at |on )?(?:a |an )?(?:Officer|Peace Officer|Police|Civilian|\\bLEO\\b|\\bPO\\b)s?",
      DefaultFlags
    ),

    Murder: new RegExp("\\bMurd[eua]r(?:ing)?\\b|" + "Homicide|" + "Killing .+", DefaultFlags),

    Kidnapping: new RegExp("\\bKidnapp?(ing)?\\b|" + "Abduct(?:ion|ing)", DefaultFlags),

    FImprisonment: new RegExp(
      "Hostage|" +
        "False Imprisonment|" +
        "Taking (?:a )?(?:Human(?:being)?|Person|Civilian|\\bPO\\b|\\bLEO\\b) (?:as |as a )?Shield",
      DefaultFlags
    ),

    CSubstances: new RegExp(
      "(?:Drug|Controlled Substance)s? (?:Possess(?:ion|ing)?|Carry(?:ing)?)|" +
        "(?:Possess(?:es|ion|ing)?|Carry(?:es|ing)?) (?:of |of a )?(?:Controlled Substance|Drug)s?",
      DefaultFlags
    ),

    FInformation_TC: new RegExp(
      "(?:Giv(?:e|es|ing) |Show(?:s|ing)? )?(?:a )?( ?:False|Incorrect|Invalid) (?:(?:Driving )?License|(?:Car |Vehicle )?Registration|(?:Car |Vehicle )?Insurance)" +
        " to (?:a |an )?(?:Officer|Peace Officer|Police|\\bLEO\\b|\\bPO\\b)s?",
      DefaultFlags
    ),

    FInformation_NTC: new RegExp(
      "(?:Giv(?:e|es|ing) |Show(?:s|ing)? )?(?:a )?(?:False|Incorrect|Invalid) (?:\\bID\\b|Identification)" +
        " to (?:a |an )?(?:Officer|Peace Officer|Police|\\bLEO\\b|\\bPO\\b)s?",
      DefaultFlags
    ),

    Trespassing: new RegExp(
      "Trespass(?:ing)?|" +
        "Refus(?:ed?|ing) to Leave (?:a |an |the )?(?:\\w+ )?(?:Property|Building|Store|Shop)",
      DefaultFlags
    ),

    FirearmInPublic: new RegExp(
      "(?:Possess(?:es|ion|ing)?|Carry(?:es|ing)?) (?:a |of |of a )?(?:Concealed |Loaded )?(?:Firearm|Weapon|Gun|Pistol|Rifle)|" +
        "(Conceal(?:ed|ing)?|Loaded) (?:Firearm|Weapon|Gun|Pistol|Rifle)",
      DefaultFlags
    ),
  };

  // Analyses every charge and assigns every charge a specific law code
  for (let i = 0; i < Charges.length; i++) {
    const Charge = Charges[i];
    let Continue = false;

    // Assault/Stabbing charges
    if (Charge.match(Regexes.Assault)) {
      if (Charge.match(Regexes.DWeaponRegex)) {
        if (Charge.match(/(?:Not|Other than) (?:a )?(?:Firearm|Gun|F\/ARM)/i)) {
          if (Charge.match(Regexes.LERegex)) {
            Charges[i] = `${Charge}\n  - Statute: 245(C) PC`;
          } else {
            Charges[i] = `${Charge}\n  - Statute: 245(A)(1) PC`;
          }
        } else {
          if (Charge.match(Regexes.LERegex)) {
            Charges[i] = `${Charge}\n  - Statute: 245(D) PC`;
          } else {
            Charges[i] = `${Charge}\n  - Statute: 245(B) PC`;
          }
        }
      } else {
        if (Charge.match(Regexes.LERegex)) {
          Charges[i] = `${Charge}\n  - Statute: 240/241(C) PC`;
        } else {
          Charges[i] = `${Charge}\n  - Statute: 240 PC`;
        }
      }
      continue;
    }

    // Battery charge
    if (Charge.match(Regexes.Battery)) {
      if (Charge.match(Regexes.LERegex)) {
        Charges[i] = `${Charge}\n  - Statute: 243(B) PC`;
      } else {
        Charges[i] = `${Charge}\n  - Statute: 242 PC`;
      }
      continue;
    }

    // Evasion and fleeing
    if (Charge.match(Regexes.Evasion)) {
      if (Charge.match(Regexes.RecklessDriving)) {
        Charges[i] = `${Charge}\n  - Statute: 2800.2(A) VC`;
        Continue = true;
      } else {
        for (const RCharge of Charges) {
          if (RCharge.match(Regexes.RecklessDriving)) {
            Charges[i] = `${Charge}\n  - Statute: 2800.2(A) VC`;
            Continue = true;
            break;
          }
        }
      }
      if (!Continue) {
        Charges[i] = `${Charge}\n  - Statute: 2800 VC`;
      }
      continue;
    }

    // Resisting a peace officer
    if (Charge.match(Regexes.Resisting)) {
      Charges[i] = `${Charge}\n  - Statute: 69(A)/148(A) PC`;
      continue;
    }

    // Reckless driving
    if (Charge.match(Regexes.RecklessDriving)) {
      Charges[i] = `${Charge}\n  - Statute: 23103 VC`;
      continue;
    }

    // Drawing a firearm in threatening manner
    if (Charge.match(Regexes.BrandishingFirearm)) {
      if (Charge.match(Regexes.LERegex)) {
        Charges[i] = `${Charge}\n  - Statute: 417(C) PC`;
      } else {
        Charges[i] = `${Charge}\n  - Statute: 417(A)(1) PC`;
      }
      continue;
    }

    // Threatening
    if (Charge.match(Regexes.Threatening)) {
      if (Charge.match(Regexes.LERegex)) {
        Charges[i] = `${Charge}\n  - Statute: 71 PC`;
      } else {
        Charges[i] = `${Charge}\n  - Statute: 422(A) PC`;
      }
      continue;
    }

    // Accessory after the fact: unlawfully helping a criminal
    if (Charge.match(Regexes.AAF)) {
      Charges[i] = `${Charge}\n  - Statute: 32 PC`;
      continue;
    }

    // Arson: setting a building/property on fire
    if (Charge.match(Regexes.Arson)) {
      Charges[i] = `${Charge}\n  - Statute: 451 PC`;
      continue;
    }

    // Bribery charge
    if (Charge.match(Regexes.Bribery)) {
      Charges[i] = `${Charge}\n  - Statute: 67 PC`;
      continue;
    }

    // Cash register robbery
    if (Charge.match(Regexes.CRRobbery)) {
      if (Charge.match(/Robberies/i) || Charge.match(/x[2-9]\d?/i)) {
        Charges[i] = `${Charge}\n  - Statute: 487 PC`;
      } else {
        Charges[i] = `${Charge}\n  - Statute: 211 PC`;
      }
      continue;
    }

    // Grand theft: Jewelry store, bank, and ATM robberies
    if (Charge.match(Regexes.GrandTheft)) {
      Charges[i] = `${Charge}\n  - Statute: 487 PC`;
      continue;
    }

    // Driving without a valid license
    if (Charge.match(Regexes.InvalidLicense)) {
      Charges[i] = `${Charge}\n  - Statute: 12500 VC`;
      continue;
    }

    // Possession of burglary tools
    if (Charge.match(Regexes.PBTools)) {
      Charges[i] = `${Charge}\n  - Statute: 466 PC`;
      continue;
    }

    // House/residential burglary charge
    if (Charge.match(Regexes.Burglary)) {
      Charges[i] = `${Charge}\n  - Statute: 459/460(A) PC`;
      continue;
    }

    // Possession of illegal weapon(s)
    if (Charge.match(Regexes.PIFirearms)) {
      Charges[i] = `${Charge}\n  - Statute: 12020 PC`;
      continue;
    }

    // Attempt murder
    if (Charge.match(Regexes.AttemptMurder)) {
      if (Charge.match(Regexes.LERegex)) {
        Charges[i] = `${Charge}\n  - Statute: 664(E)/187(A) PC`;
      } else {
        Charges[i] = `${Charge}\n  - Statute: 664/187(A) PC`;
      }
      continue;
    }

    // Shooting on vehicles/buildings
    if (Charge.match(Regexes.ShootingVB)) {
      if (Charge.match(/Occupied|Inhabited/i) || Charge.match(Regexes.LERegex)) {
        Charges[i] = `${Charge}\n  - Statute: 246 PC`;
      } else {
        Charges[i] = `${Charge}\n  - Statute: 247(B) PC`;
      }
      continue;
    }

    // Murder
    if (Charge.match(Regexes.Murder)) {
      Charges[i] = `${Charge}\n  - Statute: 187(A) PC`;
      continue;
    }

    // Kidnapping
    if (Charge.match(Regexes.Kidnapping)) {
      Charges[i] = `${Charge}\n  - Statute: 209 PC`;
      continue;
    }

    // False imprisonment
    if (Charge.match(Regexes.FImprisonment)) {
      Charges[i] = `${Charge}\n  - Statute: 210.5 PC`;
      continue;
    }

    // Controlled substances
    if (Charge.match(Regexes.CSubstances)) {
      Charges[i] = `${Charge}\n  - Statute: 11350(A) HS`;
      continue;
    }

    // Hit and run
    if (Charge.match(Regexes.HitAndRun)) {
      Charges[i] = `${Charge}\n  - Statute: 20001/20002 VC`;
      continue;
    }

    // Tamper with vehicles
    if (Charge.match(Regexes.Tampering)) {
      Charges[i] = `${Charge}\n  - Statute: 10852 VC`;
      continue;
    }

    // Vandalism: damaging public/others' properties
    if (Charge.match(Regexes.Vandalism)) {
      Charges[i] = `${Charge}\n  - Statute: 594 PC`;
      continue;
    }

    // False information to a peace officer
    // (not in a traffic stop)
    if (Charge.match(Regexes.FInformation_NTC)) {
      if (Charge.match(/Pulled Over|Traffic Stop/i)) {
        Charges[i] = `${Charge}\n  - Statute: 31 VC`;
      } else {
        Charges[i] = `${Charge}\n  - Statute: 148.9 PC`;
      }
      continue;
    }

    // False information to a peace officer
    // (Traffic stop: license, registration, etc..)
    if (Charge.match(Regexes.FInformation_TC)) {
      Charges[i] = `${Charge}\n  - Statute: 31 VC`;
      continue;
    }

    // Trespassing
    if (Charge.match(Regexes.Trespassing)) {
      Charges[i] = `${Charge}\n  - Statute: 602 PC`;
      continue;
    }

    // Carrying a firearm in public without a CCW (Concealed Carry) Permit
    if (Charge.match(Regexes.FirearmInPublic)) {
      if (Charge.match(/Conceal(?:ed|ing)?|Hidden|Covered|Invisible/i)) {
        if (Charge.match(/Loaded/i)) {
          Charges[i] = `${Charge}\n  - Statute: 25850(A) PC`;
        } else {
          Charges[i] = `${Charge}\n  - Statute: 25400(A) PC`;
        }
      } else {
        Charges[i] = `${Charge}\n  - Statute: 25850(A) PC`;
      }
    }
  }
  return Charges;
}

/**
 * Formats a given charges text for arrest report
 * @param ChargesText - The input charges text
 * @return - The list of charges after adding statutes
 */
export function FormatCharges(ChargesText: string): string {
  const Titled = TitleCase(ChargesText, true);
  const Listed = ListCharges(Titled, true);
  return AddStatutes(Listed).join("\n");
}

/**
 * Properly formats an input height if it is incomplete or mistyped
 * @param Input - The input height
 * @returns - The properly formatted height
 */
export function FormatHeight(Input: string): string {
  if (typeof Input !== "string") return Input;
  if (Input.match(/^[1-7]'(\d|1[01])"$/)) {
    return Input.match(/^[8-9]/) ? "7'0\"" : Input;
  }

  if (Input.match(/^\d+$/)) {
    return Input + "'0\"";
  } else if (Input.match(/^\d'$/)) {
    return `${Input}0"`;
  } else if (Input.match(/^\d'\d+$/)) {
    return `${Input}"`;
  } else if (Input.match(/^\d[^\d]+\d+[^\d]*$/)) {
    const Matches = Input.match(/^(\d)[^\d]+(\d+)[^\d]*$/);
    const Feet = Matches?.[1];
    const Inches = Matches?.[2];
    return `${Feet}'${Inches}"`;
  }

  return Input;
}

/**
 * Parses a given age integer into a string representation
 * @param AgeInteger - The age integer [1-5]; defaults to `3`
 * @returns - The age string
 * @enum
 *  - [1]: Kid (1-12);
 *  - [2]: Teen (13-19);
 *  - [3]: Young Adult (20-29);
 *  - [4]: Mid Adult (30-49);
 *  - [5]: Senior (50+);
 */
export function FormatAge(AgeInteger: string | number = 3): string {
  AgeInteger = +AgeInteger;
  switch (AgeInteger) {
    case 1:
      return "Kid (1-12)";
    case 2:
      return "Teen (13-19)";
    case 3:
      return "Young Adult (20-29)";
    case 4:
      return "Mid Adult (30-49)";
    case 5:
      return "Senior (50+)";
  }
  return "Unknown";
}

/**
 * Converts a given multiline string or an array of lines into an unordered list.
 * @param Input
 * @returns
 */
export function UnorderedList(Input: string | Array<string>): string {
  const Lines = Input instanceof Array ? Input : Input.split(/[\r\n]/);
  return Lines.map((Line) => `- ${Line}`).join("\n");
}

/**
 * Returns a formatted string representation of the user's username, display name as well as the id if requested
 * @param UserData
 * @param IncludeID - Whether to include the user's id in the string (e.g. "Builderman (@builderman_fifty) [5010050100]")
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
  IncludeID: boolean
): string | null {
  if (UserData.name) {
    const Formatted = `${UserData.display_name ?? UserData.name} (@${UserData.name})`;
    if (IncludeID && UserData.id) {
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
 * @param Model
 * @param Brand
 * @returns
 */
export function FormatVehicleName(
  Model: Vehicles.VehicleModel,
  Brand: { name: string; alias: string }
) {
  const OrgMYear = Model.model_year.org ? `${Model.model_year.org} ` : "";
  const AltMYear = Model.model_year.alt ? `${Model.model_year.alt} ` : "";
  const BrandName = Brand.name ? `${Brand.name} ` : "";
  const BrandAlias = Brand.alias ? `${Brand.alias} ` : "";

  return FormatStr(
    "%s%s%s (%s%s%s)",
    OrgMYear,
    BrandName,
    Model.name,
    AltMYear,
    BrandAlias,
    Model.alias
  );
}