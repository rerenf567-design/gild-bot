// commands/attendance_create.js
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('attendance_create')   // ← ここだけ変更
    .setDescription('出欠確認メッセージを作成します')
    .addStringOption(opt =>
      opt.setName('date')
        .setDescription('日付 (YYYY-MM-DD)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('list')
        .setDescription('絵文字とコンテンツ名（例: 👍 月A, 🔥 火B）')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('note')
        .setDescription('注釈（例: 〆切：3/14(金) 23:59）')
        .setRequired(false)
    ),

  async execute(interaction) {
    const date = interaction.options.getString('date');
    const rawList = interaction.options.getString('list');
    const note = interaction.options.getString('note') ?? '';

    // --- options をパース ---
    const options = rawList.split(',').map(item => {
      const trimmed = item.trim();      // "👍 月A"
      const [emoji, ...labelParts] = trimmed.split(' ');
      const label = labelParts.join(' ');
      return { emoji, label };
    });

    // --- メッセージ本文を組み立て ---
    let text = `【出欠】${date} の週\n\n`;
    text += `参加できる日にリアクションをお願いします！\n\n`;

    for (const opt of options) {
      text += `${opt.emoji} ${opt.label}\n`;
    }

    if (note) {
      text += `\n${note}`;
    }

    // --- メッセージ送信 ---
    const msg = await interaction.reply({ content: text, fetchReply: true });

    // --- リアクション付与 ---
    for (const opt of options) {
      await msg.react(opt.emoji);
    }

    // --- attendance.json に保存 ---
    const file = './data/attendance.json';
    const data = fs.existsSync(file)
      ? JSON.parse(fs.readFileSync(file, 'utf8'))
      : {};

    data[date] = {
      messageId: msg.id,
      options
    };

    fs.writeFileSync(file, JSON.stringify(data, null, 2));

    await interaction.followUp({
      content: '出欠メッセージを作成しました！',
      ephemeral: true
    });
  }
};