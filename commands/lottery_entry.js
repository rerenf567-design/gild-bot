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
    const entryId = interaction.options.getString('id');   // ← K が自由に決めるID
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

    // --- メッセージ本文 ---
    let text = `【抽選応募受付】${entryId}\n`;
    text += `抽選日：${date}\n\n`;
    text += `参加したい方はリアクションしてください！\n`;
    text += `欠席になった場合はリアクションを外してください\n\n`;

    for (const it of items) {
      text += `${it.emoji} ${it.label}\n`;
    }

    text += `\n${note}`;

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

    // --- スタッフ向け通知（コマンド実行チャンネル） ---
    await interaction.reply({
      content: `抽選応募受付を作成しました：**${entryId}**`,
      ephemeral: true
    });
  }
};