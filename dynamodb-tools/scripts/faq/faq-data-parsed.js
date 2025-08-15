const faqsData = [
  // HIGH (고등학생) - 授業・カリキュラム
  {
    sourceId: 'HIGH_A-1',
    grade: 'HIGH',
    category: '授業・カリキュラム',
    question: '大学受験対策はどの科目に対応していますか？',
    mainBubble: '3.14コミュニティでは、英語・数学・国語・理科・社会の主要5科目すべてに対応しています。',
    subBubble: '志望大学や入試形式（共通テスト・推薦など）に合わせてお子様専用のカリキュラム・プランをご提案いたします🧑‍🏫',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  {
    sourceId: 'HIGH_A-2',
    grade: 'HIGH',
    category: '授業・カリキュラム',
    question: '難関大学向けの指導はありますか？',
    mainBubble: 'はい、ございます！3.14コミュニティでは、北海道大学をはじめとした難関大学志望の方向けに「難関国立大受験コース」「有名私立大受験コース」を用意しております。',
    subBubble: 'また、さらに上のレベルを目指す方には、よりパーソナルなコーチングをご提供する「Brains Gym」もおすすめです☺️Brains Gymのサイトはこちら➡️ https://www.brainsgym.com/',
    ctaBubble: 'ご興味がございましたら、いつでもご相談くださいね！',
    hasLink: true
  },
  {
    sourceId: 'HIGH_A-3',
    grade: 'HIGH',
    category: '授業・カリキュラム',
    question: '定期テスト対策と受験対策は両立できますか？',
    mainBubble: 'もちろん可能です！3.14コミュニティでは、学校別の定期テスト対策と、大学受験に向けた長期的な指導を同時に行っています。',
    subBubble: '担任が学習スケジュールをしっかり管理し、どちらもバランスよくサポートいたしますのでご安心ください✨',
    ctaBubble: '他にもご不安な点があれば、お気軽にご相談くださいね！'
  },
  {
    sourceId: 'HIGH_A-4',
    grade: 'HIGH',
    category: '授業・カリキュラム',
    question: '苦手な科目だけ受講することは可能ですか？',
    mainBubble: 'はい、可能です！3.14コミュニティの授業は『超・個人別指導』なので、必要な科目だけピンポイントで学習できます。',
    subBubble: 'AI教材と講師の連携により、苦手分野を見える化し、効率的に克服していきます✏️',
    ctaBubble: 'お気軽に無料体験からスタートしてみてくださいね！'
  },
  {
    sourceId: 'HIGH_A-5',
    grade: 'HIGH',
    category: '授業・カリキュラム',
    question: '高1・高2から受験対策を始められますか？',
    mainBubble: 'はい、むしろ高1・高2からのスタートが理想的です！3.14では志望校別の長期プランを設計し、早期から無理なく受験準備ができます。',
    subBubble: 'また、推薦や総合型選抜などにも対応したサポート体制を整えています🧑‍🏫',
    ctaBubble: 'タイミングに関するご相談も、お気軽にどうぞ！'
  },
  // HIGH (고등학생) - 通塾・学習時間
  {
    sourceId: 'HIGH_B-1',
    grade: 'HIGH',
    category: '通塾・学習時間',
    question: '部活と両立できますか？',
    mainBubble: 'はい、もちろん可能です！3.14コミュニティでは、部活や学校生活と両立しながら学べる個別時間割を組むことができます。',
    subBubble: '授業がない日も自習スペースをご利用いただけるので、スキマ時間を有効に活用できます👀▶️ 時間割の例はこちら（image）',
    ctaBubble: '両立のご相談も大歓迎です。ぜひお気軽にご相談ください！'
  },
  {
    sourceId: 'HIGH_B-2',
    grade: 'HIGH',
    category: '通塾・学習時間',
    question: '自習室はいつでも使えますか？',
    mainBubble: 'はい、開校時間内であれば授業のない日でも自習室をご利用いただけます！',
    subBubble: '講師が近くにいる環境なので、わからないところをすぐに質問できるのも安心ポイントです❣️',
    ctaBubble: 'どんどん活用して、学習リズムを整えていきましょう！'
  },
  {
    sourceId: 'HIGH_B-3',
    grade: 'HIGH',
    category: '通塾・学習時間',
    question: '通塾の時間帯は選べますか？',
    mainBubble: 'はい、ご希望の時間帯に合わせて、通塾スケジュールを個別に設定できます。',
    subBubble: '部活や学校の行事と両立できるよう、担任が最適な時間割をご提案いたします✨▶️ 時間割の例はこちら（image）',
    ctaBubble: 'お気軽にご希望をお聞かせくださいね！'
  },
  {
    sourceId: 'HIGH_B-4',
    grade: 'HIGH',
    category: '通塾・学習時間',
    question: '授業の振替はできますか？',
    mainBubble: '体調不良や急な予定変更などがあっても大丈夫です！🙆‍♀️',
    subBubble: '担任にご連絡いただければ、柔軟に振替対応させていただきますのでご安心ください✨',
    ctaBubble: '学びのリズムを崩さず続けられるよう、しっかりサポートいたします。'
  },
  {
    sourceId: 'HIGH_B-5',
    grade: 'HIGH',
    category: '通塾・学習時間',
    question: '夏期・冬期講習はどのくらいの期間ありますか？',
    mainBubble: '講習会は春・夏・冬にそれぞれ実施しており、期間はおおよそ1〜3週間程度です。',
    subBubble: '日程や受講内容は自由に選べるので、部活や帰省との両立も可能です✨',
    ctaBubble: '詳細なスケジュールはお気軽にお問い合わせください！'
  },
  // HIGH (고등학생) - 料金・制度
  {
    sourceId: 'HIGH_C-1',
    grade: 'HIGH',
    category: '料金・制度',
    question: '授業料はいくらですか？学年や科目で変わりますか？',
    mainBubble: '3.14コミュニティでは、授業受け放題の【定額制】を導入しています✨',
    subBubble: '受講科目であれば、どれだけ授業を受けても定額で必要な学習サポートが受けられるのが特徴です。▶️ 料金プランはこちら(image)',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！',
    hasImage: true
  },
  {
    sourceId: 'HIGH_C-2',
    grade: 'HIGH',
    category: '料金・制度',
    question: '教材費は別途かかりますか？',
    mainBubble: 'はい、教材費は別途ご案内しておりますが、必要な分のみをご提案しております。',
    subBubble: 'お子様専用のカリキュラムに応じて、最適な教材を選定いたします📚',
    ctaBubble: '無理なく学べるように配慮していますのでご安心ください！'
  },
  {
    sourceId: 'HIGH_C-3',
    grade: 'HIGH',
    category: '料金・制度',
    question: '無料体験はできますか？',
    mainBubble: 'はい！3.14コミュニティでは、体験授業や教室見学を随時受け付けております。',
    subBubble: null,
    ctaBubble: '実際の雰囲気や授業スタイルを体感してから入塾をご検討ください🙇‍♂'
  },
  {
    sourceId: 'HIGH_C-4',
    grade: 'HIGH',
    category: '料金・制度',
    question: '複数科目の受講は割引がありますか？',
    mainBubble: 'はい！複数科目の受講で1科目あたりの料金がお得になります。',
    subBubble: '『苦手はじっくり』『得意は先取り』など、教科を組み合わせて学べるのが3.14の魅力です✨▶️ 料金プランはこちら(image)',
    ctaBubble: '-詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！',
    hasImage: true
  },
  {
    sourceId: 'HIGH_C-5',
    grade: 'HIGH',
    category: '料金・制度',
    question: '模試や外部試験の費用は含まれますか？',
    mainBubble: '模試や外部試験などは、コースに応じて別途ご案内する場合があります。',
    subBubble: 'ただし、担任が一人ひとりに必要なものだけをご提案いたしますのでご安心ください❣️',
    ctaBubble: '結果は丁寧にフィードバックし、次の学習計画に活かします！'
  },
  // MIDDLE (중학생) - 授業・カリキュラム
  {
    sourceId: 'MIDDLE_A-1',
    grade: 'MIDDLE',
    category: '授業・カリキュラム',
    question: '定期テスト対策はしてもらえますか？',
    mainBubble: 'はい、もちろんです！3.14コミュニティでは、学校ごとの試験範囲や出題傾向に合わせた定期テスト対策を行っています✏️',
    subBubble: '追加の授業が必要になっても、定額制だから安心してしっかり取り組めます✨',
    ctaBubble: '無料体験でもテスト対策の雰囲気をご体験いただけますよ！'
  },
  {
    sourceId: 'MIDDLE_A-2',
    grade: 'MIDDLE',
    category: '授業・カリキュラム',
    question: '学校の教科書に合わせた授業ですか？',
    mainBubble: 'はい、通っている学校の教科書や進度に合わせて、授業内容をカスタマイズしています📚',
    subBubble: '定期テスト対策はもちろん、次学年の先取りなど様々なニーズにお答えできます！(image)',
    ctaBubble: '実際の授業内容は見学や資料請求でご確認ください！',
    hasImage: true
  },
  {
    sourceId: 'MIDDLE_A-3',
    grade: 'MIDDLE',
    category: '授業・カリキュラム',
    question: '苦手な教科を集中的に見てもらえますか？',
    mainBubble: 'もちろん可能です！AIで理解度を分析し、苦手単元を特定した上で、ピンポイントで対策していきます🧠',
    subBubble: '理解のズレを解消し、自信につなげていくサポートを全力で行います✨(image)',
    ctaBubble: '詳しく知りたい方は、ぜひ一度ご相談か体験授業をご利用ください！',
    hasImage: true
  },
  {
    sourceId: 'MIDDLE_A-4',
    grade: 'MIDDLE',
    category: '授業・カリキュラム',
    question: '宿題や課題のフォローはありますか？',
    mainBubble: 'はい、担任が日々の学習状況を見守っているので、宿題の進み具合や理解度もばっちり把握しています🧑‍🏫',
    subBubble: 'わからないところはすぐ質問OK！自習スペースでもサポートを受けられます✨',
    ctaBubble: 'ご不安な方は、まず無料体験や教室見学がおすすめです😊'
  },
  {
    sourceId: 'MIDDLE_A-5',
    grade: 'MIDDLE',
    category: '授業・カリキュラム',
    question: '高校受験対策はいつから始めるべきですか？',
    mainBubble: 'できるだけ早い時期からの準備がおすすめです！3.14では中1・中2の基礎づくりが、入試本番の得点力に直結しています📈',
    subBubble: '中3からは本格的に過去問演習や模試対策など『入試対策ゼミ』で徹底対策をしましょう。(image)',
    ctaBubble: 'まずは資料請求や体験授業で、スタートのタイミングをご相談ください！',
    hasImage: true
  },
  // MIDDLE (중학생) - 通塾・学習時間
  {
    sourceId: 'MIDDLE_B-1',
    grade: 'MIDDLE',
    category: '通塾・学習時間',
    question: '部活と両立できますか？',
    mainBubble: 'はい、もちろんです！3.14コミュニティでは、部活や習い事と両立しやすい時間帯で授業を受けられます。',
    subBubble: '授業のない日でも自習スペースで学習できるので、スキマ時間の活用にも最適です📖▶️ 時間割の例はこちら(image)',
    ctaBubble: 'ご希望の通塾スケジュールなど、ぜひお気軽にご相談ください！',
    hasImage: true
  },
  {
    sourceId: 'MIDDLE_B-2',
    grade: 'MIDDLE',
    category: '通塾・学習時間',
    question: '自習室はいつでも使えますか？',
    mainBubble: 'はい、開校時間内であればいつでも自習室をご利用いただけます！',
    subBubble: '授業のない日でも先生が近くにいて、質問や学習サポートを受けられる環境です🧑‍🏫',
    ctaBubble: '実際の自習室の雰囲気は、見学や体験でご確認いただけます😊'
  },
  {
    sourceId: 'MIDDLE_B-3',
    grade: 'MIDDLE',
    category: '通塾・学習時間',
    question: '通塾の時間帯は選べますか？',
    mainBubble: 'はい、通塾の曜日・時間帯はご都合に合わせて自由に設定できます。',
    subBubble: '担任が部活やご家庭のスケジュールをヒアリングして、無理のない学習計画をご提案します🗓️▶️ 時間割の例はこちら(image)',
    ctaBubble: 'ご希望の時間帯をお気軽にご相談ください！',
    hasImage: true
  },
  {
    sourceId: 'MIDDLE_B-4',
    grade: 'MIDDLE',
    category: '通塾・学習時間',
    question: '授業の振替はできますか？',
    mainBubble: 'はい、もちろんです👌体調不良や予定変更の際もご安心ください！',
    subBubble: '担任にご連絡いただければ、振替授業や自習サポートでフォローいたします❣️',
    ctaBubble: '柔軟な対応が可能なので、気になる方は体験時にご相談ください。'
  },
  {
    sourceId: 'MIDDLE_B-5',
    grade: 'MIDDLE',
    category: '通塾・学習時間',
    question: '夏期・冬期講習はどのくらいの期間ありますか？',
    mainBubble: '講習会は夏・冬・春に実施しており、各シーズン2週間前後のスケジュールが目安です。',
    subBubble: '内容や日程は個別にカスタマイズできるので、帰省や部活との両立も可能です✨',
    ctaBubble: '講習内容の詳細は、パンフレットや体験時にご案内しております！'
  },
  // MIDDLE (중학생) - 料金・制度
  {
    sourceId: 'MIDDLE_C-1',
    grade: 'MIDDLE',
    category: '料金・制度',
    question: '授業料はいくらですか？学年や科目で変わりますか？',
    mainBubble: '3.14コミュニティでは、授業受け放題の【定額制】を導入しています🧑‍🏫',
    subBubble: '必要な授業やサポートを自由に受けられるのが特長です！▶️ 料金プランはこちら(image)',
    ctaBubble: '料金詳細は教室でのご案内か、資料請求をご活用ください！',
    hasImage: true
  },
  {
    sourceId: 'MIDDLE_C-2',
    grade: 'MIDDLE',
    category: '料金・制度',
    question: '教材費は別途かかりますか？',
    mainBubble: 'はい、教材費は別途ご案内しておりますが、必要な分のみをご提案しております。',
    subBubble: 'お子様専用のカリキュラムに応じて、最適な教材を選定いたします📚',
    ctaBubble: '無理なく学べるように配慮していますのでご安心ください！'
  },
  {
    sourceId: 'MIDDLE_C-3',
    grade: 'MIDDLE',
    category: '料金・制度',
    question: '無料体験はできますか？',
    mainBubble: 'はい！3.14コミュニティでは、体験授業や教室見学を随時受け付けております。',
    subBubble: null,
    ctaBubble: '実際の雰囲気や授業スタイルを体感してから入塾をご検討ください🙇‍♂'
  },
  {
    sourceId: 'MIDDLE_C-4',
    grade: 'MIDDLE',
    category: '料金・制度',
    question: '複数科目の受講は割引がありますか？',
    mainBubble: 'はい！複数科目の受講で1科目あたりの料金がお得になります。',
    subBubble: '『苦手はじっくり』『得意は先取り』など、教科を組み合わせて学べるのが3.14の魅力です✨▶️ 料金プランはこちら(image)',
    ctaBubble: '-詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！',
    hasImage: true
  },
  {
    sourceId: 'MIDDLE_C-5',
    grade: 'MIDDLE',
    category: '料金・制度',
    question: '模試や外部試験の費用は含まれますか？',
    mainBubble: '模試や外部試験などは、コースに応じて別途ご案内する場合があります。',
    subBubble: 'ただし、担任が一人ひとりに必要なものだけをご提案いたしますのでご安心ください❣️',
    ctaBubble: '結果は丁寧にフィードバックし、次の学習計画に活かします！'
  },
  // ELEMENTARY (小学生) - 授業・カリキュラム
  {
    sourceId: 'ELEMENTARY_A-1',
    grade: 'ELEMENTARY',
    category: '授業・カリキュラム',
    question: '小学校の授業に合わせた指導ですか？',
    mainBubble: 'はい、3.14コミュニティでは、学校ごとの教科書や授業進度に合わせて丁寧にサポートしています🧑‍🏫',
    subBubble: 'つまずきやすい単元も、個別に立ち止まってしっかり理解を深められます。',
    ctaBubble: '詳しい指導内容は体験授業や資料請求でご覧いただけます📘'
  },
  {
    sourceId: 'ELEMENTARY_A-2',
    grade: 'ELEMENTARY',
    category: '授業・カリキュラム',
    question: '中学受験コースはありますか？',
    mainBubble: 'はい、希望される方には中学受験に向けた個別対応が可能です！',
    subBubble: '志望校のレベルや出題傾向に合わせて、カリキュラムを柔軟にカスタマイズいたします✨',
    ctaBubble: 'まずはご希望の受験校や開始時期について、お気軽にご相談ください😊'
  },
  {
    sourceId: 'ELEMENTARY_A-3',
    grade: 'ELEMENTARY',
    category: '授業・カリキュラム',
    question: '低学年でも集中して取り組めますか？',
    mainBubble: 'はい、ご安心ください！一人ひとりの集中力や理解度に合わせて、無理のないスモールステップで学習を進めていきます。',
    subBubble: '講師が近くで見守り、声かけしながら進めるので、自然と学ぶ姿勢が身につきます🧑‍🏫',
    ctaBubble: '体験授業で実際の様子をご確認いただけますよ！'
  },
  {
    sourceId: 'ELEMENTARY_A-4',
    grade: 'ELEMENTARY',
    category: '授業・カリキュラム',
    question: '漢字・計算など基礎から見てもらえますか？',
    mainBubble: 'もちろんです！学年の枠にとらわれず、お子さま一人ひとりの習熟度に合わせて基礎から丁寧に指導します。',
    subBubble: '『わかった！できた！』の成功体験を積み重ねることで、学ぶ楽しさが育ちます✨',
    ctaBubble: '詳しい内容は、教室での体験や面談でご確認いただけます📒'
  },
  {
    sourceId: 'ELEMENTARY_A-5',
    grade: 'ELEMENTARY',
    category: '授業・カリキュラム',
    question: '宿題はありますか？',
    mainBubble: 'はい、お子さまに応じて無理のない範囲で宿題を出しています📃',
    subBubble: '家庭学習の習慣づけや、授業で学んだ内容の定着を目的としています。',
    ctaBubble: 'どんな宿題が出るか気になる方は、体験時にぜひチェックしてみてください😀'
  },
  // ELEMENTARY (小学生) - 通塾・学習時間
  {
    sourceId: 'ELEMENTARY_B-1',
    grade: 'ELEMENTARY',
    category: '通塾・学習時間',
    question: '学童や他の習い事と両立できますか？',
    mainBubble: 'はい、多くのお子さまが学童や習い事と両立しながら通塾しています！',
    subBubble: '通う曜日や時間帯は柔軟に設定でき、学習時間も無理のない範囲で調整できます🗓️',
    ctaBubble: 'まずはスケジュールのご希望を体験時にご相談ください☺️'
  },
  {
    sourceId: 'ELEMENTARY_B-2',
    grade: 'ELEMENTARY',
    category: '通塾・学習時間',
    question: '授業の時間帯は何時からですか？',
    mainBubble: '平日は15:30〜、土曜は13:30〜など、学年や希望に応じて時間帯を選べます。',
    subBubble: '放課後すぐに来るお子さまもいれば、夕方の習い事後に通う方もいます🏫',
    ctaBubble: '詳しい時間帯のご案内は教室または無料体験でご確認いただけます！'
  },
  {
    sourceId: 'ELEMENTARY_B-3',
    grade: 'ELEMENTARY',
    category: '通塾・学習時間',
    question: '保護者の送り迎えは必要ですか？',
    mainBubble: '低学年のお子さまは、安全面を考慮して送迎をお願いするケースが多いです👪',
    subBubble: '通塾ルートや時間帯に応じて、通学方法をご提案することも可能です。',
    ctaBubble: 'まずは体験時に通塾のご不安をご相談ください！'
  },
  {
    sourceId: 'ELEMENTARY_B-4',
    grade: 'ELEMENTARY',
    category: '通塾・学習時間',
    question: '週1回だけでも通えますか？',
    mainBubble: 'はい、週1回から通塾できます！学習習慣の定着や学びのきっかけづくりにもおすすめです。',
    subBubble: '学年や目的に応じて、最適な頻度をご提案いたします✨',
    ctaBubble: 'まずは【無料体験】で雰囲気をご確認ください🧑‍🏫'
  },
  {
    sourceId: 'ELEMENTARY_B-5',
    grade: 'ELEMENTARY',
    category: '通塾・学習時間',
    question: '長期休みの講習はありますか？',
    mainBubble: 'はい、春・夏・冬に講習会を実施しています。復習や先取り、苦手克服など目的に応じて参加できます！',
    subBubble: '講習期間は通常2週間程度で、日程も柔軟に組めます🗓️',
    ctaBubble: '講習内容の詳細は、パンフレットや無料体験でご確認いただけます📘'
  },
  // ELEMENTARY (小学生) - 料金・制度
  {
    sourceId: 'ELEMENTARY_C-1',
    grade: 'ELEMENTARY',
    category: '料金・制度',
    question: '小学生の授業料はいくらですか？',
    mainBubble: '3.14コミュニティでは、授業受け放題の【定額制】を導入しています🧑‍🏫',
    subBubble: '必要な授業やサポートを自由に受けられるのが特長です！▶️ 料金プランはこちら(image)',
    ctaBubble: '料金詳細は教室でのご案内か、資料請求をご活用ください！',
    hasImage: true
  },
  {
    sourceId: 'ELEMENTARY_C-2',
    grade: 'ELEMENTARY',
    category: '料金・制度',
    question: '兄弟で通うと割引はありますか？',
    mainBubble: 'はい、ご兄弟・姉妹での通塾には【兄弟割引】の制度がございます❣️',
    subBubble: 'ご家庭の教育ニーズに合わせて、柔軟にご提案させていただきます。',
    ctaBubble: '割引内容の詳細は、教室または体験時にお気軽にご相談ください😊'
  },
  {
    sourceId: 'ELEMENTARY_C-3',
    grade: 'ELEMENTARY',
    category: '料金・制度',
    question: '教材費や年会費はありますか？',
    mainBubble: 'はい、教材費は別途ご案内しておりますが、必要な分のみをご提案しております。',
    subBubble: 'お子様専用のカリキュラムに応じて、最適な教材を選定いたします📚',
    ctaBubble: '無理なく学べるように配慮していますのでご安心ください！'
  },
  {
    sourceId: 'ELEMENTARY_C-4',
    grade: 'ELEMENTARY',
    category: '料金・制度',
    question: '無料体験はできますか？',
    mainBubble: 'はい！3.14コミュニティでは、体験授業や教室見学を随時受け付けております。',
    subBubble: null,
    ctaBubble: '実際の雰囲気や授業スタイルを体感してから入塾をご検討ください🙇‍♂'
  },
  {
    sourceId: 'ELEMENTARY_C-5',
    grade: 'ELEMENTARY',
    category: '料金・制度',
    question: '入塾テストはありますか？',
    mainBubble: '基本的には入塾テストは行っておりませんので、どなたでも安心してご入会いただけます☺️',
    subBubble: '学力診断や面談を通して、最適な学習スタートをご提案します！',
    ctaBubble: 'まずは体験やご相談からお気軽に始めていただけますよ🙋'
  },
  // PRESCHOOL (幼児) - 授業・カリキュラム
  {
    sourceId: 'PRESCHOOL_A-1',
    grade: 'PRESCHOOL',
    category: '授業・カリキュラム',
    question: '何歳から通えますか？',
    mainBubble: '3.14コミュニティでは、年少（満3歳）頃から通っていただけます。',
    subBubble: '遊びの中で思考力・集中力・ことばの力を育てる「脳力開発コース」をご用意しています🏃‍♀️',
    ctaBubble: 'まずは見学や体験でお子さまのご様子をご確認いただけます😊'
  },
  {
    sourceId: 'PRESCHOOL_A-2',
    grade: 'PRESCHOOL',
    category: '授業・カリキュラム',
    question: '小学校受験に対応していますか？',
    mainBubble: 'はい、小学校受験をお考えのご家庭向けに、対応したカリキュラムのご相談も可能です👩‍🎓',
    subBubble: '思考力・言語・集団活動など、目的に合わせた支援をご提案します！',
    ctaBubble: '詳しくは教室までお気軽にお問い合わせください☺️'
  },
  {
    sourceId: 'PRESCHOOL_A-3',
    grade: 'PRESCHOOL',
    category: '授業・カリキュラム',
    question: '授業はどんな内容ですか？',
    mainBubble: '3.14コミュニティの幼児コースでは、3つの学びのプログラムをご用意しています。',
    subBubble: '🧠 パズル道場：図形・数理パズルで“考える力”と粘り強さを育成🔤 Lepton（レプトン）：英語4技能をバランスよく育てる個別学習🤖 クレファス：ロボット製作やプログラミングで創造力と思考力を伸ばす',
    ctaBubble: '実際の活動は体験レッスンや見学でご覧いただけます！'
  },
  {
    sourceId: 'PRESCHOOL_A-4',
    grade: 'PRESCHOOL',
    category: '授業・カリキュラム',
    question: '遊びと学びのバランスはどうなっていますか？',
    mainBubble: '無理な詰め込みはせず、遊びの中に“学びの芽”を散りばめたプログラムです。',
    subBubble: '「できた！」「たのしい！」を大切にしながら、自信と集中力を育てていきます✈️',
    ctaBubble: 'お子さまのペースに合わせた指導についても、体験時にご相談いただけます😊'
  },
  {
    sourceId: 'PRESCHOOL_A-5',
    grade: 'PRESCHOOL',
    category: '授業・カリキュラム',
    question: '人見知りでも大丈夫ですか？',
    mainBubble: 'ご安心ください。初めての場が不安なお子さまには、少人数・個別対応でゆっくり慣れていただきます。',
    subBubble: '先生が一人ひとりの表情や反応を見ながら、やさしく関わります✨',
    ctaBubble: 'ご心配な点は体験時にぜひご相談ください。保護者同伴での見学も可能です！👪'
  },
  // PRESCHOOL (幼児) - 通塾・学習時間
  {
    sourceId: 'PRESCHOOL_B-1',
    grade: 'PRESCHOOL',
    category: '通塾・学習時間',
    question: '保育園や幼稚園との両立はできますか？',
    mainBubble: 'はい、多くのお子さまが保育園・幼稚園に通いながら、週1〜2回の通塾で両立しています。',
    subBubble: '夕方や土曜日などの時間帯を選んで通えるので、無理なく続けられます✨',
    ctaBubble: 'ご家庭のスケジュールに合わせた通塾プランをご提案いたします😊'
  },
  {
    sourceId: 'PRESCHOOL_B-2',
    grade: 'PRESCHOOL',
    category: '通塾・学習時間',
    question: '通う頻度はどのくらいが理想ですか？',
    mainBubble: '基本的には週1回から通塾できますが、集中力や目的に応じて週2回のコースもご用意しています。',
    subBubble: '「はじめての学び」に慣れるところから、少しずつペースを作っていきます✨',
    ctaBubble: 'まずは週1回から試せる体験レッスンにご参加ください😊'
  },
  {
    sourceId: 'PRESCHOOL_B-3',
    grade: 'PRESCHOOL',
    category: '通塾・学習時間',
    question: '保護者の同伴は必要ですか？',
    mainBubble: '通塾時の同伴は任意です。はじめは保護者の方が付き添っていただいても構いません。',
    subBubble: 'お子さまが慣れてきたタイミングで、お預けいただくスタイルも選べます❣️',
    ctaBubble: '見学や体験の際に、お子さまの様子を見ながらご相談いただけます😊'
  },
  {
    sourceId: 'PRESCHOOL_B-4',
    grade: 'PRESCHOOL',
    category: '通塾・学習時間',
    question: '午後と午前のクラスがありますか？',
    mainBubble: '教室によって異なりますが、午前中・午後の両方の時間帯で開講している日もございます。',
    subBubble: 'お子さまの生活リズムや園のスケジュールに合わせてご相談可能です✨',
    ctaBubble: '詳しい開講曜日・時間帯は、教室または体験時にご確認いただけます📅'
  },
  {
    sourceId: 'PRESCHOOL_B-5',
    grade: 'PRESCHOOL',
    category: '通塾・学習時間',
    question: '欠席時のフォローはありますか？',
    mainBubble: '体調不良やご都合による欠席には、振替対応や内容の補完をご案内しています🙆‍♀️',
    subBubble: '学びのペースが崩れないよう、個別にしっかりフォローいたします！',
    ctaBubble: '欠席時の対応について詳しく知りたい方は、お気軽にご相談ください😊'
  },
  // PRESCHOOL (幼児) - 料金・制度
  {
    sourceId: 'PRESCHOOL_C-1',
    grade: 'PRESCHOOL',
    category: '料金・制度',
    question: '幼児コースの料金はいくらですか？',
    mainBubble: '幼児コースはお選びいただくプログラムによって料金が異なります🏫',
    subBubble: '- 英語教室「Lepton」: 月額 9,790円 ~ - 思考力育成「パズル道場」: 月額 6,600円 ~- ロボット製作講座「crefas」：月額 9,750円 ~',
    ctaBubble: 'それぞれの内容や教材費については、無料体験や資料請求で詳しくご案内しております😊'
  },
  {
    sourceId: 'PRESCHOOL_C-2',
    grade: 'PRESCHOOL',
    category: '料金・制度',
    question: '入会金・教材費はかかりますか？',
    mainBubble: 'はい、入会時には所定の入会金と教材費がかかります。',
    subBubble: 'ただし、必要な教材だけをご案内するので、無駄なご負担はありません📚',
    ctaBubble: '費用の詳細については、資料請求または体験時にご確認いただけます😊'
  },
  {
    sourceId: 'PRESCHOOL_C-3',
    grade: 'PRESCHOOL',
    category: '料金・制度',
    question: '無料体験はありますか？',
    mainBubble: 'はい、3.14コミュニティでは幼児のお子さま向けに【無料体験レッスン】をご用意しています！',
    subBubble: '初めての環境でも安心して過ごせるよう、先生がやさしくサポートいたします✨',
    ctaBubble: 'ぜひお気軽にお申し込みください🙆‍♀️'
  },
  {
    sourceId: 'PRESCHOOL_C-4',
    grade: 'PRESCHOOL',
    category: '料金・制度',
    question: '定期的な成長レポートはもらえますか？',
    mainBubble: 'はい、お子さまの成長の様子や取り組み内容について、定期的にフィードバックをお渡ししています。',
    subBubble: '家庭でも成長の変化を感じられるよう、丁寧なコメントをお届けしています✨',
    ctaBubble: '気になる点があればいつでも面談でご相談いただけます😊'
  },
  {
    sourceId: 'PRESCHOOL_C-5',
    grade: 'PRESCHOOL',
    category: '料金・制度',
    question: '他の年齢層に切り替えるタイミングは？',
    mainBubble: '就学前後のタイミングで、小学生向けコースへのスムーズな切り替えが可能です。',
    subBubble: '「もう少し先取りしたい」「集中力が伸びてきた」など、お子さまの成長に応じてご提案します✨',
    ctaBubble: '面談や体験を通して、最適なタイミングをご一緒に考えていきましょう😊'
  }
];

module.exports = faqsData;
