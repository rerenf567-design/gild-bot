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
    await interaction.reply({ content: 'エラーが発生しました。', ephemeral: false });
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

  // !ac → attendance_create（ID方式）
  if (cmd === 'ac') {
    const entryId = args[0];
    const date = args[1];
    const list = args.slice(2).join(' ');

    const command = client.commands.get('attendance_create');
    if (!command) return;

    await command.execute({
      reply: async (obj) => message.channel.send(obj),
      followUp: async (obj) => message.channel.send(obj),
      channel: message.channel,
      user: message.author,
      guild: message.guild,
      options: {
        getString: (name) => {
          if (name === 'id') return entryId;
          if (name === 'date') return date;
          if (name === 'list') return list;
          if (name === 'note') return null;
          return null;
        }
      }
    });
  }

  // !at → attendance_table（ID方式）
  if (cmd === 'at') {
    const entryId = args[0];

    const command = client.commands.get('attendance_table');
    if (!command) return;

    await command.execute({
      reply: async (obj) => message.channel.send(obj),
      followUp: async (obj) => message.channel.send(obj),
      channel: message.channel,
      user: message.author,
      guild: message.guild,
      options: {
        getString: (name) => {
          if (name === 'id') return entryId;
          return null;
        }
      }
    });
  }

  // !le → lottery_entry（ID方式）
  if (cmd === 'le') {
    const entryId = args[0];
    const date = args[1];
    const items = args.slice(2).join(' ');

    const command = client.commands.get('lottery_entry');
    if (!command) return;

    await command.execute({
      reply: async (obj) => message.channel.send(obj),
      followUp: async (obj) => message.channel.send(obj),
      channel: message.channel,
      user: message.author,
      guild: message.guild,
      options: {
        getString: (name) => {
          if (name === 'id') return entryId;
          if (name === 'date') return date;
          if (name === 'items') return items;
          if (name === 'note') return null;
          return null;
        }
      }
    });
  }

  // !ld → lottery_draw（ID方式）
  if (cmd === 'ld') {
    const entryId = args[0];
    const counts = args[1];

    const command = client.commands.get('lottery_draw');
    if (!command) return;

    await command.execute({
      client,
      reply: async (obj) => message.channel.send(obj),
      followUp: async (obj) => message.channel.send(obj),
      channel: message.channel,
      user: message.author,
      guild: message.guild,
      options: {
        getString: (name) => {
          if (name === 'id') return entryId;
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

// --- Koyeb のヘルスチェック対策（ポート8000を開く） ---
const http = require("http");

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("OK");
}).listen(8000);
