/**
 * Ngân hàng nội dung bài tập & đề JLPT dùng cho seed `20-quizzes.ts`.
 * Chỉ chứa dữ liệu thuần (không truy cập DB).
 */

export type BankQ = {
  type?: "mcq" | "short" | "essay";
  /** HTML; furigana dạng <ruby>漢字<rt>かんじ</rt></ruby>; chỗ trống "＿＿＿". */
  prompt: string;
  translation?: string;
  /** mcq: đúng 4 phương án (khóa A–D do seed gán). */
  options?: string[];
  /** mcq: chỉ số 0–3; short/essay: đáp án mẫu (các đáp án tương đương cách nhau " | "). */
  answer: number | string;
  explanation: string;
  explanationLong?: string;
  hint?: { title: string; body: string; exampleJa: string; exampleVi: string };
  audioText?: string;
  scene?: string;
  points?: number;
};

export type QuizSeed = {
  slug: string;
  kind: "exercise" | "jlpt";
  title: string;
  description: string;
  level: "N5" | "N4" | "N3" | "N2" | "N1";
  skill: "vocab" | "grammar" | "kanji" | "listening" | "communication" | "reading" | "jlpt";
  topic: string | null;
  difficulty: "easy" | "medium" | "hard";
  durationMin: number;
  emoji: string;
  icon?: string;
  tone: string;
  featured?: boolean;
  passScore?: number;
  createdDaysAgo: number;
  popularity: number;
  questions: BankQ[];
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const r = (k: string, f: string) => `<ruby>${k}<rt>${f}</rt></ruby>`;
const h = (title: string, body: string, exampleJa: string, exampleVi: string) => ({ title, body, exampleJa, exampleVi });

function mc(prompt: string, options: string[], answer: number, explanation: string, x: Partial<BankQ> = {}): BankQ {
  return { type: "mcq", prompt, options, answer, explanation, ...x };
}
function sh(prompt: string, answer: string, explanation: string, x: Partial<BankQ> = {}): BankQ {
  return { type: "short", prompt, answer, explanation, points: 2, ...x };
}
function es(prompt: string, answer: string, explanation: string, points: number, x: Partial<BankQ> = {}): BankQ {
  return { type: "essay", prompt, answer, explanation, points, ...x };
}
/** Câu hỏi cách đọc Kanji (JLPT 文字・語彙). */
function yomi(sentence: string, word: string, options: string[], answer: number, translation?: string): BankQ {
  return {
    type: "mcq",
    prompt: `「${word}」の よみかたは？<br>${sentence}`,
    options,
    answer,
    translation,
    explanation: `「${word}」 đọc là 「${options[answer]}」.`,
  };
}

/* ------------------------------------------------------------------ */
/* Bài tập theo chủ đề                                                 */
/* ------------------------------------------------------------------ */

const giaDinh: BankQ[] = [
  mc(`わたしの＿＿＿は${r("先生", "せんせい")}です。`, ["おかあさん", "はは", "あね", "ちち"], 1, "Khi nói về mẹ mình với người ngoài, dùng 「はは」.", {
    translation: "Mẹ tôi là giáo viên.",
    explanationLong: "「おかあさん」 dùng để gọi mẹ người khác (hoặc gọi mẹ mình trực tiếp). 「あね」 là chị gái, 「ちち」 là bố mình.",
    hint: h("Cách gọi người thân", "Gia đình mình: はは・ちち; gia đình người khác: おかあさん・おとうさん.", `${r("父", "ちち")}は${r("会社員", "かいしゃいん")}です。`, "Bố tôi là nhân viên công ty."),
    scene: "👩‍🏫",
  }),
  mc(`${r("田中", "たなか")}さんの＿＿＿は${r("医者", "いしゃ")}ですか。`, ["ちち", "そふ", "おとうさん", "おとうと"], 2, "Nói về bố của người khác dùng 「おとうさん」.", {
    translation: "Bố của anh Tanaka là bác sĩ phải không?",
    explanationLong: "「ちち」 chỉ dùng cho bố mình. 「そふ」 là ông (mình), 「おとうと」 là em trai.",
    hint: h("Gia đình người khác", "Thêm 「お〜さん」 khi nói về người thân của người khác.", `${r("田中", "たなか")}さんのおかあさんはやさしいです。`, "Mẹ anh Tanaka hiền lành."),
    scene: "👨‍⚕️",
  }),
  mc("「あに」はどういう いみですか。", ["Anh trai (của mình)", "Em trai", "Chị gái", "Em gái"], 0, "「あに」 là anh trai của mình; anh trai người khác là 「おにいさん」.", {
    hint: h("Anh chị em", "あに (anh) ・あね (chị) ・おとうと (em trai) ・いもうと (em gái).", `${r("兄", "あに")}は${r("大学生", "だいがくせい")}です。`, "Anh trai tôi là sinh viên."),
    scene: "👦",
  }),
  mc("「Em gái tôi」 tiếng Nhật là gì?", ["あね", "いもうと", "おとうと", "むすめ"], 1, "Em gái của mình là 「いもうと」.", {
    explanationLong: "「あね」 là chị gái, 「おとうと」 là em trai, 「むすめ」 là con gái.",
    hint: h("Em gái", "Em gái mình: いもうと; em gái người khác: いもうとさん.", `${r("妹", "いもうと")}は${r("十歳", "じゅっさい")}です。`, "Em gái tôi 10 tuổi."),
    scene: "👧",
  }),
  mc(`＿＿＿は ４${r("人", "にん")}です。${r("父", "ちち")}と${r("母", "はは")}と${r("姉", "あね")}とわたしです。`, ["かぞく", "きょうだい", "りょうしん", "しんせき"], 0, "「かぞく」 nghĩa là gia đình.", {
    translation: "Gia đình tôi có 4 người: bố, mẹ, chị gái và tôi.",
    explanationLong: "「きょうだい」 là anh chị em, 「りょうしん」 là bố mẹ, 「しんせき」 là họ hàng.",
    hint: h("Gia đình", "「家族（かぞく）」 = gia đình.", `${r("家族", "かぞく")}は${r("何人", "なんにん")}ですか。`, "Gia đình bạn có mấy người?"),
    scene: "👨‍👩‍👧‍👦",
  }),
  mc(`「${r("両親", "りょうしん")}」は どういう いみですか。`, ["Ông bà", "Bố mẹ", "Anh chị em", "Vợ chồng"], 1, "「両親（りょうしん）」 là bố mẹ.", {
    hint: h("Bố mẹ", "両 = hai, 親 = cha mẹ → 両親: bố mẹ.", `${r("両親", "りょうしん")}はベトナムにいます。`, "Bố mẹ tôi ở Việt Nam."),
    scene: "👫",
  }),
  mc("「おばあさん」は だれですか。", ["Cô/dì", "Mẹ", "Bà", "Chị"], 2, "「おばあさん」 là bà; 「おばさん」 (không có âm dài) là cô/dì.", {
    explanationLong: "Chú ý trường âm: おばあさん (bà) ≠ おばさん (cô, dì). Tương tự おじいさん (ông) ≠ おじさん (chú, bác).",
    hint: h("Ông bà", "Gia đình mình: そふ (ông) ・そぼ (bà).", `${r("祖母", "そぼ")}は${r("元気", "げんき")}です。`, "Bà tôi khỏe."),
    scene: "👵",
  }),
  mc("「きょうだいは いますか」 nghĩa là gì?", ["Bạn có con không?", "Bạn có bạn bè không?", "Bạn có bố mẹ không?", "Bạn có anh chị em không?"], 3, "「きょうだい」 là anh chị em.", {
    hint: h("Hỏi về anh chị em", "Trả lời: はい、あにが ひとり います。", "あにが ひとり、いもうとが ふたり います。", "Tôi có một anh trai và hai em gái."),
    scene: "👨‍👩‍👧",
  }),
  sh("Viết cách đọc (hiragana) của chữ 「母」 khi nói về mẹ mình với người khác.", "はは", "「母」 đọc là 「はは」 khi nói về mẹ mình; 「お母さん」 đọc là おかあさん.", { scene: "👩" }),
];

const doAn: BankQ[] = [
  mc(`${r("朝", "あさ")}ごはんに パンを ＿＿＿。`, ["のみます", "たべます", "よみます", "ききます"], 1, "Ăn bánh mì → 「たべます」.", {
    translation: "Tôi ăn bánh mì vào bữa sáng.",
    hint: h("Động từ ăn uống", "たべます: ăn; のみます: uống.", `${r("毎朝", "まいあさ")}ごはんを${r("食", "た")}べます。`, "Mỗi sáng tôi ăn cơm."),
    scene: "🍞",
  }),
  mc("おちゃを ＿＿＿。", ["かきます", "たべます", "のみます", "みます"], 2, "Uống trà → 「のみます」.", {
    translation: "Tôi uống trà.",
    hint: h("Uống", "Đồ uống (おちゃ, みず, コーヒー) đi với のみます.", `コーヒーを${r("飲", "の")}みます。`, "Tôi uống cà phê."),
    scene: "🍵",
  }),
  mc("「さかな」は なんですか。", ["Thịt", "Rau", "Trứng", "Cá"], 3, "「さかな（魚）」 là cá.", {
    hint: h("Thực phẩm", "にく: thịt, やさい: rau, たまご: trứng, さかな: cá.", `${r("魚", "さかな")}が${r("好", "す")}きです。`, "Tôi thích cá."),
    scene: "🐟",
  }),
  mc("「やさい」の いみは？", ["Hoa quả", "Rau", "Gạo", "Nước"], 1, "「やさい（野菜）」 là rau.", {
    explanationLong: "Hoa quả là 「くだもの」, gạo là 「こめ」, nước là 「みず」.",
    hint: h("Rau", "野菜（やさい）= rau củ.", `${r("野菜", "やさい")}を${r("食", "た")}べましょう。`, "Hãy ăn rau nhé."),
    scene: "🥬",
  }),
  mc("これは なんですか。", ["りんご", "みかん", "バナナ", "いちご"], 0, "🍎 là quả táo — 「りんご」.", {
    translation: "Đây là cái gì?",
    hint: h("Hoa quả", "りんご: táo, みかん: quýt, いちご: dâu tây.", "りんごを ふたつ ください。", "Cho tôi hai quả táo."),
    scene: "🍎",
  }),
  mc("「おみずを ください」 nghĩa là gì?", ["Cho tôi xin trà", "Cho tôi xin cơm", "Cho tôi xin nước", "Cho tôi xin đũa"], 2, "「みず」 là nước; 「〜を ください」 = cho tôi xin ~.", {
    hint: h("Gọi món", "N を ください: Cho tôi N.", "ビールを ください。", "Cho tôi bia."),
    scene: "💧",
  }),
  mc("ラーメンは とても ＿＿＿です。", ["あまい", "おいしい", "からい", "まずい"], 1, "Ngon → 「おいしい」.", {
    translation: "Mì ramen rất ngon.",
    explanationLong: "あまい: ngọt, からい: cay, まずい: dở.",
    hint: h("Tính từ vị giác", "おいしい ↔ まずい.", "このすしは おいしいです。", "Món sushi này ngon."),
    scene: "🍜",
  }),
  mc("Trong câu 「はしで ごはんを たべます」, 「はし」 là gì?", ["Cái thìa", "Cái dĩa", "Con dao", "Đôi đũa"], 3, "「はし（箸）」 là đôi đũa; trợ từ で chỉ công cụ.", {
    hint: h("Trợ từ で", "N で V: làm V bằng N (công cụ).", "スプーンで スープを のみます。", "Tôi uống súp bằng thìa."),
    scene: "🥢",
  }),
  sh("Viết cách đọc (hiragana) của từ 「飲み物」 (đồ uống).", "のみもの", "「飲み物」 đọc là 「のみもの」, nghĩa là đồ uống.", { scene: "🥤" }),
];

const teimasu: BankQ[] = [
  mc(`${r("今", "いま")}、${r("雨", "あめ")}が＿＿＿。`, ["ふります", "ふっています", "ふりました", "ふらない"], 1, "Hành động đang diễn ra → 「〜ています」.", {
    translation: "Bây giờ trời đang mưa.",
    hint: h("Đang làm gì", "「Vて + います」 diễn tả hành động đang tiếp diễn.", `${r("今", "いま")}、${r("本", "ほん")}を${r("読", "よ")}んでいます。`, "Bây giờ tôi đang đọc sách."),
    scene: "🌧️",
  }),
  mc(`${r("兄", "あに")}は${r("銀行", "ぎんこう")}で＿＿＿。`, ["はたらいています", "はたらきます", "はたらいた", "はたらこう"], 0, "Nói về công việc hiện tại → 「働いています」.", {
    translation: "Anh trai tôi đang làm việc ở ngân hàng.",
    explanationLong: "「〜ています」 cũng dùng để nói nghề nghiệp, tình trạng kéo dài. 「はたらきます」 chỉ hành động chung chung/tương lai.",
    hint: h("Nghề nghiệp", "Nơi làm việc + で + 働いています.", `${r("父", "ちち")}は${r("病院", "びょういん")}で${r("働", "はたら")}いています。`, "Bố tôi làm việc ở bệnh viện."),
    scene: "🏦",
  }),
  mc(`${r("田中", "たなか")}さんは${r("結婚", "けっこん")}＿＿＿。`, ["します", "しました", "しています", "したい"], 2, "Trạng thái kết quả (đã kết hôn và vẫn đang có gia đình) → 「結婚しています」.", {
    translation: "Anh Tanaka đã lập gia đình.",
    explanationLong: "「結婚しました」 chỉ sự kiện kết hôn trong quá khứ; muốn nói tình trạng hiện tại dùng 「結婚しています」.",
    hint: h("Trạng thái kết quả", "Động từ tức thời (結婚する, 知る, 住む) + ている = trạng thái.", `${r("東京", "とうきょう")}に${r("住", "す")}んでいます。`, "Tôi đang sống ở Tokyo."),
    scene: "💍",
  }),
  mc(`${r("窓", "まど")}が＿＿＿います。`, ["あけて", "あいて", "あけ", "あく"], 1, "Tự động từ 開く + ている → 「開いています」: cửa đang mở.", {
    translation: "Cửa sổ đang mở.",
    explanationLong: "Với trợ từ が và chỉ trạng thái, dùng tự động từ (開く→開いている). 「開けている」 là tha động từ: ai đó đang mở.",
    hint: h("Tự động từ + ている", "Nが + tự động từ て + いる: trạng thái.", `ドアが${r("閉", "し")}まっています。`, "Cửa đang đóng."),
    scene: "🪟",
  }),
  mc(`${r("毎朝", "まいあさ")}ジョギングを＿＿＿。`, ["しています", "していました", "してください", "しましょう"], 0, "Thói quen lặp lại ở hiện tại → 「しています」.", {
    translation: "Mỗi sáng tôi đều chạy bộ.",
    hint: h("Thói quen", "毎日/毎朝 + Vています: thói quen.", `${r("毎日", "まいにち")}${r("日本語", "にほんご")}を${r("勉強", "べんきょう")}しています。`, "Ngày nào tôi cũng học tiếng Nhật."),
    scene: "🏃",
  }),
  mc(`A：${r("山田", "やまだ")}さんの${r("住所", "じゅうしょ")}を＿＿＿か。<br>B：いいえ、${r("知", "し")}りません。`, ["しります", "しっています", "しりました", "しる"], 1, "Hỏi “có biết không” dùng 「知っていますか」; phủ định là 「知りません」.", {
    translation: "A: Bạn có biết địa chỉ của anh Yamada không? B: Không, tôi không biết.",
    hint: h("知っています", "Khẳng định: 知っています; phủ định: 知りません (không dùng 知っていません).", `その${r("話", "はなし")}を${r("知", "し")}っていますか。`, "Bạn có biết chuyện đó không?"),
    scene: "📮",
  }),
  mc(`${r("電気", "でんき")}が＿＿＿。`, ["つけています", "つきます", "ついています", "つけます"], 2, "Đèn đang bật (trạng thái) → tự động từ つく + ている.", {
    translation: "Đèn đang bật.",
    hint: h("つく・つける", "つく (tự động từ) ↔ つける (tha động từ).", `${r("電気", "でんき")}をつけてください。`, "Hãy bật đèn lên."),
    scene: "💡",
  }),
  mc(`${r("子供", "こども")}たちは${r("公園", "こうえん")}で＿＿＿。`, ["あそべます", "あそびます", "あそびました", "あそんでいます"], 3, "Hành động đang diễn ra → 「遊んでいます」.", {
    translation: "Lũ trẻ đang chơi ở công viên.",
    hint: h("Thể て của 遊ぶ", "Động từ đuôi ぶ → んで: 遊ぶ → 遊んで.", `${r("友", "とも")}だちと${r("遊", "あそ")}んでいます。`, "Tôi đang chơi với bạn."),
    scene: "🛝",
  }),
  sh("Chia động từ 「食べる」 sang thể 〜ています (thể lịch sự).", "食べています | たべています", "Động từ nhóm 2: bỏ る thêm て → 食べて + います.", {
    hint: h("Thể て nhóm 2", "Bỏ る + て: 見る → 見て, 寝る → 寝て.", `${r("今", "いま")}、テレビを${r("見", "み")}ています。`, "Bây giờ tôi đang xem tivi."),
    scene: "🍱",
  }),
];

const congViec: BankQ[] = [
  mc(`${r("父", "ちち")}は${r("会社", "かいしゃ")}に＿＿＿います。`, ["つとめて", "はたらいて", "すんで", "いって"], 0, "「会社に勤めています」: làm việc cho công ty (trợ từ に).", {
    translation: "Bố tôi làm việc cho một công ty.",
    explanationLong: "「働いています」 đi với trợ từ で (会社で働いています). 「住んで」 là sống, 「行って」 là đi.",
    hint: h("勤める・働く", "会社に勤める / 会社で働く.", `${r("銀行", "ぎんこう")}に${r("勤", "つと")}めています。`, "Tôi làm việc ở ngân hàng."),
    scene: "🏢",
  }),
  mc(`「${r("会議", "かいぎ")}」の いみは？`, ["Hợp đồng", "Cuộc họp", "Tiền lương", "Nghỉ phép"], 1, "「会議（かいぎ）」 là cuộc họp.", {
    hint: h("Từ vựng văn phòng", "会議: họp, 契約: hợp đồng, 給料: lương.", `${r("三時", "さんじ")}から${r("会議", "かいぎ")}があります。`, "Từ 3 giờ có cuộc họp."),
    scene: "📊",
  }),
  mc(`「${r("給料", "きゅうりょう")}」の いみは？`, ["Tiền thưởng", "Thuế", "Phí", "Tiền lương"], 3, "「給料（きゅうりょう）」 là tiền lương.", {
    explanationLong: "Tiền thưởng là 「ボーナス」, thuế là 「税金」.",
    hint: h("Lương", "給料日: ngày nhận lương.", `${r("給料", "きゅうりょう")}は${r("毎月", "まいつき")}25${r("日", "にち")}です。`, "Lương trả vào ngày 25 hằng tháng."),
    scene: "💴",
  }),
  mc(`${r("仕事", "しごと")}が${r("多", "おお")}くて、${r("毎日", "まいにち")}＿＿＿しています。`, ["ざんぎょう", "しゅっちょう", "ちこく", "るす"], 0, "「残業（ざんぎょう）」: làm thêm giờ.", {
    translation: "Việc nhiều nên ngày nào tôi cũng phải làm thêm giờ.",
    hint: h("残業", "残業する: tăng ca.", `${r("今日", "きょう")}は${r("残業", "ざんぎょう")}しません。`, "Hôm nay tôi không tăng ca."),
    scene: "🌙",
  }),
  mc(`${r("来週", "らいしゅう")}、${r("大阪", "おおさか")}へ＿＿＿に${r("行", "い")}きます。`, ["ざんぎょう", "しゅっちょう", "けんがく", "よやく"], 1, "「出張（しゅっちょう）」: đi công tác.", {
    translation: "Tuần sau tôi đi công tác Osaka.",
    hint: h("出張", "出張に行く: đi công tác.", `${r("部長", "ぶちょう")}は${r("出張", "しゅっちょう")}中です。`, "Trưởng phòng đang đi công tác."),
    scene: "🧳",
  }),
  mc("Nghề “kỹ sư” tiếng Nhật là gì?", ["いしゃ", "かんごし", "べんごし", "エンジニア"], 3, "Kỹ sư: 「エンジニア」 (hoặc 技術者).", {
    explanationLong: "いしゃ: bác sĩ, かんごし: y tá, べんごし: luật sư.",
    hint: h("Nghề nghiệp", "Nhiều nghề dùng từ ngoại lai: エンジニア, デザイナー.", "わたしは エンジニアです。", "Tôi là kỹ sư."),
    scene: "👷",
  }),
  mc(`${r("電車", "でんしゃ")}が${r("遅", "おく")}れて、${r("会社", "かいしゃ")}に＿＿＿しました。`, ["けっせき", "ちこく", "そうたい", "しゅっせき"], 1, "「遅刻（ちこく）」: đến muộn.", {
    translation: "Tàu bị trễ nên tôi đến công ty muộn.",
    explanationLong: "けっせき: vắng mặt, そうたい: về sớm, しゅっせき: có mặt.",
    hint: h("遅刻", "遅刻する: đi muộn.", `${r("寝坊", "ねぼう")}して${r("遅刻", "ちこく")}しました。`, "Tôi ngủ quên nên đến muộn."),
    scene: "⏰",
  }),
  mc(`「${r("部長", "ぶちょう")}」は だれですか。`, ["Trưởng phòng", "Giám đốc", "Nhân viên mới", "Đồng nghiệp"], 0, "「部長（ぶちょう）」 là trưởng phòng/trưởng bộ phận.", {
    explanationLong: "Giám đốc: 社長（しゃちょう）, nhân viên mới: 新入社員, đồng nghiệp: 同僚（どうりょう）.",
    hint: h("Chức danh", "社長 > 部長 > 課長.", `${r("部長", "ぶちょう")}に${r("報告", "ほうこく")}します。`, "Tôi báo cáo với trưởng phòng."),
    scene: "👔",
  }),
  sh("Viết cách đọc (hiragana) của từ 「会社員」 (nhân viên công ty).", "かいしゃいん", "「会社員」 đọc là 「かいしゃいん」.", { scene: "🧑‍💼" }),
];

const duLich: BankQ[] = [
  mc("ホテルの部屋を＿＿＿しておきました。", ["予約", "予定", "約束", "準備"], 0, "「予約（よやく）」: đặt trước (phòng, vé, bàn).", {
    translation: "Tôi đã đặt phòng khách sạn sẵn.",
    explanationLong: "予定: dự định, 約束: hẹn/hứa, 準備: chuẩn bị — không đi với 部屋を～する theo nghĩa đặt phòng.",
    hint: h("予約", "部屋・席・チケットを予約する.", "レストランを予約しました。", "Tôi đã đặt bàn ở nhà hàng."),
    scene: "🏨",
  }),
  mc("空港で＿＿＿を見せてください。", ["切符", "パスポート", "名刺", "地図"], 1, "Ở sân bay cần xuất trình hộ chiếu 「パスポート」.", {
    translation: "Vui lòng xuất trình hộ chiếu ở sân bay.",
    hint: h("Sân bay", "搭乗券: thẻ lên máy bay; 出国: xuất cảnh.", "パスポートを忘れないでください。", "Đừng quên hộ chiếu nhé."),
    scene: "🛂",
  }),
  mc("「観光地」の意味は？", ["Nhà ga", "Trạm xe buýt", "Khu du lịch / danh lam", "Khách sạn"], 2, "「観光地（かんこうち）」 là địa điểm du lịch.", {
    hint: h("観光", "観光 = tham quan; 観光客 = khách du lịch.", "京都は有名な観光地です。", "Kyoto là địa điểm du lịch nổi tiếng."),
    scene: "🏯",
  }),
  mc("旅行の＿＿＿に写真をたくさん撮りました。", ["記念", "記録", "記事", "記憶"], 0, "「記念（きねん）に」: để làm kỷ niệm.", {
    translation: "Tôi đã chụp nhiều ảnh để làm kỷ niệm chuyến đi.",
    explanationLong: "記録: ghi chép, 記事: bài báo, 記憶: trí nhớ.",
    hint: h("記念", "記念写真: ảnh kỷ niệm.", "卒業の記念に時計をもらいました。", "Tôi được tặng đồng hồ làm kỷ niệm tốt nghiệp."),
    scene: "📸",
  }),
  mc("電車の中に傘を＿＿＿しまいました。", ["落ちて", "忘れて", "なくて", "残って"], 1, "「忘れてしまいました」: lỡ để quên mất.", {
    translation: "Tôi lỡ để quên ô trên tàu.",
    hint: h("忘れ物", "忘れ物: đồ để quên.", "財布を家に忘れてしまいました。", "Tôi lỡ quên ví ở nhà."),
    scene: "☂️",
  }),
  mc("この町は古いお寺が多くて、＿＿＿がたくさん来ます。", ["乗客", "店員", "観光客", "旅館"], 2, "「観光客（かんこうきゃく）」: khách du lịch.", {
    translation: "Thị trấn này có nhiều chùa cổ nên rất nhiều khách du lịch đến.",
    hint: h("〜客", "観光客・乗客 (hành khách)・お客様.", "外国人の観光客が増えています。", "Khách du lịch nước ngoài đang tăng."),
    scene: "⛩️",
  }),
  mc("「往復」の意味は？", ["Một chiều", "Chuyển tàu", "Tàu nhanh", "Khứ hồi"], 3, "「往復（おうふく）」 là khứ hồi; một chiều là 「片道（かたみち）」.", {
    hint: h("Vé tàu", "往復切符: vé khứ hồi; 片道: một chiều.", "大阪まで往復でいくらですか。", "Khứ hồi đến Osaka bao nhiêu tiền?"),
    scene: "🎫",
  }),
  mc("ホテルに着いたら、まずフロントで＿＿＿をします。", ["チェックイン", "チェックアウト", "キャンセル", "サービス"], 0, "Đến khách sạn thì làm thủ tục nhận phòng 「チェックイン」.", {
    translation: "Khi đến khách sạn, trước tiên làm thủ tục nhận phòng ở quầy lễ tân.",
    hint: h("Khách sạn", "チェックイン ↔ チェックアウト.", "チェックアウトは11時までです。", "Trả phòng trước 11 giờ."),
    scene: "🛎️",
  }),
];

const chaoHoi: BankQ[] = [
  mc("初めて会った人に言う挨拶は？", ["お久しぶりです", "はじめまして", "お疲れ様です", "いただきます"], 1, "Gặp lần đầu nói 「はじめまして」.", {
    hint: h("Lần đầu gặp", "はじめまして → tên → どうぞよろしくお願いします.", "はじめまして、リンです。どうぞよろしく。", "Rất vui được gặp, tôi là Linh."),
    scene: "🤝",
  }),
  mc("久しぶりに友達に会いました。何と言いますか。", ["はじめまして", "おやすみなさい", "お久しぶりです", "ごちそうさま"], 2, "Lâu ngày gặp lại: 「お久しぶりです」.", {
    hint: h("Gặp lại", "Thân mật: 久しぶり！", "久しぶり！元気だった？", "Lâu quá! Khỏe không?"),
    scene: "👋",
  }),
  mc("会社で先に帰る時、同僚に言う言葉は？", ["お先に失礼します", "いってきます", "ただいま", "お邪魔します"], 0, "Về trước đồng nghiệp: 「お先に失礼します」.", {
    explanationLong: "いってきます: khi rời nhà/văn phòng nhưng sẽ quay lại; ただいま: khi về đến nhà; お邪魔します: khi vào nhà người khác.",
    hint: h("Chào ở công ty", "Người về trước: お先に失礼します; người ở lại: お疲れ様でした.", "では、お先に失礼します。", "Vậy tôi xin phép về trước."),
    scene: "🏢",
  }),
  mc("同僚が先に帰る時に言う言葉は？", ["お先に失礼します", "お疲れ様でした", "いってらっしゃい", "おかえりなさい"], 1, "Đáp lại người về trước: 「お疲れ様でした」.", {
    hint: h("お疲れ様", "Lời cảm ơn công sức, dùng nhiều nơi công sở.", "今日も一日お疲れ様でした。", "Hôm nay vất vả rồi."),
    scene: "🙇",
  }),
  mc("人の家に入る時、何と言いますか。", ["失礼しました", "ただいま", "お邪魔します", "よろしく"], 2, "Vào nhà người khác: 「お邪魔します」.", {
    hint: h("Thăm nhà", "Vào: お邪魔します; ra về: お邪魔しました.", "どうぞ、上がってください。—お邪魔します。", "Mời vào. — Tôi xin phép."),
    scene: "🏠",
  }),
  mc("「これからよろしくお願いします」はどんな時に使いますか。", ["Khi chia tay", "Khi xin lỗi", "Khi cảm ơn bữa ăn", "Khi bắt đầu một mối quan hệ, mong được giúp đỡ"], 3, "Dùng khi bắt đầu làm quen/hợp tác, mong được giúp đỡ.", {
    hint: h("よろしく", "Câu kết khi tự giới thiệu.", "これからよろしくお願いします。", "Từ nay mong được giúp đỡ."),
    scene: "🌸",
  }),
  mc("A：お元気ですか。<br>B：はい、＿＿＿。", ["おかげさまで", "すみません", "どういたしまして", "いただきます"], 0, "「おかげさまで」: nhờ trời/nhờ anh chị (tôi vẫn khỏe).", {
    translation: "A: Anh có khỏe không? B: Vâng, nhờ trời tôi khỏe.",
    hint: h("おかげさまで", "Đáp lại lời hỏi thăm một cách lịch sự.", "おかげさまで、元気です。", "Nhờ trời tôi khỏe."),
    scene: "😊",
  }),
  es(
    "Viết đoạn tự giới thiệu 3–4 câu bằng tiếng Nhật (tên, quê quán, công việc/học tập, sở thích).",
    "はじめまして。グエン・ミン・アンと申します。ベトナムのハノイから来ました。今、大学で日本語を勉強しています。趣味は旅行と料理です。どうぞよろしくお願いします。",
    "Tiêu chí chấm: mở đầu はじめまして; giới thiệu tên (〜と申します／〜です); quê quán (〜から来ました); công việc hoặc việc học; sở thích; kết thúc どうぞよろしくお願いします; ngữ pháp đúng, văn phong lịch sự.",
    5,
    { scene: "🙋" },
  ),
];

const LISTEN_OPTS = [
  `${r("図書館", "としょかん")}に　${r("行", "い")}きます。`,
  `${r("図書館", "としょかん")}で　${r("勉強", "べんきょう")}します。`,
  `${r("図書館", "としょかん")}へ　${r("行", "い")}きました。`,
  `${r("図書館", "としょかん")}と　${r("行", "い")}きます。`,
];

const hoiThoai: BankQ[] = [
  mc("Nghe và chọn câu trả lời đúng của người đàn ông.", LISTEN_OPTS, 1, "Người đàn ông nói 「図書館で勉強します」 — học ở thư viện.", {
    audioText: "女：明日はどこで勉強しますか。 男：図書館で勉強します。",
    explanationLong: "Câu hỏi どこで (ở đâu làm gì) nên câu trả lời dùng trợ từ で chỉ nơi diễn ra hành động.",
    hint: h("Trợ từ で", "Nơi chốn + で + hành động.", `${r("家", "いえ")}で${r("勉強", "べんきょう")}します。`, "Tôi học ở nhà."),
    scene: "📚",
  }),
  mc("Bây giờ là mấy giờ?", ["3時", "3時半", "4時", "4時半"], 1, "Người phụ nữ nói 「3時半です」.", {
    audioText: "男：すみません、今何時ですか。 女：3時半です。 男：ありがとうございます。",
    scene: "🕒",
  }),
  mc("Chủ nhật người đàn ông đã làm gì?", ["Xem phim", "Đi mua sắm", "Dọn dẹp nhà", "Gặp bạn"], 2, "「日曜日は家で掃除をしました」 — chủ nhật dọn dẹp nhà.", {
    audioText: "女：週末、何をしましたか。 男：土曜日は映画を見ました。日曜日は家で掃除をしました。",
    explanationLong: "Xem phim là việc của thứ bảy, không phải chủ nhật.",
    scene: "🧹",
  }),
  mc("Người phụ nữ gọi gì?", ["Cà phê có đường", "Cà phê không đường", "Trà", "Nước cam"], 1, "「コーヒーをお願いします。砂糖はいりません」 — cà phê không đường.", {
    audioText: "男：飲み物は何にしますか。 女：コーヒーをお願いします。砂糖はいりません。",
    scene: "☕",
  }),
  mc("Người phụ nữ phải đến phòng họp lúc mấy giờ?", ["10時", "10時半", "9時", "9時半"], 3, "Họp lúc 10 giờ nhưng phải đến phòng họp lúc 9 giờ rưỡi.", {
    audioText: "女：田中さん、明日の会議は何時からですか。 男：10時からです。でも、9時半に会議室に来てください。",
    explanationLong: "Bẫy: 10時 là giờ bắt đầu họp; câu hỏi là giờ phải có mặt (9時半).",
    scene: "🗓️",
  }),
  mc("Người phụ nữ đi đến ga bằng gì?", ["Đi bộ", "Xe đạp", "Taxi", "Xe buýt"], 3, "「バスで行きます」 vì đi bộ mất 30 phút.", {
    audioText: "男：駅までどうやって行きますか。 女：バスで行きます。歩くと30分かかりますから。",
    scene: "🚌",
  }),
  mc("Tại sao hôm qua người đàn ông nghỉ học?", ["Vì bị sốt", "Vì bận việc", "Vì ngủ quên", "Vì đi du lịch"], 0, "「熱があったんです」 — vì bị sốt.", {
    audioText: "女：昨日はどうして学校を休んだんですか。 男：熱があったんです。今日はもう大丈夫です。",
    scene: "🤒",
  }),
  mc("Người đàn ông nên đặt hành lý ở đâu?", ["Trên bàn", "Dưới ghế", "Dưới bàn", "Trên ghế"], 1, "「机の上じゃなくて、いすの下に」 — dưới ghế.", {
    audioText: "男：この荷物、どこに置きましょうか。 女：机の上じゃなくて、いすの下に置いてください。",
    explanationLong: "「AじゃなくてB」: không phải A mà là B.",
    scene: "📦",
  }),
];

const kanjiN3: BankQ[] = [
  mc("「経験」の読み方は？", ["けいけん", "きょうけん", "けいげん", "きょうげん"], 0, "「経験」 đọc là けいけん (kinh nghiệm).", {
    hint: h("経", "経: けい (経験, 経済).", "海外で働いた経験があります。", "Tôi có kinh nghiệm làm việc ở nước ngoài."),
  }),
  mc("「記録」の読み方は？", ["きりょく", "きろく", "けろく", "きろぐ"], 1, "「記録」 đọc là きろく (ghi chép, kỷ lục).", {
    hint: h("録", "録: ろく (記録, 録音).", "世界記録を破りました。", "Đã phá kỷ lục thế giới."),
  }),
  mc("「たいせつ」を漢字で書くと？", ["代切", "対切", "大切", "大接"], 2, "「たいせつ」 viết là 大切 (quan trọng).", {
    hint: h("大切", "大 (lớn) + 切.", "大切な思い出です。", "Đó là kỷ niệm quý giá."),
  }),
  mc("「増える」の読み方は？", ["ふえる", "へえる", "まえる", "こえる"], 0, "「増える」 đọc là ふえる (tăng lên).", {
    hint: h("増", "増える (tự) ↔ 増やす (tha).", "外国人観光客が増えています。", "Khách du lịch nước ngoài đang tăng."),
  }),
  mc("「必要」の読み方は？", ["ひっよう", "ひちよう", "ひつよ", "ひつよう"], 3, "「必要」 đọc là ひつよう (cần thiết).", {
    hint: h("必", "必: ひつ (必要), かなら(ず).", "パスポートが必要です。", "Cần hộ chiếu."),
  }),
  mc("「せつめい」を漢字で書くと？", ["設明", "説明", "説名", "接明"], 1, "「せつめい」 viết là 説明 (giải thích).", {
    hint: h("説", "説: せつ (説明, 小説).", "使い方を説明してください。", "Hãy giải thích cách dùng."),
  }),
  mc("「到着」の意味は？", ["Khởi hành", "Đến nơi", "Chuyển tiếp", "Trì hoãn"], 1, "「到着（とうちゃく）」 là đến nơi; khởi hành là 出発.", {
    hint: h("到着", "到着時刻: giờ đến.", "飛行機は10時に到着します。", "Máy bay đến lúc 10 giờ."),
  }),
  sh("Viết cách đọc (hiragana) của 「経済」.", "けいざい", "「経済」 đọc là けいざい (kinh tế)."),
  sh("Viết cách đọc (hiragana) của 「届ける」.", "とどける", "「届ける」 đọc là とどける (gửi đến, giao)."),
];

const youNiSuru: BankQ[] = [
  mc("健康のために、毎日野菜を食べる＿＿＿しています。", ["ように", "ために", "ことで", "そうに"], 0, "「Vるようにしている」: cố gắng duy trì thói quen.", {
    translation: "Vì sức khỏe, tôi cố gắng ăn rau mỗi ngày.",
    explanationLong: "「ために」 không kết hợp với する theo nghĩa này, 「ことで」 là “bằng cách”, 「そうに」 là “có vẻ” — đều không tạo thành mẫu cố gắng duy trì thói quen.",
    hint: h("〜ようにする", "Cố gắng (nỗ lực có ý thức) để làm/không làm gì.", "毎朝早く起きるようにしています。", "Tôi cố gắng dậy sớm mỗi sáng."),
  }),
  mc("授業に遅れない＿＿＿、早く家を出た。", ["ために", "ことで", "ように", "ほど"], 2, "Sau động từ phủ định/không chủ ý dùng 「ように」 để chỉ mục đích.", {
    translation: "Để không bị muộn giờ học, tôi đã ra khỏi nhà sớm.",
    explanationLong: "「ために」 chỉ mục đích đi với động từ ý chí ở thể khẳng định (合格するために). Với 遅れない (không chủ ý) phải dùng ように.",
    hint: h("ように vs ために", "ように + động từ không ý chí / phủ định / khả năng.", "忘れないようにメモします。", "Tôi ghi chú để không quên."),
  }),
  mc("最近、甘い物はなるべく食べない＿＿＿。", ["ことになっている", "ようにしている", "ようになった", "はずだ"], 1, "「食べないようにしている」: cố gắng không ăn.", {
    translation: "Dạo này tôi cố gắng hạn chế ăn đồ ngọt.",
    explanationLong: "「ことになっている」 là quy định khách quan; 「ようになった」 là sự thay đổi; 「はずだ」 là suy đoán.",
    hint: h("なるべく〜ないようにする", "Cố gắng hết mức để không ~.", "夜遅く食べないようにしています。", "Tôi cố không ăn khuya."),
  }),
  mc("日本に来て一年、やっと日本語で夢を見る＿＿＿。", ["ようにした", "ことにした", "ことになった", "ようになった"], 3, "Thay đổi tự nhiên theo thời gian → 「ようになった」.", {
    translation: "Đến Nhật một năm, cuối cùng tôi đã mơ bằng tiếng Nhật.",
    explanationLong: "Mơ không phải hành động có chủ ý nên không dùng ようにした/ことにした.",
    hint: h("〜ようになる", "Diễn tả sự thay đổi trạng thái/khả năng.", "漢字が読めるようになりました。", "Tôi đã đọc được Kanji."),
  }),
  mc("明日の会議には必ず出席する＿＿＿してください。", ["ように", "ことに", "ために", "ところに"], 0, "「〜ようにしてください」: hãy cố gắng/nhớ làm ~.", {
    translation: "Hãy nhớ nhất định tham dự cuộc họp ngày mai.",
    hint: h("〜ようにしてください", "Yêu cầu lịch sự người nghe chú ý thực hiện.", "遅れないようにしてください。", "Xin đừng đến muộn."),
  }),
  mc("風邪をひかない＿＿＿、手洗いとうがいを心がけています。", ["ためか", "ように", "ことだから", "ばかりに"], 1, "Mục đích phủ định không chủ ý → 「ひかないように」.", {
    translation: "Tôi chú ý rửa tay và súc miệng để không bị cảm.",
    hint: h("ように (mục đích)", "Vない + ように: để không ~.", "転ばないように気をつけて。", "Cẩn thận kẻo ngã nhé."),
  }),
  mc("「ようにする」の使い方が正しい文はどれですか。", ["来年、日本へ留学するようにしました。", "毎朝6時に起きるようにしています。", "明日は雨が降るようにしています。", "彼はもう来るようにしました。"], 1, "Chỉ câu 2 diễn tả nỗ lực duy trì thói quen của bản thân.", {
    explanationLong: "Câu 1 là quyết định → ことにしました. Câu 3, 4: thời tiết và hành động người khác không thể “cố gắng” bởi người nói.",
    hint: h("Chủ thể của ようにする", "Chủ thể phải tự kiểm soát được hành động.", "毎日30分歩くようにしています。", "Tôi cố gắng đi bộ 30 phút mỗi ngày."),
  }),
  es(
    "Đặt 2 câu tiếng Nhật với mẫu 「〜ようにしている」 nói về thói quen bạn đang cố gắng duy trì.",
    "毎日寝る前に日本語の単語を10個覚えるようにしています。健康のために、エレベーターではなく階段を使うようにしています。",
    "Tiêu chí chấm: đủ 2 câu; dùng đúng Vる／Vない + ようにしている; nội dung là thói quen của bản thân; chia động từ và trợ từ chính xác; câu tự nhiên.",
    4,
  ),
];



const tinTuc: BankQ[] = [
  mc("Bản tin chủ yếu nói về điều gì?", ["Động đất ở Tokyo", "Mưa lớn khiến một số tàu tạm ngừng chạy", "Tai nạn giao thông", "Lễ hội mùa hè"], 1, "Bản tin nói mưa lớn làm một số tàu tạm ngừng (運転を見合わせています).", {
    audioText: "今日の午後、東京都内で大雨が降り、一部の電車が運転を見合わせています。気象庁は、夜にかけて雷にも注意するよう呼びかけています。",
    explanationLong: "「運転を見合わせる」 = tạm ngừng chạy. Bản tin còn nhắc chú ý sấm sét vào buổi tối.",
    scene: "🌧️",
  }),
  mc("Từ tháng sau, giá vé xe buýt người lớn là bao nhiêu?", ["210円", "220円", "230円", "250円"], 2, "Giá vé người lớn tăng từ 210 lên 230 yên.", {
    audioText: "来月から、市内のバス料金が大人210円から230円に値上げされます。子どもの料金は変わりません。",
    scene: "🚌",
  }),
  mc("Điểm đến được ưa chuộng nhất là đâu?", ["Hàn Quốc", "Hawaii", "Đài Loan", "Việt Nam"], 0, "Thứ tự được ưa chuộng: Hàn Quốc, Đài Loan, Hawaii.", {
    audioText: "今年の夏休みに海外旅行をする人は、去年より15パーセント増える見込みです。人気の行き先は韓国、台湾、ハワイの順です。",
    scene: "✈️",
  }),
  mc("Nội dung nào đúng với bản tin?", ["Có 3 người bị thương", "3 cửa hàng bị cháy, không ai bị thương", "Đã biết rõ nguyên nhân", "Vụ cháy xảy ra sáng nay"], 1, "「けが人はいませんでしたが、店三軒が焼けました」.", {
    audioText: "昨夜、駅前の商店街で火事がありました。けが人はいませんでしたが、店三軒が焼けました。原因は現在調査中です。",
    explanationLong: "Vụ cháy xảy ra tối qua (昨夜), nguyên nhân đang điều tra (調査中).",
    scene: "🔥",
  }),
  mc("Chính sách mới hỗ trợ ai?", ["Người cao tuổi", "Sinh viên quốc tế", "Người cha nghỉ chăm con", "Doanh nghiệp nhỏ"], 2, "「育児休業を取る父親を支援する」 — hỗ trợ người cha nghỉ chăm con.", {
    audioText: "政府は、来年4月から育児休業を取る父親を支援する新しい制度を始めると発表しました。",
    scene: "👨‍🍼",
  }),
  mc("Vì sao một số khu trượt tuyết hoãn mở cửa?", ["Vì thiếu tuyết do trời ấm", "Vì quá nhiều khách", "Vì bão tuyết", "Vì thiếu nhân viên"], 0, "Nhiệt độ cao hơn mọi năm nên thiếu tuyết (雪不足).", {
    audioText: "この冬は例年より気温が高く、スキー場では雪不足のため、オープンを延期するところが出ています。",
    scene: "⛷️",
  }),
  mc("Trong thời gian đóng cửa, có thể trả sách ở đâu?", ["Thư viện trường", "Bưu điện", "Không thể trả sách", "Quầy tạm thời trước nhà ga"], 3, "「駅前の臨時窓口で本の返却ができます」.", {
    audioText: "市の図書館は、来週の月曜日から改装工事のため、二か月間休館します。期間中は駅前の臨時窓口で本の返却ができます。",
    scene: "📚",
  }),
  mc("Lý do chính khiến giới trẻ bỏ bữa sáng là gì?", ["Ăn kiêng", "Bận, không có thời gian", "Không thích ăn sáng", "Giá thực phẩm tăng"], 1, "「忙しくて時間がないというのが主な理由です」.", {
    audioText: "新しい調査によると、朝食を毎日食べる若者の割合は、10年前に比べて減っています。忙しくて時間がないというのが主な理由です。",
    scene: "🍳",
  }),
];

const gaTau: BankQ[] = [
  mc("Tàu sắp đến ở đường ray số mấy?", ["1番線", "2番線", "3番線", "4番線"], 1, "「まもなく、2番線に…参ります」.", {
    audioText: "まもなく、2番線に東京行きの快速電車が参ります。危ないですから、黄色い線の内側までお下がりください。",
    explanationLong: "「参ります」 là khiêm nhường ngữ của 来ます, thường dùng trong thông báo nhà ga.",
    scene: "🚉",
  }),
  mc("Chuyến tàu tiếp theo đi Kyoto xuất phát lúc mấy giờ?", ["10時", "10時5分", "10時15分", "10時50分"], 2, "「次は10時15分発です」.", {
    audioText: "男：すみません、京都へ行きたいんですが、どの電車に乗ればいいですか。 女：3番線の新幹線に乗ってください。次は10時15分発です。",
    scene: "🚄",
  }),
  mc("Tuyến Chuo đang trong tình trạng nào?", ["Chạy bình thường", "Chạy chậm do mưa", "Đã đổi sân ga", "Tạm ngừng chạy do sự cố"], 3, "「人身事故の影響で…運転を見合わせております」.", {
    audioText: "ただいま、人身事故の影響で、中央線は運転を見合わせております。お急ぎのところ、ご迷惑をおかけして申し訳ございません。",
    scene: "⚠️",
  }),
  mc("Người phụ nữ cần làm gì?", ["Mua vé mới hoàn toàn", "Trả thêm 30 yên ở máy điều chỉnh vé", "Xuống tàu ở Shibuya", "Đổi sang tàu nhanh"], 1, "Vé chỉ đến Shibuya, cần trả thêm 30 yên ở máy 精算機.", {
    audioText: "女：この切符で新宿まで行けますか。 男：いいえ、この切符は渋谷までです。新宿までなら、あと30円必要ですので、精算機で精算してください。",
    scene: "🎫",
  }),
  mc("Cửa ra ở phía nào?", ["Bên trái", "Cả hai bên", "Bên phải", "Phía trước"], 2, "「お出口は右側です」.", {
    audioText: "次は新大阪、新大阪です。お出口は右側です。お忘れ物のないようご注意ください。",
    scene: "🚪",
  }),
  mc("Người đàn ông muốn xuống ở ga kế tiếp nên đi tàu nào?", ["Tàu tốc hành", "Shinkansen", "Xe buýt", "Tàu dừng mọi ga"], 3, "Tàu tốc hành không dừng ga kế tiếp nên phải đi tàu 各駅停車.", {
    audioText: "男：急行と各駅停車、どちらが早く着きますか。 女：急行は次の駅には止まらないので、各駅停車に乗って、次の駅で降りてください。",
    scene: "🚃",
  }),
  mc("Tủ gửi đồ ở đâu?", ["Ra cửa soát vé rẽ trái", "Ra cửa soát vé rẽ phải", "Trong sân ga", "Cạnh quầy bán vé"], 0, "「改札を出て、左に曲がったところ」.", {
    audioText: "女：すみません、コインロッカーはどこですか。 男：改札を出て、左に曲がったところにあります。",
    scene: "🔐",
  }),
  mc("Tàu dự kiến đến trễ bao lâu?", ["10分", "15分", "20分", "30分"], 2, "「到着が20分ほど遅れる見込みです」.", {
    audioText: "本日は強風のため、新幹線は速度を落として運転しております。到着が20分ほど遅れる見込みです。",
    scene: "💨",
  }),
];

const muaSam: BankQ[] = [
  mc("すみません、これは＿＿＿ですか。", ["いくら", "いくつ", "どこ", "だれ"], 0, "Hỏi giá dùng 「いくら」.", {
    translation: "Xin lỗi, cái này bao nhiêu tiền?",
    explanationLong: "「いくつ」 hỏi số lượng/tuổi, 「どこ」 hỏi nơi chốn, 「だれ」 hỏi người.",
    hint: h("Hỏi giá", "これは いくらですか。", "この かばんは いくらですか。", "Cái túi này bao nhiêu tiền?"),
    scene: "🏷️",
  }),
  mc(`${r("店員", "てんいん")}：「いらっしゃいませ。」 Câu này nghĩa là gì?`, ["Cảm ơn quý khách", "Xin chào quý khách / mời vào", "Xin lỗi", "Tạm biệt"], 1, "「いらっしゃいませ」: lời chào khách khi vào cửa hàng.", {
    hint: h("Lời chào ở cửa hàng", "Khi khách ra về: ありがとうございました.", "いらっしゃいませ。なにを おさがしですか。", "Xin chào quý khách, quý khách tìm gì ạ?"),
    scene: "🏪",
  }),
  mc(`この${r("赤", "あか")}いシャツを＿＿＿。`, ["あります", "います", "ください", "します"], 2, "Muốn mua: 「〜を ください」.", {
    translation: "Cho tôi cái áo đỏ này.",
    hint: h("Mua hàng", "N を ください: cho tôi N.", "これを ふたつ ください。", "Cho tôi hai cái này."),
    scene: "👕",
  }),
  mc("Bạn muốn mặc thử áo. Bạn nói:", [`${r("着", "き")}てみてもいいですか。`, `${r("買", "か")}ってもいいですか。`, `${r("食", "た")}べてもいいですか。`, `${r("見", "み")}せてください。`], 0, "「着てみてもいいですか」: tôi mặc thử được không?", {
    explanationLong: "「〜てみる」: thử làm; 「〜てもいいですか」: xin phép.",
    hint: h("Xin phép", "Vて + も いいですか: tôi ~ được không?", "しちゃくしつを つかっても いいですか。", "Tôi dùng phòng thử đồ được không?"),
    scene: "🪞",
  }),
  mc(`もう${r("少", "すこ")}し＿＿＿のは ありますか。`, ["たかい", "おもい", "ふるい", "やすい"], 3, "Hỏi cái rẻ hơn: 「もう少し安いのはありますか」.", {
    translation: "Có cái nào rẻ hơn một chút không?",
    hint: h("もう少し", "もう少し + tính từ: ~ hơn một chút.", "もう すこし おおきいのは ありますか。", "Có cái lớn hơn một chút không?"),
    scene: "💸",
  }),
  mc(`${r("全部", "ぜんぶ")}で 1,500${r("円", "えん")}です。 — 「1,500円」の よみかたは？`, ["せんごひゃくえん", "いっせんごひゃくえん", "せんごせんえん", "ひゃくごじゅうえん"], 0, "1,500 = せん ごひゃく → せんごひゃくえん.", {
    hint: h("Số đếm", "1000: せん (không nói いっせん khi đứng đầu), 500: ごひゃく.", "3,800えん: さんぜん はっぴゃく えん", "3.800 yên"),
    scene: "💴",
  }),
  mc("カードで＿＿＿か。", ["はらいます", "はらえます", "はらいました", "はらって"], 1, "Hỏi khả năng: 「払えますか」 (trả được không?).", {
    translation: "Có trả bằng thẻ được không?",
    hint: h("Thể khả năng", "はらう → はらえる.", "ここで カードが つかえますか。", "Ở đây dùng thẻ được không?"),
    scene: "💳",
  }),
  mc(`${r("袋", "ふくろ")}は いりますか。 —「いいえ、＿＿＿。」`, ["ありません", "いません", "いりません", "しません"], 2, "Không cần: 「いりません」.", {
    translation: "Anh/chị có cần túi không? — Không, tôi không cần.",
    hint: h("いる (cần)", "いります ↔ いりません.", "レシートは いりません。", "Tôi không cần hóa đơn."),
    scene: "🛍️",
  }),
  sh("Dịch sang tiếng Nhật: 「Cái này bao nhiêu tiền?」", "これはいくらですか | これ、いくらですか", "Mẫu câu hỏi giá: 「これは いくらですか」.", { scene: "🏷️" }),
];

const kanjiThoiGian: BankQ[] = [
  mc("「<u>九月</u>」の よみかたは？", ["きゅうがつ", "くがつ", "くつき", "きゅうげつ"], 1, "Tháng 9 đọc là くがつ (không phải きゅうがつ).", {
    hint: h("Tên tháng", "4月 しがつ, 7月 しちがつ, 9月 くがつ.", `${r("九月", "くがつ")}に${r("日本", "にほん")}へ${r("行", "い")}きます。`, "Tháng 9 tôi đi Nhật."),
    scene: "🍁",
  }),
  mc("「<u>四時</u>」の よみかたは？", ["よんじ", "しじ", "よじ", "よっじ"], 2, "4 giờ đọc là よじ.", {
    hint: h("Giờ", "4時 よじ, 7時 しちじ, 9時 くじ.", `${r("四時", "よじ")}に${r("会", "あ")}いましょう。`, "Gặp nhau lúc 4 giờ nhé."),
    scene: "🕓",
  }),
  mc("「<u>二十日</u>」の よみかたは？", ["にじゅうにち", "はつひ", "にじゅうか", "はつか"], 3, "Ngày 20 đọc đặc biệt là はつか.", {
    hint: h("Ngày đặc biệt", "1日 ついたち, 20日 はつか.", `${r("二十日", "はつか")}は${r("誕生日", "たんじょうび")}です。`, "Ngày 20 là sinh nhật tôi."),
    scene: "🎂",
  }),
  mc("「<u>来週</u>」の よみかたは？", ["らいしゅう", "きしゅう", "らいしゅ", "くしゅう"], 0, "「来週」 đọc là らいしゅう (tuần sau).", {
    hint: h("来", "来週・来月・来年: tuần/tháng/năm sau.", `${r("来週", "らいしゅう")}テストがあります。`, "Tuần sau có bài kiểm tra."),
    scene: "📅",
  }),
  mc("「ごぜん」を かんじで かくと？", ["牛前", "午前", "午後", "前午"], 1, "「ごぜん」 viết là 午前 (buổi sáng); chú ý 午 khác 牛.", {
    hint: h("午前・午後", "午前: sáng (AM), 午後: chiều (PM).", `${r("午前", "ごぜん")}${r("十時", "じゅうじ")}に${r("来", "き")}てください。`, "Hãy đến lúc 10 giờ sáng."),
    scene: "🌅",
  }),
  mc("「<u>毎年</u>」の いみは？", ["Năm ngoái", "Năm sau", "Mỗi năm", "Năm nay"], 2, "「毎年（まいとし／まいねん）」 là mỗi năm.", {
    explanationLong: "Năm ngoái: 去年, năm sau: 来年, năm nay: 今年.",
    hint: h("毎〜", "毎日・毎週・毎月・毎年.", `${r("毎年", "まいとし")}${r("花見", "はなみ")}をします。`, "Năm nào tôi cũng đi ngắm hoa."),
    scene: "🌸",
  }),
  mc("「<u>七日</u>」の よみかたは？", ["しちにち", "なのか", "ななにち", "ななか"], 1, "Ngày 7 đọc là なのか.", {
    hint: h("Ngày 1–10", "ついたち, ふつか, みっか, よっか, いつか, むいか, なのか, ようか, ここのか, とおか.", `${r("七日", "なのか")}に${r("帰", "かえ")}ります。`, "Ngày 7 tôi về."),
    scene: "🗓️",
  }),
  sh("Viết cách đọc (hiragana) của 「毎朝」.", "まいあさ", "「毎朝」 đọc là まいあさ (mỗi sáng).", { scene: "☀️" }),
  sh("Viết cách đọc (hiragana) của 「火曜日」.", "かようび", "「火曜日」 đọc là かようび (thứ Ba).", { scene: "🔥" }),
];

const goiMon: BankQ[] = [
  mc("Khách gọi gì?", ["Cơm tempura và 1 chai bia", "Sushi và trà", "2 phần tempura", "Mì soba và bia"], 0, "「天ぷら定食を一つと、ビールを一本」.", {
    audioText: "店員：ご注文はお決まりですか。 客：はい、天ぷら定食を一つと、ビールを一本お願いします。",
    scene: "🍤",
  }),
  mc("Cuối cùng khách gọi món gì?", ["Ramen cay", "Ramen xì dầu", "Ramen miso", "Không gọi gì"], 1, "Nhân viên gợi ý しょうゆラーメン và khách nói 「それにします」.", {
    audioText: "客：すみません、このラーメン、辛いですか。 店員：少し辛いです。辛くないのがよければ、しょうゆラーメンがおすすめです。 客：じゃ、それにします。",
    explanationLong: "「〜にします」: quyết định chọn ~.",
    scene: "🍜",
  }),
  mc("Khách muốn uống gì và khi nào?", ["Trà lạnh, trước bữa ăn", "Cà phê, sau bữa ăn", "Trà nóng, cùng bữa ăn", "Nước, cùng bữa ăn"], 2, "「食事と一緒に、温かいお茶を」.", {
    audioText: "店員：お飲み物はいかがですか。 客：食事と一緒に、温かいお茶をください。",
    scene: "🍵",
  }),
  mc("Tình trạng nhà hàng thế nào?", ["Còn bàn trống", "Kín chỗ, phải đợi khoảng 20 phút", "Sắp đóng cửa", "Chỉ nhận khách đặt trước"], 1, "「ただいま満席で、20分ほどお待ちいただけますか」.", {
    audioText: "客：予約していないんですが、二人、大丈夫ですか。 店員：申し訳ございません。ただいま満席で、20分ほどお待ちいただけますか。",
    scene: "🪑",
  }),
  mc("Khách phàn nàn điều gì?", ["Món ăn quá mặn", "Hóa đơn bị sai", "Bàn bị bẩn", "Món salad chưa được mang ra"], 3, "「注文したサラダがまだ来ていない」.", {
    audioText: "客：すみません、注文したサラダがまだ来ていないんですが。 店員：大変失礼いたしました。すぐにお持ちします。",
    scene: "🥗",
  }),
  mc("Khách muốn thanh toán thế nào?", ["Trả riêng từng người", "Trả chung", "Trả bằng thẻ", "Trả sau"], 0, "「別々でもいいですか」 — trả riêng.", {
    audioText: "客：お会計お願いします。別々でもいいですか。 店員：はい、大丈夫です。",
    scene: "🧾",
  }),
  mc("Gọi món lần cuối trước khi kết thúc bao lâu?", ["5分", "10分", "15分", "90分"], 2, "「ラストオーダーは終了の15分前です」.", {
    audioText: "店員：こちらは食べ放題のコースで、時間は90分です。ラストオーダーは終了の15分前です。",
    scene: "⏳",
  }),
  mc("Nhân viên gợi ý món nào?", ["Bánh kem", "Thạch (jelly)", "Kem", "Bánh pudding"], 1, "Bánh có trứng, nhân viên gợi ý thạch 「ゼリー」.", {
    audioText: "客：卵アレルギーがあるんですが、このケーキは大丈夫ですか。 店員：申し訳ございません。そちらには卵が入っております。こちらのゼリーでしたら大丈夫です。",
    scene: "🍮",
  }),
];

const kinhNgu: BankQ[] = [
  mc("社長は今、会議室に＿＿＿。", ["いらっしゃいます", "おります", "まいります", "うかがいます"], 0, "Tôn kính ngữ của います (về giám đốc) là 「いらっしゃいます」.", {
    translation: "Giám đốc hiện đang ở phòng họp.",
    explanationLong: "おります・まいります・うかがいます là khiêm nhường ngữ, chỉ dùng cho hành động của bản thân/phía mình.",
    hint: h("尊敬語", "いる・行く・来る → いらっしゃる.", "部長は何時にいらっしゃいますか。", "Trưởng phòng mấy giờ đến ạ?"),
    scene: "👔",
  }),
  mc("（客に）私が駅までご案内＿＿＿。", ["なさいます", "いたします", "くださいます", "いらっしゃいます"], 1, "Hành động của mình → khiêm nhường: 「ご案内いたします」.", {
    translation: "(Với khách) Tôi xin dẫn quý khách ra ga.",
    hint: h("謙譲語 お／ご〜する", "ご + danh động từ + いたします.", "資料をお送りいたします。", "Tôi xin gửi tài liệu."),
    scene: "🧭",
  }),
  mc("部長、この資料をもう＿＿＿か。", ["拝見しました", "ご覧になりました", "拝見されました", "見られました"], 1, "Hành động của trưởng phòng (xem) → 「ご覧になりました」.", {
    translation: "Trưởng phòng đã xem tài liệu này chưa ạ?",
    explanationLong: "拝見する là khiêm nhường ngữ (của mình). 「拝見される」 là sai (trộn khiêm nhường và tôn kính).",
    hint: h("見る", "Tôn kính: ご覧になる; khiêm nhường: 拝見する.", "こちらをご覧ください。", "Xin mời xem ở đây."),
    scene: "📄",
  }),
  mc("明日、そちらに＿＿＿もよろしいでしょうか。", ["いらっしゃって", "おいでになって", "参られて", "うかがって"], 3, "Mình đến thăm → khiêm nhường 「うかがって」.", {
    translation: "Ngày mai tôi đến chỗ anh/chị có được không ạ?",
    hint: h("伺う", "伺う = 訪ねる・聞く (khiêm nhường).", "3時に伺います。", "Tôi sẽ đến lúc 3 giờ."),
    scene: "🚶",
  }),
  mc("（取引先に）田中は ただいま席を＿＿＿。", ["外していらっしゃいます", "外しております", "お外しになっています", "外されています"], 1, "Nói về đồng nghiệp với người ngoài công ty → dùng khiêm nhường 「外しております」.", {
    translation: "(Với đối tác) Tanaka hiện không có mặt tại chỗ.",
    explanationLong: "Với khách bên ngoài, người trong công ty (kể cả cấp trên) được coi là “phía mình”, gọi tên không có さん và dùng khiêm nhường ngữ.",
    hint: h("ウチとソト", "Người trong công ty khi nói với bên ngoài → khiêm nhường.", "あいにく部長の山田は外出しております。", "Rất tiếc trưởng phòng Yamada đang ra ngoài."),
    scene: "📞",
  }),
  mc("先生が書かれた本を＿＿＿。", ["お読みになりました", "読まれました", "拝読しました", "ご覧になりました"], 2, "Mình đọc sách của thầy → khiêm nhường 「拝読しました」.", {
    translation: "Em đã đọc cuốn sách thầy viết.",
    hint: h("拝読する", "読む (khiêm nhường) = 拝読する.", "メールを拝読しました。", "Tôi đã đọc email."),
    scene: "📘",
  }),
  mc("お客様、こちらで少々お待ち＿＿＿。", ["してください", "ください", "いたしてください", "されてください"], 1, "Mẫu yêu cầu lịch sự: 「お + Vます + ください」 → お待ちください.", {
    translation: "Thưa quý khách, xin vui lòng chờ ở đây một chút.",
    hint: h("お〜ください", "お + thân động từ + ください.", "こちらにお名前をお書きください。", "Xin vui lòng ghi tên vào đây."),
    scene: "⌛",
  }),
  es(
    "Viết 2–3 câu email bằng kính ngữ gửi khách hàng để xin dời cuộc hẹn ngày mai sang tuần sau.",
    "いつもお世話になっております。誠に申し訳ございませんが、明日のお打ち合わせを来週に変更させていただけないでしょうか。ご都合のよい日時をお知らせいただければ幸いです。",
    "Tiêu chí chấm: câu mở đầu email công việc (いつもお世話になっております); lời xin lỗi (申し訳ございません); yêu cầu dời lịch bằng khiêm nhường ngữ (〜させていただけないでしょうか); đề nghị khách cho biết lịch phù hợp; dùng kính ngữ chính xác, nhất quán.",
    5,
    { scene: "✉️" },
  ),
];

const dongVat: BankQ[] = [
  mc(`これは${r("何", "なん")}ですか？`, ["ねこ", "いぬ", "とり", "さかな"], 0, "🐱 là con mèo — 「ねこ」.", {
    translation: "Đây là con gì?",
    hint: h("Con vật", "ねこ: mèo, いぬ: chó, とり: chim, さかな: cá.", "ねこが すきです。", "Tôi thích mèo."),
    scene: "🐱",
  }),
  mc(`これは${r("何", "なん")}ですか？`, ["ねこ", "いぬ", "うし", "うま"], 1, "🐶 là con chó — 「いぬ」.", {
    translation: "Đây là con gì?",
    hint: h("Con vật", "いぬ: chó.", "いぬと さんぽします。", "Tôi đi dạo với chó."),
    scene: "🐶",
  }),
  mc(`これは${r("何", "なん")}ですか？`, ["さかな", "むし", "とり", "ねずみ"], 2, "🐦 là con chim — 「とり」.", {
    translation: "Đây là con gì?",
    hint: h("Con vật", "とり: chim, むし: côn trùng, ねずみ: chuột.", "とりが ないて います。", "Chim đang hót."),
    scene: "🐦",
  }),
  mc(`これは${r("何", "なん")}ですか？`, ["かめ", "かえる", "へび", "さかな"], 3, "🐟 là con cá — 「さかな」.", {
    translation: "Đây là con gì?",
    hint: h("Con vật", "かめ: rùa, かえる: ếch, へび: rắn.", "さかなが およいで います。", "Cá đang bơi."),
    scene: "🐟",
  }),
  mc(`これは${r("何", "なん")}ですか？`, ["ぶた", "うし", "ひつじ", "やぎ"], 1, "🐄 là con bò — 「うし」.", {
    translation: "Đây là con gì?",
    hint: h("Gia súc", "ぶた: lợn, うし: bò, ひつじ: cừu, やぎ: dê.", "うしの ミルクを のみます。", "Tôi uống sữa bò."),
    scene: "🐄",
  }),
  mc(`これは${r("何", "なん")}ですか？`, ["きりん", "さる", "ぞう", "とら"], 2, "🐘 là con voi — 「ぞう」.", {
    translation: "Đây là con gì?",
    hint: h("Động vật sở thú", "きりん: hươu cao cổ, さる: khỉ, とら: hổ.", "ぞうは はなが ながいです。", "Voi có vòi dài."),
    scene: "🐘",
  }),
  mc("「うさぎ」は どれですか。", ["🐰", "🐻", "🐼", "🦊"], 0, "「うさぎ」 là con thỏ 🐰.", {
    explanationLong: "🐻 くま (gấu), 🐼 パンダ, 🦊 きつね (cáo).",
    hint: h("Con vật", "うさぎ: thỏ, くま: gấu, きつね: cáo.", "うさぎは にんじんが すきです。", "Thỏ thích cà rốt."),
    scene: "🐰",
  }),
  mc(`${r("動物園", "どうぶつえん")}で パンダを＿＿＿。`, ["のみました", "みました", "かきました", "ききました"], 1, "Xem gấu trúc → 「みました」.", {
    translation: "Tôi đã xem gấu trúc ở sở thú.",
    hint: h("Động từ みる", "みます → みました (quá khứ).", `${r("動物園", "どうぶつえん")}へ${r("行", "い")}きました。`, "Tôi đã đi sở thú."),
    scene: "🐼",
  }),
];

const UNSPLASH_FUJI = "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=400&q=80";

export const EXERCISES: QuizSeed[] = [
  { slug: "tu-vung-gia-dinh", kind: "exercise", title: "Từ vựng: Gia đình", description: "Luyện tập các từ vựng về thành viên trong gia đình qua hình ảnh và câu ví dụ.", level: "N5", skill: "vocab", topic: "Gia đình", difficulty: "easy", durationMin: 10, emoji: "👨‍👩‍👧", tone: "from-rose-100 to-amber-50", featured: true, createdDaysAgo: 5, popularity: 98, questions: giaDinh },
  { slug: "tu-vung-do-an", kind: "exercise", title: "Từ vựng: Đồ ăn và thức uống", description: "Luyện tập các từ vựng quen thuộc về ẩm thực Nhật Bản.", level: "N5", skill: "vocab", topic: "Ẩm thực", difficulty: "easy", durationMin: 10, emoji: "🍜", tone: "from-orange-100 to-amber-50", createdDaysAgo: 12, popularity: 92, questions: doAn },
  { slug: "ngu-phap-teimasu", kind: "exercise", title: "Ngữ pháp: 〜ています", description: "Luyện tập cách dùng thể 〜ています trong các tình huống hàng ngày.", level: "N4", skill: "grammar", topic: "Đời sống", difficulty: "medium", durationMin: 15, emoji: "⛩️", icon: UNSPLASH_FUJI, tone: "from-sky-100 to-rose-50", featured: true, createdDaysAgo: 20, popularity: 88, questions: teimasu },
  { slug: "tu-vung-cong-viec", kind: "exercise", title: "Từ vựng: Công việc", description: "Các từ vựng về nghề nghiệp và môi trường làm việc.", level: "N4", skill: "vocab", topic: "Công việc", difficulty: "medium", durationMin: 12, emoji: "🏢", tone: "from-amber-100 to-orange-50", createdDaysAgo: 30, popularity: 75, questions: congViec },
  { slug: "tu-vung-du-lich", kind: "exercise", title: "Từ vựng: Du lịch", description: "Các từ vựng thường gặp khi đi du lịch Nhật Bản.", level: "N3", skill: "vocab", topic: "Du lịch", difficulty: "medium", durationMin: 12, emoji: "✈️", tone: "from-sky-100 to-cyan-50", featured: true, createdDaysAgo: 42, popularity: 70, questions: duLich },
  { slug: "giao-tiep-chao-hoi", kind: "exercise", title: "Giao tiếp: Gặp gỡ và chào hỏi", description: "Các mẫu câu giao tiếp cơ bản trong cuộc sống hàng ngày.", level: "N3", skill: "communication", topic: "Giao tiếp", difficulty: "medium", durationMin: 15, emoji: "🤝", tone: "from-rose-100 to-orange-50", createdDaysAgo: 55, popularity: 85, questions: chaoHoi },
  { slug: "nghe-hoi-thoai-hang-ngay", kind: "exercise", title: "Luyện nghe: Hội thoại hàng ngày", description: "Nghe và chọn đáp án đúng.", level: "N4", skill: "listening", topic: "Đời sống", difficulty: "medium", durationMin: 15, emoji: "🎧", tone: "from-indigo-100 to-violet-50", createdDaysAgo: 70, popularity: 66, questions: hoiThoai },
  { slug: "kanji-n3-phan-1", kind: "exercise", title: "Kanji: N3 – Phần 1", description: "Luyện viết và nhận biết 50 chữ Kanji thường gặp.", level: "N3", skill: "kanji", topic: "Đời sống", difficulty: "hard", durationMin: 20, emoji: "⛩️", tone: "from-rose-100 to-red-50", createdDaysAgo: 88, popularity: 72, questions: kanjiN3 },
  { slug: "ngu-phap-you-ni-suru", kind: "exercise", title: "Ngữ pháp: 〜ようにする", description: "Cách dùng và bài tập vận dụng.", level: "N2", skill: "grammar", topic: "Đời sống", difficulty: "hard", durationMin: 15, emoji: "📝", tone: "from-violet-100 to-indigo-50", createdDaysAgo: 110, popularity: 58, questions: youNiSuru },
  { slug: "nghe-tin-tuc-ngan", kind: "exercise", title: "Luyện nghe: Tin tức ngắn", description: "Nghe và trả lời câu hỏi dựa trên bản tin ngắn.", level: "N2", skill: "listening", topic: "Tin tức", difficulty: "hard", durationMin: 20, emoji: "💬", tone: "from-sky-100 to-indigo-50", createdDaysAgo: 170, popularity: 52, questions: tinTuc },
  { slug: "nghe-ga-tau", kind: "exercise", title: "Luyện nghe: Hội thoại tại ga tàu", description: "Nghe và chọn đáp án đúng dựa trên hội thoại thực tế tại ga tàu.", level: "N2", skill: "listening", topic: "Du lịch", difficulty: "hard", durationMin: 15, emoji: "🎧", tone: "from-indigo-100 to-pink-50", featured: true, createdDaysAgo: 48, popularity: 60, questions: gaTau },
  { slug: "giao-tiep-mua-sam", kind: "exercise", title: "Giao tiếp: Mua sắm", description: "Các mẫu câu hỏi giá, chọn món đồ và thanh toán tại cửa hàng.", level: "N5", skill: "communication", topic: "Đời sống", difficulty: "easy", durationMin: 10, emoji: "🛍️", tone: "from-pink-100 to-violet-50", featured: true, createdDaysAgo: 15, popularity: 55, questions: muaSam },
  { slug: "kanji-thoi-gian", kind: "exercise", title: "Kanji: Thời gian & lịch", description: "Nhận biết và đọc đúng các chữ Kanji về ngày, tháng, giờ giấc.", level: "N4", skill: "kanji", topic: "Đời sống", difficulty: "medium", durationMin: 12, emoji: "🗓️", tone: "from-amber-100 to-rose-50", featured: true, createdDaysAgo: 25, popularity: 50, questions: kanjiThoiGian },
  { slug: "nghe-goi-mon", kind: "exercise", title: "Luyện nghe: Gọi món ở nhà hàng", description: "Nghe hội thoại gọi món và chọn đáp án phù hợp với tình huống.", level: "N3", skill: "listening", topic: "Ẩm thực", difficulty: "medium", durationMin: 15, emoji: "🍣", tone: "from-orange-100 to-rose-50", featured: true, createdDaysAgo: 95, popularity: 45, questions: goiMon },
  { slug: "ngu-phap-kinh-ngu", kind: "exercise", title: "Ngữ pháp: Kính ngữ nơi công sở", description: "Phân biệt tôn kính ngữ, khiêm nhường ngữ trong môi trường làm việc.", level: "N2", skill: "grammar", topic: "Công việc", difficulty: "hard", durationMin: 20, emoji: "💼", tone: "from-slate-100 to-sky-50", featured: true, createdDaysAgo: 150, popularity: 40, questions: kinhNgu },
  { slug: "tu-vung-dong-vat", kind: "exercise", title: "Từ vựng: Động vật", description: "Gọi tên các con vật quen thuộc bằng tiếng Nhật qua hình ảnh minh họa.", level: "N5", skill: "vocab", topic: "Đời sống", difficulty: "easy", durationMin: 8, emoji: "🐱", tone: "from-amber-100 to-yellow-50", createdDaysAgo: 8, popularity: 64, questions: dongVat },
];

/* ------------------------------------------------------------------ */
/* Bộ đề JLPT — ngân hàng câu hỏi theo phần thi, ghép thành 5 đề/cấp    */
/* ------------------------------------------------------------------ */

type Pools = { v: BankQ[]; g: BankQ[]; r: BankQ[]; l: BankQ[] };
const SEC = { v: "文字・語彙", g: "文法", r: "読解", l: "聴解" } as const;
const TIP = {
  v: "Đọc kỹ cả câu để chọn cách đọc/từ phù hợp với ngữ cảnh.",
  g: "Xác định mẫu ngữ pháp và dạng chia của từ đứng trước chỗ trống.",
  r: "Đọc câu hỏi trước, sau đó tìm thông tin tương ứng trong đoạn văn.",
  l: "Nghe kỹ chi tiết sau các từ でも・じゃなくて vì đáp án thường đổi ở đó.",
};

/** Ngữ cảnh đoạn hội thoại nghe: câu hỏi kèm audioText. */
function lq(audioText: string, prompt: string, options: string[], answer: number, explanation: string): BankQ {
  return mc(prompt, options, answer, explanation, { audioText });
}

// ============================== N5 ==============================
const N5: Pools = {
  v: [
    yomi("きのう <u>山</u>に のぼりました。", "山", ["やま", "かわ", "うみ", "いけ"], 0, "Hôm qua tôi đã leo núi."),
    yomi("<u>毎日</u> にほんごを べんきょうします。", "毎日", ["まいとし", "まいにち", "まいしゅう", "まいつき"], 1, "Ngày nào tôi cũng học tiếng Nhật."),
    yomi("つくえの <u>上</u>に ほんが あります。", "上", ["した", "なか", "うえ", "よこ"], 2, "Trên bàn có quyển sách."),
    yomi("<u>先生</u>に ききました。", "先生", ["せんせ", "せいせい", "せんぜい", "せんせい"], 3, "Tôi đã hỏi thầy giáo."),
    yomi("この みせは <u>安い</u>です。", "安い", ["たかい", "やすい", "ひくい", "ちかい"], 1, "Cửa hàng này rẻ."),
    yomi("<u>水</u>を のみます。", "水", ["みず", "き", "かね", "ひ"], 0, "Tôi uống nước."),
    yomi("<u>右</u>に まがって ください。", "右", ["ひだり", "まえ", "うしろ", "みぎ"], 3, "Hãy rẽ phải."),
    mc("きのう ＿＿＿で くつを かいました。", ["デパート", "ポスト", "テスト", "ノート"], 0, "Mua giày ở 「デパート」 (cửa hàng bách hóa).", { translation: "Hôm qua tôi đã mua giày ở cửa hàng bách hóa." }),
    mc("へやが くらいです。でんきを ＿＿＿ ください。", ["けして", "つけて", "あけて", "しめて"], 1, "Phòng tối → bật đèn: 「でんきを つけて ください」.", { translation: "Phòng tối quá. Hãy bật đèn lên." }),
    mc("わたしは まいあさ はを ＿＿＿。", ["あらいます", "あびます", "みがきます", "きります"], 2, "Đánh răng: 「はを みがきます」.", { translation: "Mỗi sáng tôi đánh răng." }),
    mc("「おととい」と おなじ いみは？", ["きのうの まえの ひ", "きのうの つぎの ひ", "あしたの つぎの ひ", "きょうの つぎの ひ"], 0, "「おととい」 = hôm kia = ngày trước hôm qua."),
    mc("さむいですから、＿＿＿を きます。", ["ズボン", "めがね", "コート", "くつした"], 2, "Trời lạnh nên mặc áo khoác 「コート」 (động từ きます dùng cho áo).", { translation: "Vì trời lạnh nên tôi mặc áo khoác." }),
    yomi("<u>電車</u>で がっこうへ いきます。", "電車", ["でんしゃ", "でんき", "でんわ", "でんしや"], 0, "Tôi đi học bằng tàu điện."),
    yomi("<u>来月</u> にほんへ いきます。", "来月", ["こんげつ", "らいげつ", "らいつき", "らいがつ"], 1, "Tháng sau tôi đi Nhật."),
  ],
  g: [
    mc("わたしは まいあさ パン＿＿＿ たべます。", ["を", "に", "で", "が"], 0, "Tân ngữ của たべます đi với 「を」.", { translation: "Mỗi sáng tôi ăn bánh mì." }),
    mc("がっこう＿＿＿ バスで いきます。", ["を", "へ", "の", "と"], 1, "Hướng đi đến dùng 「へ」.", { translation: "Tôi đến trường bằng xe buýt." }),
    mc("この ほんは だれ＿＿＿ ですか。", ["が", "を", "の", "に"], 2, "「だれの」: của ai.", { translation: "Quyển sách này là của ai?" }),
    mc("きのうは あめ＿＿＿。", ["です", "でした", "じゃありません", "でしょう"], 1, "Quá khứ của です là 「でした」.", { translation: "Hôm qua trời mưa." }),
    mc("へやに だれ＿＿＿ いません。", ["が", "を", "は", "も"], 3, "「だれも + phủ định」: không có ai.", { translation: "Trong phòng không có ai." }),
    mc("わたしは にほんごが すこし ＿＿＿。", ["わかります", "みます", "あります", "います"], 0, "「Nが わかります」: hiểu N.", { translation: "Tôi hiểu một chút tiếng Nhật." }),
    mc("テレビを ＿＿＿ながら、ごはんを たべます。", ["みて", "みる", "み", "みた"], 2, "「Vます(bỏ ます) + ながら」 → みながら.", { translation: "Tôi vừa xem tivi vừa ăn cơm." }),
    mc("えいがを ＿＿＿に いきませんか。", ["みる", "み", "みて", "みた"], 1, "Mục đích đi: 「Vます(bỏ ます) + に いきます」 → みに.", { translation: "Bạn có muốn đi xem phim không?" }),
    mc("この へやは ひろくて、＿＿＿です。", ["きれい", "きれいな", "きれいで", "きれいだ"], 0, "Cuối câu trước です dùng 「きれい」 (tính từ đuôi な bỏ な).", { translation: "Căn phòng này rộng và đẹp." }),
    mc("A「コーヒーと こうちゃと どちらが すきですか。」<br>B「コーヒーの ＿＿＿が すきです。」", ["より", "ほう", "ぐらい", "だけ"], 1, "So sánh chọn một: 「Nの ほうが」.", { translation: "A: Bạn thích cà phê hay trà? B: Tôi thích cà phê hơn." }),
    mc("ここで しゃしんを とって＿＿＿ いいですか。", ["は", "も", "が", "を"], 1, "Xin phép: 「Vても いいですか」.", { translation: "Tôi chụp ảnh ở đây có được không?" }),
    mc("★に はいる ものは どれですか。<br>わたしは（　）（　）（★）（　）です。", ["にほんの", "が", "すき", "りょうり"], 1, "Câu đúng: わたしは にほんの りょうり が すき です → ★ = が.", { translation: "Tôi thích món ăn Nhật." }),
    mc("まだ しゅくだいを ＿＿＿。", ["しません", "していません", "しませんでした", "しました"], 1, "「まだ + Vていません」: vẫn chưa làm.", { translation: "Tôi vẫn chưa làm bài tập." }),
    mc("きのう デパート＿＿＿ かいものを しました。", ["に", "を", "で", "へ"], 2, "Nơi diễn ra hành động dùng 「で」.", { translation: "Hôm qua tôi đã mua sắm ở cửa hàng bách hóa." }),
  ],
  r: [
    mc("<p>わたしの へやは 2かいに あります。へやには ベッドと つくえが あります。まどから こうえんが みえます。</p>まどから なにが みえますか。", ["がっこう", "こうえん", "えき", "デパート"], 1, "「まどから こうえんが みえます」 — nhìn thấy công viên."),
    mc("<p>きょうは にちようびです。あさ ともだちと テニスを しました。ごごは うちで ほんを よみました。</p>ごご なにを しましたか。", ["テニスを しました", "かいものを しました", "ほんを よみました", "えいがを みました"], 2, "Buổi chiều (ごご) đọc sách ở nhà; tennis là buổi sáng."),
    mc("<p>マリアさんへ<br>3じに としょかんの まえで まって います。ほんを 2さつ もって きて ください。<br>たなか</p>マリアさんは なにを もって いきますか。", ["ほん 2さつ", "ほん 1さつ", "ノート 2さつ", "かさ"], 0, "Ghi chú yêu cầu mang 2 quyển sách."),
    mc("<p>わたしは まいばん 11じに ねます。でも、きのうは しゅくだいが おおかったですから、1じに ねました。</p>きのうは なんじに ねましたか。", ["10じ", "11じ", "12じ", "1じ"], 3, "Hôm qua nhiều bài tập nên ngủ lúc 1 giờ; 11 giờ là thói quen thường ngày."),
    mc("<p>この みせは あさ 9じから よる 8じまでです。どようびは 6じまでです。にちようびは やすみです。</p>どようびは なんじまで ですか。", ["8じ", "9じ", "6じ", "やすみ"], 2, "Thứ bảy mở đến 6 giờ."),
    mc("<p>わたしの かぞくは 4にんです。ちちは いしゃです。ははは にほんごの せんせいです。あには だいがくせいです。</p>おかあさんの しごとは なんですか。", ["いしゃ", "にほんごの せんせい", "だいがくせい", "かいしゃいん"], 1, "「ははは にほんごの せんせいです」."),
  ],
  l: [
    lq("女：すみません、ゆうびんきょくは どこですか。 男：あの ぎんこうの となりです。", "ゆうびんきょくは どこですか。", ["えきの まえ", "がっこうの うしろ", "ぎんこうの となり", "デパートの なか"], 2, "Bưu điện ở cạnh ngân hàng (ぎんこうの となり)."),
    lq("男：あした なんじに あいましょうか。 女：10じは どうですか。 男：10じは ちょっと…。11じは どうですか。 女：いいですよ。", "ふたりは なんじに あいますか。", ["11じ", "9じ", "10じ", "12じ"], 0, "10 giờ người đàn ông bận, cả hai thống nhất 11 giờ."),
    lq("女：この りんご、いくらですか。 男：ひとつ 100えんです。 女：じゃ、みっつ ください。", "おんなの ひとは ぜんぶで いくら はらいますか。", ["100えん", "200えん", "300えん", "400えん"], 2, "100 yên × 3 quả = 300 yên."),
    lq("男：きのう なにを しましたか。 女：あさは そうじを して、ごごは ともだちと かいものに いきました。", "おんなの ひとは ごご なにを しましたか。", ["そうじ", "かいもの", "べんきょう", "りょうり"], 1, "Buổi chiều đi mua sắm với bạn; dọn dẹp là buổi sáng."),
    lq("女：やまださん、のみものは なにが いいですか。 男：つめたい おちゃを おねがいします。", "おとこの ひとは なにを のみますか。", ["あたたかい おちゃ", "つめたい おちゃ", "コーヒー", "ジュース"], 1, "Người đàn ông gọi trà lạnh (つめたい おちゃ)."),
    lq("男：がっこうまで なんで きますか。 女：いつもは じてんしゃですが、あめの ひは バスで きます。", "あめの ひ、おんなの ひとは なんで がっこうへ いきますか。", ["あるいて", "じてんしゃ", "でんしゃ", "バス"], 3, "Ngày mưa đi xe buýt; ngày thường đi xe đạp."),
  ],
};

// ============================== N4 ==============================
const N4: Pools = {
  v: [
    yomi("<u>説明</u>を よく 聞いて ください。", "説明", ["せつめい", "せつめ", "せっめい", "しょうめい"], 0, "Hãy nghe kỹ lời giải thích."),
    yomi("<u>急行</u>に 乗りました。", "急行", ["きゅこう", "きゅうこう", "きゅうごう", "きょうこう"], 1, "Tôi đã đi tàu tốc hành."),
    yomi("この 道は 夜 <u>暗い</u>です。", "暗い", ["ひろい", "せまい", "くらい", "あかるい"], 2, "Con đường này ban đêm tối."),
    yomi("この 町は <u>交通</u>が 便利です。", "交通", ["こうつう", "こうずう", "こつう", "きょうつう"], 0, "Giao thông ở thị trấn này thuận tiện."),
    yomi("<u>写真</u>を とっても いいですか。", "写真", ["しゃじん", "しやしん", "さしん", "しゃしん"], 3, "Tôi chụp ảnh có được không?"),
    yomi("<u>重い</u> 荷物を 持ちます。", "重い", ["かるい", "おもい", "ふとい", "つよい"], 1, "Tôi mang hành lý nặng."),
    mc("会議の 時間に ＿＿＿ように、早く 家を 出ました。", ["まにあう", "まちがう", "てつだう", "ひろう"], 0, "「間に合う」: kịp giờ.", { translation: "Tôi ra khỏi nhà sớm để kịp giờ họp." }),
    mc("すみません、この 漢字の ＿＿＿を 教えて ください。", ["ききかた", "よみかた", "はなしかた", "みかた"], 1, "Hỏi cách đọc chữ Hán: 「読み方」.", { translation: "Xin lỗi, hãy chỉ tôi cách đọc chữ Hán này." }),
    mc("けがを して、＿＿＿に 行きました。", ["ぎんこう", "としょかん", "びょういん", "ゆうびんきょく"], 2, "Bị thương thì đến bệnh viện 「病院」.", { translation: "Tôi bị thương nên đã đến bệnh viện." }),
    mc("「さわがしい」に いちばん 近い いみは？", ["うるさい", "しずか", "きたない", "あぶない"], 0, "「騒がしい」 ≈ 「うるさい」: ồn ào."),
    mc("雨が ＿＿＿ 降って きたので、かさを さしました。", ["やっと", "なかなか", "ぜひ", "きゅうに"], 3, "「急に」: đột nhiên.", { translation: "Trời đột nhiên mưa nên tôi đã giương ô." }),
    mc("「しゅっぱつ」の いみは？", ["Đến nơi", "Xuất phát", "Chuẩn bị", "Trở về"], 1, "「出発（しゅっぱつ）」 = xuất phát."),
    mc("この レストランは いつも ＿＿＿で、すわれません。", ["るす", "まんせき", "からっぽ", "ひま"], 1, "「満席」: kín chỗ.", { translation: "Nhà hàng này lúc nào cũng kín chỗ, không ngồi được." }),
    yomi("<u>世界</u>で いちばん 高い 山は どこですか。", "世界", ["せかい", "せいかい", "よかい", "せがい"], 0, "Ngọn núi cao nhất thế giới là ở đâu?"),
  ],
  g: [
    mc("日本へ 行った＿＿＿が ありますか。", ["こと", "もの", "ところ", "の"], 0, "Kinh nghiệm: 「Vた ことが ある」.", { translation: "Bạn đã từng đến Nhật chưa?" }),
    mc("あした 雨が 降っ＿＿＿、試合は 中止です。", ["ても", "たら", "ながら", "たり"], 1, "Điều kiện: 「〜たら」 (nếu).", { translation: "Nếu ngày mai mưa thì trận đấu bị hủy." }),
    mc("この 薬を 飲めば、すぐ ＿＿＿。", ["なおりました", "なおって", "なおります", "なおろう"], 2, "「〜ば、〜ます」: nếu ~ thì sẽ ~.", { translation: "Nếu uống thuốc này thì sẽ khỏi ngay." }),
    mc("先生に 名前を ＿＿＿。", ["よばれました", "よびました", "よばせました", "よんでいました"], 0, "Bị động: 「呼ばれました」 (bị/được gọi).", { translation: "Tôi được thầy gọi tên." }),
    mc("母は 私に 部屋を 掃除＿＿＿。", ["されました", "しました", "させました", "してもらいました"], 2, "Sai khiến: 「させました」 (mẹ bắt tôi dọn).", { translation: "Mẹ bắt tôi dọn phòng." }),
    mc("友だちに 本を 貸して＿＿＿。", ["あげました", "もらいました", "くれました", "さしあげました"], 1, "「Aに Vて もらう」: được A làm cho.", { translation: "Tôi được bạn cho mượn sách." }),
    mc("空が 暗く なって、雨が 降り＿＿＿です。", ["よう", "らしい", "そう", "みたい"], 2, "Phán đoán từ quan sát: 「Vます(bỏ ます) + そう」 → 降りそう.", { translation: "Trời tối lại, có vẻ sắp mưa." }),
    mc("毎日 日本語を 勉強する＿＿＿に して います。", ["よう", "こと", "ため", "ところ"], 0, "「Vる ように する」: cố gắng làm.", { translation: "Tôi cố gắng học tiếng Nhật mỗi ngày." }),
    mc("電話を かけた＿＿＿、彼は 出ませんでした。", ["から", "ので", "のに", "ため"], 2, "Trái với mong đợi: 「〜のに」.", { translation: "Tôi đã gọi điện vậy mà anh ấy không nghe máy." }),
    mc("窓を 開けた＿＿＿ 出かけて しまいました。", ["ながら", "まま", "あいだ", "うちに"], 1, "Giữ nguyên trạng thái: 「Vた まま」.", { translation: "Tôi lỡ ra ngoài mà vẫn để cửa sổ mở." }),
    mc("暗く ならない＿＿＿、帰りましょう。", ["まえに", "あとで", "までに", "うちに"], 3, "「〜ない うちに」: trước khi (trạng thái thay đổi).", { translation: "Hãy về trước khi trời tối." }),
    mc("★に 入る ものは どれですか。<br>これは（　）（　）（★）（　）です。", ["母に", "ケーキ", "作って", "もらった"], 3, "Câu đúng: これは 母に 作って もらった ケーキ です → ★ = もらった.", { translation: "Đây là chiếc bánh mẹ làm cho tôi." }),
    mc("夏休みに 国へ 帰る＿＿＿です。", ["はず", "つもり", "ため", "こと"], 1, "Dự định: 「Vる つもりです」.", { translation: "Tôi định về nước vào kỳ nghỉ hè." }),
    mc("あの 店は 安い＿＿＿、おいしいです。", ["し", "のに", "ので", "ても"], 0, "Liệt kê lý do: 「〜し、〜」.", { translation: "Quán đó vừa rẻ lại vừa ngon." }),
  ],
  r: [
    mc("<p>来週の 土曜日に、クラスで パーティーを します。時間は 午後6時からです。食べ物は 学校が 用意しますが、飲み物は 自分で 持って きて ください。</p>パーティーに 何を 持って 行きますか。", ["食べ物", "飲み物", "お金", "プレゼント"], 1, "Đồ ăn do trường chuẩn bị, đồ uống tự mang."),
    mc("<p>私は 去年から 毎朝 30分 ジョギングを して います。始めた ころは とても つらかったですが、今は 走らないと 気持ちが 悪いです。</p>この 人は 今 ジョギングに ついて どう 思って いますか。", ["とても つらい", "もう やめたい", "走らないと 気持ちが 悪い", "時間が ない"], 2, "Hiện tại không chạy thì thấy khó chịu; “rất mệt” là lúc mới bắt đầu."),
    mc("<p>【お知らせ】図書館は 毎週 月曜日が 休みです。本は 一人 5冊まで、2週間 借りる ことが できます。</p>正しい ものは どれですか。", ["本は 3週間 借りられる", "一人 10冊まで 借りられる", "毎日 開いている", "月曜日は 休みだ"], 3, "Thư viện nghỉ thứ Hai hằng tuần; mượn tối đa 5 quyển trong 2 tuần."),
    mc("<p>山田さんへ<br>今日の 会議は 3時から 4時に 変わりました。場所は 同じ 会議室です。資料を 10部 コピーして おいて ください。<br>田中</p>山田さんは 何を しなければ なりませんか。", ["資料を 10部 コピーする", "会議室を 予約する", "3時に 会議に 出る", "田中さんに 電話する"], 0, "Yêu cầu photo 10 bản tài liệu; họp đã đổi sang 4 giờ."),
    mc("<p>日本では、家に 入る ときに くつを ぬぎます。家の 中を きれいに して おく ためです。旅館や 一部の レストランでも くつを ぬぐ ことが あります。</p>どうして 家に 入る ときに くつを ぬぎますか。", ["足が 疲れるから", "家の 中を きれいに して おく ため", "くつが 高いから", "寒いから"], 1, "「家の中をきれいにしておくためです」."),
    mc("<p>私の 町には 大きな 公園が あります。春は 桜が きれいで、たくさんの 人が 花見に 来ます。でも、ごみを 捨てて 帰る 人が いるので、困って います。</p>この 人は 何に 困って いますか。", ["人が 多いこと", "桜が 少ないこと", "ごみを 捨てて 帰る 人が いること", "公園が 遠いこと"], 2, "Người viết phiền lòng vì có người vứt rác rồi về."),
  ],
  l: [
    lq("男：すみません、この 近くに 郵便局は ありますか。 女：はい、まっすぐ 行って、二つ目の 角を 右に 曲がると ありますよ。", "郵便局へ どう 行きますか。", ["一つ目の 角を 右", "二つ目の 角を 右", "二つ目の 角を 左", "まっすぐ 行った つきあたり"], 1, "Đi thẳng, rẽ phải ở góc thứ hai."),
    lq("女：田中さん、レポートは もう 出しましたか。 男：いいえ、まだです。あしたの 朝 出す つもりです。 女：締め切りは 今日の 5時ですよ。 男：えっ、そうですか。じゃ、今から 書きます。", "男の 人は これから 何を しますか。", ["あした レポートを 出す", "先生に 電話する", "レポートを 書く", "家に 帰る"], 2, "Hạn nộp là 5 giờ hôm nay nên anh ấy viết báo cáo ngay."),
    lq("男：週末、いっしょに 映画を 見に 行きませんか。 女：土曜日は アルバイトが あるんです。日曜日なら 大丈夫です。 男：じゃ、日曜日に しましょう。", "二人は いつ 映画を 見に 行きますか。", ["日曜日", "金曜日", "土曜日", "来週"], 0, "Thứ bảy cô ấy đi làm thêm nên chọn chủ nhật."),
    lq("女：この シャツ、もう 少し 大きい サイズは ありますか。 男：はい、Lサイズが ございます。色は 白と 青が ありますが。 女：じゃ、青を お願いします。", "女の 人は どの シャツを 買いますか。", ["Mサイズの 白", "Lサイズの 白", "Mサイズの 青", "Lサイズの 青"], 3, "Cỡ L, màu xanh."),
    lq("男：あれ、顔色が 悪いですね。 女：ええ、ちょっと 頭が 痛くて…。 男：早く 帰って 休んだ ほうが いいですよ。", "男の 人は 女の 人に 何と 言いましたか。", ["病院へ 行く ほうが いい", "早く 帰って 休む ほうが いい", "薬を 飲む ほうが いい", "仕事を 続ける ほうが いい"], 1, "「早く帰って休んだほうがいいですよ」."),
    lq("女：駅まで 歩いて どのぐらい かかりますか。 男：歩くと 20分ぐらいですね。バスなら 5分ですけど、バスは 30分に 1本しか ないんです。", "バスは どのぐらいに 1本 ありますか。", ["5分", "20分", "30分", "1時間"], 2, "「30分に1本しかない」 — 30 phút mới có một chuyến."),
  ],
};

// ============================== N3 ==============================
const N3: Pools = {
  v: [
    yomi("会議の <u>準備</u>を します。", "準備", ["じゅんび", "じゅんぴ", "じゅんみ", "しゅんび"], 0, "Tôi chuẩn bị cho cuộc họp."),
    yomi("この 町の <u>人口</u>は 増えて います。", "人口", ["にんこう", "じんこう", "ひとぐち", "じんこ"], 1, "Dân số của thị trấn này đang tăng."),
    yomi("彼は <u>正直</u>な 人です。", "正直", ["せいちょく", "しょうじき", "しょうちょく", "せいじき"], 1, "Anh ấy là người thật thà."),
    yomi("フロントに 荷物を <u>預けて</u> ください。", "預けて", ["とどけて", "たすけて", "あずけて", "うけて"], 2, "Hãy gửi hành lý ở quầy lễ tân."),
    mc("試験に 合格して、本当に ＿＿＿しました。", ["ほっと", "ぞっと", "じっと", "さっと"], 0, "「ほっとする」: nhẹ nhõm.", { translation: "Đỗ kỳ thi, tôi thật sự nhẹ nhõm." }),
    mc("この 問題は ＿＿＿で、だれにも わからない。", ["かんたん", "ていねい", "ふくざつ", "たいくつ"], 2, "「複雑」: phức tạp.", { translation: "Vấn đề này phức tạp, không ai hiểu được." }),
    mc("「たまたま」に 意味が 最も 近い ものは？", ["必ず", "いつも", "わざと", "偶然"], 3, "「たまたま」 ≈ 「偶然」: tình cờ."),
    mc("レポートを 金曜日までに ＿＿＿して ください。", ["提案", "提出", "発見", "出発"], 1, "Nộp báo cáo: 「提出する」.", { translation: "Hãy nộp báo cáo trước thứ Sáu." }),
  ],
  g: [
    mc("雨が 降った＿＿＿、試合は 中止に なった。", ["せいで", "おかげで", "うちに", "とおりに"], 0, "Nguyên nhân dẫn đến kết quả xấu: 「〜せいで」.", { translation: "Tại trời mưa nên trận đấu bị hủy." }),
    mc("先生の アドバイスの ＿＿＿、合格できました。", ["せいで", "おかげで", "ために", "ように"], 1, "Nguyên nhân dẫn đến kết quả tốt: 「〜おかげで」.", { translation: "Nhờ lời khuyên của thầy mà tôi đã đỗ." }),
    mc("この 仕事は 経験＿＿＿、だれでも できます。", ["によって", "にとって", "について", "に関わらず"], 3, "「〜に関わらず」: bất kể ~.", { translation: "Công việc này ai cũng làm được, bất kể kinh nghiệm." }),
    mc("子どもに＿＿＿、この 本は 少し 難しい。", ["ついて", "よって", "とって", "対して"], 2, "「〜にとって」: đối với ~ (lập trường đánh giá).", { translation: "Đối với trẻ em, quyển sách này hơi khó." }),
    mc("日本に 来た＿＿＿、日本語が 全然 話せなかった。", ["ばかりの ころは", "ところで", "ついでに", "とたんに"], 0, "「Vた ばかりの ころは」: hồi mới ~.", { translation: "Hồi mới sang Nhật, tôi hoàn toàn không nói được tiếng Nhật." }),
    mc("ドアを 開けた＿＿＿、猫が 飛び込んで きた。", ["うちに", "とたん", "あいだに", "までに"], 1, "「Vた とたん」: vừa ~ thì ngay lập tức.", { translation: "Vừa mở cửa thì con mèo lao vào." }),
    mc("この 薬は 一日 3回、食後に 飲む＿＿＿に なって いる。", ["こと", "もの", "はず", "わけ"], 0, "Quy định: 「〜ことに なって いる」.", { translation: "Thuốc này được quy định uống 3 lần/ngày sau bữa ăn." }),
    mc("毎日 練習した＿＿＿、上手に なった。", ["わりに", "くせに", "だけあって", "ものの"], 2, "「〜だけあって」: quả đúng là vì ~ nên.", { translation: "Đúng là vì luyện tập mỗi ngày nên đã giỏi lên." }),
  ],
  r: [
    mc("<p>最近、自転車で 通勤する 人が 増えて いる。満員電車を 避けられる うえに、運動不足の 解消にも なるからだ。しかし、雨の 日は 使えないし、駐輪場が 足りない という 問題も ある。</p>自転車通勤の 問題点として 正しい ものは どれか。", ["運動不足に なる", "駐輪場が 足りない", "満員電車に 乗らなければ ならない", "お金が かかる"], 1, "Đoạn văn nêu vấn đề: ngày mưa không dùng được và thiếu bãi đỗ xe đạp."),
    mc("<p>私は 子どものころ、野菜が 大嫌いだった。特に にんじんは 見るのも 嫌だった。ところが、大学生に なって 自分で 料理を するように なってから、野菜の おいしさが わかるように なった。今では 毎日 野菜を たくさん 食べて いる。</p>この 人が 野菜を 好きに なった きっかけは 何か。", ["親に 言われた こと", "病気に なった こと", "自分で 料理を するように なった こと", "にんじんを 育てた こと"], 2, "Từ khi tự nấu ăn mới hiểu vị ngon của rau."),
    mc("<p>【お知らせ】マンションの 水道工事の ため、10月5日（土）午前9時から 午後3時まで 断水します。ご不便を おかけしますが、ご協力 お願いします。必要な 水は 前日までに ご用意ください。</p>住民は 何を する 必要が あるか。", ["工事を 手伝う", "4日までに 水を 用意する", "5日に 管理人に 連絡する", "午後3時まで 家に いる"], 1, "「必要な水は前日までにご用意ください」 — trước ngày 5, tức đến ngày 4."),
  ],
  l: [
    lq("女：課長、明日の 出張ですが、新幹線の 切符は もう 買って ありますか。 男：いや、まだなんだ。悪いけど、午後 買って おいて くれる？ 8時台の のぞみで。 女：はい、わかりました。", "女の 人は この後 まず 何を しますか。", ["出張の 準備を する", "新幹線の 切符を 買う", "ホテルを 予約する", "課長に 電話する"], 1, "Trưởng phòng nhờ mua vé Shinkansen."),
    lq("男：この間 話して いた 料理教室、行って みた？ 女：うん。先生の 説明は わかりやすかったんだけど、一人で 作る 時間が 短くて、ちょっと 物足りなかったな。", "女の 人は 料理教室に ついて 何が 不満でしたか。", ["先生の 説明が わかりにくい", "値段が 高い", "一人で 作る 時間が 短い", "場所が 遠い"], 2, "Thời gian tự nấu ngắn nên thấy chưa đủ (物足りない)."),
    lq("女：すみません、この 本、来週の 月曜日まで 借りたいんですが。 男：こちらは 予約が 入って いるので、延長は できないんです。今週の 金曜日までに 返して ください。", "女の 人は いつまでに 本を 返しますか。", ["今週の 金曜日", "来週の 月曜日", "今日", "来週の 金曜日"], 0, "Sách đã có người đặt nên phải trả trước thứ Sáu tuần này."),
    lq("男：引っ越し、どうして 駅から 遠い 所に したの？ 女：家賃は 前と あまり 変わらないんだけど、部屋が 広いし、静かだからね。通勤には 少し 時間が かかるけど。", "女の 人が 引っ越した 一番の 理由は 何ですか。", ["家賃が 安いから", "駅に 近いから", "部屋が 広くて 静かだから", "会社に 近いから"], 2, "Tiền thuê không đổi; lý do là phòng rộng và yên tĩnh."),
    lq("女：明日の 説明会、何時に 集まれば いい？ 男：始まるのは 10時だけど、受付が 混むから、9時半には 来て おいて。 女：わかった。", "女の 人は 何時に 行きますか。", ["10時", "9時", "10時半", "9時半"], 3, "Bắt đầu 10 giờ nhưng nên đến lúc 9 giờ rưỡi vì quầy lễ tân đông."),
  ],
};

// ============================== N2 ==============================
const N2: Pools = {
  v: [
    yomi("会社の 経営を <u>改善</u>する。", "改善", ["かいぜん", "かいせん", "がいぜん", "かいねん"], 0, "Cải thiện việc kinh doanh của công ty."),
    yomi("<u>柔軟</u>な 考え方が 必要だ。", "柔軟", ["にゅうなん", "じゅうなん", "じゅうたん", "やわなん"], 1, "Cần có cách suy nghĩ linh hoạt."),
    yomi("被災地への 寄付を <u>募る</u>。", "募る", ["しぼる", "ほこる", "つのる", "こもる"], 2, "Kêu gọi quyên góp cho vùng bị thiên tai."),
    mc("彼の 意見は ＿＿＿で、何を 言いたいのか よく わからない。", ["めいかく", "てきせつ", "せいかく", "あいまい"], 3, "「曖昧」: mơ hồ.", { translation: "Ý kiến của anh ấy mơ hồ, không rõ muốn nói gì." }),
    mc("新製品の 売り上げは 予想を 大きく ＿＿＿。", ["上回った", "上がった", "増やした", "高まった"], 0, "「予想を上回る」: vượt dự đoán.", { translation: "Doanh số sản phẩm mới đã vượt xa dự đoán." }),
    mc("「ささやかな」に 意味が 最も 近い ものは？", ["豪華な", "小さな", "大切な", "静かな"], 1, "「ささやかな」 ≈ nhỏ bé, khiêm tốn."),
  ],
  g: [
    mc("この 店は 味は ＿＿＿、サービスも すばらしい。", ["もとより", "ともかく", "かぎり", "ぬきで"], 0, "「AはもとよりBも」: A thì đương nhiên, B cũng.", { translation: "Quán này hương vị thì khỏi nói, dịch vụ cũng tuyệt vời." }),
    mc("彼は 忙しい＿＿＿、いつも 手伝って くれる。", ["からといって", "ものなら", "ことから", "にもかかわらず"], 3, "「〜にもかかわらず」: mặc dù.", { translation: "Mặc dù bận, anh ấy luôn giúp đỡ tôi." }),
    mc("社長の 許可なし＿＿＿、この 部屋には 入れない。", ["には", "では", "にも", "とは"], 0, "「Nなしには〜ない」: không có N thì không thể.", { translation: "Không có sự cho phép của giám đốc thì không thể vào phòng này." }),
    mc("試験の 結果＿＿＿、進学先を 決める つもりだ。", ["ばかりに", "次第で", "くせに", "からには"], 1, "「N次第で」: tùy vào N.", { translation: "Tôi định quyết định trường học tiếp tùy vào kết quả thi." }),
    mc("約束した＿＿＿、最後まで やりぬく べきだ。", ["ものの", "わりに", "からには", "とたん"], 2, "「〜からには」: một khi đã ~ thì.", { translation: "Một khi đã hứa thì phải làm đến cùng." }),
    mc("あの 人の こと＿＿＿、きっと うまく やるだろう。", ["だから", "だけど", "なので", "なのに"], 0, "「Nのことだから」: vì là N (tính cách đã biết) nên.", { translation: "Người đó thì chắc chắn sẽ làm tốt thôi." }),
  ],
  r: [
    mc("<p>情報があふれる現代では、多くの情報を集めることより、必要な情報を選ぶ力のほうが大切だ。インターネットで検索すれば、すぐに大量の答えが見つかる。しかし、そのすべてが正しいとは限らない。情報の出どころを確かめ、自分の頭で考える習慣を持ちたいものだ。</p>筆者が最も言いたいことは何か。", ["情報はできるだけ多く集めるべきだ", "インターネットは使わないほうがいい", "情報を選び、自分で考える力が大切だ", "検索の技術を身につけるべきだ"], 2, "Tác giả nhấn mạnh năng lực chọn lọc thông tin và tự suy nghĩ."),
    mc("<p>各位<br>来月から、会議室の予約方法が変わります。これまでは総務部に電話で申し込んでいましたが、今後は社内システムから各自で予約してください。なお、キャンセルする場合は、前日の17時までにシステム上で手続きをお願いします。<br>総務部</p>このメールで伝えたいことは何か。", ["会議室の数が増えること", "会議室はシステムで各自予約すること", "キャンセルは電話ですること", "総務部が場所を移ること"], 1, "Từ tháng sau mỗi người tự đặt phòng họp qua hệ thống nội bộ."),
    mc("<p>失敗を恐れて何もしない人は、確かに失敗はしない。しかし、それでは何も得られない。失敗から学ぶことは、成功から学ぶことよりも多いと言われる。大切なのは、失敗した後にその原因を考え、次に生かすことである。</p>筆者によると、大切なことは何か。", ["失敗しないように注意すること", "成功した人をまねること", "何もしないこと", "失敗の原因を考えて次に生かすこと"], 3, "「大切なのは、失敗した後にその原因を考え、次に生かすこと」."),
  ],
  l: [
    lq("男：来週のプレゼン資料、どこまで進んだ？ 女：データの分析は終わったんですが、グラフがまだで…。 男：じゃあ、グラフは僕がやるから、君は結論の部分をまとめてくれる？ 女：わかりました。", "女の人はこの後何をしますか。", ["データを分析する", "グラフを作る", "結論をまとめる", "資料を印刷する"], 2, "Người đàn ông làm biểu đồ, người phụ nữ tóm tắt phần kết luận."),
    lq("女：新しいスマホ、どう？ 男：カメラはきれいだし、動きも速いんだけど、電池の持ちがね…。一日もたないんだよ。", "男の人は新しいスマホの何に不満がありますか。", ["電池の持ち", "カメラ", "動きの速さ", "値段"], 0, "Pin không dùng được hết một ngày."),
    lq("男：駅前に新しくできたカフェ、行ってみた？ 女：うん、コーヒーはまあまあだったけど、ケーキが本当においしくて。あれを食べるためだけに、また行きたいくらい。", "女の人はカフェについてどう思っていますか。", ["コーヒーがとてもおいしい", "ケーキがとてもおいしい", "店が狭い", "値段が高い"], 1, "Cà phê bình thường (まあまあ), bánh thì rất ngon."),
    lq("女：部長、明日の会議ですが、取引先の都合で午後2時からに変更になりました。 男：そうか。じゃあ、午前中の打ち合わせは予定どおりでいいね。 女：はい、10時からで大丈夫です。", "明日の会議は何時からになりましたか。", ["10時", "午後2時", "午後1時", "午後3時"], 1, "Cuộc họp đổi sang 2 giờ chiều; 10 giờ là buổi trao đổi buổi sáng."),
    lq("男：最近、朝早く起きて勉強してるんだって？ 女：そう。夜は疲れて集中できないから。朝なら静かだし、頭もすっきりしてるしね。", "女の人が朝勉強する理由は何ですか。", ["夜は仕事があるから", "家族に言われたから", "朝は静かで頭がすっきりしているから", "朝の方が時間が長いから"], 2, "Buổi sáng yên tĩnh và đầu óc tỉnh táo."),
  ],
};

// ============================== N1 ==============================
const N1: Pools = {
  v: [
    yomi("政府は 事態の <u>収拾</u>を 図った。", "収拾", ["しゅうしゅう", "しゅうじゅう", "しゅっしゅう", "しゅうしゃ"], 0, "Chính phủ đã tìm cách ổn định tình hình."),
    yomi("資金不足で 計画が <u>頓挫</u>した。", "頓挫", ["どんざ", "とんざ", "とんさ", "とんじ"], 1, "Kế hoạch bị đình trệ do thiếu vốn."),
    yomi("<u>拙い</u> 文章ですが、ご一読ください。", "拙い", ["はかない", "あぶない", "つたない", "いとけない"], 2, "Bài viết còn vụng về nhưng mong anh chị đọc qua."),
    mc("彼は 何を 言われても ＿＿＿として 動じなかった。", ["騒然", "呆然", "漠然", "平然"], 3, "「平然と」: điềm nhiên, thản nhiên.", { translation: "Dù bị nói gì, anh ấy vẫn điềm nhiên không dao động." }),
    mc("「おもむろに」の 意味に 最も 近い ものは？", ["突然", "ゆっくりと", "こっそり", "すぐに"], 1, "「おもむろに」 nghĩa là chậm rãi, thong thả (không phải “đột nhiên”)."),
    mc("両社の 主張は ＿＿＿で、話し合いは まとまらなかった。", ["平行線", "一直線", "水平線", "地平線"], 0, "「平行線をたどる」: hai bên không tìm được điểm chung.", { translation: "Lập trường hai công ty song song không gặp nhau nên cuộc đàm phán không đi đến thống nhất." }),
  ],
  g: [
    mc("彼の 才能は 努力＿＿＿ 開花しなかっただろう。", ["なくしては", "ならでは", "をもって", "とあって"], 0, "「Nなくしては〜ない」: nếu không có N thì không thể.", { translation: "Nếu không có nỗ lực, tài năng của anh ấy hẳn đã không nở rộ." }),
    mc("この 料理は 京都＿＿＿の 味だ。", ["なりに", "ながら", "ならでは", "まじき"], 2, "「Nならではの」: chỉ N mới có.", { translation: "Món này là hương vị chỉ Kyoto mới có." }),
    mc("教師に＿＿＿ 行為として、厳しく 批判された。", ["たる", "ならでは", "かたがた", "あるまじき"], 3, "「Nにあるまじき」: không thể chấp nhận đối với N.", { translation: "Bị chỉ trích gay gắt vì là hành vi không thể chấp nhận ở một giáo viên." }),
    mc("本日を＿＿＿、受付を 終了いたします。", ["かぎって", "もって", "おいて", "めぐって"], 1, "「Nをもって」: lấy N làm mốc (trang trọng).", { translation: "Chúng tôi xin kết thúc việc tiếp nhận kể từ hôm nay." }),
    mc("彼は 社長の 前で＿＿＿ばかりに 頭を 下げた。", ["土下座せん", "土下座する", "土下座した", "土下座しない"], 0, "「Vない(bỏ ない)+ん ばかりに」 (する → せんばかりに): như thể sắp ~ đến nơi.", { translation: "Anh ta cúi đầu trước giám đốc như thể sắp quỳ rạp xuống." }),
    mc("大雨＿＿＿、試合は 予定どおり 行われた。", ["にかこつけて", "とばかりに", "をものともせず", "をかわきりに"], 2, "「Nをものともせず」: bất chấp N, không coi N ra gì.", { translation: "Bất chấp mưa lớn, trận đấu vẫn diễn ra theo kế hoạch." }),
  ],
  r: [
    mc("<p>便利さを追求するあまり、私たちは「待つ」ことができなくなっているのではないか。注文した品は翌日に届き、知りたいことは数秒で調べられる。だが、待つ時間の中にこそ、期待をふくらませたり、物事をじっくり考えたりする余地があったはずだ。効率だけを物差しにすると、その豊かさを見失いかねない。</p>筆者の考えに合うものはどれか。", ["便利さの追求は止めるべきだ", "待つ時間には独自の価値がある", "効率を最優先すべきだ", "調べ物は時間をかけるべきではない"], 1, "Tác giả cho rằng thời gian chờ đợi có giá trị riêng (kỳ vọng, suy ngẫm)."),
    mc("<p>専門家の言葉は重い。しかし、専門家であっても、自分の専門外のことについては一般の人と大差ない場合が多い。にもかかわらず、肩書きがあるというだけで、その発言が無条件に信用されてしまうことがある。発言の中身を、肩書きと切り離して吟味する姿勢が求められる。</p>筆者が問題にしているのは何か。", ["専門家の数が少ないこと", "専門家が発言しないこと", "肩書きだけで発言が信用されてしまうこと", "一般の人が意見を言わないこと"], 2, "Vấn đề là phát ngôn được tin chỉ vì danh hiệu, chức danh."),
    mc("<p>言葉は時代とともに変化する。新しい言い方を「誤用」と切り捨てるのはたやすいが、かつての誤用が今では標準となった例は枚挙にいとまがない。大切なのは、変化を一方的に否定することではなく、その背景にある人々の感覚の移り変わりに目を向けることだろう。</p>筆者の主張として最も適切なものはどれか。", ["誤用は厳しく正すべきだ", "新しい言い方は使うべきではない", "標準語を守ることが最も大切だ", "言葉の変化の背景に目を向けるべきだ"], 3, "Tác giả chủ trương nhìn vào sự thay đổi cảm nhận của con người đằng sau biến đổi ngôn ngữ."),
  ],
  l: [
    lq("女：今回の企画、予算が足りないって経理から言われちゃって。 男：だったら、全部削るんじゃなくて、広告費を抑えて、そのぶんイベントの内容を充実させたらどうかな。 女：なるほど、それなら上も納得してくれそう。", "女の人はこの後、企画をどう修正しますか。", ["企画を中止する", "広告費を抑えてイベントを充実させる", "予算を増やしてもらう", "イベントを小さくする"], 1, "Cắt giảm chi phí quảng cáo, dồn vào nội dung sự kiện."),
    lq("男：あの映画、評判ほどじゃなかったね。 女：映像は確かに見事だったけど、話の展開が読めちゃって。結末も予想どおりだったし。", "女の人は映画のどこに不満でしたか。", ["映像", "俳優の演技", "話の展開と結末", "上映時間"], 2, "Diễn biến dễ đoán và kết thúc như dự đoán; hình ảnh thì đẹp."),
    lq("女：在宅勤務になって、通勤の負担はなくなったけど、同僚とのちょっとした雑談がなくなって、かえってアイデアが出にくくなった気がするんだ。", "女の人は在宅勤務について何と言っていますか。", ["雑談が減ってアイデアが出にくくなった", "通勤が大変になった", "仕事の量が増えた", "同僚との連絡が多すぎる"], 0, "Mất những cuộc trò chuyện nhỏ nên khó nảy ra ý tưởng."),
    lq("男：新人の山田君、報告書の書き方がずいぶん良くなったね。 女：ええ。最初は結論が最後にあって読みにくかったんですが、先に結論を書くように伝えたら、すぐ直してくれました。", "山田君の報告書はどう変わりましたか。", ["文章が短くなった", "結論を先に書くようになった", "図表が増えた", "提出が早くなった"], 1, "Cậu ấy đã viết kết luận lên đầu."),
    lq("女：この地域では、空き家を改装して、若い人向けのシェアオフィスにする取り組みが進んでいます。家賃が安いことから、都市部から移住する人も増えているそうです。", "移住する人が増えている理由は何ですか。", ["交通が便利だから", "仕事が多いから", "家賃が安いから", "自然が豊かだから"], 2, "「家賃が安いことから」 — vì tiền thuê rẻ."),
  ],
};

/* ------------------------------------------------------------------ */
/* Ghép đề                                                             */
/* ------------------------------------------------------------------ */

const LEVELS_META = {
  N5: { pools: N5, per: [4, 4, 2, 2], minutes: 60, idx: 0 },
  N4: { pools: N4, per: [4, 4, 2, 2], minutes: 75, idx: 1 },
  N3: { pools: N3, per: [3, 3, 1, 2], minutes: 105, idx: 2 },
  N2: { pools: N2, per: [2, 2, 1, 2], minutes: 125, idx: 3 },
  N1: { pools: N1, per: [2, 2, 1, 2], minutes: 130, idx: 4 },
} as const;

/** Lấy n câu cho đề thứ k (xoay vòng → mỗi câu dùng tối đa 2 đề). */
function take(pool: BankQ[], k: number, n: number, sec: keyof typeof SEC): BankQ[] {
  return Array.from({ length: n }, (_, j) => {
    const q = pool[(k * n + j) % pool.length];
    return { ...q, hint: q.hint ?? h(SEC[sec], TIP[sec], "", "") };
  });
}

function difficultyOf(level: keyof typeof LEVELS_META, k: number): QuizSeed["difficulty"] {
  if (level === "N5") return k < 3 ? "easy" : "medium";
  if (level === "N4") return k < 2 ? "easy" : "medium";
  if (level === "N3") return "medium";
  return "hard";
}

export const JLPT: QuizSeed[] = (Object.keys(LEVELS_META) as (keyof typeof LEVELS_META)[]).flatMap((level) => {
  const m = LEVELS_META[level];
  return Array.from({ length: 5 }, (_, k): QuizSeed => ({
    slug: `jlpt-${level.toLowerCase()}-de-${k + 1}`,
    kind: "jlpt",
    title: `JLPT ${level} – Bộ đề số ${k + 1}`,
    description: `Đề luyện thi JLPT ${level} theo cấu trúc mới: từ vựng, ngữ pháp, đọc hiểu và nghe hiểu.`,
    level,
    skill: "jlpt",
    topic: null,
    difficulty: difficultyOf(level, k),
    durationMin: m.minutes,
    emoji: "📝",
    tone: "from-brand-50 to-rose-50",
    passScore: level === "N5" || level === "N4" ? 60 : 65,
    createdDaysAgo: 10 + (m.idx * 5 + k) * 7,
    popularity: Math.max(15, 80 - m.idx * 12 - k * 5),
    questions: [
      ...take(m.pools.v, k, m.per[0], "v"),
      ...take(m.pools.g, k, m.per[1], "g"),
      ...take(m.pools.r, k, m.per[2], "r"),
      ...take(m.pools.l, k, m.per[3], "l"),
    ],
  }));
});
