// Incident Report Constants; Exported for use in other files.
// -----------------------------------------------------------

export const IncidentDescriptionLength = {
  Min: 20,
  Max: 850,
};

export const IncidentNotesLength = {
  Min: 8,
  Max: 228,
};

export enum IncidentStatuses {
  Active = "Active",
  Closed = "Closed",
  ColdCase = "Cold Case",
  ReferredToOtherAgency = "Referred to Other Agency",
}

export enum ActiveIncidentStatus {
  UnderInvestigation = "Under Investigation",
  SuspectAtLarge = "Suspect at Large",
  InProgress = "In Progress",
}

export enum ClosedIncidentStatus {
  ClearedByArrest = "Cleared by Arrest",
  ClearedByExceptionalMeans = "Cleared by Exceptional Means",
  Inactivated = "Inactivated",
  Unfounded = "Unfounded",
}

export const IncidentStatusesFlattened = [
  ...Object.values(IncidentStatuses).map((Status) => Status),
  ...Object.values(ActiveIncidentStatus).map((Status) => `${IncidentStatuses.Active}: ${Status}`),
  ...Object.values(ClosedIncidentStatus).map((Status) => `${IncidentStatuses.Closed}: ${Status}`),
] as const;

const StatusDescriptions: Record<string, string> = {
  [IncidentStatuses.Active]: "Incident is currently active.",
  [IncidentStatuses.Closed]: "Incident has been closed.",
  [IncidentStatuses.ColdCase]: "Case has not been solved and is considered inactive.",
  [IncidentStatuses.ReferredToOtherAgency]:
    "Case has been transferred to another law enforcement agency for investigation.",

  [`${[IncidentStatuses.Active]}: ${ActiveIncidentStatus.InProgress}`]:
    "Incident is currently being worked on",

  [`${[IncidentStatuses.Active]}: ${ActiveIncidentStatus.SuspectAtLarge}`]:
    "The suspect is still on the loose and being sought by authorities.",

  [`${[IncidentStatuses.Active]}: ${ActiveIncidentStatus.UnderInvestigation}`]:
    "The incident is being actively investigated by law enforcement.",

  [`${[IncidentStatuses.Closed]}: ${ClosedIncidentStatus.ClearedByArrest}`]:
    "The suspect has been arrested and charged with the crime.",

  [`${[IncidentStatuses.Closed]}: ${ClosedIncidentStatus.ClearedByExceptionalMeans}`]:
    "The case has been closed due to factors outside of law enforcement's control.",

  [`${[IncidentStatuses.Closed]}: ${ClosedIncidentStatus.Inactivated}`]:
    "The reported incident was found to be false or unsubstantiated.",

  [`${[IncidentStatuses.Closed]}: ${ClosedIncidentStatus.Unfounded}`]:
    "The case has been temporarily suspended due to lack of evidence or leads.",
};

export const IncidentStatusesWithDescriptions = [
  ...Object.values(IncidentStatuses).map((Status) => ({
    status: Status,
    description: StatusDescriptions[Status],
  })),
  ...Object.values(ActiveIncidentStatus).map((Status) => ({
    status: `${IncidentStatuses.Active}: ${Status}`,
    description: StatusDescriptions[`Active: ${Status}`],
  })),
  ...Object.values(ClosedIncidentStatus).map((Status) => ({
    status: `${IncidentStatuses.Closed}: ${Status}`,
    description: StatusDescriptions[`Closed: ${Status}`],
  })),
] as const;

export const IncidentTypes = [
  "Pursuit",
  "Robbery",
  "Assault",
  "Burglary",
  "Shooting",
  "Homicide",
  "Gang Activity",
  "Traffic Collision",
  "Hostage Situation",
  "Firearm Discharge",
  "Medical Emergency",
  "Noise Complaint",
  "Public Disturbance",
  "Domestic Disturbance",
  "Attempted Robbery",
  "Attempted Murder",
  "Residential Fire",
  "Commercial Fire",
  "Structure Fire",
  "Bush Fire",
  "Other",
] as const;
