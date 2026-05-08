// ===== 一生編: 90秒で生まれて死ぬ =====

// === 5ステージ定義 (時間軸 90秒) ===
const STAGES = [
  { id:'birth',   name:'出生',   chapter:'第1章 誕生',   from:0,   to:18,  ageFrom:0,  ageTo:12,  bg:'#ffd6e0', accent:'#ff8aa0', emoji:'👶' },
  { id:'school',  name:'学校',   chapter:'第2章 青春',   from:18,  to:36,  ageFrom:12, ageTo:22,  bg:'#aaddff', accent:'#3a87d8', emoji:'🎓' },
  { id:'work',    name:'社畜',   chapter:'第3章 労働',   from:36,  to:66,  ageFrom:22, ageTo:50,  bg:'#444',    accent:'#aa3030', emoji:'💼' },
  { id:'old',     name:'老後',   chapter:'第4章 黄昏',   from:66,  to:82,  ageFrom:50, ageTo:80,  bg:'#665544', accent:'#aa6633', emoji:'👴' },
  { id:'tomb',    name:'墓場',   chapter:'第5章 終焉',   from:82,  to:90,  ageFrom:80, ageTo:100, bg:'#111',    accent:'#666',    emoji:'⚰️' },
];

// === 障害物: ステージ別ライフイベント ===
// hit時: 1ダメージ + tags蓄積 + ラベル一瞬表示
// 表示はラベルのみ。物語は最後の死に様で総括
const OBSTACLES = [
  // === 出生 ===
  { label:'親ガチャ大失敗', stage:'birth', sprite:'parents_scold', tags:['kazoku'] },
  { label:'ネグレクト', stage:'birth', sprite:'parents_phone', tags:['kazoku','kodoku'] },
  { label:'親が宗教', stage:'birth', sprite:'oldwoman_pray', tags:['sagi','kazoku'] },
  { label:'兄弟差別', stage:'birth', sprite:'parents_fight', tags:['kazoku'] },
  { label:'親の借金1億', stage:'birth', sprite:'scam_money', tags:['kane','kazoku'] },
  { label:'保育園落ちた', stage:'birth', sprite:'baby_cry', tags:['kazoku'] },
  // === 学校 ===
  { label:'イジメ', stage:'school', sprite:'classmate_mock', tags:['kodoku','stress'] },
  { label:'受験失敗', stage:'school', sprite:'classmate_study', tags:['stress'] },
  { label:'教師パワハラ', stage:'school', sprite:'teacher_throw', tags:['stress'] },
  { label:'不登校', stage:'school', sprite:'classmate_cry', tags:['kodoku'] },
  { label:'初恋失恋', stage:'school', sprite:'gf_cold', tags:['kodoku'] },
  { label:'部活先輩鬼', stage:'school', sprite:'teacher_scold', tags:['stress'] },
  { label:'進路選択ミス', stage:'school', sprite:'classmate_phone', tags:['stress'] },
  { label:'ガチャ爆死', stage:'school', sprite:'villain_phone', tags:['kane','modern'] },
  // === 社畜 ===
  { label:'残業地獄', stage:'work', sprite:'sara_run', tags:['karoshi'] },
  { label:'上司パワハラ', stage:'work', sprite:'boss_yell', tags:['karoshi','stress'] },
  { label:'リストラ通告', stage:'work', sprite:'boss_slam', tags:['karoshi','kane'] },
  { label:'結婚', stage:'work', sprite:'wed_throw', tags:['kazoku'] },
  { label:'離婚', stage:'work', sprite:'wed_divorce', tags:['kazoku','kane'] },
  { label:'宝くじ1億', stage:'work', sprite:'scam_money', tags:['kane','sagi'] },
  { label:'ロマンス詐欺', stage:'work', sprite:'scam_phone', tags:['sagi','kazoku'] },
  { label:'闇バイト', stage:'work', sprite:'villain_sneak', tags:['yami'] },
  { label:'うつ発症', stage:'work', sprite:'panic_fetal', tags:['stress','karoshi'] },
  { label:'投資勧誘', stage:'work', sprite:'scam_contract', tags:['kane','sagi'] },
  { label:'迷惑YouTuber', stage:'work', sprite:'classmate_phone', tags:['modern','yami'] },
  { label:'病気発覚', stage:'work', sprite:'doc_xray', tags:['kenkou'] },
  { label:'女上司ハラ', stage:'work', sprite:'bossw_throw', tags:['karoshi','stress'] },
  // === 老後 ===
  { label:'孤独死フラグ', stage:'old', sprite:'oldman_despair', tags:['kodoku'] },
  { label:'オレオレ詐欺', stage:'old', sprite:'scam_phone', tags:['sagi'] },
  { label:'介護地獄', stage:'old', sprite:'oldwoman_cry', tags:['rougo','kazoku'] },
  { label:'認知症発症', stage:'old', sprite:'oldman_scared', tags:['rougo','kenkou'] },
  { label:'年金破綻', stage:'old', sprite:'oldman_money', tags:['kane','rougo'] },
  { label:'万引き老人', stage:'old', sprite:'villain_sneak', tags:['rougo','yami'] },
  // === 墓場 ===
  { label:'葬式参列ゼロ', stage:'tomb', sprite:'funeral_coffin', tags:['kodoku'] },
  { label:'遺産争い', stage:'tomb', sprite:'funeral_fight', tags:['kazoku','kane'] },
  { label:'墓石未納', stage:'tomb', sprite:'funeral_priest', tags:['kane'] },
  { label:'あの世入場拒否', stage:'tomb', sprite:'big_skull', tags:['rifujin','natural'] },
  { label:'閻魔の判定', stage:'tomb', sprite:'big_devil', tags:['rifujin'] },
];

// === 死に様: 90+ あるある ===
const DEATHS = [
  // 金欠
  { type:'給料日前餓死', msg:'給料日前にATM画面で「残高表示」を押せない技を体得した。覚えた瞬間、口座が凍結されていた。', tags:['kane'] },
  { type:'サブスク死', msg:'解約し忘れたサブスクが47個。月12万の引き落としに気づいた日、心臓が解約された。', tags:['kane','modern'] },
  { type:'Amazon中毒', msg:'「カートに残す」が427件。死後に届いた段ボールが家を埋め尽くし、飼い猫が圧死した。', tags:['kane','modern'] },
  { type:'ふるさと納税地獄', msg:'限度額を超えて申し込み、泣きながら確定申告。涙で書類が読めず追徴課税で一文無しに。', tags:['kane'] },
  { type:'メルカリ転売', msg:'新品の参考書を「いつか読む」と買い、新品のままメルカリで半額売却。3年連続で繰り返し、何も身につかず死亡。', tags:['kane'] },
  // 健康
  { type:'明日からダイエット', msg:'「明日からダイエット」と毎晩ラーメン。明日が来る前に脂肪肝で逝った。', tags:['kenkou'] },
  { type:'健診先延ばし', msg:'「来年こそ受ける」を10年連続。10年目、検査結果は紙の上で受け取ることになった。', tags:['kenkou'] },
  { type:'コーヒー10杯', msg:'「集中力アップ」で毎日10杯飲み続け、胃に穴が開いた瞬間にデスクから倒れた。', tags:['kenkou'] },
  { type:'夜更かし美容', msg:'「夜更かしは肌に悪い」と言いながら朝5時のスマホ。5年後、肌も命も持たなかった。', tags:['kenkou','modern'] },
  // 社畜
  { type:'明日から本気', msg:'「明日から本気出す」と毎日言って20年。本気を出した日が、葬式の日だった。', tags:['karoshi'] },
  { type:'お疲れ様死', msg:'「お疲れさまです」と打ったLINEに、本当の意味で疲れて返信できなくなった。', tags:['karoshi'] },
  { type:'残業100時間', msg:'残業100時間の月、給料明細を見ずに引き落としされた家賃で死を悟った。', tags:['karoshi'] },
  { type:'今月忙しい', msg:'「俺、今月忙しいんだよ」を3年連続で言い続け、葬式に来たのは葬儀屋だけ。', tags:['karoshi','kodoku'] },
  { type:'リモハラ', msg:'Zoom「カメラオンで」と言われ続けて、画面の中の自分の顔に絶望し倒れた。', tags:['karoshi','stress'] },
  { type:'退職代行', msg:'退職代行で解放された翌日、「もう何もしたくない」を本当の意味で実行してしまった。', tags:['karoshi'] },
  // 恋愛
  { type:'マッチングアプリ墓場', msg:'マッチングアプリで「いいね」347件、会えたのは0人。墓石に「ナイスガイ」と刻まれた。', tags:['kodoku','modern'] },
  { type:'元カレ結婚式', msg:'元カレの結婚式の招待状を見た夜、酒で食道が溶けた。', tags:['kodoku','kenkou'] },
  { type:'婚活パーティ3000回', msg:'「お仕事は？」を3000回聞かれて病んだ。3001回目に答える前に倒れた。', tags:['kodoku','stress'] },
  { type:'実家暮らし45', msg:'「俺、料理できるよ」と言い続けて実家暮らし45年。母が死んだ翌週、餓死した。', tags:['kodoku','kazoku'] },
  { type:'彼女いない歴年齢', msg:'「いつかは結婚する」と言って50年。いつかは来なかったが、最期はちゃんと来た。', tags:['kodoku'] },
  // SNS/モダン
  { type:'推し全財産', msg:'推しのライブで月給全額。「家賃来月でいいよね」と大家に言った翌日、退去通知が届いた。', tags:['modern','kane'] },
  { type:'投稿0いいね', msg:'10年続けたインスタで「いいね」が一度も付かなかった。葬儀の写真が初めてバズった。', tags:['modern','kodoku'] },
  { type:'映え死', msg:'「インスタ映え」のために崖の縁で自撮り。映えと共に落ちた。', tags:['modern'] },
  { type:'AI友達', msg:'ChatGPTを唯一の友達にして3年。サービス終了の日に発狂、現実に戻れず即死。', tags:['modern','kodoku'] },
  { type:'ガチャ最終課金', msg:'「次で出るはず」を1000連、出なかったのは新キャラじゃなく心臓だった。', tags:['modern','kane'] },
  { type:'あと5分死', msg:'アラームの「あと5分」を30回押した朝、永遠に5分が来なかった。', tags:['modern'] },
  // 家族
  { type:'結婚いつ攻撃', msg:'「結婚しないの？」を50歳まで聞かれ続け、聞いた相手の墓参りに行く側になっていた。', tags:['kazoku','kodoku'] },
  { type:'母から最後の電話', msg:'母「いつ帰ってくるの？」最後の電話を無視した翌週、葬式で帰った。', tags:['kazoku'] },
  { type:'嫁姑LINE', msg:'嫁姑のLINE既読対応で3年、両方から嫌われた朝、心臓が両方の責任を取った。', tags:['kazoku'] },
  { type:'親の遺産分割', msg:'兄弟と絶縁してでも勝ち取った遺産。家を建て直した翌日に倒産通知が来た。', tags:['kazoku','kane'] },
  // 詐欺
  { type:'特殊詐欺被害', msg:'「市役所の者ですが」を信じて還付金を渡した。還付されたのは涙だけだった。', tags:['sagi'] },
  { type:'投資詐欺', msg:'「絶対儲かる」を信じて全財産投入。「絶対」は嘘だったが「全財産」は本当だった。', tags:['sagi','kane'] },
  // 老後
  { type:'孤独死3週間', msg:'孤独死、発見まで3週間。発見者は宅配の不在通知が部屋に7枚届いた配達員。', tags:['kodoku','rougo'] },
  { type:'介護離職', msg:'親の介護で仕事を辞めた。親は5年生き、自分の年金は2年前に消えた。', tags:['rougo','kane','kazoku'] },
  // 理不尽
  { type:'隕石ピンポイント', msg:'隕石が地球で唯一、自分の頭に落ちた。確率は1兆分の1だった。', tags:['rifujin'] },
  { type:'通り魔', msg:'コンビニから出た瞬間、知らない人に刺された。理由は「目が合ったから」。', tags:['rifujin','yami'] },
  { type:'クマ出没', msg:'通勤路でクマに遭遇。会社に向かう途中、本当に「会社」が遠ざかった。', tags:['rifujin'] },
  { type:'雷直撃', msg:'傘さしてたら雷直撃。傘が金属だった事を最期に知った。', tags:['rifujin'] },
  { type:'AI暴走トラック', msg:'青信号で渡ってたらトラックが突っ込んできた。運転手はAI自動運転だった。', tags:['rifujin','modern'] },
  { type:'神様の気まぐれ', msg:'神様「お前、明日終わりな」「は？」翌日、本当に終わった。', tags:['rifujin','natural'] },
  // 寿命/その他
  { type:'凡人寿命', msg:'可もなく不可もなく80年。墓石に刻まれたのは「無」の一文字だった。', tags:['natural'] },
  { type:'選択肢ゼロ', msg:'全部の選択肢がハズレなら、生まれた時点でハズレだった。納得して逝った。', tags:['natural'] },
  { type:'寿命', msg:'90秒の人生を全うした。何も残らず、誰にも記憶されず、葬式も開かれなかった。', tags:['natural'] },
];

function pickDeath(tags) {
  if (!tags || !tags.length) return DEATHS[Math.floor(Math.random() * DEATHS.length)];
  const counts = {};
  tags.forEach(t => counts[t] = (counts[t] || 0) + 1);
  // タグ重なり数でスコアリング
  const scored = DEATHS.map(d => {
    const score = (d.tags || []).reduce((s, t) => s + (counts[t] || 0), 0);
    return { d, score };
  }).filter(x => x.score > 0);
  if (!scored.length) return DEATHS[Math.floor(Math.random() * DEATHS.length)];
  scored.sort((a, b) => b.score - a.score);
  // 上位3つからランダム
  const top = scored.slice(0, 3);
  return top[Math.floor(Math.random() * top.length)].d;
}

// === プロローグ (一生編) ===
const PROLOGUE = [
  { speaker:'???', avatar:'😶', godImg:'god_bored', text:'……はい、次の方どうぞ。' },
  { speaker:'神', avatar:'😪', godImg:'god_bored', text:'今月で847人目です。\n慣れたものですよ。' },
  { speaker:'神', avatar:'😏', godImg:'god_tablet', text:'では『運命の書』を確認します……。' },
  { speaker:'神', avatar:'😏', godImg:'god_tablet', text:'氏名 記入なし。\n年収 平均以下。\n特技 特になし。' },
  { speaker:'神', avatar:'🤲', godImg:'god_explain', text:'ああ、典型的な『凡人』ですね。' },
  { speaker:'神', avatar:'😏', godImg:'god_explain', text:'あなたに『90秒の人生』を貸し出します。\n生まれて、死ぬまで。' },
  { speaker:'神', avatar:'😏', godImg:'god_explain', text:'画面をスワイプ → 主人公が動く。\n降ってくる『運命』を避けてください。' },
  { speaker:'神', avatar:'😪', godImg:'god_bored', text:'ステージは5幕、出生→学校→社畜→老後→墓場。\n自動で進みます。' },
  { speaker:'神', avatar:'😈', godImg:'god_stern', text:'ああ、言い忘れていました。\n全部ハズレです。' },
  { speaker:'神', avatar:'😈', godImg:'god_stern', text:'過労死、借金、孤独死、推し活破産。\n全部、あなた自身の『あるある』です。' },
  { speaker:'神', avatar:'😏', godImg:'god_explain', text:'では──\n笑って死ねますか？' },
];

// === ヒット時の5コマ漫画テンプレ(ステージ別)・{label}にラベル挿入 ===
const HIT_TEMPLATES = {
  birth: [
    { text:'生まれて間もない頃', img:'baby_crawl' },
    { text:'{label}が襲ってきた', img:'baby_scared' },
    { text:'親は、気づかない', img:'parents_phone' },
    { text:'幼少期にトラウマ確定', img:'baby_cry' },
    { text:'神「人生、ハードモードね」', img:'god2_smug' },
  ],
  school: [
    { text:'学生時代、ふつうに歩いてた', img:'classmate_study' },
    { text:'{label}に遭遇', img:'classmate_mock' },
    { text:'誰も助けてくれなかった', img:'classmate_cry' },
    { text:'青春、終了', img:'panic_fetal' },
    { text:'神「ありがちなパターン」', img:'god2_phone' },
  ],
  work: [
    { text:'働いてた、ふつうに', img:'sara_run' },
    { text:'{label}が降ってきた', img:'boss_yell' },
    { text:'対応に追われ、休めない', img:'panic_scream' },
    { text:'気づけば、心がすり減った', img:'sara_sad' },
    { text:'神「社畜の宿命だね」', img:'god2_yawn' },
  ],
  old: [
    { text:'老いた頃、ぼーっとしてた', img:'oldman_normal' },
    { text:'{label}が忍び寄る', img:'oldman_scared' },
    { text:'もう、逃げ場がない', img:'panic_fetal' },
    { text:'寿命を、削られる', img:'oldman_despair' },
    { text:'神「老後あるある」', img:'god2_phone' },
  ],
  tomb: [
    { text:'死後、ふと気づくと', img:'funeral_coffin' },
    { text:'{label}が起きていた', img:'big_skull' },
    { text:'もう、何も変えられない', img:'funeral_priest' },
    { text:'魂、永遠に彷徨う', img:'panic_fetal' },
    { text:'神「あの世も平等じゃない」', img:'god2_smug' },
  ],
};

// === 回復アイテム(出ると+1ライフ・代わりに死亡タグ蓄積) ===
const HEAL_ITEMS = [
  { id:'lover', label:'💕 美人彼女', sprite:'gf_love', tags:['kazoku','kodoku'], heal:1,
    scenes:[
      'ふと出会った人に好かれた',
      '「あなたといると、楽しい」',
      '幸せな日々が3週間続いた',
      '4週目、急に塩対応',
      '神「他に好きな人できたって」',
    ]},
  { id:'lottery', label:'💰 宝くじ1億', sprite:'scam_money', tags:['kane','sagi'], heal:1,
    scenes:[
      '宝くじを買ったら、当選',
      '通帳に1億円',
      '親戚が10人現れた',
      '詐欺師が群がる',
      '神「3年で破産する見込み」',
    ]},
  { id:'dream', label:'⭐ 夢叶う', sprite:'cool_thumb', tags:['modern','yami'], heal:1,
    scenes:[
      '念願のYouTuberデビュー',
      '初動から100万再生',
      '高校時代のツイ発掘',
      '炎上、案件全消滅',
      '神「夢、儚いね」',
    ]},
  { id:'parent', label:'👴 親孝行', sprite:'oldman_money', tags:['kazoku'], heal:1,
    scenes:[
      '親に旅行をプレゼント',
      '旅館で親が運命の出会い',
      'SNSに「人生これから」投稿',
      '遺産は再婚相手にすべて',
      '神「親孝行も裏目に」',
    ]},
];

// === ステージ別Wave: 各幕に1回はヒール or 壁 ===
const WAVES = [
  // 出生編 (0-18s): 親の温もり (heal)
  { time:11, name:'親の温もり', heal:true,
    healDef:{ id:'parent_warm', label:'💕 母の抱擁', sprite:'parents_baby', tags:['kazoku'], heal:1,
      scenes:['母に抱きしめられた','「大丈夫よ」','一瞬、世界が安全に','すぐ放された','神「子供時代の幻想」'] }},
  // 学校編 (18-36s): 初恋 (heal) + イジメ集中
  { time:24, name:'初恋', heal:true,
    healDef:{ id:'first_love', label:'💕 初恋', sprite:'gf_wave', tags:['kodoku'], heal:1,
      scenes:['同じクラスの子に惹かれた','放課後、目が合った','勇気出して話しかけた','3日後、別の人と歩いてた','神「青春の通過儀礼」'] }},
  { time:30, name:'いじめラッシュ', sprite:'classmate_mock', minion:'イジメ', minionSprite:'classmate_mock', tags:['kodoku','stress'], duration:5, count:14 },
  // 社畜編 (36-66s): 鬼上司→残業, 詐欺師→勧誘, 理不尽の壁
  { time:38, name:'鬼上司', sprite:'boss_slam', minion:'残業', minionSprite:'sara_run', tags:['karoshi'], duration:7, count:22 },
  { time:48, name:'詐欺師', sprite:'scam_money', minion:'勧誘', minionSprite:'scam_contract', tags:['sagi','kane'], duration:6, count:18 },
  { time:58, name:'理不尽の壁', sprite:'big_skull', tags:['rifujin'], wall:true, wallCount:6, gapCount:1 },
  // 老後編 (66-82s): 孫の電話 (heal), 病気の波
  { time:69, name:'孫の電話', heal:true,
    healDef:{ id:'grandchild', label:'☎️ 孫からの電話', sprite:'parents_phone', tags:['kazoku'], heal:1,
      scenes:['電話が鳴った','孫からだった','「おじいちゃん、元気?」','涙が出た','神「老後の数少ない救い」'] }},
  { time:76, name:'病気の波', sprite:'doc_xray', minion:'病気', minionSprite:'doc_xray', tags:['kenkou','rougo'], duration:5, count:14 },
  // 墓場編 (82-90s): 閻魔ラッシュ
  { time:85, name:'閻魔ラッシュ', sprite:'big_devil', minion:'閻魔', minionSprite:'big_devil', tags:['rifujin','natural'], duration:4, count:14 },
];

// === 保証スポーン (guaranteed) ===
const GUARANTEED_HEAL_TIME = 40; // 経過秒。1回だけ確実に幸運アイテム降下

// === ライフ初期値 ===
const INITIAL_LIVES = 5;

// === ボス削除済み(stage遷移で代用) ===
const BOSSES = {};

// === ランク表 ===
function getRank(lives, hits) {
  if (lives >= 5) return '🏆 SS 無傷の凡人';
  if (lives >= 3) return 'A 平凡な人生';
  if (lives >= 1) return 'B ボロボロの人生';
  return 'F 早死に';
}
