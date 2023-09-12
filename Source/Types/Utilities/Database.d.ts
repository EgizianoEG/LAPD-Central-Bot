import type { Schema } from "mongoose";

declare global {
  namespace Utilities.Database {
    interface GuildShiftType {
      /** The unique shift type name */
      name: string;

      /** Is this the default shift type? */
      is_default: boolean;

      /** All roles that can utilize this specific duty shift type */
      permissible_roles: string[];
    }

    /** Bot (application) or guild management/staff permissions.
     * If a boolean value given to a parent property, it acts like logical OR
     * meaning that if the object is `{ management: true }`; then the check will succeed
     * if the user has one of the permissions for management (guild scope or app scope); otherwise it will fail.
     */
    interface UserPermissionsData {
      management?:
        | boolean
        | ({
            guild?: boolean;
            app?: boolean;
          } & Pick<LogicalOperations, "$and" | "$or">);

      staff?: boolean;
      // | ({
      //     guild?: boolean;
      //     app?: boolean;
      //   } & Pick<LogicalOperations, "$and" | "$or">);
    }
  }
}

interface LogicalOperations {
  $and?: boolean;
  $or?: boolean;
  $not?: boolean;
  $nor?: boolean;
}
