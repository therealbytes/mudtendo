import {
  Has,
  defineEnterSystem,
  defineSystem,
  getComponentValueStrict,
  getEntitiesWithValue,
  hasComponent,
  setComponent,
  Entity,
} from "@latticexyz/recs";
import {
  pixelCoordToTileCoord,
  tileCoordToPixelCoord,
} from "@latticexyz/phaserx";
import { utils } from "ethers";

import { PhaserLayer } from "../createPhaserLayer";
import { TILE_HEIGHT, TILE_WIDTH, Animations } from "../constants";

export function createCartridgeSystem(layer: PhaserLayer) {
  const {
    world,
    networkLayer: {
      components: { Cartridge, positionComponent },
      systemCalls: { createCartridge, playCartridge },
      playerEntity,
      wasm: { api: nes },
    },
    scenes: {
      Main: { objectPool, input, camera },
    },
  } = layer;

  function hexToUint8Array(hexString: string): Uint8Array {
    if (hexString.length % 2 !== 0) {
      throw new Error("Invalid hex string");
    }
    if (hexString.substring(0, 2) === "0x") {
      hexString = hexString.substring(2);
    }
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
      bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
    }
    return bytes;
  }

  const marioStaticHash = hexToUint8Array(
    "0xebefff5d04586f1d5ba0d052d1a06f2535c5dd92be22c289295442b1048fe872"
  );
  const marioDynHash = hexToUint8Array(
    "0x4123f2d81428f7090218f975b941122f3797aeb8f97bf7d1ef6e87491c920a5c"
  );

  if (marioStaticHash === undefined || marioDynHash === undefined) {
    throw new Error("Invalid hashes");
  }

  const cachedHashes = new Set<Uint8Array>();
  cachedHashes.add(marioStaticHash);
  cachedHashes.add(marioDynHash);

  nes.start();
  nes.togglePause();

  // Input

  input.keyboard$.subscribe((event) => {
    if (event.keyCode != 32) return;
    if (!event.isDown) return;
    createCartridge(marioStaticHash, marioDynHash);
  });

  input.pointerdown$.subscribe((event) => {
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
    const cartridge = getComponentValueStrict(Cartridge, entity);

    const staticHash = hexToUint8Array(cartridge.staticHash as string);
    const dynHash = hexToUint8Array(cartridge.dynHash as string);

    if (!cachedHashes.has(staticHash)) {
      // ...
    }
    if (!cachedHashes.has(dynHash)) {
      // ...
    }

    console.log("Playing cartridge...");
    nes.togglePause();

    console.log("Setting cartridge...");
    nes.setCartridge(staticHash, dynHash);

    setTimeout(() => {
      nes.togglePause();
      playCartridge(BigInt(entity), []);
    }, 10000);
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
