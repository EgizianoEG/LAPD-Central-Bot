import {} from "@Utilities";

declare global {
  namespace Resources {
    interface VehicleModelData {
      /** The real-world manufacturer's brand name (e.g., Ford) */
      brand: string;

      /** The in-game counterpart brand name (e.g., Falcon for Ford) */
      counterpart: string;

      /** An array of in-game vehicle models associated with the brand */
      models: VehicleModel[];
    }

    interface VehicleModel {
      /** The real-world name of the vehicle model */
      name: string;

      /** The in-game alias of the vehicle model */
      alias: string;

      /** The style of the vehicle's body (e.g., Sedan, Coupe) */
      style:
        | "Sedan"
        | "Coupe"
        | "Convertible"
        | "Hatchback"
        | "SUV"
        | "Wagon"
        | "Tractor"
        | "Pickup"
        | "Truck"
        | "Van"
        | "Bus";

      /** The category of the vehicle in the game (e.g., Regular, Luxury) */
      category: "Regular" | "Luxury" | "Exotic" | "Classic";

      /** The class of the vehicle in the game (e.g., Car, SUV) */
      class: "Car" | "SUV" | "Truck" | "Industrial";

      /** Model years of the vehicle, both original and in-game alternate */
      model_year: VehicleModelYear;
    }
  }
}

interface VehicleModelYear {
  /** The real-world vehicle model year */
  org: string;

  /** The in-game alternate vehicle model year */
  alt: string;
}
