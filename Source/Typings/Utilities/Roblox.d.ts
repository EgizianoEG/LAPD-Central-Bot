export namespace RobloxAPI.Users {
  interface GetUserResponse {
    /** The about/description of the user. */
    description: string;

    /** The date string indicating when the user signed up (RFC 3339). */
    created: string;

    /** Whether or not the user is banned. */
    isBanned: boolean;

    /** The display name in an external app. Unused, legacy attribute.
     * For now always `null` to not disturb existing client code that might rely on its existence.
     * */
    externalAppDisplayName: string | null;

    /** The user's verified badge status. */
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

  interface UsernameQuery {
    Keyword: string;
    StartIndex: number;
    MaxRows: number;
    TotalResults: number;
    UserSearchResults: Users.UserSearchResult[];
  }

  interface MultiGetByNameResponse {
    data: [
      {
        id: number;
        name: string;
        displayName: string;
        hasVerifiedBadge: boolean;
        requestedUsername: string;
      },
    ];
  }
}

export namespace RobloxAPI.Presence {
  interface UserPresencesResponse {
    userPresences: [
      {
        /** The Id of the user. */
        userId: number;

        /** User presence Type ['Offline' = 0, 'Online' = 1, 'InGame' = 2, 'InStudio' = 3, 'Invisible' = 4] */
        userPresenceType: 0 | 1 | 2 | 3 | 4;

        /** The user's last location if applicable. Could be an empty string (`""`). */
        lastLocation: string;

        /** The Id of the current place. Available if the user status is `2` (In Game). */
        placeId: number | null;

        /** The Id of the root place. Available if the user status is `2` (In Game). */
        rootPlaceId: number | null;

        /** The Id of the game as a UUID string. Available if the user status is `2` (In Game). */
        gameId: string | null;

        /** The Id of the universe. Available if the user status is `2` (In Game). */
        universeId: number | null;

        /** The last seen date string. Can be convert to normal Date object. */
        lastOnline: string;

        // invisibleModeExpiry: string;
      },
    ];
  }
}

declare global {
  namespace Utilities.Roblox {
    type UserPresence = RobloxAPI.Presence.UserPresence;
    type UserSearchResult = RobloxAPI.Users.UserSearchResult;
    type UserProfileDetails = RobloxAPI.Users.GetUserResponse;
  }
}
