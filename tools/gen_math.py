#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json, os, sys
sys.stdout.reconfigure(encoding='utf-8')

BASE = 'C:/SAPDevelop/SAPLearning/kids-memory/data/builtin/math'

def save(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f'OK {len(data.get("cards",[]))} -> {os.path.basename(path)}')

# ===== 一二年级数学 =====
math12 = {"meta":{"subject":"math","grade":"primary1","name":"小学一二年级数学","version":"2024","count":0},"cards":[
    {"id":"m12_001","type":"concept","front":"什么是自然数？","back":"0和正整数统称自然数：0,1,2,3,4,5…","phonetic":"","hint":"包含0的正整数","example":"0、1、2、3都是自然数","tags":["概念","一年级"]},
    {"id":"m12_002","type":"concept","front":"什么是奇数？","back":"不能被2整除的整数：1,3,5,7,9…","phonetic":"","hint":"个位是1,3,5,7,9的数","example":"1,3,5,7,9,11,13是奇数","tags":["概念","一年级"]},
    {"id":"m12_003","type":"concept","front":"什么是偶数？","back":"能被2整除的整数：0,2,4,6,8…","phonetic":"","hint":"个位是0,2,4,6,8的数","example":"0,2,4,6,8,10,12是偶数","tags":["概念","一年级"]},
    {"id":"m12_004","type":"formula","front":"加法交换律","back":"a + b = b + a\n两数相加，交换加数位置，和不变","phonetic":"","hint":"换个位置结果一样","example":"3 + 5 = 5 + 3 = 8","tags":["运算律","一年级"]},
    {"id":"m12_005","type":"formula","front":"加法结合律","back":"(a + b) + c = a + (b + c)\n三数相加，先加哪两个结果不变","phonetic":"","hint":"先加哪两个都一样","example":"(2+3)+4 = 2+(3+4) = 9","tags":["运算律","一年级"]},
    {"id":"m12_006","type":"concept","front":"10以内数的组成","back":"任意两个数相加得10以内的数\n如：1和9，2和8，3和7，4和6，5和5","phonetic":"","hint":"凑十法的基础","example":"3+7=10，4+6=10","tags":["概念","一年级"]},
    {"id":"m12_007","type":"formula","front":"100以内加减法","back":"整十数加减整十数：直接算十位\n个位数加减个位数：直接算个位","phonetic":"","hint":"分开计算十位和个位","example":"30+50=80，47+5=52","tags":["计算","一年级"]},
    {"id":"m12_008","type":"concept","front":"比较大小","back":"比较两个数的大小用 > < =\n从高位到低位比较","phonetic":"","hint":"大于>，小于<，等于=","example":"35 > 28，47 < 74","tags":["概念","一年级"]},
    {"id":"m12_009","type":"concept","front":"数的顺序","back":"数轴上，从左到右数越来越大\n前一个数比后一个数小1","phonetic":"","hint":"数轴从左到右增大","example":"5的前一个是4，后一个是6","tags":["概念","一年级"]},
    {"id":"m12_010","type":"concept","front":"长度单位：厘米和米","back":"1米=100厘米（1m=100cm）\n厘米用来量短的物体，米用来量长的","phonetic":"","hint":"1米=100厘米","example":"课桌高约70厘米，教室长约8米","tags":["单位","一年级"]},
    {"id":"m12_011","type":"concept","front":"认识图形：三角形","back":"有3条边、3个角的图形\n三边之和大于任意一边的两倍","phonetic":"","hint":"三条边三个角","example":"等边三角形三边相等","tags":["图形","一年级"]},
    {"id":"m12_012","type":"concept","front":"认识图形：长方形","back":"有4条边、4个直角\n对边相等，两组平行线","phonetic":"","hint":"四个直角，对边相等","example":"书本、课桌面是长方形","tags":["图形","一年级"]},
    {"id":"m12_013","type":"concept","front":"认识图形：正方形","back":"有4条边、4个直角\n4条边相等，是特殊的长方形","phonetic":"","hint":"四边相等，四个直角","example":"魔方的每个面是正方形","tags":["图形","一年级"]},
    {"id":"m12_014","type":"concept","front":"认识图形：圆形","back":"所有点到圆心的距离相等\n没有角，只有一条曲线","phonetic":"","hint":"没有角，圆滑的形状","example":"硬币、车轮是圆形","tags":["图形","一年级"]},
    {"id":"m12_015","type":"formula","front":"乘法口诀：2的倍数","back":"2×1=2  2×2=4  2×3=6\n2×4=8  2×5=10  2×6=12\n2×7=14 2×8=16  2×9=18","phonetic":"","hint":"结果都是偶数","example":"2×6=12，2×9=18","tags":["乘法","二年级"]},
    {"id":"m12_016","type":"formula","front":"乘法口诀：3的倍数","back":"3×1=3  3×2=6  3×3=9\n3×4=12 3×5=15 3×6=18\n3×7=21 3×8=24 3×9=27","phonetic":"","hint":"各位数字之和是3的倍数","example":"3×7=21，3×8=24","tags":["乘法","二年级"]},
    {"id":"m12_017","type":"formula","front":"乘法口诀：5的倍数","back":"5×1=5  5×2=10 5×3=15\n5×4=20 5×5=25 5×6=30\n5×7=35 5×8=40 5×9=45","phonetic":"","hint":"结果个位是0或5","example":"5×6=30，5×8=40","tags":["乘法","二年级"]},
    {"id":"m12_018","type":"formula","front":"乘法交换律","back":"a × b = b × a\n两数相乘，交换因数位置，积不变","phonetic":"","hint":"换个位置结果一样","example":"3 × 4 = 4 × 3 = 12","tags":["运算律","二年级"]},
    {"id":"m12_019","type":"formula","front":"乘法结合律","back":"(a × b) × c = a × (b × c)","phonetic":"","hint":"先乘哪两个都一样","example":"(2×3)×4 = 2×(3×4) = 24","tags":["运算律","二年级"]},
    {"id":"m12_020","type":"concept","front":"除法的含义","back":"把一个数平均分成几份，每份是多少\n或一个数里包含几个另一个数","phonetic":"","hint":"平均分","example":"12÷3=4，即12平均分成3份，每份4","tags":["概念","二年级"]},
    {"id":"m12_021","type":"concept","front":"时、分、秒","back":"1小时=60分钟\n1分钟=60秒\n钟表：时针、分针、秒针","phonetic":"","hint":"时=60分，分=60秒","example":"2小时=120分钟，3分=180秒","tags":["单位","二年级"]},
    {"id":"m12_022","type":"concept","front":"人民币单位","back":"1元=10角=100分\n1角=10分\n纸币和硬币","phonetic":"","hint":"1元=10角=100分","example":"5角+5角=1元","tags":["单位","二年级"]},
    {"id":"m12_023","type":"concept","front":"认识方向","back":"上下左右，东南西北\n面向北：右手东，左手西，背面南","phonetic":"","hint":"上北下南左西右东","example":"太阳从东方升起，在西方落下","tags":["概念","二年级"]},
    {"id":"m12_024","type":"concept","front":"统计与图表","back":"条形图：用长方形表示数量\n统计表：用表格记录数据","phonetic":"","hint":"条形图直观比较大小","example":"用条形图比较各班人数","tags":["统计","二年级"]},
    {"id":"m12_025","type":"formula","front":"乘法口诀：9的倍数","back":"9×1=9  9×2=18 9×3=27\n9×4=36 9×5=45 9×6=54\n9×7=63 9×8=72 9×9=81","phonetic":"","hint":"十位加个位=9或18","example":"9×6=54，9×9=81","tags":["乘法","二年级"]},
]}
math12['meta']['count'] = len(math12['cards'])
save(f'{BASE}/primary/grade1_2_math.json', math12)

# ===== 三四年级数学 =====
math34 = {"meta":{"subject":"math","grade":"primary3","name":"小学三四年级数学","version":"2024","count":0},"cards":[
    {"id":"m34_001","type":"formula","front":"加减法的验算","back":"加法验算：和-加数=另一个加数\n减法验算：差+减数=被减数","phonetic":"","hint":"加减互为逆运算","example":"35+47=82，验算：82-47=35","tags":["计算","三年级"]},
    {"id":"m34_002","type":"formula","front":"多位数乘一位数","back":"从个位开始，依次乘每一位\n满十进一，进位加到前一位","phonetic":"","hint":"从个位开始乘，满10进位","example":"234×3：4×3=12写2进1，3×3+1=10写0进1，2×3+1=7，结果702","tags":["计算","三年级"]},
    {"id":"m34_003","type":"formula","front":"周长公式：长方形","back":"C = 2×(长+宽)\nC = 2l + 2w","phonetic":"","hint":"周长=2×(长+宽)","example":"长5cm宽3cm的长方形，周长=2×(5+3)=16cm","tags":["图形","三年级"]},
    {"id":"m34_004","type":"formula","front":"周长公式：正方形","back":"C = 4×边长\nC = 4a","phonetic":"","hint":"周长=4×边长","example":"边长6cm的正方形，周长=4×6=24cm","tags":["图形","三年级"]},
    {"id":"m34_005","type":"concept","front":"分数的意义","back":"把一个整体平均分成几份，取其中一份\n分子/分母：分子<分母时为真分数","phonetic":"","hint":"把整体平均分","example":"把一块饼分成4份，1份就是1/4","tags":["分数","三年级"]},
    {"id":"m34_006","type":"formula","front":"同分母分数加减","back":"分母不变，分子相加减\na/c + b/c = (a+b)/c","phonetic":"","hint":"分母不变，分子直接算","example":"2/7 + 3/7 = 5/7，5/8 - 2/8 = 3/8","tags":["分数","三年级"]},
    {"id":"m34_007","type":"concept","front":"平行线","back":"在同一平面内，不相交的两条直线叫平行线\n用符号∥表示","phonetic":"","hint":"永不相交的两条线","example":"铁轨两根钢轨互相平行","tags":["图形","三年级"]},
    {"id":"m34_008","type":"concept","front":"垂直线","back":"两条直线相交成直角，叫互相垂直\n用符号⊥表示","phonetic":"","hint":"相交成90度","example":"长方形相邻两边互相垂直","tags":["图形","三年级"]},
    {"id":"m34_009","type":"formula","front":"乘法分配律","back":"(a + b) × c = a×c + b×c\n也可以反用：a×c + b×c = (a+b)×c","phonetic":"","hint":"括号外乘数分别与括号内各数相乘","example":"(3+4)×5 = 3×5 + 4×5 = 35","tags":["运算律","三年级"]},
    {"id":"m34_010","type":"formula","front":"四则运算顺序","back":"先乘除，后加减\n有括号先算括号内\n同级运算从左到右","phonetic":"","hint":"先括号，再乘除，再加减","example":"12+4×3-6 = 12+12-6 = 18","tags":["计算","三年级"]},
    {"id":"m34_011","type":"formula","front":"面积公式：长方形","back":"S = 长 × 宽\nS = l × w","phonetic":"","hint":"长乘宽","example":"长6m宽4m的长方形，面积=6×4=24m²","tags":["图形","四年级"]},
    {"id":"m34_012","type":"formula","front":"面积公式：正方形","back":"S = 边长 × 边长\nS = a²","phonetic":"","hint":"边长的平方","example":"边长5cm的正方形，面积=5×5=25cm²","tags":["图形","四年级"]},
    {"id":"m34_013","type":"formula","front":"面积公式：三角形","back":"S = 底 × 高 ÷ 2\nS = ½ × b × h","phonetic":"","hint":"底乘高除以2","example":"底8cm高6cm的三角形，面积=8×6÷2=24cm²","tags":["图形","四年级"]},
    {"id":"m34_014","type":"formula","front":"面积公式：平行四边形","back":"S = 底 × 高\nS = b × h","phonetic":"","hint":"底乘高（不是斜边）","example":"底10cm高5cm，面积=10×5=50cm²","tags":["图形","四年级"]},
    {"id":"m34_015","type":"concept","front":"角的分类","back":"锐角：0°<α<90°\n直角：α=90°\n钝角：90°<α<180°\n平角：α=180°","phonetic":"","hint":"直角=90°为分界","example":"三角板上有一个直角两个锐角","tags":["图形","四年级"]},
    {"id":"m34_016","type":"formula","front":"三角形内角和","back":"三角形三个内角之和等于180°\n∠A + ∠B + ∠C = 180°","phonetic":"","hint":"三角形内角和=180°","example":"若两角分别是60°和80°，第三角=180°-60°-80°=40°","tags":["图形","四年级"]},
    {"id":"m34_017","type":"concept","front":"小数的意义","back":"用来表示比1小的数，小数点后一位是十分位，两位是百分位","phonetic":"","hint":"小数点分开整数和小数部分","example":"0.5表示5个0.1，即十分之五","tags":["小数","四年级"]},
    {"id":"m34_018","type":"formula","front":"小数加减法","back":"小数点对齐，再按整数方法计算\n结果中小数点要对齐","phonetic":"","hint":"小数点对齐是关键","example":"3.45 + 2.3 = 5.75（注意进位）","tags":["小数","四年级"]},
    {"id":"m34_019","type":"concept","front":"因数和倍数","back":"若a×b=c，则a和b是c的因数，c是a、b的倍数\n一个数的因数有限，倍数无限","phonetic":"","hint":"因数有限，倍数无限","example":"3×4=12，3和4是12的因数，12是3的倍数","tags":["概念","四年级"]},
    {"id":"m34_020","type":"concept","front":"质数和合数","back":"质数：只有1和本身两个因数（如2,3,5,7,11）\n合数：有两个以上因数（如4,6,9,12）\n1既不是质数也不是合数","phonetic":"","hint":"2是最小的质数","example":"2,3,5,7,11,13,17,19是质数","tags":["概念","四年级"]},
    {"id":"m34_021","type":"formula","front":"最大公因数（GCD）","back":"两数共同因数中最大的那个\n短除法：用公因数不断除两数","phonetic":"","hint":"共同因数最大的","example":"12和18的公因数有1,2,3,6，最大公因数是6","tags":["计算","四年级"]},
    {"id":"m34_022","type":"formula","front":"最小公倍数（LCM）","back":"两数公共倍数中最小的那个\nLCM(a,b) = a×b ÷ GCD(a,b)","phonetic":"","hint":"公倍数最小的","example":"4和6的最小公倍数是12","tags":["计算","四年级"]},
    {"id":"m34_023","type":"concept","front":"通分","back":"把异分母分数化成分母相同的分数\n以两分母的最小公倍数为公分母","phonetic":"","hint":"分母变相同，分子跟着变","example":"1/2和1/3通分：1/2=3/6，1/3=2/6","tags":["分数","四年级"]},
    {"id":"m34_024","type":"formula","front":"分数比较大小","back":"同分母：分子大的分数大\n异分母：通分后再比较","phonetic":"","hint":"通分后比分子","example":"2/3和3/4：通分为8/12和9/12，所以3/4>2/3","tags":["分数","四年级"]},
    {"id":"m34_025","type":"concept","front":"重量单位换算","back":"1千克=1000克\n1吨=1000千克\n克(g)→千克(kg)→吨(t)","phonetic":"","hint":"每级相差1000","example":"3.5kg=3500g，2000kg=2t","tags":["单位","四年级"]},
]}
math34['meta']['count'] = len(math34['cards'])
save(f'{BASE}/primary/grade3_4_math.json', math34)

# ===== 五六年级数学 =====
math56 = {"meta":{"subject":"math","grade":"primary5","name":"小学五六年级数学","version":"2024","count":0},"cards":[
    {"id":"m56_001","type":"formula","front":"分数乘法","back":"分子×分子，分母×分母\na/b × c/d = (a×c)/(b×d)\n能约分先约分","phonetic":"","hint":"分子乘分子，分母乘分母","example":"2/3 × 3/4 = 6/12 = 1/2","tags":["分数","五年级"]},
    {"id":"m56_002","type":"formula","front":"分数除法","back":"除以一个分数等于乘以它的倒数\na/b ÷ c/d = a/b × d/c","phonetic":"","hint":"除以某数等于乘以它的倒数","example":"2/3 ÷ 4/5 = 2/3 × 5/4 = 10/12 = 5/6","tags":["分数","五年级"]},
    {"id":"m56_003","type":"formula","front":"体积公式：长方体","back":"V = 长 × 宽 × 高\nV = l × w × h","phonetic":"","hint":"三维的长乘宽乘高","example":"长4cm宽3cm高2cm的长方体，V=4×3×2=24cm³","tags":["图形","五年级"]},
    {"id":"m56_004","type":"formula","front":"体积公式：正方体","back":"V = 棱长³\nV = a³","phonetic":"","hint":"棱长的三次方","example":"棱长5cm的正方体，V=5³=125cm³","tags":["图形","五年级"]},
    {"id":"m56_005","type":"formula","front":"表面积：长方体","back":"S = 2×(长×宽 + 长×高 + 宽×高)\nS = 2(lw + lh + wh)","phonetic":"","hint":"三对面积各乘2之和","example":"长3高2宽4：S=2×(3×4+3×2+4×2)=52cm²","tags":["图形","五年级"]},
    {"id":"m56_006","type":"formula","front":"百分数转小数","back":"去掉百分号，除以100\n25% = 0.25，100% = 1","phonetic":"","hint":"去掉%，小数点左移两位","example":"36% = 0.36，150% = 1.5","tags":["百分数","五年级"]},
    {"id":"m56_007","type":"formula","front":"小数转百分数","back":"乘以100，加百分号\n0.75 = 75%，1.2 = 120%","phonetic":"","hint":"乘以100，加%","example":"0.8 = 80%，0.05 = 5%","tags":["百分数","五年级"]},
    {"id":"m56_008","type":"formula","front":"求百分之几","back":"部分 ÷ 总数 × 100%","phonetic":"","hint":"部分除以整体乘100%","example":"班级40人，女生16人，女生占16÷40×100%=40%","tags":["百分数","五年级"]},
    {"id":"m56_009","type":"formula","front":"圆的周长","back":"C = 2πr = πd\nπ ≈ 3.14\nr为半径，d为直径","phonetic":"","hint":"C=2πr或πd","example":"半径5cm的圆，周长=2×3.14×5=31.4cm","tags":["图形","五年级"]},
    {"id":"m56_010","type":"formula","front":"圆的面积","back":"S = πr²\nr为半径，π ≈ 3.14","phonetic":"","hint":"S=πr²","example":"半径6cm的圆，面积=3.14×6²=113.04cm²","tags":["图形","五年级"]},
    {"id":"m56_011","type":"formula","front":"直径与半径关系","back":"d = 2r\nr = d/2\n直径是半径的2倍","phonetic":"","hint":"直径=2×半径","example":"直径10cm，半径=5cm","tags":["图形","五年级"]},
    {"id":"m56_012","type":"concept","front":"比和比例","back":"比：a:b = a÷b\n比例：a:b = c:d，即 a/b = c/d\n内项乘积=外项乘积","phonetic":"","hint":"比就是除法，比例是两个比相等","example":"2:3 = 4:6（2×6=3×4=12）","tags":["比和比例","六年级"]},
    {"id":"m56_013","type":"formula","front":"比例的基本性质","back":"若 a:b = c:d\n则内项之积 = 外项之积\nb×c = a×d","phonetic":"","hint":"交叉相乘相等","example":"2:3 = 6:9，3×6=2×9=18","tags":["比和比例","六年级"]},
    {"id":"m56_014","type":"concept","front":"正比例关系","back":"y/x = k（k为常数）\n两量同增同减，比值不变","phonetic":"","hint":"y=kx，图像是直线","example":"速度一定时，时间和路程成正比例","tags":["比和比例","六年级"]},
    {"id":"m56_015","type":"concept","front":"反比例关系","back":"x×y = k（k为常数）\n一量增大，另一量减小","phonetic":"","hint":"xy=k，积不变","example":"路程一定时，速度和时间成反比例","tags":["比和比例","六年级"]},
    {"id":"m56_016","type":"formula","front":"体积公式：圆柱","back":"V = πr²h\nS侧 = 2πrh\nS底 = πr²\nS全 = 2πr(r+h)","phonetic":"","hint":"V=底面积×高","example":"底面半径3cm，高10cm：V=3.14×9×10=282.6cm³","tags":["图形","六年级"]},
    {"id":"m56_017","type":"formula","front":"体积公式：圆锥","back":"V = (1/3)πr²h\n圆锥体积是等底等高圆柱的1/3","phonetic":"","hint":"V=三分之一底面积乘高","example":"底面半径3，高6：V=1/3×3.14×9×6=56.52","tags":["图形","六年级"]},
    {"id":"m56_018","type":"concept","front":"负数","back":"比0小的数叫负数，用负号表示\n如：-1,-2,-3\n正数>0>负数，-3 < -1 < 0 < 1 < 3","phonetic":"","hint":"0以下的数","example":"冬天气温-5摄氏度表示零下5度","tags":["概念","六年级"]},
    {"id":"m56_019","type":"concept","front":"统计：平均数","back":"平均数 = 总和 ÷ 个数\n反映数据的集中趋势","phonetic":"","hint":"总和除以个数","example":"5个同学成绩：90+85+88+92+95=450，平均=450÷5=90","tags":["统计","六年级"]},
    {"id":"m56_020","type":"concept","front":"统计：中位数","back":"把数据从小到大排列，中间那个数\n数据个数为偶数时，取中间两数的平均值","phonetic":"","hint":"排好序取中间","example":"1,3,5,7,9的中位数是5","tags":["统计","六年级"]},
    {"id":"m56_021","type":"formula","front":"速度·时间·路程","back":"路程 = 速度 × 时间\n速度 = 路程 ÷ 时间\n时间 = 路程 ÷ 速度","phonetic":"","hint":"S=vt，v=S/t，t=S/v","example":"速度60km/h，时间2h：路程=60×2=120km","tags":["应用题","五年级"]},
    {"id":"m56_022","type":"formula","front":"工作·效率·时间","back":"工作量 = 工效 × 时间\n工效 = 工作量 ÷ 时间\n时间 = 工作量 ÷ 工效","phonetic":"","hint":"工作量=工效×时间","example":"一天完成工程的1/5，5天完成全部","tags":["应用题","五年级"]},
    {"id":"m56_023","type":"formula","front":"折扣计算","back":"折扣数 = 原价 × 折扣率\n九折 = 90%，八折 = 80%","phonetic":"","hint":"几折就是百分之几十","example":"原价100元，八折=100×80%=80元","tags":["百分数","六年级"]},
    {"id":"m56_024","type":"formula","front":"利润计算","back":"利润 = 售价 - 成本\n利润率 = 利润 ÷ 成本 × 100%","phonetic":"","hint":"赚了多少除以原来多少","example":"成本80元，售价100元：利润率=(100-80)÷80×100%=25%","tags":["百分数","六年级"]},
    {"id":"m56_025","type":"concept","front":"简单方程","back":"含有未知数的等式叫方程\n解方程：根据等式性质，求未知数的值","phonetic":"","hint":"含x的等式，求x","example":"x + 5 = 12，x = 12-5 = 7","tags":["方程","六年级"]},
]}
math56['meta']['count'] = len(math56['cards'])
save(f'{BASE}/primary/grade5_6_math.json', math56)

# ===== 初中代数（扩充）=====
algebra = {"meta":{"subject":"math","grade":"middle","name":"初中代数公式","version":"2024","count":0},"cards":[
    {"id":"alg_001","type":"formula","front":"整式加减","back":"合并同类项：系数相加，字母部分不变\n3x + 5x = 8x，2a - 7a = -5a","phonetic":"","hint":"字母相同的项才能合并","example":"3x+2y-x+4y = 2x+6y","tags":["整式","七年级"]},
    {"id":"alg_002","type":"formula","front":"乘法公式：平方差","back":"a² - b² = (a+b)(a-b)","phonetic":"","hint":"两个数的平方差等于它们的和乘以差","example":"x²-4 = (x+2)(x-2)，25-9 = (5+3)(5-3)=16","tags":["因式分解","八年级"]},
    {"id":"alg_003","type":"formula","front":"乘法公式：完全平方和","back":"(a+b)² = a² + 2ab + b²","phonetic":"","hint":"和的平方=两数平方和加两倍乘积","example":"(x+3)² = x²+6x+9","tags":["因式分解","八年级"]},
    {"id":"alg_004","type":"formula","front":"乘法公式：完全平方差","back":"(a-b)² = a² - 2ab + b²","phonetic":"","hint":"差的平方=两数平方和减两倍乘积","example":"(x-2)² = x²-4x+4","tags":["因式分解","八年级"]},
    {"id":"alg_005","type":"formula","front":"解一元一次方程","back":"目标：把x单独放在等号一边\n移项变号，合并同类项，系数化为1","phonetic":"","hint":"移项变号，系数变1","example":"2x+3=7，2x=4，x=2","tags":["方程","七年级"]},
    {"id":"alg_006","type":"formula","front":"解一元二次方程：公式法","back":"ax²+bx+c=0（a≠0）\nx = (-b ± √(b²-4ac)) / 2a","phonetic":"","hint":"万能公式，b方-4ac是判别式","example":"x²-5x+6=0，a=1,b=-5,c=6，x=2或x=3","tags":["方程","九年级"]},
    {"id":"alg_007","type":"concept","front":"一次函数","back":"y = kx + b（k≠0）\nk是斜率，b是y轴截距\nk>0递增，k<0递减","phonetic":"","hint":"y=kx+b，直线图像","example":"y=2x+1，k=2>0，函数递增","tags":["函数","八年级"]},
    {"id":"alg_008","type":"concept","front":"二次函数","back":"y = ax² + bx + c（a≠0）\n图像是抛物线\na>0开口向上，a<0开口向下","phonetic":"","hint":"y=ax²+bx+c，抛物线图像","example":"y=x²，顶点(0,0)，开口向上","tags":["函数","九年级"]},
    {"id":"alg_009","type":"formula","front":"二次函数的顶点坐标","back":"顶点 x = -b/(2a)\n顶点 y = c - b²/(4a)","phonetic":"","hint":"顶点x=-b/2a","example":"y=x²-4x+3，顶点x=4/2=2，y=3-4=−1","tags":["函数","九年级"]},
    {"id":"alg_010","type":"formula","front":"不等式的性质","back":"两边加减同数，不等号不变\n两边乘除正数，不等号不变\n两边乘除负数，不等号改变方向","phonetic":"","hint":"乘除负数，不等号变向","example":"−2x>4，两边除以−2：x<−2（号变向）","tags":["不等式","七年级"]},
    {"id":"alg_011","type":"formula","front":"解一元一次不等式","back":"与解方程类似，注意乘除负数变向\n最终写出解集如 x>3","phonetic":"","hint":"移项变号，除负数变号","example":"3x-1>5，3x>6，x>2","tags":["不等式","七年级"]},
    {"id":"alg_012","type":"concept","front":"科学记数法","back":"将数写成 a × 10ⁿ 的形式\n1 ≤ a < 10，n为整数","phonetic":"","hint":"第一个因数在1到10之间","example":"3.6×10⁴=36000，5.2×10⁻³=0.0052","tags":["概念","七年级"]},
    {"id":"alg_013","type":"formula","front":"整数指数幂运算","back":"aᵐ × aⁿ = aᵐ⁺ⁿ\naᵐ ÷ aⁿ = aᵐ⁻ⁿ（a≠0）\n(aᵐ)ⁿ = aᵐⁿ","phonetic":"","hint":"同底数幂相乘，指数相加","example":"2³×2⁴=2⁷=128","tags":["整式","七年级"]},
    {"id":"alg_014","type":"formula","front":"分式的加减","back":"同分母：分子加减，分母不变\n异分母：通分（找最简公分母），再加减","phonetic":"","hint":"通分再加减","example":"1/x + 2/x = 3/x，1/2 + 1/3 = 5/6","tags":["分式","八年级"]},
    {"id":"alg_015","type":"formula","front":"二元一次方程组（代入法）","back":"用其中一个方程解出一个未知数，代入另一个方程","phonetic":"","hint":"用一个方程解x，代入另一个","example":"x+y=5，x-y=1：由第一个x=5-y，代入得(5-y)-y=1，y=2，x=3","tags":["方程","七年级"]},
    {"id":"alg_016","type":"formula","front":"二元一次方程组（加减法）","back":"把两个方程相加减，消去一个未知数","phonetic":"","hint":"两方程加减消去一个未知数","example":"x+y=5和x-y=1，两式相加：2x=6，x=3，y=2","tags":["方程","七年级"]},
    {"id":"alg_017","type":"concept","front":"反比例函数","back":"y = k/x（k≠0，x≠0）\n图像是双曲线\nk>0时在一三象限，k<0时在二四象限","phonetic":"","hint":"y=k/x，双曲线图像","example":"y=6/x，k=6>0，在一三象限","tags":["函数","八年级"]},
    {"id":"alg_018","type":"formula","front":"完全平方数的规律","back":"1²=1, 2²=4, 3²=9, 4²=16, 5²=25\n6²=36, 7²=49, 8²=64, 9²=81, 10²=100","phonetic":"","hint":"记住1到12的平方数","example":"9²=81，12²=144","tags":["概念","七年级"]},
    {"id":"alg_019","type":"formula","front":"平方根","back":"若x²=a，则x=±√a（a≥0）\n√a是a的算术平方根","phonetic":"","hint":"平方根有正负两个","example":"x²=9，x=±3；√25=5","tags":["概念","七年级"]},
    {"id":"alg_020","type":"formula","front":"立方根","back":"若x³=a，则x=∛a\n每个数只有一个立方根","phonetic":"","hint":"立方根只有一个","example":"∛8=2，∛−27=−3","tags":["概念","七年级"]},
]}
algebra['meta']['count'] = len(algebra['cards'])
save(f'{BASE}/middle/algebra.json', algebra)

# ===== 初中几何（扩充）=====
geometry = {"meta":{"subject":"math","grade":"middle","name":"初中几何公式","version":"2024","count":0},"cards":[
    {"id":"geo_001","type":"formula","front":"勾股定理","back":"直角三角形中：a² + b² = c²\na、b为直角边，c为斜边（最长边）","phonetic":"","hint":"两直角边平方和=斜边平方","example":"3²+4²=9+16=25=5²，所以3-4-5是直角三角形","tags":["三角形","八年级"]},
    {"id":"geo_002","type":"formula","front":"勾股定理逆定理","back":"若a²+b²=c²，则该三角形是直角三角形\nc对应的角是直角","phonetic":"","hint":"满足勾股定理，就是直角三角形","example":"5,12,13：5²+12²=25+144=169=13²，是直角三角形","tags":["三角形","八年级"]},
    {"id":"geo_003","type":"concept","front":"全等三角形判定","back":"SSS：三边对应相等\nSAS：两边夹角对应相等\nASA：两角夹边对应相等\nAAS：两角一对边对应相等","phonetic":"","hint":"SSS/SAS/ASA/AAS（没有SSA）","example":"若两三角形三边相等，则全等（SSS）","tags":["三角形","八年级"]},
    {"id":"geo_004","type":"concept","front":"相似三角形判定","back":"AA：两角对应相等\nSSS：三边成比例\nSAS：两边成比例且夹角相等","phonetic":"","hint":"AA最常用","example":"两三角形有两对角相等，则相似","tags":["相似","九年级"]},
    {"id":"geo_005","type":"formula","front":"相似三角形性质","back":"相似比为k时：\n对应边之比=k\n面积之比=k²\n周长之比=k","phonetic":"","hint":"面积比=相似比的平方","example":"相似比3:2，面积比=9:4","tags":["相似","九年级"]},
    {"id":"geo_006","type":"formula","front":"平行四边形性质","back":"对边相等且平行\n对角相等\n对角线互相平分","phonetic":"","hint":"对边平行，对角线互相平分","example":"平行四边形中，对角线互相平分","tags":["四边形","八年级"]},
    {"id":"geo_007","type":"formula","front":"矩形性质","back":"平行四边形基础上：四个角都是直角\n对角线相等\n对角线互相平分","phonetic":"","hint":"平行四边形+四个直角","example":"矩形中：对角线相等且互相平分","tags":["四边形","八年级"]},
    {"id":"geo_008","type":"formula","front":"菱形性质","back":"平行四边形基础上：四边相等\n对角线互相垂直平分\n每条对角线平分对角","phonetic":"","hint":"平行四边形+四边相等","example":"菱形的两条对角线互相垂直","tags":["四边形","八年级"]},
    {"id":"geo_009","type":"formula","front":"正方形性质","back":"既是矩形又是菱形\n四边相等，四角直角\n对角线相等且互相垂直平分","phonetic":"","hint":"矩形+菱形=正方形","example":"正方形的对角线相等、互相垂直且平分","tags":["四边形","八年级"]},
    {"id":"geo_010","type":"formula","front":"圆的基本性质","back":"圆心到圆上任意点的距离相等（半径r）\n直径d=2r\n同圆或等圆的半径相等","phonetic":"","hint":"圆心到圆上各点距离相等","example":"圆的半径是5，则直径是10","tags":["圆","九年级"]},
    {"id":"geo_011","type":"formula","front":"圆与直线位置关系","back":"d>r：直线与圆相离（0个交点）\nd=r：直线与圆相切（1个交点）\nd<r：直线与圆相交（2个交点）\nd为圆心到直线的距离","phonetic":"","hint":"圆心到直线的距离与半径比较","example":"d=r时，直线是圆的切线","tags":["圆","九年级"]},
    {"id":"geo_012","type":"formula","front":"圆心角与弧、弦的关系","back":"圆心角=所对弧度\n等弧对等弦\n等弦对等弧对等圆心角","phonetic":"","hint":"等弧等弦等角","example":"圆心角60°所对的弧是圆弧的1/6","tags":["圆","九年级"]},
    {"id":"geo_013","type":"formula","front":"圆周角定理","back":"圆周角等于同弧所对圆心角的一半\n同弧上的圆周角相等\n直径所对的圆周角是90°","phonetic":"","hint":"圆周角=圆心角÷2","example":"直径上的圆周角是直角（90°）","tags":["圆","九年级"]},
    {"id":"geo_014","type":"formula","front":"直角三角形斜边中线","back":"直角三角形斜边上的中线等于斜边的一半","phonetic":"","hint":"直角三角形外接圆半径=斜边/2","example":"斜边10的直角三角形，斜边中线=5","tags":["三角形","八年级"]},
    {"id":"geo_015","type":"formula","front":"等腰三角形性质","back":"两腰相等\n两底角相等\n顶角平分线、底边中线、底边上的高重合（三线合一）","phonetic":"","hint":"等腰等角，三线合一","example":"等腰三角形中，顶角平分线垂直底边","tags":["三角形","八年级"]},
    {"id":"geo_016","type":"formula","front":"等边三角形性质","back":"三边相等，三角都是60°\n每条高、中线、角平分线都相等\n内切圆和外接圆圆心重合","phonetic":"","hint":"三边相等，三角60°","example":"等边三角形的每个内角都是60°","tags":["三角形","八年级"]},
    {"id":"geo_017","type":"concept","front":"坐标系","back":"由水平x轴和竖直y轴组成\n原点(0,0)是交叉点\n四个象限：第一(+,+)、第二(-,+)、第三(-,-)、第四(+,-)","phonetic":"","hint":"x轴水平，y轴垂直","example":"点(3,4)在第一象限，(-2,5)在第二象限","tags":["坐标","八年级"]},
    {"id":"geo_018","type":"formula","front":"两点间的距离公式","back":"d = √((x₂-x₁)² + (y₂-y₁)²)","phonetic":"","hint":"勾股定理的坐标版本","example":"(0,0)到(3,4)的距离=√(9+16)=5","tags":["坐标","八年级"]},
    {"id":"geo_019","type":"formula","front":"中点坐标公式","back":"线段AB中点M的坐标：\nM = ((x₁+x₂)/2, (y₁+y₂)/2)","phonetic":"","hint":"两端点坐标各自取平均","example":"A(2,4)和B(6,8)的中点M=(4,6)","tags":["坐标","八年级"]},
    {"id":"geo_020","type":"concept","front":"三角函数（初步）","back":"在直角三角形中（∠C=90°）：\nsin A = 对边/斜边 = a/c\ncos A = 邻边/斜边 = b/c\ntan A = 对边/邻边 = a/b","phonetic":"","hint":"sin对斜，cos邻斜，tan对邻","example":"3-4-5直角三角形，sinA=3/5=0.6，cosA=4/5=0.8","tags":["三角函数","九年级"]},
]}
geometry['meta']['count'] = len(geometry['cards'])
save(f'{BASE}/middle/geometry.json', geometry)

print('数学数据生成完成！')
