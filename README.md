# drop-monitor-discord-bot
Get notifications about streams with 'Drops Enabled' in discord

# Requirements
- Node 
- Redis (or other backend supported by [KeyV](https://github.com/lukechilds/keyv))

# Installation
1. Clone repository
1. Run `npm install`
1. Copy `example.env` to `.env`
1. Fill `.env` fields (name of the game, twitch api and discord bot credentials is required)
1. Dont forget to fill conection string (REDIS_AUTH) in `.env`
1. Run `index.js` (i personally use [pm2](https://pm2.keymetrics.io/))

# Usage 
1. Add bot to your server
1. Mention @bot in channel where notifications should appear (`ADMINISTRATOR` permission is required)
1. If all works fine bot will react with check emoji
