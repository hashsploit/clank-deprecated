#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ "$1" == "" ]; then
	echo -e "$(tput bold)$(tput setaf 3)Usage:$(tput sgr0) ./launch.sh <config>"
	exit 1
fi

if [ ! -f "./config/$1.json" ]; then
	echo -e "$(tput bold)$(tput setaf 1)Error:$(tput sgr0) The configuration $1.json does not exist."
	exit 1
fi

screen -S clank-$1 -dmS nodejs server.js $1.json
echo -e "$(tput bold)$(tput setaf 2)The server $1 started successfully.$(tput sgr0)"
echo -e "Use screen -x clank-$1 to access the console."
