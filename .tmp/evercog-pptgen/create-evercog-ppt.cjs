const pptxgen = require('pptxgenjs');
const path = require('path');

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'Office Raccoon';
pptx.company = 'Evercog';
pptx.subject = '恒识 Evercog 比赛路演材料';
pptx.title = '恒识 Evercog 比赛路演稿';
pptx.lang = 'zh-CN';
pptx.theme = {
  headFontFace: 'Microsoft YaHei',
  bodyFontFace: 'Microsoft YaHei',
  lang: 'zh-CN'
};
pptx.defineLayout({ name: 'LAYOUT_WIDE', width: 13.333, height: 7.5 });
pptx.layout = 'LAYOUT_WIDE';

const C = {
  bg: '081426',
  bg2: '0D2038',
  card: '102A49',
  card2: '173B62',
  text: 'F1F7FF',
  muted: 'AFC3DA',
  cyan: '34D3FF',
  green: '2EE59D',
  yellow: 'FFD166',
  red: 'FF6B6B',
  white: 'FFFFFF'
};

function addBg(slide) {
  slide.background = { color: C.bg };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.bg }, line: { color: C.bg } });
  slide.addShape(pptx.ShapeType.arc, { x: 9.5, y: -1.8, w: 5.2, h: 5.2, rotate: 35, line: { color: C.cyan, transparency: 70, width: 2 } });
  slide.addShape(pptx.ShapeType.arc, { x: -1.2, y: 5.5, w: 4.2, h: 4.2, rotate: 15, line: { color: C.green, transparency: 76, width: 2 } });
}
function title(slide, t, st) {
  slide.addText(t, { x: 0.55, y: 0.35, w: 9.4, h: 0.48, fontFace: 'Microsoft YaHei', fontSize: 22, bold: true, color: C.text, margin: 0 });
  if (st) slide.addText(st, { x: 0.57, y: 0.88, w: 9.6, h: 0.28, fontSize: 8.5, color: C.muted, margin: 0 });
  slide.addShape(pptx.ShapeType.line, { x: 0.55, y: 1.16, w: 12.2, h: 0, line: { color: C.card2, width: 1 } });
}
function foot(slide, n) {
  slide.addText('Evercog Competition Pitch', { x: 0.55, y: 7.12, w: 3, h: 0.18, fontSize: 6.5, color: '6F8BAA', margin: 0 });
  slide.addText(String(n).padStart(2, '0'), { x: 12.25, y: 7.06, w: 0.5, h: 0.22, fontSize: 8, bold: true, color: C.cyan, margin: 0, align: 'right' });
}
function card(slide, x, y, w, h, head, body, accent=C.cyan) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.08, fill: { color: C.card }, line: { color: C.card2, transparency: 15, width: 1 } });
  slide.addShape(pptx.ShapeType.rect, { x, y, w: 0.06, h, fill: { color: accent }, line: { color: accent } });
  slide.addText(head, { x: x+0.18, y: y+0.18, w: w-0.35, h: 0.35, fontSize: 13, bold: true, color: C.text, margin: 0 });
  slide.addText(body, { x: x+0.18, y: y+0.66, w: w-0.35, h: h-0.82, fontSize: 9.5, color: C.muted, breakLine: false, fit: 'shrink', valign: 'mid', margin: 0.02, bullet: body.includes('\n') ? { type: 'ul' } : undefined });
}
function bullets(slide, arr, x, y, w, h, color=C.text) {
  slide.addText(arr.map(s => ({ text: s, options: { bullet: { type: 'ul' }, hanging: 4 } })), { x, y, w, h, fontSize: 12, color, breakLine: true, fit: 'shrink', margin: 0.04, paraSpaceAfterPt: 8 });
}

let s = pptx.addSlide(); addBg(s);
s.addText('恒识 Evercog', { x: 0.7, y: 0.72, w: 6, h: 0.6, fontSize: 32, bold: true, color: C.text, margin: 0 });
s.addText('中小微企服公司的 AI 知识操作系统', { x: 0.72, y: 1.42, w: 8.2, h: 0.36, fontSize: 16, color: C.cyan, margin: 0 });
s.addText('外部政策自动跟踪 · 内部经验即时问答 · 新人能力持续训练', { x: 0.72, y: 2.02, w: 8.8, h: 0.32, fontSize: 12.5, color: C.muted, margin: 0 });
card(s, 0.72, 3.08, 3.75, 1.45, '一句话定位', '面向财税、法务、人服等企业服务机构，把分散政策、客户案例和员工经验沉淀为可追溯、可复用、可训练的企业智能。', C.green);
card(s, 4.75, 3.08, 3.75, 1.45, '核心价值', '更快响应客户咨询，降低政策漏判风险，把资深顾问经验转成组织能力。', C.cyan);
card(s, 8.78, 3.08, 3.75, 1.45, '比赛表达', '不是单点问答机器人，而是企业知识从获取、理解、执行到训练的闭环。', C.yellow);
foot(s,1);

s = pptx.addSlide(); addBg(s); title(s, '01 痛点：企服知识正在“碎片化失控”', '政策变得更快，客户问得更细，新人上手更慢');
card(s, 0.7, 1.55, 3.75, 3.95, '政策信息分散', '政策散落在各网站、公众号、通知文件中；人工筛选慢，容易漏掉关键变化。', C.red);
card(s, 4.8, 1.55, 3.75, 3.95, '经验依赖个人', '客户案例、口径和判断依据沉淀在资深员工脑中；新人反复问，老人反复答。', C.yellow);
card(s, 8.9, 1.55, 3.75, 3.95, '培训难以闭环', 'SOP 文档常常过期，训练无法量化；团队能力复制依靠师徒制和运气。', C.cyan);
foot(s,2);

s = pptx.addSlide(); addBg(s); title(s, '02 方案：AI 政策情报与业务经验中台', '把外部政策与内部知识变成可追溯、可执行、可训练的闭环');
card(s, 0.7, 1.42, 3.0, 1.4, '政策情报', '聚合政策源\n提取变化点\n匹配客户场景', C.cyan);
card(s, 3.95, 1.42, 3.0, 1.4, '企业知识问答', '基于知识库回答\n保留来源依据\n统一业务口径', C.green);
card(s, 7.2, 1.42, 3.0, 1.4, 'Agent 工作台', '任务拆解\n多步骤推理\n输出行动建议', C.yellow);
card(s, 10.45, 1.42, 2.2, 1.4, 'SOP 训练', '沉淀流程\n训练新人\n评估掌握度', C.red);
s.addShape(pptx.ShapeType.chevron, { x: 1.55, y: 3.55, w: 10.25, h: 1.0, fill: { color: C.card2 }, line: { color: C.cyan, transparency: 45 } });
s.addText('政策输入 → 知识理解 → 业务执行 → SOP 训练 → 经验反哺', { x: 1.8, y: 3.86, w: 9.65, h: 0.3, fontSize: 17, bold: true, color: C.text, align: 'center', margin: 0 });
s.addText('恒识把“信息”转成“组织能力”，让每一次政策变化都能形成可复用的业务资产。', { x: 1.3, y: 5.1, w: 10.7, h: 0.44, fontSize: 15, color: C.muted, align: 'center', margin: 0 });
foot(s,3);

s = pptx.addSlide(); addBg(s); title(s, '03 产品结构：四个页面支撑完整 Demo', '建议现场按“发现政策—问答解释—Agent 执行—SOP 训练”演示');
card(s, 0.7, 1.35, 5.75, 1.1, '/policy-intelligence', '老板视角：看到政策机会、风险提示与业务影响。', C.cyan);
card(s, 6.85, 1.35, 5.75, 1.1, '/employee-qa', '员工视角：基于企业知识库提问，快速获得有依据的答案。', C.green);
card(s, 0.7, 3.0, 5.75, 1.1, '/agent-workspace', '顾问视角：把客户问题拆解为任务链，输出建议和材料。', C.yellow);
card(s, 6.85, 3.0, 5.75, 1.1, '/sop', '导师视角：把高频经验沉淀为训练任务，持续提升新人能力。', C.red);
s.addText('推荐演示问题：某地发布新的小微企业补贴政策，我们如何判断客户是否适用，并让新人学会标准答复？', { x: 1.05, y: 5.25, w: 11.3, h: 0.5, fontSize: 15, bold: true, color: C.text, align: 'center', margin: 0.04 });
foot(s,4);

s = pptx.addSlide(); addBg(s); title(s, '04 Demo 剧本：3 分钟讲清价值闭环', '主持人话术可以直接照读，也可按现场节奏压缩');
const steps = [
  ['0:00-0:25', '开场痛点', '政策变化来了，客户马上会问；团队却还在人工找文件、问资深同事。'],
  ['0:25-1:05', '政策情报', '进入政策情报页，展示政策摘要、影响对象、风险/机会标签。'],
  ['1:05-1:45', '员工问答', '切到员工问答页，询问客户是否适用，强调答案有来源、口径统一。'],
  ['1:45-2:25', 'Agent 工作台', '把客户问题转成待办：核验条件、生成材料清单、输出沟通话术。'],
  ['2:25-3:00', 'SOP 训练', '进入 SOP 页，把本次案例沉淀为新人训练，形成经验闭环。']
];
steps.forEach((r,i)=>{ card(s, 0.75+(i%2)*6.15, 1.32+Math.floor(i/2)*1.55, 5.72, 1.06, `${r[0]}  ${r[1]}`, r[2], [C.cyan,C.green,C.yellow,C.red,C.cyan][i]); });
foot(s,5);

s = pptx.addSlide(); addBg(s); title(s, '05 差异化：不是“能聊天”，而是“能沉淀”', '比赛评审更关心可落地、可持续和可复制');
card(s, 0.7, 1.45, 3.75, 3.6, '传统 Chatbot', '回答依赖提示词\n缺少企业语境\n难以追踪依据\n无法沉淀训练资产', C.red);
card(s, 4.8, 1.45, 3.75, 3.6, '通用知识库', '能检索文档\n但弱业务流程\n缺少政策更新机制\n难以闭环到员工能力', C.yellow);
card(s, 8.9, 1.45, 3.75, 3.6, '恒识 Evercog', '政策情报 + 企业问答 + Agent 执行 + SOP 训练\n让知识持续流动、复用和评估', C.green);
foot(s,6);

s = pptx.addSlide(); addBg(s); title(s, '06 商业价值：从效率工具到组织能力基础设施', '优先服务政策敏感、知识密集、人员流动较高的企服机构');
card(s, 0.7, 1.35, 3.75, 1.65, '目标客户', '财税服务、法务咨询、人力资源服务、产业园区招商与企业服务团队。', C.cyan);
card(s, 4.8, 1.35, 3.75, 1.65, '付费理由', '降低政策漏判风险、缩短新人培养周期、提升客户咨询响应速度。', C.green);
card(s, 8.9, 1.35, 3.75, 1.65, '扩展路径', '从单团队知识库切入，逐步扩展到政策监控、客户画像、流程自动化。', C.yellow);
bullets(s, ['MVP 阶段：验证核心场景与演示闭环', '试点阶段：接入真实政策源和企业知识文档', '商业化阶段：按席位 + 知识库容量 + 政策源订阅收费'], 1.1, 4.1, 10.8, 1.35, C.text);
foot(s,7);

s = pptx.addSlide(); addBg(s); title(s, '07 结尾：让每一次经验都成为企业资产', '路演收束页');
s.addText('恒识 Evercog 让中小微企服公司拥有自己的 AI 知识操作系统。', { x: 1.0, y: 1.55, w: 11.3, h: 0.6, fontSize: 24, bold: true, color: C.text, align: 'center', margin: 0 });
s.addText('政策不再只是信息，经验不再只属于个人，新人不再只能靠问人。', { x: 1.4, y: 2.48, w: 10.6, h: 0.36, fontSize: 16, color: C.cyan, align: 'center', margin: 0 });
card(s, 1.15, 3.75, 3.35, 1.25, '外部变化', '自动捕捉政策与机会', C.cyan);
card(s, 4.95, 3.75, 3.35, 1.25, '内部执行', '统一知识和行动口径', C.green);
card(s, 8.75, 3.75, 3.35, 1.25, '能力复制', '把经验训练成团队能力', C.yellow);
s.addText('谢谢', { x: 5.9, y: 6.35, w: 1.5, h: 0.36, fontSize: 18, bold: true, color: C.text, align: 'center', margin: 0 });
foot(s,8);

pptx.writeFile({ fileName: path.resolve(__dirname, '../../output/evercog-competition-pitch.pptx') });
