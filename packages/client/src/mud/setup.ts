import { createClientComponents } from "./createClientComponents";
import { createSystemCalls } from "./createSystemCalls";
import { createWasm } from "./createWasm";
import { createPreimageRegistry } from "./createPreimageRegistry";
import { setupNetwork } from "./setupNetwork";

export type SetupResult = Awaited<ReturnType<typeof setup>>;

export async function setup() {
  const network = await setupNetwork();
  const components = createClientComponents(network);
  const systemCalls = createSystemCalls(network, components);
  const wasm = await createWasm();
  const preimageRegistry = createPreimageRegistry(network);
  return {
    network,
    components,
    systemCalls,
    wasm,
    preimageRegistry,
  };
}
