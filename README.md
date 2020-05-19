# Clank
## A Ratchet & Clank 3 Server Emulator

----

## About
This project is a server emulator for the PlayStation 2/3 game
Ratchet & Clank: Up Your Arsenal to replace the original production
servers located at `ratchet3-prod1.pdonline.scea.com` for US and
`randc3-master.online.scee.com` for EU.

In order for clients to contact this server emulator you almost must have a
DNS and DNAS server set-up that the PS2/PS3 can authenticate with.

This server emulator is divided into 3 services:
- The Medius Authentication Server (MAS) is where players initially login using
  an existing profile and get a `session token` and `ip address` that is then
  used to login to the Medius Lobby Server.
- The Medius Lobby Server (MLS) is the main area where players reside when they
  are not in game, chatting, looking for a game, managing clans, and looking
  at stats.

----

## Features
- Implements Medius Authentication Server (MAS)
- Implements Medius Lobby Server (MLS)

### Prerequisites
- nodejs (10.3+)
  - aes-js (3.1.2+)
  - chalk (2.3.1+)
  - colors (1.1.2+)
  - node-rsa (1.0.5+),
  - request (2.88.0+)
  - sync-request (6.0.0+)
  - threads (0.11.0+)
- curl (7.52+)

See more [here](https://wiki.hashsploit.net).

### Setup
1. Download or clone the project.
2. Run `npm i` in the directory of the project to install the required packages.
3. Copy `config/aquatos.json.example` to `config/aquatos.json` and configure it.
4. Run `./launch.sh aquatos` to start the `aquatos` server in a background screen process, or if you are debugging, you can manually run `nodejs --trace-warnings server.js aquatos.json`. You can access the background screen process by running `screen -x clank-aquatos`.
