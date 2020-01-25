# Clank
## A Ratchet & Clank 3 Server Emulator

----

## About
This project is a Server Emulator for the PlayStation 2 game Ratchet & Clank 3
to replace the original production server `ratchet3-prod1.pdonline.scea.com`.

----

## Features


## Installation

For high-performance it is recommend using **Debian Linux**. Other Linux based
Operating Systems should work fine as well.

### Prerequisites
- screen (4.06+)
- nodejs (10.3+)
  - aes-js (3.1.2+)
  - chalk (2.3.1+)
  - colors (1.1.2+)
  - node-rsa (1.0.5+),
  - request (2.88.0+)
  - sync-request (6.0.0+)
  - threads (0.11.0+)
- curl (7.52+)

In order for clients to contact your server you need to have DNS server that can both forward traffic to a DNAS server (`gate1.us.dnas.playstation.org`) and to your server `ratchet3-prod1.pdonline.scea.com`. pfSense is good router software and can do both of these.

### Setup
1. Download or clone the project.
2. Run `npm i` in the directory of the project to install the required packages.
3. Copy `config/aquatos.json.example` to `config/aquatos.json` and configure it.
4. Run `./launch.sh aquatos` to start the `aquatos` server in a background screen process, or if you are debugging, you can manually run `nodejs --trace-warnings server.js aquatos.json`. You can access the background screen process by running `screen -x clank-aquatos`.
