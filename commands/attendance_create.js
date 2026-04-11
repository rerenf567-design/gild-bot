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
    const entryId = interaction.options.getString('id');
    const date = interaction.options.getString('date');
    const rawList = interaction.options.getString('list');
    const note = interaction.options.getString('note') ?? '';

    // --- options をパース ---
    const options = rawList.split(',').map(item => {
      const trimmed = item.trim();
      const [emoji, ...labelParts] = trimmed.split(' ');
      return { emoji, label: labelParts.join(' ') };
    });

    // --- パターンC本文（テンプレートリテラルで一括管理） ---
    const listText = options.map(opt => `${opt.emoji} ${opt.label}`).join('\n');

    const text = `
★━━━━━━━━━━━━━━━━★
🏰 ${date} 週のギルコン出欠確認 🏰
★━━━━━━━━━━━━━━━━★

【ID】${entryId}
リアクションをお願いします！

--------------------------------
${listText}
--------------------------------

${note ? `📌 ${note}\n` : ''}`.trim();

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
      content: `出欠メッセージを作成しました：**${entryId}**`
    });
  }
};