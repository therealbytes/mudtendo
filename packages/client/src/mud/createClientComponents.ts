import { defineComponent, Type as RecsType } from "@latticexyz/recs";
import { SetupNetworkResult } from "./setupNetwork";

export type ClientComponents = ReturnType<typeof createClientComponents>;

export function createClientComponents({
  components,
  world,
}: SetupNetworkResult) {
  const positionComponent = defineComponent(world, {
    x: RecsType.Number,
    y: RecsType.Number,
  });
  return {
    positionComponent,
    ...components,
  };
}
