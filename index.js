const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
require('dotenv').config();

// --- client の定義 ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.User]
});

// --- コマンド読み込み ---
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  client.commands.set(command.data.name, command);
}

// --- スラッシュコマンド処理 ---
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'エラーが発生しました。', ephemeral: true });
  }
});

// --------------------------------------------------
// 🔵 短縮コマンド（!ac / !at / !le / !ld）
// --------------------------------------------------
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const prefix = '!';
  if (!message.content.startsWith(prefix)) return;

  const [cmd, ...args] = message.content.slice(prefix.length).split(' ');

  // !ac → attendance_create
  if (cmd === 'ac') {
    const date = args[0];
    const list = args.slice(1).join(' ');

    const command = client.commands.get('attendance_create');
    if (!command) return;

    await command.execute({
      reply: async (obj) => {
        return await message.reply(obj);
      },
      followUp: async (obj) => {
        return await message.reply(obj);
      },
      channel: message.channel,
      user: message.author,
      options: {
        getString: (name) => {
          if (name === 'date') return date;
          if (name === 'list') return list;
          if (name === 'note') return null;
          return null;
        }
      }
    });
  }

  // !at → attendance_table
  if (cmd === 'at') {
    const date = args[0];

    const command = client.commands.get('attendance_table');
    if (!command) return;

    await command.execute({
      reply: async (obj) => {
        return await message.reply(obj);
      },
      followUp: async (obj) => {
        return await message.reply(obj);
      },
      channel: message.channel,
      user: message.author,
      options: {
        getString: (name) => {
          if (name === 'date') return date;
          return null;
        }
      }
    });
  }

  // !le → lottery_entry
  if (cmd === 'le') {
    const date = args[0];
    const items = args.slice(1).join(' ');

    const command = client.commands.get('lottery_entry');
    if (!command) return;

    await command.execute({
      reply: async (obj) => {
        return await message.reply(obj);
      },
      followUp: async (obj) => {
        return await message.reply(obj);
      },
      channel: message.channel,
      user: message.author,
      options: {
        getString: (name) => {
          if (name === 'date') return date;
          if (name === 'items') return items;
          if (name === 'note') return null;
          return null;
        }
      }
    });
  }

// !ld → lottery_draw
if (cmd === 'ld') {
  const date = args[0];
  const counts = args[1];

  const command = client.commands.get('lottery_draw');
  if (!command) return;

  await command.execute({
    client, // ← これが重要！
    reply: async (obj) => message.reply(obj),
    followUp: async (obj) => message.reply(obj),
    channel: message.channel,
    user: message.author,
    options: {
      getString: (name) => {
        if (name === 'date') return date;
        if (name === 'counts') return counts;
        return null;
      }
    }
  });
}
});

// --- Bot 起動 ---
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN);