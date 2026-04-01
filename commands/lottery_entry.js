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

    // --- 抽選チャンネル（募集＋結果を統合） ---
    const lotteryChannel = interaction.guild.channels.cache.get("1486690827119100024");

    // --- 青系デザイン（募集） ---
    let text = "";
    text += `【${entryId}】🎉 抽選募集 / Entry\n\n`;
    text += "╔══════════════════════╗\n";
    text += "        🎉 抽選募集 🎉\n";
    text += "╚══════════════════════╝\n\n";

    text += `📅 抽選日：${date}\n\n`;

    text += "📦 応募アイテム\n";
    text += "--------------------------------\n";
    for (const it of items) {
      text += `${it.emoji} ${it.label}\n`;
    }
    text += "--------------------------------\n\n";

    text += `📝 応募方法：このメッセージにリアクション\n`;
    text += `📌 備考：${note}\n`;

    // --- 投稿 ---
    const msg = await lotteryChannel.send(text);

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
      channelId: lotteryChannel.id,
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