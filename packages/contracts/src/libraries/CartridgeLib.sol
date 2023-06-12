// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import { Cartridge, CartridgeData } from "../codegen/Tables.sol";
import { ID } from "../codegen/Tables.sol";
import { NES, Action, NES_ADDRESS } from "neschain/NES.sol";

bool constant PC_ON = true;

library CartridgeLib {
    function play(address author, uint256 id, Action[] memory activity) internal returns (uint256) {
        CartridgeData memory cartridge = Cartridge.get(id);
        bytes32 newDynHash;
        if (PC_ON) {
            newDynHash = NES(NES_ADDRESS).run(cartridge.staticRoot, cartridge.dynRoot, activity);
        } else {
            newDynHash = cartridge.dynRoot;
        }
        return create(author, id, cartridge.staticRoot, newDynHash);
    }

    function create(address author, uint256 parent, bytes32 staticRoot, bytes32 dynRoot) internal returns (uint256) {
        uint256 id = ID.get() + 1;
        ID.set(id);
        Cartridge.set(id, author, parent, staticRoot, dynRoot);
        return id;
    }
}