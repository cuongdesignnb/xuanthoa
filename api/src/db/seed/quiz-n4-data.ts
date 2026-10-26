/** Một đoạn câu: chuỗi thường, [chữ Hán, furigana], hoặc "_" là chỗ trống. */
export type Seg = string | [string, string];

export type Scene = {
  /** Lớp gradient Tailwind cho nền minh họa. */
  bg: string;
  /** Biển hiệu nhỏ trong cảnh. */
  sign: string;
  seeds: [string, string];
  props: string[];
};

export type Question = {
  sentence: Seg[];
  vi: string;
  options: string[];
  answer: number;
  hint: { title: string; desc: string; ex: Seg[]; exVi: string };
  short: string;
  detail: string;
  scene: Scene;
};

const sc = (bg: string, sign: string, props: string[], seeds: [string, string] = ["Hana", "Yui"]): Scene => ({
  bg,
  sign,
  props,
  seeds,
});

export const QUESTIONS: Question[] = [
  {
    sentence: [["雨", "あめ"], "が", ["降", "ふ"], "っている", "_", "、", ["傘", "かさ"], "を", ["持", "も"], "って", ["行", "い"], "きます。"],
    vi: "Vì trời đang mưa nên tôi mang ô theo.",
    options: ["から", "けど", "のに", "ても"],
    answer: 0,
    hint: {
      title: "Vì… nên…",
      desc: "「〜から」 nối mệnh đề chỉ lý do với mệnh đề kết quả.",
      ex: [["暑", "あつ"], "いから、", ["窓", "まど"], "を", ["開", "あ"], "けます。"],
      exVi: "Vì nóng nên tôi mở cửa sổ.",
    },
    short: "「から」 chỉ lý do: “vì trời mưa nên mang ô”.",
    detail:
      "「普通形 + から」 diễn tả nguyên nhân mang tính chủ quan của người nói. 「けど」 và 「のに」 mang nghĩa trái ngược (nhưng / thế mà), còn 「ても」 là “dù… cũng”, nên không hợp với câu này.",
    scene: sc("from-sky-300 via-slate-300 to-indigo-300", "雨 RAIN", ["☂️", "🌧️"], ["Kenji", "Hana"]),
  },
  {
    sentence: [["日本語", "にほんご"], "が", ["話", "はな"], "せる", "_", "なりました。"],
    vi: "Tôi đã trở nên có thể nói được tiếng Nhật.",
    options: ["ように", "ために", "ことに", "そうに"],
    answer: 0,
    hint: {
      title: "Trở nên (thay đổi năng lực)",
      desc: "「V可能形 + ようになる」 diễn tả sự thay đổi dần dần về khả năng hay thói quen.",
      ex: [["泳", "およ"], "げるようになりました。"],
      exVi: "Tôi đã biết bơi rồi.",
    },
    short: "「ようになる」: “trở nên có thể làm gì đó”.",
    detail:
      "Sau động từ thể khả năng, ta dùng 「ようになる」 để nói về sự thay đổi trạng thái theo thời gian. 「ことになる」 là “được quyết định (khách quan)”, 「ために」 chỉ mục đích, 「そうに」 là “có vẻ”.",
    scene: sc("from-rose-200 via-amber-100 to-orange-200", "日本語 CLASS", ["📚", "🗣️"], ["Minh", "Sakura"]),
  },
  {
    sentence: [["先生", "せんせい"], "に", ["宿題", "しゅくだい"], "を", "_", "もらいました。"],
    vi: "Tôi đã được thầy giáo xem giúp bài tập.",
    options: ["見て", "見せて", "見る", "見た"],
    answer: 0,
    hint: {
      title: "Được ai đó làm giúp",
      desc: "「AにVてもらう」: người nói nhận hành động từ A.",
      ex: [["友", "とも"], "だちに", ["写真", "しゃしん"], "を", ["撮", "と"], "ってもらいました。"],
      exVi: "Tôi được bạn chụp ảnh giúp.",
    },
    short: "「見てもらう」: được (thầy) xem giúp.",
    detail:
      "「てもらう」 luôn đi với động từ thể て. Người thực hiện hành động là thầy giáo (見る), nên dùng 「見て」. 「見せて」 nghĩa là “cho xem” — khi đó chủ thể đổi khác.",
    scene: sc("from-emerald-200 via-teal-100 to-sky-200", "SCHOOL 学校", ["📝", "✅"], ["Sensei", "Yui"]),
  },
  {
    sentence: ["この", ["本", "ほん"], "は", "_", "やすいです。"],
    vi: "Quyển sách này dễ đọc.",
    options: ["読み", "読む", "読んで", "読ま"],
    answer: 0,
    hint: {
      title: "Dễ làm gì",
      desc: "「Vます(bỏ ます) + やすい」 nghĩa là dễ làm việc đó.",
      ex: ["この", ["靴", "くつ"], "は", ["歩", "ある"], "きやすい。"],
      exVi: "Đôi giày này dễ đi.",
    },
    short: "「読みやすい」: dễ đọc.",
    detail: "Ghép thân động từ thể ます (読み) với 「やすい」 (dễ) hoặc 「にくい」 (khó). Các dạng 読む / 読んで / 読ま không ghép được với やすい.",
    scene: sc("from-amber-200 via-yellow-100 to-orange-200", "BOOK 本屋", ["📖", "☕"], ["Aoi", "Ren"]),
  },
  {
    sentence: [["窓", "まど"], "が", "_", "あります。"],
    vi: "Cửa sổ đã được (ai đó) mở sẵn.",
    options: ["開けて", "開いて", "開けた", "開く"],
    answer: 0,
    hint: {
      title: "Trạng thái do có người làm",
      desc: "「Nが Vて(tha động từ) + ある」 diễn tả kết quả của hành động có chủ ý.",
      ex: [["壁", "かべ"], "に", ["絵", "え"], "が", ["掛", "か"], "けてあります。"],
      exVi: "Trên tường có treo bức tranh.",
    },
    short: "「開けてある」: đã được mở sẵn (có chủ ý).",
    detail: "「てある」 đi với tha động từ (開ける). Với tự động từ (開く) ta dùng 「開いている」 để chỉ trạng thái đơn thuần, không nhấn mạnh người làm.",
    scene: sc("from-sky-200 via-cyan-100 to-emerald-200", "HOME 家", ["🪟", "🌤️"], ["Daichi", "Mai"]),
  },
  {
    sentence: [["明日", "あした"], "、", ["雨", "あめ"], "が", ["降", "ふ"], "る", "_", "しれません。"],
    vi: "Ngày mai có lẽ trời sẽ mưa.",
    options: ["かも", "はず", "そう", "よう"],
    answer: 0,
    hint: {
      title: "Có lẽ / không chừng",
      desc: "「普通形 + かもしれない」 diễn tả khả năng xảy ra khoảng 50%.",
      ex: [["彼", "かれ"], "は", ["来", "こ"], "ないかもしれません。"],
      exVi: "Có lẽ anh ấy sẽ không đến.",
    },
    short: "「かもしれない」: có lẽ, không chừng.",
    detail: "Chỉ có 「かも」 ghép được với 「しれません」. 「はず」 là “chắc chắn”, 「そう」 là “có vẻ / nghe nói”, 「よう」 là “hình như”.",
    scene: sc("from-slate-300 via-sky-200 to-indigo-200", "天気 WEATHER", ["⛅", "🌂"], ["Sora", "Kenji"]),
  },
  {
    sentence: [["週末", "しゅうまつ"], "は", ["友", "とも"], "だち", "_", ["映画", "えいが"], "を", ["見", "み"], "に", ["行", "い"], "きました。"],
    vi: "Cuối tuần, tôi đã đi xem phim cùng với bạn.",
    options: ["に", "で", "と", "から"],
    answer: 2,
    hint: {
      title: "Với (cùng với ai)",
      desc: "「〜と」 được dùng để diễn tả làm gì đó cùng với ai đó.",
      ex: [["友", "とも"], "だちと", ["ご飯", "ごはん"], "を", ["食", "た"], "べます。"],
      exVi: "Tôi ăn cơm cùng với bạn.",
    },
    short: "「と」 diễn tả “cùng với ai”. Câu này có nghĩa là “đi xem phim cùng với bạn”.",
    detail:
      "Trợ từ 「と」 đứng sau danh từ chỉ người để nói “cùng với”. 「に」 chỉ đích đến/đối tượng, 「で」 chỉ nơi chốn/phương tiện, 「から」 chỉ điểm xuất phát. Mẫu 「Vます(bỏ ます) + に行く」 trong câu nghĩa là “đi để làm gì”.",
    scene: sc("from-[#2a1530] via-[#5b1d3a] to-[#c2410c]", "CINEMA 映画館", ["🍿", "🥤"], ["Hana", "Yui"]),
  },
  {
    sentence: [["宿題", "しゅくだい"], "を", ["忘", "わす"], "れない", "_", "してください。"],
    vi: "Hãy cố gắng để không quên bài tập về nhà.",
    options: ["ように", "ために", "そうに", "ことに"],
    answer: 0,
    hint: {
      title: "Cố gắng để (không)…",
      desc: "「Vる / Vない + ようにする」 diễn tả nỗ lực duy trì một thói quen.",
      ex: ["毎日", ["野菜", "やさい"], "を", ["食", "た"], "べるようにしています。"],
      exVi: "Tôi cố gắng ăn rau mỗi ngày.",
    },
    short: "「ないようにする」: cố gắng để không…",
    detail: "「ようにする」 nói về sự cố gắng có ý thức. 「ために」 không đi được với động từ phủ định chỉ trạng thái như 忘れない trong cấu trúc này, và 「ことにする」 nghĩa là “quyết định làm”.",
    scene: sc("from-violet-200 via-pink-100 to-rose-200", "STUDY 勉強", ["🎒", "⏰"], ["Ren", "Aoi"]),
  },
  {
    sentence: [["母", "はは"], "に", ["野菜", "やさい"], "を", ["食", "た"], "べ", "_", "。"],
    vi: "Tôi bị mẹ bắt ăn rau.",
    options: ["させられました", "させました", "られました", "ています"],
    answer: 0,
    hint: {
      title: "Bị bắt làm gì (thể sai khiến bị động)",
      desc: "「Vさせられる」: người nói bị ép làm việc mình không muốn.",
      ex: [["部長", "ぶちょう"], "に", ["お酒", "おさけ"], "を", ["飲", "の"], "まされました。"],
      exVi: "Tôi bị trưởng phòng bắt uống rượu.",
    },
    short: "「食べさせられる」: bị bắt ăn.",
    detail: "Thể sai khiến bị động = sai khiến (食べさせる) + bị động (られる). Chủ ngữ là người bị ép buộc, người ép đi với 「に」.",
    scene: sc("from-lime-200 via-emerald-100 to-amber-100", "KITCHEN 台所", ["🥦", "🥕"], ["Mama", "Daichi"]),
  },
  {
    sentence: [["電車", "でんしゃ"], "に", ["乗", "の"], "る", "_", "、", ["切符", "きっぷ"], "を", ["買", "か"], "います。"],
    vi: "Trước khi lên tàu, tôi mua vé.",
    options: ["前に", "後で", "ながら", "うちに"],
    answer: 0,
    hint: {
      title: "Trước khi…",
      desc: "「Vる + 前に」: làm việc B trước khi làm việc A.",
      ex: [["寝", "ね"], "る", ["前", "まえ"], "に", ["歯", "は"], "を", ["磨", "みが"], "きます。"],
      exVi: "Tôi đánh răng trước khi ngủ.",
    },
    short: "「乗る前に」: trước khi lên tàu.",
    detail: "「前に」 luôn đi sau động từ thể từ điển. 「後で」 đi sau thể た (乗った後で), 「ながら」 đi với thân động từ ます.",
    scene: sc("from-sky-200 via-slate-100 to-emerald-200", "駅 STATION", ["🚃", "🎫"], ["Kenji", "Mai"]),
  },
  {
    sentence: [["音楽", "おんがく"], "を", ["聞", "き"], "き", "_", ["勉強", "べんきょう"], "します。"],
    vi: "Tôi vừa nghe nhạc vừa học bài.",
    options: ["ながら", "まま", "たり", "し"],
    answer: 0,
    hint: {
      title: "Vừa… vừa…",
      desc: "「Vます(bỏ ます) + ながら」: hai hành động diễn ra đồng thời.",
      ex: [["歩", "ある"], "きながら", ["話", "はな"], "します。"],
      exVi: "Vừa đi vừa nói chuyện.",
    },
    short: "「聞きながら」: vừa nghe (nhạc) vừa…",
    detail: "Hành động chính đứng sau (勉強します), hành động phụ đứng trước ながら. 「まま」 là “giữ nguyên trạng thái”, 「たり」 dùng để liệt kê.",
    scene: sc("from-fuchsia-200 via-violet-100 to-sky-200", "MUSIC 音楽", ["🎧", "🎵"], ["Yui", "Sora"]),
  },
  {
    sentence: ["この", "ケーキ", "は", "おいし", "_", "です。"],
    vi: "Cái bánh này trông có vẻ ngon.",
    options: ["そう", "よう", "らしい", "みたい"],
    answer: 0,
    hint: {
      title: "Trông có vẻ…",
      desc: "「Aい(bỏ い) + そう」: phán đoán dựa trên vẻ bề ngoài.",
      ex: ["この", ["荷物", "にもつ"], "は", ["重", "おも"], "そうです。"],
      exVi: "Hành lý này trông có vẻ nặng.",
    },
    short: "「おいしそう」: trông có vẻ ngon.",
    detail: "Chỉ 「そう」 ghép trực tiếp với thân tính từ đuôi い đã bỏ い (おいし). 「よう」/「みたい」/「らしい」 cần dạng đầy đủ: おいしいようだ, おいしいらしい.",
    scene: sc("from-pink-200 via-rose-100 to-amber-100", "CAFÉ カフェ", ["🍰", "🍓"], ["Sakura", "Hana"]),
  },
  {
    sentence: [["財布", "さいふ"], "を", ["家", "いえ"], "に", ["忘", "わす"], "れて", "_", "。"],
    vi: "Tôi lỡ để quên ví ở nhà mất rồi.",
    options: ["しまいました", "おきました", "みました", "いきました"],
    answer: 0,
    hint: {
      title: "Lỡ… mất rồi",
      desc: "「Vて + しまう」 diễn tả sự tiếc nuối hoặc việc đã hoàn tất.",
      ex: [["電車", "でんしゃ"], "に", ["傘", "かさ"], "を", ["忘", "わす"], "れてしまいました。"],
      exVi: "Tôi lỡ quên ô trên tàu mất rồi.",
    },
    short: "「忘れてしまう」: lỡ quên mất.",
    detail: "「てしまう」 thể hiện cảm xúc tiếc nuối. 「ておく」 là làm sẵn, 「てみる」 là thử làm, 「ていく」 chỉ hướng/sự tiếp diễn.",
    scene: sc("from-amber-200 via-orange-100 to-rose-200", "SHOP お店", ["👛", "😱"], ["Ren", "Mai"]),
  },
  {
    sentence: [["旅行", "りょこう"], "の", ["前", "まえ"], "に", "ホテル", "を", ["予約", "よやく"], "して", "_", "。"],
    vi: "Trước chuyến du lịch, tôi đặt phòng khách sạn sẵn.",
    options: ["おきます", "しまいます", "みます", "あります"],
    answer: 0,
    hint: {
      title: "Làm sẵn, chuẩn bị trước",
      desc: "「Vて + おく」 diễn tả việc làm trước để chuẩn bị.",
      ex: [["会議", "かいぎ"], "の", ["前", "まえ"], "に", ["資料", "しりょう"], "を", ["読", "よ"], "んでおきます。"],
      exVi: "Tôi đọc tài liệu sẵn trước cuộc họp.",
    },
    short: "「予約しておく」: đặt trước, chuẩn bị sẵn.",
    detail: "Ngữ cảnh “trước chuyến du lịch” cho thấy hành động chuẩn bị, nên dùng 「ておく」. 「てある」 cần trợ từ が và chỉ trạng thái.",
    scene: sc("from-cyan-200 via-sky-100 to-indigo-200", "HOTEL ホテル", ["🧳", "🏨"], ["Aoi", "Kenji"]),
  },
  {
    sentence: [["日本", "にほん"], "へ", ["行", "い"], "った", "_", "があります。"],
    vi: "Tôi đã từng đến Nhật Bản.",
    options: ["こと", "もの", "ところ", "はず"],
    answer: 0,
    hint: {
      title: "Đã từng…",
      desc: "「Vた + ことがある」 diễn tả kinh nghiệm trong quá khứ.",
      ex: ["お", ["寿司", "すし"], "を", ["食", "た"], "べたことがあります。"],
      exVi: "Tôi đã từng ăn sushi.",
    },
    short: "「行ったことがある」: đã từng đi.",
    detail: "Mẫu kinh nghiệm cố định là 「Vた + ことがある」. Các danh từ khác như もの, ところ không tạo thành nghĩa “đã từng”.",
    scene: sc("from-rose-200 via-pink-100 to-sky-200", "JAPAN 日本", ["🗻", "🌸"], ["Minh", "Yui"]),
  },
  {
    sentence: [["弟", "おとうと"], "に", "ケーキ", "を", ["食", "た"], "べ", "_", "。"],
    vi: "Tôi bị em trai ăn mất bánh.",
    options: ["られました", "させました", "させられました", "ています"],
    answer: 0,
    hint: {
      title: "Bị động gây phiền",
      desc: "「Vられる」 diễn tả người nói chịu ảnh hưởng xấu từ hành động của người khác.",
      ex: ["雨", "に", ["降", "ふ"], "られました。"],
      exVi: "Tôi bị mắc mưa.",
    },
    short: "「食べられる」 (bị động): bị ăn mất.",
    detail: "Bị động gián tiếp diễn tả sự phiền toái. Người gây ra hành động (弟) đi với 「に」, chủ ngữ (tôi) là người chịu thiệt.",
    scene: sc("from-orange-200 via-amber-100 to-pink-200", "HOME 家", ["🎂", "😤"], ["Daichi", "Ren"]),
  },
  {
    sentence: [["時間", "じかん"], "がある", "_", "、", ["本", "ほん"], "を", ["読", "よ"], "みます。"],
    vi: "Khi có thời gian, tôi đọc sách.",
    options: ["とき", "まで", "ながら", "ばかり"],
    answer: 0,
    hint: {
      title: "Khi…",
      desc: "「普通形 + とき」 chỉ thời điểm xảy ra hành động.",
      ex: [["暇", "ひま"], "なとき、", ["映画", "えいが"], "を", ["見", "み"], "ます。"],
      exVi: "Khi rảnh, tôi xem phim.",
    },
    short: "「あるとき」: khi có (thời gian).",
    detail: "「とき」 nối mệnh đề chỉ thời điểm. 「まで」 là “cho đến khi”, 「ながら」 cần thân động từ ます, 「ばかり」 là “toàn là / vừa mới”.",
    scene: sc("from-emerald-200 via-lime-100 to-amber-100", "LIBRARY 図書館", ["📚", "🕰️"], ["Sora", "Sakura"]),
  },
  {
    sentence: ["この", "ボタン", "を", ["押", "お"], "す", "_", "、ドア", "が", ["開", "あ"], "きます。"],
    vi: "Hễ nhấn nút này thì cửa sẽ mở.",
    options: ["と", "のに", "けど", "まで"],
    answer: 0,
    hint: {
      title: "Hễ… thì…",
      desc: "「Vる + と」 diễn tả kết quả tất yếu, tự nhiên xảy ra.",
      ex: [["春", "はる"], "になると、", ["桜", "さくら"], "が", ["咲", "さ"], "きます。"],
      exVi: "Hễ đến mùa xuân là hoa anh đào nở.",
    },
    short: "「と」 chỉ kết quả tất yếu: hễ nhấn là cửa mở.",
    detail: "Điều kiện 「と」 dùng cho quy luật, cách vận hành máy móc, chỉ đường. 「のに」 và 「けど」 mang nghĩa đối lập, không hợp ngữ cảnh.",
    scene: sc("from-slate-200 via-zinc-100 to-sky-200", "OFFICE 会社", ["🚪", "🔘"], ["Mai", "Kenji"]),
  },
  {
    sentence: [["天気予報", "てんきよほう"], "に", "よる", "_", "、", ["明日", "あした"], "は", ["晴", "は"], "れるそうです。"],
    vi: "Theo dự báo thời tiết thì ngày mai trời sẽ nắng.",
    options: ["と", "で", "に", "も"],
    answer: 0,
    hint: {
      title: "Theo… thì",
      desc: "「Nによると、〜そうだ」 dẫn nguồn thông tin mình nghe được.",
      ex: ["ニュースによると、", ["事故", "じこ"], "があったそうです。"],
      exVi: "Theo tin tức thì đã xảy ra tai nạn.",
    },
    short: "「によると」: theo (nguồn tin)…",
    detail: "「によると / によれば」 luôn đi kèm với 「そうだ / らしい」 ở cuối câu để truyền đạt thông tin gián tiếp.",
    scene: sc("from-sky-300 via-amber-100 to-yellow-200", "NEWS ニュース", ["📺", "☀️"], ["Sora", "Aoi"]),
  },
  {
    sentence: [["山田", "やまだ"], "さんは", ["来", "く"], "る", "_", "です。", ["昨日", "きのう"], ["約束", "やくそく"], "しましたから。"],
    vi: "Anh Yamada chắc chắn sẽ đến. Vì hôm qua đã hứa rồi.",
    options: ["はず", "こと", "もの", "ため"],
    answer: 0,
    hint: {
      title: "Chắc chắn là…",
      desc: "「普通形 + はずだ」: suy đoán chắc chắn dựa trên căn cứ.",
      ex: [["荷物", "にもつ"], "は", ["明日", "あした"], ["届", "とど"], "くはずです。"],
      exVi: "Hành lý chắc chắn ngày mai sẽ tới.",
    },
    short: "「はず」: chắc chắn (có căn cứ là lời hứa).",
    detail: "Có căn cứ rõ ràng (đã hứa) nên người nói tin chắc, dùng 「はずだ」. 「ことだ」 là lời khuyên, 「ものだ」 là bản chất / hồi tưởng.",
    scene: sc("from-indigo-200 via-sky-100 to-emerald-100", "CAFÉ 喫茶店", ["⌚", "🤝"], ["Yamada", "Minh"]),
  },
];

/** Bài nghe liên quan bên cột phải. */
export const LISTENING = {
  text: "図書館で勉強します。",
  options: [
    [["図書館", "としょかん"], "に　", ["行", "い"], "きます。"],
    [["図書館", "としょかん"], "で　", ["勉強", "べんきょう"], "します。"],
    [["図書館", "としょかん"], "へ　", ["行", "い"], "きました。"],
    [["図書館", "としょかん"], "と　", ["行", "い"], "きます。"],
  ] as Seg[][],
  answer: 1,
  transcript: "女：明日はどこで勉強しますか。 男：図書館で勉強します。",
};
