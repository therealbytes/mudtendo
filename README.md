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

## How it's Made

Mudtendo is a relatively simple <a href="https://github.com/latticexyz/mud">MUD</a> application built on top of a NES emulator and a custom blockchain.

**[NES Emulator](https://github.com/therealbytes/nes)**

A NES emulator written in Go with a browser interface compiled to WebAssembly. The emulator is part of both the blockchain (native, see below) and in the frontend (WebAssembly).

**[NES Concrete App-chain](https://github.com/therealbytes/neschain)**

An EVM-compatible blockchain with a built-in NES emulator, built with <a href="https://github.com/therealbytes/concrete-geth">Concrete</a>, a framework to build application-specific rollups.

The Mudtendo contracts use the built-in emulator to validate player activity.

---

<span style="font-size: 0.9em; opacity: 0.9;">
It is worth noting that while the NES (Nintendo Entertainment System) was released in North America in 1985, a similar system, known as the FC (Family Computer) or Famicom, had been launched by Nintendo in Japan in 1983.
</span>
