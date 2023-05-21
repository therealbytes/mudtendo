// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import { Cartridge, CartridgeData } from "../codegen/Tables.sol";
import { ID } from "../codegen/Tables.sol";
import { NES, Action, NES_ADDRESS } from "neschain/NES.sol";

bool constant PC_ON = false;

library CartridgeLib {
    function play(address author, uint256 id, Action[] memory activity) internal returns (uint256) {
        CartridgeData memory cartridge = Cartridge.get(id);
        bytes32 newDynHash;
        if (PC_ON) {
            newDynHash = NES(NES_ADDRESS).run(cartridge.staticHash, cartridge.dynHash, activity);
        } else {
            newDynHash = bytes32(uint256(0xff));
        }
        return create(author, id, cartridge.staticHash, newDynHash);
    }

    function create(address author, uint256 parent, bytes32 staticHash, bytes32 dynHash) internal returns (uint256) {
        uint256 id = ID.get() + 1;
        ID.set(id);
        Cartridge.set(id, author, parent, staticHash, dynHash);
        return id;
    }
}