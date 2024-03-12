import Dedent from "dedent";

const SuperNums = ["⁽⁰⁾", "⁽¹⁾", "⁽²⁾", "⁽³⁾", "⁽⁴⁾", "⁽⁵⁾", "⁽⁶⁾", "⁽⁷⁾", "⁽⁸⁾", "⁽⁹⁾"];
const CDManual =
  "https://lapdonlinestrgeacc.blob.core.usgovcloudapi.net/lapdonlinemedia/2022/05/19-6748_Communications_Division_PSR_-2015-Manual_REDACTED-21.pdf";
const Volume4 =
  "https://lapdonlinestrgeacc.blob.core.usgovcloudapi.net/lapdonlinemedia/VOLUME_4_word.pdf";

type TDSType = ({ title: string; description: string } | string)[];

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
  notes?: TDSType;

  /** Self-explanatory */
  usage_contexts?: TDSType;

  /**
   * A list of usage examples. How could this code be used in radio communications?
   * An object means an example with a title and description.
   * string[] | {title: string, description: string}[]
   */
  usage_examples?: TDSType;

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
    usage_examples: ["**Dispatch:** `7A-77, 7A77, Code One.`"],
    references: [
      `1. [Volume-4](${Volume4}#page=17)`,
      `2. [Communications Division Manual](${CDManual}#page=385)`,
    ],
  },
  {
    code: "Code 2",
    title: "Code Two",
    description: `
      **Routine Call, No Sirens.**
      Code Two signifies an urgent situation requiring immediate attention, but not necessarily a life-threatening emergency. \
      Responding officers are expected to proceed as quickly as possible while adhering to all traffic laws and avoiding the use of sirens.
    `,

    notes: [
      "Officers responding to a 'Code Two' radio call *shall only* interrupt the Code Two call to perform police work of major importance.",
      "Officers who interrupt their response to a Code Two call due to *police work of major importance*, delay, or other exigent circumstances shall immediately notify Communications Division or Dispatch.",
      "Supervisors evaluate interrupted Code Two responses for appropriateness, considering radio logs, scene visits, and other relevant information.",
      "'Police Work of Major Importance' refers to police actions that involve the arrest, processing, and detention of felony suspects and intoxicated drivers, as well as tasks that are important for the urgent public safety and protection of life and property.",
    ],

    usage_contexts: [
      "When officers need to respond quickly to situations like suspicious activity, domestic disputes, reports of stolen vehicles, or medical emergencies where immediate intervention is necessary but not critical for survival.",
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
    code: "Code 2-H",
    title: "Code Two High",
    description: `
      **Priority Call, Lights and Sirens Can Be Used.**
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
    `,

    usage_contexts: [
      {
        title: "Violent Crimes:",
        description:
          "Active shootings, assaults, domestic violence incidents, robberies, stabbings.",
      },
      {
        title: "Medical Emergencies:",
        description:
          "Life-threatening medical situations, unconscious individuals, accidents with injuries.",
      },
      {
        title: "Public Safety Threats:",
        description:
          "Fires, explosions, hazardous materials incidents, hostage situations, barricaded suspects.",
      },
      {
        title: "Pursuits of Fleeing Suspects:",
        description:
          "When a suspect poses a danger to themselves or others and evades lawful stop.",
      },
    ],

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
    code: "Code 4-A",
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
    `,

    usage_contexts: [
      {
        title: "Investigating Suspicious Activity:",
        description:
          "During surveillance of a suspected gang house or potential criminal meeting point.",
      },
      {
        title: "Monitoring High-Risk Individuals:",
        description:
          "Observing the movements and contacts of known suspects or criminals under investigation.",
      },
      {
        title: "Gathering Evidence:",
        description:
          "Discreetly watching a location or person to collect evidence for arrest or search warrants.",
      },
    ],

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
    code: "Code 5-E",
    title: "Code Five Edward",
    description: `
      **Explosive Hazard. Low-Altitude Aircraft Stay Away.**
      Code Five Edward is a critical alert used to warn Air Support Division personnel of a potential \
      explosive hazard in the vicinity. It emphasizes the need for caution and avoiding the area to ensure \
      the safety of air units and personnel on the ground. All units shall avoid the vicinity except in an \
      emergency or in a response to a call for service.
    `,

    notes: [
      "Code Five Edward is a crucial safety measure to protect both Air Support personnel and individuals on the ground from potential bomb threats.",
      "It requires clear communication and coordination between ground units and Air Support to ensure effective response and hazard mitigation.",
      "The specific protocol for Code Five Edward might vary depending on the nature of the threat and the operational environment.",
    ],

    usage_contexts: [
      {
        title: "Bomb Threat Investigations:",
        description:
          "When responding to a reported bomb threat or suspicious package, Code Five Edward alerts Air Support to stay clear of the potential detonation area.",
      },
      {
        title: "Suspicious Activity:",
        description:
          "During surveillance of a location suspected to house explosive materials, the code informs Air Support to avoid approaching and potentially triggering the device.",
      },
      {
        title: "Post-Blast Scene:",
        description:
          "Following an explosion, Code Five Edward can be used to warn Air Support about potential secondary devices or ongoing danger in the area.",
      },
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
    `,

    notes: [
      "Code Six doesn't prevent officers from requesting backup if the situation escalates or requires additional resources.",
      "The unit(s) shall remain available for reassignment to priority calls (i.e., Priority I or II) by monitoring their radio frequencies.",
      "The unit(s) shall notify the dispatcher as soon as it is again available for radio calls.",
    ],

    usage_contexts: [
      {
        title: "Traffic Stops:",
        description:
          "Officers conducting routine traffic stops often declare Code Six, indicating they have control of the scene and are proceeding with the investigation.",
      },
      {
        title: "Minor Disturbances:",
        description:
          " In cases of minor disturbances or disputes where the situation has been de-escalated, officers might use Code Six to signal they are handling the matter independently.",
      },
      {
        title: "Non-Emergency Calls:",
        description:
          "For calls that do not involve immediate danger or require multiple units, officers might declare Code Six to focus on their investigation without unnecessary distraction.",
      },
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
    code: "Code 6-A",
    title: "Code Six Adam",
    description: `
      **Conducting a Field Investigation, May Need Assistance in Conducting.**
      **As defined in Volume-4[${SuperNums[1]}](${Volume4}):**
      When an officer may need assistance in conducting an investigation, the officer should broadcast "Code Six Adam" with his or her location.
      
      Code Six indicates that an officer is initiating a field investigation, but they anticipate the potential \
      need for assistance or backup depending on how the situation unfolds. It signals a proactive approach to \
      ensuring officer safety and readiness for potential escalation.
    `,

    notes: [
      "Other radio units in the vicinity should then patrol in the general direction of the given location.",
      "Officers should not ordinarily leave their assigned districts but should deploy to an advantageous position in the event that assistance is later requested.",
      "When a unit broadcasts 'Code Six Adam' and later finds that assistance will not be needed, a 'Code Four' and the location shall be given without delay.",
    ],

    usage_contexts: [
      {
        title: "Uncertain Situations:",
        description:
          "When officers respond to calls with incomplete or uncertain information, they might use Code Six Adam to prepare for unpredictable developments.",
      },
      {
        title: "High-Risk Locations:",
        description:
          "Areas known for criminal activity or potential hazards might prompt officers to use Code Six Adam as a precaution.",
      },
      {
        title: "Possible Suspect Encounters:",
        description:
          "When officers suspect they might encounter individuals who could pose a threat, Code Six Adam prepares for potential confrontations.",
      },
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
    code: "Code 6-C",
    title: "Code Six Charles",
    description: `
      **High-Risk Suspect Encounter, Use Caution.**
      **As defined in CDM[${SuperNums[2]}](${CDManual}):**
      A Code Six Charles (C6C) indicates that a Data Base Response (DBR) may involve a felony \
      want, possible felony suspect(s), an armed and dangerous suspect(s), individuals with suicidal \
      tendencies or mentally deranged, escapee or escape risk or the vehicles involved in these \
      incidents. This code was formulated to avoid phrases which, if overhead by the suspect(s) could \
      cause a violent reaction and endanger the officers.

      Code Six Charles indicates that officers are interacting with or seeking a suspect who is considered dangerous \
      or potentially violent. It often involves individuals with outstanding felony warrants or exhibiting threatening \
      behavior, prompting a heightened level of caution and readiness for potential conflict.
    `,

    notes: [
      "Officers may request additional information about the suspect's history, known associates, or potential weapons from dispatch or databases.",
      "Code Six Charles triggers a more cautious and tactical approach by officers, often involving additional units, backup, and potentially specialized equipment like body armor or less-lethal weapons.",
      "If after a reasonable amount of time (approximately ten minutes) there is still no Code Four, the RTO shall have the unit come in and ascertain whether or not there is a Code Four.",
      "The unit’s response will determine the RTO’s action at this point mentioned above, (i.e., request for an additional unit, Code Four).",
      "If after the initial Code Six Charles broadcast, no acknowledgement is received from either a two-officer or one-officer unit, a broadcast shall be made by the RTO on the Area base and concerned traffic division frequency. A field unit shall be dispatched to the last known location, Code Two.",
    ],

    usage_contexts: [
      {
        title: "Traffic Stops:",
        description:
          "When officers discover a felony warrant during a traffic stop, they might declare Code Six Charles to initiate a cautious approach and potential arrest.",
      },
      {
        title: "Responding to Calls:",
        description:
          "If a caller reports a suspect with a known violent history or threatening behavior, officers might use Code Six Charles to signal the potential danger.",
      },
      {
        title: "Investigations:",
        description:
          "During investigations where a suspect is identified as potentially dangerous, Code Six Charles prepares officers for possible confrontations.",
      },
    ],

    usage_examples: [
      "**Officer:** `Dispatch, 7A-42, Code Six Charles on the vehicle stop at 456 Oak Street. Driver has a felony warrant for armed robbery.`",
      "**Dispatch:** `Copy that, 7A-42, Code Six Charles. Units 7A-25 and 7L-31 responding to your location for backup.`",
      "[In Action](https://youtu.be/5NhgmL28p8w?si=XYOVnz-j8-C-DcIZ)",
    ],

    references: [
      `[Volume-4](${Volume4}#page=21)`,
      `[Communications Division Manual](${CDManual}#page=390)`,
      "[Radio Reference Website](http://forums.radioreference.com/threads/lasd-radio-terms.33688/post-260200)",
    ],
  },
  {
    code: "Code 6-G",
    title: "Code Six George",
    description: `
      **Potential Gang Activity, Possible Need for Assistance.**
      This code signifies that an officer is conducting an investigation involving potential gang activity \
      and may require assistance from the Gang Enforcement Detail. While the officer is out of their vehicle \
      and actively investigating, they haven't encountered immediate danger and are assessing the situation.
      
      It also serves to alert available Gang Enforcement Detail units to respond, prompt nearby radio units to \
      patrol in the general area, and Maintain situational awareness and potentially request backup if needed.
    `,

    notes: [
      "Code Six George does not automatically necessitate backup. It serves as an alert and prepares for potential need while the officer assesses the situation.",
      "If assistance is no longer needed, the officer must immediately broadcast 'Code Four' to clear the alert.",
      "The system incorporates a 10-minute timer triggered by Code Six George. If no 'Code Four' is received within that time, dispatch will inquire or send additional units as a precaution Code Two.",
    ],

    usage_contexts: [
      "When an officer encounters individuals or activities suggesting gang involvement during a field investigation.",
      "When needing additional resources or backup to safely handle a potentially volatile situation involving gangs.",
      "When seeking specialized expertise from the Gang Enforcement Detail for further investigation or evidence gathering.",
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
    code: "Code 6-M",
    title: "Code Six Mary",
    description: `
      **Possible Militant Activity, Potential Need for Assistance**
      This code signifies that an officer is conducting an investigation outside their vehicle and might need \
      assistance due to *suspected militant activity*. It alerts dispatch and nearby units to prepare for \
      potential backup while the officer gathers information.
      
      Dispatch shall take proactive measures to send backup if the officer doesn't clear the alert within a 10-minute timeframe. \
      This includes dispatching additional units if no "Code Four" is received within the timeframe, aiming to prioritize officer safety.
    `,

    notes: [
      "Similar to Code Six George, it doesn't automatically necessitate backup. It serves as an alert and prepares for potential need while the officer assesses the situation.",
      "Other nearby units should stay within their assigned districts but move towards a strategic position near the officer's location for faster response if needed.",
      "If assistance becomes unnecessary, the officer must immediately declare 'Code Four' to clear the alert.",
    ],

    usage_contexts: [
      "When an officer encounters individuals or activities suggesting potential threats of violence or organized militant activity.",
      "If the officer anticipates the situation might involve weapons, explosives, or coordinated actions requiring additional resources.",
      "In areas known for militant groups or activities, even if no immediate threat is perceived.",
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
    `,

    notes: [
      "Code Seven is currently *only* used by the Security Services Division of the LAPD, not for general patrol units.",
      "Officers must request Code Seven and receive approval from dispatch before going out of service.",
      "Officers must provide the location where their vehicle will be parked during the Code Seven status.",
    ],

    usage_contexts: [
      "When an officer needs a break from active duty to attend to personal needs.",
      "When an officer's shift is ending and they're transitioning to off-duty status.",
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
    `,

    notes: [
      "Code Eight serves as an informational alert, not an automatic dispatch of units.",
      "Nearby units should remain available for other emergencies unless their assistance is directly requested at the fire scene.",
      "If an officer needs to focus solely on the fire scene and go off the air, they should switch to 'Code Six.'",
    ],

    usage_contexts: [
      "When a fire is reported in areas with high flammability, such as dry brush, chemical plants, or historical structures.",
      "When there are concerns about potential violence or confrontations with individuals at the fire scene.",
      "When firefighters might need additional support for crowd control or scene security.",
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
    code: "Code 8-A",
    title: "Code Eight Adam",
    description: `
      **Fire Department Confirmed Fire, Request for Assistance.**
      This code signifies that the Fire Department has confirmed an active fire at a specific location and the \
      senior officer at the scene needs additional fire units. Additionally, a specific police unit is assigned \
      to assist with traffic or crowd control.
    `,

    notes: [
      "Code Eight Adam builds upon the general Code Eight by adding confirmation from the Fire Department and specifying the need for police assistance.",
      "A designated police unit is dispatched to the scene specifically for traffic or crowd control, not firefighting.",
      "This code ensures coordinated response between LAPD and the Fire Department for efficient fire management.",
    ],

    usage_contexts: [
      "When the Fire Department confirms a verified fire at a location and requires additional resources.",
      "When the situation at the fire scene necessitates traffic control or crowd management for firefighter safety and public order.",
      "In situations where the senior officer at the scene requests assistance from additional police units.",
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
    `,

    notes: [
      "Officers must ensure the frequency is clear before requesting 'Code Ten.'",
      "They must identify themselves, state the number of suspects, and specify whether they're juveniles.",
      "Code Ten is strictly for checking warrants/wants, not for general information or crime broadcasts.",
      "Code Ten requests are typically granted in order of receipt, but priority is given to urgent calls and dispatching of emergencies.",
    ],

    usage_contexts: [
      "Before an officer makes an arrest or detains a suspect.",
      "When an officer encounters a person they suspect might have warrants or be involved in criminal activity.",
      "During an investigation where the officer needs to confirm a suspect's identity and potential criminal history.",
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
  {
    code: "Code 12",
    title: "Code Twelve",
    description: `
      **False Alarm - No Evidence of Burglary or Robbery.**
      This code signifies that an officer responded to an alarm call (such as Code Thirty, Code Thirty Adam, \
      Code Thirty-Ringer, Code Thirty Victor, or a silent 211) and found no evidence of a burglary or robbery. \
      The officer believes the false alarm was likely caused by malfunctioning equipment, subscriber error, or other factors beyond the subscriber's control.
    `,

    notes: [
      "Code Twelve can be used alongside other relevant crime information.",
      "It's crucial for officers to thoroughly investigate before declaring Code Twelve to avoid missing a real crime.",
      "Code Twelve is not limited to specific alarm codes like Thirty or Thirty Adam. It can be used for any alarm call where no crime is found.",
    ],

    usage_contexts: [
      "When a silent 211 alarm is used for a non-robbery reason (e.g., medical emergency, panic attack).",
      "When an officer investigates an alarm call and finds no signs of forced entry, property damage, or suspicious activity.",
      "When the alarm appears to have been triggered by faulty equipment, human error, or environmental factors beyond the subscriber's control.",
    ],

    usage_examples: [
      "**Officer:** `Dispatch, 7L-41, Code Twelve at 456 Elm Street, Sunshine Bakery. Faulty equipment triggered alarm.`",
      "**Dispatch:** `Copy. All units, Code Twelve, 456 Elm Street, Sunshine Bakery.`",
      "**Officer:** *(After contacting the owner)* `Dispatch, 7L-41, owner confirmed false alarm. Alarm company notified.`",
    ],

    references: [
      `[Volume-4](${Volume4}#page=22)`,
      `[Communications Division Manual](${CDManual}#page=395)`,
    ],
  },
  {
    code: "Code 20",
    title: "Code Twenty",
    description: `
      **Request for Media Notification of Major Incident.**
      This code signifies a request from a field unit to notify LAPD Media Relations about a major incident or event that would likely attract significant public interest.
    `,

    notes: [
      "Code Twenty is not used for routine incidents or minor events.",
      "Officers requesting Code Twenty should specify the event's nature and location.",
      "Dispatch handles internal notifications to relevant stakeholders like Area Watch Commanders, Media Relations, and Real-Time Analysis unit.",
    ],

    usage_contexts: [
      "Traffic collisions or other events involving serious injuries, fatalities, or extensive property damage.",
      "Unusual or spectacular occurrences that capture public attention, like natural disasters, hostage situations, or high-profile arrests.",
      "Events where transparency and public information are crucial for managing public perception and maintaining trust.",
    ],

    usage_examples: [
      "**Officer:** `Dispatch, 7L-41, Code Twenty, major T/C, vehicles over the embankment, Sunset and Mulholland.`",
      "**Dispatch:** `7L-41, Roger, Code Twenty logged.`",
      "**AWC:** *(Notifies Media Relations, Area Watch Commander, and Communications Division)*",
      "**Media Relations:** *(Issues press release and sends media personnel to the scene)*",
    ],

    references: [
      `[Volume-4](${Volume4}#page=22)`,
      `[Communications Division Manual](${CDManual}#page=395)`,
    ],
  },
  {
    code: "Code 30",
    title: "Code Thirty",
    description: `
      **Silent Burglar Alarm Reported.**
      This code signifies a reported silent burglar alarm received by the LAPD from an alarm company or automated \
      recording. It alerts nearby units to be aware of the situation and potentially respond, but without committing \
      their full resources unless necessary.
    `,

    notes: [
      "While Code Thirty indicates a silent alarm, it doesn't necessarily mean a crime is in progress. Equipment malfunction, power outages, or unauthorized access attempts can trigger silent alarms.",
      "Nearby units are expected to respond but remain available for other calls unless further investigation or assistance requires going 'Code Six' (going off the air and fully focusing on the scene).",
      "Watch Commanders and supervisors encourage officers to prioritize responding to Code Thirty calls within their patrol area or if readily available to minimize response time.",
    ],
    usage_contexts: [
      "When a security system detects a potential breach or intrusion but doesn't trigger an audible alarm.",
      "When an alarm company contacts the police based on sensor activation or system monitoring.",
      "When an automated message system sends a notification of a potential break-in.",
    ],

    usage_examples: [
      "**Dispatch:** `All units, Code Thirty, 123 Main Street, ABC Bank. Silent alarm reported.`",
      "**Officer:** `Dispatch, 7A11 en route to 123 Main Street, Code Two.`",
      "**Officer:** *(upon arrival)* `Dispatch, 7A11 at 123 Main Street. No signs of forced entry or suspicious activity. False alarm might be indicated.`",
      "**Dispatch:** `7A11, Roger. Stand by if further assistance is needed, otherwise resume normal patrol.`",
    ],

    references: [
      `[Volume-4](${Volume4}#page=22)`,
      `[Communications Division Manual](${CDManual}#page=396)`,
    ],
  },
  {
    code: "Code 30-A",
    title: "Code Thirty Adam",
    description: `
      **Silent Alarm with Audible Monitoring.**
      This code signifies a report of a silent burglar alarm from an alarm company where the location is actively monitored for sounds and movement inside. \
      This monitoring might involve microphones, motion sensors, or other technological solutions.
    `,

    notes: [
      "Code Thirty Adam requires extra caution and vigilance from officers due to the potential for an active crime in progress.",
      "Officers in the vicinity respond to Code Thirty Adam calls but remain available for other emergencies unless further assistance or investigation requires them to switch to 'Code Six.'",
      "If the location appears secure with no audible activity, officers might need to investigate further or request additional resources based on the information provided by the alarm company.",
    ],
    usage_contexts: [
      "Similar to Code Thirty, but in situations where the alarm company has additional audio capabilities to assess the situation remotely.",
      "Used when a silent alarm triggers and the company suspects potential criminal activity based on the sounds they hear.",
    ],
    usage_examples: [
      "**Dispatch:** `All units, Code Thirty Adam, 456 Elm Street, Green Bank Bank. Silent alarm with audio monitoring.`",
      "**Officer:** `Dispatch, 7L12 en route to 456 Elm Street, Code Two.`",
      "**Officer:** *(upon arrival)* `Dispatch, 7L12 at 456 Elm Street. Perimeter secure. Confirming with alarm company regarding any detected activity inside.`",
      "**Dispatch:** `7L12, Roger. Alarm company reports footsteps and muffled voices near the back office.`",
      "**Officer:** `Understood. Requesting backup and establishing containment.`",
    ],

    references: [
      `[Volume-4](${Volume4}#page=22)`,
      `[Communications Division Manual](${CDManual}#page=396)`,
    ],
  },
  {
    code: "Code 30-R",
    title: "Code Thirty Ringer",
    description: `
      **Audible Burglar Alarm Activated.**
      This code signifies a report of a ringing burglar alarm, meaning the alarm is actively emitting an audible sound and/or \
      flashing lights to indicate a potential break-in. The report can come from an individual witness, the alarm company itself, or even a field unit responding to another call.
    `,

    references: [
      `[Volume-4](${Volume4}#page=23)`,
      `[Communications Division Manual](${CDManual}#page=396)`,
    ],
  },
  {
    code: "Code 30-V",
    title: "Code Thirty Victor",
    description: `
      **Silent Alarm with Video Surveillance.**
      This code signifies a report of a silent burglar alarm from an alarm company where the location is monitored via remote \
      video surveillance. This means the alarm itself doesn't make any noise, but the alarm company can remotely see what's \
      happening inside and capture photos of potential intruders.
    `,

    references: [
      `[Volume-4](${Volume4}#page=23)`,
      `[Communications Division Manual](${CDManual}#page=396)`,
    ],
  },
  {
    code: "Code 37",
    title: "Code Thirty Seven",
    description: `
      **Stolen Vehicle Database Hit.**
      This code signifies that a vehicle license plate check conducted by Communications Division personnel has returned a \
      positive hit in the stolen vehicle database. This means the car associated with the license plate is reported stolen \
      and potentially requires immediate action.
    `,

    notes: [
      "Officers responding to a Code Thirty-Seven employ appropriate defensive tactics and report pertinent information like location, direction of travel, and suspect details.",
      "Once the suspect(s) are under control and no further assistance is needed, the responding officer broadcasts 'Code Four' to confirm resolution.",
      "Code Thirty-Seven is not used for high-risk stolen vehicles associated with armed robbery, felony warrants, etc. In such cases, a 'Code Six Charles' is broadcasted due to the increased danger level.",
      "Code Thirty-Seven is different from 'Code Six Charles,' which is used for high-risk stolen vehicles associated with armed and dangerous suspects or serious felonies.",
    ],

    usage_examples: [
      {
        title: "Dispatch:",
        description:
          "All units, Code Thirty-Seven, 178 Adam, Edward, Charlie, Blue Honda Civic, northbound on Sunset Boulevard.",
      },
      {
        title: "Officer-1:",
        description:
          "Dispatch, 7A-42 in pursuit of Code Thirty-Seven suspect vehicle, turning onto Pico Boulevard.",
      },
      {
        title: "Officer-2:",
        description:
          "Dispatch, 7A-82, suspects stopped and under control at Sunset and Pico, requesting backup.",
      },
      {
        title: "Dispatch:",
        description: "All units, Code Four on the Code Thirty-Seven, Sunset and Pico.",
      },
    ],

    references: [
      `[Volume-4](${Volume4}#page=23)`,
      `[Communications Division Manual](${CDManual}#page=397)`,
    ],
  },
  {
    code: "Code 100",
    title: "Code One Hundred",
    description: `
      **Temporary Surveillance at Escape Route**
      This code signifies a field unit's notification to establish temporary surveillance at a location believed to be a potential escape route from a recent crime scene.
    `,

    notes: [
      "Code One Hundred indicates a temporary measure to monitor a specific location, not a full-scale perimeter containment.",
      "The officer establishing surveillance remains mobile and can adjust their location within the vicinity based on the situation.",
    ],

    usage_contexts: [
      "When officers respond to a crime scene and identify a nearby road, alley, or area that could be used by the suspect to flee.",
      "The officer establishes temporary surveillance of this potential escape route to monitor for suspicious activity or the actual fleeing suspect.",
      "This informs other officers and Dispatch about the potential escape route and facilitates coordinated response.",
    ],

    usage_examples: [
      {
        title: "Officer:",
        description:
          "Dispatch, 7A11 establishing temporary surveillance at San Pedro and 2nd, possible escape route from the bank robbery. Code One Hundred.",
      },
      {
        title: "Dispatch:",
        description:
          "1A11, Roger, Code One Hundred received, San Pedro and 2nd. *(Logs incident and informs other units)*",
      },
    ],

    references: [
      `[Volume-4](${Volume4}#page=23)`,
      `[Communications Division Manual](${CDManual}#page=397)`,
    ],
  },
  {
    code: "Code Tom",
    title: "...",
    description: `
      **Urgent Call for Unit with TASER.**
      Code Tom signifies a request from a field unit for a unit equipped with a TASER to respond to an occurrence involving a potentially violent person.
    `,

    notes: [
      "Code Tom is distinct from other less-lethal force options like beanbag shotguns, which are requested using different codes.",
      "Officers requesting Code Tom should broadcast their unit designation, location, and 'Code Tom' on the appropriate Area Group channel.",
      "Dispatch will log the request and assign a Taser-equipped unit to respond to the situation.",
    ],

    usage_contexts: [
      "When an officer encounters a situation where a suspect or individual exhibits aggressive behavior and poses a threat to themselves or others.",
      "Situations where de-escalation tactics are necessary but might be insufficient, making TASER deployment a potential option.",
    ],

    references: [
      `[Volume-4](${Volume4}#page=23)`,
      `[Communications Division Manual](${CDManual}#page=398)`,
    ],
  },
  {
    code: "Code Sam",
    title: "...",
    description: `
      **Urgent Call for Unit with Beanbag Shotgun.**
      Code Sam signifies a request from a field unit for a unit equipped with a beanbag shotgun to respond to an occurrence requiring less-lethal force.
    `,

    notes: [
      "Code Sam is a high-priority request and requires immediate response from available beanbag shotgun-equipped units.",
      "The requesting officer broadcasts their unit designation, location, and 'Code Sam' on the appropriate Area Group channel.",
    ],

    usage_contexts: [
      "When an officer encounters a situation where a suspect or individual exhibits dangerous behavior and poses a significant threat, but lethal force is not justified or desirable.",
      "Often used in cases involving barricaded suspects, individuals armed with non-firearms, or those exhibiting violent behavior that could endanger themselves or others.",
      "Situations where using a TASER might be insufficient or inappropriate, making the beanbag shotgun a preferred alternative to lethal force.",
    ],

    references: [
      `[Volume-4](${Volume4}#page=23)`,
      `[Communications Division Manual](${CDManual}#page=398)`,
    ],
  },
  {
    code: "Code Robert-Rifle/Robert-Slug",
    title: "...",
    description: `
      **High-Risk Situation Requiring Patrol Rifle or Slug Ammunition.**
      Code Robert, in its two variations (Rifle and Slug), signifies a request from a field unit for immediate assistance \
      from a patrol unit equipped with a rifle or slug ammunition. This indicates a high-risk situation where potentially lethal force might be necessary.
    `,

    notes: [
      "Code Robert is the highest-priority LAPD code and requires immediate response from available rifle or slug ammunition-equipped units.",
      "Upon receiving the code, Dispatch immediately broadcasts it twice on Area Group and assigns a dedicated rifle unit and supervisor.",
    ],

    usage_contexts: [
      "When an officer encounters an armed suspect posing an imminent threat to themselves or others.",
      "Situations involving barricaded suspects with firearms, hostage situations, or active shooters.",
      "Used only when de-escalation tactics and less-lethal options are deemed ineffective or unsafe.",
    ],

    usage_examples: [
      {
        title: "Officer:",
        description:
          "Dispatch, Code Robert-Rifle, armed suspect with hostages, 456 Main Street, Bank of America.",
      },
      {
        title: "Dispatch:",
        description:
          "All units, Code Robert-Rifle, high priority, 7A-45 at 456 Main Street, Bank of America. Armed suspect, hostages, stand by on base frequency.",
      },
      {
        title: "Specialized Unit:",
        description: "7L-78, Responding to Code Robert-Rifle, ETA two minutes.",
      },
    ],

    references: [
      `[Volume-4](${Volume4}#page=23)`,
      `[Communications Division Manual](${CDManual}#page=398)`,
    ],
  },
];

// ---------------------------------------------------------------------------------------
// NOTE:
// LAPD does not use the Ten or Eleven Codes like other agencies (at least not usually), but plain English.
// Sources include:
// https://qr.ae/pK3mvq
// https://www.reddit.com/r/lapd/comments/osuqbv
// https://www.police1.com/police-products/communications/articles/police-10-codes-vs-plain-language-the-history-and-ongoing-debate-zFVa5Fkggm8NKBPM

// ---------------------------------------------------------------------------------------
// Text Formatting Logic:
// ----------------------
function FormatTD(Input: TDSType[number]) {
  if (typeof Input === "string") {
    return Dedent(Input.replace(/\s{2,}/g, " "));
  } else {
    Input.description = Dedent(Input.description.replace(/\s{2,}/g, " "));
    if (!Input.title.startsWith("**")) {
      if (Input.title.match(/\(.+\)/)) {
        const TMs = Input.title.match(/(.+) \**\((.+)\)\**/);
        Input.title = `**${TMs![1]}** *${TMs![2]}*`;
      } else {
        Input.title = `**${Input.title}**`;
      }
    }
    return Input;
  }
}

LiteralCodes.forEach((Code) => {
  Code.description = Dedent(Code.description);
  Code.usage_contexts?.forEach((Ct) => FormatTD(Ct));
  Code.usage_examples?.forEach((Ex) => FormatTD(Ex));
  Code.notes?.forEach((Note) => FormatTD(Note));
});
