#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json, sys
sys.stdout.reconfigure(encoding='utf-8')

# 小学英语语法（三到六年级）
primary_grammar = {
    "meta": {"subject":"english","grade":"primary3","name":"小学英语语法要点","version":"2024","count":0},
    "cards": [
        # ===== 三年级 =====
        {"id":"pg_001","type":"grammar","front":"be动词：am / is / are","back":"I → am\nHe/She/It → is\nWe/You/They → are\n\n记忆口诀：我用am，你用are，is跟着他她它","phonetic":"","hint":"主语决定用哪个be动词","example":"I am a student. She is tall. They are happy.","tags":["语法","be动词","三年级"]},
        {"id":"pg_002","type":"grammar","front":"be动词否定句","back":"am/is/are 后面加 not\n缩写：isn't = is not，aren't = are not","phonetic":"","hint":"be动词后加not","example":"I am not late. He is not tall. → He isn't tall.","tags":["语法","be动词","三年级"]},
        {"id":"pg_003","type":"grammar","front":"be动词疑问句","back":"把am/is/are移到句首\n回答：Yes, ... am/is/are. / No, ... am not/isn't/aren't.","phonetic":"","hint":"be动词提到句首","example":"Is she a teacher? Yes, she is. / No, she isn't.","tags":["语法","be动词","三年级"]},
        {"id":"pg_004","type":"grammar","front":"名词复数规则","back":"一般加s：book → books\n以s/x/ch/sh结尾加es：bus→buses, box→boxes\n辅音+y→ies：baby→babies\n不规则：man→men, child→children, tooth→teeth","phonetic":"","hint":"大多数加s，特殊情况记牢","example":"two books, three buses, many babies, five men","tags":["语法","名词","三年级"]},
        {"id":"pg_005","type":"grammar","front":"冠词 a / an / the","back":"a：用在辅音音素开头的单词前\nan：用在元音音素(a/e/i/o/u)开头的单词前\nthe：特指，已知的事物","phonetic":"","hint":"a/an看发音，the表特指","example":"a book, an apple, an hour, the sun","tags":["语法","冠词","三年级"]},
        {"id":"pg_006","type":"grammar","front":"this / that / these / those","back":"this（这个）→ these（这些）：近处\nthat（那个）→ those（那些）：远处","phonetic":"","hint":"this/that单数，these/those复数","example":"This is my pen. Those are your books.","tags":["语法","指示代词","三年级"]},
        {"id":"pg_007","type":"grammar","front":"人称代词：主格","back":"I / you / he / she / it\nwe / you / they\n作主语用主格","phonetic":"","hint":"主格做主语","example":"He is my brother. They are students.","tags":["语法","代词","三年级"]},
        {"id":"pg_008","type":"grammar","front":"人称代词：宾格","back":"me / you / him / her / it\nus / you / them\n作宾语用宾格","phonetic":"","hint":"宾格做宾语","example":"Please help me. I like him.","tags":["语法","代词","三年级"]},
        {"id":"pg_009","type":"grammar","front":"形容词性物主代词","back":"my / your / his / her / its\nour / your / their\n修饰名词，放在名词前","phonetic":"","hint":"物主代词+名词","example":"my book, her bag, their school","tags":["语法","代词","三年级"]},
        {"id":"pg_010","type":"grammar","front":"there is / there are","back":"there is + 单数名词（有一个…）\nthere are + 复数名词（有多个…）\n否定：there is no / there are no","phonetic":"","hint":"单数用is，复数用are","example":"There is a cat. There are three books.","tags":["语法","句型","三年级"]},
        # ===== 四年级 =====
        {"id":"pg_011","type":"grammar","front":"一般现在时","back":"表示习惯性动作或客观事实\n第三人称单数：动词+s/es\nI/you/we/they：动词原形","phonetic":"","hint":"三单加s，其他原形","example":"I play football. She plays the piano.","tags":["语法","时态","四年级"]},
        {"id":"pg_012","type":"grammar","front":"一般现在时否定句","back":"I/you/we/they：don't + 动词原形\nHe/she/it：doesn't + 动词原形","phonetic":"","hint":"don't/doesn't+动词原形","example":"I don't like fish. She doesn't watch TV.","tags":["语法","时态","四年级"]},
        {"id":"pg_013","type":"grammar","front":"一般现在时疑问句","back":"Do + I/you/we/they + 动词原形？\nDoes + he/she/it + 动词原形？","phonetic":"","hint":"Do/Does提前，动词用原形","example":"Do you like sports? Does he play chess?","tags":["语法","时态","四年级"]},
        {"id":"pg_014","type":"grammar","front":"现在进行时","back":"am/is/are + 动词-ing\n动词+ing规则：一般加ing，末尾e去e加ing，辅元辅双写加ing","phonetic":"","hint":"be动词+动词ing","example":"I am reading. She is swimming. They are playing.","tags":["语法","时态","四年级"]},
        {"id":"pg_015","type":"grammar","front":"can 情态动词","back":"can + 动词原形（能，会）\n否定：cannot / can't\n疑问：Can + 主语 + 动词原形?","phonetic":"","hint":"can后动词原形","example":"I can swim. Can you speak Chinese? No, I can't.","tags":["语法","情态动词","四年级"]},
        {"id":"pg_016","type":"grammar","front":"方位介词","back":"in（在…里）on（在…上）under（在…下）\nnext to（紧邻）behind（在…后）in front of（在…前）\nbetween（在…之间）near（在…附近）","phonetic":"","hint":"表示位置关系的介词","example":"The book is on the desk. The cat is under the chair.","tags":["语法","介词","四年级"]},
        {"id":"pg_017","type":"grammar","front":"时间介词 at/in/on","back":"at：具体时刻（at 7 o'clock, at night）\nin：年/月/季节/上下午（in 2024, in May, in summer）\non：具体某天（on Monday, on July 1st）","phonetic":"","hint":"点用at，段用in，天用on","example":"at 8:00, in January, on my birthday","tags":["语法","介词","四年级"]},
        {"id":"pg_018","type":"grammar","front":"频率副词","back":"always(100%)>usually(80%)>often(60%)>sometimes(40%)>never(0%)\n放在be动词后，实义动词前","phonetic":"","hint":"放在be后，实义动词前","example":"She is always happy. I never eat meat.","tags":["语法","副词","四年级"]},
        {"id":"pg_019","type":"grammar","front":"祈使句","back":"肯定：动词原形开头（表命令/请求）\n否定：Don't + 动词原形\n礼貌：Please + 动词原形","phonetic":"","hint":"动词原形开头","example":"Open the door. Don't run. Please sit down.","tags":["语法","句型","四年级"]},
        {"id":"pg_020","type":"grammar","front":"感叹句 What / How","back":"What + a/an + 形容词 + 名词 + 主语 + 谓语!\nHow + 形容词/副词 + 主语 + 谓语!","phonetic":"","hint":"What修饰名词，How修饰形容词","example":"What a nice day! How beautiful she is!","tags":["语法","句型","四年级"]},
        # ===== 五年级 =====
        {"id":"pg_021","type":"grammar","front":"一般过去时","back":"规则动词：动词+ed\n不规则：go→went, come→came, have→had, do→did, see→saw\n否定：didn't + 动词原形","phonetic":"","hint":"规则加ed，不规则要背","example":"I played football yesterday. She went to school.","tags":["语法","时态","五年级"]},
        {"id":"pg_022","type":"grammar","front":"常见不规则动词过去式","back":"be→was/were, go→went, come→came\nhave→had, do→did, see→saw\ntake→took, make→made, say→said\nget→got, give→gave, write→wrote\nbuy→bought, think→thought","phonetic":"","hint":"不规则动词需要逐个背","example":"She went shopping. I bought a book.","tags":["语法","时态","五年级"]},
        {"id":"pg_023","type":"grammar","front":"will 将来时","back":"will + 动词原形（预测/决定/意愿）\n否定：won't = will not\n疑问：Will + 主语 + 动词原形?","phonetic":"","hint":"will后动词原形","example":"I will visit Beijing. Will you come? No, I won't.","tags":["语法","时态","五年级"]},
        {"id":"pg_024","type":"grammar","front":"be going to 将来时","back":"be going to + 动词原形（计划/打算）\n与will的区别：be going to强调有计划","phonetic":"","hint":"表示有计划要做的事","example":"I am going to study English tonight.","tags":["语法","时态","五年级"]},
        {"id":"pg_025","type":"grammar","front":"比较级构成规则","back":"一般：+er（tall→taller）\n以e结尾：+r（nice→nicer）\n辅元辅：双写+er（big→bigger）\n多音节：more+形容词（more beautiful）\n不规则：good→better, bad→worse","phonetic":"","hint":"短词加er，长词用more","example":"Tom is taller than Jack. This is more interesting.","tags":["语法","形容词","五年级"]},
        {"id":"pg_026","type":"grammar","front":"最高级构成规则","back":"一般：+est（tall→tallest）\n多音节：most+形容词（most beautiful）\n不规则：good→best, bad→worst\n用法：the+最高级+of/in","phonetic":"","hint":"最高级前加the","example":"She is the tallest in our class. He runs the fastest.","tags":["语法","形容词","五年级"]},
        {"id":"pg_027","type":"grammar","front":"should 情态动词","back":"should + 动词原形（应该）\n否定：shouldn't（不应该）\n表建议或义务","phonetic":"","hint":"should后动词原形","example":"You should eat more vegetables. You shouldn't stay up late.","tags":["语法","情态动词","五年级"]},
        {"id":"pg_028","type":"grammar","front":"must / have to","back":"must：主观认为必须（内心要求）\nhave to：客观原因不得不\n否定区别：mustn't（禁止）vs don't have to（不必须）","phonetic":"","hint":"must主观，have to客观","example":"You must be quiet. I have to go now.","tags":["语法","情态动词","五年级"]},
        {"id":"pg_029","type":"grammar","front":"动词不定式 to do","back":"to + 动词原形\n作目的：I go to school to learn.\n作宾语：I want to go.\n常接不定式：want/like/hope/decide/plan/try","phonetic":"","hint":"to后动词原形","example":"I want to eat pizza. She decided to study harder.","tags":["语法","不定式","五年级"]},
        {"id":"pg_030","type":"grammar","front":"连词 and/but/or/so","back":"and：并列（而且）\nbut：转折（但是）\nor：选择（或者）\nso：结果（所以）\nbecause：原因（因为）","phonetic":"","hint":"and并列，but转折，or选择，so结果","example":"I like cats but I am afraid of dogs.","tags":["语法","连词","五年级"]},
        # ===== 六年级 =====
        {"id":"pg_031","type":"grammar","front":"现在完成时","back":"have/has + 过去分词\n表示：过去的动作对现在有影响\n常用词：already（已经）, yet（还没）, ever, never, just","phonetic":"","hint":"have/has+过去分词","example":"I have already done my homework. Has she come yet?","tags":["语法","时态","六年级"]},
        {"id":"pg_032","type":"grammar","front":"过去分词规则","back":"规则：同过去式（+ed）\n不规则：go→gone, come→come, be→been\ntake→taken, make→made, write→written\ngive→given, do→done, see→seen","phonetic":"","hint":"规则同过去式，不规则要背","example":"I have visited the museum. She has seen the film.","tags":["语法","时态","六年级"]},
        {"id":"pg_033","type":"grammar","front":"被动语态","back":"be动词 + 过去分词\n一般现在时被动：am/is/are + done\n一般过去时被动：was/were + done","phonetic":"","hint":"be+过去分词","example":"English is spoken worldwide. The window was broken.","tags":["语法","被动","六年级"]},
        {"id":"pg_034","type":"grammar","front":"宾语从句","back":"主句 + 连接词 + 从句\n连接词：that, if/whether, what/when/where/who\n从句用陈述句语序","phonetic":"","hint":"从句用陈述句语序","example":"I think that he is right. Do you know where she lives?","tags":["语法","从句","六年级"]},
        {"id":"pg_035","type":"grammar","front":"定语从句（关系代词）","back":"that/which：修饰物\nwho：修饰人\nwhose：表所属关系","phonetic":"","hint":"人用who，物用which/that","example":"The book that I bought is good. The girl who sings is my sister.","tags":["语法","从句","六年级"]},
        {"id":"pg_036","type":"grammar","front":"条件状语从句","back":"if引导条件句\n真实条件：if+一般现在时，主句+will\n主句和从句的时态搭配要注意","phonetic":"","hint":"if从句用现在时，主句用将来时","example":"If it rains, I will stay at home. If you study hard, you will succeed.","tags":["语法","从句","六年级"]},
        {"id":"pg_037","type":"grammar","front":"间接引语","back":"直接引语→间接引语的变化：\n代词变化：I→he/she\n时态后移：is→was, will→would\n时间地点词：now→then, here→there","phonetic":"","hint":"代词变，时态退一步","example":"She said, 'I am tired.' → She said that she was tired.","tags":["语法","引语","六年级"]},
        {"id":"pg_038","type":"grammar","front":"too…to / enough…to","back":"too + 形容词/副词 + to do（太…以至于不能）\n形容词/副词 + enough + to do（足够…能够）","phonetic":"","hint":"too表否定，enough表肯定","example":"He is too young to drive. She is old enough to go to school.","tags":["语法","句型","六年级"]},
        {"id":"pg_039","type":"grammar","front":"动名词 doing","back":"动词+ing作名词用\n作主语：Swimming is fun.\n作宾语（喜好类动词后）：enjoy/like/finish/mind/keep + doing","phonetic":"","hint":"doing可作主语和宾语","example":"Swimming is good exercise. I enjoy reading books.","tags":["语法","动名词","六年级"]},
        {"id":"pg_040","type":"grammar","front":"特殊疑问句","back":"疑问词 + 一般疑问句语序\nWhat（什么）Who（谁）Where（哪里）When（何时）\nWhy（为什么）How（怎样）Which（哪个）How many/much","phonetic":"","hint":"疑问词开头+一般疑问句","example":"What do you do? Where does she live? How old are you?","tags":["语法","句型","六年级"]},
    ]
}
primary_grammar['meta']['count'] = len(primary_grammar['cards'])

# 初中英语语法（扩充）
middle_grammar = {
    "meta": {"subject":"english","grade":"middle","name":"初中英语语法要点","version":"2024","count":0},
    "cards": [
        {"id":"mg_001","type":"grammar","front":"一般现在时第三人称单数规则","back":"动词+s/es\n以s/x/ch/sh结尾+es：teaches\n辅音+y→ies：studies\n特殊：have→has，be→is","phonetic":"","hint":"三单变化：规律同名词复数","example":"She teaches English. He studies hard. He has a dog.","tags":["语法","时态","七年级"]},
        {"id":"mg_002","type":"grammar","front":"现在进行时","back":"am/is/are + 动词-ing\n表示正在进行的动作\n时间标志：now, at the moment, look, listen","phonetic":"","hint":"be+ing，表示正在做","example":"Look! She is dancing. They are watching TV now.","tags":["语法","时态","七年级"]},
        {"id":"mg_003","type":"grammar","front":"一般过去时规则动词","back":"动词+ed\n末尾e：+d（liked）\n辅音+y→i+ed（studied）\n辅元辅（重读）：双写+ed（stopped）","phonetic":"","hint":"ed变化规律","example":"I played football. She studied last night. He stopped running.","tags":["语法","时态","七年级"]},
        {"id":"mg_004","type":"grammar","front":"一般将来时 will/be going to","back":"will：临时决定，预测\nbe going to：有计划，根据迹象推断\n结构：will/be going to + 动词原形","phonetic":"","hint":"will临时，going to有计划","example":"I will help you. I am going to visit Beijing next week.","tags":["语法","时态","七年级"]},
        {"id":"mg_005","type":"grammar","front":"现在完成时","back":"have/has + 过去分词\n表示：①过去动作对现在的影响 ②持续到现在的状态\n标志：already, yet, just, ever, never, since, for","phonetic":"","hint":"have/has+过去分词","example":"I have finished my homework. She has lived here for 5 years.","tags":["语法","时态","八年级"]},
        {"id":"mg_006","type":"grammar","front":"过去进行时","back":"was/were + 动词-ing\n表示过去某时正在进行的动作\n常与when/while连用","phonetic":"","hint":"was/were+ing","example":"When he called, I was sleeping. While she was cooking, the phone rang.","tags":["语法","时态","八年级"]},
        {"id":"mg_007","type":"grammar","front":"情态动词汇总","back":"can（能力/许可）may（许可/可能）\nmust（必须）should（应该）\nneed（需要）dare（敢于）\n共同特点：后接动词原形，没有人称变化","phonetic":"","hint":"情态动词+动词原形","example":"You can swim. You must study. You should exercise.","tags":["语法","情态动词","七年级"]},
        {"id":"mg_008","type":"grammar","front":"被动语态","back":"be + 过去分词\n现在时：am/is/are done\n过去时：was/were done\n将来时：will be done\n完成时：have/has been done","phonetic":"","hint":"强调动作承受者","example":"The book was written by Lu Xun. English is spoken worldwide.","tags":["语法","被动","八年级"]},
        {"id":"mg_009","type":"grammar","front":"宾语从句","back":"①that引导（陈述内容）\n②if/whether引导（是否）\n③what/who/when/where/why/how引导（特殊疑问）\n从句用陈述语序，时态与主句一致","phonetic":"","hint":"从句用陈述语序","example":"I know that he is right. I wonder if she will come.","tags":["语法","从句","八年级"]},
        {"id":"mg_010","type":"grammar","front":"定语从句","back":"先行词是人：who/that\n先行词是物：which/that\n表所属：whose\n在句中作主语或宾语","phonetic":"","hint":"who修饰人，which修饰物","example":"The man who/that lives next door is a doctor.","tags":["语法","从句","九年级"]},
        {"id":"mg_011","type":"grammar","front":"状语从句（时间）","back":"when：当…时\nwhile：正当…时（强调同时进行）\nbefore/after：在…之前/之后\nas soon as：一…就\nuntil/till：直到…为止","phonetic":"","hint":"主句用将来时，时间从句用现在时","example":"When I grow up, I will be a doctor. I will wait until you come back.","tags":["语法","从句","九年级"]},
        {"id":"mg_012","type":"grammar","front":"状语从句（条件）","back":"if（如果）unless（除非=if not）\n真实条件：if+一般现在时，主句+will\n主句时态根据情况变化","phonetic":"","hint":"if从句现在时，主句用will","example":"If you study hard, you will pass the exam. Unless it rains, we will go.","tags":["语法","从句","九年级"]},
        {"id":"mg_013","type":"grammar","front":"非谓语动词：不定式","back":"to + 动词原形\n作主语：To learn English is fun.\n作宾语：I want to go.\n作目的状语：I study to pass the exam.","phonetic":"","hint":"to do表目的或动词宾语","example":"I decided to study abroad. She went to the shop to buy milk.","tags":["语法","非谓语","八年级"]},
        {"id":"mg_014","type":"grammar","front":"非谓语动词：动名词","back":"动词+ing作名词\n常接动名词的动词：enjoy/finish/mind/avoid/keep/suggest/practice","phonetic":"","hint":"enjoy/finish后接doing","example":"I enjoy listening to music. She finished writing the report.","tags":["语法","非谓语","八年级"]},
        {"id":"mg_015","type":"grammar","front":"make/let/have使役动词","back":"make/let/have + 宾语 + 动词原形\nmake：让（强制）\nlet：让（允许）\nhave：让（安排）","phonetic":"","hint":"使役动词后+宾语+动词原形","example":"He made me laugh. She let me use her pen. I had him clean the room.","tags":["语法","动词","八年级"]},
        {"id":"mg_016","type":"grammar","front":"感知动词（see/hear/watch）","back":"see/hear/watch/notice + 宾语 + 动词原形（完整动作）\n或 + 宾语 + doing（正在进行）","phonetic":"","hint":"感知动词+宾语+原形/doing","example":"I saw him run/running. She heard them sing/singing.","tags":["语法","动词","九年级"]},
        {"id":"mg_017","type":"grammar","front":"虚拟语气","back":"与现在事实相反：if+过去时，would+动词原形\n与过去事实相反：if+过去完成时，would have+过去分词\nI wish + 从句（用过去时）","phonetic":"","hint":"if+过去，主句would","example":"If I were rich, I would travel the world. I wish I could fly.","tags":["语法","虚拟","九年级"]},
        {"id":"mg_018","type":"grammar","front":"倒装句","back":"否定词开头倒装：Never/Seldom/Hardly…助动词+主语\nSo/Neither/Nor开头：So do I（我也是）\n地点状语开头：Here comes the bus.","phonetic":"","hint":"So do I=我也是，Neither do I=我也不","example":"So do I. Neither does she. Here comes the bus.","tags":["语法","倒装","九年级"]},
        {"id":"mg_019","type":"grammar","front":"it作形式主语","back":"It is + 形容词 + to do sth\nIt is + 形容词 + that从句\nIt takes sb + 时间 + to do sth","phonetic":"","hint":"it替代后面的真正主语","example":"It is easy to learn English. It takes me an hour to get there.","tags":["语法","句型","八年级"]},
        {"id":"mg_020","type":"grammar","front":"形容词/副词的比较级与最高级","back":"比较：A is +比较级+ than B\n最高级：A is the +最高级+ in/of\n等级：A is as +原级+ as B（与…一样）\nA is not as/so +原级+ as B（不如…）","phonetic":"","hint":"比较级+than，最高级+the","example":"She is smarter than him. He is the tallest in the class. I am as tall as you.","tags":["语法","形容词","七年级"]},
        {"id":"mg_021","type":"grammar","front":"direct/indirect speech（直接/间接引语）","back":"直接→间接引语变化：\n人称：I→he/she，my→his/her\n时态退步：is→was，will→would，can→could\n时间：now→then，today→that day","phonetic":"","hint":"时态退一步，人称要变","example":"She said 'I am happy' → She said (that) she was happy.","tags":["语法","引语","九年级"]},
        {"id":"mg_022","type":"grammar","front":"前缀和后缀","back":"常见前缀：un-(unhappy)，re-(redo)，dis-(dislike)，im/in-(impossible)\n常见后缀：-ful(helpful)，-less(useless)，-ness(kindness)，-tion(education)，-ly(quickly)","phonetic":"","hint":"通过词缀推测词义","example":"unhappy, rebuild, dislike, useful, happiness, quickly","tags":["语法","词汇","七年级"]},
        {"id":"mg_023","type":"grammar","front":"句子基本成分","back":"主语（S）+ 谓语（V）+ 宾语（O）\n+ 表语（P）补足语（C）状语（A）\n五种基本句型：SV/SVP/SVO/SVOO/SVOC","phonetic":"","hint":"主谓宾是核心","example":"She sings. (SV) He is tall. (SVP) I love her. (SVO)","tags":["语法","句子结构","七年级"]},
        {"id":"mg_024","type":"grammar","front":"反义疑问句","back":"肯定句 + 否定疑问？\n否定句 + 肯定疑问？\n原则：前肯后否，前否后肯，时态一致","phonetic":"","hint":"前肯后否，前否后肯","example":"It is hot, isn't it? She can't swim, can she?","tags":["语法","句型","八年级"]},
        {"id":"mg_025","type":"grammar","front":"强调句 It is…that","back":"It is/was + 强调部分 + that + 其他\n强调人时，可用who代替that","phonetic":"","hint":"It is…that强调某一成分","example":"It was Tom that broke the window. It is in the park that I met her.","tags":["语法","强调句","九年级"]},
        {"id":"mg_026","type":"grammar","front":"独立主格结构","back":"名词/代词 + 现在分词/过去分词/形容词/名词\n独立存在，修饰整个句子","phonetic":"","hint":"有自己的逻辑主语","example":"Weather permitting, we will go hiking. All things considered, it is a good plan.","tags":["语法","结构","九年级"]},
        {"id":"mg_027","type":"grammar","front":"主谓一致","back":"就近原则：either…or/neither…nor/not only…but also\n就远原则：as well as/with/along with\n集合名词：team/class作整体用单数，作成员用复数","phonetic":"","hint":"谓语动词与主语在人称和数上保持一致","example":"Either you or he is right. The team is strong. The team are arguing.","tags":["语法","主谓一致","八年级"]},
        {"id":"mg_028","type":"grammar","front":"关系副词","back":"where：表地点（先行词是地点）\nwhen：表时间（先行词是时间）\nwhy：表原因（先行词是reason）","phonetic":"","hint":"关系副词=介词+which","example":"I know the place where he was born. I remember the day when we met.","tags":["语法","从句","九年级"]},
        {"id":"mg_029","type":"grammar","front":"as引导的从句","back":"as：①时间（当…时）②原因（因为）③方式（像…一样）\nas…as（同等比较）\nthe same…as（和…相同）","phonetic":"","hint":"as多种用法","example":"As she grew older, she became wiser. Do as I say. She is as tall as me.","tags":["语法","从句","九年级"]},
        {"id":"mg_030","type":"grammar","front":"数词：基数词与序数词","back":"基数词：one/two/three…twenty/hundred/thousand\n序数词：first/second/third，第四开始+th\n特殊：five→fifth，twelve→twelfth，twenty→twentieth","phonetic":"","hint":"first/second/third特殊，其他加th","example":"the first lesson, the twenty-first century, May 1st","tags":["语法","数词","七年级"]},
    ]
}
middle_grammar['meta']['count'] = len(middle_grammar['cards'])

import os
os.makedirs('C:/SAPDevelop/SAPLearning/kids-memory/data/builtin/english/primary', exist_ok=True)

with open('C:/SAPDevelop/SAPLearning/kids-memory/data/builtin/english/primary/primary_grammar.json', 'w', encoding='utf-8') as f:
    json.dump(primary_grammar, f, ensure_ascii=False, indent=2)
print(f'primary grammar: {len(primary_grammar["cards"])} cards')

with open('C:/SAPDevelop/SAPLearning/kids-memory/data/builtin/english/middle/middle_grammar.json', 'w', encoding='utf-8') as f:
    json.dump(middle_grammar, f, ensure_ascii=False, indent=2)
print(f'middle grammar: {len(middle_grammar["cards"])} cards')
