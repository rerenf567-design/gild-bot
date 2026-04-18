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

    await interaction.reply({ content: '集計中です…' });

    const file = '/data/attendance.json';
    if (!fs.existsSync(file)) {
      return interaction.followUp('attendance.json が存在しません。');
    }

    const data = JSON.parse(fs.readFileSync(file, 'utf8'));

    // --- ★ 古いIDを自動削除（14日） ---
    const now = Date.now();
    const limit = 14 * 24 * 60 * 60 * 1000;

    for (const key of Object.keys(data)) {
      if (data[key].createdAt && now - data[key].createdAt > limit) {
        delete data[key];
      }
    }

    fs.writeFileSync(file, JSON.stringify(data, null, 2));

    // --- ID 存在チェック ---
    if (!data[entryId]) {
      return interaction.followUp('指定されたIDのデータがありません。');
    }

    const { messageId, channelId, options } = data[entryId];

    // --- メッセージ取得 ---
    let msg = null;
    try {
      const entryChannel = await interaction.client.channels.fetch(channelId);
      msg = await entryChannel.messages.fetch(messageId);
    } catch {}

    // --- リアクション集計 ---
    const contentResults = {};

    for (const opt of options) {
      let users = [];

      if (msg) {
        const reaction = msg.reactions.cache.get(opt.emoji);
        if (reaction) {
          // ★ 1番目のリアクション漏れを防ぐ
          const fetched = await reaction.users.fetch({ after: "0" });

          users = fetched
            .filter(u => !u.bot)
            .map(u => u.username);  // safeName は不要
        }
      }

      contentResults[`${opt.emoji} ${opt.label}`] = users;
    }

    // --- CSV 形式に整形 ---
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

    // --- 出力 ---
    const commandChannel = interaction.guild.channels.cache.get("1481902590890606633");
    await commandChannel.send("```text\n" + output + "```");

    // --- ★ 削除ではなく completed フラグを付ける ---
    data[entryId].completed = true;
    fs.writeFileSync(file, JSON.stringify(data, null, 2));

    await interaction.followUp({ content: '出欠集計が完了しました！' });
  }
};