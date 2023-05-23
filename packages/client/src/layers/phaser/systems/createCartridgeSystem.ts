import {
  Has,
  defineEnterSystem,
  defineSystem,
  getComponentValueStrict,
  getEntitiesWithValue,
  getComponentEntities,
  hasComponent,
  setComponent,
  Entity,
} from "@latticexyz/recs";
import {
  pixelCoordToTileCoord,
  tileCoordToPixelCoord,
} from "@latticexyz/phaserx";

import { PhaserLayer } from "../createPhaserLayer";
import { TILE_HEIGHT, TILE_WIDTH, Animations } from "../constants";
import { hexStringToUint8Array } from "@latticexyz/utils";
import { ActionStruct } from "contracts/types/ethers-contracts/IWorld";
import { providers, utils, Contract } from "ethers";

const { WebSocketProvider } = providers;

export function createCartridgeSystem(layer: PhaserLayer) {
  const {
    world,
    networkLayer: {
      components: { Cartridge, positionComponent, ID },
      systemCalls: { createCartridge, playCartridge },
      playerEntity,
      wasm: { api: nes },
    },
    scenes: {
      Main: { objectPool, input, camera },
    },
  } = layer;

  // Ugly! Ugly! Ultra ugly!

  const provider = new WebSocketProvider("ws://localhost:9546");
  const contractABI = [
    "function getPreimageSize(bytes32) view returns (uint256)",
    "function getPreimage(uint256, bytes32) view returns (bytes memory)",
  ];
  const contract = new Contract(
    "0x0000000000000000000000000000000000000080",
    contractABI,
    provider
  );

  // We have to provably-trivial problems.
  // 1. PI fetching fails, possibly because they are to big. Should have merkleized!
  // 2. Local and remote execution don't quite match. Something is wrong with activity recording/replaying.
  const hashOverrides = new Map<Entity, string>();
  // This is so ugly.
  let lastHash: string;

  async function fetchPreimageFromChain(hash: Uint8Array): Promise<Uint8Array> {
    const hexHash = utils.hexlify(hash);
    const arrHash = utils.arrayify(hexHash);
    const size = await contract.getPreimageSize(arrHash);
    try {
      const preimage = await contract.getPreimage(size, arrHash);
      return utils.arrayify(preimage);
    } catch (e) {
      return new Uint8Array();
    }
  }

  // TODO: Ugly! Take hash?
  function fetchPreimageFromServer(url: string): Promise<Uint8Array> {
    return fetch(url)
      .then((response) => {
        if (!response.ok) {
          if (response.status === 404) {
            return new Blob(); // Return an empty Blob if the file is not found
          }
          throw new Error("Network response was not ok");
        }
        return response.blob();
      })
      .then((blob) => {
        return new Promise<Uint8Array>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const arrayBuffer = reader.result as ArrayBuffer;
            const uint8Array = new Uint8Array(arrayBuffer);
            resolve(uint8Array);
          };
          reader.onerror = () => {
            reject(new Error("Could not read file as ArrayBuffer."));
          };
          reader.readAsArrayBuffer(blob);
        });
      });
  }

  const cachedHashes = new Set<string>();

  const marioStaticHash =
    "0xda2437bb81b1a07d5e2832768ba41f1a43cf060ba5a2db3ac0265361220ed82c";

  const marioDynHash =
    "0x4123f2d81428f7090218f975b941122f3797aeb8f97bf7d1ef6e87491c920a5c";

  const preimagesToPreload = [marioStaticHash, marioDynHash];

  nes.start();

  // TODO: Be less hacking about this

  // We load them from the server instead of the chain so we dev version works
  // without the custom chain.
  for (const hash of preimagesToPreload) {
    if (cachedHashes.has(hash)) return;
    fetchPreimageFromServer(`public/preimages/${hash}.bin`).then((preimage) => {
      if (preimage.length == 0) return;
      cachedHashes.add(hash);
      nes.setPreimage(hexStringToUint8Array(hash), preimage);
    });
  }

  // Input

  input.keyboard$.subscribe((event) => {
    if (event.keyCode != 32) return;
    if (!event.isDown) return;
    createCartridge(marioStaticHash, marioDynHash);
  });

  let playing = false;
  input.pointerdown$.subscribe(async (event) => {
    const pointer = event.pointer;
    if (pointer === undefined) return;
    if (!pointer.isDown) return;
    const x = pointer.worldX;
    const y = pointer.worldY;
    if (x === undefined || y === undefined) return;
    const tilePos = pixelCoordToTileCoord({ x, y }, TILE_WIDTH, TILE_HEIGHT);
    const entities = getEntitiesWithValue(positionComponent, tilePos);
    if (entities.size === 0) return;
    const entity = entities.values().next().value as Entity;
    if (!hasComponent(Cartridge, entity)) return;

    if (playing) return;
    playing = true;

    const cartridge = getComponentValueStrict(Cartridge, entity);

    const staticHash = hexStringToUint8Array(cartridge.staticHash);
    let dynHash = hexStringToUint8Array(cartridge.dynHash);

    if (hashOverrides.has(entity)) {
      const override = hashOverrides.get(entity);
      if (override !== undefined) {
        dynHash = hexStringToUint8Array(override);
      }
    }

    if (!cachedHashes.has(cartridge.staticHash)) {
      console.log("fetching static hash", staticHash);
      const preimage = await fetchPreimageFromChain(staticHash);
      nes.setPreimage(staticHash, preimage);
      cachedHashes.add(cartridge.staticHash);
    }
    if (!cachedHashes.has(cartridge.dynHash)) {
      console.log("fetching dyn hash", dynHash);
      const preimage = await fetchPreimageFromChain(dynHash);
      nes.setPreimage(dynHash, preimage);
      cachedHashes.add(cartridge.dynHash);
    }

    nes.setCartridge(staticHash, dynHash);
    nes.unpause();

    setTimeout(() => {
      const activity = nes.getActivity();
      const activityStr = new TextDecoder().decode(activity);
      const activityJson = JSON.parse(activityStr);
      nes.pause();
      // TODO: Hashes don't match [!]
      cachedHashes.add(activityJson.Hash as string);
      const formattedActivity: ActionStruct[] = Array(
        activityJson.Activity.length
      )
        .fill(0)
        .map((_, i) => {
          const action = activityJson.Activity[i];
          return {
            button: BigInt(action.Button),
            press: action.Press,
            duration: BigInt(action.Duration),
          };
        });
      lastHash = activityJson.Hash as string;
      playCartridge(BigInt(entity), formattedActivity);
      playing = false;
    }, 9000);
  });

  // Utils

  // function hexToUint8Array(hexString: string): Uint8Array {
  //   if (hexString.length % 2 !== 0) {
  //     throw new Error("Invalid hex string");
  //   }
  //   if (hexString.substring(0, 2) === "0x") {
  //     hexString = hexString.substring(2);
  //   }
  //   const bytes = new Uint8Array(hexString.length / 2);
  //   for (let i = 0; i < hexString.length; i += 2) {
  //     bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
  //   }
  //   return bytes;
  // }

  function numToEntity(id: bigint): Entity {
    let idStr = id.toString(16);
    if (idStr.length % 2 !== 0) {
      idStr = `0x0${idStr}`;
    } else {
      idStr = `0x${idStr}`;
    }
    return idStr as Entity;
  }

  function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // UI layout
  // TODO: better cartridge layout

  function cartridgePosition(entity: Entity): { x: number; y: number } {
    const cartridge = getComponentValueStrict(Cartridge, entity);
    if (cartridge === undefined) {
      throw new Error("Cartridge not found");
    }
    let pos = { x: 0, y: 0 };
    if (cartridge.parent === 0n) {
      const entityNum = Number(BigInt(entity).toString(10));
      pos = { x: 0, y: entityNum * 16 };
    } else {
      const parentPos = getComponentValueStrict(
        positionComponent,
        numToEntity(cartridge.parent)
      );
      const x = parentPos.x + 2;
      for (let i = 0; i < 4; i++) {
        const y = parentPos.y + randomInt(-2, 2) * 2;
        const tilePos = { x, y };
        const entities = getEntitiesWithValue(positionComponent, tilePos);
        if (entities.size === 0) {
          pos = { x, y };
          break;
        }
      }
    }
    return pos;
  }

  // Systems

  defineEnterSystem(world, [Has(Cartridge)], ({ entity }) => {
    if (lastHash) {
      hashOverrides.set(entity, lastHash);
    }
    const pos = cartridgePosition(entity);
    setComponent(positionComponent, entity, pos);
    const cartridge = getComponentValueStrict(Cartridge, entity);
    const cartridgeObj = objectPool.get(entity, "Sprite");
    cartridgeObj.setComponent({
      id: "animation",
      once: (sprite) => {
        sprite.setDepth(1);
        if (cartridge.parent === 0n) {
          sprite.play(Animations.GenesisCartridge);
        } else {
          sprite.play(Animations.Cartridge);
        }
      },
    });
  });

  // TODO: get value from update
  defineSystem(world, [Has(positionComponent)], ({ entity }) => {
    const tilePos = getComponentValueStrict(positionComponent, entity);
    const pixelPos = tileCoordToPixelCoord(tilePos, TILE_WIDTH, TILE_HEIGHT);
    const cartridgeObj = objectPool.get(entity, "Sprite");
    const cartridge = getComponentValueStrict(Cartridge, entity);
    cartridgeObj.setComponent({
      id: "position",
      once: (sprite) => {
        sprite.setPosition(pixelPos.x, pixelPos.y);
        if (cartridge.author === playerEntity && cartridge.parent === 0n) {
          camera.centerOn(pixelPos.x, pixelPos.y);
        }
      },
    });
    if (cartridge.parent === 0n) {
      return;
    }
    const parentPos = getComponentValueStrict(
      positionComponent,
      numToEntity(cartridge.parent)
    );
    const parentPixelPos = tileCoordToPixelCoord(
      parentPos,
      TILE_WIDTH,
      TILE_HEIGHT
    );
    const lineEntity = ((entity as string) + "ffffffff") as Entity;
    const lineObj = objectPool.get(lineEntity, "Line");
    lineObj.setComponent({
      id: "animation",
      once: (line) => {
        line.setDepth(0);
        line.setStrokeStyle(4, 0xcccfc9);
        line.setTo(
          parentPixelPos.x + TILE_WIDTH / 2,
          parentPixelPos.y + TILE_HEIGHT / 2,
          pixelPos.x + TILE_WIDTH / 2,
          pixelPos.y + TILE_HEIGHT / 2
        );
      },
    });
  });
}
