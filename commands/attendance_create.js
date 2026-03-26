const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('attendance_create')
    .setDescription('出欠確認メッセージを作成します（ID方式）')
    .addStringOption(opt =>
      opt.setName('id')
        .setDescription('出欠ID（例: 3月1週, A班出欠）')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('date')
        .setDescription('対象日 (YYYY-MM-DD)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('list')
        .setDescription('絵文字と項目名（例: 👍 月A, 🔥 火B）')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('note')
        .setDescription('注釈（例: 〆切：3/14(金) 23:59）')
        .setRequired(false)
    ),

  async execute(interaction) {
    const entryId = interaction.options.getString('id');  // ← K が自由に決めるID
    const date = interaction.options.getString('date');
    const rawList = interaction.options.getString('list');
    const note = interaction.options.getString('note') ?? '';

    // --- options をパース ---
    const options = rawList.split(',').map(item => {
      const trimmed = item.trim();
      const [emoji, ...labelParts] = trimmed.split(' ');
      const label = labelParts.join(' ');
      return { emoji, label };
    });

    // --- メッセージ本文 ---
    let text = `【出欠確認】${entryId}\n対象日：${date}\n\n`;
    text += `参加できる日にリアクションをお願いします！\n\n`;

    for (const opt of options) {
      text += `${opt.emoji} ${opt.label}\n`;
    }

    if (note) {
      text += `\n${note}`;
    }

    // --- 応募チャンネルに投稿 ---
    const entryChannel = interaction.guild.channels.cache.get("1127938242302443530");
    const msg = await entryChannel.send(text);

    // --- リアクション付与 ---
    for (const opt of options) {
      await msg.react(opt.emoji);
    }

    // --- JSON 保存（ID方式） ---
    const file = '/data/attendance.json';
    const data = fs.existsSync(file)
      ? JSON.parse(fs.readFileSync(file, 'utf8'))
      : {};

    data[entryId] = {
      messageId: msg.id,
      channelId: entryChannel.id,
      date,
      options
    };

    fs.writeFileSync(file, JSON.stringify(data, null, 2));

    // --- コマンド実行チャンネルに通知 ---
    await interaction.reply({
      content: `出欠メッセージを作成しました：**${entryId}**`,
      ephemeral: true
    });
  }
};