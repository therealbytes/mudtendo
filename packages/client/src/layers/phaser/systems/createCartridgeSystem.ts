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
import { TILE_HEIGHT, TILE_WIDTH } from "../constants";

export function createCartridgeSystem(layer: PhaserLayer) {
  const {
    world,
    networkLayer: {
      components: { Cartridge, positionComponent },
      systemCalls: { createCartridge, playCartridge },
      playerEntity,
    },
    scenes: {
      Main: { objectPool, input, camera },
    },
  } = layer;

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
    console.log("CLICK", tilePos);
    const entities = getEntitiesWithValue(positionComponent, tilePos);
    if (entities.size === 0) return;
    const entity = entities.values().next().value as Entity;
    if (!hasComponent(Cartridge, entity)) return;
    playCartridge(BigInt("0x" + entity), []);
  });

  function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function cartridgePosition(entity: Entity): { x: number; y: number } {
    const cartridge = getComponentValueStrict(Cartridge, entity);
    let pos = { x: 0, y: 0 };
    if (cartridge.parent === 0n) {
      pos = { x: randomInt(-100, 100), y: randomInt(-100, 100) };
    } else {
      const parentPos = getComponentValueStrict(
        positionComponent,
        cartridge.parent.toString(16) as Entity
      );
      pos = { x: parentPos.x + 2, y: parentPos.y + randomInt(-10, 10) * 2 };
    }
    return pos;
  }

  defineEnterSystem(world, [Has(Cartridge)], ({ entity }) => {
    console.log("ENTER", entity);
    // const pos = cartridgePosition(entity);
    const pos = { x: 0, y: 0 };
    setComponent(positionComponent, entity, pos);
    const cartridgeObj = objectPool.get(entity, "Rectangle");
    cartridgeObj.setComponent({
      id: "animation",
      once: (rect) => {
        rect.setSize(50, 50);
        rect.setFillStyle(0x00ff00);
      },
    });
  });

  defineSystem(world, [Has(positionComponent)], ({ entity }) => {
    console.log("UPDATE", entity);
    const tilePos = getComponentValueStrict(positionComponent, entity);
    const pixelPos = tileCoordToPixelCoord(tilePos, TILE_WIDTH, TILE_HEIGHT);
    const cartridgeObj = objectPool.get(entity, "Rectangle");
    cartridgeObj.setComponent({
      id: "position",
      once: (rect) => {
        rect.setPosition(pixelPos.x, pixelPos.y);
        if (entity === playerEntity) {
          camera.centerOn(pixelPos.x, pixelPos.y);
        }
      },
    });
  });
}
