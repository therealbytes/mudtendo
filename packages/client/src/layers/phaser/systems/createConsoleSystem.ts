import {
  Has,
  defineEnterSystem,
  defineSystem,
  getComponentValueStrict,
  getComponentValue,
  getEntitiesWithValue,
  hasComponent,
  setComponent,
  Entity,
} from "@latticexyz/recs";
import {
  pixelCoordToTileCoord,
  tileCoordToPixelCoord,
} from "@latticexyz/phaserx";

import { PhaserLayer } from "../createPhaserLayer";
import { TILE_HEIGHT, TILE_WIDTH, Sprites } from "../constants";
import {
  hexStringToUint8Array,
  Uint8ArrayToHexString,
} from "@latticexyz/utils";
import { ActionStruct } from "contracts/types/ethers-contracts/IWorld";

const marioStaticHash =
  "0xd185234e8d133f80f8536bf3586474e9c21cf07dc1ac2d001b5651b038f20bc7";

const marioDynHash =
  "0x03a3fc1efd5be8218b6e37aabc279b2a971825f50f5a25edd3fc9dcdc3455d42";

const preimagesToPreload = [marioStaticHash, marioDynHash];

export async function createConsoleSystem(layer: PhaserLayer) {
  const {
    world,
    networkLayer: {
      components: { Cartridge, positionComponent, consoleStateComponent },
      systemCalls: { createCartridge, playCartridge },
      wasm: { api: nes },
      preimageRegistry,
    },
    scenes: {
      Main: { objectPool, input, camera, config },
    },
  } = layer;

  function fetchPreimageFromServer(hash: Uint8Array): Promise<Uint8Array> {
    const hashHex = Uint8ArrayToHexString(hash);
    const url = `public/preimages/${hashHex}.bin`;
    return fetch(url)
      .then((response) => {
        if (!response.ok) {
          if (response.status === 404) {
            return new Blob();
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

  setComponent(consoleStateComponent, "0x060D" as Entity, { paused: false });
  nes.start();

  // We preload the preimages from the server so we can develop without
  // having to run the concrete chain.
  for (const hashHex of preimagesToPreload) {
    if (cachedHashes.has(hashHex)) return;
    const hash = hexStringToUint8Array(hashHex);
    await fetchPreimageFromServer(hash).then((preimage) => {
      if (preimage.length == 0) return;
      cachedHashes.add(hashHex);
      nes.setPreimage(hash, preimage);
    });
  }

  setComponent(consoleStateComponent, "0x060D" as Entity, { paused: false });
  nes.pause();

  // Input

  input.keyboard$.subscribe((event) => {
    if (event.keyCode != 32) return;
    if (!event.isDown) return;
    createCartridge(marioStaticHash, marioDynHash);
  });

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

    const consoleState = getComponentValue(
      consoleStateComponent,
      "0x060d" as Entity
    );

    if (consoleState !== undefined && consoleState.paused) {
      return;
    }

    const cartridge = getComponentValueStrict(Cartridge, entity);
    const staticHashHex = cartridge.staticHash;
    const dynHashHex = cartridge.dynHash;
    const staticHash = hexStringToUint8Array(staticHashHex);
    const dynHash = hexStringToUint8Array(dynHashHex);

    if (!cachedHashes.has(staticHashHex)) {
      console.log("Fetching static hash from chain", staticHashHex);
      const preimage = await preimageRegistry.getPreimage(staticHash);
      console.log("Preimage length:", preimage.length);
      nes.setPreimage(staticHash, preimage);
      cachedHashes.add(staticHashHex);
    }
    if (!cachedHashes.has(dynHashHex)) {
      console.log("Fetching dyn hash from chain", dynHashHex);
      const preimage = await preimageRegistry.getPreimage(dynHash);
      console.log("Preimage length:", preimage.length);
      nes.setPreimage(dynHash, preimage);
      cachedHashes.add(dynHashHex);
    }

    setComponent(consoleStateComponent, "0x060D" as Entity, { paused: false });
    nes.unpause();
    nes.setCartridge(staticHash, dynHash);

    setTimeout(() => {
      const activity = nes.getActivity();
      nes.pause();
      setComponent(consoleStateComponent, "0x060D" as Entity, {
        paused: true,
      });
      const activityStr = new TextDecoder().decode(activity);
      const activityJson = JSON.parse(activityStr);
      // const newDynHashHex = activityJson.Hash as string;
      // console.log("New dyn hash", newDynHashHex);
      // cachedHashes.add(newDynHashHex);
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
      playCartridge(BigInt(entity), formattedActivity);
    }, 6000);
  });

  // Utils

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
  // TODO: improve cartridge layout

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
    const pos = cartridgePosition(entity);
    setComponent(positionComponent, entity, pos);
    const cartridge = getComponentValueStrict(Cartridge, entity);
    console.log("Cartridge", cartridge);
    const cartridgeObj = objectPool.get(entity, "Sprite");
    cartridgeObj.setComponent({
      id: "texture",
      once: (sprite) => {
        sprite.setDepth(1);
        let spriteData = config.sprites[Sprites.Cartridge];
        if (cartridge.parent === 0n) {
          spriteData = config.sprites[Sprites.Genesis];
        }
        sprite.setTexture(spriteData.assetKey, spriteData.frame);
      },
    });
  });

  defineSystem(world, [Has(positionComponent)], ({ entity }) => {
    const tilePos = getComponentValueStrict(positionComponent, entity);
    const pixelPos = tileCoordToPixelCoord(tilePos, TILE_WIDTH, TILE_HEIGHT);
    const cartridgeObj = objectPool.get(entity, "Sprite");
    const cartridge = getComponentValueStrict(Cartridge, entity);
    cartridgeObj.setComponent({
      id: "position",
      once: (sprite) => {
        sprite.setPosition(pixelPos.x, pixelPos.y);
        camera.centerOn(pixelPos.x, pixelPos.y);
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
      id: "line",
      once: (line) => {
        line.setDepth(0);
        line.setStrokeStyle(4, 0x4f4f68);
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
