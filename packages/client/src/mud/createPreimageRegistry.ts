import { SetupNetworkResult } from "./setupNetwork";
import { Contract, utils } from "ethers";

type PreimageRegistry = {
  getPreimageSize: (hash: Uint8Array) => Promise<number>;
  getPreimage: (hash: Uint8Array) => Promise<Uint8Array>;
};

const preimageRegistryABI = [
  "function getPreimageSize(bytes32) view returns (uint256)",
  "function getPreimage(uint256, bytes32) view returns (bytes memory)",
];
const preimageRegistryAddress = "0xcc00000000000000000000000000000000000002";

export function createPreimageRegistry({
  network: { providers },
}: SetupNetworkResult): PreimageRegistry {
  const currentProviders = providers.get();
  const provider =
    currentProviders.json === undefined
      ? currentProviders.ws
      : currentProviders.json;
  const contract = new Contract(
    preimageRegistryAddress,
    preimageRegistryABI,
    provider
  );

  return {
    getPreimageSize: async (hash: Uint8Array) => {
      const size = await contract.getPreimageSize(hash);
      return size.toNumber();
    },
    getPreimage: async (hash: Uint8Array) => {
      const size = await contract.getPreimageSize(hash);
      try {
        const preimage = await contract.getPreimage(size, hash);
        return utils.arrayify(preimage);
      } catch (e) {
        return new Uint8Array();
      }
    },
  };
}
