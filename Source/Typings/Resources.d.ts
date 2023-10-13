export namespace Vehicles {
  interface VehicleData {
    /** The real-world manufacturer's brand name (e.g., Ford) */
    brand: string;

    /** The in-game counterpart brand name (e.g., Falcon for Ford) */
    counterpart: string;

    /** An array of in-game vehicle models associated with the brand */
    models: VehicleModel[];
  }

  interface VehicleModelYear {
    /** The real-world vehicle model year */
    org: string;

    /** The in-game alternate vehicle model year */
    alt: string;
  }

  interface VehicleModel {
    /** The real-world name of the vehicle model */
    name: string;

    /** The in-game alias of the vehicle model */
    alias: string;

    /** The category of the vehicle in the game (e.g., Regular, Luxury) */
    category: "Regular" | "Luxury" | "Exotic" | "Classic";

    /** The class of the vehicle in the game (e.g., Car, SUV) */
    class: "Car" | "SUV" | "Truck" | "Industrial";

    /** Model years of the vehicle, both original and in-game alternate */
    model_year: VehicleModelYear;

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
  }
}

declare global {
  namespace Resources.ERLCVehicles {
    type VehicleModel = ERLCVehicles.VehicleModel;
    type VehicleModelYear = ERLCVehicles.VehicleModelYear;
    type VehicleResources = ERLCVehicles.VehicleResources;
  }
}
