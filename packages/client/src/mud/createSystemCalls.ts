import { ClientComponents } from "./createClientComponents";
import { SetupNetworkResult } from "./setupNetwork";
import { ActionStruct } from "contracts/types/ethers-contracts/IWorld";
import { utils } from "ethers";

export type SystemCalls = ReturnType<typeof createSystemCalls>;

export function createSystemCalls(
  { worldSend }: SetupNetworkResult,
  {}: ClientComponents
) {
  const createCartridge = async (
    staticRoot: utils.BytesLike,
    dynRoot: utils.BytesLike
  ) => {
    worldSend("createCartridge", [
      staticRoot,
      dynRoot,
      { gasLimit: 300000, maxFeePerGas: 10000000000, maxPriorityFeePerGas: 10000000000 },
    ]);
  };
  const playCartridge = async (id: bigint, activity: ActionStruct[]) => {
    worldSend("playCartridge", [
      id,
      activity,
      { gasLimit: 10000000, maxFeePerGas: 10000000000, maxPriorityFeePerGas: 10000000000 },
    ]);
  };
  return {
    playCartridge,
    createCartridge,
  };
}
