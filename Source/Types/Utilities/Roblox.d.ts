namespace Utilities.Roblox {
  interface UserProfileDetails {
    /** The about/description of the user. */
    description: string;

    /** The timestamp when the user profile was created (RFC 3339). */
    created: string;

    /** Indicates whether the user is banned or not. */
    isBanned: boolean;

    /** The display name in an external app, if available. */
    externalAppDisplayName?: string | null;

    /** Indicates if the user has a verified badge. */
    hasVerifiedBadge: boolean;

    /** The unique identifier for the user. */
    id: number;

    /** The username of the user. */
    name: string;

    /** The display name of the user. */
    displayName: string;
  }

  interface UserSearchResult {
    /** The id of the user. */
    UserId: number;

    /** The username of the user. */
    Name: string;

    /** The display name of the user. */
    DisplayName: string;

    /** A brief description of the user. */
    Blurb: string;

    /** A comma-separated list of the user's previous usernames. */
    PreviousUserNamesCsv: string;

    /** Whether the user is online. */
    IsOnline: boolean;

    /** The user's last known location. */
    LastLocation?: string;

    /** The URL of the user's profile page. */
    UserProfilePageUrl: string;

    /** The user's last seen date. */
    LastSeenDate?: string;

    /** The user's primary group. */
    PrimaryGroup: string;

    /** The URL of the user's primary group. */
    PrimaryGroupUrl: string;

    /** Whether the user has a verified badge. */
    HasVerifiedBadge: boolean;
  }

  interface UserPresence {
    /**
     * The user presence type. Possible values: 0 = Offline, 1 = Online, 2 = InGame, 3 = InStudio, 4 = Invisible.
     */
    userPresenceType: 0 | 1 | 2 | 3 | 4;
    /**
     * The user's last location.
     */
    lastLocation: string | "";
    /**
     * The ID of the current place.
     */
    placeId: number | null;
    /**
     * The ID of the root place.
     */
    rootPlaceId: number | null;
    /**
     * The ID of the game. (Format: UUID)
     */
    gameId: string | null;
    /**
     * The ID of the universe.
     */
    universeId: number | null;
    /**
     * The ID of the user.
     */
    userId: number;
    /**
     * The timestamp indicating the last online time. (Format: Date-Time)
     */
    lastOnline: string;
  }
}
