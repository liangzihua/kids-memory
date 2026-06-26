#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成小学英语课文短文数据，添加到现有 passages 文件"""
import json, sys
sys.stdout.reconfigure(encoding='utf-8')

# 小学英语典型课文（参考PEP/各版本通用课文）
new_passages = [
    {"id":"ep_pep_001","title":"My School","grade":"primary3","category":"课文",
     "text":"My name is Tom. I am a student. My school is very big. There is a playground in my school. There is a library too. I love my school.",
     "translation":"我叫汤姆。我是一名学生。我的学校非常大。学校里有一个操场，还有一个图书馆。我爱我的学校。",
     "keywords":["school","playground","library","student","big"],"key_points":["I am/is句型","there is句型","love表达"]},
    {"id":"ep_pep_002","title":"My Home","grade":"primary3","category":"课文",
     "text":"This is my home. It has a living room, a kitchen and two bedrooms. My bedroom is small but clean. I have a desk and a bed in my bedroom. I do my homework at my desk.",
     "translation":"这是我的家。它有一个客厅、一个厨房和两间卧室。我的卧室小但干净。我的卧室里有一张桌子和一张床。我在桌子旁做作业。",
     "keywords":["living room","kitchen","bedroom","desk","homework"],"key_points":["has表示拥有","形容词but连接","at表示位置"]},
    {"id":"ep_pep_003","title":"My Family","grade":"primary3","category":"课文",
     "text":"Look at my family photo. This is my father. He is a doctor. This is my mother. She is a teacher. This is my sister. She is seven years old. And this is me. We are a happy family.",
     "translation":"看我的全家福。这是我的爸爸，他是一名医生。这是我的妈妈，她是一名老师。这是我的妹妹，她七岁。这是我。我们是一个幸福的家庭。",
     "keywords":["family","doctor","teacher","happy","photo"],"key_points":["this is介绍","he/she is职业","years old年龄"]},
    {"id":"ep_pep_004","title":"My Favourite Food","grade":"primary3","category":"课文",
     "text":"I like fruit. My favourite fruit is apples. They are red and sweet. I also like bananas. They are yellow. I eat fruit every day. Fruit is good for us.",
     "translation":"我喜欢水果。我最喜欢的水果是苹果，它们又红又甜。我也喜欢香蕉，它们是黄色的。我每天都吃水果。水果对我们有好处。",
     "keywords":["fruit","favourite","sweet","yellow","every day"],"key_points":["like/favourite表喜好","also表也","good for对...有益"]},
    {"id":"ep_pep_005","title":"The Seasons","grade":"primary4","category":"课文",
     "text":"There are four seasons in a year. Spring is warm. Flowers are beautiful in spring. Summer is hot. We can swim in summer. Autumn is cool. Leaves turn yellow. Winter is cold. It often snows. I like spring best.",
     "translation":"一年有四个季节。春天温暖，春天花儿很美。夏天炎热，夏天我们可以游泳。秋天凉爽，树叶变黄。冬天寒冷，经常下雪。我最喜欢春天。",
     "keywords":["seasons","spring","summer","autumn","winter"],"key_points":["四季词汇","can表能力","turn+形容词变化"]},
    {"id":"ep_pep_006","title":"My Day","grade":"primary4","category":"课文",
     "text":"I get up at six thirty every morning. I have breakfast at seven. I go to school at seven thirty. Classes start at eight o'clock. I have lunch at school. I come home at five. I do my homework after dinner. I go to bed at nine.",
     "translation":"我每天早上六点半起床。七点吃早饭。七点半去学校。八点开始上课。我在学校吃午饭。五点回家。晚饭后做作业。九点睡觉。",
     "keywords":["get up","breakfast","homework","o'clock","come home"],"key_points":["时间表达","at+时间","一日作息"]},
    {"id":"ep_pep_007","title":"Shopping","grade":"primary4","category":"课文",
     "text":"Mum and I go shopping on Sunday. We go to the supermarket. I want to buy a T-shirt. The red one is nice. It costs fifty yuan. Mum says it is too expensive. So I buy the blue one. It costs thirty yuan.",
     "translation":"妈妈和我周日去购物。我们去超市。我想买一件T恤。红色的很好看，要五十元。妈妈说太贵了。所以我买了蓝色的，三十元。",
     "keywords":["shopping","supermarket","T-shirt","yuan","expensive"],"key_points":["want to表愿望","costs花费","too expensive太贵"]},
    {"id":"ep_pep_008","title":"My Hobbies","grade":"primary4","category":"课文",
     "text":"I have many hobbies. I like reading books. I often read in the evening. I also like painting. I can draw animals very well. On weekends, I play football with my friends. Sports make me healthy and happy.",
     "translation":"我有很多爱好。我喜欢读书，经常在晚上读。我也喜欢画画，我能画各种动物。周末和朋友踢足球。运动让我健康快乐。",
     "keywords":["hobbies","reading","painting","sports","healthy"],"key_points":["hobby爱好","often频率副词","make sb+形容词"]},
    {"id":"ep_pep_009","title":"Animals","grade":"primary4","category":"课文",
     "text":"There are many animals in the zoo. I can see lions, tigers, pandas and elephants. Pandas are my favourite. They are black and white. They eat bamboo. The baby panda is very cute. I want to protect animals.",
     "translation":"动物园里有很多动物。我能看到狮子、老虎、熊猫和大象。熊猫是我最喜欢的，它们是黑白相间的。它们吃竹子。熊猫宝宝非常可爱。我想保护动物。",
     "keywords":["zoo","panda","bamboo","cute","protect"],"key_points":["动物词汇","black and white颜色描述","want to do表意愿"]},
    {"id":"ep_pep_010","title":"Our Classroom","grade":"primary3","category":"课文",
     "text":"This is our classroom. It is big and bright. There are forty desks and chairs. There is a blackboard on the wall. Our teacher writes on it every day. There are some pictures on the wall too. I love our classroom.",
     "translation":"这是我们的教室，又大又明亮。有四十张桌椅。墙上有一块黑板，老师每天在上面写字。墙上还有一些图画。我爱我们的教室。",
     "keywords":["classroom","bright","blackboard","wall","forty"],"key_points":["there is/are句型","big and bright并列形容词","every day频率"]},
    {"id":"ep_pep_011","title":"Sports Day","grade":"primary5","category":"课文",
     "text":"Last Friday was our school Sports Day. All the students took part in different events. I joined the 100-metre race. I ran very fast and came second. My classmate Li Lei won the long jump. We got many prizes. It was a wonderful day.",
     "translation":"上周五是我们学校的运动会。所有学生参加了不同的项目。我参加了百米赛跑，跑得很快，得了第二名。同学李雷赢得了跳远。我们获得了很多奖项。真是美好的一天。",
     "keywords":["Sports Day","race","long jump","prize","wonderful"],"key_points":["过去时态","take part in参加","序数词second"]},
    {"id":"ep_pep_012","title":"A Trip to the Farm","grade":"primary5","category":"课文",
     "text":"Last Saturday, my class went to a farm. We saw cows, sheep and chickens. A farmer showed us how to plant vegetables. I planted some tomatoes. The farm was very interesting. I learned a lot about nature.",
     "translation":"上周六，我们班去了一个农场。我们看到了奶牛、羊和鸡。一个农民教我们怎样种蔬菜。我种了一些番茄。农场非常有趣。我了解了很多关于自然的知识。",
     "keywords":["farm","farmer","plant","vegetables","nature"],"key_points":["过去式","show sb how to do","learned a lot学了很多"]},
    {"id":"ep_pep_013","title":"My Dream Job","grade":"primary5","category":"课文",
     "text":"When I grow up, I want to be a doctor. Doctors help sick people. They work very hard. My mother is a nurse. She says being a doctor is important. I will study hard to make my dream come true.",
     "translation":"当我长大后，我想成为一名医生。医生帮助病人，他们工作非常努力。我妈妈是一名护士，她说做医生很重要。我会努力学习，让梦想成真。",
     "keywords":["grow up","doctor","nurse","dream","study hard"],"key_points":["when引导时间从句","want to be将来志向","make dream come true"]},
    {"id":"ep_pep_014","title":"Protecting the Environment","grade":"primary6","category":"课文",
     "text":"Our environment is getting worse. There is a lot of pollution. We must protect our earth. We can save water and electricity. We should not throw rubbish everywhere. Let us plant more trees. If everyone tries, our earth will be beautiful again.",
     "translation":"我们的环境越来越差，污染严重。我们必须保护地球，节约用水用电，不乱扔垃圾，多种树。如果每个人都努力，地球将再次变得美丽。",
     "keywords":["environment","pollution","protect","save","rubbish"],"key_points":["must/should情态动词","if条件状语从句","let us倡议"]},
    {"id":"ep_pep_015","title":"Using the Internet","grade":"primary6","category":"课文",
     "text":"The Internet is very useful. We can find information and learn new things online. Many people shop and pay bills online. But we must be careful. We should not talk to strangers online. We must not spend too much time on the Internet.",
     "translation":"互联网非常有用。我们可以在网上查找信息、学习新知识。很多人在网上购物和缴费。但我们必须小心，不要和网上陌生人交谈，也不能在网上花太多时间。",
     "keywords":["Internet","information","online","strangers","careful"],"key_points":["can表能力","must/must not义务与禁止","too much过多"]},
    {"id":"ep_pep_016","title":"Chinese New Year","grade":"primary4","category":"课文",
     "text":"Chinese New Year is the most important holiday in China. People clean their houses and put up red decorations. Families get together and have a big dinner. Children get red envelopes with money. There are fireworks at midnight. It is very exciting!",
     "translation":"春节是中国最重要的节日。人们打扫房子，张贴红色装饰品。家人团聚，吃年夜饭。孩子们收到红包。午夜放烟花，非常令人兴奋！",
     "keywords":["Chinese New Year","decorations","red envelopes","fireworks","exciting"],"key_points":["most important最高级","get together团聚","It is+形容词感叹"]},
    {"id":"ep_pep_017","title":"Healthy Eating","grade":"primary5","category":"课文",
     "text":"Eating healthy food is very important for us. We should eat more vegetables and fruit. They give us vitamins. We should not eat too much junk food like chips and candy. Drinking enough water is also important. Let us eat well and stay healthy!",
     "translation":"健康饮食对我们非常重要。我们应该多吃蔬菜和水果，它们给我们提供维生素。我们不应该吃太多垃圾食品，如薯片和糖果。喝足够的水也很重要。让我们好好吃饭，保持健康！",
     "keywords":["healthy","vegetables","vitamins","junk food","water"],"key_points":["should/should not建议","give us提供","too much过多"]},
    {"id":"ep_pep_018","title":"My Pen Pal","grade":"primary5","category":"课文",
     "text":"My name is Li Ming. I have a pen pal in Australia. His name is Jack. He is twelve years old. He likes playing basketball and swimming. I often write letters to him. We share our lives with each other. I hope to visit him one day.",
     "translation":"我叫李明，在澳大利亚有一个笔友，叫杰克，十二岁。他喜欢打篮球和游泳。我经常给他写信，我们互相分享生活。我希望有一天能去拜访他。",
     "keywords":["pen pal","Australia","basketball","letters","share"],"key_points":["笔友文化","like doing","share with each other互相分享"]},
    {"id":"ep_pep_019","title":"A Rainy Day","grade":"primary3","category":"课文",
     "text":"Today is a rainy day. It is raining outside. I cannot go out to play. I stay at home with mum. We are reading books together. The rain is falling on the window. I can hear it. It sounds like music.",
     "translation":"今天是个雨天，外面在下雨。我不能出去玩，和妈妈待在家里一起读书。雨点打在窗户上，我能听到，听起来像音乐一样。",
     "keywords":["rainy","raining","outside","together","sounds like"],"key_points":["现在进行时","cannot表不能","sounds like比喻"]},
    {"id":"ep_pep_020","title":"My Weekend","grade":"primary4","category":"课文",
     "text":"I usually have a busy weekend. On Saturday morning, I have piano lessons. In the afternoon, I go to the park with my friends. On Sunday, I help Mum clean the house. In the evening, I read books or watch TV. I enjoy my weekends.",
     "translation":"我的周末通常很忙。周六上午上钢琴课，下午和朋友去公园。周日帮妈妈打扫房子。晚上读书或看电视。我很享受我的周末。",
     "keywords":["weekend","piano","park","clean","enjoy"],"key_points":["一般现在时","on+星期时间表达","or选择连词"]},
]

# 加载现有数据
path = 'C:/SAPDevelop/SAPLearning/kids-memory/data/builtin/english/passages/primary_passages.json'
with open(path, encoding='utf-8') as f:
    data = json.load(f)

# 获取已有 id
existing_ids = {p['id'] for p in data['passages']}

# 添加新的
added = 0
for p in new_passages:
    if p['id'] not in existing_ids:
        data['passages'].append(p)
        added += 1

data['meta']['count'] = len(data['passages'])

with open(path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f'Added {added} passages, total: {len(data["passages"])}')
