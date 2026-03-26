const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lottery_draw')
    .setDescription('抽選を実行します（ID方式）')
    .addStringOption(opt =>
      opt.setName('id')
        .setDescription('抽選ID（例: A班, 夜の部）')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('counts')
        .setDescription('商品ごとの当選数（例: 2,5,3）')
        .setRequired(true)
    ),

  async execute(interaction) {
    const entryId = interaction.options.getString('id');
    const countsRaw = interaction.options.getString('counts');
    const counts = countsRaw.split(',').map(n => parseInt(n.trim(), 10));

    // --- JSON 読み込み ---
    const file = '/data/lottery.json';
    if (!fs.existsSync(file)) {
      return interaction.reply({ content: 'lottery.json が存在しません。', ephemeral: true });
    }

    const data = JSON.parse(fs.readFileSync(file, 'utf8'));

    if (!data[entryId]) {
      return interaction.reply({ content: '指定されたIDの抽選データがありません。', ephemeral: true });
    }

    const { channelId, messageId, date, items } = data[entryId];

    if (counts.length !== items.length) {
      return interaction.reply({ content: '当選数の数が商品数と一致していません。', ephemeral: true });
    }

    // --- 応募メッセージ取得（削除されていても落ちない） ---
    let entryMessage = null;
    try {
      const entryChannel = await interaction.client.channels.fetch(channelId);
      entryMessage = await entryChannel.messages.fetch(messageId);
    } catch {
      // メッセージが削除されていても entries=[] で続行
    }

    // --- リアクションから応募者を読み取る ---
    for (const item of items) {
      if (!entryMessage) {
        item.entries = [];
        continue;
      }

      const reaction = entryMessage.reactions.cache.get(item.emoji);
      if (!reaction) {
        item.entries = [];
        continue;
      }

      const fetched = await reaction.users.fetch();
      item.entries = fetched.filter(u => !u.bot).map(u => u.id);
    }

    // --- 抽選処理 ---
    let resultText = `【抽選結果】${entryId}\n抽選日：${date}\n\n`;
    let logText = `【抽選ログ】${entryId}\n抽選日：${date}\n\n`;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const winnersCount = counts[i];

      const shuffled = [...item.entries].sort(() => Math.random() - 0.5);
      const winners = shuffled.slice(0, winnersCount);
      const others = shuffled.slice(winnersCount);

      // --- 結果（メンションあり） ---
      resultText += `■ ${item.label}（当選${winnersCount}名）\n`;
      if (winners.length === 0) {
        resultText += `応募者なし\n\n`;
      } else {
        for (const uid of winners) {
          resultText += `<@${uid}>\n`;
        }
        resultText += `\n`;
      }

      // --- ログ（メンションなし） ---
      logText += `■ ${item.label}\n`;
      logText += `当選者（${winners.length}名）\n`;

      for (const uid of winners) {
        const user = await interaction.client.users.fetch(uid);
        logText += `- ${user.username}\n`;
      }

      logText += `\nその他（ランダム順）\n`;
      if (others.length === 0) {
        logText += `- （該当者なし）\n\n`;
      } else {
        for (const uid of others) {
          const user = await interaction.client.users.fetch(uid);
          logText += `- ${user.username}\n`;
        }
        logText += `\n`;
      }
    }

    resultText += `おめでとうございます！`;

    // --- 抽選結果チャンネルに投稿 ---
    const resultChannel = interaction.guild.channels.cache.get("1486690827119100024");
    await resultChannel.send(resultText);

    // --- 抽選ログをコマンド実行チャンネルに投稿 ---
    const commandChannel = interaction.guild.channels.cache.get("1481902590890606633");
    await commandChannel.send(logText);

    // --- JSON の該当IDだけ削除 ---
    delete data[entryId];
    fs.writeFileSync(file, JSON.stringify(data, null, 2));

    // --- slash コマンド応答 ---
    await interaction.reply({ content: '抽選を実行しました！', ephemeral: true });
  }
};