# MS Paint Fan Adventures

This is the official repository for [MS Paint Fan Adventures](https://mspfa.com/).

## Prerequisites

1. Install [Node.js](https://nodejs.org/en/download/) (LTS), our runtime of choice.

2. Install [MongoDB](https://www.mongodb.com/try/download/community) (version 5.0.x, Community Edition), our database of choice. (MongoDB Compass is not required, so you do not need to install it if the MongoDB installer asks you to.)

## Installation

1. Clone or download this repository.

2. Open a terminal in the repository's directory.

3. Enter `npm i` to install the project's dependencies.

## Development

* Enter `npm run db` to run the database, which is necessary for the website to function.

	* If you open this repo's directory as a project in VS Code, given you have automatic tasks enabled, this will run automatically for as long as VS Code is open, so you should not run it manually.

	* To get automatic tasks to work in VS Code, if it doesn't work on its own, press `ctrl`+`shift`+`P` in VS Code, then select "Tasks: Manage Automatic Tasks in Folder", and then "Allow Automatic Tasks in Folder". Then press `ctrl`+`alt`+`R` to refresh VS Code.

* Enter `npm run dev` to run the web server in development mode.

	* Alternatively, use `npm run build` to compile a production build, and then `npm run start` to run the compiled production web server. You can also use `npm run build-start` to both compile and run in one command.

* If you ever edit an API's `APIHandler` types, you must run `npm run generate-validators` to automatically generate new API request validators.