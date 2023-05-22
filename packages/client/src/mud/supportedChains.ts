import { MUDChain, latticeTestnet } from "@latticexyz/common/chains";
import { foundry } from "@wagmi/chains";

const opDevnet = {
  id: 901,
  name: "Optimism Devnet",
  network: "op-devnet",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
      webSocket: ["http://127.0.0.1:8546"],
    },
    public: {
      http: ["http://127.0.0.1:8545"],
      webSocket: ["http://127.0.0.1:8546"],
    },
  },
};

// If you are deploying to chains other than anvil or Lattice testnet, add them here
export const supportedChains: MUDChain[] = [foundry, latticeTestnet, opDevnet];
