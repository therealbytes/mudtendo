import { ClientComponents } from "./createClientComponents";
import { SetupNetworkResult } from "./setupNetwork";
import { ActionStruct } from "contracts/types/ethers-contracts/IWorld";
import { utils } from "ethers";

export type SystemCalls = ReturnType<typeof createSystemCalls>;

export function createSystemCalls(
  { worldSend }: SetupNetworkResult,
  { }: ClientComponents
) {
  const createCartridge = async (
    staticHash: utils.BytesLike,
    dynHash: utils.BytesLike
  ) => {
    worldSend("createCartridge", [staticHash, dynHash, { gasLimit: 1000000 }]);
  };
  const playCartridge = async (id: bigint, activity: ActionStruct[]) => {
    worldSend("playCartridge", [id, activity, { gasLimit: 25000000 }]);
  };
  return {
    playCartridge,
    createCartridge,
  };
}
