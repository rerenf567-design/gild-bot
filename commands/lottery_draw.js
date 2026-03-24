// commands/lottery_draw.js
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lottery_draw')
    .setDescription('抽選を実行します（曜日まとめ形式）')
    .addStringOption(opt =>
      opt.setName('date')
        .setDescription('抽選日 (YYYY-MM-DD)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('counts')
        .setDescription('商品ごとの当選数（例: 2,5,3）')
        .setRequired(true)
    ),

  async execute(interaction) {
    const date = interaction.options.getString('date');
    const countsRaw = interaction.options.getString('counts');
    const counts = countsRaw.split(',').map(n => parseInt(n.trim(), 10));

    // --- lottery.json 読み込み ---
    const file = '/data/lottery.json';
    if (!fs.existsSync(file)) {
      return interaction.reply('lottery.json が存在しません。');
    }

    const data = JSON.parse(fs.readFileSync(file, 'utf8'));

    if (!data[date]) {
      return interaction.reply('指定された日付の抽選データがありません。');
    }

    const { channelId, messageId, items } = data[date];

    if (counts.length !== items.length) {
      return interaction.reply('当選数の数が商品数と一致していません。');
    }

    // --- 応募メッセージを取得 ---
    const entryChannel = await interaction.client.channels.fetch(channelId);
    const entryMessage = await entryChannel.messages.fetch(messageId);

    // --- リアクションから応募者を読み取る ---
    for (const item of items) {
      const reaction = entryMessage.reactions.cache.get(item.emoji);

      if (!reaction) {
        item.entries = [];
        continue;
      }

      const fetched = await reaction.users.fetch();
      item.entries = fetched
        .filter(u => !u.bot)
        .map(u => u.id);
    }

    // --- 抽選処理 ---
    let resultText = `【抽選結果】${date}\n\n`;
    let historyText = `【抽選履歴】${date}\n\n`;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const winnersCount = counts[i];

      const shuffled = [...item.entries].sort(() => Math.random() - 0.5);

      const winners = shuffled.slice(0, winnersCount);
      const others = shuffled.slice(winnersCount);

      // --- 本体（メンションあり） ---
      resultText += `■ ${item.label}（当選${winnersCount}名）\n`;
      if (winners.length === 0) {
        resultText += `応募者なし\n\n`;
      } else {
        for (const uid of winners) {
          resultText += `<@${uid}>\n`;
        }
        resultText += `\n`;
      }

      // --- 履歴（メンションなし） ---
      historyText += `■ ${item.label}\n`;
      historyText += `当選者（${winners.length}名）\n`;

      for (const uid of winners) {
        const user = await interaction.client.users.fetch(uid);
        historyText += `- ${user.username}\n`;
      }

      historyText += `\n以下の方（ランダム順）\n`;

      if (others.length === 0) {
        historyText += `- （該当者なし）\n\n`;
      } else {
        for (const uid of others) {
          const user = await interaction.client.users.fetch(uid);
          historyText += `- ${user.username}\n`;
        }
        historyText += `\n`;
      }
    }

    resultText += `おめでとうございます！`;

    // --- 結果チャンネル（コマンドを実行した場所） ---
    const resultChannel = interaction.channel;

    // --- 抽選結果を結果チャンネルに投稿 ---
    const resultMessage = await resultChannel.send(resultText);

    // --- スレッド作成（結果チャンネルの投稿に紐づく） ---
    const thread = await resultMessage.startThread({
      name: `抽選履歴：${date}`,
      autoArchiveDuration: 1440
    });

    await thread.send(historyText);

    // --- 抽選後データ削除 ---
    delete data[date];
    fs.writeFileSync(file, JSON.stringify(data, null, 2));

    // --- slash コマンドの応答 ---
    await interaction.reply({ content: '抽選を実行しました！', ephemeral: true });
  }
};
