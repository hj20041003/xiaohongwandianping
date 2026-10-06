-- ----------------------------
-- Table structure for tb_blog
-- ----------------------------
DROP TABLE IF EXISTS tb_blog;
CREATE TABLE tb_blog  (
                            id bigint  NOT NULL AUTO_INCREMENT,
                            shop_id bigint NOT NULL,
                            user_id bigint  NOT NULL,
                            title varchar(255) NOT NULL,
                            images varchar(2048) NOT NULL,
                            content varchar(2048) NOT NULL,
                            liked int  NULL DEFAULT 0,
                            comments int  NULL DEFAULT NULL,
                            create_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            update_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            PRIMARY KEY (id)
);

-- ----------------------------
-- Records of tb_blog
-- ----------------------------
INSERT INTO tb_blog VALUES (4, 4, 2, '无尽浪漫的夜晚丨在万花丛中摇晃着红酒杯🍷品战斧牛排🥩', '/imgs/blogs/7/14/4771fefb-1a87-4252-816c-9f7ec41ffa4a.jpg,/imgs/blogs/4/10/2f07e3c9-ddce-482d-9ea7-c21450f8d7cd.jpg,/imgs/blogs/2/6/b0756279-65da-4f2d-b62a-33f74b06454a.jpg,/imgs/blogs/10/7/7e97f47d-eb49-4dc9-a583-95faa7aed287.jpg,/imgs/blogs/1/2/4a7b496b-2a08-4af7-aa95-df2c3bd0ef97.jpg,/imgs/blogs/14/3/52b290eb-8b5d-403b-8373-ba0bb856d18e.jpg', '生活就是一半烟火·一半诗意<br/>手执烟火谋生活·心怀诗意以谋爱·<br/>当然<br/>\r\n男朋友给不了的浪漫要学会自己给🍒<br/>\n无法重来的一生·尽量快乐.<br/><br/>🏰「小筑里·神秘浪漫花园餐厅」🏰<br/><br/>\n💯这是一家最最最美花园的西餐厅·到处都是花餐桌上是花前台是花  美好无处不在\n品一口葡萄酒，维亚红酒马瑟兰·微醺上头工作的疲惫消失无际·生如此多娇🍃<br/><br/>📍地址:延安路200号(家乐福面)<br/><br/>🚌交通:地铁①号线定安路B口出右转过下通道右转就到啦～<br/><br/>--------------🥣菜品详情🥣---------------<br/><br/>「战斧牛排]<br/>\n超大一块战斧牛排经过火焰的炙烤发出阵阵香，外焦里嫩让人垂涎欲滴，切开牛排的那一刻，牛排的汁水顺势流了出来，分熟的牛排肉质软，简直细嫩到犯规，一刻都等不了要放入嘴里咀嚼～<br/><br/>「奶油培根意面」<br/>太太太好吃了💯<br/>我真的无法形容它的美妙，意面混合奶油香菇的香味真的太太太香了，我真的舔盘了，一丁点美味都不想浪费‼️<br/><br/><br/>「香菜汁烤鲈鱼」<br/>这个酱是辣的 真的绝好吃‼️<br/>鲈鱼本身就很嫩没什么刺，烤过之后外皮酥酥的，鱼肉蘸上酱料根本停不下来啊啊啊啊<br/>能吃辣椒的小伙伴一定要尝尝<br/><br/>非常可 好吃子🍽\n<br/>--------------🍃个人感受🍃---------------<br/><br/>【👩🏻‍🍳服务】<br/>小姐姐特别耐心的给我们介绍彩票 <br/>推荐特色菜品，拍照需要帮忙也是尽心尽力配合，太爱他们了<br/><br/>【🍃环境】<br/>比较有格调的西餐厅 整个餐厅的布局可称得上的万花丛生 有种在人间仙境的感觉🌸<br/>集美食美酒与鲜花为一体的风格店铺 令人向往<br/>烟火皆是生活 人间皆是浪漫<br/>', 1, 104, '2021-12-28 19:50:01', '2022-03-10 14:26:34');
INSERT INTO tb_blog VALUES (5, 1, 2, '人均30💰杭州这家港式茶餐厅我疯狂打call‼️', '/imgs/blogs/4/7/863cc302-d150-420d-a596-b16e9232a1a6.jpg,/imgs/blogs/11/12/8b37d208-9414-4e78-b065-9199647bb3e3.jpg,/imgs/blogs/4/1/fa74a6d6-3026-4cb7-b0b6-35abb1e52d11.jpg,/imgs/blogs/9/12/ac2ce2fb-0605-4f14-82cc-c962b8c86688.jpg,/imgs/blogs/4/0/26a7cd7e-6320-432c-a0b4-1b7418f45ec7.jpg,/imgs/blogs/15/9/cea51d9b-ac15-49f6-b9f1-9cf81e9b9c85.jpg', '又吃到一家好吃的茶餐厅🍴环境是怀旧tvb港风📺边吃边拍照片📷几十种菜品均价都在20+💰可以是很平价了！<br>·<br>店名：九记冰厅(远洋店)<br>地址：杭州市丽水路远洋乐堤港负一楼（溜冰场旁边）<br>·<br>✔️黯然销魂饭（38💰）<br>这碗饭我吹爆！米饭上盖满了甜甜的叉烧 还有两颗溏心蛋🍳每一粒米饭都裹着浓郁的酱汁 光盘了<br>·<br>✔️铜锣湾漏奶华（28💰）<br>黄油吐司烤的脆脆的 上面洒满了可可粉🍫一刀切开 奶盖流心像瀑布一样流出来  满足<br>·<br>✔️神仙一口西多士士（16💰）<br>简简单单却超级好吃！西多士烤的很脆 黄油味浓郁 面包体超级柔软 上面淋了炼乳<br>·<br>✔️怀旧五柳炸蛋饭（28💰）<br>四个鸡蛋炸成蓬松的炸蛋！也太好吃了吧！还有大块鸡排 上淋了酸甜的酱汁 太合我胃口了！！<br>·<br>✔️烧味双拼例牌（66💰）<br>选了烧鹅➕叉烧 他家烧腊品质真的惊艳到我！据说是每日广州发货 到店现烧现卖的黑棕鹅 每口都是正宗的味道！肉质很嫩 皮超级超级酥脆！一口爆油！叉烧肉也一点都不柴 甜甜的很入味 搭配梅子酱很解腻 ！<br>·<br>✔️红烧脆皮乳鸽（18.8💰）<br>乳鸽很大只 这个价格也太划算了吧， 肉质很有嚼劲 脆皮很酥 越吃越香～<br>·<br>✔️大满足小吃拼盘（25💰）<br>翅尖➕咖喱鱼蛋➕蝴蝶虾➕盐酥鸡<br>zui喜欢里面的咖喱鱼！咖喱酱香甜浓郁！鱼蛋很q弹～<br>·<br>✔️港式熊仔丝袜奶茶（19💰）<br>小熊🐻造型的奶茶冰也太可爱了！颜值担当 很地道的丝袜奶茶 茶味特别浓郁～<br>·', 1, 0, '2021-12-28 20:57:49', '2022-03-10 09:21:39');
INSERT INTO tb_blog VALUES (6, 10, 1, '杭州周末好去处｜💰50就可以骑马啦🐎', '/imgs/blogs/blog1.jpg', '杭州周末好去处｜💰50就可以骑马啦🐎', 1, 0, '2022-01-11 16:05:47', '2022-03-10 09:21:41');
INSERT INTO tb_blog VALUES (7, 10, 1, '杭州周末好去处｜💰50就可以骑马啦🐎', '/imgs/blogs/blog1.jpg', '杭州周末好去处｜💰50就可以骑马啦🐎', 1, 0, '2022-01-11 16:05:47', '2022-03-10 09:21:42');
-- 以下为全国化改造新增：每个新城市挑 2 家店各配 1 篇笔记。
-- 笔记本身没有城市字段，城市是顺着 shop_id 关联到 tb_shop.city 的，
-- 所以 /blog/hot?city=xxx 的筛选是 join 出来的，不需要额外加列。
INSERT INTO tb_blog VALUES (8, 16, 1, '簋街的麻辣小龙虾🦞我一次能干三斤', '/imgs/blogs/0/0/feb2a83e-5646-46c0-a982-5e43fed31b22.jpg,/imgs/blogs/10/7/7e97f47d-eb49-4dc9-a583-95faa7aed287.jpg,/imgs/blogs/12/9/aab78497-ec7a-46da-820a-0ee0bbe103a3.jpg', '东直门内大街一整条街都是小龙虾的味道，随便挑一家都不难吃。<br/>这次去的是排到腿软的胡大，晚上十点还在叫号。<br/><br/>✔️麻辣小龙虾（138/份）虾个头大、壳薄，剥起来不费劲，麻辣底汤里泡一会儿更入味<br/>✔️馋嘴蛙 辣得很正，蛙肉滑嫩<br/>✔️烤脑花 上面一层辣椒面，配啤酒刚刚好<br/><br/>📍地址：东直门内大街235号<br/>🚇交通：地铁2号线东直门站D口，出来往西走10分钟<br/><br/>⚠️建议八点前到，晚了至少等一小时。', 42, 108, '2022-02-28 16:28:00', '2022-03-11 10:08:16');
INSERT INTO tb_blog VALUES (9, 18, 5, '三里屯的京味儿新派烤鸭，皮脆到掉渣', '/imgs/blogs/10/7/7e97f47d-eb49-4dc9-a583-95faa7aed287.jpg,/imgs/blogs/12/9/aab78497-ec7a-46da-820a-0ee0bbe103a3.jpg,/imgs/blogs/14/3/52b290eb-8b5d-403b-8373-ba0bb856d18e.jpg', '局气的装修是老北京胡同风，进门先看见鸟笼和自行车。<br/><br/>「局气烤鸭」皮真的很脆，蘸白糖先吃一片，油脂化在嘴里。<br/>「京味炸酱面」面条筋道，酱是自家炒的，不齁咸。<br/>「豌豆黄」做成做成小方砖，清甜解腻。<br/><br/>📍地址：三里屯路19号院3号楼<br/>人均105，两个人点一个套餐再加一份鸭架汤刚好。', 26, 41, '2022-02-20 17:39:00', '2022-03-11 10:09:33');
INSERT INTO tb_blog VALUES (10, 26, 2, '豫园这家百年小笼，我一个人吃了三笼🥟', '/imgs/blogs/12/1/1afd01e5-0e16-43c2-b655-4bf733f95cfc.jpg,/imgs/blogs/14/13/2ec4622e-de82-4bb3-9acf-33b589850cd2.jpg,/imgs/blogs/2/1/7b31a5da-4ee3-4c9e-a38a-2dbc8de0345a.jpg', '南翔馒头店的门永远是排着的，一楼打包窗口其实快很多。<br/><br/>✔️鲜肉小笼（42/笼）皮薄到透光，先咬个小口吸汤，不然一定烫嘴<br/>✔️蟹粉小笼（88/笼）蟹味足，贵是贵了点但值<br/>✔️蟹壳黄 咸口的，酥得掉渣<br/><br/>📍地址：豫园路85号<br/>🚇交通：地铁10号线豫园站1号口<br/><br/>💡九点前去人最少，十一点以后基本要排半小时以上。', 36, 92, '2022-02-21 18:50:00', '2022-03-11 10:10:50');
INSERT INTO tb_blog VALUES (11, 28, 6, '思南路的一碗黄鱼面，是上海人的深夜食堂', '/imgs/blogs/14/13/31bc9613-3637-4a36-9082-e37ce0909cbd.jpg,/imgs/blogs/2/2/7fc130a4-67b7-4339-9626-9680b198d9a0.jpg,/imgs/blogs/3/15/af0db3fa-5cf9-4eeb-a9fe-938de64bddc6.jpg', '阿娘面馆开了二十多年，店面很小，三四张桌子。<br/><br/>「黄鱼面」58 一碗，黄鱼是现拆的，汤头奶白，没有腥味。<br/>「辣肉面」22，肉丁给得很实在，拌开之后香味全出来了。<br/><br/>📍地址：思南路36号<br/>⏰只做早市和午市，下午两点半就收摊，去晚了吃不上。', 18, 27, '2022-02-22 19:01:00', '2022-03-11 10:11:07');
INSERT INTO tb_blog VALUES (12, 35, 1, '广州人的一天从早茶开始丨点都德测评', '/imgs/blogs/15/9/cea51d9b-ac15-49f6-b9f1-9cf81e9b9c85.jpg,/imgs/blogs/3/12/9b19dd28-1eb1-4b70-bdc2-95544eecfeb2.jpg,/imgs/blogs/5/0/e36d681c-ea07-4afb-bcb6-8073c51b6a79.jpg', '早上七点就开门，八点半到已经有本地阿叔在叹茶了。<br/><br/>✔️虾饺皇 皮薄馅足，一只里面塞了三四只虾<br/>✔️干蒸烧卖 上面一撮蟹子在嘴里爆开<br/>✔️凤爪 炖得很烂，轻轻一抿就脱骨<br/>✔️叉烧包 掰开流汁，甜咸刚好<br/>✔️艇仔粥 料给得足，花生和油条碎很香<br/><br/>📍地址：惠福东路470号<br/>💰人均 78，茶位费 6 元/位。', 28, 63, '2022-02-23 08:12:00', '2022-03-11 10:12:24');
INSERT INTO tb_blog VALUES (13, 38, 2, '惠福东这家肠粉，我连吃了三天早餐', '/imgs/blogs/2/4/7ed91c85-975a-40dd-9f36-abb2e87a1155.jpg,/imgs/blogs/4/10/2f07e3c9-ddce-482d-9ea7-c21450f8d7cd.jpg,/imgs/blogs/7/1/6f4c2442-1d3b-436f-8d49-cc704f9f0bf8.jpg', '银记的肠粉是布拉肠，米浆现磨，皮薄得能看见里面的料。<br/><br/>「鲜虾肠粉」18，虾仁给得很足<br/>「牛肉肠粉」15，牛肉腌过，很嫩<br/>「艇仔粥」12，配肠粉刚好<br/><br/>📍地址：文昌北路236号<br/>⏰六点半开门，工作日八点前去基本不用等。', 15, 34, '2022-02-24 09:23:00', '2022-03-11 10:13:41');
INSERT INTO tb_blog VALUES (14, 46, 5, '华强北这家潮汕牛肉火锅，现切现涮🥩', '/imgs/blogs/4/0/26a7cd7e-6320-432c-a0b4-1b7418f45ec7.jpg,/imgs/blogs/6/0/081b4b46-b2c0-47b1-8e2a-8f620d0307fb.jpg,/imgs/blogs/9/4/3ede4ee9-b27a-4548-bf83-31a61e359511.jpg', '八合里海记的牛肉是当天从潮汕送过来的，进门就能看见师傅在明档切肉。<br/><br/>✔️吊龙 涮八秒，粉粉的刚好，蘸沙茶酱绝配<br/>✔️五花趾 有嚼劲，肉味更浓<br/>✔️牛肉丸 手打的，弹到可以在碗里蹦<br/><br/>📍地址：振兴路111号<br/>🚇地铁2号线燕南站A口<br/><br/>💡锅底选牛骨清汤，别选麻辣，不然吃不出肉的好坏。', 24, 52, '2022-02-25 10:34:00', '2022-03-11 10:14:58');
INSERT INTO tb_blog VALUES (15, 49, 6, '福田CBD的木屋烧烤，加班后的深夜续命摊🍢', '/imgs/blogs/5/2/fdc6cbb0-ddc5-4525-884a-9e88f07cf2d8.jpg,/imgs/blogs/9/12/ac2ce2fb-0605-4f14-82cc-c962b8c86688.jpg,/imgs/blogs/1/2/4a7b496b-2a08-4af7-aa95-df2c3bd0ef97.jpg', '晚上十一点过去还在满座，撸串的氛围特别好。<br/><br/>「烤五花肉」油脂被烤掉了，蘸辣椒面很香<br/>「烤茄子」蒜蓉给得足，一整个挖着吃<br/>「烤鸡翅」中规中矩，但胜在便宜<br/><br/>📍地址：福华三路88号<br/>💰人均 88，啤酒买二送一。', 9, 15, '2022-02-26 11:45:00', '2022-03-11 10:15:15');
INSERT INTO tb_blog VALUES (16, 55, 1, '成都火锅天花板？小龙坎春熙路总店实测🌶️', '/imgs/blogs/1/2/f052df92-fc05-41a6-866e-d6da63b27645.jpg,/imgs/blogs/12/1/1afd01e5-0e16-43c2-b655-4bf733f95cfc.jpg,/imgs/blogs/14/13/2ec4622e-de82-4bb3-9acf-33b589850cd2.jpg', '排号两百多桌，等了一个半小时，好在味道没让我失望。<br/><br/>✔️牛油锅底 越煮越香，不糊锅<br/>✔️毛肚 七上八下，脆得很<br/>✔️鸭肠 一根下锅十五秒就捞，脆弹<br/>✔️酥肉 现炸的，撒花椒粉直接吃也别有风味<br/><br/>📌小技巧：点鸳鸯锅，用清汤锅涮蔬菜，红锅只涮肉。<br/>📍地址：中纱帽街8号', 31, 74, '2022-02-27 12:56:00', '2022-03-11 10:16:32');
INSERT INTO tb_blog VALUES (17, 59, 2, '玉林西路的深夜，一串肥肠粉和一首民谣', '/imgs/blogs/13/1/6b091b4c-7870-4df8-9b21-5db9852db005.jpg,/imgs/blogs/15/0/b61bf453-28fc-4824-84c8-783803464c4f.jpg,/imgs/blogs/2/3/39d65be4-af94-458d-b6de-bc8ca20735bb.jpg', '玉林是成都最松弛的地方，晚上八点整条街都是小馆子。<br/><br/>甘食记的肥肠粉 12 一碗，肥肠处理得很干净，粉条爽滑，加一个锅盔泡进去。<br/>吃完往西走两百米就是小酒馆，门口永远有人在拍照。<br/><br/>📍地址：玉林西路123号<br/>⏰早七点到晚八点，卖完就关门。', 12, 22, '2022-02-28 13:07:00', '2022-03-11 10:17:49');
INSERT INTO tb_blog VALUES (18, 65, 5, '解放碑的九宫格老火锅，辣到我怀疑人生🔥', '/imgs/blogs/7/14/4771fefb-1a87-4252-816c-9f7ec41ffa4a.jpg,/imgs/blogs/0/5/e3e7c9e7-6654-4065-b47a-b86eb4541c33.jpg,/imgs/blogs/11/0/cdbdf886-11bc-409c-980e-59880f9a25df.png', '珮姐的锅底是纯牛油，红汤滚起来那一下香味直接上头。<br/><br/>✔️老肉片 厚切，涮久了也不柴<br/>✔️鲜鹅肠 脆得出声<br/>✔️土豆片 薄薄的，涮十秒就是脆的<br/>✔️冰汤圆 解辣神器，一定要点<br/><br/>📍地址：中华路8号<br/>⚠️不能吃辣的一定要点微辣，重庆的微辣和外地不是一个概念。', 21, 47, '2022-02-20 14:18:00', '2022-03-11 10:18:06');
INSERT INTO tb_blog VALUES (19, 68, 6, '重庆人的早晨，是一碗七块钱的豌杂面', '/imgs/blogs/11/4/fbfe0547-bd5d-454c-98c4-411e2e0dce65.jpg,/imgs/blogs/13/4/1bb3d189-a34a-4809-b062-323cda7d19a9.jpg,/imgs/blogs/15/3/fd5802b1-d4a5-4e45-badd-05cbc46c8c3d.jpg', '花市豌杂面在解放碑开了很多年，早上六点半就开门。<br/><br/>「豌杂面」12 二两，豌豆煮得又粉又面，杂酱咸香，拌开之后每一根面都挂上酱。<br/>再加一个卤蛋，一顿早饭就齐了。<br/><br/>📍地址：青年路32号<br/>💡本地人都是「二两豌杂，多辣，加蛋」。', 8, 13, '2022-02-21 15:29:00', '2022-03-11 10:19:23');
INSERT INTO tb_blog VALUES (20, 75, 1, '西安的肉夹馍，现打的馍才叫馍🥙', '/imgs/blogs/3/12/9b19dd28-1eb1-4b70-bdc2-95544eecfeb2.jpg,/imgs/blogs/5/0/e36d681c-ea07-4afb-bcb6-8073c51b6a79.jpg,/imgs/blogs/7/3/2f6769c9-21de-42f8-adc0-77873273997f.jpg', '子午路张记的白吉馍是现打的，出炉那一下能听见「咔」的一声。<br/><br/>「腊汁肉夹馍」12，肥瘦相间，肉汁浸到馍里，咬一口会流。<br/>「凉皮」8，擀面皮更筋道，辣椒油是自家泼的。<br/>「冰峰」3，吃这套必须配冰峰。<br/><br/>📍地址：子午路8号<br/>⏰早上七点到晚上九点，中午排队最久。', 17, 29, '2022-02-22 16:40:00', '2022-03-11 10:20:40');
INSERT INTO tb_blog VALUES (21, 76, 5, '钟楼旁一碗羊肉泡馍，掰馍掰到手酸', '/imgs/blogs/7/7/1185247e-ae82-49f2-bdc0-17ef23a94f0d.jpg,/imgs/blogs/1/2/38f7e67d-7b26-41fd-bcf5-eebf71914230.jpg,/imgs/blogs/11/4/fbfe0547-bd5d-454c-98c4-411e2e0dce65.jpg', '老孙家的泡馍要自己掰，馍掰得越小越入味，服务员说最好掰成黄豆大小。<br/><br/>「优质羊肉泡馍」45，汤是羊骨吊了一夜的，浓而不膻。<br/>配一碟糖蒜和辣酱，吃完浑身都热了。<br/><br/>📍地址：东大街364号<br/>💡掰馍大约要花二十分钟，赶时间的话可以让师傅机器切。', 6, 11, '2022-02-23 17:51:00', '2022-03-11 10:21:57');
INSERT INTO tb_blog VALUES (22, 3, 2, '运河边的杭帮菜，西湖醋鱼居然不腥', '/imgs/blogs/15/0/b61bf453-28fc-4824-84c8-783803464c4f.jpg,/imgs/blogs/2/3/39d65be4-af94-458d-b6de-bc8ca20735bb.jpg,/imgs/blogs/4/1/fa74a6d6-3026-4cb7-b0b6-35abb1e52d11.jpg', '新白鹿是杭州本地人常去的馆子，性价比很高。<br/><br/>「西湖醋鱼」用的是草鱼，浇汁酸甜平衡，趁热吃完全没有土腥味。<br/>「东坡肉」一小盅，肥而不腻，配米饭一绝。<br/>「龙井虾仁」虾仁清甜，茶香很淡。<br/><br/>📍地址：台州路2号运河上街购物中心F5', 14, 25, '2022-02-24 18:02:00', '2022-03-11 10:22:14');
INSERT INTO tb_blog VALUES (23, 5, 6, '上塘路的海底捞，是深夜最靠谱的选择', '/imgs/blogs/4/10/2f07e3c9-ddce-482d-9ea7-c21450f8d7cd.jpg,/imgs/blogs/7/1/6f4c2442-1d3b-436f-8d49-cc704f9f0bf8.jpg,/imgs/blogs/0/0/feb2a83e-5646-46c0-a982-5e43fed31b22.jpg', '凌晨一点过去的，还在正常营业，服务依旧在线。<br/><br/>锅底点了番茄加清汤，番茄锅先喝一碗汤。<br/>虾滑是现挤的，服务员会帮忙下。<br/><br/>📍地址：上塘路458号水晶城购物中心F6<br/>💡工作日晚上十点后去不用排队。', 5, 9, '2022-02-25 19:13:00', '2022-03-11 10:23:31');

-- ----------------------------
-- Table structure for tb_blog_comments
-- ----------------------------
DROP TABLE IF EXISTS tb_blog_comments;
CREATE TABLE tb_blog_comments  (
                                     id bigint  NOT NULL AUTO_INCREMENT,
                                     user_id bigint  NOT NULL,
                                     blog_id bigint  NOT NULL,
                                     parent_id bigint  NOT NULL,
                                     answer_id bigint  NOT NULL,
                                     content varchar(255) NOT NULL,
                                     liked int  NULL DEFAULT NULL,
                                     status tinyint  NULL DEFAULT NULL,
                                     create_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                     update_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                     PRIMARY KEY (id)
);

-- ----------------------------
-- Records of tb_blog_comments
-- ----------------------------

-- ----------------------------
-- Table structure for tb_follow
-- ----------------------------
DROP TABLE IF EXISTS tb_follow;
CREATE TABLE tb_follow  (
                              id bigint NOT NULL AUTO_INCREMENT,
                              user_id bigint  NOT NULL,
                              follow_user_id bigint  NOT NULL,
                              create_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              PRIMARY KEY (id)
);

-- ----------------------------
-- Records of tb_follow
-- ----------------------------

-- ----------------------------
-- Table structure for tb_seckill_voucher
-- ----------------------------
DROP TABLE IF EXISTS tb_seckill_voucher;
CREATE TABLE tb_seckill_voucher  (
                                       voucher_id bigint  NOT NULL,
                                       stock int NOT NULL,
                                       create_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                       begin_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                       end_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                       update_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                       PRIMARY KEY (voucher_id)
);

-- ----------------------------
-- Records of tb_seckill_voucher
-- ----------------------------

-- ----------------------------
-- Table structure for tb_shop
-- ----------------------------
DROP TABLE IF EXISTS tb_shop;
-- 城市。原版种子数据只有杭州，14 家全挤在拱墅区，首页那个「切换城市」
-- 自然也就成了摆设。加这一列之后，店铺和笔记才谈得上按城市筛选。
CREATE TABLE tb_shop  (
                            id bigint  NOT NULL AUTO_INCREMENT,
                            name varchar(128) NOT NULL,
                            type_id bigint  NOT NULL,
                            images varchar(1024) NOT NULL,
                            area varchar(128) NULL DEFAULT NULL,
                            -- 省 / 市 / 区三级。区域名必须和 regions.json 里的写法逐字一致，
                            -- 不一致的话筛选会稳定返回空，而且不报错——最安静的一种 bug。
                            province varchar(32) NOT NULL DEFAULT '浙江省',
                            city varchar(32) NOT NULL DEFAULT '杭州',
                            district varchar(32) NULL DEFAULT NULL,
                            address varchar(255) NOT NULL,
                            x double  NOT NULL,
                            y double  NOT NULL,
                            avg_price bigint  NULL DEFAULT NULL,
                            sold int   NOT NULL,
                            comments int   NOT NULL,
                            score int   NOT NULL,
                            open_hours varchar(32) NULL DEFAULT NULL,
                            create_time timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                            update_time timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                            PRIMARY KEY (id),
                            INDEX foreign_key_type(type_id),
                            INDEX idx_shop_city(city),
                            INDEX idx_shop_region(province, city, district)
);

-- ----------------------------
-- Records of tb_shop
-- ----------------------------
INSERT INTO tb_shop VALUES (1, '103茶餐厅', 1, 'https://qcloud.dpfile.com/pc/jiclIsCKmOI2arxKN1Uf0Hx3PucIJH8q0QSz-Z8llzcN56-_QiKuOvyio1OOxsRtFoXqu0G3iT2T27qat3WhLVEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vfCF2ubeXzk49OsGrXt_KYDCngOyCwZK-s3fqawWswzk.jpg,https://qcloud.dpfile.com/pc/IOf6VX3qaBgFXFVgp75w-KKJmWZjFc8GXDU8g9bQC6YGCpAmG00QbfT4vCCBj7njuzFvxlbkWx5uwqY2qcjixFEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vmIU_8ZGOT1OjpJmLxG6urQ.jpg', '大关', '浙江省', '杭州', '拱墅区', '金华路锦昌文华苑29号', 120.149192, 30.316078, 80, 0000004215, 0000003035, 37, '10:00-22:00', '2021-12-22 18:10:39', '2022-01-13 17:32:19');
INSERT INTO tb_shop VALUES (2, '蔡馬洪涛烤肉·老北京铜锅涮羊肉', 1, 'https://p0.meituan.net/bbia/c1870d570e73accbc9fee90b48faca41195272.jpg,http://p0.meituan.net/mogu/397e40c28fc87715b3d5435710a9f88d706914.jpg,https://qcloud.dpfile.com/pc/MZTdRDqCZdbPDUO0Hk6lZENRKzpKRF7kavrkEI99OxqBZTzPfIxa5E33gBfGouhFuzFvxlbkWx5uwqY2qcjixFEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vmIU_8ZGOT1OjpJmLxG6urQ.jpg', '拱宸桥/上塘', '浙江省', '杭州', '拱墅区', '上塘路1035号（中国工商银行旁）', 120.151505, 30.333422, 85, 0000002160, 0000001460, 46, '11:30-03:00', '2021-12-22 19:00:13', '2022-01-11 16:12:26');
INSERT INTO tb_shop VALUES (3, '新白鹿餐厅(运河上街店)', 1, 'https://p0.meituan.net/biztone/694233_1619500156517.jpeg,https://img.meituan.net/msmerchant/876ca8983f7395556eda9ceb064e6bc51840883.png,https://img.meituan.net/msmerchant/86a76ed53c28eff709a36099aefe28b51554088.png', '运河上街', '浙江省', '杭州', '拱墅区', '台州路2号运河上街购物中心F5', 120.151954, 30.32497, 61, 0000012035, 0000008045, 47, '10:30-21:00', '2021-12-22 19:10:05', '2022-01-11 16:12:42');
INSERT INTO tb_shop VALUES (4, 'Mamala(杭州远洋乐堤港店)', 1, 'https://img.meituan.net/msmerchant/232f8fdf09050838bd33fb24e79f30f9606056.jpg,https://qcloud.dpfile.com/pc/rDe48Xe15nQOHCcEEkmKUp5wEKWbimt-HDeqYRWsYJseXNncvMiXbuED7x1tXqN4uzFvxlbkWx5uwqY2qcjixFEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vmIU_8ZGOT1OjpJmLxG6urQ.jpg', '拱宸桥/上塘', '浙江省', '杭州', '拱墅区', '丽水路66号远洋乐堤港商城2期1层B115号', 120.146659, 30.312742, 290, 0000013519, 0000009529, 49, '11:00-22:00', '2021-12-22 19:17:15', '2022-01-11 16:12:51');
INSERT INTO tb_shop VALUES (5, '海底捞火锅(水晶城购物中心店）', 1, 'https://img.meituan.net/msmerchant/054b5de0ba0b50c18a620cc37482129a45739.jpg,https://img.meituan.net/msmerchant/59b7eff9b60908d52bd4aea9ff356e6d145920.jpg,https://qcloud.dpfile.com/pc/Qe2PTEuvtJ5skpUXKKoW9OQ20qc7nIpHYEqJGBStJx0mpoyeBPQOJE4vOdYZwm9AuzFvxlbkWx5uwqY2qcjixFEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vmIU_8ZGOT1OjpJmLxG6urQ.jpg', '大关', '浙江省', '杭州', '拱墅区', '上塘路458号水晶城购物中心F6', 120.15778, 30.310633, 104, 0000004125, 0000002764, 49, '10:00-07:00', '2021-12-22 19:20:58', '2022-01-11 16:13:01');
INSERT INTO tb_shop VALUES (6, '幸福里老北京涮锅（丝联店）', 1, 'https://img.meituan.net/msmerchant/e71a2d0d693b3033c15522c43e03f09198239.jpg,https://img.meituan.net/msmerchant/9f8a966d60ffba00daf35458522273ca658239.jpg,https://img.meituan.net/msmerchant/ef9ca5ef6c05d381946fe4a9aa7d9808554502.jpg', '拱宸桥/上塘', '浙江省', '杭州', '拱墅区', '金华南路189号丝联166号', 120.148603, 30.318618, 130, 0000009531, 0000007324, 46, '11:00-13:50,17:00-20:50', '2021-12-22 19:24:53', '2022-01-11 16:13:09');
INSERT INTO tb_shop VALUES (7, '炉鱼(拱墅万达广场店)', 1, 'https://img.meituan.net/msmerchant/909434939a49b36f340523232924402166854.jpg,https://img.meituan.net/msmerchant/32fd2425f12e27db0160e837461c10303700032.jpg,https://img.meituan.net/msmerchant/f7022258ccb8dabef62a0514d3129562871160.jpg', '北部新城', '浙江省', '杭州', '拱墅区', '杭行路666号万达商业中心4幢2单元409室(铺位号4005)', 120.124691, 30.336819, 85, 0000002631, 0000001320, 47, '00:00-24:00', '2021-12-22 19:40:52', '2022-01-11 16:13:19');
INSERT INTO tb_shop VALUES (8, '浅草屋寿司（运河上街店）', 1, 'https://img.meituan.net/msmerchant/cf3dff697bf7f6e11f4b79c4e7d989e4591290.jpg,https://img.meituan.net/msmerchant/0b463f545355c8d8f021eb2987dcd0c8567811.jpg,https://img.meituan.net/msmerchant/c3c2516939efaf36c4ccc64b0e629fad587907.jpg', '运河上街', '浙江省', '杭州', '拱墅区', '拱墅区金华路80号运河上街B1', 120.150526, 30.325231, 88, 0000002406, 0000001206, 46, ' 11:00-21:30', '2021-12-22 19:51:06', '2022-01-11 16:13:25');
INSERT INTO tb_shop VALUES (9, '羊老三羊蝎子牛仔排北派炭火锅(运河上街店)', 1, 'https://p0.meituan.net/biztone/163160492_1624251899456.jpeg,https://img.meituan.net/msmerchant/e478eb16f7e31a7f8b29b5e3bab6de205500837.jpg,https://img.meituan.net/msmerchant/6173eb1d18b9d70ace7fdb3f2dd939662884857.jpg', '运河上街', '浙江省', '杭州', '拱墅区', '台州路2号运河上街购物中心F5', 120.150598, 30.325251, 101, 0000002763, 0000001363, 44, '11:00-21:30', '2021-12-22 19:53:59', '2022-01-11 16:13:34');
INSERT INTO tb_shop VALUES (10, '开乐迪KTV（运河上街店）', 2, 'https://p0.meituan.net/joymerchant/a575fd4adb0b9099c5c410058148b307-674435191.jpg,https://p0.meituan.net/merchantpic/68f11bf850e25e437c5f67decfd694ab2541634.jpg,https://p0.meituan.net/dpdeal/cb3a12225860ba2875e4ea26c6d14fcc197016.jpg', '运河上街', '浙江省', '杭州', '拱墅区', '台州路2号运河上街购物中心F4', 120.149093, 30.324666, 67, 0000026891, 0000000902, 37, '00:00-24:00', '2021-12-22 20:25:16', '2021-12-22 20:25:16');
INSERT INTO tb_shop VALUES (11, 'INLOVE KTV(水晶城店)', 2, 'https://p0.meituan.net/dpmerchantpic/53e74b200211d68988a4f02ae9912c6c1076826.jpg,https://qcloud.dpfile.com/pc/4iWtIvzLzwM2MGgyPu1PCDb4SWEaKqUeHm--YAt1EwR5tn8kypBcqNwHnjg96EvT_Gd2X_f-v9T8Yj4uLt25Gg.jpg,https://qcloud.dpfile.com/pc/WZsJWRI447x1VG2x48Ujgu7vwqksi_9WitdKI4j3jvIgX4MZOpGNaFtM93oSSizbGybIjx5eX6WNgCPvcASYAw.jpg', '水晶城', '浙江省', '杭州', '拱墅区', '上塘路458号水晶城购物中心6层', 120.15853, 30.310002, 75, 0000035977, 0000005684, 47, '11:30-06:00', '2021-12-22 20:29:02', '2021-12-22 20:39:00');
INSERT INTO tb_shop VALUES (12, '魅(杭州远洋乐堤港店)', 2, 'https://p0.meituan.net/dpmerchantpic/63833f6ba0393e2e8722420ef33f3d40466664.jpg,https://p0.meituan.net/dpmerchantpic/ae3c94cc92c529c4b1d7f68cebed33fa105810.png,', '远洋乐堤港', '浙江省', '杭州', '拱墅区', '丽水路58号远洋乐堤港F4', 120.14983, 30.31211, 88, 0000006444, 0000000235, 46, '10:00-02:00', '2021-12-22 20:34:34', '2021-12-22 20:34:34');
INSERT INTO tb_shop VALUES (13, '讴K拉量贩KTV(北城天地店)', 2, 'https://p1.meituan.net/merchantpic/598c83a8c0d06fe79ca01056e214d345875600.jpg,https://qcloud.dpfile.com/pc/HhvI0YyocYHRfGwJWqPQr34hRGRl4cWdvlNwn3dqghvi4WXlM2FY1te0-7pE3Wb9_Gd2X_f-v9T8Yj4uLt25Gg.jpg,https://qcloud.dpfile.com/pc/F5ZVzZaXFE27kvQzPnaL4V8O9QCpVw2nkzGrxZE8BqXgkfyTpNExfNG5CEPQX4pjGybIjx5eX6WNgCPvcASYAw.jpg', 'D32天阳购物中心', '浙江省', '杭州', '拱墅区', '湖州街567号北城天地5层', 120.130453, 30.327655, 58, 0000018997, 0000001857, 41, '12:00-02:00', '2021-12-22 20:38:54', '2021-12-22 20:40:04');
INSERT INTO tb_shop VALUES (14, '星聚会KTV(拱墅区万达店)', 2, 'https://p0.meituan.net/dpmerchantpic/f4cd6d8d4eb1959c3ea826aa05a552c01840451.jpg,https://p0.meituan.net/dpmerchantpic/2efc07aed856a8ab0fc75c86f4b9b0061655777.jpg,https://qcloud.dpfile.com/pc/zWfzzIorCohKT0bFwsfAlHuayWjI6DBEMPHHncmz36EEMU9f48PuD9VxLLDAjdoU_Gd2X_f-v9T8Yj4uLt25Gg.jpg', '北部新城', '浙江省', '杭州', '拱墅区', '杭行路666号万达广场C座1-2F', 120.128958, 30.337252, 60, 0000017771, 0000000685, 47, '10:00-22:00', '2021-12-22 20:48:54', '2021-12-22 20:48:54');
INSERT INTO tb_shop VALUES (15, '四季民福烤鸭店(故宫店)', 1, 'https://qcloud.dpfile.com/pc/jiclIsCKmOI2arxKN1Uf0Hx3PucIJH8q0QSz-Z8llzcN56-_QiKuOvyio1OOxsRtFoXqu0G3iT2T27qat3WhLVEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vfCF2ubeXzk49OsGrXt_KYDCngOyCwZK-s3fqawWswzk.jpg,https://qcloud.dpfile.com/pc/IOf6VX3qaBgFXFVgp75w-KKJmWZjFc8GXDU8g9bQC6YGCpAmG00QbfT4vCCBj7njuzFvxlbkWx5uwqY2qcjixFEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vmIU_8ZGOT1OjpJmLxG6urQ.jpg', '王府井', '北京市', '北京', '东城区', '南池子大街11号', 116.390414, 39.919383, 168, 41820, 12036, 48, '10:30-22:00', '2022-02-18 10:15:45', '2022-03-10 09:15:15');
INSERT INTO tb_shop VALUES (16, '胡大饭馆(簋街总店)', 1, 'https://p0.meituan.net/bbia/c1870d570e73accbc9fee90b48faca41195272.jpg,http://p0.meituan.net/mogu/397e40c28fc87715b3d5435710a9f88d706914.jpg,https://qcloud.dpfile.com/pc/MZTdRDqCZdbPDUO0Hk6lZENRKzpKRF7kavrkEI99OxqBZTzPfIxa5E33gBfGouhFuzFvxlbkWx5uwqY2qcjixFEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vmIU_8ZGOT1OjpJmLxG6urQ.jpg', '簋街', '北京市', '北京', '东城区', '东直门内大街235号', 116.401598, 39.891363, 132, 93514, 24817, 47, '11:00-04:00', '2022-02-18 10:16:52', '2022-03-10 09:16:28');
INSERT INTO tb_shop VALUES (17, '聚宝源(牛街总店)', 1, 'https://p0.meituan.net/biztone/694233_1619500156517.jpeg,https://img.meituan.net/msmerchant/876ca8983f7395556eda9ceb064e6bc51840883.png,https://img.meituan.net/msmerchant/86a76ed53c28eff709a36099aefe28b51554088.png', '牛街', '北京市', '北京', '西城区', '牛街西里二区商业1号楼', 116.40732, 39.905085, 118, 62470, 18922, 47, '10:00-21:30', '2022-02-18 10:17:59', '2022-03-10 09:17:41');
INSERT INTO tb_shop VALUES (18, '局气(三里屯店)', 1, 'https://img.meituan.net/msmerchant/232f8fdf09050838bd33fb24e79f30f9606056.jpg,https://qcloud.dpfile.com/pc/rDe48Xe15nQOHCcEEkmKUp5wEKWbimt-HDeqYRWsYJseXNncvMiXbuED7x1tXqN4uzFvxlbkWx5uwqY2qcjixFEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vmIU_8ZGOT1OjpJmLxG6urQ.jpg', '三里屯', '北京市', '北京', '朝阳区', '三里屯路19号院3号楼', 116.411729, 39.90478, 105, 38205, 9644, 45, '10:30-22:00', '2022-02-18 10:18:06', '2022-03-10 09:18:54');
INSERT INTO tb_shop VALUES (19, '南门涮肉(天坛店)', 1, 'https://img.meituan.net/msmerchant/054b5de0ba0b50c18a620cc37482129a45739.jpg,https://img.meituan.net/msmerchant/59b7eff9b60908d52bd4aea9ff356e6d145920.jpg,https://qcloud.dpfile.com/pc/Qe2PTEuvtJ5skpUXKKoW9OQ20qc7nIpHYEqJGBStJx0mpoyeBPQOJE4vOdYZwm9AuzFvxlbkWx5uwqY2qcjixFEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vmIU_8ZGOT1OjpJmLxG6urQ.jpg', '天坛', '北京市', '北京', '东城区', '天坛路63号', 116.391232, 39.910118, 142, 47160, 13208, 46, '11:00-22:30', '2022-02-18 10:19:13', '2022-03-10 09:19:07');
INSERT INTO tb_shop VALUES (20, '紫光园(朝阳门店)', 1, 'https://img.meituan.net/msmerchant/e71a2d0d693b3033c15522c43e03f09198239.jpg,https://img.meituan.net/msmerchant/9f8a966d60ffba00daf35458522273ca658239.jpg,https://img.meituan.net/msmerchant/ef9ca5ef6c05d381946fe4a9aa7d9808554502.jpg', '朝阳门', '北京市', '北京', '东城区', '朝阳门外大街6号院', 116.402963, 39.914733, 88, 27930, 7105, 44, '06:30-21:00', '2022-02-18 10:20:20', '2022-03-10 09:20:20');
INSERT INTO tb_shop VALUES (21, '温莎KTV(朝阳大悦城店)', 2, 'https://img.meituan.net/msmerchant/909434939a49b36f340523232924402166854.jpg,https://img.meituan.net/msmerchant/32fd2425f12e27db0160e837461c10303700032.jpg,https://img.meituan.net/msmerchant/f7022258ccb8dabef62a0514d3129562871160.jpg', '朝阳大悦城', '北京市', '北京', '朝阳区', '朝阳北路101号朝阳大悦城F7', 116.412221, 39.913439, 96, 19640, 2308, 45, '12:00-06:00', '2022-02-18 10:21:27', '2022-03-10 09:21:33');
INSERT INTO tb_shop VALUES (22, '良子健身足道(国贸店)', 5, 'https://img.meituan.net/msmerchant/cf3dff697bf7f6e11f4b79c4e7d989e4591290.jpg,https://img.meituan.net/msmerchant/0b463f545355c8d8f021eb2987dcd0c8567811.jpg,https://img.meituan.net/msmerchant/c3c2516939efaf36c4ccc64b0e629fad587907.jpg', '国贸', '北京市', '北京', '朝阳区', '建国门外大街甲6号中环世贸B座', 116.419198, 39.904619, 158, 8210, 1462, 46, '11:00-02:00', '2022-02-18 10:22:34', '2022-03-10 09:22:46');
INSERT INTO tb_shop VALUES (23, '思妍丽SPA(国贸店)', 6, 'https://p0.meituan.net/biztone/163160492_1624251899456.jpeg,https://img.meituan.net/msmerchant/e478eb16f7e31a7f8b29b5e3bab6de205500837.jpg,https://img.meituan.net/msmerchant/6173eb1d18b9d70ace7fdb3f2dd939662884857.jpg', '国贸', '北京市', '北京', '朝阳区', '建国门外大街1号国贸商城B1', 116.413694, 39.906402, 480, 3120, 508, 47, '10:00-22:00', '2022-02-18 10:23:41', '2022-03-10 09:23:59');
INSERT INTO tb_shop VALUES (24, 'D Lounge(三里屯店)', 8, 'https://p0.meituan.net/joymerchant/a575fd4adb0b9099c5c410058148b307-674435191.jpg,https://p0.meituan.net/merchantpic/68f11bf850e25e437c5f67decfd694ab2541634.jpg,https://p0.meituan.net/dpdeal/cb3a12225860ba2875e4ea26c6d14fcc197016.jpg', '三里屯', '北京市', '北京', '朝阳区', '三里屯太古里北区N4-32', 116.407076, 39.894519, 220, 14780, 3926, 46, '19:00-03:00', '2022-02-18 10:24:48', '2022-03-10 09:24:12');
INSERT INTO tb_shop VALUES (25, '老吉士酒家(天平路店)', 1, 'https://img.meituan.net/msmerchant/232f8fdf09050838bd33fb24e79f30f9606056.jpg,https://qcloud.dpfile.com/pc/rDe48Xe15nQOHCcEEkmKUp5wEKWbimt-HDeqYRWsYJseXNncvMiXbuED7x1tXqN4uzFvxlbkWx5uwqY2qcjixFEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vmIU_8ZGOT1OjpJmLxG6urQ.jpg', '天平路', '上海市', '上海', '徐汇区', '天平路41号', 121.467963, 31.224383, 180, 33640, 10825, 47, '11:00-14:00,17:00-22:00', '2022-02-18 10:25:55', '2022-03-10 09:25:25');
INSERT INTO tb_shop VALUES (26, '南翔馒头店(豫园店)', 1, 'https://img.meituan.net/msmerchant/054b5de0ba0b50c18a620cc37482129a45739.jpg,https://img.meituan.net/msmerchant/59b7eff9b60908d52bd4aea9ff356e6d145920.jpg,https://qcloud.dpfile.com/pc/Qe2PTEuvtJ5skpUXKKoW9OQ20qc7nIpHYEqJGBStJx0mpoyeBPQOJE4vOdYZwm9AuzFvxlbkWx5uwqY2qcjixFEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vmIU_8ZGOT1OjpJmLxG6urQ.jpg', '豫园', '上海市', '上海', '黄浦区', '豫园路85号', 121.464773, 31.230722, 95, 128450, 31206, 44, '09:00-21:00', '2022-02-18 10:26:02', '2022-03-10 09:26:38');
INSERT INTO tb_shop VALUES (27, '绿波廊(豫园店)', 1, 'https://img.meituan.net/msmerchant/e71a2d0d693b3033c15522c43e03f09198239.jpg,https://img.meituan.net/msmerchant/9f8a966d60ffba00daf35458522273ca658239.jpg,https://img.meituan.net/msmerchant/ef9ca5ef6c05d381946fe4a9aa7d9808554502.jpg', '豫园', '上海市', '上海', '黄浦区', '豫园路115号', 121.480571, 31.213797, 165, 41280, 12690, 46, '11:00-21:00', '2022-02-18 10:27:09', '2022-03-10 09:27:51');
INSERT INTO tb_shop VALUES (28, '阿娘面馆(思南路店)', 1, 'https://img.meituan.net/msmerchant/909434939a49b36f340523232924402166854.jpg,https://img.meituan.net/msmerchant/32fd2425f12e27db0160e837461c10303700032.jpg,https://img.meituan.net/msmerchant/f7022258ccb8dabef62a0514d3129562871160.jpg', '淮海中路', '上海市', '上海', '黄浦区', '思南路36号', 121.471968, 31.213538, 62, 52710, 14338, 45, '06:30-14:00', '2022-02-18 10:28:16', '2022-03-10 09:28:04');
INSERT INTO tb_shop VALUES (29, '兰心餐厅(进贤路店)', 1, 'https://img.meituan.net/msmerchant/cf3dff697bf7f6e11f4b79c4e7d989e4591290.jpg,https://img.meituan.net/msmerchant/0b463f545355c8d8f021eb2987dcd0c8567811.jpg,https://img.meituan.net/msmerchant/c3c2516939efaf36c4ccc64b0e629fad587907.jpg', '新天地', '上海市', '上海', '黄浦区', '进贤路166号', 121.462543, 31.236899, 88, 29840, 8042, 45, '11:00-14:00,17:00-21:00', '2022-02-18 10:29:23', '2022-03-10 09:29:17');
INSERT INTO tb_shop VALUES (30, '小杨生煎(黄河路店)', 1, 'https://p0.meituan.net/biztone/163160492_1624251899456.jpeg,https://img.meituan.net/msmerchant/e478eb16f7e31a7f8b29b5e3bab6de205500837.jpg,https://img.meituan.net/msmerchant/6173eb1d18b9d70ace7fdb3f2dd939662884857.jpg', '人民广场', '上海市', '上海', '黄浦区', '黄河路97号', 121.46735, 31.237617, 38, 96430, 21507, 44, '07:00-22:00', '2022-02-18 10:30:30', '2022-03-10 09:30:30');
INSERT INTO tb_shop VALUES (31, '纯K(新天地店)', 2, 'https://p0.meituan.net/joymerchant/a575fd4adb0b9099c5c410058148b307-674435191.jpg,https://p0.meituan.net/merchantpic/68f11bf850e25e437c5f67decfd694ab2541634.jpg,https://p0.meituan.net/dpdeal/cb3a12225860ba2875e4ea26c6d14fcc197016.jpg', '新天地', '上海市', '上海', '黄浦区', '马当路245号新天地时尚F3', 121.485196, 31.223239, 128, 24380, 3194, 46, '12:00-05:00', '2022-02-18 10:31:37', '2022-03-10 09:31:43');
INSERT INTO tb_shop VALUES (32, '一茶一足(静安寺店)', 5, 'https://p0.meituan.net/dpmerchantpic/53e74b200211d68988a4f02ae9912c6c1076826.jpg,https://qcloud.dpfile.com/pc/4iWtIvzLzwM2MGgyPu1PCDb4SWEaKqUeHm--YAt1EwR5tn8kypBcqNwHnjg96EvT_Gd2X_f-v9T8Yj4uLt25Gg.jpg,https://qcloud.dpfile.com/pc/WZsJWRI447x1VG2x48Ujgu7vwqksi_9WitdKI4j3jvIgX4MZOpGNaFtM93oSSizbGybIjx5eX6WNgCPvcASYAw.jpg', '静安寺', '上海市', '上海', '静安区', '南京西路1618号久光百货F6', 121.463435, 31.216917, 168, 9640, 1735, 45, '11:00-01:00', '2022-02-18 10:32:44', '2022-03-10 09:32:56');
INSERT INTO tb_shop VALUES (33, '东田造型(南京西路店)', 3, 'https://p0.meituan.net/dpmerchantpic/63833f6ba0393e2e8722420ef33f3d40466664.jpg,https://p0.meituan.net/dpmerchantpic/ae3c94cc92c529c4b1d7f68cebed33fa105810.png,', '南京西路', '上海市', '上海', '静安区', '南京西路1266号恒隆广场F4', 121.466984, 31.236172, 388, 5210, 862, 47, '10:00-21:00', '2022-02-18 10:33:51', '2022-03-10 09:33:09');
INSERT INTO tb_shop VALUES (34, 'Speak Low(复兴中路店)', 8, 'https://p1.meituan.net/merchantpic/598c83a8c0d06fe79ca01056e214d345875600.jpg,https://qcloud.dpfile.com/pc/HhvI0YyocYHRfGwJWqPQr34hRGRl4cWdvlNwn3dqghvi4WXlM2FY1te0-7pE3Wb9_Gd2X_f-v9T8Yj4uLt25Gg.jpg,https://qcloud.dpfile.com/pc/F5ZVzZaXFE27kvQzPnaL4V8O9QCpVw2nkzGrxZE8BqXgkfyTpNExfNG5CEPQX4pjGybIjx5eX6WNgCPvcASYAw.jpg', '淮海中路', '上海市', '上海', '静安区', '复兴中路579号', 121.491453, 31.231014, 200, 17930, 4871, 47, '18:00-02:00', '2022-02-18 10:34:58', '2022-03-10 09:34:22');
INSERT INTO tb_shop VALUES (35, '点都德(惠福东店)', 1, 'https://img.meituan.net/msmerchant/909434939a49b36f340523232924402166854.jpg,https://img.meituan.net/msmerchant/32fd2425f12e27db0160e837461c10303700032.jpg,https://img.meituan.net/msmerchant/f7022258ccb8dabef62a0514d3129562871160.jpg', '北京路', '广东省', '广州', '越秀区', '惠福东路470号', 113.257644, 23.117686, 78, 88620, 24391, 46, '07:00-22:00', '2022-02-18 10:35:05', '2022-03-10 09:35:35');
INSERT INTO tb_shop VALUES (36, '陶陶居酒家(第十甫路总店)', 1, 'https://img.meituan.net/msmerchant/cf3dff697bf7f6e11f4b79c4e7d989e4591290.jpg,https://img.meituan.net/msmerchant/0b463f545355c8d8f021eb2987dcd0c8567811.jpg,https://img.meituan.net/msmerchant/c3c2516939efaf36c4ccc64b0e629fad587907.jpg', '上下九', '广东省', '广州', '荔湾区', '第十甫路20号', 113.250726, 23.141343, 105, 64280, 18744, 47, '07:30-22:00', '2022-02-18 10:36:12', '2022-03-10 09:36:48');
INSERT INTO tb_shop VALUES (37, '炳胜品味(珠江新城店)', 1, 'https://p0.meituan.net/biztone/163160492_1624251899456.jpeg,https://img.meituan.net/msmerchant/e478eb16f7e31a7f8b29b5e3bab6de205500837.jpg,https://img.meituan.net/msmerchant/6173eb1d18b9d70ace7fdb3f2dd939662884857.jpg', '珠江新城', '广东省', '广州', '天河区', '华夏路8号合景国际金融广场', 113.247783, 23.113935, 168, 39170, 10268, 47, '11:00-22:00', '2022-02-18 10:37:19', '2022-03-10 09:37:01');
INSERT INTO tb_shop VALUES (38, '银记肠粉店(文昌北路店)', 1, 'https://p0.meituan.net/joymerchant/a575fd4adb0b9099c5c410058148b307-674435191.jpg,https://p0.meituan.net/merchantpic/68f11bf850e25e437c5f67decfd694ab2541634.jpg,https://p0.meituan.net/dpdeal/cb3a12225860ba2875e4ea26c6d14fcc197016.jpg', '上下九', '广东省', '广州', '荔湾区', '文昌北路236号', 113.273351, 23.126371, 32, 104360, 22180, 44, '06:30-22:00', '2022-02-18 10:38:26', '2022-03-10 09:38:14');
INSERT INTO tb_shop VALUES (39, '惠食佳(滨江东总店)', 1, 'https://p0.meituan.net/dpmerchantpic/53e74b200211d68988a4f02ae9912c6c1076826.jpg,https://qcloud.dpfile.com/pc/4iWtIvzLzwM2MGgyPu1PCDb4SWEaKqUeHm--YAt1EwR5tn8kypBcqNwHnjg96EvT_Gd2X_f-v9T8Yj4uLt25Gg.jpg,https://qcloud.dpfile.com/pc/WZsJWRI447x1VG2x48Ujgu7vwqksi_9WitdKI4j3jvIgX4MZOpGNaFtM93oSSizbGybIjx5eX6WNgCPvcASYAw.jpg', '客村', '广东省', '广州', '海珠区', '滨江东路199号', 113.257479, 23.140419, 120, 47290, 13406, 46, '11:00-22:30', '2022-02-18 10:39:33', '2022-03-10 09:39:27');
INSERT INTO tb_shop VALUES (40, '啫啫煲(体育西店)', 1, 'https://p0.meituan.net/dpmerchantpic/63833f6ba0393e2e8722420ef33f3d40466664.jpg,https://p0.meituan.net/dpmerchantpic/ae3c94cc92c529c4b1d7f68cebed33fa105810.png,', '体育西路', '广东省', '广州', '天河区', '天河路228号天环广场', 113.247519, 23.136042, 95, 31850, 8217, 44, '11:00-22:00', '2022-02-18 10:40:40', '2022-03-10 09:40:40');
INSERT INTO tb_shop VALUES (41, '星聚会KTV(天河城店)', 2, 'https://p1.meituan.net/merchantpic/598c83a8c0d06fe79ca01056e214d345875600.jpg,https://qcloud.dpfile.com/pc/HhvI0YyocYHRfGwJWqPQr34hRGRl4cWdvlNwn3dqghvi4WXlM2FY1te0-7pE3Wb9_Gd2X_f-v9T8Yj4uLt25Gg.jpg,https://qcloud.dpfile.com/pc/F5ZVzZaXFE27kvQzPnaL4V8O9QCpVw2nkzGrxZE8BqXgkfyTpNExfNG5CEPQX4pjGybIjx5eX6WNgCPvcASYAw.jpg', '天河城', '广东省', '广州', '天河区', '天河路208号天河城F6', 113.255028, 23.142527, 88, 21470, 2648, 44, '12:00-05:00', '2022-02-18 10:41:47', '2022-03-10 09:41:53');
INSERT INTO tb_shop VALUES (42, '富桥足道(珠江新城店)', 5, 'https://p0.meituan.net/dpmerchantpic/f4cd6d8d4eb1959c3ea826aa05a552c01840451.jpg,https://p0.meituan.net/dpmerchantpic/2efc07aed856a8ab0fc75c86f4b9b0061655777.jpg,https://qcloud.dpfile.com/pc/zWfzzIorCohKT0bFwsfAlHuayWjI6DBEMPHHncmz36EEMU9f48PuD9VxLLDAjdoU_Gd2X_f-v9T8Yj4uLt25Gg.jpg', '珠江新城', '广东省', '广州', '天河区', '珠江东路6号周大福金融中心', 113.272547, 23.140129, 148, 7930, 1364, 45, '11:00-02:00', '2022-02-18 10:42:54', '2022-03-10 09:42:06');
INSERT INTO tb_shop VALUES (43, '柔婷SPA(天河城店)', 6, 'https://qcloud.dpfile.com/pc/jiclIsCKmOI2arxKN1Uf0Hx3PucIJH8q0QSz-Z8llzcN56-_QiKuOvyio1OOxsRtFoXqu0G3iT2T27qat3WhLVEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vfCF2ubeXzk49OsGrXt_KYDCngOyCwZK-s3fqawWswzk.jpg,https://qcloud.dpfile.com/pc/IOf6VX3qaBgFXFVgp75w-KKJmWZjFc8GXDU8g9bQC6YGCpAmG00QbfT4vCCBj7njuzFvxlbkWx5uwqY2qcjixFEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vmIU_8ZGOT1OjpJmLxG6urQ.jpg', '天河城', '广东省', '广州', '天河区', '天河路208号天河城F5', 113.269745, 23.139063, 320, 4180, 674, 46, '10:00-22:00', '2022-02-18 10:43:01', '2022-03-10 09:43:19');
INSERT INTO tb_shop VALUES (44, '拾叁唐(琶醍店)', 8, 'https://p0.meituan.net/bbia/c1870d570e73accbc9fee90b48faca41195272.jpg,http://p0.meituan.net/mogu/397e40c28fc87715b3d5435710a9f88d706914.jpg,https://qcloud.dpfile.com/pc/MZTdRDqCZdbPDUO0Hk6lZENRKzpKRF7kavrkEI99OxqBZTzPfIxa5E33gBfGouhFuzFvxlbkWx5uwqY2qcjixFEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vmIU_8ZGOT1OjpJmLxG6urQ.jpg', '琶洲', '广东省', '广州', '海珠区', '阅江西路118号珠江琶醍', 113.273274, 23.139788, 158, 16320, 4105, 45, '18:00-02:00', '2022-02-18 10:44:08', '2022-03-10 09:44:32');
INSERT INTO tb_shop VALUES (45, '潮好味(海岸城店)', 1, 'https://p0.meituan.net/joymerchant/a575fd4adb0b9099c5c410058148b307-674435191.jpg,https://p0.meituan.net/merchantpic/68f11bf850e25e437c5f67decfd694ab2541634.jpg,https://p0.meituan.net/dpdeal/cb3a12225860ba2875e4ea26c6d14fcc197016.jpg', '海岸城', '广东省', '深圳', '南山区', '文心五路33号海岸城F4', 114.057935, 22.551889, 128, 34480, 9027, 46, '11:00-22:00', '2022-02-18 10:45:15', '2022-03-10 09:45:45');
INSERT INTO tb_shop VALUES (46, '八合里海记(华强北店)', 1, 'https://p0.meituan.net/dpmerchantpic/53e74b200211d68988a4f02ae9912c6c1076826.jpg,https://qcloud.dpfile.com/pc/4iWtIvzLzwM2MGgyPu1PCDb4SWEaKqUeHm--YAt1EwR5tn8kypBcqNwHnjg96EvT_Gd2X_f-v9T8Yj4uLt25Gg.jpg,https://qcloud.dpfile.com/pc/WZsJWRI447x1VG2x48Ujgu7vwqksi_9WitdKI4j3jvIgX4MZOpGNaFtM93oSSizbGybIjx5eX6WNgCPvcASYAw.jpg', '华强北', '广东省', '深圳', '福田区', '振兴路111号', 114.073612, 22.544154, 108, 57620, 15632, 47, '11:00-23:00', '2022-02-18 10:46:22', '2022-03-10 09:46:58');
INSERT INTO tb_shop VALUES (47, '客语(万象天地店)', 1, 'https://p0.meituan.net/dpmerchantpic/63833f6ba0393e2e8722420ef33f3d40466664.jpg,https://p0.meituan.net/dpmerchantpic/ae3c94cc92c529c4b1d7f68cebed33fa105810.png,', '万象天地', '广东省', '深圳', '南山区', '深南大道9668号万象天地F5', 114.061099, 22.534441, 78, 42910, 11204, 45, '11:00-22:00', '2022-02-18 10:47:29', '2022-03-10 09:47:11');
INSERT INTO tb_shop VALUES (48, '陈鹏鹏鹅肉饭店(车公庙店)', 1, 'https://p1.meituan.net/merchantpic/598c83a8c0d06fe79ca01056e214d345875600.jpg,https://qcloud.dpfile.com/pc/HhvI0YyocYHRfGwJWqPQr34hRGRl4cWdvlNwn3dqghvi4WXlM2FY1te0-7pE3Wb9_Gd2X_f-v9T8Yj4uLt25Gg.jpg,https://qcloud.dpfile.com/pc/F5ZVzZaXFE27kvQzPnaL4V8O9QCpVw2nkzGrxZE8BqXgkfyTpNExfNG5CEPQX4pjGybIjx5eX6WNgCPvcASYAw.jpg', '车公庙', '广东省', '深圳', '福田区', '泰然九路1号', 114.043273, 22.525706, 68, 38760, 9761, 46, '11:00-21:30', '2022-02-18 10:48:36', '2022-03-10 09:48:24');
INSERT INTO tb_shop VALUES (49, '木屋烧烤(福田CBD店)', 1, 'https://p0.meituan.net/dpmerchantpic/f4cd6d8d4eb1959c3ea826aa05a552c01840451.jpg,https://p0.meituan.net/dpmerchantpic/2efc07aed856a8ab0fc75c86f4b9b0061655777.jpg,https://qcloud.dpfile.com/pc/zWfzzIorCohKT0bFwsfAlHuayWjI6DBEMPHHncmz36EEMU9f48PuD9VxLLDAjdoU_Gd2X_f-v9T8Yj4uLt25Gg.jpg', '福田CBD', '广东省', '深圳', '福田区', '福华三路88号', 114.051617, 22.54762, 88, 63210, 17442, 45, '17:00-03:00', '2022-02-18 10:49:43', '2022-03-10 09:49:37');
INSERT INTO tb_shop VALUES (50, '大鸽饭(科技园店)', 1, 'https://qcloud.dpfile.com/pc/jiclIsCKmOI2arxKN1Uf0Hx3PucIJH8q0QSz-Z8llzcN56-_QiKuOvyio1OOxsRtFoXqu0G3iT2T27qat3WhLVEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vfCF2ubeXzk49OsGrXt_KYDCngOyCwZK-s3fqawWswzk.jpg,https://qcloud.dpfile.com/pc/IOf6VX3qaBgFXFVgp75w-KKJmWZjFc8GXDU8g9bQC6YGCpAmG00QbfT4vCCBj7njuzFvxlbkWx5uwqY2qcjixFEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vmIU_8ZGOT1OjpJmLxG6urQ.jpg', '科技园', '广东省', '深圳', '南山区', '科苑路15号', 114.057835, 22.5401, 98, 29140, 7416, 45, '11:00-22:00', '2022-02-18 10:50:50', '2022-03-10 09:50:50');
INSERT INTO tb_shop VALUES (51, '米乐星KTV(东门店)', 2, 'https://p0.meituan.net/bbia/c1870d570e73accbc9fee90b48faca41195272.jpg,http://p0.meituan.net/mogu/397e40c28fc87715b3d5435710a9f88d706914.jpg,https://qcloud.dpfile.com/pc/MZTdRDqCZdbPDUO0Hk6lZENRKzpKRF7kavrkEI99OxqBZTzPfIxa5E33gBfGouhFuzFvxlbkWx5uwqY2qcjixFEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vmIU_8ZGOT1OjpJmLxG6urQ.jpg', '东门', '广东省', '深圳', '罗湖区', '东门中路2001号', 114.046529, 22.541097, 78, 18620, 2137, 43, '12:00-04:00', '2022-02-18 10:51:57', '2022-03-10 09:51:03');
INSERT INTO tb_shop VALUES (52, '天浴良子(华强北店)', 5, 'https://p0.meituan.net/biztone/694233_1619500156517.jpeg,https://img.meituan.net/msmerchant/876ca8983f7395556eda9ceb064e6bc51840883.png,https://img.meituan.net/msmerchant/86a76ed53c28eff709a36099aefe28b51554088.png', '华强北', '广东省', '深圳', '福田区', '华强北路1058号', 114.057574, 22.534497, 158, 7240, 1246, 45, '11:00-02:00', '2022-02-18 10:52:04', '2022-03-10 09:52:16');
INSERT INTO tb_shop VALUES (53, '罗亚帝(万象城店)', 3, 'https://img.meituan.net/msmerchant/232f8fdf09050838bd33fb24e79f30f9606056.jpg,https://qcloud.dpfile.com/pc/rDe48Xe15nQOHCcEEkmKUp5wEKWbimt-HDeqYRWsYJseXNncvMiXbuED7x1tXqN4uzFvxlbkWx5uwqY2qcjixFEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vmIU_8ZGOT1OjpJmLxG6urQ.jpg', '万象城', '广东省', '深圳', '罗湖区', '宝安南路1881号万象城F4', 114.05505, 22.54434, 358, 3960, 623, 47, '10:00-21:30', '2022-02-18 10:53:11', '2022-03-10 09:53:29');
INSERT INTO tb_shop VALUES (54, '本色酒吧(蛇口店)', 8, 'https://img.meituan.net/msmerchant/054b5de0ba0b50c18a620cc37482129a45739.jpg,https://img.meituan.net/msmerchant/59b7eff9b60908d52bd4aea9ff356e6d145920.jpg,https://qcloud.dpfile.com/pc/Qe2PTEuvtJ5skpUXKKoW9OQ20qc7nIpHYEqJGBStJx0mpoyeBPQOJE4vOdYZwm9AuzFvxlbkWx5uwqY2qcjixFEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vmIU_8ZGOT1OjpJmLxG6urQ.jpg', '蛇口', '广东省', '深圳', '南山区', '望海路海上世界广场B区', 114.075407, 22.550403, 188, 13280, 3287, 45, '19:00-03:00', '2022-02-18 10:54:18', '2022-03-10 09:54:42');
INSERT INTO tb_shop VALUES (55, '小龙坎老火锅(春熙路总店)', 1, 'https://p1.meituan.net/merchantpic/598c83a8c0d06fe79ca01056e214d345875600.jpg,https://qcloud.dpfile.com/pc/HhvI0YyocYHRfGwJWqPQr34hRGRl4cWdvlNwn3dqghvi4WXlM2FY1te0-7pE3Wb9_Gd2X_f-v9T8Yj4uLt25Gg.jpg,https://qcloud.dpfile.com/pc/F5ZVzZaXFE27kvQzPnaL4V8O9QCpVw2nkzGrxZE8BqXgkfyTpNExfNG5CEPQX4pjGybIjx5eX6WNgCPvcASYAw.jpg', '春熙路', '四川省', '成都', '锦江区', '中纱帽街8号', 104.073258, 30.584247, 108, 82460, 23118, 46, '11:00-02:00', '2022-02-18 10:55:25', '2022-03-10 09:55:55');
INSERT INTO tb_shop VALUES (56, '大龙燚火锅(春熙路店)', 1, 'https://p0.meituan.net/dpmerchantpic/f4cd6d8d4eb1959c3ea826aa05a552c01840451.jpg,https://p0.meituan.net/dpmerchantpic/2efc07aed856a8ab0fc75c86f4b9b0061655777.jpg,https://qcloud.dpfile.com/pc/zWfzzIorCohKT0bFwsfAlHuayWjI6DBEMPHHncmz36EEMU9f48PuD9VxLLDAjdoU_Gd2X_f-v9T8Yj4uLt25Gg.jpg', '春熙路', '四川省', '成都', '锦江区', '中纱帽街8号远洋太古里', 104.078617, 30.568427, 118, 61380, 16947, 46, '11:00-02:00', '2022-02-18 10:56:32', '2022-03-10 09:56:08');
INSERT INTO tb_shop VALUES (57, '马旺子川小馆(太古里店)', 1, 'https://qcloud.dpfile.com/pc/jiclIsCKmOI2arxKN1Uf0Hx3PucIJH8q0QSz-Z8llzcN56-_QiKuOvyio1OOxsRtFoXqu0G3iT2T27qat3WhLVEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vfCF2ubeXzk49OsGrXt_KYDCngOyCwZK-s3fqawWswzk.jpg,https://qcloud.dpfile.com/pc/IOf6VX3qaBgFXFVgp75w-KKJmWZjFc8GXDU8g9bQC6YGCpAmG00QbfT4vCCBj7njuzFvxlbkWx5uwqY2qcjixFEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vmIU_8ZGOT1OjpJmLxG6urQ.jpg', '太古里', '四川省', '成都', '锦江区', '中纱帽街8号远洋太古里F2', 104.084206, 30.585963, 88, 33720, 8704, 47, '11:00-21:30', '2022-02-18 10:57:39', '2022-03-10 09:57:21');
INSERT INTO tb_shop VALUES (58, '明婷饭店(建设路店)', 1, 'https://p0.meituan.net/bbia/c1870d570e73accbc9fee90b48faca41195272.jpg,http://p0.meituan.net/mogu/397e40c28fc87715b3d5435710a9f88d706914.jpg,https://qcloud.dpfile.com/pc/MZTdRDqCZdbPDUO0Hk6lZENRKzpKRF7kavrkEI99OxqBZTzPfIxa5E33gBfGouhFuzFvxlbkWx5uwqY2qcjixFEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vmIU_8ZGOT1OjpJmLxG6urQ.jpg', '建设路', '四川省', '成都', '成华区', '双建路8号', 104.07232, 30.589435, 68, 24390, 6521, 44, '11:00-14:00,17:00-21:00', '2022-02-18 10:58:46', '2022-03-10 09:58:34');
INSERT INTO tb_shop VALUES (59, '甘食记成都肥肠粉(玉林店)', 1, 'https://p0.meituan.net/biztone/694233_1619500156517.jpeg,https://img.meituan.net/msmerchant/876ca8983f7395556eda9ceb064e6bc51840883.png,https://img.meituan.net/msmerchant/86a76ed53c28eff709a36099aefe28b51554088.png', '玉林', '四川省', '成都', '武侯区', '玉林西路123号', 104.071597, 30.577954, 28, 71840, 15209, 45, '07:00-20:00', '2022-02-18 10:59:53', '2022-03-10 09:59:47');
INSERT INTO tb_shop VALUES (60, '钟水饺(总府路店)', 1, 'https://img.meituan.net/msmerchant/232f8fdf09050838bd33fb24e79f30f9606056.jpg,https://qcloud.dpfile.com/pc/rDe48Xe15nQOHCcEEkmKUp5wEKWbimt-HDeqYRWsYJseXNncvMiXbuED7x1tXqN4uzFvxlbkWx5uwqY2qcjixFEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vmIU_8ZGOT1OjpJmLxG6urQ.jpg', '春熙路', '四川省', '成都', '锦江区', '总府路23号', 104.061163, 30.562869, 35, 45710, 9843, 44, '07:00-21:00', '2022-02-18 10:00:00', '2022-03-10 09:00:00');
INSERT INTO tb_shop VALUES (61, '温莎KTV(天府三街店)', 2, 'https://img.meituan.net/msmerchant/054b5de0ba0b50c18a620cc37482129a45739.jpg,https://img.meituan.net/msmerchant/59b7eff9b60908d52bd4aea9ff356e6d145920.jpg,https://qcloud.dpfile.com/pc/Qe2PTEuvtJ5skpUXKKoW9OQ20qc7nIpHYEqJGBStJx0mpoyeBPQOJE4vOdYZwm9AuzFvxlbkWx5uwqY2qcjixFEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vmIU_8ZGOT1OjpJmLxG6urQ.jpg', '天府三街', '四川省', '成都', '武侯区', '天府大道中段500号', 104.079485, 30.560941, 88, 16740, 1972, 45, '12:00-05:00', '2022-02-18 10:01:07', '2022-03-10 09:01:13');
INSERT INTO tb_shop VALUES (62, '良子足道(科华北路店)', 5, 'https://img.meituan.net/msmerchant/e71a2d0d693b3033c15522c43e03f09198239.jpg,https://img.meituan.net/msmerchant/9f8a966d60ffba00daf35458522273ca658239.jpg,https://img.meituan.net/msmerchant/ef9ca5ef6c05d381946fe4a9aa7d9808554502.jpg', '科华北路', '四川省', '成都', '武侯区', '科华北路62号', 104.058758, 30.587629, 138, 8620, 1543, 46, '11:00-02:00', '2022-02-18 10:02:14', '2022-03-10 09:02:26');
INSERT INTO tb_shop VALUES (63, '颜术SPA(银泰城店)', 6, 'https://img.meituan.net/msmerchant/909434939a49b36f340523232924402166854.jpg,https://img.meituan.net/msmerchant/32fd2425f12e27db0160e837461c10303700032.jpg,https://img.meituan.net/msmerchant/f7022258ccb8dabef62a0514d3129562871160.jpg', '银泰城', '四川省', '成都', '武侯区', '天府大道北段1199号银泰in99', 104.084027, 30.559506, 368, 3110, 486, 47, '10:00-22:00', '2022-02-18 10:03:21', '2022-03-10 09:03:39');
INSERT INTO tb_shop VALUES (64, '小酒馆(玉林西路店)', 8, 'https://img.meituan.net/msmerchant/cf3dff697bf7f6e11f4b79c4e7d989e4591290.jpg,https://img.meituan.net/msmerchant/0b463f545355c8d8f021eb2987dcd0c8567811.jpg,https://img.meituan.net/msmerchant/c3c2516939efaf36c4ccc64b0e629fad587907.jpg', '玉林', '四川省', '成都', '武侯区', '玉林西路55号', 104.074884, 30.587976, 98, 20630, 5824, 47, '19:00-02:00', '2022-02-18 10:04:28', '2022-03-10 09:04:52');
INSERT INTO tb_shop VALUES (65, '珮姐老火锅(解放碑店)', 1, 'https://p0.meituan.net/bbia/c1870d570e73accbc9fee90b48faca41195272.jpg,http://p0.meituan.net/mogu/397e40c28fc87715b3d5435710a9f88d706914.jpg,https://qcloud.dpfile.com/pc/MZTdRDqCZdbPDUO0Hk6lZENRKzpKRF7kavrkEI99OxqBZTzPfIxa5E33gBfGouhFuzFvxlbkWx5uwqY2qcjixFEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vmIU_8ZGOT1OjpJmLxG6urQ.jpg', '解放碑', '重庆市', '重庆', '渝中区', '中华路8号', 106.534451, 29.552463, 118, 74920, 20431, 47, '11:00-02:00', '2022-02-18 10:05:35', '2022-03-10 09:05:05');
INSERT INTO tb_shop VALUES (66, '渝宗老灶火锅(观音桥店)', 1, 'https://p0.meituan.net/biztone/694233_1619500156517.jpeg,https://img.meituan.net/msmerchant/876ca8983f7395556eda9ceb064e6bc51840883.png,https://img.meituan.net/msmerchant/86a76ed53c28eff709a36099aefe28b51554088.png', '观音桥', '重庆市', '重庆', '江北区', '建新北路8号', 106.53396, 29.556406, 108, 53680, 14376, 46, '11:00-01:00', '2022-02-18 10:06:42', '2022-03-10 09:06:18');
INSERT INTO tb_shop VALUES (67, '晓宇火锅(枇杷山总店)', 1, 'https://img.meituan.net/msmerchant/232f8fdf09050838bd33fb24e79f30f9606056.jpg,https://qcloud.dpfile.com/pc/rDe48Xe15nQOHCcEEkmKUp5wEKWbimt-HDeqYRWsYJseXNncvMiXbuED7x1tXqN4uzFvxlbkWx5uwqY2qcjixFEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vmIU_8ZGOT1OjpJmLxG6urQ.jpg', '南坪', '重庆市', '重庆', '南岸区', '枇杷山正街86号', 106.541213, 29.571213, 98, 41260, 11208, 45, '11:00-22:00', '2022-02-18 10:07:49', '2022-03-10 09:07:31');
INSERT INTO tb_shop VALUES (68, '花市豌杂面(青年路店)', 1, 'https://img.meituan.net/msmerchant/054b5de0ba0b50c18a620cc37482129a45739.jpg,https://img.meituan.net/msmerchant/59b7eff9b60908d52bd4aea9ff356e6d145920.jpg,https://qcloud.dpfile.com/pc/Qe2PTEuvtJ5skpUXKKoW9OQ20qc7nIpHYEqJGBStJx0mpoyeBPQOJE4vOdYZwm9AuzFvxlbkWx5uwqY2qcjixFEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vmIU_8ZGOT1OjpJmLxG6urQ.jpg', '解放碑', '重庆市', '重庆', '渝中区', '青年路32号', 106.541866, 29.577852, 15, 89340, 17862, 46, '06:30-15:00', '2022-02-18 10:08:56', '2022-03-10 09:08:44');
INSERT INTO tb_shop VALUES (69, '胖子妈盐水鸭(沙坪坝店)', 1, 'https://img.meituan.net/msmerchant/e71a2d0d693b3033c15522c43e03f09198239.jpg,https://img.meituan.net/msmerchant/9f8a966d60ffba00daf35458522273ca658239.jpg,https://img.meituan.net/msmerchant/ef9ca5ef6c05d381946fe4a9aa7d9808554502.jpg', '沙坪坝', '重庆市', '重庆', '沙坪坝区', '沙南街4号', 106.536519, 29.556038, 45, 36710, 8104, 44, '08:00-20:00', '2022-02-18 10:09:03', '2022-03-10 09:09:57');
INSERT INTO tb_shop VALUES (70, '大队长火锅(时代天街店)', 1, 'https://img.meituan.net/msmerchant/909434939a49b36f340523232924402166854.jpg,https://img.meituan.net/msmerchant/32fd2425f12e27db0160e837461c10303700032.jpg,https://img.meituan.net/msmerchant/f7022258ccb8dabef62a0514d3129562871160.jpg', '时代天街', '重庆市', '重庆', '渝北区', '龙湖时代天街B馆F3', 106.552314, 29.579835, 128, 29480, 7652, 45, '11:00-23:00', '2022-02-18 10:10:10', '2022-03-10 09:10:10');
INSERT INTO tb_shop VALUES (71, '星空KTV(观音桥店)', 2, 'https://img.meituan.net/msmerchant/cf3dff697bf7f6e11f4b79c4e7d989e4591290.jpg,https://img.meituan.net/msmerchant/0b463f545355c8d8f021eb2987dcd0c8567811.jpg,https://img.meituan.net/msmerchant/c3c2516939efaf36c4ccc64b0e629fad587907.jpg', '观音桥', '重庆市', '重庆', '江北区', '北城天街37号', 106.538633, 29.573853, 78, 17390, 2058, 43, '12:00-04:00', '2022-02-18 10:11:17', '2022-03-10 09:11:23');
INSERT INTO tb_shop VALUES (72, '巴渝足道(解放碑店)', 5, 'https://p0.meituan.net/biztone/163160492_1624251899456.jpeg,https://img.meituan.net/msmerchant/e478eb16f7e31a7f8b29b5e3bab6de205500837.jpg,https://img.meituan.net/msmerchant/6173eb1d18b9d70ace7fdb3f2dd939662884857.jpg', '解放碑', '重庆市', '重庆', '渝中区', '民权路28号', 106.567214, 29.579924, 128, 9410, 1673, 45, '11:00-02:00', '2022-02-18 10:12:24', '2022-03-10 09:12:36');
INSERT INTO tb_shop VALUES (73, '美丽田园(江北嘴店)', 6, 'https://p0.meituan.net/joymerchant/a575fd4adb0b9099c5c410058148b307-674435191.jpg,https://p0.meituan.net/merchantpic/68f11bf850e25e437c5f67decfd694ab2541634.jpg,https://p0.meituan.net/dpdeal/cb3a12225860ba2875e4ea26c6d14fcc197016.jpg', '江北嘴', '重庆市', '重庆', '江北区', '江北城西大街5号', 106.553258, 29.561161, 398, 2680, 421, 46, '10:00-21:30', '2022-02-18 10:13:31', '2022-03-10 09:13:49');
INSERT INTO tb_shop VALUES (74, '九街壹号(九街店)', 8, 'https://p0.meituan.net/dpmerchantpic/53e74b200211d68988a4f02ae9912c6c1076826.jpg,https://qcloud.dpfile.com/pc/4iWtIvzLzwM2MGgyPu1PCDb4SWEaKqUeHm--YAt1EwR5tn8kypBcqNwHnjg96EvT_Gd2X_f-v9T8Yj4uLt25Gg.jpg,https://qcloud.dpfile.com/pc/WZsJWRI447x1VG2x48Ujgu7vwqksi_9WitdKI4j3jvIgX4MZOpGNaFtM93oSSizbGybIjx5eX6WNgCPvcASYAw.jpg', '九街', '重庆市', '重庆', '江北区', '九街高屋', 106.541527, 29.562971, 158, 15270, 3968, 45, '19:00-04:00', '2022-02-18 10:14:38', '2022-03-10 09:14:02');
INSERT INTO tb_shop VALUES (75, '子午路张记肉夹馍(小寨店)', 1, 'https://img.meituan.net/msmerchant/054b5de0ba0b50c18a620cc37482129a45739.jpg,https://img.meituan.net/msmerchant/59b7eff9b60908d52bd4aea9ff356e6d145920.jpg,https://qcloud.dpfile.com/pc/Qe2PTEuvtJ5skpUXKKoW9OQ20qc7nIpHYEqJGBStJx0mpoyeBPQOJE4vOdYZwm9AuzFvxlbkWx5uwqY2qcjixFEuLYk00OmSS1IdNpm8K8sG4JN9RIm2mTKcbLtc2o2vmIU_8ZGOT1OjpJmLxG6urQ.jpg', '小寨', '陕西省', '西安', '雁塔区', '子午路8号', 108.94654, 34.341428, 18, 96310, 19248, 46, '07:00-21:00', '2022-02-18 10:15:45', '2022-03-10 09:15:15');
INSERT INTO tb_shop VALUES (76, '老孙家泡馍(东大街店)', 1, 'https://img.meituan.net/msmerchant/e71a2d0d693b3033c15522c43e03f09198239.jpg,https://img.meituan.net/msmerchant/9f8a966d60ffba00daf35458522273ca658239.jpg,https://img.meituan.net/msmerchant/ef9ca5ef6c05d381946fe4a9aa7d9808554502.jpg', '钟楼', '陕西省', '西安', '碑林区', '东大街364号', 108.948786, 34.343633, 55, 48720, 11286, 45, '09:00-21:30', '2022-02-18 10:16:52', '2022-03-10 09:16:28');
INSERT INTO tb_shop VALUES (77, '醉长安(大雁塔店)', 1, 'https://img.meituan.net/msmerchant/909434939a49b36f340523232924402166854.jpg,https://img.meituan.net/msmerchant/32fd2425f12e27db0160e837461c10303700032.jpg,https://img.meituan.net/msmerchant/f7022258ccb8dabef62a0514d3129562871160.jpg', '大雁塔', '陕西省', '西安', '雁塔区', '慈恩路9号', 108.947812, 34.357658, 88, 35490, 9127, 46, '11:00-22:00', '2022-02-18 10:17:59', '2022-03-10 09:17:41');
INSERT INTO tb_shop VALUES (78, '魏家凉皮(高新路店)', 1, 'https://img.meituan.net/msmerchant/cf3dff697bf7f6e11f4b79c4e7d989e4591290.jpg,https://img.meituan.net/msmerchant/0b463f545355c8d8f021eb2987dcd0c8567811.jpg,https://img.meituan.net/msmerchant/c3c2516939efaf36c4ccc64b0e629fad587907.jpg', '高新路', '陕西省', '西安', '雁塔区', '高新路25号', 108.922138, 34.327639, 26, 72480, 16043, 45, '07:00-22:00', '2022-02-18 10:18:06', '2022-03-10 09:18:54');
INSERT INTO tb_shop VALUES (79, '西安饭庄(钟楼店)', 1, 'https://p0.meituan.net/biztone/163160492_1624251899456.jpeg,https://img.meituan.net/msmerchant/e478eb16f7e31a7f8b29b5e3bab6de205500837.jpg,https://img.meituan.net/msmerchant/6173eb1d18b9d70ace7fdb3f2dd939662884857.jpg', '钟楼', '陕西省', '西安', '碑林区', '东大街298号', 108.944371, 34.336747, 98, 26830, 7042, 45, '10:30-21:00', '2022-02-18 10:19:13', '2022-03-10 09:19:07');
INSERT INTO tb_shop VALUES (80, '回民街老米家泡馍', 1, 'https://p0.meituan.net/joymerchant/a575fd4adb0b9099c5c410058148b307-674435191.jpg,https://p0.meituan.net/merchantpic/68f11bf850e25e437c5f67decfd694ab2541634.jpg,https://p0.meituan.net/dpdeal/cb3a12225860ba2875e4ea26c6d14fcc197016.jpg', '回民街', '陕西省', '西安', '莲湖区', '北院门112号', 108.946139, 34.341084, 42, 58140, 13418, 44, '08:00-22:00', '2022-02-18 10:20:20', '2022-03-10 09:20:20');
INSERT INTO tb_shop VALUES (81, '星聚会KTV(小寨店)', 2, 'https://p0.meituan.net/dpmerchantpic/53e74b200211d68988a4f02ae9912c6c1076826.jpg,https://qcloud.dpfile.com/pc/4iWtIvzLzwM2MGgyPu1PCDb4SWEaKqUeHm--YAt1EwR5tn8kypBcqNwHnjg96EvT_Gd2X_f-v9T8Yj4uLt25Gg.jpg,https://qcloud.dpfile.com/pc/WZsJWRI447x1VG2x48Ujgu7vwqksi_9WitdKI4j3jvIgX4MZOpGNaFtM93oSSizbGybIjx5eX6WNgCPvcASYAw.jpg', '小寨', '陕西省', '西安', '雁塔区', '小寨西路232号', 108.944518, 34.336002, 82, 19460, 2314, 44, '12:00-05:00', '2022-02-18 10:21:27', '2022-03-10 09:21:33');
INSERT INTO tb_shop VALUES (82, '唐御足道(大雁塔店)', 5, 'https://p0.meituan.net/dpmerchantpic/63833f6ba0393e2e8722420ef33f3d40466664.jpg,https://p0.meituan.net/dpmerchantpic/ae3c94cc92c529c4b1d7f68cebed33fa105810.png,', '大雁塔', '陕西省', '西安', '雁塔区', '雁塔南路18号', 108.954211, 34.349477, 138, 8140, 1428, 45, '11:00-02:00', '2022-02-18 10:22:34', '2022-03-10 09:22:46');
INSERT INTO tb_shop VALUES (83, '木北造型(大唐不夜城店)', 3, 'https://p1.meituan.net/merchantpic/598c83a8c0d06fe79ca01056e214d345875600.jpg,https://qcloud.dpfile.com/pc/HhvI0YyocYHRfGwJWqPQr34hRGRl4cWdvlNwn3dqghvi4WXlM2FY1te0-7pE3Wb9_Gd2X_f-v9T8Yj4uLt25Gg.jpg,https://qcloud.dpfile.com/pc/F5ZVzZaXFE27kvQzPnaL4V8O9QCpVw2nkzGrxZE8BqXgkfyTpNExfNG5CEPQX4pjGybIjx5eX6WNgCPvcASYAw.jpg', '大唐不夜城', '陕西省', '西安', '雁塔区', '慈恩路1号', 108.957673, 34.348386, 328, 3720, 592, 46, '10:00-22:00', '2022-02-18 10:23:41', '2022-03-10 09:23:59');
INSERT INTO tb_shop VALUES (84, '1912酒吧(曲江店)', 8, 'https://p0.meituan.net/dpmerchantpic/f4cd6d8d4eb1959c3ea826aa05a552c01840451.jpg,https://p0.meituan.net/dpmerchantpic/2efc07aed856a8ab0fc75c86f4b9b0061655777.jpg,https://qcloud.dpfile.com/pc/zWfzzIorCohKT0bFwsfAlHuayWjI6DBEMPHHncmz36EEMU9f48PuD9VxLLDAjdoU_Gd2X_f-v9T8Yj4uLt25Gg.jpg', '曲江', '陕西省', '西安', '雁塔区', '雁南一路3号', 108.936891, 34.355752, 148, 12630, 3142, 44, '19:00-03:00', '2022-02-18 10:24:48', '2022-03-10 09:24:12');

-- ----------------------------
-- Table structure for tb_shop_type
-- ----------------------------
DROP TABLE IF EXISTS tb_shop_type;
CREATE TABLE tb_shop_type  (
                                 id bigint  NOT NULL AUTO_INCREMENT,
                                 name varchar(32) NULL DEFAULT NULL,
                                 icon varchar(255) NULL DEFAULT NULL,
                                 sort int  NULL DEFAULT NULL,
                                 create_time timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                                 update_time timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                                 PRIMARY KEY (id)
);

-- ----------------------------
-- Records of tb_shop_type
-- ----------------------------
INSERT INTO tb_shop_type VALUES (1, '美食', '/types/ms.png', 1, '2021-12-22 20:17:47', '2021-12-23 11:24:31');
INSERT INTO tb_shop_type VALUES (2, 'KTV', '/types/KTV.png', 2, '2021-12-22 20:18:27', '2021-12-23 11:24:31');
INSERT INTO tb_shop_type VALUES (3, '丽人·美发', '/types/lrmf.png', 3, '2021-12-22 20:18:48', '2021-12-23 11:24:31');
INSERT INTO tb_shop_type VALUES (4, '健身运动', '/types/jsyd.png', 10, '2021-12-22 20:19:04', '2021-12-23 11:24:31');
INSERT INTO tb_shop_type VALUES (5, '按摩·足疗', '/types/amzl.png', 5, '2021-12-22 20:19:27', '2021-12-23 11:24:31');
INSERT INTO tb_shop_type VALUES (6, '美容SPA', '/types/spa.png', 6, '2021-12-22 20:19:35', '2021-12-23 11:24:31');
INSERT INTO tb_shop_type VALUES (7, '亲子游乐', '/types/qzyl.png', 7, '2021-12-22 20:19:53', '2021-12-23 11:24:31');
INSERT INTO tb_shop_type VALUES (8, '酒吧', '/types/jiuba.png', 8, '2021-12-22 20:20:02', '2021-12-23 11:24:31');
INSERT INTO tb_shop_type VALUES (9, '轰趴馆', '/types/hpg.png', 9, '2021-12-22 20:20:08', '2021-12-23 11:24:31');
INSERT INTO tb_shop_type VALUES (10, '美睫·美甲', '/types/mjmj.png', 4, '2021-12-22 20:21:46', '2021-12-23 11:24:31');

-- ----------------------------
-- Table structure for tb_sign
-- ----------------------------
DROP TABLE IF EXISTS tb_sign;
CREATE TABLE tb_sign  (
                            id bigint  NOT NULL AUTO_INCREMENT,
                            user_id bigint  NOT NULL,
                            sign_year int NOT NULL,
                            sign_month tinyint NOT NULL,
                            sign_date date NOT NULL,
                            is_backup tinyint  NULL DEFAULT NULL,
                            PRIMARY KEY (id)
);

-- ----------------------------
-- Records of tb_sign
-- ----------------------------

-- ----------------------------
-- Table structure for tb_user
-- ----------------------------
DROP TABLE IF EXISTS tb_user;
CREATE TABLE tb_user  (
                            id bigint  NOT NULL AUTO_INCREMENT,
                            phone varchar(11) NOT NULL,
                            password varchar(128) NULL DEFAULT '',
                            nick_name varchar(32) NULL DEFAULT '',
                            icon varchar(255) NULL DEFAULT '',
                            create_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            update_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            PRIMARY KEY (id),
                            UNIQUE INDEX uniqe_key_phone(phone)
);

-- ----------------------------
-- Records of tb_user
-- ----------------------------
INSERT INTO tb_user VALUES (1, '13686869696', '', '小鱼同学', '/imgs/blogs/blog1.jpg', '2021-12-24 10:27:19', '2022-01-11 16:04:00');
INSERT INTO tb_user VALUES (2, '13838411438', '', '可可今天不吃肉', '/imgs/icons/kkjtbcr.jpg', '2021-12-24 15:14:39', '2021-12-28 19:58:04');
INSERT INTO tb_user VALUES (4, '13456789011', '', 'user_slxaxy2au9f3tanffaxr', '', '2022-01-07 12:07:53', '2022-01-07 12:07:53');
INSERT INTO tb_user VALUES (5, '13456789001', '', '可爱多', '/imgs/icons/user5-icon.png', '2022-01-07 16:11:33', '2022-03-11 09:09:20');
INSERT INTO tb_user VALUES (6, '13456762069', '', 'user_xn5wr3hpsv', '', '2022-02-07 17:54:10', '2022-02-07 17:54:10');

-- ----------------------------
-- Table structure for tb_user_info
-- ----------------------------
DROP TABLE IF EXISTS tb_user_info;
CREATE TABLE tb_user_info  (
                                 user_id bigint  NOT NULL,
                                 city varchar(64) NULL DEFAULT '',
                                 introduce varchar(128) NULL DEFAULT NULL,
                                 fans int  NULL DEFAULT 0,
                                 followee int  NULL DEFAULT 0,
                                 gender tinyint  NULL DEFAULT 0,
                                 birthday date NULL DEFAULT NULL,
                                 credits int  NULL DEFAULT 0,
                                 level tinyint  NULL DEFAULT 0,
                                 create_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                 update_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                 PRIMARY KEY (user_id)
);

-- ----------------------------
-- Records of tb_user_info
-- ----------------------------

-- ----------------------------
-- Table structure for tb_voucher
-- ----------------------------
DROP TABLE IF EXISTS tb_voucher;
CREATE TABLE tb_voucher  (
                               id bigint  NOT NULL AUTO_INCREMENT,
                               shop_id bigint  NULL DEFAULT NULL,
                               title varchar(255) NOT NULL,
                               sub_title varchar(255) NULL DEFAULT NULL,
                               rules varchar(1024) NULL DEFAULT NULL,
                               pay_value bigint  NOT NULL,
                               actual_value bigint NOT NULL,
                               type tinyint  NOT NULL DEFAULT 0,
                               status tinyint  NOT NULL DEFAULT 1,
                               create_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                               update_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                               PRIMARY KEY (id)
);

-- ----------------------------
-- Records of tb_voucher
-- ----------------------------

-- ----------------------------
-- Table structure for tb_voucher_order
-- ----------------------------
DROP TABLE IF EXISTS tb_voucher_order;
CREATE TABLE tb_voucher_order  (
                                     id bigint NOT NULL,
                                     user_id bigint  NOT NULL,
                                     voucher_id bigint  NOT NULL,
                                     pay_type tinyint  NOT NULL DEFAULT 1,
                                     status tinyint  NOT NULL DEFAULT 1,
                                     create_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                     pay_time timestamp NULL DEFAULT NULL,
                                     use_time timestamp NULL DEFAULT NULL,
                                     refund_time timestamp NULL DEFAULT NULL,
                                     update_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                     PRIMARY KEY (id)
);

-- ----------------------------
-- Records of tb_voucher_order
-- ----------------------------

-- ----------------------------
-- Table structure for tb_address
-- ----------------------------
-- 收货地址簿。原版项目没有这个概念，是这次新加的完整增删改查模块。
-- 注意：这里只存「用户的收件地址」，和 tb_shop 的店铺地址是两回事 ——
-- 前者是私有的、按 user_id 隔离的；后者是公开的门店资料。
DROP TABLE IF EXISTS tb_address;
CREATE TABLE tb_address  (
                                id bigint  NOT NULL AUTO_INCREMENT,
                                user_id bigint  NOT NULL,
                                name varchar(32) NOT NULL,
                                phone varchar(20) NOT NULL,
                                -- 省 / 市 / 区三级，写法必须和 regions.json 逐字一致
                                province varchar(32) NOT NULL DEFAULT '',
                                city varchar(32) NOT NULL,
                                district varchar(32) NULL DEFAULT NULL,
                                detail varchar(255) NOT NULL,
                                tag tinyint  NOT NULL DEFAULT 0,
                                is_default tinyint  NOT NULL DEFAULT 0,
                                create_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                update_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                PRIMARY KEY (id),
                                INDEX idx_address_user(user_id)
);

-- ----------------------------
-- Records of tb_address
-- ----------------------------
-- 只给种子用户预置。用开发取码接口随便填个新手机号登录出来的是新用户，
-- 他的地址簿是空的 —— 正好把「第一条自动变默认」这条规则走一遍。
-- 想直接看有数据的版本，用 13686869696（tb_user.id = 1）登录。
INSERT INTO tb_address VALUES (1, 1, '小鱼同学', '13800138000', '浙江省', '杭州', '拱墅区', '拱墅区金华路锦昌文华苑 29 号 3 单元 1102', 0, 1, '2022-03-01 10:03:07', '2022-03-12 09:05:11');
INSERT INTO tb_address VALUES (2, 1, '小鱼同学', '13800138000', '北京市', '北京', '朝阳区', '朝阳区三里屯路 19 号院 3 号楼 1801', 1, 0, '2022-03-01 10:06:14', '2022-03-12 09:10:22');
INSERT INTO tb_address VALUES (3, 1, '老妈', '13900139000', '上海市', '上海', '黄浦区', '黄浦区思南路 36 号 2 楼', 0, 0, '2022-03-01 10:09:21', '2022-03-12 09:15:33');
INSERT INTO tb_address VALUES (4, 2, '可可', '13700137000', '四川省', '成都', '锦江区', '锦江区中纱帽街 8 号远洋太古里 2 栋 506', 0, 1, '2022-03-01 10:12:28', '2022-03-12 09:20:44');
INSERT INTO tb_address VALUES (5, 2, '可可（前台代收）', '13700137000', '广东省', '深圳', '南山区', '南山区科苑路 15 号 A 座 1203', 1, 0, '2022-03-01 10:15:35', '2022-03-12 09:25:55');

-- ----------------------------
-- Table structure for tb_favorites
-- ----------------------------
-- 笔记收藏。原版项目没有这个功能，是这次新加的。
--
-- 两个设计要点：
--   1) id 用 AUTO_INCREMENT 而不是雪花号：笔记 id 本身很小（自增），
--      用雪花号只会平白引入 JS 53 位精度那个坑（见改造说明第二十三节）。
--   2) uk_user_blog 是**唯一索引**：收藏是幂等的，重复收藏不该报错也不该插第二行。
--      有了它，服务层只要 catch 住 DuplicateKeyException 就算幂等成功。
DROP TABLE IF EXISTS tb_favorites;
CREATE TABLE tb_favorites  (
                                id bigint  NOT NULL AUTO_INCREMENT,
                                user_id bigint  NOT NULL,
                                blog_id bigint  NOT NULL,
                                create_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                update_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                PRIMARY KEY (id),
                                UNIQUE INDEX uk_fav_user_blog(user_id, blog_id),
                                INDEX idx_fav_user(user_id)
);


-- ----------------------------
-- Records of tb_voucher / tb_seckill_voucher（由 _gen_nationwide_sql.py 生成）
-- ----------------------------
-- 上游原版只 seed 了 2 张券、都在 1 号店，84 家店里 83 家没有券，
-- 换个店就看不到券、也没法演示秒杀。这里给每家店配一张代金券、
-- 每座城市首店再加一张秒杀券。
INSERT INTO tb_voucher VALUES (100, 1, '50元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 4750, 5000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (101, 2, '80元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 7750, 8000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (102, 3, '100元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 9750, 10000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (103, 4, '120元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 11750, 12000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (104, 5, '150元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 14750, 15000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (105, 6, '50元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 4750, 5000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (106, 7, '80元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 7750, 8000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (107, 8, '100元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 9750, 10000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (108, 9, '120元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 11750, 12000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (109, 10, '150元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 14750, 15000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (110, 11, '50元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 4750, 5000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (111, 12, '80元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 7750, 8000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (112, 13, '100元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 9750, 10000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (113, 14, '120元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 11750, 12000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (114, 15, '150元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 14750, 15000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (115, 16, '50元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 4750, 5000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (116, 17, '80元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 7750, 8000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (117, 18, '100元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 9750, 10000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (118, 19, '120元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 11750, 12000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (119, 20, '150元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 14750, 15000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (120, 21, '50元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 4750, 5000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (121, 22, '80元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 7750, 8000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (122, 23, '100元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 9750, 10000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (123, 24, '120元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 11750, 12000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (124, 25, '150元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 14750, 15000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (125, 26, '50元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 4750, 5000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (126, 27, '80元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 7750, 8000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (127, 28, '100元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 9750, 10000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (128, 29, '120元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 11750, 12000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (129, 30, '150元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 14750, 15000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (130, 31, '50元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 4750, 5000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (131, 32, '80元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 7750, 8000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (132, 33, '100元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 9750, 10000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (133, 34, '120元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 11750, 12000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (134, 35, '150元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 14750, 15000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (135, 36, '50元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 4750, 5000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (136, 37, '80元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 7750, 8000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (137, 38, '100元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 9750, 10000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (138, 39, '120元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 11750, 12000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (139, 40, '150元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 14750, 15000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (140, 41, '50元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 4750, 5000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (141, 42, '80元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 7750, 8000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (142, 43, '100元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 9750, 10000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (143, 44, '120元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 11750, 12000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (144, 45, '150元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 14750, 15000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (145, 46, '50元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 4750, 5000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (146, 47, '80元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 7750, 8000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (147, 48, '100元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 9750, 10000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (148, 49, '120元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 11750, 12000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (149, 50, '150元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 14750, 15000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (150, 51, '50元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 4750, 5000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (151, 52, '80元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 7750, 8000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (152, 53, '100元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 9750, 10000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (153, 54, '120元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 11750, 12000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (154, 55, '150元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 14750, 15000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (155, 56, '50元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 4750, 5000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (156, 57, '80元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 7750, 8000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (157, 58, '100元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 9750, 10000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (158, 59, '120元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 11750, 12000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (159, 60, '150元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 14750, 15000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (160, 61, '50元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 4750, 5000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (161, 62, '80元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 7750, 8000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (162, 63, '100元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 9750, 10000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (163, 64, '120元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 11750, 12000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (164, 65, '150元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 14750, 15000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (165, 66, '50元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 4750, 5000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (166, 67, '80元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 7750, 8000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (167, 68, '100元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 9750, 10000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (168, 69, '120元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 11750, 12000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (169, 70, '150元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 14750, 15000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (170, 71, '50元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 4750, 5000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (171, 72, '80元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 7750, 8000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (172, 73, '100元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 9750, 10000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (173, 74, '120元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 11750, 12000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (174, 75, '150元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 14750, 15000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (175, 76, '50元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 4750, 5000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (176, 77, '80元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 7750, 8000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (177, 78, '100元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 9750, 10000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (178, 79, '120元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 11750, 12000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (179, 80, '150元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 14750, 15000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (180, 81, '50元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 4750, 5000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (181, 82, '80元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 7750, 8000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (182, 83, '100元代金券', '周一至周日均可使用', '全场通用，无需预约，可叠加，不兑现不找零', 9750, 10000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (183, 84, '120元代金券', '节假日通用', '全场通用，无需预约，可叠加，不兑现不找零', 11750, 12000, 0, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (184, 1, '100元代金券（秒杀·杭州）', '每日 10:00 开抢，先到先得', '秒杀专享，每个用户限购 1 张', 8000, 10000, 1, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_seckill_voucher VALUES (184, 100, '2024-01-01 09:00:00', '2024-01-01 00:00:00', '2030-12-31 23:59:59', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (185, 15, '100元代金券（秒杀·北京）', '每日 10:00 开抢，先到先得', '秒杀专享，每个用户限购 1 张', 8000, 10000, 1, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_seckill_voucher VALUES (185, 100, '2024-01-01 09:00:00', '2024-01-01 00:00:00', '2030-12-31 23:59:59', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (186, 25, '100元代金券（秒杀·上海）', '每日 10:00 开抢，先到先得', '秒杀专享，每个用户限购 1 张', 8000, 10000, 1, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_seckill_voucher VALUES (186, 100, '2024-01-01 09:00:00', '2024-01-01 00:00:00', '2030-12-31 23:59:59', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (187, 35, '100元代金券（秒杀·广州）', '每日 10:00 开抢，先到先得', '秒杀专享，每个用户限购 1 张', 8000, 10000, 1, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_seckill_voucher VALUES (187, 100, '2024-01-01 09:00:00', '2024-01-01 00:00:00', '2030-12-31 23:59:59', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (188, 45, '100元代金券（秒杀·深圳）', '每日 10:00 开抢，先到先得', '秒杀专享，每个用户限购 1 张', 8000, 10000, 1, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_seckill_voucher VALUES (188, 100, '2024-01-01 09:00:00', '2024-01-01 00:00:00', '2030-12-31 23:59:59', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (189, 55, '100元代金券（秒杀·成都）', '每日 10:00 开抢，先到先得', '秒杀专享，每个用户限购 1 张', 8000, 10000, 1, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_seckill_voucher VALUES (189, 100, '2024-01-01 09:00:00', '2024-01-01 00:00:00', '2030-12-31 23:59:59', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (190, 65, '100元代金券（秒杀·重庆）', '每日 10:00 开抢，先到先得', '秒杀专享，每个用户限购 1 张', 8000, 10000, 1, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_seckill_voucher VALUES (190, 100, '2024-01-01 09:00:00', '2024-01-01 00:00:00', '2030-12-31 23:59:59', '2024-01-01 09:00:00');
INSERT INTO tb_voucher VALUES (191, 75, '100元代金券（秒杀·西安）', '每日 10:00 开抢，先到先得', '秒杀专享，每个用户限购 1 张', 8000, 10000, 1, 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');
INSERT INTO tb_seckill_voucher VALUES (191, 100, '2024-01-01 09:00:00', '2024-01-01 00:00:00', '2030-12-31 23:59:59', '2024-01-01 09:00:00');
