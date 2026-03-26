const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('attendance_table')
    .setDescription('出欠リアクションを集計して表形式で出力します（ID方式）')
    .addStringOption(opt =>
      opt.setName('id')
        .setDescription('出欠ID（例: 3月1週, A班出欠）')
        .setRequired(true)
    ),

  async execute(interaction) {
    const entryId = interaction.options.getString('id');

    // ① 先に応答（全員に見える）
    await interaction.reply({ content: '集計中です…' });

    // --- attendance.json 読み込み ---
    const file = '/data/attendance.json';
    if (!fs.existsSync(file)) {
      return interaction.followUp('attendance.json が存在しません。');
    }

    const data = JSON.parse(fs.readFileSync(file, 'utf8'));

    if (!data[entryId]) {
      return interaction.followUp('指定されたIDのデータがありません。');
    }

    const { messageId, channelId, options } = data[entryId];

    // --- 応募チャンネルからメッセージ取得 ---
    let msg = null;
    try {
      const entryChannel = await interaction.client.channels.fetch(channelId);
      msg = await entryChannel.messages.fetch(messageId);
    } catch {
      // メッセージが削除されていても続行
    }

    // --- 出欠表データ作成 ---
    const contentResults = {};

    for (const opt of options) {
      let users = [];

      if (msg) {
        const reaction = msg.reactions.cache.get(opt.emoji);
        if (reaction) {
          const fetched = await reaction.users.fetch();
          users = fetched.filter(u => !u.bot).map(u => u.username);
        }
      }

      contentResults[`${opt.emoji} ${opt.label}`] = users;
    }

    // --- CSV形式に整形 ---
    const columns = Object.entries(contentResults).map(([content, users]) => {
      const col = [];
      col.push(content);
      col.push(users.length);
      col.push(...users);
      return col;
    });

    const maxRows = Math.max(...columns.map(col => col.length));

    let output = '';
    for (let row = 0; row < maxRows; row++) {
      const line = columns.map(col => col[row] ?? '').join(',');
      output += line + '\n';
    }

    // --- コマンド実行チャンネルに投稿 ---
    const commandChannel = interaction.guild.channels.cache.get("1481902590890606633");
    await commandChannel.send("```\n" + output + "```");

    // --- JSON の該当IDだけ削除 ---
    delete data[entryId];
    fs.writeFileSync(file, JSON.stringify(data, null, 2));

    // --- 完了通知（全員に見える） ---
    await interaction.followUp({ content: '出欠集計が完了しました！' });
  }
};