import Link from "next/link";

type Grade = "A" | "B" | "C";
type TagType = "critical" | "monthly_attention" | "complaint_watch";
type NotificationLevel = "high" | "medium" | "low";

function getGradeChipClass(grade: Grade) {
  if (grade === "A") return "bg-nb-green text-nb-ink";
  if (grade === "B") return "bg-nb-yellow text-nb-ink";
  return "bg-nb-red text-white";
}

function getNbNotificationTone(level: NotificationLevel) {
  if (level === "high") return "bg-nb-red text-white border-nb-ink";
  if (level === "medium") return "bg-nb-yellow text-nb-ink border-nb-ink";
  return "bg-nb-paper text-nb-ink border-nb-ink";
}

function getTagChipClass(tagType: TagType) {
  if (tagType === "critical") return "bg-nb-red text-white";
  if (tagType === "monthly_attention") return "bg-nb-yellow text-nb-ink";
  return "bg-nb-ink text-white";
}

function getNotificationLevelLabel(level: NotificationLevel) {
  if (level === "high") return "高";
  if (level === "medium") return "中";
  return "低";
}

function getInspectionTagLabel(tag: TagType) {
  if (tag === "critical") return "必查項目";
  if (tag === "monthly_attention") return "本月加強";
  return "客訴項目";
}

const overallGrade: { finalGrade: Grade; counts: { a: number; b: number; c: number } } = {
  finalGrade: "B",
  counts: { a: 5, b: 12, c: 4 },
};

const categoryGrades: {
  categoryName: string;
  averageScore: number;
  grade: Grade;
  counts: { a: number; b: number; c: number };
}[] = [
  { categoryName: "食品安全", averageScore: 1.87, grade: "C", counts: { a: 1, b: 2, c: 4 } },
  { categoryName: "清潔衛生", averageScore: 2.12, grade: "C", counts: { a: 2, b: 3, c: 3 } },
  { categoryName: "服務品質", averageScore: 2.35, grade: "B", counts: { a: 3, b: 4, c: 2 } },
  { categoryName: "商品陳列", averageScore: 2.58, grade: "B", counts: { a: 4, b: 5, c: 1 } },
  { categoryName: "操作流程", averageScore: 2.78, grade: "A", counts: { a: 6, b: 3, c: 0 } },
  { categoryName: "基礎設備", averageScore: 2.89, grade: "A", counts: { a: 7, b: 2, c: 0 } },
];

const weakestCategories = categoryGrades.slice(0, 3);
const strongestCategories = [...categoryGrades].reverse().slice(0, 3);

const tagIssueCounts = { critical: 3, monthlyAttention: 5, complaintWatch: 2 };

const totalInspections = 24;
const averageScore = 2.31;
const pendingTasks = 7;
const verifiedTasks = 12;
const activeStaffCount = 18;
const lowScoreInspections = 4;
const managedStoreCount = 6;

const quickLinks = [
  { href: "#", label: "新增巡店" },
  { href: "#", label: "巡店紀錄" },
  { href: "#", label: "改善追蹤" },
  { href: "#", label: "報表分析" },
  { href: "#", label: "組員管理" },
  { href: "#", label: "帳號管理" },
];

const groupedByStore: {
  storeName: string;
  inspections: number;
  averageScore: number;
  overallGrade: Grade;
}[] = [
  { storeName: "板橋好初旗艦店", inspections: 5, averageScore: 1.92, overallGrade: "C" },
  { storeName: "板橋車站店", inspections: 4, averageScore: 2.21, overallGrade: "C" },
  { storeName: "新埔民生店", inspections: 5, averageScore: 2.48, overallGrade: "B" },
  { storeName: "新板特區店", inspections: 4, averageScore: 2.65, overallGrade: "B" },
];

const pendingTaskHighlights: {
  id: string;
  storeName: string;
  itemName: string;
  score: 1 | 2 | 3 | null;
  note: string | null;
  inspectionDate: string | null;
  isFocusItem: boolean;
  tagTypes: TagType[];
}[] = [
  {
    id: "t1",
    storeName: "板橋好初旗艦店",
    itemName: "冰箱溫度記錄完整",
    score: 1,
    note: "今日巡店發現冰箱 3 號溫度超標，已請夜班組員補記錄。",
    inspectionDate: "2026-04-18",
    isFocusItem: true,
    tagTypes: ["critical"],
  },
  {
    id: "t2",
    storeName: "板橋車站店",
    itemName: "工作檯清潔落實",
    score: 2,
    note: null,
    inspectionDate: "2026-04-17",
    isFocusItem: false,
    tagTypes: ["monthly_attention", "complaint_watch"],
  },
];

const latestInspectionRows: {
  id: string;
  date: string;
  timeSlot: string;
  storeName: string;
  averageScore: number;
  grade: Grade;
}[] = [
  { id: "i1", date: "2026-04-20", timeSlot: "早班", storeName: "板橋好初旗艦店", averageScore: 2.18, grade: "B" },
  { id: "i2", date: "2026-04-19", timeSlot: "午班", storeName: "板橋車站店", averageScore: 1.95, grade: "C" },
  { id: "i3", date: "2026-04-18", timeSlot: "早班", storeName: "新埔民生店", averageScore: 2.52, grade: "B" },
  { id: "i4", date: "2026-04-17", timeSlot: "晚班", storeName: "新板特區店", averageScore: 2.71, grade: "A" },
  { id: "i5", date: "2026-04-16", timeSlot: "早班", storeName: "板橋好初旗艦店", averageScore: 2.08, grade: "C" },
];

const notificationFeed: {
  items: {
    id: string;
    level: NotificationLevel;
    title: string;
    description: string;
    storeName: string | null;
    href: string | null;
  }[];
} = {
  items: [
    {
      id: "n1",
      level: "high",
      title: "冰箱 3 號溫度超標連續 2 週",
      description: "板橋好初旗艦店的冰箱溫度記錄項目連續兩週被評 C，建議立即派人檢查機台。",
      storeName: "板橋好初旗艦店",
      href: "#",
    },
    {
      id: "n2",
      level: "high",
      title: "客訴未在時效內回覆 3 筆",
      description: "本月累積 3 筆客訴超過 24 小時才處理，建議盤點客訴回報 SOP。",
      storeName: "新埔民生店",
      href: "#",
    },
    {
      id: "n3",
      level: "medium",
      title: "工作檯清潔項目本月持續偏弱",
      description: "本月加強項目「工作檯清潔」仍有 4 次評 B 以下，建議週會重點宣導。",
      storeName: "板橋車站店",
      href: "#",
    },
    {
      id: "n4",
      level: "low",
      title: "新板特區店連續 3 週維持 A 等級",
      description: "新板特區店表現穩定，可作為其他店標竿。",
      storeName: "新板特區店",
      href: null,
    },
  ],
};

export default function PreviewPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="mb-6 border-[3px] border-nb-ink bg-nb-yellow px-4 py-3 shadow-nb-sm">
        <p className="font-nbMono text-[11px] font-bold uppercase tracking-widest text-nb-ink">
          Preview · 視覺預覽用假資料
        </p>
        <p className="mt-1 text-sm font-bold text-nb-ink">
          這頁是 Neo Brutalism 視覺預覽，資料是假的、沒有側邊欄。真實登入後看到的外框 (nav/header) 還是舊 AppShell。
        </p>
      </div>

      <div className="grid gap-6">
        {/* ===== Hero ===== */}
        <section className="nb-card p-0 overflow-hidden relative">
          <div className="absolute top-5 right-5 z-10 hidden md:block">
            <span className="nb-stamp">OPS · 營運中</span>
          </div>

          <div className="grid gap-6 px-6 py-7 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
            <div>
              <p className="nb-eyebrow">Operations Dashboard · 營運總覽</p>
              <h1 className="mt-3 font-nbSerif text-4xl md:text-5xl font-black tracking-tight leading-[1.05]">
                營運總覽首頁
              </h1>
              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-nb-ink/75">
                先看跨店整體評級，再往下看各分類健康度、弱店別與待改善任務。
              </p>
            </div>

            <div className="bg-nb-yellow border-[3px] border-nb-ink p-5">
              <p className="nb-eyebrow">Network Snapshot</p>
              <div className="mt-4 grid gap-4">
                <div>
                  <p className="text-sm text-nb-ink/70 font-bold">管理店數</p>
                  <p className="mt-1 font-nbSerif text-3xl font-black">{managedStoreCount} 間店</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-nb-paper border-[2.5px] border-nb-ink px-4 py-3">
                    <p className="font-nbMono text-[10px] font-bold tracking-widest uppercase text-nb-ink/60">本月總評</p>
                    <p
                      className={`mt-2 inline-flex items-center justify-center min-w-[3rem] h-12 px-3 border-[2.5px] border-nb-ink font-nbSerif text-3xl font-black ${getGradeChipClass(overallGrade.finalGrade)}`}
                    >
                      {overallGrade.finalGrade}
                    </p>
                  </div>
                  <div className="bg-nb-paper border-[2.5px] border-nb-ink px-4 py-3">
                    <p className="font-nbMono text-[10px] font-bold tracking-widest uppercase text-nb-ink/60">平均分數</p>
                    <p className="mt-2 font-nbSerif text-3xl font-black">{averageScore.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== KPI 四格 ===== */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="nb-card-sm px-5 py-4">
            <p className="nb-eyebrow">本月總評</p>
            <p
              className={`mt-3 inline-flex items-center justify-center min-w-[3.5rem] h-14 px-4 border-[2.5px] border-nb-ink font-nbSerif text-3xl font-black ${getGradeChipClass(overallGrade.finalGrade)}`}
            >
              {overallGrade.finalGrade}
            </p>
          </div>
          <div className="nb-card-sm px-5 py-4">
            <p className="nb-eyebrow">本月巡店次數</p>
            <p className="mt-2 font-nbSerif text-4xl font-black">{totalInspections}</p>
            <p className="mt-2 font-nbMono text-xs font-bold text-nb-ink/60">
              A / B / C：{overallGrade.counts.a} / {overallGrade.counts.b} / {overallGrade.counts.c}
            </p>
          </div>
          <div className="nb-card-sm px-5 py-4">
            <p className="nb-eyebrow">待改善任務</p>
            <p className="mt-2 font-nbSerif text-4xl font-black">{pendingTasks}</p>
            <p className="mt-2 font-nbMono text-xs font-bold text-nb-ink/60">已確認 {verifiedTasks} 項</p>
          </div>
          <div className="nb-card-sm px-5 py-4">
            <p className="nb-eyebrow">在職組員數</p>
            <p className="mt-2 font-nbSerif text-4xl font-black">{activeStaffCount}</p>
            <p className="mt-2 font-nbMono text-xs font-bold text-nb-ink/60">低分巡店 {lowScoreInspections} 次</p>
          </div>
        </section>

        {/* ===== 標籤異常三格 ===== */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="nb-card-sm px-5 py-4 bg-nb-red text-white">
            <p className="font-nbMono text-[11px] font-bold uppercase tracking-[0.25em] text-white/85">必查異常</p>
            <p className="mt-2 font-nbSerif text-4xl font-black">{tagIssueCounts.critical}</p>
            <p className="mt-2 font-nbMono text-xs font-bold text-white/80">目前落在 B / C 的必查題目數</p>
          </div>
          <div className="nb-card-sm px-5 py-4 bg-nb-yellow">
            <p className="font-nbMono text-[11px] font-bold uppercase tracking-[0.25em] text-nb-ink/75">本月加強異常</p>
            <p className="mt-2 font-nbSerif text-4xl font-black">{tagIssueCounts.monthlyAttention}</p>
            <p className="mt-2 font-nbMono text-xs font-bold text-nb-ink/70">本月加強、但仍落在 B / C 的題目</p>
          </div>
          <div className="nb-card-sm px-5 py-4">
            <p className="nb-eyebrow">客訴項目異常</p>
            <p className="mt-2 font-nbSerif text-4xl font-black">{tagIssueCounts.complaintWatch}</p>
            <p className="mt-2 font-nbMono text-xs font-bold text-nb-ink/60">被標記為客訴且落在 B / C 的題目</p>
          </div>
        </section>

        {/* ===== 通知摘要 ===== */}
        <section className="nb-card p-6">
          <div className="flex items-center justify-between gap-3 pb-4 border-b-[3px] border-nb-ink">
            <div>
              <p className="nb-eyebrow">Notifications · 通知中心</p>
              <h2 className="mt-1 font-nbSerif text-2xl font-black">通知摘要</h2>
            </div>
            <Link href="#" className="nb-btn text-sm">
              查看全部 →
            </Link>
          </div>
          <div className="mt-5 grid gap-3">
            {notificationFeed.items.slice(0, 4).map((item) => (
              <div key={item.id} className={`border-[2.5px] px-4 py-4 ${getNbNotificationTone(item.level)}`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 bg-nb-paper border-[2px] border-nb-ink text-nb-ink text-xs font-bold">
                        {getNotificationLevelLabel(item.level)} 優先
                      </span>
                      {item.storeName ? (
                        <span className="font-nbMono text-xs font-bold opacity-85">{item.storeName}</span>
                      ) : null}
                    </div>
                    <p className="mt-3 font-bold text-[15px]">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 opacity-90">{item.description}</p>
                  </div>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="inline-flex items-center px-4 py-2 bg-nb-paper border-[2.5px] border-nb-ink text-nb-ink text-sm font-bold hover:-translate-y-0.5 hover:shadow-nb-sm transition-all"
                    >
                      前往查看
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== 雙欄：分類健康度 + 店別表現 ===== */}
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="grid gap-6">
            {/* 各分類健康度 */}
            <section className="nb-card p-6">
              <div className="flex items-center justify-between gap-3 pb-4 border-b-[3px] border-nb-ink">
                <div>
                  <p className="nb-eyebrow">Category Health · 分類健康度</p>
                  <h2 className="mt-1 font-nbSerif text-2xl font-black">各分類健康度</h2>
                </div>
                <Link href="#" className="nb-btn text-sm">
                  報表 →
                </Link>
              </div>
              <div className="mt-5 grid gap-3">
                {weakestCategories.map((category) => (
                  <div
                    key={category.categoryName}
                    className="bg-nb-bg2 border-[2.5px] border-nb-ink px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-nb-ink">{category.categoryName}</p>
                        <p className="mt-1 font-nbMono text-xs font-bold text-nb-ink/60">
                          平均分數 {category.averageScore.toFixed(2)} · A/B/C {category.counts.a}/{category.counts.b}/{category.counts.c}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center justify-center w-11 h-11 border-[2.5px] border-nb-ink font-nbSerif text-xl font-black ${getGradeChipClass(category.grade)}`}
                      >
                        {category.grade}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 最近巡店紀錄 */}
            <section className="nb-card p-6">
              <div className="flex items-center justify-between gap-3 pb-4 border-b-[3px] border-nb-ink">
                <div>
                  <p className="nb-eyebrow">Recent Activity · 最近活動</p>
                  <h2 className="mt-1 font-nbSerif text-2xl font-black">最近巡店紀錄</h2>
                </div>
                <Link href="#" className="nb-btn text-sm">
                  全部 →
                </Link>
              </div>
              <div className="mt-5 grid gap-3">
                {latestInspectionRows.map((inspection) => (
                  <div
                    key={inspection.id}
                    className="flex flex-col gap-3 border-[2.5px] border-nb-ink bg-nb-paper px-4 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-nbMono text-xs font-bold text-nb-ink/60">{inspection.date}</p>
                      <p className="mt-1 text-base font-bold text-nb-ink">
                        {inspection.storeName} · {inspection.timeSlot}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center justify-center w-11 h-11 border-[2.5px] border-nb-ink font-nbSerif text-xl font-black ${getGradeChipClass(inspection.grade)}`}
                      >
                        {inspection.grade}
                      </span>
                      <Link href="#" className="nb-btn text-sm">
                        查看明細
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 待改善任務（摘要） */}
            <section className="nb-card p-6">
              <div className="flex items-center justify-between gap-3 pb-4 border-b-[3px] border-nb-ink">
                <div>
                  <p className="nb-eyebrow">Action Queue · 改善清單</p>
                  <h2 className="mt-1 font-nbSerif text-2xl font-black">待改善摘要</h2>
                </div>
                <Link href="#" className="nb-btn text-sm">
                  全部 →
                </Link>
              </div>
              <div className="mt-5 grid gap-3">
                {pendingTaskHighlights.map((task) => (
                  <div key={task.id} className="border-[2.5px] border-nb-ink bg-nb-paper px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-nb-ink">{task.itemName}</p>
                        <p className="mt-1 font-nbMono text-xs font-bold text-nb-ink/60">
                          {task.storeName}
                          {task.inspectionDate ? ` · ${task.inspectionDate}` : ""}
                          {task.score ? ` · 分數 ${task.score}` : ""}
                        </p>
                      </div>
                      <span className="nb-chip-red">待處理</span>
                    </div>
                    {task.tagTypes.length > 0 || task.isFocusItem ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {task.tagTypes.map((tagType) => (
                          <span
                            key={`${task.id}-${tagType}`}
                            className={`inline-flex items-center px-2.5 py-1 border-[2px] border-nb-ink text-xs font-bold ${getTagChipClass(tagType)}`}
                          >
                            {getInspectionTagLabel(tagType)}
                          </span>
                        ))}
                        {task.isFocusItem && task.tagTypes.length === 0 ? (
                          <span className="nb-chip-yellow">重點追蹤</span>
                        ) : null}
                      </div>
                    ) : null}
                    {task.note ? <p className="mt-3 text-sm leading-6 text-nb-ink/75">{task.note}</p> : null}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="grid gap-6">
            {/* 店別表現一覽 */}
            <section className="nb-card p-6">
              <div className="pb-4 border-b-[3px] border-nb-ink">
                <p className="nb-eyebrow">Store Overview · 店別總覽</p>
                <h2 className="mt-1 font-nbSerif text-2xl font-black">店別表現一覽</h2>
              </div>
              <div className="mt-5 grid gap-3">
                {groupedByStore.map((store, idx) => (
                  <div
                    key={store.storeName}
                    className="border-[2.5px] border-nb-ink bg-nb-paper px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-9 h-9 bg-nb-yellow border-[2.5px] border-nb-ink font-nbSerif font-black text-lg">
                          {idx + 1}
                        </span>
                        <p className="font-bold text-nb-ink">{store.storeName}</p>
                      </div>
                      <span
                        className={`inline-flex items-center justify-center w-11 h-11 border-[2.5px] border-nb-ink font-nbSerif text-xl font-black ${getGradeChipClass(store.overallGrade)}`}
                      >
                        {store.overallGrade}
                      </span>
                    </div>
                    <p className="mt-2 font-nbMono text-xs font-bold text-nb-ink/60">
                      巡店 {store.inspections} 次 · 平均分數 {store.averageScore.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* 目前表現較穩的分類 */}
            <section className="nb-card p-6">
              <div className="pb-4 border-b-[3px] border-nb-ink">
                <p className="nb-eyebrow">Strongest Categories · 強項分類</p>
                <h2 className="mt-1 font-nbSerif text-2xl font-black">目前表現較穩的分類</h2>
              </div>
              <div className="mt-5 grid gap-3">
                {strongestCategories.map((category) => (
                  <div
                    key={category.categoryName}
                    className="border-[2.5px] border-nb-ink bg-nb-paper px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold text-nb-ink">{category.categoryName}</p>
                      <span
                        className={`inline-flex items-center justify-center w-11 h-11 border-[2.5px] border-nb-ink font-nbSerif text-xl font-black ${getGradeChipClass(category.grade)}`}
                      >
                        {category.grade}
                      </span>
                    </div>
                    <p className="mt-2 font-nbMono text-xs font-bold text-nb-ink/60">
                      平均分數 {category.averageScore.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* 常用入口 */}
            <section className="nb-card p-6">
              <p className="nb-eyebrow">Quick Actions · 快速入口</p>
              <h2 className="mt-1 font-nbSerif text-2xl font-black">常用入口</h2>
              <div className="mt-5 flex flex-wrap gap-3">
                {quickLinks.map((link) => (
                  <Link key={link.label} href={link.href} className="nb-btn-yellow text-sm">
                    {link.label} →
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
