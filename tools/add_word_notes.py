#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""补全剩余13首小学古诗的词语注释"""
import json

EXTRA_NOTES = {
    # 九月九日忆山东兄弟
    "poem_jiuyue": [
        {"word": "独", "note": "独自一人"},
        {"word": "异乡", "note": "他乡，不是自己家乡的地方"},
        {"word": "异客", "note": "陌生的客人，外乡人"},
        {"word": "每逢", "note": "每当，每次遇到"},
        {"word": "佳节", "note": "美好的节日，这里指重阳节（农历九月初九）"},
        {"word": "倍思亲", "note": "加倍思念亲人。倍：加倍，更加"},
        {"word": "遥知", "note": "在远方知道，想象到"},
        {"word": "登高处", "note": "登上高处。重阳节有登高的习俗"},
        {"word": "遍插", "note": "每人都插上"},
        {"word": "茱萸", "note": "一种香草，重阳节时人们插戴以求辟邪"},
        {"word": "少一人", "note": "少了我这一个人"}
    ],
    # 赠汪伦
    "poem_zengewanglun": [
        {"word": "乘舟", "note": "坐船，乘坐船只"},
        {"word": "将欲行", "note": "即将要出发"},
        {"word": "忽闻", "note": "忽然听见"},
        {"word": "踏歌声", "note": "踏着节拍唱歌的声音。踏歌：边踏步边唱歌"},
        {"word": "桃花潭水", "note": "桃花潭的水，地名在今安徽泾县"},
        {"word": "深千尺", "note": "水深千尺，夸张手法"},
        {"word": "不及", "note": "比不上"},
        {"word": "送我情", "note": "汪伦送别我的深厚情意"}
    ],
    # 泊船瓜洲
    "poem_bochuanguazhou": [
        {"word": "京口", "note": "地名，今江苏镇江"},
        {"word": "瓜洲", "note": "地名，今江苏扬州南边的沙洲"},
        {"word": "一水间", "note": "只隔着一条水（长江）"},
        {"word": "钟山", "note": "今南京紫金山，诗人家乡附近"},
        {"word": "数重山", "note": "几座山岭"},
        {"word": "春风又绿", "note": "春风再次把……吹绿。绿：使变绿，作动词用"},
        {"word": "江南岸", "note": "长江南边的岸"},
        {"word": "何时照我还", "note": "什么时候把我照回故乡"}
    ],
    # 石灰吟
    "poem_shihueyin": [
        {"word": "千锤万凿", "note": "经历无数次锤打和凿击，形容开采极为艰辛"},
        {"word": "出深山", "note": "从深山中开采出来"},
        {"word": "烈火焚烧", "note": "在高温烈火中烧炼，指石灰石的烧制过程"},
        {"word": "若等闲", "note": "好像很平常的事。若：好像；等闲：平常，无所谓"},
        {"word": "粉骨碎身", "note": "骨头粉碎，身体碎裂，比喻为信仰而牺牲"},
        {"word": "浑不怕", "note": "全然不害怕，毫不畏惧"},
        {"word": "清白", "note": "纯洁无瑕的品格，高尚的节操"},
        {"word": "人间", "note": "世间，人世之中"}
    ],
    # 早发白帝城
    "poem_zaofabaidi": [
        {"word": "朝辞", "note": "清晨告别。朝：早晨"},
        {"word": "白帝", "note": "白帝城，在今重庆奉节，长江三峡入口"},
        {"word": "彩云间", "note": "在彩云缭绕之中，形容地势极高"},
        {"word": "千里江陵", "note": "千里之遥的江陵，今湖北荆州"},
        {"word": "一日还", "note": "一天就能到达，形容顺水行船之快"},
        {"word": "两岸猿声", "note": "两岸山上猿猴的啼叫声"},
        {"word": "啼不住", "note": "叫声连续不断，停不下来"},
        {"word": "轻舟", "note": "轻快的小船"},
        {"word": "已过", "note": "已经驶过了"},
        {"word": "万重山", "note": "无数座山，形容山峰连绵众多"}
    ],
    # 枫桥夜泊
    "poem_fengqiaoyebo": [
        {"word": "月落", "note": "月亮落下，月亮西沉"},
        {"word": "乌啼", "note": "乌鸦啼叫，夜深时的声音"},
        {"word": "霜满天", "note": "寒霜弥漫天空，形容深秋夜晚极寒"},
        {"word": "江枫", "note": "江边的枫树"},
        {"word": "渔火", "note": "渔船上的灯火"},
        {"word": "对愁眠", "note": "带着满怀愁绪难以入睡"},
        {"word": "姑苏", "note": "苏州的别称，今江苏苏州"},
        {"word": "寒山寺", "note": "苏州城外著名寺庙"},
        {"word": "夜半钟声", "note": "半夜时分敲响的钟声"},
        {"word": "客船", "note": "旅客乘坐的船"}
    ],
    # 从军行/出塞
    "poem_shizhisaishang": [
        {"word": "秦时明月汉时关", "note": "自秦汉时代就有的月亮和边关，写历史悠久"},
        {"word": "万里长征", "note": "远征万里之遥"},
        {"word": "人未还", "note": "将士们尚未归来"},
        {"word": "但使", "note": "只要，假如"},
        {"word": "龙城飞将", "note": "汉代名将李广，威震边疆的飞将军"},
        {"word": "不教", "note": "不让，不允许"},
        {"word": "胡马", "note": "北方游牧民族的战马"},
        {"word": "度阴山", "note": "越过阴山（今内蒙古一带山脉）"}
    ],
    # 绝句（杜甫）
    "poem_juju_dufu": [
        {"word": "迟日", "note": "春天的太阳，白天渐长。迟：迟缓，这里指春日阳光普照，白昼延长"},
        {"word": "江山丽", "note": "江山景色秀丽，春光美好"},
        {"word": "春风", "note": "春天温暖的风"},
        {"word": "花草香", "note": "百花盛开，草木芳香"},
        {"word": "泥融", "note": "泥土融化变软，指春天气温回升"},
        {"word": "飞燕子", "note": "燕子在空中飞翔"},
        {"word": "沙暖", "note": "沙滩被阳光晒暖"},
        {"word": "睡鸳鸯", "note": "鸳鸯在暖沙上睡觉，一片安详之景"}
    ],
    # 小池（初春细观）
    "poem_xiaochuijingci": [
        {"word": "泉眼", "note": "泉水流出的小孔，泉水的源头"},
        {"word": "无声惜细流", "note": "泉眼悄悄地爱惜着细小的水流，拟人手法"},
        {"word": "树阴", "note": "树的阴影"},
        {"word": "照水爱晴柔", "note": "树影映入水中，好像喜爱这晴天里柔和的风光"},
        {"word": "小荷才露尖尖角", "note": "嫩荷叶刚刚探出水面，刚冒出小小的尖角"},
        {"word": "早有蜻蜓立上头", "note": "蜻蜓早已停落在它的上面"}
    ],
    # 寻隐者不遇
    "poem_xunyin": [
        {"word": "松下问童子", "note": "在松树下问隐者的童仆"},
        {"word": "言", "note": "说"},
        {"word": "师采药去", "note": "老师去山里采药了"},
        {"word": "只在此山中", "note": "就在这座山里"},
        {"word": "云深不知处", "note": "山中云雾弥漫，不知道在哪里"}
    ],
    # 滁州西涧
    "poem_chuzhouxijian": [
        {"word": "独怜", "note": "独独喜爱。怜：喜爱"},
        {"word": "幽草", "note": "幽深处生长的青草"},
        {"word": "涧边生", "note": "生长在山涧边"},
        {"word": "上有黄鹂", "note": "涧边树上有黄鹂鸟"},
        {"word": "深树鸣", "note": "在茂密的树林中鸣叫"},
        {"word": "春潮带雨晚来急", "note": "傍晚下雨，春潮涌来，水势湍急"},
        {"word": "野渡", "note": "荒野中的渡口"},
        {"word": "无人舟自横", "note": "无人管理，小船横在水中，随波漂荡"}
    ],
    # 春夜喜雨
    "poem_chunyexiyu": [
        {"word": "好雨", "note": "好的雨，及时雨，这里指春雨"},
        {"word": "知时节", "note": "知道适当的时节，在需要的时候降临"},
        {"word": "当春乃发生", "note": "当春天来临的时候就下起来了"},
        {"word": "随风潜入夜", "note": "随着春风悄悄地在夜里降落。潜：悄悄地"},
        {"word": "润物细无声", "note": "细细地滋润万物，没有声音"},
        {"word": "野径云俱黑", "note": "田野小路和天空都黑沉沉的"},
        {"word": "江船火独明", "note": "只有江上船只的灯火是明亮的"},
        {"word": "晓看红湿处", "note": "清晨看那雨水沾湿的地方"},
        {"word": "花重锦官城", "note": "锦官城（成都）里百花盛开，花朵沉甸甸的"}
    ],
    # 送杜少府之任蜀州
    "poem_songdushaofuzhi": [
        {"word": "城阙", "note": "城楼，这里指京城长安"},
        {"word": "辅三秦", "note": "三秦大地拱卫着长安。三秦：关中地区"},
        {"word": "风烟望五津", "note": "透过风烟远望蜀地的五个渡口"},
        {"word": "与君离别意", "note": "我和你分别的情意"},
        {"word": "同是宦游人", "note": "都是为官在外漂泊的人"},
        {"word": "海内存知己", "note": "天下有你这样的知心朋友"},
        {"word": "天涯若比邻", "note": "即便远在天涯也如同近邻"},
        {"word": "无为在歧路", "note": "在分别的岔路口不要（儿女情长）"},
        {"word": "儿女共沾巾", "note": "像小儿女一样哭泣流泪"}
    ]
}

with open('data/builtin/chinese/primary/primary_poems_full.json', encoding='utf-8') as f:
    data = json.load(f)

added = 0
for text in data['texts']:
    pid = text['id']
    if pid in EXTRA_NOTES and not text.get('word_notes') and EXTRA_NOTES[pid]:
        text['word_notes'] = EXTRA_NOTES[pid]
        added += 1

with open('data/builtin/chinese/primary/primary_poems_full.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

has_wn = sum(1 for t in data['texts'] if t.get('word_notes'))
print(f'Added word_notes to {added} poems')
print(f'Total with word_notes: {has_wn}/{len(data["texts"])}')
