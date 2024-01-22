import Dedent from "dedent";

const SuperNums = ["⁽⁰⁾", "⁽¹⁾", "⁽²⁾", "⁽³⁾", "⁽⁴⁾", "⁽⁵⁾", "⁽⁶⁾", "⁽⁷⁾", "⁽⁸⁾", "⁽⁹⁾"];
const CDManual =
  "https://lapdonlinestrgeacc.blob.core.usgovcloudapi.net/lapdonlinemedia/2022/05/19-6748_Communications_Division_PSR_-2015-Manual_REDACTED-21.pdf";
const Volume4 =
  "https://lapdonlinestrgeacc.blob.core.usgovcloudapi.net/lapdonlinemedia/VOLUME_4_word.pdf";

export interface CodeType {
  /** The code itself which consists of numbers and dashes (except some literal codes) */
  code: string;

  /** The code title/name (10-11 -> Traffic Stop) */
  title: string;

  /** A detailed code description explaining what the code means */
  description: string;

  /**
   * Any possible notes about the code
   * An object means an note with a title and description.
   * string[] | {title: string, description: string}[]
   */
  notes?: ({ title: string; description: string } | string)[];

  /**
   * A list of usage examples. How could this code be used in radio communications?
   * An object means an example with a title and description.
   * string[] | {title: string, description: string}[]
   */
  usage_examples?: ({ title: string; description: string } | string)[];

  /** A list of possible references (links) to the code information */
  references?: string[];
}

export const TenCodes: CodeType[] = [];
export const ElevenCodes: CodeType[] = [];
export const LiteralCodes: CodeType[] = [
  {
    code: "Code 1",
    title: "Code One",
    description: `
      **Acknowledge Call/Respond over Radio.**
      **As defined in Volume-4[${SuperNums[1]}](${Volume4}):**
      When the control operator (Dispatch) fails to receive an acknowledgment of a communication, \
      a 'Code One' shall be given. The unit or officer to which a 'Code One' is directed shall \
      acknowledge immediately upon hearing a 'Code One'.

      **As defined in CDM[${SuperNums[2]}](${CDManual}):**
      A Code One is used when a field unit fails to respond to a radio transmission in one minute \
      (including voice broadcast radio call) or fails to acknowledge a digitally dispatched or assigned \
      incident after a two minute alert is received (when the unit appears gray on the AWW).
    `,

    notes: ["This code may have distinct meanings in departments other than the LAPD."],
    usage_examples: ["Dispatch: “7A-77, 7A77, Code One.”"],

    references: [
      `1. [Volume-4](${Volume4}#page=17)`,
      `2. [Communications Division Manual](${CDManual}#page=385)`,
    ],
  },
  {
    code: "Code 2",
    title: "Code Two",
    description: `
      **Routine Call, No Lights or Siren.**
      A radio call accompanied by a 'Code Two' designation is an urgent call and shall be answered immediately. \
      The lights and siren shall not be used, and all traffic laws shall be obeyed and observed.
    `,

    notes: [
      "Officers responding to a 'Code Two' radio call *shall only* interrupt the Code Two call to perform police work of major importance.",
      "Officers who interrupt their response to a Code Two call due to police work of major importance, delay, or other exigent circumstances shall immediately notify Communications Division or Dispatch.",
    ],

    references: [
      `[Volume-4](${Volume4}#page=17)`,
      "[Quora](https://qr.ae/pKqLOl)",
      "[Wikipedia-1](https://en.wikipedia.org/wiki/Los_Angeles_Police_Department_resources#:~:text=Code%202:%20Respond%20to%20the%20call%20without%20emergency%20lights%20and%20sirens)",
      "[Wikipedia-2](https://en.wikipedia.org/w/index.php?oldid=1185844260#:~:text=Code%201:%20Respond%20to%20the%20call%20without%20emergency%20lights%20and%20sirens.&text=Certain%20agencies%20may%20add%20or,situations%2C%20and%20other%20high%2Dlevel%20situations.)",
      `[Communications Division Manual](${CDManual}#page=385)`,
    ],
  },
  {
    code: "Code 2-High",
    title: "Code Two High",
    description: `
      **Priority Call, Lights and Siren Can Be Used.**
      This code is almost equivalent to the 'Code Two' code, with the exception that the lights \
      and siren can be utilized only if necessary to get through traffic.
    `,

    notes: [
      "This code is no longer official or standard in the LAPD, and hasn't been for several years.",
    ],

    references: [
      "[Quora](https://qr.ae/pKq0z9)",
      "[Removal Of Code Two-High](https://www.lapdonline.org/newsroom/change-in-dispatch-policy-for-the-lapd/#:~:text=It%20is%20anticipated%20that%20the,management%20of%20calls%20for%20service.)",
    ],
  },
  {
    code: "Code 3",
    title: "Code Three",
    description: `
      **Emergency Call, Proceed with Lights and Sirens.**
      Code 3 signifies an emergency situation requiring immediate response with lights and sirens. \
      It indicates a critical threat to public safety, life, or property that demands the officer's prompt and decisive action without delay.
    
      **Scenarios Requiring Code 3 Response:**
      - **Violent Crimes:**
        Active shootings, assaults, domestic violence incidents, robberies, stabbings.
      - **Medical Emergencies:**
        Life-threatening medical situations, unconscious individuals, accidents with injuries.
      - **Public Safety Threats:**
        Fires, explosions, hazardous materials incidents, hostage situations, barricaded suspects.
      - **Pursuits of Fleeing Suspects:**
        When a suspect poses a danger to themselves or others and evades lawful stop.
    `,

    usage_examples: [
      {
        title: "**Dispatch Broadcast:**",
        description: `
          Central Units and 1A11, 1A11, 459 Hot Prowl 231 N. Main, 231 N. Main. Suspect downstairs, \
          the victim is in the upstairs closet. Code Three, Incident number 1267, RD 167.
        `,
      },
      "[In Action 1](https://youtu.be/ItcyoXmGiAE?si=V2A4-BWbhd3Q0l8X)",
      "[In Action 2](https://youtu.be/gigAXFw9yzQ?si=JUo-_CSL2ziiga4-)",
      "[In Action 3](https://youtu.be/IqMbjypnmvw?si=ILdlTIzf-j_iWfPa)",
      "[In Action 4](https://youtu.be/GN_P_1Vx36c?si=53wtEUxh19Yj1E6b)",
      "[In Action 5](https://youtu.be/i4epuHr7sNY?si=OEDu4h-UPJXpHq-L)",
    ],

    notes: [
      "Officers responding “Code Three” should notify Communications Division (Dispatch) of their “Code Three” response and their starting point.",
      "Code 3 response should be used only when absolutely necessary and not for routine or non-urgent matters.",
      "Officers exercise discretion in assessing the severity of the situation and determining the appropriate response level.",
      "False or unjustified use of Code 3 can have negative consequences, including disciplinary action and potential legal liability.",
    ],

    references: [
      `[Volume-4](${Volume4}#page=17)`,
      "[Quora](https://qr.ae/pKqfJd#:~:text=Code%203%20for%20most%20jurisdictions%20means%20responding%20%E2%80%9Chot%E2%80%9D%20which%20is%20to%20say%20lights%20and%20siren.%20Also%20getting%20there%20as%20quickly%20and%20safely%20as%20possible.)",
      "[Wikipedia](https://en.wikipedia.org/w/index.php?title=Los_Angeles_Police_Department_resources&oldid=1194493079#:~:text=a%20response%20code%20(Code%203,numbered%20area%20within%20the%20division).)",
      "[LAPD Web Article](https://www.lapd.com/article/when-should-lapd-use-lights-and-sirens#:~:text=Apr%202009-,When%20Should%20the%20LAPD%20Use%20Lights%20and%20Sirens%3F,lights%20flashing%20and%20sirens%20blaring.)",
      `[Communications Division Manual](${CDManual}#page=385)`,
    ],
  },
  {
    code: "Code 4",
    title: "Code Four",
    description: `
      **No Further Assistance Needed.**
      **As defined in Volume-4[${SuperNums[1]}](${Volume4}):**
      When additional assistance is not needed at the scene of an "All Units" call, a "Code Four," \
      followed by the location of the call, shall be broadcast. Radio units which are not assigned \
      to the call and which are not at the scene shall return to their assigned patrol area when a \
      "Code Four" is broadcast. Officers shall use discretion and downgrade their responses based \
      on the arrival of other units at the requesting officer’s location or if a “Code Four” is broadcast.
      
      Code 4 signifies that a situation is under control and no longer requires additional assistance from other units. \
      It effectively concludes a call for service or incident, indicating that the officer or unit on scene has handled the matter and resumed regular patrol duties.
    `,

    notes: [
      "Code 4 can be rescinded if the situation escalates or requires further assistance.",
      "Officers should continue to monitor the situation and be prepared to respond if circumstances change.",
    ],

    usage_examples: [
      {
        title: "**After Clearing a Call:**",
        description:
          "Unit 7A-427, Code 4 at the location of the disturbance. Suspects in custody, no injuries reported. Return to patrol.",
      },
      {
        title: "**After Completing a Task:**",
        description:
          "7L-110, Code 4 on traffic control at the accident scene. Intersection is now clear.",
      },
      {
        title: "**After Resolving a Situation:**",
        description: "Dispatch, be advised, we have the suspect in custody. Code 4.",
      },
      {
        title: "**Cancelling Code 4:**",
        description:
          "Dispatch, disregard Code 4 at previous location. Suspect has fled on foot, requesting backup units.",
      },
    ],

    references: [
      `[Volume-4](${Volume4}#page=19)`,
      "[Wikipedia](https://en.wikipedia.org/w/index.php?title=Los_Angeles_Police_Department_resources&oldid=1194493079#:~:text=Code%204:%20No%20further%20units%20needed%20to%20respond%2C%20return%20to%20patrol)",
      `[Communications Division Manual](${CDManual}#page=386)`,
    ],
  },
  {
    code: "Code 4-Adam",
    title: "Code Four Adam",
    description: `
      **No Further Assistance Needed, Suspect Not in Custody.**
      Code 4-Adam signifies that a situation is currently under control and no longer requires \
      immediate assistance from other units. However, it notably emphasizes that the suspect \
      involved in the incident is still not in custody, necessitating continued awareness and potential follow-up actions.
    `,

    notes: [
      "Code 4-Adam doesn't imply officers can completely relax their guard. It's crucial to maintain situational awareness and pursue suspect apprehension.",
      "Officers typically initiate follow-up investigations, suspect searches, or evidence collection after declaring Code 4-Adam.",
      "If the situation escalates or the suspect is located, officers can rescind Code 4-Adam and request additional assistance.",
    ],

    usage_examples: [
      {
        title: "**Robbery Scene:**",
        description:
          "Dispatch, 7L-22, Code 4-Adam on the robbery scene. Suspect fled on foot, but we have witness descriptions and are establishing a perimeter.",
      },
      {
        title: "**Traffic Stop:**",
        description:
          "Dispatch, be advised, driver fled the scene on foot during the traffic stop. Code 4-Adam, setting up a search area.",
      },
      {
        title: "**Search Warrant:**",
        description:
          "Detective: All units, Code 4-Adam on the search warrant. Suspect not located, maintain a presence in the neighborhood and report any sightings.",
      },
      {
        title: "**Dispatch Broadcast:**",
        description:
          "All units, Code Four Adam, 1st and Main, Bank of America, suspect male white, tan shirt, brown pants, last seen running toward 2nd Street.",
      },
    ],

    references: [
      `[Volume-4](${Volume4}#page=19)`,
      `[Communications Division Manual](${CDManual}#page=386)`,
    ],
  },
  {
    code: "Code 5",
    title: "Code Five",
    description: `
      **Stakeout. Uniformed Officers Stay Away.**
      Code Five signifies an ongoing operation where officers are conducting a surveillance or stakeout \
      on a location or individual. It serves as an alert to other units regarding the occupied position \
      and potential need for assistance.

      **Usage Contexts:**
      - **Investigating Suspicious Activity:**
        During surveillance of a suspected gang house or potential criminal meeting point.
      - **Monitoring High-Risk Individuals:**
        Observing the movements and contacts of known suspects or criminals under investigation.
      - **Gathering Evidence:**
        Discreetly watching a location or person to collect evidence for arrest or search warrants.
    `,

    notes: [
      "Code Five operations necessitate discretion and a low profile to avoid jeopardizing the stakeout and compromising the investigation.",
      "Officers maintain constant communication with dispatch and backup units to ensure coordinated responses if the situation develops.",
      "Specific details regarding the nature of the stakeout are often kept confidential and communicated through secure channels.",
      "When the need for a 'Code Five' no longer exists, the originating unit, or the last unit to leave the scene, shall request the control operator to clear the 'Code Five' at the particular location.",
    ],

    usage_examples: [
      "**Officer:** `Dispatch, Unit 7L-62, Code Five at the abandoned warehouse on Pine Street. Requesting additional units for cover at 10:00 PM.`",
      "**Dispatch:** `Copy that, 7L-62. Units 8L-14 and 9L-37 in your vicinity, responding to Code Five. ETA two minutes.`",
      "**Detective:** `All units, Code Five remains in effect at the suspect's house. Do not approach or make contact.`",
    ],

    references: [
      `[Volume-4](${Volume4}#page=19)`,
      `[Communications Division Manual](${CDManual}#page=387)`,
    ],
  },
  {
    code: "Code 5-Edward",
    title: "Code Five Edward",
    description: `
      **Explosive Hazard. Low-Altitude Aircraft Stay Away.**
      Code Five Edward is a critical alert used to warn Air Support Division personnel of a potential \
      explosive hazard in the vicinity. It emphasizes the need for caution and avoiding the area to ensure \
      the safety of air units and personnel on the ground. All units shall avoid the vicinity except in an \
      emergency or in a response to a call for service.
      
      **Usage Contexts:**
      - **Bomb Threat Investigations:**
        When responding to a reported bomb threat or suspicious package, Code Five Edward alerts Air Support to stay clear of the potential detonation area.
      - **Suspicious Activity:**
        During surveillance of a location suspected to house explosive materials, the code informs Air Support to avoid approaching and potentially triggering the device.
      - **Post-Blast Scene:**
        Following an explosion, Code Five Edward can be used to warn Air Support about potential secondary devices or ongoing danger in the area.
    `,

    notes: [
      "Code Five Edward is a crucial safety measure to protect both Air Support personnel and individuals on the ground from potential bomb threats.",
      "It requires clear communication and coordination between ground units and Air Support to ensure effective response and hazard mitigation.",
      "The specific protocol for Code Five Edward might vary depending on the nature of the threat and the operational environment.",
    ],

    usage_examples: [
      "**Officer on Scene:** `Dispatch, Unit 7L-45, Code Five Edward at the abandoned building on Elm Street. Possible bomb threat, advise Air Support to hold position.`",
      "**Dispatch:** `Copy that, 7L-45, Code Five Edward initiated. Air Support 1, maintain safe distance from the building, awaiting further instructions.`",
    ],

    references: [
      `[Volume-4](${Volume4}#page=19)`,
      `[Communications Division Manual](${CDManual}#page=388)`,
    ],
  },
  {
    code: "Code 6",
    title: "Code Six",
    description: `
      **Conducting a Field Investigation, No Assistance Anticipated.**
      **As defined in Volume-4[${SuperNums[1]}](${Volume4}):**
      When a unit is conducting a field investigation and no assistance is anticipated, a "Code Six,” followed \
      by the location, shall be broadcast. A unit shall not go "Code Six" until it arrives at the scene of a call.
      
      Code Six indicates that an officer is actively engaged in a field investigation at a specific location, \
      but they do not currently anticipate requiring immediate assistance or backup from other units. It serves \
      to inform dispatch and other officers of the officer's status and location.

      **Usage Contexts:**
      - **Traffic Stops:**
        Officers conducting routine traffic stops often declare Code Six, indicating they have control of the scene and are proceeding with the investigation.
      - **Minor Disturbances:**
      - **Non-Emergency Calls:**
        For calls that do not involve immediate danger or require multiple units, officers might declare Code Six to focus on their investigation without unnecessary distraction.
      `,

    notes: [
      "Code Six doesn't prevent officers from requesting backup if the situation escalates or requires additional resources.",
      "The unit(s) shall remain available for reassignment to priority calls (i.e., Priority I or II) by monitoring their radio frequencies.",
      "The unit(s) shall notify the dispatcher as soon as it is again available for radio calls.",
    ],

    usage_examples: [
      "**Officer:** `Dispatch, 7L-25, Code Six at the reported disturbance at the park. Situation is under control, conducting interviews with witnesses.`",
      "**Dispatch:** `Copy that, 7L-25, Code Six.`",
      "**Sergeant:** `All units, be advised, 7A-38 is Code Six at the abandoned warehouse on Elm Street.`",
    ],

    references: [
      `[Volume-4](${Volume4}#page=20)`,
      `[Communications Division Manual](${CDManual}#page=389)`,
    ],
  },
  {
    code: "Code 6-Adam",
    title: "Code Six Adam",
    description: `
      **Conducting a Field Investigation, May Need Assistance in Conducting.**
      **As defined in Volume-4[${SuperNums[1]}](${Volume4}):**
      When an officer may need assistance in conducting an investigation, the officer should broadcast "Code Six Adam" with his or her location.
      
      Code Six indicates that an officer is initiating a field investigation, but they anticipate the potential \
      need for assistance or backup depending on how the situation unfolds. It signals a proactive approach to \
      ensuring officer safety and readiness for potential escalation.

      **Usage Contexts:**
      - **Uncertain Situations:**
        When officers respond to calls with incomplete or uncertain information, they might use Code Six Adam to prepare for unpredictable developments.
      - **High-Risk Locations:**
        Areas known for criminal activity or potential hazards might prompt officers to use Code Six Adam as a precaution.
      - **Possible Suspect Encounters:**
        When officers suspect they might encounter individuals who could pose a threat, Code Six Adam prepares for potential confrontations.
      `,

    notes: [
      "Other radio units in the vicinity should then patrol in the general direction of the given location.",
      "Officers should not ordinarily leave their assigned districts but should deploy to an advantageous position in the event that assistance is later requested.",
      "When a unit broadcasts 'Code Six Adam' and later finds that assistance will not be needed, a 'Code Four' and the location shall be given without delay.",
    ],

    usage_examples: [
      "**Officer:** `Dispatch, 7L-32, Code Six Adam at the reported burglary on Elm Street. Conducting initial investigation, may need backup if suspects are still on scene.`",
      "**Dispatch:** `Copy that, 7L-32, Code Six Adam. Units 7L-18 and 7L-44 advised to stand by in the area.`",
      "**Detective:** `All units, Code Six Adam at the suspect's residence. Approaching with caution, potential for armed resistance.`",
    ],

    references: [
      `[Volume-4](${Volume4}#page=21)`,
      `[Communications Division Manual](${CDManual}#page=390)`,
    ],
  },
  {
    code: "Code 6-Charles",
    title: "Code Six Charles",
    description: `
      **High-Risk Suspect Encounter, Use Caution.**
      **As defined in CDM[${SuperNums[2]}](${CDManual}):**
      A Code Six Charles (C6C) indicates that a Data Base Response (DBR ) may involve a felony \
      want, possible felony suspect(s), an armed and dangerous suspect(s), individuals with suicidal \
      tendencies or mentally deranged, escapee or escape risk or the vehicles involved in these \
      incidents. This code was formulated to avoid phrases which, if overhead by the suspect(s) could \
      cause a violent reaction and endanger the officers.

      Code Six Charles indicates that officers are interacting with or seeking a suspect who is considered dangerous \
      or potentially violent. It often involves individuals with outstanding felony warrants or exhibiting threatening \
      behavior, prompting a heightened level of caution and readiness for potential conflict.
      
      **Usage Contexts:**
      - **Traffic Stops:**
        When officers discover a felony warrant during a traffic stop, they might declare Code Six Charles to initiate a cautious approach and potential arrest.
      - **Responding to Calls:**
        If a caller reports a suspect with a known violent history or threatening behavior, officers might use Code Six Charles to signal the potential danger.
      - **Investigations:**
        During investigations where a suspect is identified as potentially dangerous, Code Six Charles prepares officers for possible confrontations.
      `,

    notes: [
      "Officers may request additional information about the suspect's history, known associates, or potential weapons from dispatch or databases.",
      "Code Six Charles triggers a more cautious and tactical approach by officers, often involving additional units, backup, and potentially specialized equipment like body armor or less-lethal weapons.",
      "If after a reasonable amount of time (approximately ten minutes) there is still no Code Four, the RTO shall have the unit come in and ascertain whether or not there is a Code Four.",
      "The unit’s response will determine the RTO’s action at this point mentioned above, (i.e., request for an additional unit, Code Four).",
      "If after the initial Code Six Charles broadcast, no acknowledgement is received from either a two-officer or one-officer unit, a broadcast shall be made by the RTO on the Area base and concerned traffic division frequency. A field unit shall be dispatched to the last known location, Code Two.",
    ],

    usage_examples: [
      "**Officer:** `Dispatch, 7A-42, Code Six Charles on the vehicle stop at 456 Oak Street. Driver has a felony warrant for armed robbery.`",
      "**Dispatch:** `Copy that, 7A-42, Code Six Charles. Units 7A-25 and 7L-31 responding to your location for backup.`",
      "[In Action](https://youtu.be/5NhgmL28p8w?si=XYOVnz-j8-C-DcIZ)",
    ],

    references: [
      `[Volume-4](${Volume4}#page=21)`,
      `[Communications Division Manual](${CDManual}#page=390)`,
    ],
  },
  {
    code: "Code 6-George",
    title: "Code Six George",
    description: `
      **Potential Gang Activity, Possible Need for Assistance.**
      This code signifies that an officer is conducting an investigation involving potential gang activity \
      and may require assistance from the Gang Enforcement Detail. While the officer is out of their vehicle \
      and actively investigating, they haven't encountered immediate danger and are assessing the situation.
      
      It also serves to alert available Gang Enforcement Detail units to respond, prompt nearby radio units to \
      patrol in the general area, and Maintain situational awareness and potentially request backup if needed.
      
      **Usage Contexts:**
      - When an officer encounters individuals or activities suggesting gang involvement during a field investigation.
      - When needing additional resources or backup to safely handle a potentially volatile situation involving gangs.
      - When seeking specialized expertise from the Gang Enforcement Detail for further investigation or evidence gathering.
    `,

    notes: [
      "Code Six George does not automatically necessitate backup. It serves as an alert and prepares for potential need while the officer assesses the situation.",
      "If assistance is no longer needed, the officer must immediately broadcast 'Code Four' to clear the alert.",
      "The system incorporates a 10-minute timer triggered by Code Six George. If no 'Code Four' is received within that time, dispatch will inquire or send additional units as a precaution Code Two.",
    ],

    usage_examples: [
      "**Officer:** `Dispatch, 7A-14, Code Six George, 8960 Lankershim. Possible gang activity observed during a traffic stop`",
      "**Dispatch:** `Copy that, 7A-14, Code Six George. Gang Enforcement Detail Unit notified. Units in the vicinity, patrol towards the location but remain in your assigned districts.`",
      "**Detective:** `All units, Code Six George in progress at 123 Main Street apartment complex. Potential gang meeting in progress. GED Unit responding, additional units stand by for potential perimeter control.`",
      "**GED Unit:** `Dispatch, GED Unit responding Code Two to Code Six George at 8960 Lankershim. ETA two minutes.`",
    ],

    references: [
      `[Volume-4](${Volume4}#page=21)`,
      `[Communications Division Manual](${CDManual}#page=393)`,
    ],
  },
  {
    code: "Code 6-Mary",
    title: "Code Six Mary",
    description: `
      **Possible Militant Activity, Potential Need for Assistance**
      This code signifies that an officer is conducting an investigation outside their vehicle and might need \
      assistance due to *suspected militant activity*. It alerts dispatch and nearby units to prepare for \
      potential backup while the officer gathers information.
      
      Dispatch shall take proactive measures to send backup if the officer doesn't clear the alert within a 10-minute timeframe. \
      This includes dispatching additional units if no "Code Four" is received within the timeframe, aiming to prioritize officer safety.
      
      **Usage Contexts:**
      - When an officer encounters individuals or activities suggesting potential threats of violence or organized militant activity.
      - If the officer anticipates the situation might involve weapons, explosives, or coordinated actions requiring additional resources.
      - In areas known for militant groups or activities, even if no immediate threat is perceived.
    `,

    notes: [
      "Similar to Code Six George, it doesn't automatically necessitate backup. It serves as an alert and prepares for potential need while the officer assesses the situation.",
      "Other nearby units should stay within their assigned districts but move towards a strategic position near the officer's location for faster response if needed.",
      "If assistance becomes unnecessary, the officer must immediately declare 'Code Four' to clear the alert.",
    ],

    usage_examples: [
      {
        title:
          "**Officer:** *(Observes individuals dressed in paramilitary clothing and carrying suspicious backpacks)*",
        description:
          "Dispatch, 7L-41, Code Six Mary at the abandoned warehouse on Maple Avenue. Checking identification and verifying activity.",
      },
      {
        title: "**Dispatch:**",
        description:
          "Copy 7L-41, Code Six Mary, Maple Avenue warehouse. SWAT has been notified for possible assistance. All other units in the vicinity, patrol towards Maple Avenue and be prepared for possible assistance.",
      },
      {
        title: "**SWAT:**",
        description:
          "Dispatch, SWAT on scene of Code Six Mary at the Embassy. Assessing the situation. Requesting additional perimeter control from nearby units.",
      },
    ],

    references: [
      `[Volume-4](${Volume4}#page=21)`,
      `[Communications Division Manual](${CDManual}#page=393)`,
    ],
  },
  {
    code: "Code 7",
    title: "Code Seven",
    description: `
      **Request for Out-of-Service for Free Time.**
      This code signifies that an officer wishes to go out of service temporarily for personal time, such as a meal break or rest period.
    
      **Usage Contexts:**
      - When an officer needs a break from active duty to attend to personal needs.
      - When an officer's shift is ending and they're transitioning to off-duty status.
    `,

    notes: [
      "Code Seven is currently *only* used by the Security Services Division of the LAPD, not for general patrol units.",
      "Officers must request Code Seven and receive approval from dispatch before going out of service.",
      "Officers must provide the location where their vehicle will be parked during the Code Seven status.",
    ],

    usage_examples: [
      "**Officer:** `Dispatch, 7A-89 requesting Code Seven, will be parked at the station.`",
      "**Dispatch:** `7A-89, Stand by for Code Seven approval.`",
      "**Dispatch:** *(After checking staffing levels)* `15A14, OK for Seven.`",
    ],

    references: [
      `[Volume-4](${Volume4}#page=21)`,
      `[Communications Division Manual](${CDManual}#page=394)`,
    ],
  },
  {
    code: "Code 8",
    title: "Code Eight",
    description: `
      **Fire Reported in High-Hazard Area or Threat to Firefighters.**
      This code signifies a reported fire at a location where there's a significant risk of spreading flames \
      or potential danger to firefighters from hostile groups. It alerts nearby units to be aware of the situation \
      and potentially respond but remain on duty and available for other emergencies.
    
      **Usage Contexts:**
      - When a fire is reported in areas with high flammability, such as dry brush, chemical plants, or historical structures.
      - When there are concerns about potential violence or confrontations with individuals at the fire scene.
      - When firefighters might need additional support for crowd control or scene security.
    `,

    notes: [
      "Code Eight serves as an informational alert, not an automatic dispatch of units.",
      "Nearby units should remain available for other emergencies unless their assistance is directly requested at the fire scene.",
      "If an officer needs to focus solely on the fire scene and go off the air, they should switch to 'Code Six.'",
    ],

    usage_examples: [
      "**Dispatch:** `Central Units, Code Eight, abandoned warehouse fire at 1st and Hill Street. Possible squatters and hazardous materials on scene. Approach cautiously and remain available for calls.`",
      "**Field Unit:** `Dispatch, 7L-22 arriving on scene at 1st and Hill. Smoke visible, will advise on potential assistance needed.`",
      "**Fire Unit:** `Dispatch, requesting backup at 1st and Hill. Crowd becoming unruly.`",
    ],

    references: [
      `[Volume-4](${Volume4}#page=21)`,
      `[Communications Division Manual](${CDManual}#page=394)`,
    ],
  },
  {
    code: "Code 8-Adam",
    title: "Code Eight Adam",
    description: `
      **Fire Department Confirmed Fire, Request for Assistance.**
      This code signifies that the Fire Department has confirmed an active fire at a specific location and the \
      senior officer at the scene needs additional fire units. Additionally, a specific police unit is assigned \
      to assist with traffic or crowd control.
    
      **Usage Contexts:**
      - When the Fire Department confirms a verified fire at a location and requires additional resources.
      - When the situation at the fire scene necessitates traffic control or crowd management for firefighter safety and public order.
      - In situations where the senior officer at the scene requests assistance from additional police units.
    `,

    notes: [
      "Code Eight Adam builds upon the general Code Eight by adding confirmation from the Fire Department and specifying the need for police assistance.",
      "A designated police unit is dispatched to the scene specifically for traffic or crowd control, not firefighting.",
      "This code ensures coordinated response between LAPD and the Fire Department for efficient fire management.",
    ],

    usage_examples: [
      "**Fire Unit:** `Dispatch, requesting additional units at 123 Main Street. Fire spreading quickly, need crowd control.`",
      "**Dispatch:** `Copy that, 7A11, 7A-11, Code Eight Adam, assist the fire department with traffic control at 123 Main Street. Active fire confirmed.`",
      "**Field Unit:** `Dispatch, 7A-11 en route to 123 Main Street for Code Eight Adam, Code Two.`",
      "**Fire Unit:** `Dispatch, requesting additional water tankers and ladder truck at 123 Main Street.`",
    ],

    references: [
      `[Volume-4](${Volume4}#page=22)`,
      `[Communications Division Manual](${CDManual}#page=394)`,
    ],
  },
  {
    code: "Code 10",
    title: "Code Ten",
    description: `
      **Request for Clear Frequency for Warrant Check.**
      This code signifies that an officer needs a clear radio frequency to perform a background check on a suspect for outstanding warrants or wanted person status.
    
      **Usage Contexts:**
      - Before an officer makes an arrest or detains a suspect.
      - When an officer encounters a person they suspect might have warrants or be involved in criminal activity.
      - During an investigation where the officer needs to confirm a suspect's identity and potential criminal history.
    `,

    notes: [
      "Officers must ensure the frequency is clear before requesting 'Code Ten.'",
      "They must identify themselves, state the number of suspects, and specify whether they're juveniles.",
      "Code Ten is strictly for checking warrants/wants, not for general information or crime broadcasts.",
      "Code Ten requests are typically granted in order of receipt, but priority is given to urgent calls and dispatching of emergencies.",
    ],

    usage_examples: [
      "**Officer:** `Dispatch, 7A-04 at 1st and Hill, requesting Code Ten for one suspect, adult male.`",
      "**Dispatch:** `Wilshire Units, standby, 7A04 go ahead.`",
      "**Officer:** *(Runs background check)* `Dispatch, 7A-04, no wants or warrants for suspect.`",
      "**Dispatch:** `7A04, Roger, Hollywood clear.`",
    ],

    references: [
      `[Volume-4](${Volume4}#page=22)`,
      `[Communications Division Manual](${CDManual}#page=394)`,
    ],
  },
];

// ---------------------------------------------------------------------------------------
LiteralCodes.forEach((Code) => {
  Code.description = Dedent(Code.description);
  Code.usage_examples?.forEach((Ex) => {
    if (typeof Ex === "string") {
      return Dedent(Ex.replace(/\s{2,}/g, " "));
    } else {
      Ex.description = Dedent(Ex.description.replace(/\s{2,}/g, " "));
      return Ex;
    }
  });
  Code.notes?.forEach((Note) => {
    if (typeof Note === "string") {
      return Dedent(Note.replace(/\s{2,}/g, " "));
    } else {
      Note.description = Dedent(Note.description.replace(/\s{2,}/g, " "));
      return Note;
    }
  });
});
