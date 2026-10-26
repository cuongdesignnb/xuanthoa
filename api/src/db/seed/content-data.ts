/**
 * Dữ liệu blog cho seed 30-content.ts (không phải file seed — tên không bắt đầu bằng số).
 */

/** <ruby>漢字<rt>かんじ</rt></ruby> */
const r = (kanji: string, kana: string) => `<ruby>${kanji}<rt>${kana}</rt></ruby>`;
const ex = (ja: string, vi: string) => `<blockquote><p lang="ja">${ja}</p><p><em>${vi}</em></p></blockquote>`;

export type SeedPost = {
  slug: string;
  category: "ngu-phap" | "kanji" | "jlpt" | "van-hoa" | "meo" | "du-hoc";
  title: string;
  excerpt: string;
  author: string;
  /** Kiểu ảnh bìa vẽ sẵn ở client (components/blog/Cover.tsx). */
  cover: "grammar" | "kanji" | "jlpt" | "culture" | "tips" | "study" | "fuji" | "kana";
  daysAgo: number;
  views: number;
  featured?: boolean;
  guide?: boolean;
  status?: "draft" | "review" | "published";
  content: string;
};

export const SEED_POSTS: SeedPost[] = [
  {
    slug: "10-cau-truc-ngu-phap-n3-quan-trong",
    category: "ngu-phap",
    title: "10 cấu trúc ngữ pháp N3 quan trọng phải nắm vững",
    excerpt: "Tổng hợp các cấu trúc ngữ pháp thường gặp trong đề thi JLPT N3 kèm ví dụ dễ hiểu và bài tập vận dụng.",
    author: "mai",
    cover: "grammar",
    daysAgo: 4,
    views: 18420,
    content: `
<p>Ngữ pháp N3 là "cây cầu" nối giữa tiếng Nhật sơ cấp và trung cấp. Ở cấp độ này, đề thi bắt đầu dùng những mẫu câu mang sắc thái tinh tế hơn: diễn tả mục đích, nguyên nhân, sự thay đổi hay cảm xúc của người nói. Dưới đây là 10 cấu trúc xuất hiện nhiều nhất trong các đề JLPT N3 gần đây mà bạn nhất định phải nắm chắc.</p>
<h2>1. ～ように (để, sao cho)</h2>
<p>Dùng khi mục đích là một trạng thái <strong>không phụ thuộc hoàn toàn vào ý chí</strong> người nói, thường đi với động từ khả năng hoặc thể phủ định.</p>
${ex(`${r("忘", "わす")}れないように、メモを${r("書", "か")}きます。`, "Tôi ghi chú lại để không quên.")}
<h2>2. ～ために (để, vì)</h2>
<p>Ngược với ～ように, ～ために đi với động từ ý chí và chủ ngữ hai vế phải giống nhau. Khi đi với danh từ + の, nó còn mang nghĩa "vì, do".</p>
${ex(`${r("日本", "にほん")}で${r("働", "はたら")}くために、${r("日本語", "にほんご")}を${r("勉強", "べんきょう")}しています。`, "Tôi đang học tiếng Nhật để làm việc ở Nhật.")}
<h2>3. ～ても (dù… cũng)</h2>
${ex(`${r("雨", "あめ")}が${r("降", "ふ")}っても、${r("試合", "しあい")}は${r("行", "おこな")}われます。`, "Dù trời mưa, trận đấu vẫn được tổ chức.")}
<h2>4. ～ながら (vừa… vừa)</h2>
<p>Hai hành động diễn ra đồng thời, hành động chính đặt ở vế sau.</p>
${ex(`${r("音楽", "おんがく")}を${r("聞", "き")}きながら、${r("走", "はし")}ります。`, "Tôi vừa nghe nhạc vừa chạy bộ.")}
<h2>5–10. Các mẫu câu không thể bỏ qua</h2>
<ul>
<li><strong>～ようになる</strong>: diễn tả sự thay đổi năng lực, thói quen (<span lang="ja">${r("泳", "およ")}げるようになった</span> – đã bơi được rồi).</li>
<li><strong>～ことにする</strong>: tự mình quyết định làm gì.</li>
<li><strong>～わけではない</strong>: không hẳn là…, phủ định một phần.</li>
<li><strong>～ばかり</strong>: toàn là, chỉ toàn…</li>
<li><strong>～によって</strong>: tuỳ theo, bởi, do.</li>
<li><strong>～はずだ</strong>: chắc chắn là (suy luận có căn cứ).</li>
</ul>
<h2>Mẹo ôn tập</h2>
<p>Đừng chỉ học thuộc nghĩa. Với mỗi mẫu, hãy tự đặt ba câu về chính cuộc sống của bạn và đọc to lên. Sau một tuần, quay lại làm bài tập trắc nghiệm trong mục <em>Bài tập</em> của Nihongo+ để kiểm tra xem mình còn nhầm lẫn ở đâu. Đặc biệt chú ý cặp ～ように / ～ために vì đây là "bẫy" quen thuộc của đề thi.</p>`,
  },
  {
    slug: "cach-hoc-kanji-hieu-qua-cho-nguoi-moi",
    category: "kanji",
    title: "Cách học Kanji hiệu quả cho người mới bắt đầu",
    excerpt: "Chia sẻ phương pháp học Kanji theo bộ thủ, mẹo ghi nhớ và tài liệu miễn phí giúp bạn học nhanh và nhớ lâu hơn.",
    author: "minh",
    cover: "kanji",
    daysAgo: 8,
    views: 98000,
    featured: true,
    content: `
<p>Với nhiều người Việt, Kanji là "nỗi sợ" lớn nhất khi học tiếng Nhật. Thế nhưng thực tế, chúng ta có lợi thế rất lớn: khoảng 60% từ Hán Nhật có âm Hán Việt tương ứng. Chỉ cần đúng phương pháp, bạn hoàn toàn có thể ghi nhớ 100 chữ Kanji đầu tiên trong một tháng.</p>
<h2>1. Học theo bộ thủ, không học từng nét rời rạc</h2>
<p>Mỗi chữ Kanji được ghép từ các bộ phận nhỏ gọi là bộ thủ. Khi đã quen bộ thủ, chữ mới chỉ là sự kết hợp của những mảnh ghép quen thuộc. Ví dụ:</p>
<ul>
<li>${r("木", "き")} (cây) → ${r("林", "はやし")} (rừng thưa, hai cây) → ${r("森", "もり")} (rừng rậm, ba cây).</li>
<li>${r("日", "ひ")} (mặt trời) + ${r("月", "つき")} (mặt trăng) = ${r("明", "あか")}るい (sáng sủa).</li>
<li>${r("人", "ひと")} (người) tựa vào ${r("木", "き")} (cây) = ${r("休", "やす")}む (nghỉ ngơi).</li>
</ul>
<h2>2. Gắn với âm Hán Việt</h2>
<p>Chữ ${r("学", "がく")} đọc Hán Việt là "học", ${r("生", "せい")} là "sinh" → ${r("学生", "がくせい")} là "học sinh". Khi gặp từ ghép mới, hãy thử đoán nghĩa bằng âm Hán Việt trước khi tra từ điển. Cách này giúp bạn đoán đúng nghĩa của rất nhiều từ ở trình độ N3 – N2.</p>
<h2>3. Ôn tập ngắt quãng (Spaced Repetition)</h2>
<p>Não bộ quên rất nhanh sau 24 giờ. Hãy ôn lại chữ vừa học sau 1 ngày, 3 ngày, 7 ngày và 14 ngày. Tính năng Flashcard trong Nihongo+ tự động nhắc bạn đúng thời điểm, nên bạn chỉ cần dành 10–15 phút mỗi ngày.</p>
${ex(`${r("毎日", "まいにち")}${r("少", "すこ")}しずつ${r("漢字", "かんじ")}を${r("覚", "おぼ")}えましょう。`, "Mỗi ngày hãy nhớ một ít Kanji nhé.")}
<h2>4. Viết tay, nhưng có chọn lọc</h2>
<p>Viết giúp ghi nhớ hình dạng, nhưng đừng chép một chữ 50 lần. Hãy viết mỗi chữ 3–5 lần theo đúng thứ tự nét, sau đó viết cả từ ghép và một câu ví dụ ngắn. Thời gian tiết kiệm được hãy dành để đọc – đó mới là kỹ năng đề thi kiểm tra nhiều nhất.</p>
<h2>Tài liệu gợi ý</h2>
<p>Bạn có thể tải miễn phí bộ <em>Tổng hợp từ vựng N5 theo chủ đề</em> ở mục Tài liệu miễn phí bên cạnh, rồi kết hợp với khóa Kanji N5 để có lộ trình rõ ràng ngay từ tuần đầu tiên.</p>`,
  },
  {
    slug: "kinh-nghiem-thi-jlpt-lo-trinh-chien-luoc",
    category: "jlpt",
    title: "Kinh nghiệm thi JLPT: Lộ trình và chiến lược đạt điểm cao",
    excerpt: "Tổng hợp kinh nghiệm thực tế từ các học viên đã đỗ JLPT, cùng những lưu ý quan trọng về thời gian, tài liệu và cách ôn tập.",
    author: "ha",
    cover: "jlpt",
    daysAgo: 11,
    views: 24310,
    content: `
<p>Kỳ thi Năng lực tiếng Nhật (${r("日本語能力試験", "にほんごのうりょくしけん")} – JLPT) được tổ chức hai lần mỗi năm vào tháng 7 và tháng 12. Sau nhiều năm đồng hành cùng học viên ôn thi, mình tổng hợp lại những kinh nghiệm thực tế giúp bạn tối ưu thời gian và điểm số.</p>
<h2>Chia giai đoạn rõ ràng</h2>
<ol>
<li><strong>Giai đoạn nền tảng (60% thời gian)</strong>: học chắc từ vựng, Kanji và ngữ pháp theo giáo trình. Đừng vội luyện đề khi chưa xong kiến thức cốt lõi.</li>
<li><strong>Giai đoạn luyện kỹ năng (25%)</strong>: tập trung đọc hiểu và nghe hiểu theo dạng bài của đề thi.</li>
<li><strong>Giai đoạn luyện đề (15%)</strong>: mỗi tuần làm ít nhất một đề hoàn chỉnh, bấm giờ như thi thật.</li>
</ol>
<h2>Quản lý thời gian trong phòng thi</h2>
<p>Phần Từ vựng – Ngữ pháp nên làm nhanh, dành tối đa thời gian cho Đọc hiểu. Với những câu chưa chắc, hãy đánh dấu và quay lại sau thay vì "đứng hình" quá lâu. Phần nghe không được nghe lại, vì vậy hãy đọc trước các lựa chọn trong lúc chờ đoạn hội thoại bắt đầu.</p>
${ex(`${r("最後", "さいご")}まで${r("諦", "あきら")}めないでください。`, "Đừng bỏ cuộc cho đến phút cuối cùng.")}
<h2>Điểm liệt – điều nhiều người bỏ qua</h2>
<p>JLPT yêu cầu bạn đạt điểm tối thiểu ở <strong>từng phần</strong> (19/60 với N1–N3). Có học viên đạt tổng điểm rất cao nhưng vẫn trượt vì phần nghe dưới mức tối thiểu. Hãy luyện đều các kỹ năng, đừng "dồn sức" vào thế mạnh.</p>
<h2>Một ngày trước kỳ thi</h2>
<ul>
<li>Chuẩn bị phiếu dự thi, giấy tờ tuỳ thân, bút chì 2B và tẩy.</li>
<li>Ôn nhẹ các mẫu ngữ pháp hay nhầm, không học kiến thức mới.</li>
<li>Ngủ đủ giấc – tai nghe sẽ "nhạy" hơn rất nhiều vào buổi sáng.</li>
</ul>
<p>Chúc bạn tự tin bước vào phòng thi. Đừng quên thử sức với bộ đề JLPT trên Nihongo+ để làm quen với áp lực thời gian nhé!</p>`,
  },
  {
    slug: "10-net-dac-trung-van-hoa-nhat-ban",
    category: "van-hoa",
    title: "10 nét đặc trưng trong văn hóa Nhật Bản",
    excerpt: "Khám phá những nét văn hóa độc đáo của Nhật Bản – từ lễ hội, ẩm thực đến phong tục giao tiếp hằng ngày.",
    author: "quan",
    cover: "culture",
    daysAgo: 15,
    views: 31250,
    content: `
<p>Học một ngôn ngữ cũng là học cách người bản xứ suy nghĩ và ứng xử. Hiểu văn hóa Nhật sẽ giúp bạn dùng tiếng Nhật tự nhiên hơn và tránh những tình huống khó xử khi sang Nhật học tập, làm việc.</p>
<h2>1. Văn hóa cúi chào (${r("お辞儀", "おじぎ")})</h2>
<p>Người Nhật cúi chào trong hầu hết mọi tình huống: gặp gỡ, cảm ơn, xin lỗi. Góc cúi càng sâu thể hiện sự tôn trọng càng lớn – khoảng 15° khi chào hỏi thông thường và 45° khi xin lỗi trang trọng.</p>
<h2>2. Đúng giờ tuyệt đối</h2>
<p>Tàu điện Nhật trễ một phút cũng có thể phải xin lỗi hành khách. Trong công việc, đến sớm 5–10 phút được xem là phép lịch sự tối thiểu.</p>
<h2>3. Cởi giày khi vào nhà</h2>
<p>Khu vực ${r("玄関", "げんかん")} (genkan) là nơi bạn để giày trước khi bước lên sàn nhà. Nhiều trường học, phòng khám và nhà hàng truyền thống cũng áp dụng quy tắc này.</p>
<h2>4. "Itadakimasu" trước bữa ăn</h2>
${ex("いただきます。／ごちそうさまでした。", "Tôi xin phép ăn. / Cảm ơn vì bữa ăn.")}
<p>Hai câu nói này thể hiện lòng biết ơn với người nấu, người nuôi trồng và cả thực phẩm.</p>
<h2>5–10. Những nét văn hóa khác</h2>
<ul>
<li><strong>Không đưa tiền boa</strong>: dịch vụ tốt được xem là đương nhiên.</li>
<li><strong>Phân loại rác cực kỳ kỹ</strong>: rác cháy được, không cháy được, tái chế… theo lịch từng ngày.</li>
<li><strong>Lễ hội ${r("花見", "はなみ")} (ngắm hoa anh đào)</strong> vào mùa xuân.</li>
<li><strong>Tắm ${r("温泉", "おんせん")} (suối nước nóng)</strong> với những quy tắc riêng.</li>
<li><strong>Giữ yên lặng nơi công cộng</strong>, đặc biệt trên tàu điện.</li>
<li><strong>Văn hóa tặng quà ${r("お土産", "おみやげ")}</strong> sau mỗi chuyến đi.</li>
</ul>
<p>Mỗi nét văn hóa đều gắn với những từ vựng và cách nói riêng. Khóa Giao tiếp tại Nihongo+ lồng ghép các tình huống này để bạn vừa học tiếng vừa hiểu người.</p>`,
  },
  {
    slug: "5-phuong-phap-hoc-tieng-nhat-tai-nha",
    category: "meo",
    title: "5 phương pháp học tiếng Nhật tại nhà dành cho người bận rộn",
    excerpt: "Dù không có nhiều thời gian, bạn vẫn có thể tiến bộ nếu áp dụng đúng phương pháp. Cùng khám phá 5 cách học hiệu quả ngay nhé!",
    author: "mai",
    cover: "tips",
    daysAgo: 19,
    views: 15870,
    content: `
<p>"Em đi làm cả ngày, tối về chỉ còn 30 phút thì học sao kịp?" – đây là câu hỏi mình nhận được nhiều nhất. Tin vui là: tiến bộ không phụ thuộc vào số giờ học một lúc, mà vào sự <strong>đều đặn</strong>. Dưới đây là 5 phương pháp đã giúp hàng nghìn học viên đi làm vẫn đạt mục tiêu.</p>
<h2>1. Quy tắc 15 phút mỗi ngày</h2>
<p>Đặt mục tiêu nhỏ đến mức không thể từ chối: 15 phút. Một bài học ngắn, 10 từ vựng mới hoặc một bài nghe. Khi đã có thói quen, bạn sẽ tự muốn học thêm. Tính năng chuỗi ngày học (streak) giúp bạn duy trì động lực mỗi ngày.</p>
<h2>2. Tận dụng "thời gian chết"</h2>
<p>Lúc chờ xe buýt, xếp hàng hay nghỉ trưa là lúc lý tưởng để ôn flashcard. Mười lần năm phút mỗi tuần đã là gần một giờ học thêm.</p>
<h2>3. Học theo chủ đề gắn với cuộc sống</h2>
<p>Thay vì học từ vựng ngẫu nhiên, hãy học theo những gì bạn làm hằng ngày: nấu ăn, đi chợ, công việc. Ví dụ khi nấu cơm, hãy nhẩm:</p>
${ex(`ご${r("飯", "はん")}を${r("炊", "た")}きます。${r("野菜", "やさい")}を${r("切", "き")}ります。`, "Tôi nấu cơm. Tôi thái rau.")}
<h2>4. Shadowing khi làm việc nhà</h2>
<p>Bật một đoạn hội thoại ngắn và nhại theo ngay sau người nói. Phương pháp này cải thiện phát âm, ngữ điệu và phản xạ nghe một cách rõ rệt chỉ sau vài tuần.</p>
<h2>5. Tổng kết cuối tuần</h2>
<p>Dành 30 phút cuối tuần để làm một bài kiểm tra nhỏ và xem lại biểu đồ tiến độ. Bạn sẽ thấy rõ mình đã đi được bao xa – đó là nguồn động lực lớn nhất.</p>
${ex(`${r("継続", "けいぞく")}は${r("力", "ちから")}なり。`, "Kiên trì chính là sức mạnh.")}`,
  },
  {
    slug: "du-hoc-nhat-ban-dieu-kien-chi-phi-viec-lam",
    category: "du-hoc",
    title: "Du học Nhật Bản: Điều kiện, chi phí và cơ hội việc làm",
    excerpt: "Tổng quan về các chương trình du học, chi phí, học bổng và triển vọng nghề nghiệp sau khi tốt nghiệp tại Nhật Bản.",
    author: "hoang-anh",
    cover: "study",
    daysAgo: 23,
    views: 27640,
    content: `
<p>Nhật Bản luôn nằm trong nhóm điểm đến du học được người Việt yêu thích nhờ chất lượng giáo dục cao, môi trường an toàn và cơ hội làm thêm hợp pháp. Bài viết này giúp bạn có cái nhìn tổng quan trước khi bắt đầu hồ sơ.</p>
<h2>Các hình thức du học phổ biến</h2>
<ul>
<li><strong>Trường tiếng Nhật (${r("日本語学校", "にほんごがっこう")})</strong>: 1,5–2 năm, phù hợp người mới, sau đó học lên cao đẳng hoặc đại học.</li>
<li><strong>Trường chuyên môn (${r("専門学校", "せんもんがっこう")})</strong>: 2 năm, đào tạo nghề thực tế như IT, du lịch, điều dưỡng.</li>
<li><strong>Đại học, cao học</strong>: yêu cầu tiếng Nhật từ N2 trở lên hoặc chương trình tiếng Anh.</li>
</ul>
<h2>Điều kiện cơ bản</h2>
<p>Tốt nghiệp THPT trở lên, có chứng chỉ tiếng Nhật tối thiểu N5 (nhiều trường yêu cầu 150 giờ học), chứng minh tài chính và không có thời gian trống quá dài trong hồ sơ học tập.</p>
<h2>Chi phí tham khảo năm đầu</h2>
<ul>
<li>Học phí trường tiếng: khoảng 700.000 – 850.000 yên/năm.</li>
<li>Ký túc xá, sinh hoạt: 60.000 – 90.000 yên/tháng tuỳ khu vực.</li>
<li>Du học sinh được làm thêm tối đa 28 giờ/tuần, giúp trang trải một phần sinh hoạt phí.</li>
</ul>
<h2>Cơ hội việc làm</h2>
<p>Sau khi tốt nghiệp, bạn có thể chuyển sang visa lao động kỹ thuật – nhân văn nếu được doanh nghiệp tuyển dụng. Tiếng Nhật thương mại và kính ngữ là lợi thế lớn khi phỏng vấn.</p>
${ex(`${r("夢", "ゆめ")}に${r("向", "む")}かって${r("一歩", "いっぽ")}ずつ${r("進", "すす")}もう。`, "Hãy tiến từng bước hướng tới ước mơ.")}`,
  },
  {
    slug: "tong-hop-ngu-phap-n5-n4-kem-vi-du",
    category: "ngu-phap",
    title: "Tổng hợp ngữ pháp N5 – N4 kèm ví dụ dễ hiểu",
    excerpt: "Hệ thống toàn bộ mẫu câu N5 – N4 theo chủ đề, có ví dụ minh họa và mẹo phân biệt các cấu trúc dễ nhầm lẫn.",
    author: "ha",
    cover: "grammar",
    daysAgo: 27,
    views: 76000,
    featured: true,
    content: `
<p>N5 và N4 là nền móng của toàn bộ hành trình tiếng Nhật. Nếu nắm chắc khoảng 130 mẫu câu ở hai cấp độ này, bạn đã có thể giao tiếp các tình huống hằng ngày và tự tin học lên N3. Bài viết hệ thống lại các mẫu câu theo nhóm chức năng để bạn dễ ôn tập.</p>
<h2>Nhóm 1: Câu khẳng định, phủ định cơ bản</h2>
${ex(`${r("私", "わたし")}は${r("学生", "がくせい")}です。${r("先生", "せんせい")}じゃありません。`, "Tôi là sinh viên. Tôi không phải giáo viên.")}
<h2>Nhóm 2: Thể て và các mẫu đi kèm</h2>
<p>Thể て là "chìa khoá vạn năng" của N5 – N4: nhờ vả (～てください), xin phép (～てもいいですか), cấm đoán (～てはいけません), diễn tả trạng thái (～ています).</p>
${ex(`ここで${r("写真", "しゃしん")}を${r("撮", "と")}ってもいいですか。`, "Tôi chụp ảnh ở đây có được không?")}
<h2>Nhóm 3: So sánh</h2>
<ul>
<li>A は B より ～ : A hơn B.</li>
<li>A と B と どちらが ～ : A và B cái nào hơn?</li>
<li>～の中で ～が一番 ～ : trong số… thì… nhất.</li>
</ul>
<h2>Nhóm 4: Thể thông thường và câu điều kiện (N4)</h2>
<p>N4 giới thiệu bốn cách nói điều kiện: ～と, ～ば, ～たら, ～なら. Mẹo nhỏ: ～たら dùng được trong hầu hết trường hợp hội thoại, nên nếu chưa chắc hãy ưu tiên ～たら.</p>
${ex(`${r("駅", "えき")}に${r("着", "つ")}いたら、${r("電話", "でんわ")}してください。`, "Khi đến ga thì hãy gọi điện cho tôi nhé.")}
<h2>Nhóm 5: Kính ngữ cơ bản</h2>
<p>Ở N4, bạn sẽ làm quen với tôn kính ngữ (いらっしゃる, おっしゃる) và khiêm nhường ngữ (まいる, もうす). Chỉ cần nhận diện được trong bài đọc là đủ cho kỳ thi.</p>
<p>Hãy kết hợp bài viết này với khóa <em>Ngữ pháp N4</em> trên Nihongo+ – mỗi mẫu câu đều có video giải thích và bài tập tương tác đi kèm.</p>`,
  },
  {
    slug: "nen-hoc-hiragana-hay-katakana-truoc",
    category: "meo",
    title: "Nên học Hiragana hay Katakana trước? Lộ trình 2 tuần",
    excerpt: "Lộ trình 14 ngày nắm chắc bảng chữ cái tiếng Nhật, kèm flashcard và bài tập viết tay miễn phí cho người mới.",
    author: "minh",
    cover: "kana",
    daysAgo: 31,
    views: 22980,
    content: `
<p>Câu trả lời ngắn gọn: <strong>hãy học Hiragana trước</strong>. Hiragana dùng để viết trợ từ, đuôi động từ và hầu hết từ thuần Nhật, nên bạn sẽ gặp nó trong mọi câu. Katakana chủ yếu dùng cho từ ngoại lai, tên riêng nước ngoài – học sau sẽ nhẹ nhàng hơn nhiều.</p>
<h2>Tuần 1: Hiragana</h2>
<ul>
<li><strong>Ngày 1–2</strong>: hàng あ, か, さ (15 chữ). Vừa đọc vừa viết.</li>
<li><strong>Ngày 3–4</strong>: hàng た, な, は, ま.</li>
<li><strong>Ngày 5</strong>: hàng や, ら, わ và ん.</li>
<li><strong>Ngày 6</strong>: âm đục (が, ざ…), âm ghép (きゃ, しゅ…), âm ngắt っ.</li>
<li><strong>Ngày 7</strong>: đọc các từ đơn giản: いぬ, ねこ, さくら, ありがとう.</li>
</ul>
<h2>Tuần 2: Katakana</h2>
<p>Katakana có cùng hệ thống âm với Hiragana, nên bạn chỉ cần ghi nhớ hình dạng mới. Hãy luyện bằng tên đồ vật quen thuộc:</p>
${ex("コーヒー・テレビ・パソコン・ベトナム", "Cà phê · Ti vi · Máy tính · Việt Nam")}
<h2>Những cặp chữ dễ nhầm</h2>
<ul>
<li>シ (shi) và ツ (tsu): nét của シ hướng lên từ dưới trái, ツ hướng xuống từ trên.</li>
<li>ソ (so) và ン (n): tương tự như trên.</li>
<li>ぬ và め, わ và れ, る và ろ trong Hiragana.</li>
</ul>
<h2>Bí quyết nhớ lâu</h2>
<p>Liên tưởng hình ảnh: く giống cái mỏ chim đang "cúc cu", へ giống ngọn núi nhỏ. Sau mỗi ngày, hãy làm bài luyện nhận diện chữ trong mục <em>Bài tập</em> để củng cố. Chỉ sau 14 ngày, bạn đã có thể đọc được những câu đầu tiên như <span lang="ja">${r("私", "わたし")}はベトナム${r("人", "じん")}です</span>!</p>`,
  },
  {
    slug: "lo-trinh-hoc-tieng-nhat-tu-n5-den-n1",
    category: "jlpt",
    title: "Lộ trình học tiếng Nhật từ N5 đến N1 cho người mới bắt đầu",
    excerpt: "Bản đồ học tập chi tiết theo từng cấp độ JLPT: thời gian cần thiết, kỹ năng trọng tâm và tài liệu nên dùng.",
    author: "quan",
    cover: "fuji",
    daysAgo: 35,
    views: 125000,
    featured: true,
    content: `
<p>Một lộ trình rõ ràng giúp bạn biết mình đang ở đâu, cần làm gì tiếp theo và mất bao lâu để đạt mục tiêu. Dưới đây là bản đồ học tập mà đội ngũ giáo viên Nihongo+ đã xây dựng dựa trên kinh nghiệm hướng dẫn hàng chục nghìn học viên.</p>
<h2>N5 – Làm quen (khoảng 3 tháng)</h2>
<p>Bảng chữ cái, ~800 từ vựng, ~100 Kanji, ngữ pháp cơ bản. Mục tiêu: tự giới thiệu, hỏi đường, mua sắm.</p>
${ex(`はじめまして。${r("私", "わたし")}はミンです。どうぞよろしくお${r("願", "ねが")}いします。`, "Rất vui được gặp bạn. Tôi là Minh. Rất mong được giúp đỡ.")}
<h2>N4 – Nền tảng (3 – 4 tháng)</h2>
<p>~1.500 từ vựng, ~300 Kanji. Hoàn thiện thể て, thể thông thường, câu điều kiện, kính ngữ cơ bản.</p>
<h2>N3 – Bước ngoặt (6 tháng)</h2>
<p>~3.700 từ vựng, ~650 Kanji. Đọc hiểu đoạn văn dài hơn, nghe hội thoại tốc độ tự nhiên. Đây là cấp độ nhiều doanh nghiệp yêu cầu tối thiểu.</p>
<h2>N2 – Làm việc (6 – 8 tháng)</h2>
<p>~6.000 từ vựng, ~1.000 Kanji. Đọc báo, email công việc, nghe tin tức. N2 mở ra cơ hội việc làm văn phòng tại Nhật và doanh nghiệp Nhật ở Việt Nam.</p>
<h2>N1 – Thành thạo (8 – 12 tháng)</h2>
<p>~10.000 từ vựng, ~2.000 Kanji. Hiểu văn bản trừu tượng, bài luận, hội thoại chuyên sâu. Bạn có thể dùng tiếng Nhật như một công cụ làm việc thực thụ.</p>
<h2>Ba nguyên tắc xuyên suốt</h2>
<ol>
<li><strong>Học đều mỗi ngày</strong> thay vì học dồn.</li>
<li><strong>Cân bằng 4 kỹ năng</strong>: đừng chỉ học để thi.</li>
<li><strong>Kiểm tra định kỳ</strong>: làm bài kiểm tra đầu vào để biết điểm xuất phát, sau đó thi thử mỗi tháng.</li>
</ol>
<p>Hãy bắt đầu với bài kiểm tra đầu vào miễn phí trên Nihongo+ để nhận lộ trình cá nhân hóa phù hợp với mục tiêu của bạn.</p>`,
  },
  {
    slug: "phan-biet-wa-va-ga",
    category: "ngu-phap",
    title: "Phân biệt trợ từ は và が – nỗi băn khoăn muôn thuở",
    excerpt: "Khi nào dùng は, khi nào dùng が? Bài viết giải thích bằng ví dụ gần gũi giúp bạn không còn nhầm lẫn hai trợ từ quan trọng nhất.",
    author: "linh",
    cover: "grammar",
    daysAgo: 39,
    views: 13560,
    content: `
<p>Gần như ai học tiếng Nhật cũng từng bối rối trước hai trợ từ は (wa) và が (ga). Cả hai đều có thể đứng sau chủ ngữ, nhưng sắc thái lại khác nhau rõ rệt.</p>
<h2>は – giới thiệu chủ đề</h2>
<p>は đánh dấu "điều chúng ta đang nói tới". Thông tin quan trọng nằm ở <strong>phía sau</strong> は.</p>
${ex(`${r("私", "わたし")}は${r("医者", "いしゃ")}です。`, "Tôi (thì) là bác sĩ.")}
<h2>が – nhấn mạnh chủ thể</h2>
<p>が làm nổi bật chính chủ ngữ, thông tin mới nằm ở <strong>phía trước</strong> が. Vì vậy câu trả lời cho câu hỏi "ai?" luôn dùng が.</p>
${ex(`だれが${r("来", "き")}ましたか。— ${r("田中", "たなか")}さんが${r("来", "き")}ました。`, "Ai đã đến vậy? — Anh Tanaka đã đến.")}
<h2>Các trường hợp bắt buộc dùng が</h2>
<ul>
<li>Sau từ để hỏi: だれが, なにが, どこが.</li>
<li>Với các tính từ cảm xúc, năng lực: ${r("好", "す")}き, ${r("上手", "じょうず")}, わかる, できる.</li>
<li>Trong mệnh đề phụ: ${r("私", "わたし")}が${r("作", "つく")}った${r("料理", "りょうり")} (món ăn tôi nấu).</li>
<li>Mô tả hiện tượng vừa nhìn thấy: あ、${r("雨", "あめ")}が${r("降", "ふ")}ってきた！</li>
</ul>
<h2>は dùng để so sánh, đối lập</h2>
${ex(`${r("肉", "にく")}は${r("食", "た")}べますが、${r("魚", "さかな")}は${r("食", "た")}べません。`, "Thịt thì tôi ăn, nhưng cá thì không.")}
<p>Mẹo nhỏ: hãy tự hỏi "người nghe đã biết chủ ngữ này chưa?". Nếu đã biết → は; nếu là thông tin mới cần nhấn mạnh → が. Luyện thêm với bộ bài tập Trợ từ N5 trên Nihongo+ nhé!</p>`,
  },
  {
    slug: "50-kanji-n5-thong-dung-nhat",
    category: "kanji",
    title: "50 chữ Kanji N5 thông dụng nhất kèm cách nhớ",
    excerpt: "Danh sách 50 chữ Kanji xuất hiện nhiều nhất trong đề N5 được nhóm theo chủ đề, kèm âm Hán Việt và mẹo liên tưởng.",
    author: "yamamoto",
    cover: "kanji",
    daysAgo: 44,
    views: 19840,
    content: `
<p>Đề thi N5 yêu cầu khoảng 100 chữ Kanji, nhưng chỉ cần nắm chắc 50 chữ dưới đây, bạn đã đọc được phần lớn từ vựng trong đề. Mình nhóm theo chủ đề để bạn dễ liên tưởng.</p>
<h2>Số đếm</h2>
<p>${r("一", "いち")} ${r("二", "に")} ${r("三", "さん")} ${r("四", "よん")} ${r("五", "ご")} ${r("六", "ろく")} ${r("七", "なな")} ${r("八", "はち")} ${r("九", "きゅう")} ${r("十", "じゅう")} ${r("百", "ひゃく")} ${r("千", "せん")} ${r("万", "まん")}</p>
<h2>Thời gian</h2>
<p>${r("日", "にち")} (nhật) · ${r("月", "げつ")} (nguyệt) · ${r("火", "か")} (hoả) · ${r("水", "すい")} (thuỷ) · ${r("木", "もく")} (mộc) · ${r("金", "きん")} (kim) · ${r("土", "ど")} (thổ) · ${r("年", "ねん")} (niên) · ${r("時", "じ")} (thời) · ${r("分", "ふん")} (phân) · ${r("今", "いま")} (kim)</p>
<h2>Con người</h2>
<p>${r("人", "ひと")} · ${r("男", "おとこ")} · ${r("女", "おんな")} · ${r("子", "こ")} · ${r("父", "ちち")} · ${r("母", "はは")} · ${r("友", "とも")} · ${r("先生", "せんせい")}</p>
<h2>Vị trí, phương hướng</h2>
<p>${r("上", "うえ")} · ${r("下", "した")} · ${r("中", "なか")} · ${r("外", "そと")} · ${r("右", "みぎ")} · ${r("左", "ひだり")} · ${r("前", "まえ")} · ${r("後", "うし")}ろ · ${r("東", "ひがし")} · ${r("西", "にし")} · ${r("南", "みなみ")} · ${r("北", "きた")}</p>
<h2>Mẹo nhớ bằng hình ảnh</h2>
<ul>
<li>${r("山", "やま")}: ba ngọn núi nhô lên.</li>
<li>${r("川", "かわ")}: ba dòng nước chảy song song.</li>
<li>${r("口", "くち")}: cái miệng đang mở.</li>
<li>${r("目", "め")}: con mắt dựng đứng.</li>
</ul>
${ex(`${r("山田", "やまだ")}さんは${r("毎朝", "まいあさ")}${r("川", "かわ")}の${r("近", "ちか")}くを${r("散歩", "さんぽ")}します。`, "Anh Yamada sáng nào cũng đi dạo gần bờ sông.")}
<p>Tải bộ flashcard Kanji N5 miễn phí trong mục tài liệu và ôn mỗi ngày 10 chữ – sau 5 ngày bạn đã hoàn thành danh sách này!</p>`,
  },
  {
    slug: "keigo-kinh-ngu-co-ban-noi-cong-so",
    category: "van-hoa",
    title: "Keigo – kính ngữ cơ bản nơi công sở Nhật",
    excerpt: "Những câu kính ngữ thiết yếu khi đi làm tại công ty Nhật: chào hỏi, nghe điện thoại, báo cáo với cấp trên.",
    author: "suzuki",
    cover: "culture",
    daysAgo: 49,
    views: 11230,
    content: `
<p>Kính ngữ (${r("敬語", "けいご")}) phản ánh rõ nét văn hóa tôn ti và sự tinh tế trong giao tiếp của người Nhật. Ở môi trường công sở, dùng đúng kính ngữ giúp bạn tạo ấn tượng chuyên nghiệp ngay từ ngày đầu.</p>
<h2>Ba loại kính ngữ</h2>
<ul>
<li><strong>${r("尊敬語", "そんけいご")} (tôn kính ngữ)</strong>: nâng hành động của người khác lên.</li>
<li><strong>${r("謙譲語", "けんじょうご")} (khiêm nhường ngữ)</strong>: hạ thấp hành động của bản thân.</li>
<li><strong>${r("丁寧語", "ていねいご")} (thể lịch sự)</strong>: đuôi です／ます.</li>
</ul>
<h2>Những câu dùng mỗi ngày</h2>
${ex("おはようございます。", "Chào buổi sáng (nói với mọi người khi đến công ty).")}
${ex(`お${r("疲", "つか")}れ${r("様", "さま")}です。`, "Anh/chị đã vất vả rồi (chào hỏi đồng nghiệp trong ngày).")}
${ex(`お${r("先", "さき")}に${r("失礼", "しつれい")}します。`, "Tôi xin phép về trước.")}
<h2>Nghe điện thoại</h2>
${ex(`はい、Nihongo+でございます。${r("少々", "しょうしょう")}お${r("待", "ま")}ちください。`, "Vâng, Nihongo+ xin nghe. Xin vui lòng chờ một chút.")}
<h2>Báo cáo – liên lạc – thảo luận (${r("報連相", "ほうれんそう")})</h2>
<p>Người Nhật rất coi trọng nguyên tắc Hō-Ren-Sō: luôn báo cáo tiến độ, liên lạc khi có thay đổi và thảo luận trước khi tự quyết định. Một câu mở đầu thường dùng:</p>
${ex(`${r("今", "いま")}、よろしいでしょうか。ご${r("報告", "ほうこく")}したいことがございます。`, "Bây giờ anh có tiện không ạ? Tôi có việc muốn báo cáo.")}
<p>Khóa <em>Tiếng Nhật thương mại</em> trên Nihongo+ có hơn 40 tình huống công sở thực tế để bạn luyện phản xạ kính ngữ.</p>`,
  },
  {
    slug: "chien-thuat-nghe-hieu-jlpt-n2",
    category: "jlpt",
    title: "Chiến thuật làm phần Nghe hiểu JLPT N2",
    excerpt: "Phân tích 5 dạng bài nghe trong đề N2 và chiến thuật xử lý từng dạng giúp bạn vượt qua điểm liệt dễ dàng.",
    author: "quan",
    cover: "jlpt",
    daysAgo: 54,
    views: 14720,
    content: `
<p>Phần Nghe hiểu (${r("聴解", "ちょうかい")}) N2 kéo dài khoảng 50 phút với 5 dạng bài. Đây là phần nhiều bạn mất điểm nhất vì tốc độ nói tự nhiên và không được nghe lại.</p>
<h2>Dạng 1: ${r("課題理解", "かだいりかい")} – Hiểu vấn đề</h2>
<p>Câu hỏi thường là "Người đàn ông sẽ làm gì <strong>đầu tiên</strong>?". Hãy chú ý các từ chỉ thứ tự như まず, その${r("前", "まえ")}に, あとで.</p>
<h2>Dạng 2: ${r("ポイント理解", "ぽいんとりかい")} – Hiểu điểm chính</h2>
<p>Bạn có thời gian đọc lựa chọn trước khi nghe. Gạch chân từ khoá trong câu hỏi như ${r("理由", "りゆう")} (lý do) hay ${r("一番", "いちばん")} (nhất).</p>
<h2>Dạng 3: ${r("概要理解", "がいようりかい")} – Hiểu khái quát</h2>
<p>Không có lựa chọn in sẵn. Hãy ghi chú ý chính của người nói, đặc biệt phần kết luận vì người Nhật thường nói ý chính ở cuối.</p>
<h2>Dạng 4: ${r("即時応答", "そくじおうとう")} – Phản hồi nhanh</h2>
${ex(`このレポート、${r("明日", "あした")}までにお${r("願", "ねが")}いできる？ — はい、${r("承知", "しょうち")}しました。`, "Báo cáo này, mai xong được không? — Vâng, tôi hiểu rồi.")}
<p>Dạng này kiểm tra phản xạ với cách nói tự nhiên, kính ngữ và câu rút gọn.</p>
<h2>Dạng 5: ${r("統合理解", "とうごうりかい")} – Hiểu tổng hợp</h2>
<p>Đoạn hội thoại dài với nhiều thông tin so sánh. Hãy kẻ bảng nhỏ ghi lại đặc điểm từng lựa chọn khi nghe.</p>
<h2>Luyện tập mỗi ngày</h2>
<p>Nghe 20 phút tin tức NHK Easy, sau đó shadowing 10 phút. Kết hợp làm đề nghe trên Nihongo+ với chế độ "không tua lại" để tạo áp lực như phòng thi.</p>`,
  },
  {
    slug: "hoc-bong-du-hoc-nhat-ban-2026",
    category: "du-hoc",
    title: "Các học bổng du học Nhật Bản đáng chú ý năm 2026",
    excerpt: "Tổng hợp học bổng chính phủ MEXT, học bổng JASSO và học bổng doanh nghiệp, kèm điều kiện và thời gian nộp hồ sơ.",
    author: "tanaka",
    cover: "study",
    daysAgo: 60,
    views: 9870,
    content: `
<p>Chi phí là rào cản lớn nhất của nhiều bạn khi nghĩ đến du học Nhật. Tuy nhiên, Nhật Bản có rất nhiều chương trình học bổng hào phóng dành cho du học sinh quốc tế, đặc biệt là sinh viên có thành tích học tập tốt và trình độ tiếng Nhật vững.</p>
<h2>Học bổng Chính phủ Nhật Bản (MEXT – ${r("文部科学省", "もんぶかがくしょう")})</h2>
<p>Đây là học bổng toàn phần danh giá nhất: miễn học phí, vé máy bay khứ hồi và trợ cấp hằng tháng khoảng 117.000 – 145.000 yên. Hồ sơ thường được tiếp nhận qua Đại sứ quán Nhật Bản vào khoảng tháng 4 – 5 hằng năm.</p>
<h2>Học bổng JASSO</h2>
<p>Dành cho du học sinh tự túc có thành tích tốt, trợ cấp khoảng 48.000 yên/tháng. Bạn nộp hồ sơ thông qua trường đang theo học tại Nhật.</p>
<h2>Học bổng doanh nghiệp và địa phương</h2>
<p>Nhiều tập đoàn và tỉnh của Nhật tài trợ học bổng kèm cam kết làm việc sau tốt nghiệp. Đây là con đường tốt nếu bạn đã xác định ngành nghề từ sớm.</p>
<h2>Bí quyết tăng cơ hội</h2>
<ul>
<li>Có chứng chỉ JLPT N2 trở lên.</li>
<li>Viết kế hoạch học tập (${r("研究計画書", "けんきゅうけいかくしょ")}) rõ ràng, thể hiện mục tiêu dài hạn.</li>
<li>Luyện phỏng vấn bằng tiếng Nhật với giáo viên bản ngữ.</li>
</ul>
${ex(`チャンスは${r("準備", "じゅんび")}した${r("人", "ひと")}にやってくる。`, "Cơ hội đến với người đã chuẩn bị sẵn sàng.")}`,
  },
  {
    slug: "shadowing-luyen-phat-am-tieng-nhat",
    category: "meo",
    title: "Shadowing – bí quyết luyện phát âm và phản xạ tiếng Nhật",
    excerpt: "Hướng dẫn từng bước phương pháp shadowing: chọn tài liệu, cách luyện và những lỗi thường gặp khi mới bắt đầu.",
    author: "duc",
    cover: "tips",
    daysAgo: 66,
    views: 12410,
    content: `
<p>Shadowing (nói đuổi) là phương pháp lặp lại lời người bản xứ gần như cùng lúc, giống như một "cái bóng". Đây là kỹ thuật được các phiên dịch viên chuyên nghiệp sử dụng để rèn tai nghe và khả năng nói trôi chảy.</p>
<h2>Bước 1: Chọn tài liệu phù hợp</h2>
<p>Chọn đoạn hội thoại 30 giây – 1 phút, có transcript, trình độ thấp hơn trình độ hiện tại của bạn một chút. Các đoạn hội thoại trong bài học Nihongo+ đều có phụ đề tiếng Nhật và tiếng Việt, rất phù hợp để bắt đầu.</p>
<h2>Bước 2: Nghe và hiểu nội dung</h2>
<p>Nghe 2–3 lần, đọc transcript để hiểu nghĩa từng câu. Shadowing khi chưa hiểu nghĩa sẽ chỉ là nhại âm thanh.</p>
<h2>Bước 3: Đọc theo transcript (overlapping)</h2>
<p>Vừa nhìn chữ vừa đọc cùng lúc với audio, chú ý trường âm, âm ngắt và ngữ điệu lên xuống.</p>
${ex(`${r("今日", "きょう")}はいい${r("天気", "てんき")}ですね。${r("散歩", "さんぽ")}に${r("行", "い")}きませんか。`, "Hôm nay trời đẹp nhỉ. Đi dạo không?")}
<h2>Bước 4: Shadowing không nhìn chữ</h2>
<p>Bỏ transcript, nói theo sau audio khoảng nửa giây. Ban đầu sẽ rất khó, hãy kiên nhẫn với cùng một đoạn trong 3–5 ngày.</p>
<h2>Bước 5: Ghi âm và so sánh</h2>
<p>Ghi âm giọng mình và so sánh với bản gốc. Bạn sẽ nhận ra ngay những chỗ phát âm chưa chuẩn như つ/す hay trường âm bị đọc ngắn.</p>
<h2>Lỗi thường gặp</h2>
<ul>
<li>Chọn tài liệu quá khó, dẫn đến nản.</li>
<li>Chỉ luyện vài ngày rồi bỏ – shadowing cần ít nhất 3 tuần để thấy hiệu quả rõ rệt.</li>
<li>Quá chú ý từng từ mà quên ngữ điệu cả câu.</li>
</ul>`,
  },

  /* ---------------- Cẩm nang cho người mới bắt đầu ---------------- */
  {
    slug: "huong-dan-bat-dau-hoc-tieng-nhat",
    category: "meo",
    title: "Hướng dẫn bắt đầu học tiếng Nhật",
    excerpt: "Bạn chưa biết gì về tiếng Nhật? Đây là những bước đầu tiên giúp bạn khởi động đúng cách và không bị choáng ngợp.",
    author: "sato",
    cover: "kana",
    daysAgo: 120,
    views: 34520,
    guide: true,
    content: `
<p>こんにちは！Chào mừng bạn đến với hành trình học tiếng Nhật. Mình là Sato, giáo viên bản ngữ tại Nihongo+. Trong bài viết này, mình sẽ giúp bạn hiểu tiếng Nhật được cấu tạo thế nào và nên bắt đầu từ đâu.</p>
<h2>Tiếng Nhật có ba bộ chữ</h2>
<ul>
<li><strong>Hiragana (ひらがな)</strong>: chữ mềm, dùng cho từ thuần Nhật và ngữ pháp.</li>
<li><strong>Katakana (カタカナ)</strong>: chữ cứng, dùng cho từ ngoại lai.</li>
<li><strong>Kanji (${r("漢字", "かんじ")})</strong>: chữ Hán, mang ý nghĩa.</li>
</ul>
<p>Một câu tiếng Nhật thường kết hợp cả ba: <span lang="ja">${r("私", "わたし")}はコーヒーが${r("好", "す")}きです。</span> (Tôi thích cà phê.)</p>
<h2>Trật tự câu: Chủ ngữ – Tân ngữ – Động từ</h2>
<p>Khác với tiếng Việt, động từ luôn đứng cuối câu. Trợ từ (は, を, に…) đứng sau danh từ để cho biết vai trò của danh từ đó trong câu.</p>
${ex(`${r("私", "わたし")}はりんごを${r("食", "た")}べます。`, "Tôi ăn táo. (Tôi – táo – ăn)")}
<h2>Bốn bước khởi động</h2>
<ol>
<li>Làm bài kiểm tra đầu vào để biết trình độ.</li>
<li>Học xong Hiragana và Katakana trong 2 tuần.</li>
<li>Đăng ký khóa N5 và học mỗi ngày ít nhất 15 phút.</li>
<li>Bật chuỗi ngày học (streak) để duy trì thói quen.</li>
</ol>
<p>Đừng lo nếu ban đầu thấy khó. Mọi người học tiếng Nhật đều từng bắt đầu từ chữ あ đầu tiên. がんばりましょう！</p>`,
  },
  {
    slug: "nen-hoc-hiragana-katakana-hay-kanji-truoc",
    category: "meo",
    title: "Nên học Hiragana, Katakana hay Kanji trước?",
    excerpt: "Thứ tự học ba bộ chữ hợp lý nhất cho người mới và lý do vì sao bạn không nên học Kanji quá sớm.",
    author: "linh",
    cover: "kana",
    daysAgo: 118,
    views: 21340,
    guide: true,
    content: `
<p>Thứ tự được khuyến nghị: <strong>Hiragana → Katakana → Kanji</strong>. Lý do rất đơn giản: Hiragana xuất hiện trong mọi câu, Katakana giúp bạn đọc được từ ngoại lai quen thuộc, còn Kanji cần nền tảng từ vựng để ghi nhớ hiệu quả.</p>
<h2>Vì sao không học Kanji ngay?</h2>
<p>Mỗi chữ Kanji có thể có nhiều cách đọc (âm On và âm Kun). Nếu chưa biết từ vựng, bạn sẽ phải nhớ "chay" hình dạng và cách đọc – rất nhanh quên. Khi đã biết từ <span lang="ja">やま</span> (núi), việc học chữ ${r("山", "やま")} trở nên tự nhiên hơn nhiều.</p>
<h2>Lộ trình gợi ý trong tháng đầu</h2>
<ul>
<li>Tuần 1: Hiragana.</li>
<li>Tuần 2: Katakana.</li>
<li>Tuần 3–4: bắt đầu bài 1–5 khóa N5, học 5 chữ Kanji mỗi ngày gắn với từ vựng trong bài.</li>
</ul>
${ex(`${r("今日", "きょう")}から${r("一緒", "いっしょ")}に${r("頑張", "がんば")}りましょう！`, "Từ hôm nay cùng cố gắng nhé!")}`,
  },
  {
    slug: "lo-trinh-hoc-phu-hop-voi-muc-tieu",
    category: "meo",
    title: "Lộ trình học phù hợp với mục tiêu của bạn",
    excerpt: "Học để thi JLPT, đi du học, làm việc hay chỉ để xem anime? Mỗi mục tiêu cần một lộ trình khác nhau.",
    author: "nakamura",
    cover: "fuji",
    daysAgo: 116,
    views: 18760,
    guide: true,
    content: `
<p>Trước khi bắt đầu, hãy tự hỏi: "Mình học tiếng Nhật để làm gì?". Câu trả lời sẽ quyết định bạn nên ưu tiên kỹ năng nào và chọn khóa học ra sao.</p>
<h2>Mục tiêu thi JLPT</h2>
<p>Tập trung từ vựng, ngữ pháp, đọc hiểu và nghe hiểu theo cấu trúc đề. Lộ trình: khóa theo cấp độ → khóa luyện thi → luyện đề hằng tuần.</p>
<h2>Mục tiêu du học</h2>
<p>Cần N3–N2 và kỹ năng giao tiếp đời sống. Nên kết hợp khóa cấp độ với khóa Giao tiếp và tìm hiểu văn hóa Nhật.</p>
<h2>Mục tiêu đi làm</h2>
<p>Ngoài JLPT N2, bạn cần kính ngữ, email thương mại và phỏng vấn. Khóa Tiếng Nhật thương mại là lựa chọn phù hợp sau khi đạt N3.</p>
<h2>Học vì sở thích</h2>
<p>Hãy học giao tiếp và nghe nhiều qua phim, nhạc. Đừng áp lực thi cử – niềm vui là động lực bền vững nhất.</p>
${ex(`${r("好", "す")}きこそ${r("物", "もの")}の${r("上手", "じょうず")}なれ。`, "Có yêu thích thì mới giỏi được.")}`,
  },
  {
    slug: "nhung-sai-lam-thuong-gap-khi-hoc-tieng-nhat",
    category: "meo",
    title: "Những sai lầm thường gặp khi học tiếng Nhật",
    excerpt: "7 sai lầm khiến nhiều người học mãi không tiến bộ – và cách khắc phục từ kinh nghiệm của giáo viên Nihongo+.",
    author: "thao",
    cover: "tips",
    daysAgo: 114,
    views: 16290,
    guide: true,
    content: `
<p>Sau nhiều năm giảng dạy, mình nhận thấy phần lớn học viên "dậm chân tại chỗ" không phải vì thiếu chăm chỉ, mà vì mắc những sai lầm rất phổ biến dưới đây.</p>
<ol>
<li><strong>Dùng romaji quá lâu</strong>: hãy bỏ romaji ngay khi học xong bảng chữ cái.</li>
<li><strong>Chỉ học ngữ pháp, không học từ vựng</strong>: không có từ vựng, ngữ pháp chẳng để làm gì.</li>
<li><strong>Học dồn rồi bỏ</strong>: 7 tiếng một ngày Chủ nhật kém hiệu quả hơn 1 tiếng mỗi ngày.</li>
<li><strong>Ngại nói</strong>: sai là một phần của học. Hãy nói, dù chỉ với chính mình.</li>
<li><strong>Bỏ qua phát âm trường âm</strong>: <span lang="ja">おばさん</span> (cô) và <span lang="ja">おばあさん</span> (bà) khác nhau hoàn toàn!</li>
<li><strong>Dịch từng chữ từ tiếng Việt</strong>: hãy học cả câu mẫu theo ngữ cảnh.</li>
<li><strong>Không ôn tập</strong>: dùng flashcard và Spaced Repetition để chống quên.</li>
</ol>
${ex(`${r("失敗", "しっぱい")}は${r("成功", "せいこう")}のもと。`, "Thất bại là mẹ thành công.")}`,
  },
  {
    slug: "cau-hoi-thuong-gap-faq",
    category: "meo",
    title: "Câu hỏi thường gặp (FAQ)",
    excerpt: "Giải đáp những thắc mắc phổ biến nhất của người mới học tiếng Nhật: mất bao lâu, học ở đâu, có cần giáo viên không…",
    author: "mai",
    cover: "grammar",
    daysAgo: 112,
    views: 14980,
    guide: true,
    content: `
<h2>Học tiếng Nhật mất bao lâu để giao tiếp được?</h2>
<p>Với 1 giờ mỗi ngày, sau khoảng 6 tháng (trình độ N4) bạn có thể giao tiếp các tình huống cơ bản hằng ngày.</p>
<h2>Tiếng Nhật có khó hơn tiếng Anh không?</h2>
<p>Chữ viết khó hơn, nhưng phát âm lại dễ với người Việt vì không có thanh điệu phức tạp, và nhiều từ Hán Việt giúp đoán nghĩa.</p>
<h2>Tôi có cần học với giáo viên không?</h2>
<p>Bạn có thể tự học phần lớn kiến thức qua video bài giảng. Tuy nhiên, giáo viên giúp sửa phát âm, chữa bài viết và giữ động lực – đặc biệt quan trọng khi luyện nói.</p>
<h2>Học trên điện thoại có hiệu quả không?</h2>
<p>Có! Nihongo+ được thiết kế để học mọi lúc mọi nơi, tiến độ đồng bộ giữa máy tính và điện thoại.</p>
<h2>Bao giờ nên thi JLPT?</h2>
<p>Khi điểm thi thử đạt trên 70% liên tục trong 3 lần. Đăng ký thi trước khoảng 3–4 tháng.</p>
${ex(`${r("分", "わ")}からないことがあったら、いつでも${r("聞", "き")}いてくださいね。`, "Nếu có gì không hiểu, cứ hỏi bất cứ lúc nào nhé.")}`,
  },

  /* ---------------- Chờ duyệt / hẹn giờ / nháp ---------------- */
  {
    slug: "mau-cau-te-shimau",
    category: "ngu-phap",
    title: "Mẫu câu ～てしまう: lỡ làm, làm xong mất rồi",
    excerpt: "Hai sắc thái của ～てしまう và cách nói rút gọn ～ちゃう trong hội thoại hằng ngày.",
    author: "linh",
    cover: "grammar",
    daysAgo: 1,
    views: 0,
    status: "review",
    content: `
<p>～てしまう là mẫu câu N4 mang hai sắc thái: <strong>hoàn thành trọn vẹn</strong> một việc, hoặc <strong>tiếc nuối</strong> vì lỡ làm điều không mong muốn.</p>
${ex(`${r("宿題", "しゅくだい")}を${r("全部", "ぜんぶ")}やってしまいました。`, "Tôi đã làm xong hết bài tập rồi.")}
${ex(`${r("財布", "さいふ")}を${r("忘", "わす")}れてしまった。`, "Tôi lỡ quên ví mất rồi.")}
<p>Trong văn nói, ～てしまう thường rút gọn thành ～ちゃう: <span lang="ja">${r("食", "た")}べちゃった</span> (lỡ ăn mất rồi).</p>`,
  },
  {
    slug: "le-hoi-mua-he-nhat-ban",
    category: "van-hoa",
    title: "Lễ hội mùa hè Nhật Bản: Matsuri, pháo hoa và yukata",
    excerpt: "Khám phá không khí rộn ràng của các lễ hội mùa hè và những từ vựng thú vị đi kèm.",
    author: "yamamoto",
    cover: "culture",
    daysAgo: 2,
    views: 0,
    status: "review",
    content: `
<p>Mùa hè Nhật Bản là mùa của ${r("祭", "まつ")}り (lễ hội) và ${r("花火大会", "はなびたいかい")} (lễ hội pháo hoa). Mọi người mặc ${r("浴衣", "ゆかた")}, thưởng thức món ăn đường phố như たこ${r("焼", "や")}き, かき${r("氷", "ごおり")}.</p>
<p>Nổi tiếng nhất là ${r("祇園祭", "ぎおんまつり")} ở Kyoto và lễ hội Nebuta ở Aomori với những chiếc đèn lồng khổng lồ.</p>`,
  },
  {
    slug: "tu-vung-n4-chu-de-cong-viec",
    category: "meo",
    title: "60 từ vựng N4 chủ đề công việc",
    excerpt: "Danh sách từ vựng N4 thường gặp về công việc, văn phòng kèm ví dụ minh hoạ.",
    author: "thao",
    cover: "tips",
    daysAgo: 3,
    views: 0,
    status: "review",
    content: `
<p>Tổng hợp từ vựng N4 chủ đề công việc: ${r("会社", "かいしゃ")} (công ty), ${r("会議", "かいぎ")} (cuộc họp), ${r("残業", "ざんぎょう")} (làm thêm giờ), ${r("出張", "しゅっちょう")} (công tác)…</p>
${ex(`${r("明日", "あした")}は${r("大阪", "おおさか")}へ${r("出張", "しゅっちょう")}します。`, "Ngày mai tôi đi công tác Osaka.")}`,
  },
  {
    slug: "kinh-nghiem-thi-jlpt-thang-12",
    category: "jlpt",
    title: "Checklist chuẩn bị cho kỳ thi JLPT tháng 12",
    excerpt: "Danh sách việc cần làm trong 4 tuần cuối trước kỳ thi JLPT tháng 12.",
    author: "ha",
    cover: "jlpt",
    daysAgo: -5,
    views: 0,
    status: "published",
    content: `
<p>Chỉ còn vài tuần nữa là đến kỳ thi JLPT tháng 12. Đây là checklist 4 tuần giúp bạn ôn tập có hệ thống và giữ tâm lý vững vàng.</p>
<ul>
<li>Tuần 1: rà soát toàn bộ ngữ pháp, đánh dấu mẫu còn yếu.</li>
<li>Tuần 2: luyện 2 đề hoàn chỉnh, phân tích lỗi sai.</li>
<li>Tuần 3: tập trung kỹ năng yếu nhất.</li>
<li>Tuần 4: ôn nhẹ, ngủ đủ, chuẩn bị giấy tờ.</li>
</ul>`,
  },
  {
    slug: "bi-quyet-nho-katakana-tu-ngoai-lai",
    category: "kanji",
    title: "Bí quyết nhớ từ ngoại lai viết bằng Katakana",
    excerpt: "Quy tắc chuyển âm tiếng Anh sang Katakana giúp bạn đoán nghĩa từ ngoại lai nhanh chóng.",
    author: "duc",
    cover: "kana",
    daysAgo: 0,
    views: 0,
    status: "draft",
    content: `<p>Bản nháp: quy tắc chuyển âm — thêm nguyên âm sau phụ âm cuối (desk → デスク), "er" thành trường âm (computer → コンピューター)…</p>`,
  },
];

/** Tài liệu miễn phí (tệp PDF được sinh ra khi seed). */
export const SEED_RESOURCES = [
  { title: "Tổng hợp từ vựng N5 theo chủ đề", file: "tu-vung-n5-theo-chu-de.pdf", size: 2.4, downloads: 10000 },
  { title: "Bảng tổng hợp ngữ pháp N3", file: "bang-tong-hop-ngu-phap-n3.pdf", size: 3.1, downloads: 8500 },
  { title: "Bộ đề thi thử JLPT N4 (có đáp án)", file: "de-thi-thu-jlpt-n4.pdf", size: 5.8, downloads: 12000 },
  { title: "Flashcard 100 Kanji N5", file: "flashcard-100-kanji-n5.pdf", size: 1.9, downloads: 6400 },
  { title: "Bảng chia động từ tiếng Nhật", file: "bang-chia-dong-tu.pdf", size: 0.8, downloads: 5100 },
  { title: "Bộ đề thi thử JLPT N3 (có đáp án)", file: "de-thi-thu-jlpt-n3.pdf", size: 6.2, downloads: 4300 },
];

/** Testimonial trang giáo viên (từ components/teachers/data.ts). */
export const TEACHER_TESTIMONIALS = [
  { teacher: "sato", authorName: "Nguyễn Minh Anh", authorRole: "Học viên khóa Giao tiếp N3", content: "Cô Sato dạy rất dễ hiểu, luôn kiên nhẫn và tạo không khí lớp học thoải mái. Nhờ cô mà mình tự tin giao tiếp hơn nhiều!" },
  { teacher: "minh", authorName: "Trần Quang Huy", authorRole: "Học viên khóa Luyện thi JLPT", content: "Thầy Minh có phương pháp dạy logic, tài liệu rất chất lượng. Mình đã thi đỗ JLPT N1 sau 1 năm học cùng thầy!" },
  { teacher: "mai", authorName: "Lê Thu Phương", authorRole: "Học viên khóa Giao tiếp N5", content: "Bài học của cô Mai luôn sinh động, nhiều ví dụ thực tế. Mình thích cách cô kết hợp văn hóa Nhật vào bài giảng." },
];

/** Testimonial trang chủ (từ components/Social.tsx). */
export const SITE_TESTIMONIALS = [
  { authorName: "Nguyễn Hoàng Anh", authorRole: "Sinh viên ĐH Ngoại thương", content: "Bài giảng dễ hiểu, lộ trình rõ ràng và rất phù hợp với người Việt. Mình đã đỗ JLPT N4 sau 6 tháng!" },
  { authorName: "Trần Thu Phương", authorRole: "Nhân viên văn phòng", content: "Giáo viên nhiệt tình, bài tập đa dạng. Mình đặc biệt thích phần luyện nghe và flashcard, rất hiệu quả!" },
  { authorName: "Lê Minh Đức", authorRole: "Kỹ sư IT, đang làm việc tại Nhật", content: "Nihongo+ không chỉ giúp mình học tiếng Nhật mà còn hiểu thêm về văn hóa Nhật Bản. Trải nghiệm rất tuyệt!" },
  { authorName: "Phạm Gia Hân", authorRole: "Học sinh lớp 12", content: "Học trên điện thoại mọi lúc mọi nơi, streak giúp mình duy trì thói quen mỗi ngày. Rất đáng tiền!" },
  { authorName: "Đỗ Quang Huy", authorRole: "Biên dịch viên", content: "Lớp luyện thi N2 bám sát đề thật, thầy chữa bài rất kỹ. Mình đã đậu ngay lần thi đầu tiên." },
];

export const REVIEW_GOOD = [
  "Bài giảng ngắn gọn, dễ hiểu, ví dụ rất sát thực tế. Mình học buổi tối sau giờ làm mà vẫn theo kịp.",
  "Lộ trình rõ ràng, mỗi bài đều có bài tập củng cố ngay nên nhớ lâu hơn hẳn so với tự học.",
  "Giáo viên giải thích ngữ pháp rất logic, phân biệt các mẫu dễ nhầm cực kỳ kỹ.",
  "Phần luyện nghe chất lượng, giọng đọc chuẩn, tốc độ vừa phải. Rất đáng tiền!",
  "Mình đã đỗ JLPT sau khi học hết khóa, phần đọc hiểu cải thiện rõ rệt.",
  "Flashcard và chuỗi ngày học giúp mình duy trì thói quen học mỗi ngày.",
  "Video bài giảng sinh động, có furigana đầy đủ nên người mới như mình không bị ngợp.",
  "Thầy cô phản hồi câu hỏi trong phần bình luận rất nhanh và nhiệt tình.",
  "Tài liệu đi kèm đầy đủ, in ra ôn tập rất tiện. Cảm ơn đội ngũ Nihongo+!",
  "Học xong khóa mình tự tin giao tiếp cơ bản với đồng nghiệp người Nhật.",
  "Nội dung được cập nhật theo đề thi mới, bài tập phong phú và có giải thích chi tiết.",
  "Cô dạy rất có tâm, lồng ghép văn hóa Nhật khiến buổi học không hề nhàm chán.",
  "Giao diện dễ dùng, học trên điện thoại cũng mượt. Tiến độ đồng bộ giữa các thiết bị.",
  "Phần Kanji có mẹo nhớ theo bộ thủ rất hay, mình nhớ được gấp đôi so với trước.",
];

export const REVIEW_MID = [
  "Nội dung tốt nhưng mong có thêm bài tập luyện nói.",
  "Khóa học ổn, tuy nhiên một số video hơi dài, nên chia nhỏ hơn.",
  "Phần ngữ pháp hay nhưng phần nghe hơi ít so với mong đợi.",
  "Giáo viên dạy dễ hiểu, nhưng mình mong có thêm đề thi thử.",
];

export const REVIEW_BAD = [
  "Video bài 7 bị giật, tải chậm vào buổi tối. Mong đội ngũ kiểm tra lại.",
  "Phần giải thích đáp án một số câu chưa rõ ràng, mình vẫn chưa hiểu vì sao sai.",
  "Mình mong có hỗ trợ trực tiếp nhanh hơn, gửi câu hỏi 2 ngày mới được trả lời.",
];

export const REPORT_SAMPLES = [
  { type: "lesson", content: "Phụ đề ở phút 03:15 bị lệch so với lời thoại khoảng 2 giây." },
  { type: "lesson", content: "Furigana của chữ 「生」 trong ví dụ thứ hai bị sai, phải là 「う」 chứ không phải 「せい」." },
  { type: "question", content: "Câu này có hai đáp án đều đúng (B và C), mong admin kiểm tra lại." },
  { type: "question", content: "Đáp án đúng đang được đánh dấu là A nhưng phần giải thích lại nói là D." },
  { type: "post", content: "Ví dụ về ～ために trong bài viết bị thiếu trợ từ を." },
  { type: "lesson", content: "Âm thanh phần hội thoại bị rè, nghe không rõ ở cuối bài." },
  { type: "question", content: "Câu hỏi nghe không phát được audio trên Safari iPhone." },
  { type: "post", content: "Link tải tài liệu trong bài viết không mở được." },
];

export const COMMENT_SAMPLES = [
  "Cô ơi cho em hỏi sự khác nhau giữa ～ように và ～ために ạ?",
  "Bài giảng dễ hiểu quá, cảm ơn thầy cô!",
  "Phần ví dụ thứ 3 em chưa hiểu lắm, có thể giải thích thêm được không ạ?",
  "Mình học lại bài này lần thứ 3 mới thấm, ai cùng học thì kết bạn nhé.",
  "Có ai có mẹo nhớ mấy chữ Kanji trong bài không ạ?",
  "Video chất lượng tốt, mong có thêm bài tập luyện nói.",
  "Em làm bài tập được 9/10, sai câu số 4, mọi người giải thích giúp em với.",
  "Cảm ơn Nihongo+, nhờ khóa này mình đã đỗ N4!",
  "Phát âm của cô chuẩn quá, mình đang shadowing theo bài này.",
  "Cho mình hỏi ～てもいいです và ～てもかまいません có khác nhau không?",
  "Ad ơi phần tài liệu PDF của bài này ở đâu vậy?",
  "Hôm nay streak 30 ngày rồi, cố lên mọi người!",
];

export const COMMENT_REPLIES = [
  "～ように dùng khi mục đích không phụ thuộc ý chí, còn ～ために dùng với động từ ý chí nhé bạn.",
  "Bạn xem lại phút 05:20 trong video, cô có giải thích chi tiết đó.",
  "Cảm ơn bạn đã góp ý, đội ngũ sẽ bổ sung thêm bài tập sớm nhất!",
  "Tài liệu nằm ở tab Tài liệu ngay dưới video đó bạn.",
];

export const COMMENT_SPAM = [
  "Inbox mình để mua tài khoản học giá rẻ nhé!!!",
  "Bài này chán, không học được gì.",
];
