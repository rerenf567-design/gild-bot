const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lottery_entry')
    .setDescription('抽選応募受付メッセージを作成します（曜日まとめ形式）')
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
    const date = interaction.options.getString('date');
    const rawItems = interaction.options.getString('items');
    const note = interaction.options.getString('note') ?? '当日22時ごろ〆切';

    // --- 商品リストをパース ---
    const items = rawItems.split(',').map(item => {
      const trimmed = item.trim();      // "🌲 ウッドブースト"
      const [emoji, ...labelParts] = trimmed.split(' ');
      const label = labelParts.join(' ');
      return { emoji, label, entries: [] };
    });

    // --- メッセージ本文 ---
    let text = `【抽選応募受付】${date} 分の商品\n\n`;

    text += `参加したい方はリアクションしてください！
    欠席になった場合はリアクションを外してください\n\n`

    for (const it of items) {
      text += `${it.emoji} ${it.label}\n\n`;
    }
  
    text += `${note}`;



    // --- メッセージ送信 ---
    const msg = await interaction.reply({
      content: text,
      fetchReply: true
    });

    // --- 商品ごとにリアクション付与 ---
    for (const it of items) {
      await msg.react(it.emoji);
    }

    // --- lottery.json に保存 ---
    const file = './data/lottery.json';
    const data = fs.existsSync(file)
      ? JSON.parse(fs.readFileSync(file, 'utf8'))
      : {};

data[date] = {
  channelId: msg.channel.id,
  messageId: msg.id,
  items
};

    fs.writeFileSync(file, JSON.stringify(data, null, 2));

    // スタッフ向け通知
    await interaction.followUp({
      content: '抽選応募受付メッセージを作成しました！',
      ephemeral: true
    });
  }
};
