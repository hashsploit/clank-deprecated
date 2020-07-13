# Clank
## A Ratchet & Clank 3 Server Emulator

## About
This project is a server emulator for the PlayStation 2 / Playstation 3
game Ratchet & Clank: Up Your Arsenal to replace the original production
servers located at `ratchet3-prod1.pdonline.scea.com` for US and
`randc3-master.online.scee.com` for EU.

By emulating the SCE-RT Medius server stack (which is normally
divided into 6 servers [not including DNAS and a database]) we are
able to communicate with the PS2/PS3 clients. This server aims to be
modular and compact, therefore some components of Medius are merged.

This server emulator is divided into 3 services:
- **The Medius Authentication Server (MAS)** is where players initially login using
  an existing profile and get a `session token` and `ip address` that is then
  used to login to the Medius Lobby Server.
- **The Medius Lobby Server (MLS)** is where a majority of players reside when they
  are not in game, chatting, looking for a game, managing clans, or looking at
  stats.
- **The Medius Proxy Server (MPS)** is where players are synchronized in-game before
  DME (Distributed Memory Engine) takes place.

You can read more about these components [here](https://wiki.hashsploit.net/PlayStation_2#Medius).

## Features

Emulator features that are complete will be checked, features that are still in progress or planned are un-checked.

- [x] Modular design.
- [ ] Emulates Medius Authentication Server (MAS).
- [ ] Emulates Medius Lobby Server (MLS).
- [ ] Emulates Medius Proxy Server (MPS).
- [ ] Configurable player server operators.
- [ ] Send custom server messages to clients.
- [ ] Server operator chat commands.
- [ ] Configurable EULA screen.
- [ ] Configurable Announcements screen.
- [ ] Configurable death messages.
- [ ] UYA Online API integration. 

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


## Configuration

This server can run in 3 emulation modes, **MAS**, **MLS** and **MPS**. You can have multiple configuration files each with one of the different emulation modes.

See the table below for a reference of the configuration JSON:

| Name               | Type    | Description                                                                         |
|--------------------|---------|-------------------------------------------------------------------------------------|
| mode               | string  | One of the following: `mas`, `mls`, or `mps`.                                       |
| address            | string  | Address the server should bind to. This can be set to an empty string for any.      |
| port               | integer | Port that the server should listen on.                                              |
| capacity           | integer | Maximum number of players this server can handle.                                   |
| log_level          | string  | Controls logging verbosity. Either: `debug`, `info`, `warn` or `error`.             |
| api                | object  | Details to hook into UYA Online's API. (this is equivalent to the MUM).             |
| max_login_attempts | integer | **MAS Only:** Number of invalid login attempts made by a single player before being soft-banned.  |
| whitelist          | object  | Whitelisted player usernames for testing. All other players will be denied login if this is enabled. |
| discord_webhooks   | object  | JSON objects of WebHookable events that can be used to broadcast to Discord.        |
| command_prefix     | string  | **MLS Only:** A string prefix used to determine what in chat should be evaluated as a system command. |
| client_timeout     | integer | **MPS Only:** A heart-beat timeout in seconds before a client is disconnected.      |
| death_messages     | array   | **MPS Only:** An array of death messages to be selected at random.                  |


### MAS (Medius Authentication Server)

The server emulator will act as an authentication server for handling user logins.

### MLS (Medius Lobby Server)

The server emulator will act as a lobby server for handling out-of game events.

### MPS (Medius Proxy Server)

The server emulator will act as a proxy server and manage in-game matches.

## Setup
1. Download or clone the project. `git clone https://github.com/hashsploit/clank`.
2. Run `npm i` in the directory of the project to install the required packages.
3. Copy `config/mas.json.example` to `config/mas.json` and configure it.
4. Run `./launch.sh mas` to start the `mas` server. If you are debugging, you can manually run `nodejs --trace-warnings server.js mas.json`.
