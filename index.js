require('dotenv').config();
const Keyv = require('keyv');
const Discord = require("discord.js");
const { DropMonitor } = require("drop-monitor");

const interval = process.env.INTERVAL || 60; // in seconds
const keyv_namespace = process.env.KEYV_NAMESPACE || 'rl_drops';
const game_name = process.env.GAME_NAME || 'Don\'t Starve Together';

const change_bot_channel_permission = 'ADMINISTRATOR';
const conncetion_string = process.env.REDIS_AUTH || 'redis://localhost:6379';

const channelStore = new Keyv(conncetion_string, {
    namespace: keyv_namespace,
});

const streamStore = new Keyv(conncetion_string, {
    namespace: `${keyv_namespace}_streams`,
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

    if (!message.member.hasPermission(change_bot_channel_permission)) {
        return;
    }

    if (bot.user.id != mention) {
        return;
    }

    setGuildChannel(message.channel.guild.id, message.channel.id)
        .then(_ => {
            message.react('✅');
        })
        .catch(err => console.error(err))
    ;
});

bot.login(process.env.DISCORD_BOT_TOKEN);

main();
setInterval(main, interval * 1000);

async function main() {
    checkDrops();
}

async function checkDrops() {
    const streams = await dropMonitor.findStreamsWithDropsEnabled(game_name);
    updateBotStatus(streams.length);

    let activeStreams = [];
    let newStreams = [];
    for(let stream of streams) 
    {
        let wasActive = await isStreamWasActive(stream);
        if (wasActive !== true){
            newStreams.push(stream);
        }
        activeStreams.push(stream);
    }
    
    console.log(activeStreams.length, newStreams.length);
    if (newStreams.length == 0) {
        return;
    }

    activeStreams.forEach(stream => {
        streamStore.set(stream.userName, true);
    });

    notifyAboutNewStreams(newStreams);
}

function notifyAboutNewStreams(streams)
{
    let title = `There is ${streams.length} new streams with Drops Enabled`;

    description = '';
    streams.forEach(stream => {
        description += `https://twitch.tv/${stream.userName} - Viewers: ${stream.viewers}\n`;
    });

    let embed = {
        title,
        description,
    };

    if (streams.length == 1) {
        const stream = streams[0];
        embed.title = stream.userDisplayName;
        embed.description = stream.title;
        embed.url = `https://twitch.tv/${stream.userName}`;
        embed.fields = [
            {
                name: 'Viewers',
                value: stream.viewers,
                inline: true,
            },
            {
                name: 'Drops Enabled',
                value: '✅',
                inline: true,
            },

        ];
        let thumb = stream.thumbnailUrl;
        thumb = thumb.replace(/\{width\}/, 256);
        thumb = thumb.replace(/\{height\}/, 144);
        embed.thumbnail = {
            url: thumb,
            width: 256,
            height: 144,
        };
    }


    const options = {
        embed,
    }

    broadcastMessage('', options);
}

async function isStreamWasActive(stream)
{
    return streamStore.get(stream.userName);
}

async function broadcastMessage(text = '', options = {}) {
    console.log('broadcasting');
    const guilds = bot.guilds.cache.map(guild => guild.id);
    guilds.forEach(async guild_id => {
        const channel_id = await getGuildChannel(guild_id);
        const channel = bot.channels.cache.get(channel_id);
        if (channel) {
            console.log('sending to ' + channel_id);
            channel.send(text, options)
            .then(message => console.log(`Message sent`))
            .catch(console.error);
        }
    });
}

function updateBotStatus(streamCount) {
    let countDesc = 'no streams';
    if (streamCount > 0) {
        countDesc = `${streamCount} streams`;
    }
    bot.user.setActivity(`There is ${countDesc} with Drops Enabled`);
}


async function getGuildChannel(guild_id) {
    return channelStore.get(`${guild_id}_channel`);
}

async function setGuildChannel(guild_id, channel_id) {
    return channelStore.set(`${guild_id}_channel`, channel_id);
}