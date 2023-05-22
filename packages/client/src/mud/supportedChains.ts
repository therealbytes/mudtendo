import { MUDChain, latticeTestnet } from "@latticexyz/common/chains";
import { foundry } from "@wagmi/chains";

const opDevnet = {
  name: "Optimism Devnet",
  id: 901,
  network: "op-devnet",
  nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:9545"],
      webSocket: ["ws://127.0.0.1:9546"],
    },
    public: {
      http: ["http://127.0.0.1:9545"],
      webSocket: ["ws://127.0.0.1:9546"],
    },
  },
} as const satisfies MUDChain;

// If you are deploying to chains other than anvil or Lattice testnet, add them here
export const supportedChains: MUDChain[] = [foundry, latticeTestnet, opDevnet];
