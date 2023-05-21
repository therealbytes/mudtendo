import { mudConfig } from "@latticexyz/world/register";

export default mudConfig({
  tables: {
    ID: {
      keySchema: {},
      schema: {
        cartridges: "uint256",
      },
    },
    Cartridge: {
      keySchema: {
        id: "uint256",
      },
      schema: {
        author: "address",
        parent: "uint256",
        staticHash: "bytes32",
        dynHash: "bytes32",
      },
    },
  },
});
