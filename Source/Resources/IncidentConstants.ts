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

  /** The case has not been solved and is considered inactive, but may be reopened if new evidence becomes available. */
  ColdCase = "Cold Case",

  /** The case has been transferred to another law enforcement agency for investigation. */
  ReferredToOtherAgency = "Referred to Other Agency",
}

export enum ActiveIncidentStatus {
  /** The incident is being actively investigated by law enforcement. */
  UnderInvestigation = "Under Investigation",

  /** The suspect is still on the loose and being sought by authorities. */
  SuspectAtLarge = "Suspect at Large",

  /** The incident is still ongoing. */
  InProgress = "In Progress",
}

export enum ClosedIncidentStatus {
  /** The suspect has been arrested and charged with the crime. */
  ClearedByArrest = "Cleared by Arrest",

  /** The case has been closed due to factors outside of law enforcement's control (e.g., suspect deceased, victim unwilling to cooperate). */
  ClearedByExceptionalMeans = "Cleared by Exceptional Means",

  /** The reported incident was found to be false or unsubstantiated. */
  Inactivated = "Inactivated",

  /** The case has been temporarily suspended due to lack of evidence or leads. */
  Unfounded = "Unfounded",
}

export const IncidentStatusesFlattened = [
  ...Object.values(IncidentStatuses).map((Status) => Status),
  ...Object.values(ActiveIncidentStatus).map((Status) => `${IncidentStatuses.Active}: ${Status}`),
  ...Object.values(ClosedIncidentStatus).map((Status) => `${IncidentStatuses.Closed}: ${Status}`),
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
