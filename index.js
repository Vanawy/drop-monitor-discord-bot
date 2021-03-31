require('dotenv').config();
const Keyv = require('keyv');
const Discord = require("discord.js");
const {DropMonitor} = require("drop-monitor");

const interval = process.env.INTERVAL || 60; // in seconds
const keyv_namespace = process.env.KEYV_NAMESPACE || 'rl_drops';
const game_name = process.env.GAME_NAME || 'SMITE';

const store = new Keyv('redis://localhost:6379', { 
    namespace: keyv_namespace,
});

const dropMonitor = new DropMonitor(
    process.env.TWITCH_CLIENT_ID,
    process.env.TWITCH_CLIENT_SECRET
);

const bot = new Discord.Client();

bot.on('message', message => {
	if (message.author.bot) return;

	if (!message.content.startsWith('<@')) return;

    mention = message.content.slice(2, -1);

    if (mention.startsWith('!')) {
        mention = mention.slice(1);
    }

    if (!message.member.hasPermission("ADMINISTRATOR")) {
        return;
    }

    if (bot.user.id != mention) {
        return;
    }

    setGuildChannel(message.channel.guild.id, message.channel.id)
        .then(_ => {
            console.log('success');
        })
        .catch(err => console.error(err))
    ;
});

bot.login(process.env.DISCORD_BOT_TOKEN);

main();
setInterval(main, interval * 1000);

async function main()
{
    checkDrops();
}

async function checkDrops()
{
    dropMonitor.findStreamsWithDropsEnabled(game_name)
        .then(streams => {
            updateBotStatus(streams.length);
        })
        .catch(e => console.error(e))
    ;
}

async function broadcastMessage(text)
{
    const guilds = bot.guilds.cache.map(guild => guild.id);
    guilds.forEach(async guild_id => {
        const channel_id = await getGuildChannel(guild_id);
        const channel = bot.channels.cache.get(channel_id);
        if (channel) {
            channel.send(text);
        }
    });
}

function updateBotStatus(streamCount)
{
    let countDesc = 'no streams'; 
    if (streamCount > 0)
    {
        countDesc = `${streamCount} streams`; 
    }
    bot.user.setActivity(`There is ${countDesc} with Drops Enabled`);
}


async function getGuildChannel(guild_id)
{
    return store.get(`${guild_id}_channel`);
}

async function setGuildChannel(guild_id, channel_id)
{
    return store.set(`${guild_id}_channel`, channel_id);
}