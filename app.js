const sourceCards = window.AP_CARDS || [];
const stateKey = "ap-term-trainer-curated-v2-r03-h29";

function normalizeAlias(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[ー－‐\s・()（）]/g, "")
    .trim();
}

function compactAliases(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = normalizeAlias(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function initials(value) {
  const words = String(value).match(/[A-Za-z][A-Za-z0-9]*/g) || [];
  return words.length >= 2 ? words.map((word) => word[0]).join("") : "";
}

function visualKey(card) {
  const answer = String(card.term || "");
  const field = String(card.field || "");
  const category = String(card.category || "");
  const text = `${answer} ${field} ${card.topic || ""} ${card.cue || ""}`;
  const exact = {
    ARP: "dns",
    NAPT: "reverseProxy",
    CRL: "crl",
    OCSP: "ocsp",
    IPsec: "trust",
    CVSS: "cve",
    VDI: "system",
    RFI: "cycle",
    SFA: "strategy",
    BCP: "contingency",
    CRM: "strategy",
    RPA: "system",
    JSON: "json",
    SVG: "system",
    SDN: "sdn",
    SOA: "soa",
    PoE: "poe",
    DHCP: "dns",
    DNS: "dns",
    WAF: "waf",
    SPF: "spf",
    DKIM: "trust",
    DMARC: "trust",
    TPM: "trust",
    SEO: "strategy",
    ROI: "strategy",
    TCO: "strategy",
    IFRS: "strategy",
    GPU: "system",
    SoC: "system",
    BLE: "lpwa",
    RFID: "system",
    Hadoop: "data",
  };
  if (exact[answer]) return exact[answer];
  if (/NoSQL|グラフ指向DB|データレイク|データベース|正規化|ACID|トランザクション/.test(text)) return "data";
  if (/セキュリティ|認証|暗号|攻撃|脆弱|マルウェア|ハイジャック|タンパ|インジェクション/.test(text)) return "security";
  if (/ネットワーク|通信|LAN|IP|MAC|プロトコル|ルータ|ハブ|無線/.test(text)) return "system";
  if (/監査|プロジェクト|サービス|インシデント|問題管理|スクラム|RACI|バックアップ/.test(text)) return "cycle";
  if (/経営|ビジネス|調達|マーケティング|会計|法|KPI|KGI|バリュー|シェア|契約/.test(text)) return "strategy";
  if (category === "database") return "data";
  if (category === "security") return "security";
  if (category === "network") return "system";
  if (category === "management") return "cycle";
  if (category === "strategy") return "strategy";
  return "mechanism";
}

function cleanForCard(value, answer) {
  let text = String(value || "")
    .replaceAll("この用語", answer)
    .replace(/\s+/g, " ")
    .trim();
  for (const prefix of [`${answer}とは`, `${answer}は`]) {
    if (text.startsWith(prefix)) {
      text = text.slice(prefix.length).replace(/^[，、]/, "").trim();
      break;
    }
  }
  for (const open of ["(", "（"]) {
    const close = open === "(" ? ")" : "）";
    const prefix = answer + open;
    if (!text.startsWith(prefix)) continue;
    const end = text.indexOf(close, prefix.length);
    const rest = end >= 0 ? text.slice(end + close.length) : "";
    if (/^(とは|は)[，、]?/.test(rest)) {
      text = rest.replace(/^(とは|は)[，、]?/, "").trim();
      break;
    }
  }
  return text
    .replace(/です。.*$/, "です。")
    .replace(/ます。.*$/, "ます。")
    .trim();
}

function splitSentences(value) {
  return String(value || "")
    .replace(/([。．])(?=\S)/g, "$1\n")
    .split(/\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function trimForQuestion(value) {
  return String(value || "")
    .replace("ソフトウェア制御によって物理的なネットワーク構成にとらわれない動的で柔軟なネットワークを実現する技術全般を意味します", "ソフトウェア制御でネットワークを動的・柔軟に実現する技術")
    .replace(/技術全般を意味します$/, "技術")
    .replace(/全般を意味します$/, "")
    .replace(/を意味します$/, "")
    .replace(/であること$/, "")
    .replace(/すること$/, "する")
    .trim();
}

function clipText(value, limit = 56) {
  const text = trimForQuestion(value);
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const phrase = cut.replace(/[，、。．][^，、。．]*$/, "");
  return (phrase.length >= 18 ? phrase : cut).replace(/[，、。．]+$/, "") + "。";
}

const manualExpansions = {
  "Git": ["分散型バージョン管理ツール"],
  "ACID": ["Atomicity Consistency Isolation Durability"],
  "トランザクションのACID特性": ["Atomicity Consistency Isolation Durability"],
  "CSMA/CD方式": ["Carrier Sense Multiple Access with Collision Detection"],
  "CSMA/CD": ["Carrier Sense Multiple Access with Collision Detection"],
  "JPCERTコーディネーションセンター": ["Japan Computer Emergency Response Team Coordination Center"],
  "RACIチャート": ["Responsible Accountable Consulted Informed"],
  "SECIモデル": ["Socialization Externalization Combination Internalization"],
  "UTF-8": ["Unicode Transformation Format 8-bit"],
  "LPWA": ["Low Power Wide Area"],
  "SSID": ["Service Set Identifier"],
  "SIEM": ["Security Information and Event Management"],
  "SSH": ["Secure Shell"],
  "CMMI": ["Capability Maturity Model Integration"]
};
const termOrigins = {
  "Git": "Gitは分散型バージョン管理ツール。リポジトリは履歴付きの保管場所で、中央リポジトリは共有元、ローカルリポジトリは各自の手元コピー。",
  "RFID": "RFID = Radio Frequency Identification。Radio Frequencyは電波、Identificationは識別。RFタグやICタグのIDを電波で読み取る。",
  "ACID": "ACID = Atomicity、Consistency、Isolation、Durability。原子性、一貫性、独立性、永続性の4性質。",
  "トランザクションのACID特性": "ACID = Atomicity、Consistency、Isolation、Durability。原子性、一貫性、独立性、永続性の4性質。",
  "リスクベース認証": "risk-based = 危険度に基づく。普段と違う場所や端末なら追加確認する認証方式。",
  "レインボー攻撃": "rainbow tableは事前計算した対応表。パスワード候補とハッシュ値の表で照合を速くする攻撃。",
  "バーンダウンチャート": "burn down = 燃え尽きて減る。残作業量が時間とともに下がる線を読む。",
  "フェーズ・ゲート": "phaseは段階、gateは門。各段階の出口で、次へ進むかを判定する。",
  "ウォッチドッグタイマー": "watchdogは番犬。一定時間応答がないと、番犬のように異常を検知して再起動などを促す。",
  "ファウンドリーサービス": "foundryは鋳造所。ITでは半導体チップを設計会社の代わりに製造する会社・サービス。",
  "キャズム理論": "chasmは深い溝。初期採用者と一般市場の間にある普及の壁を指す。",
  "アグリゲーションサービス": "aggregationは集約。複数の情報や口座を一か所にまとめて見せるサービス。",
  "アカウントアグリゲーション": "account aggregation = 口座やアカウントの集約。複数金融機関の情報をまとめて表示する。",
  "データレイク": "lakeは湖。整形前の生データを、湖のように広くためて後で使う考え方。",
  "サンドボックス": "sandboxは砂場。外へ影響しにくい隔離環境で、安全に実行して調べる。",
  "ハイパーバイザ": "hypervisorは仮想マシンの監督役。物理マシン上で複数OSを動かす土台。",
  "スタブ": "stubは切り株・短い代用品。未完成の下位モジュールの代わりに置く仮部品。"
};
const relatedRules = [
  { terms: ["Git"], text: "関連語: リポジトリ=履歴付き保管場所、コミット=変更記録、ブランチ=作業の分岐。" },
  { terms: ["RFID"], text: "関連語: RFタグ/ICタグ=IDを持つタグ、リーダライタ=タグを読む装置、パッシブ方式=電池なしで読取機の電波から動く方式。" },
  { terms: ["ARP"], text: "関連語: IPアドレス=ネットワーク上の住所、MACアドレス=LAN機器の識別番号、RARPは逆向き。" },
  { terms: ["RARP"], text: "関連語: ARPはIPからMAC、RARPはMACからIP。Reverseが逆向きの合図。" },
  { terms: ["NAPT"], text: "関連語: NAT=IPアドレス変換、ポート番号=同じIP内の通信口、IPマスカレードはNAPTの別名。" },
  { terms: ["CVSS"], text: "関連語: 脆弱性=弱点、スコア=点数化、深刻度=対応優先度の目安。" },
  { terms: ["IPsec"], text: "関連語: IP層=ネットワーク層、暗号化=盗聴対策、認証=相手確認、改ざん検知=内容変更の検出。" },
  { terms: ["RFI"], text: "関連語: RFPは提案依頼、RFQは見積依頼。RFIはInformationなので情報収集が目的。" },
  { terms: ["VDI"], text: "関連語: 仮想デスクトップ=サーバ上のPC画面、シンクライアント=手元端末を軽くする構成。" },
  { terms: ["CRUDマトリクス"], text: "関連語: Create=生成、Read=参照、Update=更新、Delete=削除。機能とデータの関係表。" },
  { terms: ["ACID", "トランザクションのACID特性"], text: "関連語: 原子性=全部実行か全部取消、一貫性=整合性維持、独立性=同時実行で乱れない、永続性=確定後は残る。" },
  { terms: ["NoSQL"], text: "関連語: RDBは表形式、KVSはキーと値、ドキュメント指向はJSON風、グラフ指向は点と線。" },
  { terms: ["WAF"], text: "関連語: FWは通信の入口を見る、WAFはWebアプリの中身に近いHTTPデータを見る。" },
  { terms: ["DNSSEC", "DNSキャッシュポイズニング", "DNSキャッシュポイズニング攻撃"], text: "関連語: DNS=名前解決、キャッシュ=一時保存、署名=応答が本物か確かめる印。" },
  { terms: ["BCP"], text: "関連語: 事業継続=止めない、復旧=戻す、RTO=復旧目標時間、RPO=復旧時点目標。" },
  { terms: ["RPA"], text: "関連語: 定型作業=手順が決まった作業、ロボット=画面操作を代行するソフト。" },
  { terms: ["CRM"], text: "関連語: 顧客関係=購入履歴や問合せを管理し、販売やサポートに生かす。" },
  { terms: ["SCM"], text: "関連語: supply chain=調達から販売までの供給の流れ。在庫・物流・販売をつなぐ。" },
  { terms: ["UML", "SysML"], text: "関連語: モデリング=複雑な構造や振る舞いを図で表すこと。UMLはソフトウェア、SysMLはシステム寄り。" }
];
function cleanExpansion(value) { return String(value || "").replace(/[：:].*ジェイソン/, "").replace(/[：:][ 　]*$/, "").replace(/，/g, "、").replace(/[ 　]+/g, " ").trim(); }
function escapeRegExp(value) {
  const specials = ".^$|?*+()[]{}-" + String.fromCharCode(92);
  const slash = String.fromCharCode(92);
  return String(value || "").split("").map((ch) => specials.includes(ch) ? slash + ch : ch).join("");
}
function extractExpansions(card) {
  const found = [];
  const push = (value) => {
    const cleaned = cleanExpansion(value);
    if (cleaned && cleaned.length >= 3 && !found.some((item) => normalizeAlias(item) === normalizeAlias(cleaned))) found.push(cleaned);
  };
  for (const item of manualExpansions[card.term] || []) push(item);
  const term = String(card.term || "").replace(/方式$/, "");
  const source = [card.explanation, card.correctText, card.question, card.topic].join(" ");
  const escaped = escapeRegExp(term);
  const pairRe = new RegExp(escaped + "[（(]([^）)]{3,120})[）)]", "g");
  for (const match of source.matchAll(pairRe)) push(match[1]);
  const abbrRe = new RegExp(escaped + "(?:方式)?は[、，]?[ 　]*([A-Z][A-Za-z0-9 /+.-]{5,120})の略", "g");
  for (const match of source.matchAll(abbrRe)) push(match[1]);
  return found.slice(0, 3);
}
function originFor(card, expansion) {
  if (termOrigins[card.answer]) return appendRelated(card, termOrigins[card.answer]);
  if (originHints[card.id] || originHints[card.answer]) return appendRelated(card, originHints[card.id] || originHints[card.answer]);
  const expanded = expansion || (card.expansions || [])[0] || "";
  if (expanded) return appendRelated(card, card.answer + " = " + expanded + "。英語の語を日本語の働きに分解して覚える。");
  if (originHints[card.visual]) return appendRelated(card, originHints[card.visual]);
  return appendRelated(card, genericOrigin(card));
}
function appendRelated(card, origin) { const related = relatedFor(card); return related ? origin + " " + related : origin; }
function relatedFor(card) {
  const hit = relatedRules.find((rule) => rule.terms.includes(card.answer)); if (hit) return hit.text;
  const text = card.answer + " " + card.topic + " " + card.category;
  if (/プロトコル|通信|ネットワーク|LAN|IP|MAC|DNS/.test(text)) return "関連語: プロトコル=通信の約束、アドレス=相手を識別する番号。";
  if (/データベース|SQL|トランザクション|DB/.test(text)) return "関連語: 表=行と列、キー=データを識別する値、整合性=データのつじつま。";
  if (/認証|暗号|証明|攻撃|脆弱|セキュリティ/.test(text)) return "関連語: 認証=本人確認、暗号化=読めなくする、脆弱性=攻撃される弱点。";
  if (/プロジェクト|サービス|管理|監査|運用/.test(text)) return "関連語: 管理=状態を見て調整すること、評価=基準に照らして確認すること。";
  if (/経営|マーケティング|会計|契約|調達|顧客/.test(text)) return "関連語: 戦略=目的達成の方針、指標=状態を数値で見るもの。";
  return "";
}
function genericOrigin(card) {
  const term = card.answer;
  if (/方式$/.test(term)) return "方式はmethodの意味。処理のやり方・手順を答えるカード。";
  if (/法$/.test(term)) return "法はmethodの意味。手順や考え方の型として覚える。";
  if (/図|チャート|ダイアグラム/.test(term)) return "図・チャート・ダイアグラムは、関係や流れを目で表す道具。";
  if (/管理/.test(term)) return "管理はmanagement。状態を集め、基準に合わせて調整する働き。";
  if (/分析/.test(term)) return "分析はanalysis。対象を分けて、傾向や原因を見つける働き。";
  if (/モデル/.test(term)) return "モデルはmodel。複雑なものを理解しやすい形に単純化したもの。";
  if (/サービス/.test(term)) return "サービスはservice。利用者や他組織に提供する働きとして覚える。";
  if (/攻撃/.test(term)) return "攻撃はattack。どこから入り、何を悪用するかで見分ける。";
  if (/認証/.test(term)) return "認証はauthentication。相手が本人かどうかを確かめる働き。";
  return term + "は『" + easyText(card.memory) + "』を指す名前。語の部品と問題文の働きを結び付けて覚える。";
}

const mnemonicHints = {
  "バブルソート": "隣同士を比べて交換",
  "コンテナ型仮想化": "アプリ一式を箱に入れる",
  "Git": "変更履歴を分散管理",
  "RFID": "電波でタグを読む",
  "ウォッチドッグタイマー": "応答が止まったら再起動",
  "コンピュータグラフィックス技法": "面の明るさを計算",
  "分散データベースシステム": "場所を意識させないDB",
  "ARP": "IPからMACを引く",
  "NAPT": "住所とポートを書き換える",
  "耐タンパ性": "中を見られても守る",
  "CVSS": "脆弱性に点数を付ける",
  "IPsec": "IP層で暗号化",
  "CRUDマトリクス": "機能とデータ操作の表",
  "アクティビティ図": "処理の流れを見る",
  "バーンダウンチャート": "残作業が減る線",
  "フェーズ・ゲート": "段階ごとに続行判定",
  "プレシデンスダイアグラム法": "作業を箱と矢印で結ぶ",
  "情報セキュリティ監査": "守り方を第三者目線で確認",
  "VDI": "デスクトップをサーバ側へ",
  "RFI": "情報提供を依頼",
  "ファウンドリーサービス": "半導体の製造請負",
  "バリューチェーン": "価値を生む活動の連鎖",
  "バリューチェーン分析": "活動ごとに強みを見る",
  "リーンスタートアップ": "小さく作って検証",
  "SFA": "営業活動を支援",
  "デジタルツイン": "現実をデジタルに写す",
  "ギグエコノミー": "単発仕事で働く市場",
  "エッジコンピューティング": "現場近くで処理",
  "SL理論": "部下の成熟度で型を変える",
  "特定電子メール法": "迷惑広告メールを規制",
  "GPU": "並列計算が得意",
  "グリッドコンピューティング": "多数の計算資源を束ねる",
  "キャッシュメモリ制御方式": "近くの高速記憶を使う",
  "Hadoop": "分散して大量データ処理",
  "SoC": "チップに機能を集約",
  "コンデンサ": "電気を一時的に蓄える",
  "SVG": "拡大に強いXML画像",
  "グラフ指向DB": "点と線で関係を保存",
  "データレイク": "生データを広くためる",
  "BLE": "低消費電力の近距離通信",
  "IEEE802.11ac": "高速な無線LAN規格",
  "SDN": "制御をソフト側へ分離",
  "リスクベース認証": "危険度で追加確認",
  "JPCERTコーディネーションセンター": "国内の事故対応窓口",
  "セッションハイジャック対策": "Cookieを奪われにくくする",
  "スクラム": "短い反復で作る",
  "ペアプログラミング": "二人一組で書く",
  "RACIチャート": "責任分担を4文字で整理",
  "差分バックアップ方式": "前回完全分からの差だけ",
  "オープンAPI": "外部から機能を使わせる窓口",
  "レベニューシェア契約": "売上を分け合う契約",
  "キャズム理論": "普及前の大きな溝",
  "アグリゲーションサービス": "複数情報をまとめて見せる",
  "線形リスト": "要素をポインタでつなぐ",
  "アクティブシャッタ方式": "左右の目を交互に遮る",
  "ページング": "使う前にページを読む",
  "ページング方式": "主記憶をページ単位で割る",
  "ディストリビュータ": "OSSをまとめて配る",
  "DRAM": "リフレッシュが必要",
  "HDL": "回路を言語で書く",
  "PWM": "パルス幅で制御",
  "GRANT": "権限を与えるSQL",
  "トランザクションのACID特性": "取引処理の4性質",
  "ACID": "取引処理の4性質",
  "PoE": "LANケーブルで給電",
  "スイッチングハブ": "宛先MACで転送",
  "DHCPDISCOVERメッセージ": "IP設定を探す最初の声",
  "CRL": "失効証明書の一覧",
  "OCSP": "失効状態を即時確認",
  "SEO": "検索結果で見つけてもらう",
  "C&Cサーバ": "感染端末へ命令する拠点",
  "TPM": "鍵を守る専用チップ",
  "IMAPS": "メール受信を暗号化",
  "ウォークスルー法": "流れをたどって確認",
  "ROI": "投資に対する利益",
  "SOA": "サービス単位で組み合わせる",
  "デルファイ法": "専門家意見を反復集約",
  "パテントプール": "特許をまとめて許諾",
  "サイバーフィジカルシステム": "現実と情報を結び付ける",
  "SoE": "利用者との接点を重視",
  "情報流通プラットフォーム対処法": "投稿流通サービスの責任",
  "リアルタイムシステム": "期限内の応答が必須",
  "プログラムカウンター": "次に実行する番地",
  "DisplayPort": "映像出力の規格",
  "SDカード": "容量区分に注意",
  "キャパシティプランニング": "将来の負荷に備える",
  "2相コミットプロトコル": "全員確認してから確定",
  "CSMA/CD方式": "衝突を検出して再送",
  "CSMA/CD": "衝突を検出して再送",
  "チャレンジレスポンス方式": "乱数に応答して本人確認",
  "WPA2-PSK": "共有鍵で無線LAN保護",
  "エクスプロイトキット": "脆弱性攻撃の道具箱",
  "ファジング": "異常入力を大量投入",
  "ペトリネット": "並行処理を場所と遷移で表す",
  "JIS X 25010:2013": "品質特性の分類",
  "プロジェクトマネジメントオフィス": "PMを横断支援",
  "サービス・パッケージ": "サービス内容のまとまり",
  "インシデント管理": "止まったサービスを戻す",
  "BCP": "事業を止めない計画",
  "TCO": "所有にかかる総費用",
  "オープンデータ": "誰でも使える公開データ",
  "CRM": "顧客関係を管理",
  "RPA": "定型作業をロボット化",
  "アカウントアグリゲーション": "複数口座をまとめて見る",
  "コンバージョン率": "訪問から成果への割合",
  "ワークサンプリング法": "瞬間観測で割合推定",
  "IFRS": "国際会計基準",
  "技適マーク": "無線機器の適合表示",
  "TOF方式": "往復時間で距離を測る",
  "JSON": "軽いキー値データ形式",
  "スーパースカラ": "複数命令を同時実行",
  "ZigBee": "低速低電力の近距離通信",
  "アクチュエーター": "信号を動きに変える",
  "レインボー攻撃": "事前計算表で破る",
  "DNSSEC": "DNS応答に署名",
  "サンドボックス": "隔離環境で実行",
  "WAF": "Webアプリの盾",
  "アローダイアグラム": "作業順序を矢印で表す",
  "ユースケース図": "利用者と機能の関係",
  "SECIモデル": "知識変換の4モード",
  "PDM": "製品情報を一元管理",
  "パレート図": "重要な少数を見つける",
  "ハフマン符号化方式": "頻出ほど短い符号",
  "プリエンプション方式": "実行中でもCPUを奪う",
  "レンダリング": "3D情報から画像を作る",
  "NCO": "政府のサイバー司令塔",
  "DNSキャッシュポイズニング攻撃": "偽の名前解決を覚えさせる",
  "DNSキャッシュポイズニング": "偽の名前解決を覚えさせる",
  "ブルートフォース攻撃": "総当たりで試す",
  "ブロックチェーン": "改ざんしにくい分散台帳",
  "無線LANのセキュリティプロトコル": "Wi-Fi暗号化方式を選ぶ",
  "SysML": "システムを図で表す",
  "MVC": "画面・処理・データを分ける",
  "イテレーション": "短い反復で改善",
  "トレンドチャート": "時系列で傾向を見る",
  "サービスレベル管理": "合意水準を守る管理",
  "IT投資ポートフォリオ": "投資を分類して配分",
  "UML": "構造や振る舞いを図で表す",
  "SCM": "供給の流れを管理",
  "クラスタ分析法": "似たもの同士に分ける",
  "チャットボット": "会話で自動応答",
  "CIO": "情報戦略を経営に結ぶ",
  "クリエイティブコモンズ": "利用条件を示すライセンス",
  "VLIW": "長い命令語で並列実行",
  "USB3.0": "高速なUSB規格",
  "フェールソフト": "性能を落として継続",
  "サーフェスモデル": "面だけで形を表す",
  "NoSQL": "表だけに限らないDB",
  "NFV": "ネットワーク機能を仮想化",
  "RARP": "MACからIPを引く",
  "ディレクトリトラバーサル攻撃": "パスをたどって外へ出る",
  "クロス開発": "別環境向けに開発",
  "パラメトリック見積り": "過去データと係数で見積る",
  "PDCA": "改善を回す4段階",
  "EMS": "電子機器の受託製造",
  "UTF-8": "可変長の文字コード",
  "LPWA": "長距離・低消費電力通信",
  "ハイパーバイザ": "仮想マシンを動かす土台",
  "データマイニング": "大量データから知見抽出",
  "SSID": "無線LANの名前",
  "SIEM": "ログを集めて相関分析",
  "サイバーレスキュー隊": "標的型攻撃の被害支援",
  "SSH": "安全な遠隔ログイン",
  "スタブ": "下位モジュールの代役",
  "CMMI": "開発成熟度を測る",
  "情報システム・モデル取引・契約書": "工程ごとに契約を分ける"
};

function mnemonicHint(card, text) {
  if (mnemonicHints[card.term]) return mnemonicHints[card.term];
  const expansion = (card.aliases || []).find((alias) => /[A-Za-z]/.test(alias) && normalizeAlias(alias) !== normalizeAlias(card.term));
  if (expansion && !String(card.term).includes(expansion)) return shortPhrase(expansion, 24);
  const combined = `${card.term} ${card.field} ${card.topic} ${card.category}`;
  if (/認証|証明|鍵|署名|暗号/.test(combined)) return "本人性・改ざん有無を見る";
  if (/攻撃|脆弱|不正|マルウェア/.test(combined)) return "攻撃の入口で見分ける";
  if (/DB|データ|表|トランザクション/.test(combined)) return "データの持ち方で見分ける";
  if (/ネットワーク|通信|LAN|IP|MAC/.test(combined)) return "通信のどこを扱うか";
  if (/プロジェクト|サービス|監査|運用/.test(combined)) return "管理の場面で見分ける";
  if (/経営|マーケティング|会計|顧客/.test(combined)) return "経営判断の軸で見る";
  return fieldHint(card);
}

function fieldHint(card) {
  const field = `${card.field} ${card.category} ${card.topic}`;
  if (/アルゴリズム|データ構造/.test(field)) return "処理手順の形で見る";
  if (/ハードウェア|プロセッサ|メモリ|入出力|計測|制御/.test(field)) return "装置の役割で見分ける";
  if (/データベース|データ操作|トランザクション/.test(field)) return "データの持ち方で見る";
  if (/ネットワーク|通信/.test(field)) return "通信の層で見分ける";
  if (/セキュリティ/.test(field)) return "攻撃か防御かで見る";
  if (/開発|設計|テスト|保守|要件/.test(field)) return "開発工程の役割で見る";
  if (/サービス|プロジェクト|監査|運用/.test(field)) return "管理場面で見分ける";
  if (/経営|マーケティング|調達|会計|財務|知的財産/.test(field)) return "ビジネス上の役割で見る";
  return "選択肢の役割で見分ける";
}

function shortPhrase(value, limit = 22) {
  const text = String(value || "")
    .replace(/の説明はどれか|の特徴はどれか|に関する記述|として適切なものはどれか|はどれか/g, "")
    .replace(/\s+/g, "")
    .trim();
  return text.length > limit ? text.slice(0, limit - 1) + "…" : text;
}

function conciseText(card) {
  const answer = card.term;
  const cue = cleanForCard(card.cue, answer).replaceAll(answer, "この用語");
  const first = trimForQuestion(splitSentences(cue)[0] || cue);
  if (first.length <= 58) return first;
  const beforeComma = first.split(/[，、]/).slice(0, 2).join("、");
  if (beforeComma.length >= 18 && beforeComma.length <= 54) return beforeComma + "。";
  return clipText(first, 54);
}

function conciseMemory(card, text) {
  return mnemonicHint(card, text);
}

const cards = sourceCards.map((card) => {
  const visual = visualKey(card);
  const text = conciseText(card);
  const expansions = extractExpansions(card);
  const aliases = compactAliases([
    card.term,
    ...(card.aliases || []),
    ...expansions,
    initials(card.term),
    ...expansions.map(initials),
  ]);
  return {
    id: card.id,
    answer: card.term,
    text,
    visual,
    memory: conciseMemory(card, text),
    aliases,
    expansions,
    exam: card.examLabel,
    examKey: card.exam,
    url: card.sourceUrl,
    qno: card.qno,
    domain: card.category === "management" ? "マネジメント系" : card.category === "strategy" ? "ストラテジ系" : "テクノロジ系",
    category: card.field,
    topic: card.topic,
    wrongHints: card.wrongHints || {},
  };
});

let progress = JSON.parse(localStorage.getItem(stateKey) || "{}");
let filtered = cards.slice();
let currentIndex = 0;
let mode = "quiz";

const $ = (id) => document.getElementById(id);
const els = {
  examFilter: $("examFilter"),
  domainFilter: $("domainFilter"),
  categoryFilter: $("categoryFilter"),
  searchInput: $("searchInput"),
  weakOnly: $("weakOnly"),
  hideDone: $("hideDone"),
  visibleCount: $("visibleCount"),
  quizView: $("quizView"),
  learnView: $("learnView"),
  listView: $("listView"),
  diagram: $("diagram"),
  cardExam: $("cardExam"),
  cardQno: $("cardQno"),
  cardCategory: $("cardCategory"),
  questionText: $("questionText"),
  answerInput: $("answerInput"),
  feedback: $("feedback"),
  learnContent: $("learnContent"),
  cardList: $("cardList"),
  rightCount: $("rightCount"),
  weakCount: $("weakCount"),
  totalCount: $("totalCount"),
  scoreRing: $("scoreRing"),
};

function normalize(value) {
  return value
    .toLowerCase()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[\s　・ー\-_/()（）.]/g, "");
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (s) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s]));
}

const easyReplacements = [
  ["インフラ構成", "インフラの構成"],
  ["実行環境", "動かすための環境"],
  ["再現", "再作成"],
  ["変更管理", "変更管理"],
  ["複数スレッド", "複数の処理"],
  ["不整合", "食い違い"],
  ["共有データ", "みんなで使うデータ"],
  ["リレーショナル表", "行と列の表"],
  ["仮想表", "仮想の表"],
  ["参照整合性", "関連するデータのつじつま"],
  ["同時実行制御", "同時に使っても矛盾しない仕組み"],
  ["バックエンド", "裏側のサーバ"],
  ["TLS終端", "暗号通信を入口でほどく処理"],
  ["冗長リンク", "予備の通信経路"],
  ["論理的に", "仕組み上"],
  ["木構造", "枝分かれした形"],
  ["認証局", "証明書を発行する機関"],
  ["失効", "無効になること"],
  ["脆弱性影響調査", "弱点の影響調査"],
  ["脆弱性", "弱点"],
  ["ポリシー違反", "ルール違反"],
  ["暗号化して", "読めない形にして"],
  ["暗号化する", "読めない形にする"],
  ["暗号化し", "読めない形にし"],
  ["復旧の対価", "元に戻す見返り"],
  ["誤り検出方式", "誤りを見つける方式"],
  ["誤り検出", "誤りを見つけること"],
  ["検出する", "見つける"],
  ["継続的に", "定期的に"],
  ["権限過多", "権限を与えすぎている状態"],
  ["検出", "見つけること"],
  ["管理手法", "管理のやり方"],
  ["利用不能", "使えない状態"],
  ["早期復旧", "早く元に戻すこと"],
  ["復旧", "元に戻すこと"],
  ["早く元に戻すことする", "早く元に戻す"],
  ["対価", "見返り"],
  ["マルウェア", "悪意のあるソフト"],
  ["暗号化", "読めない形に変えること"],
  ["暗号", "読めない形にする技術"],
  ["復号", "読める形に戻すこと"],
  ["証拠性", "証拠として使える状態"],
  ["保全", "壊さず保存すること"],
  ["解析", "中身を調べること"],
  ["インシデント", "事故や問題"],
  ["要件定義", "何を作るか決める工程"],
  ["ネイティブアプリ", "スマホなどに入れて使うアプリ"],
  ["成熟", "チームがうまく動けるようになること"],
  ["期待値", "確率を含めた平均的な見込み"],
  ["意思決定", "どれを選ぶか決めること"],
  ["疎結合", "互いの影響が少ないつなぎ方"],
  ["アーキテクチャ", "全体の作り"],
  ["併売", "一緒に売れやすいこと"],
  ["ライフサイクル", "始まりから終わりまでの流れ"],
  ["実績収集", "実際に行った結果を集めること"],
  ["低消費電力", "少ない電力で動くこと"],
  ["水平分散", "台数を増やして処理を分けること"],
  ["平衡二分探索木", "左右の高さをそろえた探しやすい木"],
  ["入出力装置", "キーボードやディスクなど外部とやり取りする装置"],
  ["主記憶", "メインメモリ"],
  ["一意なID", "他と重ならない番号"],
  ["機械可読", "コンピュータが読みやすい形"],
  ["クライアント生成", "利用側のプログラムを自動で作ること"],
  ["バイナリデータ", "画像やファイルなど文字だけではないデータ"],
  ["副次情報", "手掛かり"],
  ["秘密情報", "外に出してはいけない情報"],
  ["オンラインで問い合わせる", "ネット経由で確認する"],
  ["部品表", "部品表"],
  ["総当たり攻撃", "候補を片っ端から試す攻撃"],
  ["反復", "短い周期で繰り返すこと"],
  ["主要な要求事項", "大事な要求"],
  ["資源", "サーバやアカウントなど使うもの"],
  ["相対的市場シェア", "競合と比べた市場での強さ"],
  ["価値提案", "顧客に何をうれしく提供するか"],
  ["行動特性", "行動のくせや特徴"],
  ["汎化性能", "初めて見るデータにも当てはまる力"],
  ["被演算子", "計算される数や値"],
  ["不揮発性", "電源を切っても消えない性質"],
  ["トランザクション", "ひとまとまりの処理"],
  ["名前解決", "名前解決"],
  ["オープンリゾルバ", "誰からのDNS問い合わせにも答えるDNSサーバ"],
  ["アサーション", "認証できたことを示す情報"],
  ["シングルサインオン", "一度のログインで複数サービスを使う仕組み"],
  ["漏えい", "外に漏れること"],
  ["共通識別子", "共通で使う番号"],
  ["改ざん", "勝手に書き換えること"],
  ["実行コード", "実際に動くプログラム"],
  ["独立サービス", "それぞれ単独で動かせる小さなサービス"],
  ["階層分解する", "上から下へ細かく分ける"],
  ["階層分解", "上から下へ細かく分ける"],
  ["作業パッケージ", "具体的な作業の単位"],
  ["恒久対策", "一時しのぎではない対策"],
  ["全体最適", "一部だけでなく全体として良くすること"],
  ["双子", "そっくりに再現したもの"],
  ["個別化", "人や注文ごとに変えること"],
  ["均衡", "つり合った状態"],
  ["XMLベース", "XMLという書き方を元にした"],
  ["温室効果ガス", "地球温暖化につながるガス"],
  ["外部委託", "外の会社に任せること"],
  ["成果物", "作って渡すもの"],
  ["除外事項", "やらないこと"],
  ["事前計算", "先に計算しておくこと"],
  ["公開鍵暗号", "公開する鍵と秘密の鍵を使う暗号"],
  ["署名を検証", "本物かどうか確認する"],
  ["統合開発環境", "開発道具がまとまった環境"],
  ["単発・短期", "一回だけ、または短い期間の"],
  ["環境に応じて", "状況に合わせて"],
  ["リスクベース認証", "危なさに応じて本人確認を強める仕組み"],
  ["サブミッション", "送信のための投稿"],
  ["匿名で意見", "名前を出さずに意見"],
  ["委任", "任せること"],
  ["対応関係", "どれとどれがつながるか"],
  ["因果関係", "原因と結果のつながり"],
  ["微小なエネルギー", "とても小さなエネルギー"],
  ["帯電した粒子", "電気を帯びた小さな粒"],
  ["固定長", "決まった長さ"],
  ["原子性", "途中で半端に終わらないこと"],
  ["一貫性", "データのつじつまが合うこと"],
  ["独立性", "同時処理がお互いを乱さないこと"],
  ["永続性", "完了した結果が消えないこと"],
  ["DDoS攻撃", "大量アクセスでサービスを止める攻撃"],
  ["頂上", "一番上"],
  ["故障原因", "壊れた原因"],
  ["リファクタリング", "動きを変えずにコードを整理すること"],
  ["前後関係", "どの作業が先か後か"],
  ["財務", "お金や会計"],
  ["法務", "法律まわり"],
  ["顧客選好", "顧客の好み"],
  ["成熟度", "どれくらい任せられる状態か"],
  ["再入可能", "同時に呼び出しても安全に動ける"],
  ["競合", "ぶつかり合い"],
  ["障害時", "故障や問題が起きたとき"],
  ["分断耐性", "ネットワークが切れても動き続ける性質"],
  ["概念スキーマ", "データ全体の論理的な形"],
  ["内部スキーマ", "実際の保存のされ方"],
  ["外部スキーマ", "利用者ごとの見え方"],
  ["未完了", "まだ終わっていない"],
  ["完了済み", "もう終わった"],
  ["認証", "本人確認"],
  ["認証情報", "ログインに必要な情報"],
  ["仮想記憶", "メモリを大きく見せる仕組み"],
  ["外に漏れること済み", "漏えい済み"],
  ["無効になること状態", "失効状態"],
  ["本人確認結果を本人確認できたことを示す情報で渡す", "認証結果をアサーションで渡す"],
  ["チームがうまく動けるようになること度", "成熟度"],
  ["外の会社に任せることする", "外部委託する"],
  ["まだ終わっていないは", "未完了は"],
  ["もう終わったは", "完了済みは"],
];

function easyText(value) {
  let result = String(value);
  for (const [hard, easy] of easyReplacements) {
    result = result.split(hard).join(easy);
  }
  return result;
}

const glossaryEntries = [
  { id: "rest-api", terms: ["REST API"], title: "REST API", full: "Representational State Transfer API", body: "Webでよく使うAPIの作り方。URLで対象を示し、GETやPOSTなどのHTTPの操作でデータを扱います。" },
  { id: "api", terms: ["API"], title: "API", full: "Application Programming Interface", body: "プログラム同士が機能やデータをやり取りするための窓口です。" },
  { id: "openapi", terms: ["OpenAPI Specification", "Open API Specification", "OpenAPI", "OAS"], title: "OpenAPI Specification", full: "OpenAPI Specification", body: "REST APIの仕様を、機械が読める形で書くための形式です。APIドキュメントやクライアント生成に使えます。" },
  { id: "http", terms: ["HTTPS", "HTTP"], title: "HTTP / HTTPS", full: "Hypertext Transfer Protocol", body: "Webブラウザとサーバが通信するときの約束です。HTTPSは暗号化されたHTTPです。" },
  { id: "db", terms: ["DBMS", "DB"], title: "DB / DBMS", full: "Database / Database Management System", body: "DBはデータベース、DBMSはデータベースを保存・検索・更新するための管理ソフトです。" },
  { id: "sql", terms: ["NoSQL", "SQL"], title: "SQL / NoSQL", full: "Structured Query Language", body: "SQLは表形式データベースを操作する言語です。NoSQLは表形式に限らないデータベースの総称です。" },
  { id: "json", terms: ["JSON"], title: "JSON", full: "JavaScript Object Notation", body: "キーと値の組でデータを書く軽い形式です。Web APIのデータ交換でよく使います。" },
  { id: "xml", terms: ["XML"], title: "XML", full: "Extensible Markup Language", body: "タグで意味を付けてデータを書く形式です。設定やデータ交換で使われます。" },
  { id: "sso", terms: ["SSO", "シングルサインオン"], title: "SSO", full: "Single Sign-On", body: "一度ログインすれば、複数のサービスを続けて使える仕組みです。" },
  { id: "saml", terms: ["SAML認証", "SAML", "アサーション"], title: "SAML", full: "Security Assertion Markup Language", body: "本人確認できたという情報をXML形式で渡し、SSOを実現する仕組みです。アサーションは認証結果を示す情報です。" },
  { id: "dns", terms: ["DNSSEC", "DNS"], title: "DNS / DNSSEC", full: "Domain Name System", body: "DNSはドメイン名をIPアドレスへ変換する仕組みです。DNSSECはDNS応答に署名を付けて改ざんを見つけやすくします。" },
  { id: "ip", terms: ["IPアドレス", "IP"], title: "IPアドレス", full: "Internet Protocol address", body: "ネットワーク上の機器を識別する住所のような番号です。" },
  { id: "waf", terms: ["WAF"], title: "WAF", full: "Web Application Firewall", body: "WebアプリへのHTTP通信を検査し、SQLインジェクションなどを防ぐ仕組みです。" },
  { id: "sbom", terms: ["SBOM"], title: "SBOM", full: "Software Bill of Materials", body: "ソフトウェアに含まれる部品やライブラリの一覧表です。脆弱性の影響調査に使います。" },
  { id: "psirt", terms: ["PSIRT"], title: "PSIRT", full: "Product Security Incident Response Team", body: "自社製品やサービスの脆弱性対応を行うチームです。" },
  { id: "cspm", terms: ["CSPM"], title: "CSPM", full: "Cloud Security Posture Management", body: "クラウド設定を点検し、公開設定ミスや権限過多を見つける管理手法です。" },
  { id: "iac", terms: ["IaC", "Infrastructure as Code"], title: "IaC", full: "Infrastructure as Code", body: "サーバやネットワークなどの設定を手順書ではなくコードで管理し、同じ環境を再現しやすくします。" },
  { id: "poe", terms: ["PoE"], title: "PoE", full: "Power over Ethernet", body: "LANケーブル1本で通信と電力供給を同時に行う仕組みです。" },
  { id: "lru", terms: ["LRU"], title: "LRU", full: "Least Recently Used", body: "最も長い間使われていないものを追い出す置換え方式です。" },
  { id: "mvcc", terms: ["MVCC"], title: "MVCC", full: "Multi-Version Concurrency Control", body: "複数版を持つことで、読込みと書込みを衝突させにくくする同時実行制御です。" },
  { id: "wbs", terms: ["WBS"], title: "WBS", full: "Work Breakdown Structure", body: "プロジェクト作業を階層的に細かく分けた構成図です。" },
  { id: "uml", terms: ["UML"], title: "UML", full: "Unified Modeling Language", body: "ソフトウェアや業務の構造・動きを図で表すための共通記法です。" },
  { id: "ux", terms: ["UX"], title: "UX", full: "User Experience", body: "利用者が製品やサービスを使う前後を含めて得る体験全体です。" },
  { id: "repository", terms: ["リポジトリ", "中央リポジトリ", "ローカルリポジトリ", "repository"], title: "リポジトリ", full: "repository", body: "ファイル本体だけでなく、変更履歴や枝分かれも含めて保管する場所です。Gitでは各自の手元にも完全なリポジトリを持てます。" },
  { id: "commit", terms: ["コミット", "commit"], title: "コミット", full: "commit", body: "変更内容を履歴として確定して残す操作、またはその記録です。" },
  { id: "branch", terms: ["ブランチ", "branch"], title: "ブランチ", full: "branch", body: "作業の流れを枝分かれさせる仕組みです。別作業を並行して進めるときに使います。" },
  { id: "rf-tag", terms: ["RFタグ", "ICタグ", "リーダライタ", "パッシブ方式"], title: "RFタグ / ICタグ", full: "Radio Frequency tag", body: "ID情報を持つ小さなタグです。パッシブ方式は電池を持たず、読取機から受けた電波で動きます。" },
  { id: "version-control", terms: ["バージョン管理", "分散型", "集中型"], title: "バージョン管理", full: "version control", body: "ファイルの変更履歴を記録して戻したり比較したりする仕組みです。分散型は各自が履歴を持ち、集中型は中央を主に使います。" },
];

const glossaryById = Object.fromEntries(glossaryEntries.map((entry) => [entry.id, entry]));
const glossaryTerms = glossaryEntries
  .flatMap((entry) => entry.terms.map((term) => ({ term, lower: term.toLowerCase(), id: entry.id })))
  .sort((a, b) => b.term.length - a.term.length);

function renderRichText(value) {
  const text = easyText(value);
  let html = "";
  for (let i = 0; i < text.length;) {
    const hit = glossaryTerms.find((item) => text.slice(i, i + item.term.length).toLowerCase() === item.lower);
    if (hit) {
      const shown = text.slice(i, i + hit.term.length);
      html += `<button type="button" class="term-link" data-term="${esc(hit.id)}">${esc(shown)}</button>`;
      i += hit.term.length;
    } else {
      html += esc(text[i]);
      i += 1;
    }
  }
  return html;
}

function glossaryNoteHtml(entry) {
  const full = entry.full ? `<p class="term-full">${esc(entry.full)}</p>` : "";
  return `<span class="term-note" role="note"><strong>${esc(entry.title)}</strong>${full}<span>${esc(entry.body)}</span></span>`;
}

function hideAnswerText(card, value) {
  let result = easyText(value);
  for (const alias of card.aliases) {
    if (normalize(alias).length >= 3) {
      result = result.split(alias).join("□□□");
    }
  }
  return result.split(card.answer).join("□□□");
}

function primaryExpansion(card) {
  return card.aliases.find((alias) => /[A-Za-z]/.test(alias) && /\s/.test(alias) && normalize(alias) !== normalize(card.answer)) || "";
}

const curatedLessons = {
  "07_aki-12": {
    cueTitle: "環境を文章でなく材料表にする",
    cue: "サーバやネットワークの設定を、手で読む手順ではなく、実行できる記述として残す。",
    origin: "Infrastructure as Code = インフラをコードとして扱う。",
    analogy: "料理のメモではなく、同じ料理を自動で作るレシピファイル。人の手順理解に頼らないのが合図。",
    choices: "「構成を記述」「同じ環境を再現」「変更管理」が並んだらこれ。単なる運用手順書や設計書ではない。",
    scene: ["設定をファイル化", "実行して環境作成", "同じ状態を何度も再現"]
  },
  "07_aki-26": {
    cueTitle: "表だけに閉じないDB",
    cue: "行と列の表に限定せず、キー値、文書、グラフなどで柔軟に保存する。",
    origin: "Not Only SQL = SQLだけではない、という意味。",
    analogy: "きっちりした帳簿だけでなく、カード箱、書類束、関係図も置ける倉庫。",
    choices: "「リレーショナルに限定しない」「柔軟」「分散」「キー値・ドキュメント」が合図。",
    scene: ["表以外も扱う", "データ形式を選べる", "大規模分散に向く"]
  },
  "07_aki-28": {
    cueTitle: "実体ではなく見せ方",
    cue: "実データを直接持つ表ではなく、必要な行や列だけを表のように見せる。",
    origin: "view = 見え方。DBでは実表を切り出した仮想の表。",
    analogy: "原本の台帳を渡さず、必要欄だけを写した閲覧用シートを見せる。",
    choices: "「仮想表」「実表から切り出す」「利用者には表に見える」があればこれ。実表そのものではない。",
    scene: ["実表から必要部分", "利用者に表として表示", "元データは直接持たない"]
  },
  "07_aki-29": {
    cueTitle: "読む人と書く人を別の版で逃がす",
    cue: "更新中でも、読取り側には古い版を見せ、書込み側は新しい版を作る。",
    origin: "Multi-Version Concurrency Control = 複数の版で同時実行を制御する。",
    analogy: "資料を編集中でも、読者には直前の版を配っておく。編集作業と閲覧をぶつけない。",
    choices: "「複数バージョン」「読取りと書込みの衝突を減らす」が合図。単なる排他ロックとは違う。",
    scene: ["古い版を読む", "新しい版へ書く", "衝突を減らす"]
  },
  "07_aki-31": {
    cueTitle: "サーバ群の前に立つ代理",
    cue: "利用者から見える入口になり、奥のWebサーバへ要求を振り分ける。",
    origin: "reverse proxy = 逆向きの代理。利用者側ではなくサーバ側を代表する。",
    analogy: "店の受付。客は受付に話し、受付が奥の担当者へ回す。",
    choices: "「サーバ側の入口」「負荷分散」「TLS終端」「キャッシュ」が合図。クライアント側の代理と混同しない。",
    scene: ["利用者の入口", "要求を中継", "奥のサーバを隠す"]
  },
  "07_aki-34": {
    cueTitle: "輪を切って木にする",
    cue: "予備の通信経路は残しつつ、ループになる道だけを論理的に止める。",
    origin: "Spanning Tree Protocol = ネットワークを木の形に張るための約束。",
    analogy: "街に環状道路があると迷子の荷物が回り続けるので、一部ゲートを閉じて一本道にする。",
    choices: "「冗長リンク」「ループ防止」「一部ポートをブロック」が合図。",
    scene: ["予備経路あり", "ループ箇所を止める", "木構造で通信"]
  },
  "07_aki-36": {
    cueTitle: "攻撃を段階で切る",
    cue: "偵察から目的達成まで、攻撃者の行動を手順に分けて防御点を探す。",
    origin: "kill chain = 攻撃の連鎖。途中で切れば目的達成を止められる。",
    analogy: "侵入の映画を、下見、侵入、運び出しの場面に分けて対策する。",
    choices: "「偵察」「武器化」「侵入」「目的達成」など段階語が出たらこれ。",
    scene: ["偵察", "侵入", "目的達成前に止める"]
  },
  "07_aki-39": {
    cueTitle: "失効証明書の一覧表",
    cue: "もう信用してはいけない証明書をリストで配り、照合して確認する。",
    origin: "Certificate Revocation List = 証明書の失効リスト。",
    analogy: "入館証の無効者リスト。証明書そのものではなく、失効していないかを見る名簿。",
    choices: "「失効した証明書の一覧」「リストと照合」が合図。オンライン問い合わせならOCSP。",
    scene: ["証明書を受け取る", "失効リストを見る", "載っていたら信用しない"]
  },
  "07_aki-40": {
    cueTitle: "製品の脆弱性窓口",
    cue: "自社製品の弱点報告を受け、修正し、公開時期を調整する組織。",
    origin: "Product Security Incident Response Team = 製品セキュリティ事故対応チーム。",
    analogy: "自社製品のリコール窓口。社内PCの運用監視ではなく、製品利用者へ向いた対応。",
    choices: "「自社製品」「脆弱性受付」「修正」「公開調整」が合図。",
    scene: ["報告を受ける", "影響を分析", "修正と公開を調整"]
  },
  "07_aki-42": {
    cueTitle: "クラウド設定の姿勢検査",
    cue: "公開し過ぎ、権限を与え過ぎ、ルール違反などを継続的に見つける。",
    origin: "Cloud Security Posture Management = クラウドの安全姿勢管理。",
    analogy: "クラウドの健康診断。病気を治すより先に、危ない姿勢を見つける。",
    choices: "「クラウド設定」「設定ミス」「権限過多」「継続的点検」が合図。",
    scene: ["設定を集める", "基準と比べる", "公開ミスを警告"]
  },
  "07_aki-44": {
    cueTitle: "証拠を壊さず調べる",
    cue: "端末やログを保全してから解析し、インシデントの事実を明らかにする。",
    origin: "forensics = 法廷の、鑑識の、という意味。",
    analogy: "事件現場を片付ける前に、写真を撮り、証拠袋に入れ、あとで分析する。",
    choices: "「証拠性」「保全」「ログ解析」「事実解明」が合図。単なる復旧作業ではない。",
    scene: ["証拠を保全", "ログを解析", "事実を説明"]
  },
  "07_aki-49": {
    cueTitle: "Webなのにアプリらしい",
    cue: "Webアプリにオフライン利用、ホーム画面追加、通知などを持たせる。",
    origin: "Progressive Web App = 段階的に強化されたWebアプリ。",
    analogy: "ブラウザで動くが、スマホアプリのようにホーム画面から使える。",
    choices: "「オフライン」「プッシュ通知」「ホーム画面追加」が合図。",
    scene: ["Webで配る", "端末に追加", "アプリ風に使う"]
  },
  "07_aki-52": {
    cueTitle: "チームは段階的に成熟する",
    cue: "形成、混乱、統一、機能という流れでチームの状態を捉える。",
    origin: "Tuckmanは提唱者名。語源より4段階を覚えるカード。",
    analogy: "初対面、ぶつかる、まとまる、自然に動く、の順にチームが育つ。",
    choices: "「形成期」「混乱期」「統一期」「機能期」が出たらこれ。",
    scene: ["形成", "混乱", "統一", "機能"]
  },
  "07_aki-54": {
    cueTitle: "分岐と期待値で選ぶ",
    cue: "選択肢、確率、結果を木にして、どれを選ぶか比較する。",
    origin: "decision tree = 意思決定の木。",
    analogy: "道が枝分かれする地図に、成功確率と得失をメモして進路を選ぶ。",
    choices: "「選択肢」「発生確率」「期待値」「木」が合図。",
    scene: ["選択肢を枝にする", "確率を書く", "期待値で比較"]
  },
  "07_aki-62": {
    cueTitle: "業務機能をサービス部品にする",
    cue: "業務機能を疎結合なサービスとして組み合わせ、再利用しやすくする。",
    origin: "Service-Oriented Architecture = サービス指向アーキテクチャ。",
    analogy: "会計、在庫、顧客管理を部品として呼び出せるようにする。",
    choices: "「サービスとして」「疎結合」「再利用」が合図。単に小さいサービスへ分割ならマイクロサービス寄り。",
    scene: ["業務機能を部品化", "疎結合で呼ぶ", "再利用する"]
  },
  "07_aki-63": {
    cueTitle: "一緒に起きる組合せを探す",
    cue: "大量データから、Aを買う人はBも買う、といった規則を見つける。",
    origin: "association = 関連、結び付き。",
    analogy: "買物かごの中を見て、パンと牛乳が一緒に入る傾向を探す。",
    choices: "「同時購入」「組合せ」「支持度・信頼度」が合図。",
    scene: ["取引を集める", "同時発生を見る", "規則を出す"]
  },
  "07_aki-70": {
    cueTitle: "製品と市場の2軸",
    cue: "既存/新規の製品と市場を組み合わせ、成長戦略を4分類する。",
    origin: "Ansoffは提唱者名。製品×市場の表で覚える。",
    analogy: "今の商品を今の客に売るか、新商品か、新市場か、両方新しいかを分ける。",
    choices: "「市場浸透」「製品開発」「市場開拓」「多角化」が合図。",
    scene: ["製品: 既存/新規", "市場: 既存/新規", "4つの戦略に分類"]
  },
  "07_aki-71": {
    cueTitle: "工場現場の実行管理",
    cue: "作業指示、実績、品質、設備状態を管理し、計画と現場をつなぐ。",
    origin: "Manufacturing Execution System = 製造実行システム。",
    analogy: "工場の現場監督。計画表を、実際の作業・実績に落とす。",
    choices: "「製造現場」「作業指示」「実績収集」「品質・設備」が合図。",
    scene: ["計画を受ける", "現場へ指示", "実績を返す"]
  },
  "07_aki-72": {
    cueTitle: "製品の一生をつなぐ",
    cue: "企画、設計、製造、保守、廃棄まで製品情報を一貫管理する。",
    origin: "Product Lifecycle Management = 製品ライフサイクル管理。",
    analogy: "製品の母子手帳。生まれる前から終わりまで情報を残す。",
    choices: "「製品ライフサイクル」「企画から廃棄まで」「製品情報」が合図。",
    scene: ["企画", "設計・製造", "保守・廃棄まで管理"]
  },
  "07_aki-73": {
    cueTitle: "小さいデータを遠くへ長く",
    cue: "低消費電力で長距離通信し、IoTセンサーの少量データ送信に向く。",
    origin: "Low Power Wide Area = 低電力で広い範囲。",
    analogy: "大容量動画ではなく、畑の温度をときどき遠くへ知らせる通信。",
    choices: "「省電力」「長距離」「少量データ」「IoTセンサー」が合図。",
    scene: ["小さなセンサー", "少量だけ送る", "電池で長く動く"]
  },
  "07_haru-17": {
    cueTitle: "API仕様を機械にも読ませる",
    cue: "REST APIの仕様を決まった形式で書き、文書やクライアントを生成できる。",
    origin: "OpenAPI Specification = API仕様を開いた形式で記述する規格。",
    analogy: "APIの設計図を、人間用の説明書ではなく、道具も読める形式で渡す。",
    choices: "「REST API」「機械可読」「ドキュメント生成」「クライアント生成」が合図。",
    scene: ["仕様を記述", "機械が読む", "文書やコードを生成"]
  },
  "07_haru-29": {
    cueTitle: "LANケーブル一本で通信と電力",
    cue: "データ通信に使うLANケーブルから、機器への給電も行う。",
    origin: "Power over Ethernet = Ethernet越しに電力を送る。",
    analogy: "監視カメラに電源コンセントを別に用意せず、LAN線だけで動かす。",
    choices: "「LANケーブル」「通信と給電」「監視カメラ」「無線AP」が合図。",
    scene: ["LANを接続", "データを送る", "同時に電力も送る"]
  },
  "07_haru-37": {
    cueTitle: "正面ではなく横の手掛かり",
    cue: "秘密そのものではなく、処理時間、電力、電磁波などを観測して推測する。",
    origin: "side channel = 本筋ではない横の経路。",
    analogy: "部屋の中は見えなくても、音や明かりの変化で中の動きを読む。",
    choices: "「処理時間」「消費電力」「電磁波」「本来の入出力ではない」が合図。",
    scene: ["正面の値は見ない", "時間や電力を測る", "秘密を推測"]
  },
  "07_haru-40": {
    cueTitle: "ソフトの部品表",
    cue: "ライブラリ、部品、バージョンを一覧にして、脆弱性の影響範囲を調べる。",
    origin: "Software Bill of Materials = ソフトウェアの材料表。",
    analogy: "食品の原材料表示。どの部品が入っているか分かれば、回収対象を探せる。",
    choices: "「部品表」「依存ライブラリ」「バージョン」「脆弱性影響調査」が合図。",
    scene: ["部品を書き出す", "版を確認", "脆弱性の影響を見る"]
  },
  "07_haru-41": {
    cueTitle: "HTTPSの時だけ送る印",
    cue: "Cookieを平文HTTPでは送らず、HTTPS通信時だけ送るようにする。",
    origin: "Secure属性 = 安全な通信時にだけCookieを送る指定。",
    analogy: "重要な封筒は鍵付き配送のときだけ渡す。",
    choices: "「Cookie」「HTTPS時だけ」「平文HTTPで送らない」が合図。暗号化そのものではなく送信条件。",
    scene: ["Cookieに印を付ける", "HTTPSなら送る", "HTTPなら送らない"]
  },
  "07_haru-42": {
    cueTitle: "入力欄からOS命令を混ぜる",
    cue: "利用者入力にOSコマンドを紛れ込ませ、サーバで意図しない命令を実行させる。",
    origin: "injection = 注入。コマンドを入力値へ混ぜ込む。",
    analogy: "注文欄に料理名ではなく厨房への命令を書き足す攻撃。",
    choices: "「OSコマンド」「入力値に混ぜる」「サーバで実行」が合図。SQLならSQLインジェクション。",
    scene: ["入力欄に混ぜる", "サーバが解釈", "OS命令が実行される"]
  },
  "07_haru-44": {
    cueTitle: "ハッシュ計算を何度も回す",
    cue: "パスワードのハッシュ計算を繰り返し、総当たりにかかる時間を増やす。",
    origin: "stretching = 引き伸ばす。攻撃に必要な時間を引き伸ばす。",
    analogy: "鍵を1回試すたびに長い待ち時間を入れ、全探索を遅くする。",
    choices: "「ハッシュを多数回」「総当たり攻撃を遅くする」が合図。ソルトは別の混ぜ物対策。",
    scene: ["パスワード", "ハッシュを反復", "攻撃時間を増やす"]
  },
  "07_haru-48": {
    cueTitle: "短い反復と実践重視",
    cue: "ペアプログラミング、テスト駆動開発、継続的インテグレーションを重視する。",
    origin: "Extreme Programming = 実践を極端なほど徹底する開発手法。",
    analogy: "小さく作り、すぐ試し、二人で見ながら品質を上げる。",
    choices: "「ペアプログラミング」「TDD」「CI」がまとまって出たらこれ。",
    scene: ["短い反復", "テストを先に", "ペアで改善"]
  },
  "07_haru-67": {
    cueTitle: "市場成長率とシェアの表",
    cue: "事業を市場成長率と相対的市場シェアで分類し、投資配分を考える。",
    origin: "Product Portfolio Management = 製品・事業の組合せ管理。",
    analogy: "稼ぎ頭、問題児、花形、負け犬を地図に置き、資金をどこへ回すか考える。",
    choices: "「市場成長率」「相対的市場シェア」「投資配分」が合図。",
    scene: ["成長率を見る", "市場シェアを見る", "投資先を決める"]
  },
  "07_haru-69": {
    cueTitle: "事業の要素を一枚に並べる",
    cue: "顧客、価値提案、チャネル、収益、コストなどを一枚で整理する。",
    origin: "business model canvas = 事業モデルを描く一枚のキャンバス。",
    analogy: "事業計画を長文でなく、9つの欄がある設計ボードに置く。",
    choices: "「顧客」「価値提案」「チャネル」「収益」「コスト」が一枚ならこれ。",
    scene: ["顧客を置く", "価値を置く", "収益とコストを見る"]
  }
};

const originHints = {
  "04_aki-61": "BCP = Business Continuity Plan。災害や事故でも事業を続けるための計画。",
  "04_haru-26": "CAP定理 = Consistency、Availability、Partition tolerance の三つを同時に完全には満たせないという定理。",
  "04_aki-08": "GPU = Graphics Processing Unit。画像処理向けに発達した、大量並列計算が得意なプロセッサ。",
  "04_aki-30": "ACID = Atomicity、Consistency、Isolation、Durability。トランザクションの4つの約束。",
  "04_aki-31": "DHCP = Dynamic Host Configuration Protocol。端末へIP設定を自動で配る仕組み。",
  "04_haru-32": "PPPoE = PPP over Ethernet。Ethernet上でPPP接続を使う方式。",
  "04_haru-44": "VDI = Virtual Desktop Infrastructure。デスクトップ環境をサーバ側で動かす仕組み。",
  "04_haru-51": "EVM = Earned Value Management。出来高で進捗とコストを一緒に見る管理手法。",
  "04_haru-63": "BPO = Business Process Outsourcing。業務プロセスを外部へ委託すること。",
  crc: "CRC = Cyclic Redundancy Check。循環的な割り算で余りを作り、その余りを検査値にする。",
  thread: "thread = 処理の糸。複数の糸が同時に動いても共有状態を壊さない、という名前で覚える。",
  persona: "persona = 人格・仮面。設計で使う、実在しそうな利用者像のこと。",
  avl: "AVL木 = 提案者 Adelson-Velsky と Landis の頭文字。左右の高さをそろえる二分探索木。",
  dma: "DMA = Direct Memory Access。CPUを通さず、装置がメモリへ直接アクセスする。",
  objectStorage: "object storage = データをファイル階層ではなく、ID付きのオブジェクトとして保存する。",
  lru: "LRU = Least Recently Used。最も最近使われていないものを追い出す。",
  base64: "Base64 = 64種類の文字で表す符号化。バイナリを文字として運ぶための名前。",
  ocsp: "OCSP = Online Certificate Status Protocol。証明書の状態をオンラインで聞く約束。",
  charter: "charter = 憲章・認可書。プロジェクト開始を正式に認める文書。",
  provisioning: "provisioning = provision、つまり必要なものを用意すること。",
  freemium: "freemium = free + premium。無料入口と有料上位機能を組み合わせる。",
  competency: "competency = 成果につながる能力・行動特性。",
  crossValidation: "cross validation = データを交差させて検証する。学習用と検証用を入れ替える。",
  rpn: "Reverse Polish Notation = 逆ポーランド記法。演算子を後ろに置く後置記法。",
  fiberChannel: "Fibre Channel = ストレージ接続向けの高速な通信路。",
  thrashing: "thrashing = 激しく打ち続ける。ページ入替えに追われる状態の比喩。",
  soc: "SoC = System on a Chip。システム機能を一つのチップに載せる。",
  actuator: "actuator = act、動かすもの。信号を物理的な動きに変える装置。",
  tamper: "tamper = いじる・改ざんする。耐タンパ性は、いじられにくい性質。",
  twoPhaseCommit: "2相コミット = 準備確認と確定の2段階でそろえる方式。",
  checkpoint: "checkpoint = 確認地点。障害復旧で戻る起点を作る。",
  dns: "DNS = Domain Name System。名前とIPアドレスを対応付ける仕組み。",
  icmp: "ICMP = Internet Control Message Protocol。IP通信の制御メッセージを扱う。",
  passwordList: "パスワードリスト攻撃 = 漏えい済みリストを別サービスへ試す攻撃。",
  cve: "CVE = Common Vulnerabilities and Exposures。脆弱性に付く共通番号。",
  dnsPoison: "poisoning = 毒を入れる。DNSのキャッシュに偽情報を混ぜる攻撃。",
  exploit: "exploit = 悪用する。脆弱性を実際に突くコード。",
  microservice: "microservice = 小さなサービス。独立した小単位を組み合わせる設計。",
  responsive: "responsive = 反応する。画面幅に反応してレイアウトを変える。",
  fastTracking: "fast tracking = 速い線路に乗せる。順番の作業を重ねて期間を短縮する。",
  followup: "follow-up = 後追い確認。指摘後に改善されたかを見る。",
  openData: "open data by design = 設計段階から公開しやすく作る考え方。",
  ux: "UX = User Experience。画面だけでなく、利用前後を含む体験全体。",
  activity: "activity diagram = 活動・処理の流れを表すUML図。",
  scm: "SCM = Supply Chain Management。供給の連鎖を全体で管理する。",
  cocreation: "co-creation = 共創。企業だけでなく顧客や外部と価値を作る。",
  gameTheory: "game theory = 相手の選択を読んで自分の戦略を考える理論。",
  deepLearning: "deep learning = 深い、多層のニューラルネットワークで学習する手法。",
  hamming: "ハミング符号 = 提案者 Hamming の名前。検査ビットで誤り位置を見つける。",
  storedProcedure: "stored procedure = 保存された手続き。DB側にSQL処理を置く。",
  coalesce: "COALESCE = 合体する。NULLでない最初の値へまとめるSQL関数。",
  starSchema: "star schema = 星型スキーマ。中央の表から周囲の表が伸びる形。",
  csmacd: "CSMA/CD = Carrier Sense Multiple Access with Collision Detection。聞いてから送り、衝突を検出する。",
  threeDS: "3D Secure = カード決済の3領域で本人認証を強める仕組み。",
  oop: "オブジェクト指向 = データと操作をオブジェクトにまとめる考え方。",
  coupling: "結合度 = モジュール同士の依存の強さ。低いほど変更に強い。",
  lean: "lean = ぜい肉がない。ムダを減らして価値提供を速くする。",
  docGenerator: "documentation generator = 文書を生成する道具。コメントから文書を作る。",
  ghg: "GHG = Greenhouse Gas。温室効果ガスの排出量算定基準。",
  auditPaper: "監査調書 = 監査の証拠、判断、結論を残す文書。",
  ea: "EA = Enterprise Architecture。企業全体の業務・データ・技術を整理する。",
  contingency: "contingency = 不測の事態。もしもの時の代替計画。",
  digitalTwin: "digital twin = デジタル上の双子。現実をデータで再現する。",
  massCustomization: "mass customization = 大量生産と個別対応の両立。",
  edge: "edge = 端。クラウド中心ではなく、データ発生源の近くで処理する。",
  nash: "ナッシュ均衡 = 提唱者 Nash の名前。誰も単独変更で得しない状態。",
  fishbone: "フィッシュボーン図 = 魚の骨の形で原因を整理する図。",
  sensitiveInfo: "要配慮個人情報 = 人種、病歴など、特に慎重に扱う個人情報。",
  wbs: "WBS = Work Breakdown Structure。仕事を小さな作業へ分解した構造。",
  sdn: "SDN = Software-Defined Networking。ネットワークの制御をソフトウェアで行う考え方。",
  waf: "WAF = Web Application Firewall。Webアプリを守る防火壁。",
  spf: "SPF = Sender Policy Framework。送信元メールサーバが正しいかDNSで確認する。",
  dkim: "DKIM = DomainKeys Identified Mail。メールに署名を付け、改ざんやなりすましを確認する。",
  san: "SAN = Storage Area Network。サーバとストレージを結ぶ専用ネットワーク。",
  json: "JSON = JavaScript Object Notation。キーと値で軽くデータを表す形式。",
  cap: "CAP = Consistency、Availability、Partition tolerance。",
  sdn: "SDN = Software-Defined Networking。転送機能と制御機能を分け、ソフトウェアで制御する。",
  psirt: "PSIRT = Product Security Incident Response Team。自社製品の脆弱性対応チーム。",
  "05_aki-10": "ウェアレベリング = wear leveling。フラッシュメモリの書込み箇所をならして寿命を延ばす。",
  "05_aki-19": "Linuxカーネル = OSの中核。CPU、メモリ、ファイル、デバイスなどを管理する。",
  "05_aki-25": "rendering = 描画すること。形や光のデータから画像を生成する。",
  "05_aki-27": "外部キー = foreign key。別表の主キーを参照して表同士の関係を保つ列。",
  "05_aki-32": "NAPT = Network Address Port Translation。IPアドレスに加えてポート番号も変換する。",
  "05_aki-35": "multicast = 複数へ送る通信。必要なグループだけに一斉送信する。",
  "05_aki-36": "レインボー攻撃 = 事前計算した表を使い、ハッシュ値から元のパスワードを逆引きする攻撃。",
  "05_aki-37": "ECC = Elliptic Curve Cryptography。楕円曲線を使う公開鍵暗号。",
  "05_aki-42": "secure boot = 安全な起動。起動時に署名を確認して改ざん済みソフトを防ぐ。",
  "05_aki-43": "ransomware = ransom、身代金を要求するマルウェア。",
  "05_aki-50": "IDE = Integrated Development Environment。開発に必要な道具を一体化した環境。",
  "05_aki-51": "スコープ記述書 = プロジェクトで作るもの、作らないものの範囲を書く文書。",
  "05_aki-57": "差分バックアップ = 最後のフルバックアップ以降に変わった分だけ保存する方式。",
  "05_aki-61": "backcasting = 未来の目標から逆算して現在の行動を決める考え方。",
  "05_aki-68": "permission marketing = 許可を得た相手へ情報を届けるマーケティング。",
  "05_aki-70": "open innovation = 社外の知識や技術も使って革新を起こす考え方。",
  "05_aki-72": "gig economy = 単発仕事をネット経由で受発注する働き方の経済圏。",
  "05_aki-74": "resilience = しなやかに回復する力。障害や変化から戻る能力。",
  "05_aki-75": "contingency theory = 状況適合理論。最適な管理方法は状況で変わるという理論。",
  "05_haru-03": "ROC曲線 = Receiver Operating Characteristic 曲線。真陽性率と偽陽性率で分類性能を見る。",
  "05_haru-13": "スケールイン = scale in。サーバ台数などを減らしてシステムを縮小する。",
  "05_haru-20": "コンテナ型仮想化 = OSカーネルを共有し、アプリ実行環境を隔離する仮想化。",
  "05_haru-23": "LiDAR = Light Detection and Ranging。光で距離を測る技術。",
  "05_haru-24": "NFC = Near Field Communication。かざす距離で通信する近距離無線。",
  "05_haru-28": "idempotent = べき等。同じ操作を何度行っても結果が変わらない性質。",
  "05_haru-36": "C&C = Command and Control。感染端末へ命令を送る司令塔。",
  "05_haru-37": "セキュアOS = OSレベルでアクセス制御を強化したOS。",
  "05_haru-39": "ISMAP = Information system Security Management and Assessment Program。政府利用クラウドの安全性評価制度。",
  "05_haru-41": "TPM = Trusted Platform Module。暗号鍵を安全に保管するセキュリティチップ。",
  "05_haru-44": "サブミッションポート = メール送信用の投稿ポート。通常587番を使う。",
  "05_haru-47": "決定表 = decision table。条件の組合せと処理を表で整理する。",
  "05_haru-52": "クリティカルチェーン法 = 資源制約を考慮し、バッファで納期を守る手法。",
  "05_haru-54": "デルファイ法 = 専門家の匿名意見を繰り返し集約して予測や合意を作る。",
  "05_haru-62": "CX = Customer Experience。購入前から利用後までの顧客体験全体。",
  "05_haru-63": "情報銀行 = 本人の委任を受け、個人データを管理・提供する事業者。",
  "05_haru-64": "traceability = 追跡可能性。要求から設計、実装、テストまで対応を追える性質。",
  "05_haru-65": "RFI = Request For Information。提案依頼の前に情報提供を求める文書。",
  "05_haru-68": "戦略マップ = 戦略目標の因果関係を地図のようにつなぐ図。",
  "05_haru-71": "energy harvesting = 周囲の光、振動、熱などから電力を回収する技術。",
  "05_haru-72": "aggregation = 集約。複数サービスや情報を一つにまとめる。",
  "05_haru-80": "groupthink = 集団思考。合意重視で反対意見が出にくくなる現象。",
  "04_aki-09": "ライトスルー = write through。キャッシュ書込みを主記憶にも同時に反映する。",
  "04_aki-11": "電気泳動型電子ペーパー = 電気を帯びた粒子を動かして表示する電子ペーパー。",
  "04_aki-17": "ページング方式 = メモリを固定長ページに分けて管理する方式。",
  "04_aki-22": "フラッシュメモリ = 電源を切っても消えない不揮発性半導体メモリ。",
  "04_aki-25": "H.264/MPEG-4 AVC = 動画を効率よく圧縮する符号化方式。",
  "04_aki-41": "risk assessment = リスクを見つけ、分析し、評価する流れ。",
  "04_aki-45": "fuzzing = 異常な入力を大量に与え、脆弱性や不具合を探す手法。",
  "04_aki-46": "walkthrough = 作成者が説明しながら参加者と確認するレビュー技法。",
  "04_aki-49": "TDD = Test Driven Development。先にテストを書いてから実装する。",
  "04_aki-50": "KPT = Keep、Problem、Try。続けること、問題、試すことを整理する。",
  "04_aki-52": "PDM = Precedence Diagramming Method。作業の前後関係を図で表す手法。",
  "04_aki-55": "問題管理 = インシデントの根本原因を調べ、再発防止を管理するプロセス。",
  "04_aki-67": "due diligence = 買収や投資前に相手企業を詳しく調査すること。",
  "04_aki-68": "ターゲットリターン価格設定 = 目標利益率から逆算して価格を決める方法。",
  "04_aki-69": "コンジョイント分析 = 属性の組合せ評価から顧客の好みを分解する分析。",
  "04_aki-70": "APIエコノミー = API連携で機能やデータを外部へ広げ、価値を作る経済圏。",
  "04_aki-71": "ファブレス = fabrication less。工場を持たず、設計や企画に集中する事業形態。",
  "04_aki-74": "SL理論 = Situational Leadership。部下の成熟度に応じてリーダーシップを変える理論。",
  "04_haru-10": "フルアソシエイティブ方式 = 主記憶ブロックをキャッシュの任意位置に置ける方式。",
  "04_haru-18": "fragmentation = 断片化。空き領域が細切れになる状態。",
  "04_haru-25": "ray tracing = 光線追跡。光の反射や屈折を追って写実的に描く。",
  "04_haru-27": "3層スキーマモデル = 外部、概念、内部の3層でDBを分けて見るモデル。",
  "04_haru-29": "undo/redo = 未完了を取り消し、完了済みを再実行する障害回復方式。",
  "04_haru-30": "data mining = 大量データから隠れた規則を掘り出す分析。",
  "04_haru-38": "チャレンジレスポンス方式 = 秘密そのものを送らず、応答で本人性を示す認証方式。",
  "04_haru-57": "データ管理者 = データ定義、品質、整合性、利用ルールを管理する役割。",
  "04_haru-69": "viral marketing = 口コミがウイルスのように広がることを狙う手法。",
  "04_haru-71": "XBRL = eXtensible Business Reporting Language。財務情報をタグ付けする標準。",
  "04_haru-72": "かんばん方式 = 後工程が必要な分だけ前工程から引き取る生産方式。",
  "04_haru-74": "facilitator = 促進する人。会議や議論を中立に進める支援役。",
  "04_haru-75": "PM理論 = Performance と Maintenance の二軸でリーダーシップを見る理論。",
  "04_haru-78": "不正アクセス禁止法 = 他人のID利用やアクセス制御回避を規制する法律。",
  mechanism: "名前より特徴で覚える用語。問題文の働きと一対一に結び付ける。",
};

const analogyHints = {
  "04_aki-61": "災害時の避難計画ではなく、会社の重要業務を止めないための業務版避難計画。",
  "04_haru-26": "分散DBで、正確さ、いつでも使えること、分断に耐えることを三つ同時に完璧には取れない。",
  "04_aki-08": "一人の職人が難問を解くCPUに対し、GPUは同じ作業を大人数で一斉に片付ける。",
  dns: "電話帳のように、覚えやすい名前から実際の住所であるIPアドレスを引く。",
  lru: "机がいっぱいなら、最近まったく使っていない資料から棚へ戻す。",
  waf: "Webアプリ専用の受付警備。HTTPの中身を見て、怪しい入力を止める。",
  spf: "メールを受け取る側が、差出しドメインの許可済み送信サーバ一覧をDNSで照合する。",
  bcp: "災害時の避難計画ではなく、会社の重要業務を止めないための業務版避難計画。",
  avl: "左右どちらかに傾いた本棚を、回転させてまっすぐ立て直すイメージ。",
  dma: "荷物をCPU受付に毎回通さず、装置からメモリ倉庫へ直送する。",
  objectStorage: "フォルダの場所で探すのではなく、荷物一つずつにID札と説明札を付けて保管する。",
  base64: "画像やファイルを、文字だけ通れる道を通すために64文字の箱へ詰め替える。",
  ocsp: "証明書の有効性を、紙の名簿ではなく窓口へその場で問い合わせる。",
  charter: "プロジェクトの出生届。これで正式に始めてよいと示す。",
  provisioning: "空の部屋に机、鍵、ネット回線をそろえて、すぐ使える状態にする。",
  freemium: "試食は無料、満腹になる本商品は有料という入口設計。",
  competency: "成果を出す人の行動を型紙にして、育成や評価で使う。",
  crossValidation: "テスト範囲を入れ替えながら、偶然その問題だけ解けたのではないか確かめる。",
  rpn: "普通は「3 + 4」だが、後置記法では「3 4 +」と、計算命令を後ろに置く。",
  fiberChannel: "一般道路ではなく、サーバとストレージ専用の高速道路。",
  thrashing: "机が狭すぎて、勉強より資料の出し入ればかりしている状態。",
  soc: "CPUや通信機能などを、別々の部品ではなく一枚のチップにまとめた弁当箱。",
  actuator: "センサーが目なら、アクチュエータは手足。信号を動きに変える。",
  tamper: "開けると壊れる封印箱のように、解析や改ざんをしにくくする。",
  twoPhaseCommit: "全員に『準備できた？』と聞いてから、全員で一斉に確定する。",
  checkpoint: "ゲームのセーブ地点。障害後にそこから復旧を始められる。",
  icmp: "通信そのものの荷物ではなく、届かない・確認したいという連絡メモ。",
  saml: "本人確認済みの通行証を別サービスへ渡す。",
  passwordList: "一つの店から漏れた合鍵束を、別の店のドアにも試す攻撃。",
  cve: "脆弱性に付く全国共通の受付番号。名前が違っても同じ弱点を指せる。",
  dnsPoison: "電話帳の記憶に偽の住所を書き込んで、利用者を別の場所へ向かわせる。",
  sbom: "食品の原材料表示のソフト版。どのライブラリが入っているか分かる。",
  dnssec: "DNSの返事に署名を付けて、偽の返事ではないか確認する。",
  exploit: "鍵穴の弱点を実際に突く道具。弱点情報だけでなく、悪用するコード。",
  microservice: "巨大な一枚岩の店ではなく、会計・在庫・配送を小さな専門店に分ける。",
  responsive: "画面幅に合わせて、机上の資料を一列にも二列にも並べ替える。",
  wbs: "大きな仕事を、作業の小箱へ割って積み上げる。",
  fastTracking: "本来は順番待ちの作業を、重ねられる部分だけ並行して走らせる。",
  followup: "指摘を出して終わりではなく、直ったかを後日見に行く。",
  openData: "公開すると決めてから整えるのではなく、作る時点から公開しやすくしておく。",
  ux: "画面の見た目だけでなく、探す、使う、困る、また使うまでの体験を見る。",
  activity: "業務の流れを、開始、分岐、並行、終了として道順にする。",
  scm: "材料調達から販売までを一本の鎖として見る。",
  cocreation: "企業だけで考えず、顧客や外部パートナーも一緒に商品を作る。",
  gameTheory: "相手も考えて動く将棋のように、自分と相手の選択を読む。",
  deepLearning: "何層ものフィルタを重ね、画像や音声の特徴を自動でつかむ。",
  hamming: "検査ビットを道しるべにして、どの1ビットが間違ったか探す。",
  storedProcedure: "よく使うSQL手順をDB内のボタンとして保存しておく。",
  coalesce: "左から順に見て、空欄ではない最初の値を採用する。",
  starSchema: "中心の事実表を太陽、周囲の次元表を星の光のように見る。",
  csmacd: "話す前に回線を聞き、同時に話して衝突したらいったん下がる。",
  threeDS: "カード決済の途中で、カード会社が本人か追加確認する関所。",
  oop: "データと操作を、役割を持った部品としてまとめる。",
  coupling: "部品同士が接着剤で強くくっつくほど、片方の変更が相手へ響く。",
  lean: "作り過ぎ、待ち、手戻りなどのムダを削って流れを軽くする。",
  docGenerator: "コード中のコメントを材料に、説明書を自動で組み立てる。",
  ghg: "温室効果ガスを測るための共通ものさし。",
  auditPaper: "監査人の判断メモと証拠ファイル。結論の根拠として残す。",
  ea: "会社全体を、業務・データ・アプリ・技術の設計図として整理する。",
  contingency: "もしもの時に使う予備ルートを先に用意しておく。",
  digitalTwin: "現実の設備や街を、データ上にもう一つ作る。",
  massCustomization: "大量生産の速さで、一人ひとり向けの違いも出す。",
  edge: "遠いクラウドへ全部送らず、現場の近くで判断する。",
  nash: "誰か一人だけ作戦を変えても得しない、互いに動けないつり合い。",
  fishbone: "結果を魚の頭、原因を骨として分解する。",
  sensitiveInfo: "普通の個人情報より慎重に扱う必要がある、病歴などの情報。",
  sdn: "スイッチ一台ごとに考えさせず、司令塔が転送ルールを配る。",
  psirt: "自社製品に弱点が見つかった時の、受付、修正、公開調整の専門窓口。",
  "05_aki-07": "設定ファイルやAPIで、軽いメモ形式のキーと値を渡す。",
  "05_aki-10": "同じ場所ばかり消しゴムをかけると紙が傷むので、書く場所を散らす。",
  "05_aki-19": "OSの心臓部。アプリとハードウェアの間で資源をさばく。",
  "05_aki-25": "設計図と光の条件から、実際に見える画像として描き出す。",
  "05_aki-27": "別の表の主キーを指す名札。表同士の親子関係を保つ。",
  "05_aki-32": "マンションの代表住所に加え、部屋番号で誰宛てか分ける。",
  "05_aki-35": "放送ではなく、参加しているグループだけへ同じ内容を送る。",
  "05_aki-36": "よくある鍵と答えの対応表を先に作っておき、盗んだハッシュを逆引きする。",
  "05_aki-37": "短い鍵でも強い鍵穴を作る公開鍵暗号。",
  "05_aki-42": "起動時に身分証を確認し、署名のない部品では立ち上げない。",
  "05_aki-43": "ファイルを人質に取り、元に戻す代わりに金銭を要求する。",
  "05_aki-44": "メール本文に差出人側の署名を付け、途中で変えられていないか見る。",
  "05_aki-50": "エディタ、実行、デバッグなどを一つの作業机にまとめる。",
  "05_aki-51": "この工事で作る範囲と、作らない範囲を線引きした契約メモ。",
  "05_aki-57": "最初に全体写真を撮り、その後は変わった部分だけ撮る。",
  "05_aki-61": "理想の未来地点を先に置き、そこから今日やることへ戻って考える。",
  "05_aki-68": "勝手に広告を送るのではなく、受け取り許可をもらった相手へ届ける。",
  "05_aki-70": "社内だけで考えず、外の技術や知恵を取り込む。",
  "05_aki-72": "短期の仕事を、ネット上の仲介所で受けたり頼んだりする。",
  "05_aki-74": "倒れない強さより、倒れても戻れるしなやかさ。",
  "05_aki-75": "万能の管理方法はなく、状況に合う管理方法を選ぶ。",
  "05_haru-03": "病気判定のしきい値を動かし、当たりと誤検出のバランスを見る曲線。",
  "05_haru-13": "混雑が減ったので、動かすサーバ台数を減らす。",
  "05_haru-20": "同じOSの上に、アプリごとの小部屋を作って隔離する。",
  "05_haru-23": "レーザーを投げ、返ってくる時間で距離を測る。",
  "05_haru-24": "交通系カードのように、かざす近さで通信する。",
  "05_haru-28": "エレベーターの閉ボタンのように、何度押しても結果は同じ。",
  "05_haru-36": "感染端末に命令を出す攻撃者側の司令室。",
  "05_haru-37": "OS自体が厳しい門番になり、資源へのアクセスを細かく制限する。",
  "05_haru-39": "政府が使うクラウドの安全審査済みリスト。",
  "05_haru-41": "PCの中にある金庫。暗号鍵を通常の保存場所より安全に守る。",
  "05_haru-44": "メールを投函する専用口。受信配送ではなく送信投稿に使う。",
  "05_haru-47": "条件の組合せごとに、どの処理をするか表で決める。",
  "05_haru-52": "作業列の中で、資源の取り合いを考えてバッファを置く。",
  "05_haru-54": "専門家へ匿名で聞き、集計結果を返してまた聞く。",
  "05_haru-62": "買う前、使う時、困った時まで含めた顧客の体験。",
  "05_haru-63": "本人から預かったデータを、本人の代わりに管理し提供する銀行のような存在。",
  "05_haru-64": "要求がどの設計、実装、テストにつながったか足跡を追える。",
  "05_haru-65": "いきなり提案を求めず、まず製品や技術情報を集める質問票。",
  "05_haru-68": "財務、顧客、業務、学習の目標を因果の矢印で地図にする。",
  "05_haru-71": "太陽光や振動など、周囲に落ちている小さな電力を拾う。",
  "05_haru-72": "複数サービスの情報を、一つの画面や操作口にまとめる。",
  "05_haru-80": "仲が良すぎて反対意見が出ず、判断が偏る会議。",
  "04_aki-09": "キャッシュに書くたび、本棚の原本にも同時に書く。",
  "04_aki-11": "白黒の粒を電気で動かして、紙のように表示を保つ。",
  "04_aki-17": "大きな本を同じ大きさのページに切って、必要なページだけ机に出す。",
  "04_aki-22": "電源を切ってもメモが消えない半導体の記憶。",
  "04_aki-25": "動画を小さくたたんで、配信や保存をしやすくする規格。",
  "04_aki-41": "危ないものを見つけ、どれくらい危ないか測り、対策優先度を決める。",
  "04_aki-45": "変な入力を大量に投げ、壊れる場所を探す耐久テスト。",
  "04_aki-46": "作った本人が説明しながら、参加者が欠陥を見つける読み合わせ。",
  "04_aki-49": "先に合格条件のテストを書き、それを通す実装を作る。",
  "04_aki-50": "続ける、問題、次に試す、の三つで振り返る。",
  "04_aki-52": "作業を箱、前後関係を線で表して順番を整理する。",
  "04_aki-55": "起きた事故を直すだけでなく、根本原因を探して再発を防ぐ。",
  "04_aki-67": "買収前の健康診断。財務や法務などを詳しく調べる。",
  "04_aki-68": "欲しい利益を先に決め、そこから価格を逆算する。",
  "04_aki-69": "価格、機能、デザインなどの組合せ評価から、どの属性が効くか分ける。",
  "04_aki-70": "自社の機能をAPIで外へ開き、他社連携で価値を広げる。",
  "04_aki-71": "工場は持たず、設計や企画に集中する会社。",
  "04_aki-74": "部下の成熟度に合わせて、指示型から委任型へ変える。",
  "04_haru-10": "キャッシュのどの場所にも置ける自由席方式。",
  "04_haru-18": "空き地が細切れで、大きな建物を建てにくい状態。",
  "04_haru-25": "光の道筋を逆にたどり、反射や影を写実的に描く。",
  "04_haru-27": "利用者の見え方、論理的な形、物理保存の形を三層で分ける。",
  "04_haru-29": "未完了の作業は消し、完了済みの作業はもう一度反映する。",
  "04_haru-30": "鉱山から鉱石を掘るように、大量データから規則を掘り出す。",
  "04_haru-38": "合言葉そのものを送らず、出された問題への答えで知っていることを証明する。",
  "04_haru-57": "データの辞書、品質ルール、使い方を管理する責任者。",
  "04_haru-69": "口コミが人から人へ広がるように仕掛ける。",
  "04_haru-71": "財務情報にタグを付け、機械が比較・再利用しやすくする。",
  "04_haru-72": "後工程が必要になった分だけ前工程から引く。",
  "04_haru-74": "議論の交通整理役。結論を押し付けず進行を助ける。",
  "04_haru-75": "成果を出す力Pと、集団を保つ力Mの二軸で見る。",
  "04_haru-78": "他人のIDで入る、制御を回避して入る行為を禁じる法律。",
  crc: "荷物に検査用の余り番号を付け、受け取り側でも同じ計算をして壊れていないか見る。",
  thread: "複数人が同じノートを同時に触っても、内容が混ざらないようにする。",
  persona: "設計会議に架空の利用者を一人座らせ、その人なら困るかで判断する。",
  "04_aki-30": "銀行取引の約束。途中で半端に終わらず、つじつまを保ち、同時処理に乱されず、結果が残る。",
  "04_aki-31": "新しく来た端末へ、受付がIPアドレスやDNS設定を自動で配る。",
  "04_haru-32": "Ethernetの道路上に、PPPの認証付き通行手続きを載せる。",
  "04_haru-44": "手元の端末は画面だけを映し、本体のデスクトップはサーバ室で動かす。",
  "04_haru-51": "予算、出来高、実コストを一つの家計簿で見て、遅れと使い過ぎを読む。",
  "04_haru-63": "給与計算やコールセンターなど、業務プロセスごと外部の専門会社へ任せる。",
  data: "データの置き方や見せ方を、机・棚・台帳の違いとして思い浮かべる。",
  system: "部品がどうつながって動くかを見る。装置名より、役割を先に押さえる。",
  security: "攻撃なら入口と手口、防御なら何を止めるかで切る。",
  trust: "本物か、失効していないか、権限が正しいかを確認する札として考える。",
  strategy: "二軸表、分類表、判断軸のどれで整理しているかを見る。",
  cycle: "開始、実行、確認、改善のどの場面で使う言葉かを置く。",
  mechanism: "目に見える動きや物理的な変化に置き換えると覚えやすい。"
};

const choiceHints = {
  "04_aki-61": "「災害」「事故」「重要業務を継続」「早期復旧」が合図。単なるバックアップ手順だけではない。",
  "04_haru-26": "「一貫性」「可用性」「分断耐性」の三語が出たらこれ。分散DBの制約として読む。",
  "04_aki-08": "「多数の演算コア」「同種の計算」「画像処理」「機械学習」が合図。",
  dns: "「ドメイン名」「IPアドレス」「名前解決」が合図。IPを自動配布するDHCPとは分ける。",
  waf: "「Webアプリ」「HTTP通信」「SQLインジェクション」「XSS」が合図。ネットワーク全体のFWではない。",
  spf: "「送信元メールサーバのIPアドレス」「DNSで確認」「メール送信元確認」が合図。",
  bcp: "「災害」「事故」「重要業務を継続」「早期復旧」が合図。単なるバックアップ手順だけではない。",
  avl: "「二分探索木」「高さ差」「回転」「平衡」が合図。",
  dma: "「CPUを介さず」「入出力装置」「主記憶」「直接転送」が合図。",
  objectStorage: "「ID」「メタデータ」「階層ディレクトリではない」が合図。",
  base64: "「バイナリ」「64種類の文字」「メールやHTTPで扱う」が合図。",
  ocsp: "「オンラインで問い合わせる」が合図。失効リストを配るCRLとは分ける。",
  charter: "「目的」「権限」「正式承認」「開始」が合図。",
  provisioning: "「サーバ」「アカウント」「資源を準備」「利用可能にする」が合図。",
  freemium: "「基本無料」「高度機能は有料」「無料で入口」が合図。",
  competency: "「高い成果を出す人」「行動特性」「能力モデル」が合図。",
  crossValidation: "「学習用と検証用を入れ替える」「汎化性能」が合図。",
  rpn: "「演算子が後ろ」「後置記法」「スタック」が合図。",
  fiberChannel: "「SAN」「サーバとストレージ」「高速接続」が合図。",
  thrashing: "「ページ置換が頻発」「CPUが入替えばかり」「性能低下」が合図。",
  soc: "「CPUなど複数機能」「一つの半導体チップ」が合図。",
  actuator: "「制御信号」「動き・力・回転」「物理的動作に変換」が合図。",
  tamper: "「物理的解析」「改ざん」「不正読み出しに強い」が合図。",
  twoPhaseCommit: "「準備確認」「確定」「全体で成功または失敗」が合図。",
  checkpoint: "「更新済み内容をディスクへ反映」「復旧開始点」が合図。",
  icmp: "「IP通信」「エラー通知」「ping」「診断」が合図。",
  saml: "「アサーション」「XML」「SSO」「認証情報を交換」が合図。",
  passwordList: "「他サービスから漏えいしたIDとパスワード」「別サービスで試す」が合図。",
  cve: "「CVE-年-番号」「公開された脆弱性」「共通識別子」が合図。",
  dnsPoison: "「DNSキャッシュ」「偽の名前解決」「偽サイトへ誘導」が合図。",
  sbom: "「ソフトウェア部品表」「依存ライブラリ」「バージョン」「脆弱性影響調査」が合図。",
  dnssec: "「DNS応答」「電子署名」「改ざん検知」が合図。",
  exploit: "「脆弱性を実際に悪用するコード」が合図。",
  microservice: "「小さな独立サービス」「疎結合」「分割」が合図。",
  responsive: "「画面幅」「PCとスマートフォン」「同じコンテンツを見やすく」が合図。",
  wbs: "「作業を階層分解」「成果物中心」「作業パッケージ」が合図。",
  fastTracking: "「本来順番に行う作業」「並行」「期間短縮」が合図。",
  followup: "「監査結果」「改善措置」「実施されているか確認」が合図。",
  openData: "「企画・設計段階から」「公開しやすい形」が合図。",
  ux: "「利用前後を含めた体験全体」が合図。画面デザインだけではない。",
  activity: "「UML」「処理の流れ」「分岐」「並行処理」が合図。",
  scm: "「調達」「生産」「物流」「販売」「供給連鎖」が合図。",
  cocreation: "「顧客や外部パートナーと共に価値を創造」が合図。",
  gameTheory: "「複数の意思決定者」「互いの選択」「戦略」が合図。",
  deepLearning: "「多層ニューラルネットワーク」「特徴を自動学習」が合図。",
  hamming: "「検査ビット」「1ビット誤り訂正」「誤り位置」が合図。",
  storedProcedure: "「DBMS内に保存」「一連のSQL処理」が合図。",
  coalesce: "「NULLでない最初の値を返す」が合図。",
  starSchema: "「中央のファクト表」「周囲のディメンション表」が合図。",
  csmacd: "「送信前に回線確認」「衝突検出」「再送」が合図。",
  threeDS: "「クレジットカード決済」「リスクベース認証」「追加認証」が合図。",
  oop: "「データと操作」「継承」「カプセル化」「多態性」が合図。",
  coupling: "「依存の強さ」「低いほど変更影響が小さい」が合図。",
  lean: "「ムダを減らす」「価値提供を速くする」が合図。",
  docGenerator: "「コードコメント」「文書を生成」が合図。",
  ghg: "「温室効果ガス」「排出量」「算定基準」が合図。",
  auditPaper: "「監査の証拠」「判断を残す文書」が合図。",
  ea: "「企業全体」「業務・データ・技術で整理」が合図。",
  contingency: "「もしもの時」「代替計画」「障害時の対応」が合図。",
  digitalTwin: "「現実の双子」「デジタル上に再現」が合図。",
  massCustomization: "「大量生産」「個別対応」「両立」が合図。",
  edge: "「データ発生源の近く」「低遅延」「クラウドへ送る前」が合図。",
  nash: "「誰も一人だけ変えて得しない」が合図。",
  fishbone: "「結果」「原因」「魚の骨」「特性要因図」が合図。",
  sensitiveInfo: "「病歴」「人種」「信条」など慎重に扱う個人情報が合図。",
  sdn: "「制御機能と転送機能を分離」「ソフトウェアで集中制御」が合図。",
  psirt: "「自社製品」「脆弱性」「受付・修正・公開調整」が合図。",
  "05_aki-07": "「キーと値」「軽量」「データ交換形式」が合図。XMLより軽い文脈で出やすい。",
  "05_aki-10": "「フラッシュメモリ」「書込み回数を平準化」「寿命を延ばす」が合図。",
  "05_aki-19": "「OSの中核」「資源管理」「デバイス管理」が合図。",
  "05_aki-25": "「形状や光のデータ」「画像を生成」が合図。",
  "05_aki-27": "「別表の主キーを参照」「参照整合性」が合図。",
  "05_aki-32": "「IPアドレスとポート番号を変換」が合図。IPだけならNAT寄り。",
  "05_aki-35": "「一対多」「必要なグループだけ」が合図。全員向けのブロードキャストとは違う。",
  "05_aki-36": "「事前計算表」「ハッシュを逆引き」が合図。",
  "05_aki-37": "「楕円曲線」「短い鍵」「公開鍵暗号」が合図。",
  "05_aki-42": "「起動時」「署名を検証」「改ざん防止」が合図。",
  "05_aki-43": "「暗号化」「身代金」「復旧の対価」が合図。",
  "05_aki-44": "「メール」「電子署名」「改ざん確認」が合図。送信元IP確認のSPFと分ける。",
  "05_aki-50": "「エディタ」「コンパイラ」「デバッガ」「統合」が合図。",
  "05_aki-51": "「含めるもの」「除外事項」「プロジェクト範囲」が合図。",
  "05_aki-57": "「最後のフルバックアップ以降」「変更分だけ」が合図。",
  "05_aki-61": "「望ましい未来」「逆算」「現在の施策」が合図。",
  "05_aki-68": "「同意」「許可を得た相手」「売込み」が合図。",
  "05_aki-70": "「外部の技術や知識」「社外と連携」「新価値」が合図。",
  "05_aki-72": "「単発・短期の仕事」「ネット仲介」が合図。",
  "05_aki-74": "「障害や変化」「耐える」「回復する」が合図。",
  "05_aki-75": "「状況によって最適な管理が変わる」が合図。",
  "05_haru-03": "「真陽性率」「偽陽性率」「分類性能」が合図。",
  "05_haru-13": "「台数を減らす」「縮小」が合図。増やすスケールアウト/アップと分ける。",
  "05_haru-20": "「OSカーネルを共有」「アプリ環境を隔離」が合図。",
  "05_haru-23": "「レーザー」「反射」「距離を測る」が合図。",
  "05_haru-24": "「近距離」「かざす」「ICカード」が合図。",
  "05_haru-28": "「何回実行しても結果が同じ」が合図。",
  "05_haru-36": "「感染端末」「命令を送る」「司令塔」が合図。",
  "05_haru-37": "「OSレベル」「アクセス制御」「権限管理を強化」が合図。",
  "05_haru-39": "「政府情報システム」「クラウドサービス」「評価・登録」が合図。",
  "05_haru-41": "「暗号鍵の保護」「起動時の完全性確認」「セキュリティチップ」が合図。",
  "05_haru-44": "「メールクライアント」「送信サーバ」「587番」が合図。",
  "05_haru-47": "「条件の組合せ」「処理」「表形式」が合図。",
  "05_haru-52": "「資源制約」「バッファ」「納期を守る」が合図。",
  "05_haru-54": "「専門家」「匿名」「繰り返し集約」が合図。",
  "05_haru-62": "「購入前から利用後まで」「顧客体験全体」が合図。",
  "05_haru-63": "「本人の委任」「パーソナルデータ」「第三者提供」が合図。",
  "05_haru-64": "「要求、設計、実装、テストの対応関係を追跡」が合図。",
  "05_haru-65": "「調達前」「ベンダへ情報提供依頼」が合図。提案依頼書RFPの前段階。",
  "05_haru-68": "「財務」「顧客」「内部プロセス」「学習と成長」「因果関係」が合図。",
  "05_haru-71": "「光、振動、熱」「微小エネルギー」「回収して電力」が合図。",
  "05_haru-72": "「複数サービス」「一つに集約」「まとめて確認」が合図。",
  "05_haru-80": "「合意を重視しすぎる」「反対意見が出ない」が合図。",
  "04_aki-09": "「キャッシュへ書くたび主記憶にも書く」が合図。",
  "04_aki-11": "「帯電した粒子」「電界で移動」「表示保持に電力少」が合図。",
  "04_aki-17": "「固定長ページ」「仮想記憶」「必要なページを主記憶へ」が合図。",
  "04_aki-22": "「電気的に消去・書込み」「電源を切っても保持」が合図。",
  "04_aki-25": "「動画」「高効率圧縮」「AVC」が合図。",
  "04_aki-41": "「リスクを特定、分析、評価」が合図。",
  "04_aki-45": "「異常データ」「ランダムデータ」「大量入力」が合図。",
  "04_aki-46": "「作成者が説明」「参加者が欠陥を見つける」が合図。",
  "04_aki-49": "「先にテスト」「実装」「リファクタリング」が合図。",
  "04_aki-50": "「Keep」「Problem」「Try」が合図。",
  "04_aki-52": "「作業をノード」「依存関係を矢印」「作業順序」が合図。",
  "04_aki-55": "「インシデントの根本原因」「再発防止」が合図。",
  "04_aki-67": "「買収や投資の前」「財務・法務・事業・リスク調査」が合図。",
  "04_aki-68": "「目標利益率」「必要な利益を織り込む」が合図。",
  "04_aki-69": "「商品属性の組合せ」「顧客選好への影響」が合図。",
  "04_aki-70": "「APIを通じて外部提供」「他社サービスと連携」が合図。",
  "04_aki-71": "「工場を持たない」「企画・設計に集中」「製造を外部委託」が合図。",
  "04_aki-74": "「部下の成熟度」「リーダーシップスタイルを変える」が合図。",
  "04_haru-10": "「任意の主記憶ブロックを任意のキャッシュブロックへ」が合図。",
  "04_haru-18": "「空き領域が細かく分断」「連続領域を確保しにくい」が合図。",
  "04_haru-25": "「光線の反射や屈折を追跡」「写実的な画像」が合図。",
  "04_haru-27": "「外部スキーマ」「概念スキーマ」「内部スキーマ」が合図。",
  "04_haru-29": "「未完了は取り消し」「完了済みは再実行」が合図。",
  "04_haru-30": "「大量データ」「有用な規則性や傾向を発見」が合図。",
  "04_haru-38": "「乱数などのチャレンジ」「秘密情報で応答」が合図。",
  "04_haru-57": "「データの定義」「品質」「整合性」「利用ルール」が合図。",
  "04_haru-69": "「口コミ」「紹介」「情報が広がる」が合図。",
  "04_haru-71": "「財務情報」「タグ付け」「比較・再利用」が合図。",
  "04_haru-72": "「後工程」「必要な物を必要な時に」「在庫を抑える」が合図。",
  "04_haru-74": "「中立的に進行」「発言や合意形成を促す」が合図。",
  "04_haru-75": "「目標達成機能P」「集団維持機能M」が合図。",
  "04_haru-78": "「他人のID・パスワード」「アクセス制御を回避」が合図。",
  "04_aki-30": "「原子性」「一貫性」「独立性」「永続性」の4語が出たらこれ。",
  "04_aki-31": "「IPアドレス」「デフォルトゲートウェイ」「DNSサーバ」「自動配布」が合図。",
  "04_haru-32": "「Ethernet上でPPP」「認証」「IPアドレス割当て」が合図。",
  "04_haru-44": "「デスクトップ環境をサーバ側で実行」「画面転送」が合図。",
  "04_haru-51": "「計画価値」「出来高」「実コスト」「進捗とコスト」が合図。",
  "04_haru-63": "「業務の一部または全部」「外部の専門事業者へ委託」が合図。",
  persona: "「利用者像」「目的」「行動」「困りごと」「UX設計」が合図。",
  crc: "「割り算」「余り」「誤り検出」がそろったらこれ。訂正まで行うハミング符号とは分ける。",
  hamming: "「検査ビット」「1ビット誤り訂正」「誤り位置」が合図。余りで検出するCRCとは分ける。",
  thread: "「複数スレッド」「共有状態が壊れない」が合図。速くなること自体ではない。",
  lru: "「最後に使われてから最も長い」「ページ置換」が合図。",
  ocsp: "「オンラインで問い合わせる」が合図。失効リストを配るCRLとは分ける。",
  data: "「どこに保存するか」「どう見せるか」「整合性をどう保つか」の語を拾う。",
  system: "「何を省くか」「どこで処理するか」「何を自動化するか」を見る。",
  security: "「攻撃手口」か「防御・調査」かをまず分け、対象の層を見る。",
  trust: "「本人確認」「証明書」「署名」「権限」が出たら信用確認の問題として読む。",
  strategy: "選択肢に分類軸や表の名前が出る。問題文の軸と一致するものを選ぶ。",
  cycle: "プロジェクト、監査、改善、生産のどの時点かで選択肢を切る。",
  mechanism: "働きがそのまま答えになるカード。問題文の動作語を覚える。"
};

const contrastHints = {
  crc: [
    { term: "ハミング符号", diff: "CRCは割り算の余りで誤りを見つける。ハミング符号は検査ビットで誤り位置を見つけ、1ビット誤りを直せる。" },
    { term: "パリティチェック", diff: "パリティは1の個数の偶奇を見る単純な検査。CRCは生成多項式で割るので、連続した誤りにも強い。" },
  ],
  hamming: [
    { term: "CRC", diff: "ハミング符号は誤り位置まで分かる。CRCは余りの不一致で誤りを検出するが、基本は訂正ではない。" },
  ],
  view: [
    { term: "実表", diff: "実表はデータ本体を持つ。ビューは実表から必要な行や列を見せる仮想表。" },
    { term: "インデックス", diff: "インデックスは検索を速くする索引。ビューは見せ方を切り出すもの。" },
  ],
  mvcc: [
    { term: "排他ロック", diff: "排他ロックは他の処理を待たせて衝突を防ぐ。MVCCは複数版を持ち、読む人と書く人をぶつけにくくする。" },
  ],
  nosql: [
    { term: "RDB", diff: "RDBは表とSQLが中心。NoSQLはキー値、文書、グラフなど表以外の形も使う。" },
  ],
  reverseProxy: [
    { term: "プロキシ", diff: "普通のプロキシは利用者側の代理。リバースプロキシはサーバ側の入口に立つ代理。" },
    { term: "ロードバランサ", diff: "ロードバランサは負荷分散が主役。リバースプロキシは中継、TLS終端、キャッシュなど入口機能まで含めて問われる。" },
  ],
  crl: [
    { term: "OCSP", diff: "CRLは失効した証明書の一覧を配る。OCSPは証明書が失効していないかをオンラインで問い合わせる。" },
  ],
  ocsp: [
    { term: "CRL", diff: "OCSPはその場でオンライン照会。CRLは失効リストを取得して照合する。" },
  ],
  psirt: [
    { term: "CSIRT", diff: "PSIRTは自社製品の脆弱性対応。CSIRTは組織内のセキュリティ事故対応。" },
  ],
  cspm: [
    { term: "CWPP", diff: "CSPMはクラウド設定ミスや権限過多を見る。CWPPはクラウド上のワークロード保護に寄る。" },
  ],
  forensics: [
    { term: "インシデント対応", diff: "フォレンジックスは証拠を壊さず保全・解析する点が主役。復旧や封じ込め全体とは分ける。" },
  ],
  persona: [
    { term: "ユースケース", diff: "ペルソナは利用者像。ユースケースはその利用者がシステムで何をするかの利用場面。" },
    { term: "ターゲット層", diff: "ターゲット層は集団。ペルソナは名前や行動まで具体化した一人の利用者像。" },
  ],
  pwa: [
    { term: "ネイティブアプリ", diff: "PWAはWeb技術でアプリのように使う。ネイティブアプリはOS向けに直接作る。" },
  ],
  soa: [
    { term: "マイクロサービス", diff: "SOAは業務機能をサービスとして再利用する設計思想。マイクロサービスは小さく独立したサービスへ分ける実装寄りの設計。" },
  ],
  microservice: [
    { term: "SOA", diff: "マイクロサービスは小さな独立サービスの集合。SOAは業務機能をサービス部品として組み合わせる考え方。" },
  ],
  association: [
    { term: "データマイニング", diff: "アソシエーション分析は同時購入など組合せ規則を探す手法。データマイニングは有用な規則を探す広い言葉。" },
  ],
  dataMining: [
    { term: "アソシエーション分析", diff: "データマイニングは大量データから知識を掘る総称。アソシエーション分析は一緒に起きる組合せを探す。" },
  ],
  ppm: [
    { term: "アンゾフの成長マトリクス", diff: "PPMは市場成長率と市場シェアで事業へ投資配分する。アンゾフは製品と市場の新旧で成長戦略を分ける。" },
  ],
  ansoff: [
    { term: "PPM", diff: "アンゾフは製品×市場の新旧で攻め方を選ぶ。PPMは市場成長率×市場シェアで投資配分を見る。" },
  ],
  mes: [
    { term: "ERP", diff: "MESは製造現場の実行管理。ERPは会計、人事、販売など企業資源を広く統合管理する。" },
  ],
  plm: [
    { term: "PDM", diff: "PLMは企画から廃棄まで製品の一生を管理。PDMは設計図面や部品表など製品データ管理に寄る。" },
  ],
  avl: [
    { term: "二分探索木", diff: "AVL木は高さ差を調整して平衡を保つ二分探索木。普通の二分探索木は偏ると検索が遅くなる。" },
  ],
  dma: [
    { term: "割込み", diff: "DMAはCPUを介さず主記憶へ直接転送する仕組み。割込みは装置がCPUへ処理を知らせる仕組み。" },
  ],
  objectStorage: [
    { term: "ファイルストレージ", diff: "オブジェクトストレージはIDとメタデータで管理。ファイルストレージはフォルダ階層とファイル名で管理する。" },
    { term: "ブロックストレージ", diff: "ブロックストレージは決まった大きさのブロック単位。オブジェクトストレージはデータ本体にメタデータを付ける。" },
  ],
  lru: [
    { term: "FIFO", diff: "LRUは最近使っていないものを追い出す。FIFOは先に入ったものから追い出す。" },
  ],
  base64: [
    { term: "暗号化", diff: "Base64は文字として運ぶための符号化。秘密にする暗号化ではない。" },
    { term: "ハッシュ", diff: "Base64は元に戻せる符号化。ハッシュは原則として元に戻さない要約値。" },
  ],
  secureCookie: [
    { term: "HttpOnly属性", diff: "Secure属性はHTTPSのときだけ送る。HttpOnly属性はJavaScriptからCookieを読ませにくくする。" },
  ],
  commandInjection: [
    { term: "SQLインジェクション", diff: "OSコマンドインジェクションはOS命令を混ぜる。SQLインジェクションはSQL文を混ぜる。" },
  ],
  sideChannel: [
    { term: "暗号解読", diff: "サイドチャネル攻撃は暗号アルゴリズムそのものではなく、処理時間や消費電力など横から漏れる情報を読む。" },
  ],
  stretching: [
    { term: "ソルト", diff: "ストレッチングはハッシュ計算を何度も繰り返す。ソルトは同じパスワードでも別のハッシュにするための追加データ。" },
  ],
  xp: [
    { term: "スクラム", diff: "XPはペアプログラミングやTDDなど開発実践が中心。スクラムは役割、イベント、バックログによる管理の枠組み。" },
  ],
  charter: [
    { term: "プロジェクト計画書", diff: "憲章はプロジェクト開始を正式承認する文書。計画書は開始後に範囲、日程、費用などを具体化する。" },
  ],
  provisioning: [
    { term: "デプロイ", diff: "プロビジョニングは資源を用意して使える状態にする。デプロイはアプリや設定を実環境へ配置する。" },
  ],
  bcp: [
    { term: "バックアップ", diff: "BCPは重要業務を止めない、早く戻すための全体計画。バックアップはデータを複製しておく個別対策。" },
    { term: "DRP", diff: "DRPは災害後のシステム復旧計画。BCPは業務継続全体を見る。" },
  ],
  crossValidation: [
    { term: "ホールドアウト法", diff: "交差検証は学習用と検証用を入れ替えて複数回評価する。ホールドアウト法は一度だけ分ける。" },
    { term: "過学習", diff: "過学習は訓練データに合わせすぎる状態。交差検証はその兆候を評価する方法。" },
  ],
  rpn: [
    { term: "中置記法", diff: "逆ポーランド表記法は演算子を後ろに置く。中置記法はA+Bのように演算子を間に置く。" },
  ],
  fiberChannel: [
    { term: "iSCSI", diff: "ファイバチャネルはSAN向けの高速接続技術。iSCSIはSCSI命令をIPネットワーク上で運ぶ。" },
  ],
  thrashing: [
    { term: "ページング", diff: "ページングは仮想記憶をページ単位で扱う仕組み。スラッシングはページ入替えが多すぎて性能が落ちた状態。" },
  ],
  soc: [
    { term: "CPU", diff: "CPUは演算や制御の中心。SoCはCPUに加え、メモリ制御や入出力など複数機能を一つのチップに入れる。" },
  ],
  actuator: [
    { term: "センサー", diff: "センサーは現実の状態を電気信号へ変える。アクチュエーターは制御信号を現実の動きへ変える。" },
  ],
  tamper: [
    { term: "耐障害性", diff: "耐タンパ性は解析や改ざんに強いこと。耐障害性は故障しても止まりにくいこと。" },
  ],
  twoPhaseCommit: [
    { term: "ロールバック", diff: "2相コミットは複数資源を準備確認と確定でそろえる方式。ロールバックは失敗時に変更を取り消す動作。" },
  ],
  checkpoint: [
    { term: "バックアップ", diff: "チェックポイントはDBMSが復旧開始点を作る仕組み。バックアップはデータの複製を保存しておくこと。" },
  ],
  dns: [
    { term: "DHCP", diff: "DNSは名前をIPアドレスへ変換する。DHCPは端末へIPアドレスなどの設定を自動配布する。" },
  ],
  dhcp: [
    { term: "DNS", diff: "DHCPはIPアドレスやDNSサーバ設定を配る。DNSはドメイン名からIPアドレスを引く。" },
  ],
  icmp: [
    { term: "TCP/UDP", diff: "ICMPはエラー通知や診断に使う。TCP/UDPはアプリ間でデータを運ぶ通信の土台。" },
  ],
  saml: [
    { term: "OAuth", diff: "SAMLは認証結果をアサーションで渡すSSOに使われる。OAuthは第三者アプリへ権限を委任する仕組み。" },
    { term: "OpenID Connect", diff: "SAMLはXMLベース。OpenID ConnectはOAuth 2.0を土台にID情報を扱う。" },
  ],
  passwordList: [
    { term: "ブルートフォース攻撃", diff: "パスワードリスト攻撃は漏えい済みのIDとパスワードを使う。ブルートフォースは総当たりで試す。" },
  ],
  cve: [
    { term: "JVN", diff: "CVEは脆弱性につく共通識別子。JVNは脆弱性対策情報を知らせるポータル。" },
  ],
  dnsPoison: [
    { term: "DNSリフレクション攻撃", diff: "DNSキャッシュポイズニングは偽の名前解決を混ぜる。DNSリフレクション攻撃はDNS応答を標的へ集中させるDDoS。" },
  ],
  sbom: [
    { term: "BOM", diff: "SBOMはソフトウェア部品表。製造のBOMは製品を構成する部品表。" },
  ],
  dnssec: [
    { term: "DNSキャッシュポイズニング", diff: "DNSSECはDNS応答に署名を付けて改ざんを検知する対策。ポイズニングは偽情報をキャッシュへ入れる攻撃。" },
  ],
  exploit: [
    { term: "脆弱性", diff: "脆弱性は弱点そのもの。エクスプロイトコードはその弱点を実際に突くコード。" },
  ],
  responsive: [
    { term: "リキッドレイアウト", diff: "レスポンシブWebデザインは端末幅に応じて見せ方全体を変える。リキッドレイアウトは幅を割合で伸縮させる考え方。" },
  ],
  wbs: [
    { term: "PERT図", diff: "WBSは作業を成果物中心に階層分解する。PERT図は作業順序と依存関係を図にする。" },
  ],
  fastTracking: [
    { term: "クラッシング", diff: "ファストトラッキングは順番の作業を重ねる。クラッシングは人や費用を追加して期間を縮める。" },
  ],
  followup: [
    { term: "監査報告", diff: "フォローアップは指摘後の改善状況を確認する活動。監査報告は監査結果をまとめる文書。" },
  ],
  ux: [
    { term: "UI", diff: "UXは使う前後を含む体験全体。UIは画面や操作部品など利用者との接点。" },
  ],
  activity: [
    { term: "シーケンス図", diff: "アクティビティ図は処理の流れや分岐を表す。シーケンス図はオブジェクト間のメッセージ順序を表す。" },
  ],
  scm: [
    { term: "CRM", diff: "SCMは調達から販売までの供給連鎖。CRMは顧客との関係を管理する。" },
  ],
  gameTheory: [
    { term: "ナッシュ均衡", diff: "ゲーム理論は相手の選択を考える分析の総称。ナッシュ均衡は誰も一人だけ変えて得しない状態。" },
  ],
  nash: [
    { term: "ゲーム理論", diff: "ナッシュ均衡はゲーム理論で出てくる安定状態。ゲーム理論そのものは戦略的状況を分析する枠組み。" },
  ],
  deepLearning: [
    { term: "機械学習", diff: "ディープラーニングは多層ニューラルネットワークを使う機械学習の一分野。機械学習はもっと広い。" },
  ],
  storedProcedure: [
    { term: "トリガ", diff: "ストアドプロシージャはDB内に保存して呼び出すSQL処理。トリガは更新などのイベントで自動実行される。" },
  ],
  coalesce: [
    { term: "NULLIF", diff: "COALESCEは最初にNULLでない値を返す。NULLIFは二つの値が等しければNULLを返す。" },
  ],
  starSchema: [
    { term: "スノーフレークスキーマ", diff: "スタースキーマは中心のファクト表と周囲の次元表。スノーフレークは次元表をさらに正規化する。" },
  ],
  csmacd: [
    { term: "CSMA/CA", diff: "CSMA/CDは衝突を検出して再送する。CSMA/CAは無線LANなどで衝突を避けるように待つ。" },
  ],
  sdn: [
    { term: "OpenFlow", diff: "SDNは制御と転送を分ける考え方。OpenFlowはSDNでスイッチを制御する代表的なプロトコル。" },
  ],
  openflow: [
    { term: "SDN", diff: "OpenFlowはSDNを実現するプロトコルの一つ。SDNはネットワーク制御をソフトウェア化する考え方。" },
  ],
  threeDS: [
    { term: "通常のカード認証", diff: "3Dセキュア2.0は決済時のリスクを見て追加認証する。単なるカード番号確認ではない。" },
  ],
  waf: [
    { term: "ファイアウォール", diff: "WAFはWebアプリへのHTTP通信を見る。一般的なファイアウォールはIPアドレスやポートなどネットワーク層で見る。" },
    { term: "IDS/IPS", diff: "IDS/IPSは侵入の検知や防止が中心。WAFはWebアプリ特有の攻撃をHTTP内容から防ぐ。" },
  ],
  spf: [
    { term: "DKIM", diff: "SPFは送信元メールサーバのIPをDNSで確認する。DKIMはメールに電子署名を付け、本文などが書き換えられていないことを確認する。" },
    { term: "DMARC", diff: "DMARCはSPFやDKIMの結果を使って、受信側の扱い方をドメイン所有者が示す。" },
  ],
  dkim: [
    { term: "SPF", diff: "DKIMはメール本文などに署名し、途中で書き換えられていないことを確認する。SPFは送信元サーバのIPが許可済みかを見る。" },
  ],
  oop: [
    { term: "構造化プログラミング", diff: "オブジェクト指向はデータと操作をまとめる。構造化プログラミングは順次、分岐、反復で処理を整理する。" },
  ],
  coupling: [
    { term: "凝集度", diff: "結合度はモジュール同士の依存の強さ。凝集度は一つのモジュール内のまとまりの良さ。" },
  ],
  lean: [
    { term: "アジャイル", diff: "リーンはムダを減らして価値提供を速くする考え方。アジャイルは短い反復で変化に対応する開発の考え方。" },
  ],
  docGenerator: [
    { term: "静的解析", diff: "ドキュメントジェネレータはコメントなどから文書を作る。静的解析はコードを実行せずに品質や問題を調べる。" },
  ],
  ghg: [
    { term: "カーボンニュートラル", diff: "GHGプロトコルは温室効果ガス排出量の算定基準。カーボンニュートラルは排出と吸収を差し引きゼロにする目標。" },
  ],
  auditPaper: [
    { term: "監査報告書", diff: "監査証拠は意見の根拠となる情報。監査報告書は監査結果や意見をまとめる文書。" },
  ],
  ea: [
    { term: "BPR", diff: "EAは企業全体を業務、データ、アプリ、技術で整理する。BPRは業務プロセスを抜本的に見直す。" },
  ],
  contingency: [
    { term: "BCP", diff: "コンティンジェンシープランは不測事態への代替計画。BCPは重要業務を継続・復旧するための事業全体の計画。" },
  ],
  digitalTwin: [
    { term: "シミュレーション", diff: "デジタルツインは現実の状態と連動する双子を作る。シミュレーションは条件を置いて動きを試すこと。" },
  ],
  massCustomization: [
    { term: "大量生産", diff: "マスカスタマイゼーションは大量生産の効率と個別対応を両立する。単なる大量生産は個別対応が主役ではない。" },
  ],
  edge: [
    { term: "クラウドコンピューティング", diff: "エッジはデータ発生源の近くで処理する。クラウドは遠隔の大規模基盤へ集めて処理する。" },
  ],
  fishbone: [
    { term: "FTA", diff: "特性要因図は結果に対する原因を魚の骨で整理する。FTAは望ましくない事象から原因を論理的に木で分解する。" },
  ],
  sensitiveInfo: [
    { term: "個人情報", diff: "要配慮個人情報は病歴、信条、人種など特に慎重な扱いが必要な情報。個人情報より範囲が絞られる。" },
  ],
  "05_aki-32": [
    { term: "NAT", diff: "NAPTはIPアドレスに加えてポート番号も変換する。NATは主にIPアドレス変換として問われる。" },
  ],
  "05_aki-35": [
    { term: "ブロードキャスト", diff: "マルチキャストは必要なグループへ一対多で送る。ブロードキャストは同じネットワークの全員へ送る。" },
    { term: "ユニキャスト", diff: "ユニキャストは一対一。マルチキャストは一つの送信元からグループへ送る。" },
  ],
  "05_aki-36": [
    { term: "総当たり攻撃", diff: "レインボー攻撃は事前計算表でハッシュを逆引きする。総当たり攻撃は候補を順に試す。" },
  ],
  "05_aki-42": [
    { term: "セキュアブート", diff: "セキュアブートは起動時に署名を検証する仕組み。TPMは鍵の保護や測定値の保存などに使うチップ。" },
  ],
  "05_haru-20": [
    { term: "仮想マシン", diff: "コンテナはOSカーネルを共有してアプリ環境を分ける。仮想マシンはゲストOSごと動かす。" },
  ],
  "05_haru-41": [
    { term: "セキュアブート", diff: "TPMは鍵保護や起動時の完全性確認に使うチップ。セキュアブートは署名済みの起動ソフトだけ動かす仕組み。" },
  ],
  "05_haru-44": [
    { term: "SMTP", diff: "サブミッションポートはメールクライアントが送信サーバへ投稿する入口。SMTPそのものはメール転送のプロトコル。" },
  ],
  "05_haru-47": [
    { term: "デシジョンツリー", diff: "デシジョンテーブルは条件と処理を表で整理する。デシジョンツリーは分岐を木で表す。" },
  ],
  "05_haru-52": [
    { term: "クリティカルパス", diff: "クリティカルチェーンは資源制約とバッファを重視する。クリティカルパスは作業依存から最長経路を見る。" },
  ],
  "05_haru-65": [
    { term: "RFP", diff: "RFIは情報提供依頼で、候補や情報を集める前段階。RFPは具体的な提案を求める文書。" },
  ],
  "05_haru-68": [
    { term: "KPI", diff: "BSCは財務、顧客、内部プロセス、学習と成長の四視点で因果を整理する。KPIは目標達成を見る指標。" },
  ],
  "05_haru-80": [
    { term: "コンフリクト", diff: "グループシンクは合意を重視しすぎて反対意見が出ない状態。コンフリクトは意見対立そのもの。" },
  ],
  "04_aki-09": [
    { term: "ライトバック", diff: "ライトスルーはキャッシュ更新時に主記憶も同時に書く。ライトバックは後でまとめて主記憶へ書く。" },
  ],
  "04_aki-17": [
    { term: "セグメンテーション", diff: "ページングは固定長ページで管理する。セグメンテーションは意味のある可変長領域で管理する。" },
  ],
  "04_aki-25": [
    { term: "MPEG-2", diff: "H.264/MPEG-4 AVCは高効率な動画圧縮規格。MPEG-2より高圧縮の文脈で出やすい。" },
  ],
  "04_aki-41": [
    { term: "リスク対応", diff: "リスクアセスメントはリスクを特定、分析、評価する。リスク対応はその後に回避、低減、移転、受容を選ぶ。" },
  ],
  "04_aki-46": [
    { term: "インスペクション", diff: "ウォークスルーは作成者が説明しながら確認する。インスペクションは役割や手順をより厳格に決めて欠陥を探す。" },
  ],
  "04_aki-49": [
    { term: "XP", diff: "テスト駆動開発は先にテストを書いて実装する実践。XPはTDDなどを含むアジャイル開発手法。" },
  ],
  "04_aki-52": [
    { term: "WBS", diff: "PDMは作業順序と依存関係を図にする。WBSは作業を階層に分解する。" },
  ],
  "04_aki-55": [
    { term: "インシデント管理", diff: "問題管理は根本原因と再発防止を見る。インシデント管理はサービスを早く戻すことが主役。" },
  ],
  "04_aki-67": [
    { term: "M&A", diff: "デューデリジェンスは買収や投資の前に相手を詳しく調べること。M&Aは合併・買収そのもの。" },
  ],
  "04_aki-70": [
    { term: "API", diff: "APIエコノミーはAPI連携で外部サービスと価値を作る経済圏。API単体は機能やデータを使うための窓口。" },
  ],
  "04_aki-71": [
    { term: "OEM", diff: "ファブレスは自社工場を持たず製造を外部委託する事業形態。OEMは他社ブランド製品を製造する形態。" },
  ],
  "04_haru-10": [
    { term: "ダイレクトマップ方式", diff: "フルアソシエイティブ方式は任意の主記憶ブロックを任意のキャッシュブロックへ置ける。ダイレクトマップは置き場所が決まる。" },
  ],
  "04_haru-18": [
    { term: "ページング", diff: "フラグメンテーションは空き領域が細かく分かれる状態。ページングは固定長ページで管理する方式。" },
  ],
  "04_haru-25": [
    { term: "ラスタライズ", diff: "レイトレーシングは光線の反射や屈折を追跡する。ラスタライズは形状を画素へ変換して描く。" },
  ],
  "04_haru-26": [
    { term: "ACID特性", diff: "CAP定理は分散DBで一貫性、可用性、分断耐性を同時に完全満足できない話。ACIDはトランザクションの4性質。" },
  ],
  "04_haru-27": [
    { term: "ERモデル", diff: "3層スキーマは外部、概念、内部の三層でDBを見る。ERモデルは実体と関連でデータ構造を表す。" },
  ],
  "04_haru-29": [
    { term: "チェックポイント", diff: "undo/redoは復旧時に未完了を戻し、完了済みをやり直す。チェックポイントは復旧開始点を短くする記録地点。" },
  ],
  "04_haru-32": [
    { term: "PPPoE", diff: "PPPoEはEthernet上でPPPを使う。IPアドレス自動配布だけならDHCP、名前解決ならDNS。" },
  ],
  "04_haru-38": [
    { term: "パスワード認証", diff: "チャレンジレスポンス方式は秘密そのものを送らず、乱数への応答で証明する。単純なパスワード送信とは違う。" },
  ],
  "04_haru-44": [
    { term: "リモートデスクトップ", diff: "VDIはデスクトップ環境をサーバ側で集中管理する基盤。リモートデスクトップは離れたPCの画面を操作する使い方。" },
  ],
  "04_haru-51": [
    { term: "進捗率管理", diff: "EVMは出来高、計画価値、実コストで進捗とコストを同時に見る。単なる進捗率だけではない。" },
  ],
  "04_haru-57": [
    { term: "データマネジメント", diff: "データ管理は定義、品質、整合性、利用ルールを保つ役割。単なるデータ保存ではない。" },
  ],
  "04_haru-63": [
    { term: "アウトソーシング", diff: "BPOは業務プロセスそのものを外部委託する。単なる一部作業の外注より範囲が業務単位。" },
  ],
  "04_haru-72": [
    { term: "MRP", diff: "かんばん方式は後工程が必要な分だけ引き取る。MRPは生産計画から必要部品を計算する。" },
  ],
  "04_haru-74": [
    { term: "議長", diff: "ファシリテータは中立的に議論を進め、合意形成を助ける。議長のように結論を決める役ではない。" },
  ],
  "04_haru-75": [
    { term: "SL理論", diff: "PM理論はP機能とM機能の二軸でリーダーシップを見る。SL理論は部下の成熟度でスタイルを変える。" },
  ],
};

function buildLesson(card) {
  const expansion = primaryExpansion(card);
  const family = visualFamily(card.visual);
  const origin = originFor(card, expansion);
  const analogy = analogyHints[card.id] || analogyHints[card.answer] || analogyHints[card.visual] || analogyHints[family] || analogyHints.mechanism;
  const choices = choiceHints[card.id] || choiceHints[card.answer] || choiceHints[card.visual] || choiceHints[family] || choiceHints.mechanism;
  return {
    cueTitle: clueLabel(card, family),
    cue: easyText(card.memory),
    origin,
    analogy,
    choices,
    scene: [
      shortClue(easyText(card.memory), 18),
      shortClue(card.category, 18),
      shortClue(choices.replace(/[「」]/g, ""), 18),
    ],
  };
}

function lessonFor(card) {
  return curatedLessons[card.id] || buildLesson(card);
}

function sharpTitle(card, lesson = lessonFor(card)) {
  if (!curatedLessons[card.id]) return shortClue(easyText(card.memory), 18);
  return lesson.cueTitle;
}

function cueBodyHtml(card, lesson = lessonFor(card)) {
  if (!curatedLessons[card.id]) return "";
  const title = normalize(sharpTitle(card, lesson));
  const cue = normalize(lesson.cue);
  if (title && cue && title === cue) return "";
  return `<p>${renderRichText(hideAnswerText(card, lesson.cue))}</p>`;
}

function contrastFor(card) {
  return contrastHints[card.id] || contrastHints[card.answer] || contrastHints[card.visual] || [];
}

function contrastHtml(card, compact = false) {
  const rows = contrastFor(card);
  if (!rows.length) return "";
  const limit = compact ? 2 : rows.length;
  return `<section class="contrast-box${compact ? " compact" : ""}">
    <span>似た用語との切り分け</span>
    <dl>
      ${rows.slice(0, limit).map((row) => `
        <div>
          <dt>${esc(row.term)}</dt>
          <dd>${renderRichText(row.diff)}</dd>
        </div>
      `).join("")}
    </dl>
  </section>`;
}

function learningStyle(card) {
  const family = visualFamily(card.visual);
  const contrasts = contrastFor(card);
  if (contrasts.length >= 2 || ["strategy", "cycle"].includes(family)) {
    return { key: "contrast", label: "対比で覚える", reason: "似た選択肢を切るのが得点に直結するカードです。" };
  }
  if (primaryExpansion(card) || /[A-Z]{2,}/.test(card.answer)) {
    return { key: "origin", label: "語源で覚える", reason: "略語や英字の意味を展開すると、選択肢の語と結び付きます。" };
  }
  if (["crc", "stp", "fishbone", "sideChannel", "mvcc", "view", "starSchema", "twoPhaseCommit", "csmacd", "activity"].includes(card.visual)) {
    return { key: "diagram", label: "図で覚える", reason: "動きや構造を目で見た方が一瞬で思い出しやすいカードです。" };
  }
  return { key: "example", label: "具体例で覚える", reason: "抽象語なので、場面に置き換える方が記憶に残ります。" };
}

function firstGlanceHtml(card) {
  const lesson = lessonFor(card);
  const style = learningStyle(card);
  return `<section class="first-glance">
    <span class="focus-label">まずこれ</span>
    <strong>${esc(sharpTitle(card, lesson))}</strong>
    ${cueBodyHtml(card, lesson)}
    <small>${esc(style.label)}: ${esc(style.reason)}</small>
  </section>`;
}

function primaryAidHtml(card) {
  const lesson = lessonFor(card);
  const style = learningStyle(card);
  if (style.key === "contrast" && contrastFor(card).length) {
    return `<div class="primary-aid aid-contrast">
      <span>${esc(style.label)}</span>
      <strong>${esc(sharpTitle(card, lesson))}</strong>
      ${contrastHtml(card)}
    </div>`;
  }
  if (style.key === "origin") {
    return `<div class="primary-aid aid-origin">
      <span>${esc(style.label)}</span>
      <strong>${esc(card.answer)}</strong>
      <p>${renderRichText(lesson.origin)}</p>
      <p>${renderRichText(lesson.choices)}</p>
    </div>`;
  }
  if (style.key === "example") {
    return `<div class="primary-aid aid-example">
      <span>${esc(style.label)}</span>
      <strong>${esc(sharpTitle(card, lesson))}</strong>
      <p>${renderRichText(lesson.analogy)}</p>
      <p>${renderRichText(lesson.choices)}</p>
    </div>`;
  }
  return diagramV2(card, true);
}

function mistakeHintHtml(card, rawAnswer) {
  const typed = normalize(rawAnswer);
  const rows = contrastFor(card);
  if (!typed || !rows.length) return contrastHtml(card, true);
  const matched = rows.find((row) => {
    const term = normalize(row.term);
    return term && (typed.includes(term) || term.includes(typed));
  });
  if (!matched) return contrastHtml(card, true);
  return `<section class="mistake-box">
    <span>その誤答ではない理由</span>
    <p><strong>${esc(rowLabel(matched.term))}</strong> と迷ったら: ${renderRichText(matched.diff)}</p>
  </section>`;
}

function rowLabel(value) {
  return value;
}

function termStory(card) {
  const lesson = lessonFor(card);
  return [lesson.origin, `${lesson.analogy} ${lesson.choices}`];
}

function memoryCue(card) {
  const lesson = lessonFor(card);
  return `<div class="quiz-cue curated-cue">
    <span class="cue-kicker">連想ヒント</span>
    <strong>${esc(sharpTitle(card, lesson))}</strong>
    ${cueBodyHtml(card, lesson)}
  </div>`;
}

function memoryStoryHtml(card) {
  return `<div class="memory-story">
    <section>
      <span>語源・略語</span>
      <p>${renderRichText(lessonFor(card).origin)}</p>
    </section>
    <section>
      <span>たとえ</span>
      <p>${renderRichText(lessonFor(card).analogy)}</p>
    </section>
    <section>
      <span>選択肢の切り方</span>
      <p>${renderRichText(lessonFor(card).choices)}</p>
    </section>
    ${contrastHtml(card)}
  </div>`;
}

function originMiniHtml(card) {
  const lesson = lessonFor(card);
  return `<section class="contrast-box compact origin-mini">
    <span>語源・関連語</span>
    <p>${renderRichText(lesson.origin)}</p>
  </section>`;
}

function fillSelect(select, values, allLabel) {
  select.innerHTML = `<option value="">${allLabel}</option>` + values.map((v) => `<option>${esc(v)}</option>`).join("");
}

function initFilters() {
  fillSelect(els.examFilter, [...new Set(cards.map((c) => c.exam))], "すべて");
  fillSelect(els.domainFilter, [...new Set(cards.map((c) => c.domain))], "すべて");
  fillSelect(els.categoryFilter, [...new Set(cards.map((c) => c.category))].sort(), "すべて");
}

function isRight(card) { return progress[card.id]?.right; }
function isWeak(card) { return progress[card.id]?.weak; }

function saveProgress() {
  localStorage.setItem(stateKey, JSON.stringify(progress));
  renderStats();
}

function applyFilters() {
  const query = normalize(els.searchInput.value);
  filtered = cards.filter((card) => {
    if (els.examFilter.value && card.exam !== els.examFilter.value) return false;
    if (els.domainFilter.value && card.domain !== els.domainFilter.value) return false;
    if (els.categoryFilter.value && card.category !== els.categoryFilter.value) return false;
    if (els.weakOnly.checked && !isWeak(card)) return false;
    if (els.hideDone.checked && isRight(card)) return false;
    if (query && !normalize(`${card.answer}${card.topic}${card.category}${card.text}`).includes(query)) return false;
    return true;
  });
  if (query) {
    filtered.sort((a, b) => searchRank(a, query) - searchRank(b, query));
  }
  currentIndex = Math.min(currentIndex, Math.max(0, filtered.length - 1));
  els.visibleCount.textContent = filtered.length;
  render();
}

function searchRank(card, query) {
  const answer = normalize(card.answer);
  const aliases = (card.aliases || []).map(normalize);
  if (answer === query || aliases.includes(query)) return 0;
  if (answer.startsWith(query) || aliases.some((alias) => alias.startsWith(query))) return 1;
  if (normalize(card.topic).includes(query)) return 2;
  if (normalize(card.category).includes(query)) return 3;
  return 4;
}

function currentCard() {
  return filtered[currentIndex] || cards[0];
}

function lessonDiagramHtml(card, reveal = true) {
  const lesson = lessonFor(card);
  const title = reveal ? card.answer : lesson.cueTitle;
  const cueText = reveal ? lesson.cue : hideAnswerText(card, lesson.cue);
  const choiceText = reveal ? lesson.choices : hideAnswerText(card, lesson.choices);
  const steps = lesson.scene.map((item, index) => `
    <li>
      <span>${index + 1}</span>
      <b>${esc(reveal ? item : hideAnswerText(card, item))}</b>
    </li>
  `).join("");
  return `<div class="lesson-visual">
    <div class="lesson-head">
      <span>${esc(card.category)}</span>
      <strong>${esc(title)}</strong>
      <p>${renderRichText(cueText)}</p>
    </div>
    <ol class="lesson-path">${steps}</ol>
    <div class="lesson-check">
      <span>選択肢で見る言葉</span>
      <p>${renderRichText(choiceText)}</p>
    </div>
  </div>`;
}

function svgCard(inner, extraClass = "") {
  return `<svg class="ap-svg ${extraClass}" viewBox="0 0 720 260" role="img" aria-label="用語の図解"><defs><marker id="arrowhead" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 Z" fill="#d95f43" stroke="none"></path></marker></defs>${inner}</svg>`;
}

function box(x, y, w, h, label, cls = "") {
  return `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="14"></rect><text x="${x + w / 2}" y="${y + h / 2}" text-anchor="middle" dominant-baseline="middle">${esc(label)}</text>`;
}

function cyl(x, y, w, h, label, cls = "") {
  return `<path class="${cls}" d="M${x},${y + 18} C${x},${y - 2} ${x + w},${y - 2} ${x + w},${y + 18} V${y + h - 18} C${x + w},${y + h + 2} ${x},${y + h + 2} ${x},${y + h - 18} Z"></path><ellipse class="${cls}" cx="${x + w / 2}" cy="${y + 18}" rx="${w / 2}" ry="18"></ellipse><text x="${x + w / 2}" y="${y + h / 2 + 8}" text-anchor="middle">${esc(label)}</text>`;
}

function arrow(x1, y1, x2, y2, cls = "") {
  return `<line class="svg-arrow ${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"></line>`;
}

function visualFamily(visual) {
  if (["trust", "security", "data", "system", "strategy", "cycle", "mechanism"].includes(visual)) return visual;
  if (["crl", "ocsp", "dnssec", "secureCookie", "spf", "saml", "threeDS", "3ds"].includes(visual)) return "trust";
  if (["reverseProxy", "waf", "cspm", "commandInjection", "sideChannel", "dnsPoison", "passwordList", "exploit", "forensics", "psirt", "sbom", "cve"].includes(visual)) return "security";
  if (["nosql", "view", "mvcc", "objectStorage", "checkpoint", "storedProcedure", "coalesce", "starSchema", "dns"].includes(visual)) return "data";
  if (["iac", "provisioning", "sdn", "edge", "digitalTwin", "pwa", "openapi", "docGenerator", "soa", "microservice", "fiberChannel"].includes(visual)) return "system";
  if (["ansoff", "ppm", "canvas", "association", "decisionTree", "gameTheory", "nash", "fishbone", "competency"].includes(visual)) return "strategy";
  if (["plm", "mes", "scm", "tuckman", "xp", "lean", "followup", "ghg", "auditPaper", "contingency", "ea", "cocreation", "massCustomization"].includes(visual)) return "cycle";
  return "mechanism";
}

function clueLabel(card, family) {
  const visual = card.visual;
  if (visual === "crc") return "余りチェック";
  if (visual === "sideChannel") return "横から漏れる情報";
  if (visual === "stp") return "ループを止める";
  if (visual === "fishbone") return "原因を整理";
  if (["crl", "ocsp"].includes(visual)) return "失効を確認";
  if (["dnssec", "spf", "secureCookie", "saml", "threeDS", "3ds"].includes(visual)) return "本物か確認";
  if (["waf", "cspm", "forensics", "psirt", "sbom", "cve"].includes(visual)) return "守る・調べる";
  if (["commandInjection", "dnsPoison", "passwordList", "exploit"].includes(visual)) return "攻撃の型";
  if (visual === "view") return "仮想の見せ方";
  if (visual === "mvcc") return "複数の版";
  if (visual === "starSchema") return "分析用の表";
  if (visual === "objectStorage") return "IDで保存";
  if (visual === "coalesce") return "NULLを避ける";
  if (visual === "storedProcedure") return "DB内の処理";
  if (visual === "checkpoint") return "復旧地点";
  if (["iac", "provisioning"].includes(visual)) return "環境を用意";
  if (visual === "sdn") return "通信を制御";
  if (visual === "edge") return "近くで処理";
  if (visual === "digitalTwin") return "現実の写し";
  if (visual === "openapi") return "API仕様";
  if (visual === "docGenerator") return "文書を生成";
  if (family === "strategy") return "分類の型";
  if (family === "cycle") return "流れの中心";
  if (family === "data") return "データの仕組み";
  if (family === "system") return "動かす仕組み";
  if (family === "trust") return "信用の確認";
  if (family === "security") return "攻撃か防御か";
  return {
    strategy: "選択肢の軸",
    cycle: "流れの中心",
    data: "データの持ち方",
    system: "装置や通信の役割",
    trust: "確認の要点",
    security: "攻撃か防御か",
    mechanism: "役割で見分ける",
  }[family] || "見分ける特徴";
}

function conceptPiece(cls, label, sub = "") {
  const body = sub ? `<small>${esc(sub)}</small>` : "";
  return `<div class="concept-piece ${cls}"><b>${esc(label)}</b>${body}</div>`;
}

function conceptDiagram(head, cls, pieces) {
  return `<div class="memory-visual concept-visual">${head}<div class="concept-scene ${cls}">${pieces.join("")}</div></div>`;
}

function safeClass(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
}

function stableNumber(value) {
  let hash = 0;
  for (const char of String(value)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

function shortClue(value, max = 16) {
  const text = String(value).replace(/\s+/g, "");
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function autoDiagram(card, head, answer, family) {
  const familyLabel = {
    trust: "信用を確かめる",
    security: "攻撃・防御を見分ける",
    data: "データの置き方",
    system: "仕組みを動かす",
    strategy: "判断の軸を作る",
    cycle: "流れの中で使う",
    mechanism: "特徴で覚える",
  }[family] || "特徴で覚える";
  const roleLabel = clueLabel(card, family);
  const categoryLabel = shortClue(card.category, 13);
  const memoryLabel = easyText(card.memory);
  const answerLabel = shortClue(answer, 14);
  const layouts = ["stack", "radar", "lane", "gate", "target", "map", "split", "deck", "meter", "ladder", "lab", "stamp"];
  const layout = layouts[stableNumber(`${card.id}:${card.visual}`) % layouts.length];
  const cls = `auto-concept auto-layout-${layout} auto-${safeClass(family)} auto-${safeClass(card.visual)} auto-card-${safeClass(card.id)}`;
  const pieces = {
    stack: [
      conceptPiece("auto-topic top", categoryLabel, "分野"),
      conceptPiece("auto-memory wide-card", memoryLabel, "覚える文"),
      conceptPiece("auto-role accent", roleLabel, familyLabel),
      conceptPiece("auto-answer", answerLabel, "選択肢")
    ],
    radar: [
      conceptPiece("auto-role accent center", roleLabel, familyLabel),
      conceptPiece("auto-topic node-a", categoryLabel, "分野"),
      conceptPiece("auto-memory node-b", memoryLabel, "覚える文"),
      conceptPiece("auto-answer node-c", answerLabel, "選択肢")
    ],
    lane: [
      conceptPiece("auto-topic step-a", "入口", categoryLabel),
      conceptPiece("auto-role accent step-b", roleLabel, familyLabel),
      conceptPiece("auto-memory step-c", memoryLabel, "覚える文"),
      conceptPiece("auto-answer step-d", answerLabel, "選択肢")
    ],
    gate: [
      conceptPiece("auto-topic", categoryLabel, "条件"),
      conceptPiece("auto-role accent gate-core", roleLabel, "見分け"),
      conceptPiece("auto-memory", memoryLabel, "手掛かり"),
      conceptPiece("auto-answer", answerLabel, "用語")
    ],
    target: [
      conceptPiece("auto-role accent target-core", roleLabel, familyLabel),
      conceptPiece("auto-topic ring-one", categoryLabel, "文脈"),
      conceptPiece("auto-memory ring-two", memoryLabel, "覚える文"),
      conceptPiece("auto-answer ring-three", answerLabel, "選択肢")
    ],
    map: [
      conceptPiece("auto-topic map-start", categoryLabel, "ここから"),
      conceptPiece("auto-memory map-mid", memoryLabel, "見分ける"),
      conceptPiece("auto-role accent map-key", roleLabel, familyLabel),
      conceptPiece("auto-answer map-goal", answerLabel, "到達点")
    ],
    split: [
      conceptPiece("auto-topic before", "問題文", categoryLabel),
      conceptPiece("auto-memory after accent", memoryLabel, "読み替え"),
      conceptPiece("auto-role bridge", roleLabel, familyLabel),
      conceptPiece("auto-answer result", answerLabel, "選択肢")
    ],
    deck: [
      conceptPiece("auto-topic card-one", categoryLabel, "分野"),
      conceptPiece("auto-role accent card-two", roleLabel, "2枚目"),
      conceptPiece("auto-memory card-three", memoryLabel, "覚える文"),
      conceptPiece("auto-answer card-four", answerLabel, "選択肢")
    ],
    meter: [
      conceptPiece("auto-topic meter-label", categoryLabel, "観点"),
      conceptPiece("auto-role accent meter-needle", roleLabel, familyLabel),
      conceptPiece("auto-memory meter-read", memoryLabel, "覚える文"),
      conceptPiece("auto-answer meter-name", answerLabel, "用語")
    ],
    ladder: [
      conceptPiece("auto-topic rung-a", categoryLabel, "分野"),
      conceptPiece("auto-memory rung-b", memoryLabel, "覚える文"),
      conceptPiece("auto-role accent rung-c", roleLabel, familyLabel),
      conceptPiece("auto-answer rung-d", answerLabel, "選択肢")
    ],
    lab: [
      conceptPiece("auto-topic lab-sample", categoryLabel, "材料"),
      conceptPiece("auto-memory lab-flask", memoryLabel, "反応"),
      conceptPiece("auto-role accent lab-result", roleLabel, familyLabel),
      conceptPiece("auto-answer lab-label", answerLabel, "ラベル")
    ],
    stamp: [
      conceptPiece("auto-topic paper-card", categoryLabel, "問題文"),
      conceptPiece("auto-role accent stamp-card", roleLabel, "印を押す"),
      conceptPiece("auto-memory memo-card", memoryLabel, "理由"),
      conceptPiece("auto-answer name-card", answerLabel, "用語")
    ],
  }[layout];
  return conceptDiagram(head, cls, pieces);
}

function specificDiagram(card, head, answer, family) {
  const visual = card.visual;
  const raw = card.answer;
  const reveal = answer === esc(raw);

  if (visual === "nosql") {
    return conceptDiagram(head, "concept-nosql", [
      conceptPiece("rel-table muted", "行と列", "だけではない"),
      conceptPiece("kv-card", "キー → 値"),
      conceptPiece("doc-card", "{ 文書 }"),
      conceptPiece("graph-card", "点と線"),
      conceptPiece("wide-card accent", reveal ? raw : "柔軟なDB群", "分散・大量データ")
    ]);
  }

  if (visual === "crc" && raw.includes("垂直水平")) {
    return conceptDiagram(head, "concept-parity-grid", [
      conceptPiece("bit-grid", "データを格子に並べる"),
      conceptPiece("row-check accent", "行の偶奇"),
      conceptPiece("col-check accent", "列の偶奇"),
      conceptPiece("error-cell", "交点で誤り位置")
    ]);
  }

  if (visual === "view") {
    return conceptDiagram(head, "concept-view", [
      conceptPiece("base-table", "実表", "全列・全行を持つ"),
      conceptPiece("filter-slit", "必要な列だけ", "切り出す"),
      conceptPiece("window-card accent", reveal ? raw : "見せる窓", "実データは持たない"),
      conceptPiece("user-card", "利用者", "表のように見る")
    ]);
  }

  if (visual === "mvcc") {
    return conceptDiagram(head, "concept-mvcc", [
      conceptPiece("version old", "版1", "読取り中"),
      conceptPiece("reader-card", "読む人", "古い版を見る"),
      conceptPiece("version new", "版2", "更新中"),
      conceptPiece("writer-card", "書く人", "新しい版を作る"),
      conceptPiece("wide-card accent", reveal ? raw : "版を分ける", "衝突しにくい")
    ]);
  }

  if (visual === "fishbone" && raw.includes("FTA")) {
    return conceptDiagram(head, "concept-fault-tree", [
      conceptPiece("top-event accent", "頂上事象", "起きてほしくない故障"),
      conceptPiece("gate-card", "AND/OR"),
      conceptPiece("cause-card", "原因A"),
      conceptPiece("cause-card", "原因B")
    ]);
  }

  if (visual === "objectStorage") {
    return conceptDiagram(head, "concept-object", [
      conceptPiece("object-card", "ファイル"),
      conceptPiece("id-tag", "一意なID"),
      conceptPiece("bucket-card accent", reveal ? raw : "入れ物", "階層よりIDで探す"),
      conceptPiece("meta-card", "メタ情報")
    ]);
  }

  if (visual === "checkpoint") {
    return conceptDiagram(head, "concept-checkpoint", [
      conceptPiece("log-card", "ログ"),
      conceptPiece("pin-card accent", reveal ? raw : "復旧地点"),
      conceptPiece("crash-card", "障害"),
      conceptPiece("restore-card", "ここから再開")
    ]);
  }

  if (visual === "storedProcedure") {
    return conceptDiagram(head, "concept-procedure", [
      conceptPiece("app-card", "アプリ"),
      conceptPiece("db-code accent", reveal ? raw : "DB内の処理"),
      conceptPiece("table-card", "表"),
      conceptPiece("return-card", "結果だけ返す")
    ]);
  }

  if (visual === "coalesce") {
    return conceptDiagram(head, "concept-coalesce", [
      conceptPiece("null-card", "NULL"),
      conceptPiece("choice-card accent", reveal ? raw : "最初の値を選ぶ"),
      conceptPiece("value-card", "代替値"),
      conceptPiece("ok-card", "空欄を避ける")
    ]);
  }

  if (visual === "starSchema") {
    return conceptDiagram(head, "concept-star", [
      conceptPiece("center-fact accent", reveal ? raw : "売上などの事実"),
      conceptPiece("dim-card d1", "商品"),
      conceptPiece("dim-card d2", "顧客"),
      conceptPiece("dim-card d3", "時間"),
      conceptPiece("dim-card d4", "店舗")
    ]);
  }

  if (visual === "data") {
    if (raw.includes("外部キー")) return conceptDiagram(head, "concept-foreign-key", [
      conceptPiece("parent-table", "親表", "主キー"),
      conceptPiece("child-table accent", "子表", reveal ? raw : "親の番号を持つ"),
      conceptPiece("link-card", "関係を保つ")
    ]);
    if (raw.includes("バックアップ")) return conceptDiagram(head, "concept-diff-backup", [
      conceptPiece("full-card", "フル", "月曜"),
      conceptPiece("change-card accent", "変更分だけ", "火曜以降"),
      conceptPiece("restore-card", "復元", "フル + 差分")
    ]);
    if (raw.includes("ライトスルー")) return conceptDiagram(head, "concept-write-through", [
      conceptPiece("cpu-card", "CPU"),
      conceptPiece("cache-card accent", "キャッシュ"),
      conceptPiece("memory-card", "主記憶"),
      conceptPiece("wide-card", "同時に書く", "遅いが安全")
    ]);
    if (raw.includes("ページング")) return conceptDiagram(head, "concept-paging", [
      conceptPiece("memory-block", "ページ0"),
      conceptPiece("memory-block", "ページ1"),
      conceptPiece("memory-block accent", "固定長"),
      conceptPiece("frame-card", "枠に入れる")
    ]);
    if (raw.includes("フラッシュ")) return conceptDiagram(head, "concept-flash", [
      conceptPiece("cell-card", "セル"),
      conceptPiece("charge-card accent", "電荷を保持"),
      conceptPiece("power-card", "電源OFF"),
      conceptPiece("keep-card", "消えない")
    ]);
    if (raw.includes("ACID")) return conceptDiagram(head, "concept-acid", [
      conceptPiece("acid-a", "A", "全部か無か"),
      conceptPiece("acid-c", "C", "つじつま"),
      conceptPiece("acid-i", "I", "独立"),
      conceptPiece("acid-d", "D", "消えない")
    ]);
    if (raw.includes("フルアソシエイティブ")) return conceptDiagram(head, "concept-cache-map", [
      conceptPiece("block-card", "主記憶ブロック"),
      conceptPiece("any-card accent", "どこへも置ける"),
      conceptPiece("cache-line", "キャッシュ枠")
    ]);
    if (raw.includes("フラグメンテーション")) return conceptDiagram(head, "concept-fragment", [
      conceptPiece("used-card", "使用中"),
      conceptPiece("gap-card accent", "小さな空き"),
      conceptPiece("used-card", "使用中"),
      conceptPiece("gap-card", "また空き")
    ]);
    if (raw.includes("CAP")) return conceptDiagram(head, "concept-cap", [
      conceptPiece("cap-c", "C", "一貫性"),
      conceptPiece("cap-a", "A", "可用性"),
      conceptPiece("cap-p accent", "P", "分断耐性"),
      conceptPiece("wide-card", "三つ全部は無理")
    ]);
    if (raw.includes("3層スキーマ")) return conceptDiagram(head, "concept-schema3", [
      conceptPiece("schema-card", "外部", "利用者ごと"),
      conceptPiece("schema-card accent", "概念", "全体の形"),
      conceptPiece("schema-card", "内部", "保存方法")
    ]);
    if (raw.includes("undo") || raw.includes("redo")) return conceptDiagram(head, "concept-undo-redo", [
      conceptPiece("uncommitted", "未完了", "undoで戻す"),
      conceptPiece("committed accent", "完了済み", "redoでやり直す"),
      conceptPiece("log-card", "ログで復旧")
    ]);
    if (raw.includes("データ管理者")) return conceptDiagram(head, "concept-data-admin", [
      conceptPiece("rule-card accent", "データのルール"),
      conceptPiece("quality-card", "品質"),
      conceptPiece("owner-card", "責任者"),
      conceptPiece("table-card", "利用部門")
    ]);
    if (raw.includes("XBRL")) return conceptDiagram(head, "concept-xbrl", [
      conceptPiece("finance-card", "財務情報"),
      conceptPiece("tag-card accent", "タグを付ける"),
      conceptPiece("machine-card", "機械で読める")
    ]);
  }

  if (visual === "system") {
    if (raw.includes("Linuxカーネル")) return conceptDiagram(head, "concept-kernel", [
      conceptPiece("app-card", "アプリ"),
      conceptPiece("kernel-card accent", reveal ? raw : "OSの中核"),
      conceptPiece("resource-card", "CPU・メモリ")
    ]);
    if (raw.includes("レンダリング")) return conceptDiagram(head, "concept-render", [
      conceptPiece("model-card", "形"),
      conceptPiece("light-card", "光"),
      conceptPiece("image-card accent", "画像を描く")
    ]);
    if (raw.includes("レイトレーシング")) return conceptDiagram(head, "concept-raytrace", [
      conceptPiece("eye-card", "視点"),
      conceptPiece("ray-card accent", "光線を追う"),
      conceptPiece("mirror-card", "反射・影"),
      conceptPiece("image-card", "リアルな画像")
    ]);
    if (raw.includes("NAPT")) return conceptDiagram(head, "concept-napt", [
      conceptPiece("lan-card", "内側IP:ポート"),
      conceptPiece("translate-card accent", "変換"),
      conceptPiece("wan-card", "外側IP:ポート")
    ]);
    if (raw.includes("マルチキャスト")) return conceptDiagram(head, "concept-multicast", [
      conceptPiece("sender-card", "送信元"),
      conceptPiece("group-card accent", "参加グループ"),
      conceptPiece("receiver-card", "複数宛先")
    ]);
    if (raw.includes("IDE")) return conceptDiagram(head, "concept-ide", [
      conceptPiece("tool-card", "編集"),
      conceptPiece("tool-card", "実行"),
      conceptPiece("tool-card", "デバッグ"),
      conceptPiece("wide-card accent", "開発道具を一体化")
    ]);
    if (raw.includes("スケールイン")) return conceptDiagram(head, "concept-scale-in", [
      conceptPiece("server-card", "台数多い"),
      conceptPiece("minus-card accent", "減らす"),
      conceptPiece("server-card", "小さく運用")
    ]);
    if (raw.includes("コンテナ")) return conceptDiagram(head, "concept-container", [
      conceptPiece("kernel-card", "共有OS"),
      conceptPiece("box-card accent", "アプリA"),
      conceptPiece("box-card", "アプリB"),
      conceptPiece("wide-card", "環境を隔離")
    ]);
    if (raw.includes("サブミッション")) return conceptDiagram(head, "concept-mail587", [
      conceptPiece("mail-card", "メール投稿"),
      conceptPiece("port-card accent", "587"),
      conceptPiece("server-card", "送信用サーバ")
    ]);
    if (raw.includes("GPU")) return conceptDiagram(head, "concept-gpu", [
      conceptPiece("task-card", "同じ計算"),
      conceptPiece("many-core accent", "大量の小コア"),
      conceptPiece("image-card", "並列処理")
    ]);
    if (raw.includes("DHCP")) return conceptDiagram(head, "concept-dhcp", [
      conceptPiece("client-card", "端末"),
      conceptPiece("server-card accent", "IP設定を配る"),
      conceptPiece("ip-card", "IP/マスク/GW")
    ]);
    if (raw.includes("APIエコノミー")) return conceptDiagram(head, "concept-api-economy", [
      conceptPiece("service-card", "自社サービス"),
      conceptPiece("api-card accent", "API公開"),
      conceptPiece("partner-card", "外部が連携")
    ]);
    if (raw.includes("PPPoE")) return conceptDiagram(head, "concept-pppoe", [
      conceptPiece("ether-card", "Ethernet"),
      conceptPiece("ppp-card accent", "PPPを通す"),
      conceptPiece("provider-card", "接続先")
    ]);
    if (raw.includes("VDI")) return conceptDiagram(head, "concept-vdi", [
      conceptPiece("thin-card", "手元端末"),
      conceptPiece("server-card accent", "デスクトップ実体"),
      conceptPiece("screen-card", "画面だけ操作")
    ]);
  }

  if (visual === "security") {
    if (raw.includes("レインボー")) return conceptDiagram(head, "concept-rainbow", [
      conceptPiece("hash-card", "ハッシュ"),
      conceptPiece("table-card accent", "事前計算表"),
      conceptPiece("password-card", "逆引き")
    ]);
    if (raw.includes("ランサム")) return conceptDiagram(head, "concept-ransom", [
      conceptPiece("file-card", "ファイル"),
      conceptPiece("lock-card accent", "読めない形"),
      conceptPiece("money-card", "身代金要求")
    ]);
    if (raw.includes("C&C")) return conceptDiagram(head, "concept-cc", [
      conceptPiece("boss-card accent", "司令塔"),
      conceptPiece("bot-card", "感染端末"),
      conceptPiece("command-card", "命令")
    ]);
    if (raw.includes("ファジング")) return conceptDiagram(head, "concept-fuzzing", [
      conceptPiece("input-card", "変な入力を大量投入"),
      conceptPiece("app-card accent", "対象ソフト"),
      conceptPiece("bug-card", "弱点を発見")
    ]);
    if (raw.includes("不正アクセス")) return conceptDiagram(head, "concept-illegal-access", [
      conceptPiece("credential-card", "他人の認証情報"),
      conceptPiece("door-card accent", "勝手に入る"),
      conceptPiece("law-card", "法律で規制")
    ]);
  }

  if (visual === "trust") {
    if (raw.includes("楕円曲線")) return conceptDiagram(head, "concept-ecc", [
      conceptPiece("key-card", "短い鍵"),
      conceptPiece("curve-card accent", "曲線上の計算"),
      conceptPiece("lock-card", "公開鍵暗号")
    ]);
    if (raw.includes("セキュアブート")) return conceptDiagram(head, "concept-secure-boot", [
      conceptPiece("power-card", "起動"),
      conceptPiece("sign-card accent", "署名確認"),
      conceptPiece("os-card", "改ざんなら止める")
    ]);
    if (raw.includes("セキュアOS")) return conceptDiagram(head, "concept-secure-os", [
      conceptPiece("user-card", "利用者"),
      conceptPiece("policy-card accent", "強い権限制御"),
      conceptPiece("resource-card", "資源")
    ]);
    if (raw.includes("ISMAP")) return conceptDiagram(head, "concept-ismap", [
      conceptPiece("cloud-card", "クラウド"),
      conceptPiece("check-card accent", "政府の安全評価"),
      conceptPiece("list-card", "登録")
    ]);
    if (raw.includes("TPM")) return conceptDiagram(head, "concept-tpm", [
      conceptPiece("chip-card accent", "安全チップ"),
      conceptPiece("key-card", "鍵を保護"),
      conceptPiece("pc-card", "PC")
    ]);
    if (raw.includes("情報銀行")) return conceptDiagram(head, "concept-info-bank", [
      conceptPiece("person-card", "本人"),
      conceptPiece("delegate-card accent", "委任"),
      conceptPiece("data-card", "個人データ提供")
    ]);
    if (raw.includes("チャレンジレスポンス")) return conceptDiagram(head, "concept-challenge", [
      conceptPiece("challenge-card", "乱数の質問"),
      conceptPiece("secret-card accent", "秘密で計算"),
      conceptPiece("response-card", "答えだけ送る")
    ]);
  }

  if (visual === "mechanism") {
    if (raw.includes("ウェアレベリング")) return conceptDiagram(head, "concept-wear", [
      conceptPiece("cell-card", "セルA"),
      conceptPiece("rotate-card accent", "書込みを分散"),
      conceptPiece("cell-card", "セルB"),
      conceptPiece("life-card", "寿命を延ばす")
    ]);
    if (raw.includes("LiDAR")) return conceptDiagram(head, "concept-lidar", [
      conceptPiece("laser-card accent", "レーザー"),
      conceptPiece("reflect-card", "反射"),
      conceptPiece("distance-card", "距離を測る")
    ]);
    if (raw.includes("べき等")) return conceptDiagram(head, "concept-idempotent", [
      conceptPiece("once-card", "1回実行"),
      conceptPiece("many-card accent", "何回実行"),
      conceptPiece("same-card", "結果は同じ")
    ]);
    if (raw.includes("エネルギーハーベスティング")) return conceptDiagram(head, "concept-harvest", [
      conceptPiece("sun-card", "光"),
      conceptPiece("vibe-card", "振動"),
      conceptPiece("collect-card accent", "小電力を集める")
    ]);
    if (raw.includes("電子ペーパー")) return conceptDiagram(head, "concept-epaper", [
      conceptPiece("particle-card", "帯電粒子"),
      conceptPiece("field-card accent", "電気で移動"),
      conceptPiece("display-card", "表示を保つ")
    ]);
  }

  if (visual === "strategy" || visual === "cycle") {
    if (raw.includes("バックキャスティング")) return conceptDiagram(head, "concept-backcasting", [
      conceptPiece("future-card accent", "ありたい未来"),
      conceptPiece("reverse-card", "逆算"),
      conceptPiece("today-card", "今やること")
    ]);
    if (raw.includes("パーミッション")) return conceptDiagram(head, "concept-permission", [
      conceptPiece("customer-card", "顧客"),
      conceptPiece("ok-card accent", "同意"),
      conceptPiece("message-card", "売込み")
    ]);
    if (raw.includes("ギグ")) return conceptDiagram(head, "concept-gig", [
      conceptPiece("platform-card accent", "ネット仲介"),
      conceptPiece("short-job", "単発仕事"),
      conceptPiece("worker-card", "働き手")
    ]);
    if (raw.includes("コンティンジェンシー")) return conceptDiagram(head, "concept-contingency-theory", [
      conceptPiece("situation-card", "状況A"),
      conceptPiece("fit-card accent", "合う管理"),
      conceptPiece("situation-card", "状況B")
    ]);
    if (raw.includes("ROC")) return conceptDiagram(head, "concept-roc", [
      conceptPiece("axis-card", "偽陽性率"),
      conceptPiece("curve-card accent", "曲線"),
      conceptPiece("axis-card", "真陽性率")
    ]);
    if (raw.includes("決定表")) return conceptDiagram(head, "concept-decision-table", [
      conceptPiece("condition-card", "条件1/2"),
      conceptPiece("rule-card accent", "組合せ"),
      conceptPiece("action-card", "処理")
    ]);
    if (raw.includes("戦略マップ")) return conceptDiagram(head, "concept-strategy-map", [
      conceptPiece("goal-card", "財務"),
      conceptPiece("goal-card accent", "顧客"),
      conceptPiece("goal-card", "業務"),
      conceptPiece("link-card", "因果でつなぐ")
    ]);
    if (raw.includes("集団思考")) return conceptDiagram(head, "concept-groupthink", [
      conceptPiece("team-card accent", "まとまり過ぎ"),
      conceptPiece("silence-card", "反対が出ない"),
      conceptPiece("bad-card", "判断が鈍る")
    ]);
    if (raw.includes("ターゲットリターン")) return conceptDiagram(head, "concept-target-return", [
      conceptPiece("profit-card", "目標利益"),
      conceptPiece("cost-card", "原価"),
      conceptPiece("price-card accent", "価格を決める")
    ]);
    if (raw.includes("コンジョイント")) return conceptDiagram(head, "concept-conjoint", [
      conceptPiece("attr-card", "価格"),
      conceptPiece("attr-card", "機能"),
      conceptPiece("choice-card accent", "好みを分解")
    ]);
    if (raw.includes("ファブレス")) return conceptDiagram(head, "concept-fabless", [
      conceptPiece("design-card accent", "設計に集中"),
      conceptPiece("factory-card", "製造は外部"),
      conceptPiece("product-card", "製品")
    ]);
    if (raw.includes("SL理論")) return conceptDiagram(head, "concept-sl-theory", [
      conceptPiece("member-card", "部下の成熟度"),
      conceptPiece("style-card accent", "指示/説得/参加/委任"),
      conceptPiece("fit-card", "相手に合わせる")
    ]);
    if (raw.includes("PM理論")) return conceptDiagram(head, "concept-pm-theory", [
      conceptPiece("axis-card", "成果"),
      conceptPiece("axis-card accent", "人への配慮"),
      conceptPiece("matrix-card", "PとMの二軸")
    ]);
  }

  if (visual === "cycle") {
    if (raw.includes("スコープ")) return conceptDiagram(head, "concept-scope", [
      conceptPiece("in-card accent", "含める"),
      conceptPiece("out-card", "含めない"),
      conceptPiece("doc-card", "文書化")
    ]);
    if (raw.includes("オープンイノベーション")) return conceptDiagram(head, "concept-open-innovation", [
      conceptPiece("inside-card", "社内"),
      conceptPiece("outside-card accent", "外部の知恵"),
      conceptPiece("new-card", "新価値")
    ]);
    if (raw.includes("レジリエンス")) return conceptDiagram(head, "concept-resilience", [
      conceptPiece("shock-card", "障害"),
      conceptPiece("bend-card accent", "耐える"),
      conceptPiece("recover-card", "戻る")
    ]);
    if (raw.includes("クリティカルチェーン")) return conceptDiagram(head, "concept-critical-chain", [
      conceptPiece("task-card", "作業列"),
      conceptPiece("resource-card accent", "資源制約"),
      conceptPiece("buffer-card", "バッファ")
    ]);
    if (raw.includes("デルファイ")) return conceptDiagram(head, "concept-delphi", [
      conceptPiece("expert-card", "匿名専門家"),
      conceptPiece("round-card accent", "繰返し集約"),
      conceptPiece("consensus-card", "見込み")
    ]);
    if (raw.includes("トレーサビリティ")) return conceptDiagram(head, "concept-trace", [
      conceptPiece("req-card", "要求"),
      conceptPiece("design-card accent", "設計"),
      conceptPiece("test-card", "テスト"),
      conceptPiece("link-card", "対応を追う")
    ]);
    if (raw.includes("RFI")) return conceptDiagram(head, "concept-rfi", [
      conceptPiece("info-card accent", "情報依頼"),
      conceptPiece("vendor-card", "候補企業"),
      conceptPiece("rfp-card", "RFP前")
    ]);
    if (raw.includes("リスクアセスメント")) return conceptDiagram(head, "concept-risk-assessment", [
      conceptPiece("find-card", "見つける"),
      conceptPiece("analyze-card accent", "分析"),
      conceptPiece("evaluate-card", "評価")
    ]);
    if (raw.includes("KPT")) return conceptDiagram(head, "concept-kpt", [
      conceptPiece("keep-card", "Keep"),
      conceptPiece("problem-card accent", "Problem"),
      conceptPiece("try-card", "Try")
    ]);
    if (raw.includes("EVM")) return conceptDiagram(head, "concept-evm", [
      conceptPiece("progress-card", "出来高"),
      conceptPiece("cost-card accent", "コスト"),
      conceptPiece("schedule-card", "進捗")
    ]);
    if (raw.includes("かんばん")) return conceptDiagram(head, "concept-kanban", [
      conceptPiece("later-card accent", "後工程"),
      conceptPiece("pull-card", "必要分だけ引く"),
      conceptPiece("stock-card", "在庫を抑える")
    ]);
  }

  return "";
}

function diagramV2(card, reveal = false) {
  const lesson = lessonDiagramHtml(card, reveal);
  if (lesson) return lesson;
  const memory = esc(easyText(card.memory));
  const visual = card.visual;
  const family = visualFamily(visual);
  const answer = esc(reveal ? card.answer : clueLabel(card, family));
  const headTitle = esc(reveal ? card.answer : clueLabel(card, family));
  const head = `<div class="visual-head"><span class="visual-kind">${esc(card.category)}</span><strong>${headTitle}</strong><p>${memory}</p></div>`;
  const specific = specificDiagram(card, head, answer, family);
  if (specific) return specific;

  if (visual === "crc") {
    return `<div class="memory-visual crc-visual">${head}<div class="crc-board">
      <div class="bit-row"><span>1</span><span>0</span><span>1</span><span>1</span><span>0</span><span>1</span></div>
      <div class="division-mark">割る</div>
      <div class="poly-card">生成多項式</div>
      <div class="remainder-card">余りを付ける</div>
      <div class="error-spark">不一致なら誤り</div>
    </div></div>`;
  }

  if (visual === "sideChannel") {
    return `<div class="memory-visual side-channel">${head}<div class="device-scene">
      <div class="chip">暗号処理</div>
      <div class="leak leak-time">処理時間</div>
      <div class="leak leak-power">消費電力</div>
      <div class="leak leak-wave">電磁波</div>
      <div class="attacker-eye">観測</div>
    </div></div>`;
  }

  if (visual === "stp") {
    return `<div class="memory-visual topology">${head}<div class="switch-net">
      <span class="sw n1">SW</span><span class="sw n2">SW</span><span class="sw n3">SW</span>
      <span class="net-line l12"></span><span class="net-line l23"></span><span class="net-line l31 blocked"></span>
      <span class="blocked-label">ここを止める</span>
    </div></div>`;
  }

  if (visual === "fishbone") {
    return `<div class="memory-visual fishbone">${head}<div class="fish">
      <span class="spine"></span><span class="head-label">結果</span>
      <span class="bone b1">人</span><span class="bone b2">方法</span><span class="bone b3">設備</span><span class="bone b4">材料</span>
    </div></div>`;
  }

  if (family === "trust") {
    return autoDiagram(card, head, answer, family);
  }

  if (family === "security") {
    return autoDiagram(card, head, answer, family);
  }

  if (family === "data") {
    return autoDiagram(card, head, answer, family);
  }

  if (family === "system") {
    return autoDiagram(card, head, answer, family);
  }

  if (family === "strategy") {
    return autoDiagram(card, head, answer, family);
  }

  if (family === "cycle") {
    return autoDiagram(card, head, answer, family);
  }

  return autoDiagram(card, head, answer, family);
}

function diagram(card) {
  const a = esc(card.answer);
  const m = esc(card.memory);
  const visual = card.visual;
  if (["crl", "ocsp", "dnssec", "secureCookie", "spf"].includes(visual)) {
    return svgCard(`
      ${box(36, 72, 150, 88, "利用者", "soft")}
      ${box(285, 42, 150, 58, "証明書 / DNS", "accent")}
      ${box(285, 142, 150, 58, a, "warn")}
      ${box(535, 72, 150, 88, "信頼判定", "good")}
      ${arrow(186, 116, 285, 78)}${arrow(435, 78, 535, 116)}${arrow(435, 172, 535, 126)}
      <text class="svg-note" x="360" y="236" text-anchor="middle">${m}</text>`, "trust");
  }
  if (["reverseProxy", "waf", "cspm", "commandInjection", "sideChannel", "dnsPoison", "passwordList", "exploit", "forensics"].includes(visual)) {
    return svgCard(`
      ${box(34, 76, 130, 82, "外部", "soft")}
      ${box(238, 54, 190, 126, a, "warn")}
      ${box(560, 46, 120, 58, "サーバ", "good")}
      ${box(560, 150, 120, 58, "ログ/設定", "good")}
      ${arrow(164, 117, 238, 117)}${arrow(428, 98, 560, 76)}${arrow(428, 142, 560, 178)}
      <path class="shield" d="M333 70 L388 88 V123 C388 151 368 168 333 181 C298 168 278 151 278 123 V88 Z"></path>
      <text class="shield-text" x="333" y="128" text-anchor="middle">${a}</text>
      <text class="svg-note" x="360" y="236" text-anchor="middle">${m}</text>`, "security");
  }
  if (["nosql", "view", "mvcc", "objectStorage", "checkpoint", "storedProcedure", "coalesce", "starSchema"].includes(visual)) {
    const center = visual === "starSchema" ? "ファクト表" : a;
    return svgCard(`
      ${cyl(282, 50, 156, 154, center, "db-main")}
      ${box(54, 46, 138, 58, visual === "view" ? "実表" : "アプリ", "soft")}
      ${box(54, 154, 138, 58, visual === "mvcc" ? "旧版" : "入力", "soft")}
      ${box(528, 46, 138, 58, visual === "starSchema" ? "商品次元" : "結果", "good")}
      ${box(528, 154, 138, 58, visual === "starSchema" ? "顧客次元" : "保存", "good")}
      ${arrow(192, 76, 282, 98)}${arrow(192, 184, 282, 152)}${arrow(438, 98, 528, 76)}${arrow(438, 152, 528, 184)}
      <text class="svg-note" x="360" y="236" text-anchor="middle">${m}</text>`, "database");
  }
  if (["iac", "provisioning", "sdn", "edge", "digitalTwin", "pwa", "openapi", "docGenerator"].includes(visual)) {
    return svgCard(`
      ${box(40, 80, 135, 90, visual === "iac" ? "コード" : "仕様/データ", "accent")}
      ${box(272, 52, 176, 146, a, "soft")}
      ${box(548, 46, 130, 64, "実環境", "good")}
      ${box(548, 150, 130, 64, "利用者", "good")}
      ${arrow(175, 125, 272, 125)}${arrow(448, 94, 548, 78)}${arrow(448, 156, 548, 182)}
      <text class="svg-note" x="360" y="236" text-anchor="middle">${m}</text>`, "system");
  }
  if (["ansoff", "ppm", "canvas", "association", "decisionTree", "gameTheory", "nash", "fishbone", "competency"].includes(visual)) {
    return svgCard(`
      <rect class="matrix-bg" x="110" y="32" width="500" height="176" rx="14"></rect>
      <line class="matrix-line" x1="360" y1="32" x2="360" y2="208"></line>
      <line class="matrix-line" x1="110" y1="120" x2="610" y2="120"></line>
      <text class="axis" x="235" y="78" text-anchor="middle">既存 / 低</text>
      <text class="axis" x="485" y="78" text-anchor="middle">新規 / 高</text>
      <text class="axis" x="235" y="166" text-anchor="middle">分析</text>
      <text class="axis strong" x="485" y="166" text-anchor="middle">${a}</text>
      <text class="svg-note" x="360" y="236" text-anchor="middle">${m}</text>`, "matrix-diagram");
  }
  if (["plm", "mes", "scm", "tuckman", "xp", "lean", "followup", "ghg", "auditPaper", "contingency"].includes(visual)) {
    const labels = visual === "plm" ? ["企画", "設計", "製造", "保守", "廃棄"] :
      visual === "tuckman" ? ["形成", "混乱", "統一", "機能", "成果"] :
      visual === "scm" ? ["調達", "生産", "物流", "販売", "顧客"] :
      ["計画", "実行", a, "確認", "改善"];
    return svgCard(labels.map((label, i) => `${box(38 + i * 134, 84, 104, 74, label, i === 2 ? "accent" : "soft")}${i < 4 ? arrow(142 + i * 134, 121, 172 + i * 134, 121) : ""}`).join("") +
      `<text class="svg-note" x="360" y="236" text-anchor="middle">${m}</text>`, "lifecycle");
  }
  if (["thread", "lru", "thrashing", "dma", "avl", "soc", "actuator", "twoPhaseCommit", "csmacd", "lpwa"].includes(visual)) {
    return svgCard(`
      ${box(44, 52, 150, 58, "処理A", "soft")}
      ${box(44, 152, 150, 58, "処理B", "soft")}
      ${box(286, 78, 148, 106, a, "accent")}
      ${box(548, 52, 130, 58, "資源", "good")}
      ${box(548, 152, 130, 58, "結果", "good")}
      ${arrow(194, 80, 286, 110)}${arrow(194, 180, 286, 150)}${arrow(434, 110, 548, 80)}${arrow(434, 150, 548, 180)}
      <text class="svg-note" x="360" y="236" text-anchor="middle">${m}</text>`, "control");
  }
  if (["psirt", "sbom", "cve", "saml", "3ds", "threeDS", "cocreation", "massCustomization", "ea", "soa", "microservice"].includes(visual)) {
    return svgCard(`
      ${box(72, 74, 130, 82, "要求/報告", "soft")}
      ${box(286, 42, 150, 70, a, "accent")}
      ${box(286, 148, 150, 70, "調整", "warn")}
      ${box(520, 74, 130, 82, "提供/対応", "good")}
      ${arrow(202, 115, 286, 78)}${arrow(202, 115, 286, 182)}${arrow(436, 78, 520, 115)}${arrow(436, 182, 520, 115)}
      <text class="svg-note" x="360" y="236" text-anchor="middle">${m}</text>`, "coordination");
  }
  return svgCard(`
    ${box(54, 80, 150, 88, "手掛かり", "soft")}
    ${box(286, 58, 148, 132, a, "accent")}
    ${box(520, 80, 150, 88, "選択肢判定", "good")}
    ${arrow(204, 124, 286, 124)}${arrow(434, 124, 520, 124)}
    <text class="svg-note" x="360" y="236" text-anchor="middle">${m}</text>`, "generic");
}

function prompt(card) {
  return `${easyText(card.text)} 用語は？`;
}

function renderQuiz() {
  const card = currentCard();
  els.cardExam.textContent = card.exam;
  els.cardQno.textContent = `問${card.qno}`;
  els.cardCategory.textContent = card.category;
  els.diagram.innerHTML = memoryCue(card);
  els.questionText.innerHTML = renderRichText(prompt(card).replace(card.answer, "□□□"));
  els.answerInput.value = "";
  els.feedback.className = "feedback";
  els.feedback.textContent = "";
  $("weakBtn").textContent = isWeak(card) ? "苦手解除" : "苦手";
}

function renderLearn() {
  const card = currentCard();
  els.learnContent.innerHTML = `
    <div class="card-meta">
      <span>${esc(card.exam)}</span><span>問${card.qno}</span><span>${esc(card.domain)}</span><span>${esc(card.category)}</span>
    </div>
    <div class="learn-grid">
      <div class="explain">
        <h2 class="learn-title">${esc(card.answer)}</h2>
        ${firstGlanceHtml(card)}
        <details class="detail-block">
          <summary>詳しい説明</summary>
          <p>${renderRichText(card.text)}</p>
          <p><strong>こう覚える:</strong> ${renderRichText(card.memory)}</p>
        </details>
        ${memoryStoryHtml(card)}
        <p><strong>出題の手掛かり:</strong> ${esc(card.topic)}</p>
        <p><a href="${card.url}" target="_blank" rel="noreferrer">元問題を開く</a></p>
      </div>
      <div class="diagram">${primaryAidHtml(card)}</div>
    </div>`;
}

function renderList() {
  els.cardList.innerHTML = filtered.map((card, index) => `
    <div class="row-card">
      <span class="pill">${esc(card.exam)} 問${card.qno}</span>
      <div>
        <div class="row-title">${esc(card.answer)}</div>
        <div class="row-sub">${esc(easyText(card.memory))} / ${esc(card.category)}</div>
      </div>
      <button data-jump="${index}">開く</button>
    </div>
  `).join("") || `<p class="row-sub">条件に合うカードがありません。</p>`;
}

function renderStats() {
  const right = cards.filter(isRight).length;
  const weak = cards.filter(isWeak).length;
  const percent = Math.round((right / cards.length) * 100);
  els.rightCount.textContent = right;
  els.weakCount.textContent = weak;
  els.totalCount.textContent = cards.length;
  els.scoreRing.style.background = `conic-gradient(var(--accent) ${percent * 3.6}deg, #dfe7f0 0deg)`;
  els.scoreRing.querySelector("span").textContent = `${percent}%`;
}

function render() {
  document.querySelectorAll(".term-note").forEach((note) => note.remove());
  els.quizView.classList.toggle("hidden", mode !== "quiz");
  els.learnView.classList.toggle("hidden", mode !== "learn");
  els.listView.classList.toggle("hidden", mode !== "list");
  if (mode === "quiz") renderQuiz();
  if (mode === "learn") renderLearn();
  if (mode === "list") renderList();
  renderStats();
}

function checkAnswer() {
  const card = currentCard();
  const answer = normalize(els.answerInput.value);
  const accepted = card.aliases.some((alias) => {
    const target = normalize(alias);
    return target === answer || (answer.length >= 3 && target.includes(answer));
  });
  progress[card.id] = { ...progress[card.id], right: accepted || progress[card.id]?.right, attempts: (progress[card.id]?.attempts || 0) + 1 };
  els.feedback.className = `feedback ${accepted ? "good" : "bad"}`;
  els.feedback.innerHTML = accepted
    ? `正解。答えは <strong>${esc(card.answer)}</strong> です。${originMiniHtml(card)}`
    : `答えは <strong>${esc(card.answer)}</strong>。${esc(easyText(card.memory))} と覚えると選択肢を切れます。${mistakeHintHtml(card, els.answerInput.value)}${originMiniHtml(card)}`;
  saveProgress();
}

function revealAnswer() {
  const card = currentCard();
  els.feedback.className = "feedback";
  els.feedback.innerHTML = `答えは <strong>${esc(card.answer)}</strong>。${renderRichText(card.text)}${contrastHtml(card, true)}${originMiniHtml(card)}`;
}

function move(delta) {
  if (!filtered.length) return;
  currentIndex = (currentIndex + delta + filtered.length) % filtered.length;
  render();
}

function shuffle() {
  filtered.sort(() => Math.random() - 0.5);
  currentIndex = 0;
  render();
}

document.querySelectorAll(".mode-tabs button").forEach((button) => {
  button.addEventListener("click", () => {
    mode = button.dataset.mode;
    document.querySelectorAll(".mode-tabs button").forEach((b) => b.classList.toggle("active", b === button));
    render();
  });
});

["change", "input"].forEach((eventName) => {
  [els.examFilter, els.domainFilter, els.categoryFilter, els.searchInput, els.weakOnly, els.hideDone].forEach((el) => {
    el.addEventListener(eventName, applyFilters);
  });
});

$("checkBtn").addEventListener("click", checkAnswer);
$("revealBtn").addEventListener("click", revealAnswer);
$("nextBtn").addEventListener("click", () => move(1));
$("prevBtn").addEventListener("click", () => move(-1));
$("shuffleBtn").addEventListener("click", shuffle);
$("weakBtn").addEventListener("click", () => {
  const card = currentCard();
  progress[card.id] = { ...progress[card.id], weak: !isWeak(card) };
  saveProgress();
  render();
});
$("resetBtn").addEventListener("click", () => {
  if (!confirm("進捗をリセットしますか？")) return;
  progress = {};
  saveProgress();
  render();
});
els.answerInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") checkAnswer();
});
function termNoteAnchor(termButton) {
  return termButton.closest("p, dd, li, .question, .feedback, .first-glance, .primary-aid, .memory-story section, .contrast-box div") || termButton;
}

document.addEventListener("click", (event) => {
  const termButton = event.target.closest(".term-link");
  if (!termButton) return;
  const entry = glossaryById[termButton.dataset.term];
  if (!entry) return;
  document.querySelectorAll(".term-note").forEach((note) => note.remove());
  const anchor = termNoteAnchor(termButton);
  anchor.insertAdjacentHTML("afterend", glossaryNoteHtml(entry));
  anchor.nextElementSibling?.scrollIntoView({ block: "nearest", inline: "nearest" });
});
els.cardList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-jump]");
  if (!button) return;
  currentIndex = Number(button.dataset.jump);
  mode = "learn";
  document.querySelectorAll(".mode-tabs button").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
  render();
});

initFilters();
applyFilters();
