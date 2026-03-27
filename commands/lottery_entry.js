const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lottery_entry')
    .setDescription('抽選応募受付メッセージを作成します（ID方式）')
    .addStringOption(opt =>
      opt.setName('id')
        .setDescription('エントリーID（例: A班, 夜の部）')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('date')
        .setDescription('抽選日 (YYYY-MM-DD)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('items')
        .setDescription('商品リスト（例: 🌲 ウッドブースト, 👻 厄除け人形）')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('note')
        .setDescription('注釈（例: 〆切：当日22:00ごろ）')
        .setRequired(false)
    ),

  async execute(interaction) {
    const entryId = interaction.options.getString('id');
    const date = interaction.options.getString('date');
    const rawItems = interaction.options.getString('items');
    const note = interaction.options.getString('note') ?? '当日22時ごろ〆切';

    // --- 商品リストをパース ---
    const items = rawItems.split(',').map(item => {
      const trimmed = item.trim();
      const [emoji, ...labelParts] = trimmed.split(' ');
      const label = labelParts.join(' ');
      return { emoji, label, entries: [] };
    });

    // --- パターンC本文（抽選応募版） ---
    let text = "";
    text += "★━━━━━━━━━━━━━━━━★\n";
    text += "　　　🎯 抽選応募受付 🎯\n";
    text += "★━━━━━━━━━━━━━━━━★\n\n";
    text += `【ID】${entryId}\n`;
    text += `${date}日 抽選商品の応募受付中です！\n\n`;
    text += "▼ 応募アイテム\n";
    text += "--------------------------------\n";

    for (const it of items) {
      text += `${it.emoji} ${it.label}\n`;
    }

    text += "--------------------------------\n\n";

    if (note) {
      text += `📌 備考：${note}\n`;
    }

    // --- 応募チャンネルに投稿 ---
    const entryChannel = interaction.guild.channels.cache.get("1127938242302443530");
    const msg = await entryChannel.send(text);

    // --- リアクション付与 ---
    for (const it of items) {
      await msg.react(it.emoji);
    }

    // --- JSON 保存（ID方式） ---
    const file = '/data/lottery.json';
    const data = fs.existsSync(file)
      ? JSON.parse(fs.readFileSync(file, 'utf8'))
      : {};

    data[entryId] = {
      messageId: msg.id,
      channelId: entryChannel.id,
      date,
      items
    };

    fs.writeFileSync(file, JSON.stringify(data, null, 2));

    // --- スタッフ向け通知 ---
    await interaction.reply({
      content: `抽選応募受付を作成しました：**${entryId}**`
    });
  }
};