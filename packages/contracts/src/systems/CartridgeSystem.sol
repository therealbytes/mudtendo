// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import { System } from "@latticexyz/world/src/System.sol";
import { CartridgeLib, Action } from "../libraries/CartridgeLib.sol";

contract CartridgeSystem is System {
  function createCartridge(bytes32 staticHash, bytes32 dynHash) public {
    uint256 parent = 0;
    CartridgeLib.create(_msgSender(), parent, staticHash, dynHash);
  }
  function playCartridge(uint256 id, Action[] memory activity) public {
    CartridgeLib.play(_msgSender(), id, activity);
  }
}
