namespace Utilities.Database {
  declare interface GuildShiftType {
    /** The name of the shift type */
    name: string;

    /** The roles whose holders can utilize this shift type */
    permissible_roles: string[];

    /** Whether this shift type is the default one or not */
    is_default?: boolean;

    /** A unique id (ObjectId) provided from mongodb of the shift type */
    _id?: import("mongoose").ObjectId;
  }
}
