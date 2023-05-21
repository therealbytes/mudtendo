import {
  Has,
  defineEnterSystem,
  defineSystem,
  defineUpdateSystem,
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
import { tile } from "@latticexyz/utils";

export function createCartridgeSystem(layer: PhaserLayer) {
  const {
    world,
    networkLayer: {
      components: { Cartridge, positionComponent },
      systemCalls: { createCartridge, playCartridge },
      playerEntity,
    },
    scenes: {
      Main: { objectPool, input },
    },
  } = layer;

  // Input

  input.keyboard$.subscribe((event) => {
    if (event.keyCode != 32) return;
    if (!event.isDown) return;
    createCartridge(
      utils.hexZeroPad(
        "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
        32
      ),
      utils.hexZeroPad(
        "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
        32
      )
    );
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
    playCartridge(BigInt(entity), []);
  });

  // Utils

  function numToEntity(id: bigint): Entity {
    let idStr = id.toString(16);
    console.log("numToEntity", idStr);
    if (idStr.length % 2 !== 0) {
      idStr = `0x0${idStr}`;
    } else {
      idStr = `0x${idStr}`;
    }
    console.log("numToEntity", idStr);
    console.log("");
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
        if (cartridge.author === playerEntity) {
          // camera.centerOn(pixelPos.x, pixelPos.y);
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
