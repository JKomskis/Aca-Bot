# Aca-Bot

A GroupMe bot for an a capella group

## Installation

1. Clone the repo
2. `cd` into the folder
3. Run the command `npm install` to install dependencies
4. Run the command `npm run gulp` to build the project
5. Run the command `npm start` to start the server

## Setup

1. Go to <https://dev.groupme.com/bots> and create a bot for each group for which you would like the server to listen for messages. Set the callback URL to the URL where the server is running.
2. At the top of the page, click "Access Token" and copy the value to the "access_token" field of the `config/default.json` file.
3. In `config/default.json`, enter the bot id and group in "conversation_groups" for each group/bot for which you would like to receive callback messages when any message is sent.
4. In `config/default.json`, enter the bot id and group in "management_groups" for each group/bot for which you would like to receive callback messages when any management commands are sent.

## Usage

* In any of the management groups, send a message with the text "/help" to list the available commands. At the moment, the supported commands are:
  * /addmessage "\<keyword phrase\>" "\<response\>" - look for messages with \<keyword phrase\> and response with \<response\> if the keyword phrase is found
  * /listmessages - list keyword phrases added to the server
  * /removemessage "\<keyword phrase\>" - remove a keyword phrase
* Keyword phrases can be added manually by modifying the `config/keywords.json` file.

## References

* https://brianflove.com/2016/11/08/typescript-2-express-node/
* https://mherman.org/blog/developing-a-restful-api-with-node-and-typescript/
