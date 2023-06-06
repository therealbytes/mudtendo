# Mudtendo

I built [Mudtendo](https://ethglobal.com/showcase/mudtendo-8vjvh) for the [ETHGlobal 2023 Autonomous Worlds hackathon](https://ethglobal.com/events/autonomous). This is a cleaned up version of my submission.

![Mudtendo screenshot](img/screenshot.png)

<div align="center">
<p style="font-size: 1.25em; margin: 10px;"><em>
Mudtendo. Built with
<a href="https://github.com/therealbytes/concrete-geth">Concrete</a>
and
<a href="https://github.com/latticexyz/mud">MUD</a>
.</em></p>
</div>

> The final product of the Mudtendo project is a MUD app where users can play old Nintendo games (and anything else the NES console can run) with a couple of twists:
>
> - Gameplay takes place in very short sessions, each of which gets sent to the chain for validation and creates a "checkpoint" of its end state.
> - Any player can start a game from any checkpoint, past or present, that any other player has created.
>
> You can restart your game of Super Mario at the last checkpoint before you died, or you can start it from someone else's checkpoint if that's more interesting. It's like one of those confusing time-travel movies--you create an alternative game reality with every move.

## How it's made

Mudtendo is a relatively simple <a href="https://github.com/latticexyz/mud">MUD</a> application built on top of a NES emulator and a custom blockchain.

**[NES Emulator](https://github.com/therealbytes/nes)**

A NES emulator written in Go with a browser interface compiled to WebAssembly. The emulator is part of both the blockchain (native, see below) and the web client (WebAssembly).

**[NES Concrete App-chain](https://github.com/therealbytes/neschain)**

An EVM-compatible blockchain with a built-in NES emulator, built with <a href="https://github.com/therealbytes/concrete-geth">Concrete</a>, a framework to build application-specific rollups.

The Mudtendo contracts use the built-in emulator to validate player activity.

## How to run Mudtendo locally

Run a local Optimism devnet using `ghcr.io/therealbytes/neschain-geth` as the L2 execution engine, exposing the WebSocket RPC on port 9546. See [/optimism](https://github.com/therealbytes/optimism/tree/neschain-geth).

Then deploy the contracts and start the web client with MUD.

```bash
# Clone the repo
git clone https://github.com/therealbyes/mudtendo
cd mudtendo
# Install dependencies
pnpm install
# Upload the Super Mario Bros. NES cartridge to the blockchain
go run deploy.go ./packages/client/public/preimages/0x03a3fc1efd5be8218b6e37aabc279b2a971825f50f5a25edd3fc9dcdc3455d42.bin
go run deploy.go ./packages/client/public/preimages/0xd185234e8d133f80f8536bf3586474e9c21cf07dc1ac2d001b5651b038f20bc7.bin
# Deploy contracts
cd packages/contracts
pnpm mud deploy --rpc http://127.0.0.1:9545
# Start the client
cd ../client
pnpm dev
```

Go to [http://localhost:3000/?dev=true&cache=false&wsRpc=ws://localhost:9546&chainId=901&worldAddress=0x5FbDB2315678afecb367f032d93F642f64180aa3](http://localhost:3000/?dev=true&cache=false&wsRpc=ws://localhost:9546&chainId=901&worldAddress=0x5FbDB2315678afecb367f032d93F642f64180aa3).

---

It is worth noting that while the NES (Nintendo Entertainment System) was released in North America in 1985, a similar system, known as the FC (Family Computer) or Famicom, had been launched by Nintendo in Japan in 1983.
