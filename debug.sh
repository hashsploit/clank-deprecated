#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ "$1" == "" ]; then
	echo -e "$(tput bold)$(tput setaf 3)Usage:$(tput sgr0) $0 <config>"
	exit 1
fi

if [ ! -f "./config/$1.json" ]; then
	echo -e "$(tput bold)$(tput setaf 1)Error:$(tput sgr0) The configuration file $1.json does not exist."
	exit 1
fi

nodejs --use-strict --trace-warnings server.js $1.json debug
