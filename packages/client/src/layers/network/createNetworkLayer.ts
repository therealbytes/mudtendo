import { world } from "../../mud/world";
import { setup } from "../../mud/setup";

export type NetworkLayer = Awaited<ReturnType<typeof createNetworkLayer>>;

export const createNetworkLayer = async () => {
  const {
    components,
    network: { singletonEntity, playerEntity },
    systemCalls,
    wasm,
    preimageRegistry,
  } = await setup();

  // Give components a Human-readable ID
  Object.entries(components).forEach(([name, component]) => {
    component.id = name;
  });

  return {
    world,
    singletonEntity,
    systemCalls,
    components,
    playerEntity,
    wasm,
    preimageRegistry,
  };
};
