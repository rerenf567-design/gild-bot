const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('attendance_table')
    .setDescription('出欠リアクションを集計して表形式で出力します')
    .addStringOption(opt =>
      opt.setName('date')
        .setDescription('日付 (YYYY-MM-DD)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const date = interaction.options.getString('date');

    // ① 先に応答（これでタイムアウトしない）
    await interaction.reply({ content: '集計中です…', ephemeral: true });

    // --- attendance.json 読み込み ---
    const file = './data/attendance.json';
    if (!fs.existsSync(file)) {
      return interaction.followUp('attendance.json が存在しません。');
    }

    const data = JSON.parse(fs.readFileSync(file, 'utf8'));

    if (!data[date]) {
      return interaction.followUp('指定された日付のデータがありません。');
    }

    const { messageId, options } = data[date];

    // --- メッセージ取得 ---
    const channel = interaction.channel;
    const msg = await channel.messages.fetch(messageId);

    // --- 出欠表（CSV形式）を組み立て ---

    // 1. 各コンテンツのユーザー一覧を取得
    const contentResults = {};

    for (const opt of options) {
      const reaction = msg.reactions.cache.get(opt.emoji);

      let users = [];
      if (reaction) {
        const fetched = await reaction.users.fetch();
        users = fetched
          .filter(u => !u.bot)
          .map(u => u.username);
      }

      contentResults[`${opt.emoji} ${opt.label}`] = users;
    }

    // 2. 列ごとに配列を作成（1列＝1コンテンツ）
    const columns = Object.entries(contentResults).map(([content, users]) => {
      const col = [];
      col.push(content);          // 1行目：コンテンツ名
      col.push(users.length);     // 2行目：人数
      col.push(...users);         // 3行目以降：ユーザー名
      return col;
    });

    // 3. 最長列に合わせて行数を揃える
    const maxRows = Math.max(...columns.map(col => col.length));

    // 4. 行ごとにカンマ区切りで結合（CSV）
    let output = '';
    for (let row = 0; row < maxRows; row++) {
      const line = columns.map(col => col[row] ?? '').join(',');
      output += line + '\n';
    }

    // 5. followUp で返す（reply は最初の1回だけ）
    await interaction.followUp("```\n" + output + "```");

    // 6. 出欠が終わったら削除
    delete data[date];
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  }
};