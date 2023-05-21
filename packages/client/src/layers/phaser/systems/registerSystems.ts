import { PhaserLayer } from "../createPhaserLayer";
import { createCamera } from "./createCamera";
import { createCartridgeSystem } from "./createCartridgeSystem";
// import { createMapSystem } from "./createMapSystem";

export const registerSystems = (layer: PhaserLayer) => {
  createCamera(layer);
  // createMapSystem(layer);
  createCartridgeSystem(layer);
};
