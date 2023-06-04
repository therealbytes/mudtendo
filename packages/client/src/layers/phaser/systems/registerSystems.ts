import { PhaserLayer } from "../createPhaserLayer";
import { createCamera } from "./createCamera";
import { createConsoleSystem } from "./createConsoleSystem";

export const registerSystems = (layer: PhaserLayer) => {
  createCamera(layer);
  createConsoleSystem(layer);
};
