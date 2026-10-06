-- ============================================================================
--  xhw 数据库速查清单
--  在 MySQL Workbench 里：File ▸ Open SQL Script 打开本文件，然后点左上的
--  「闪电」执行。选中某一段再点「闪电」就只跑那一段。
--
--  连接参数：127.0.0.1:3306 / xhw / xhw123456 / Default Schema = xhw
--
--  如果中文显示成乱码，说明工作台把脚本按别的编码读了：
--  Workbench 右上角「Preferences ▸ Editors ▸ File Encodings」把默认改成 UTF-8。
-- ============================================================================


-- ────────────────────────────────────────────────────────────── 1. 有哪些表
SELECT TABLE_NAME, TABLE_ROWS, ENGINE, TABLE_COMMENT
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'xhw'
ORDER BY TABLE_NAME;
-- 12 张表，全部 InnoDB


-- ────────────────────────────────────────────────────────────── 2. 各表行数
SELECT 'tb_shop' AS 表, COUNT(*) AS 行数 FROM tb_shop
UNION ALL SELECT 'tb_blog',     COUNT(*) FROM tb_blog
UNION ALL SELECT 'tb_address',  COUNT(*) FROM tb_address
UNION ALL SELECT 'tb_user',     COUNT(*) FROM tb_user
UNION ALL SELECT 'tb_user_info',COUNT(*) FROM tb_user_info
UNION ALL SELECT 'tb_voucher',  COUNT(*) FROM tb_voucher
UNION ALL SELECT 'tb_shop_type',COUNT(*) FROM tb_shop_type
UNION ALL SELECT 'tb_seckill_voucher', COUNT(*) FROM tb_seckill_voucher;
-- 期望：84 / 20 / 5 / (5+你登录建的) / 0 / 2 / 10 / 1


-- ──────────────────────────────────────────── 3. 门店的省 / 市 / 区分布
SELECT province, city, district, COUNT(*) AS 门店数
FROM tb_shop
GROUP BY province, city, district
ORDER BY province, city, 门店数 DESC;
-- 这一张表是整个「全国化」改造的核心：每一行都是一家店落在哪个省市区。
-- 只有 8 个城市有数据（杭州 14，其余各 10），
-- 但省市区三级区划本身是全国的 34 省 / 390 市 / 3259 区（在 regions.json 里，不在库里）。


-- ───────────────────────────────────── 4. 各城市门店数（对照首页城市选择器）
SELECT city, COUNT(*) AS 门店数
FROM tb_shop GROUP BY city ORDER BY 门店数 DESC, city;


-- ─────────────────────────────────────── 5. 某家店的完整信息（换个 id 试）
SELECT id, name, type_id, province, city, district, area, address,
       x, y, avg_price, sold, comments, score, open_hours
FROM tb_shop
WHERE id IN (1, 16, 55, 84);
-- 1=103茶餐厅(杭州拱墅) / 16=胡大饭馆(北京东城) / 55=小龙坎(成都锦江) / 84=1912酒吧(西安雁塔)


-- ───────────────────────────────────────────── 6. 笔记 + 它挂在哪家店、哪座城
SELECT b.id, LEFT(b.title, 24) AS 标题, b.liked AS 赞, b.comments AS 评,
       s.name AS 店铺, s.province, s.city, s.district
FROM tb_blog b
LEFT JOIN tb_shop s ON s.id = b.shop_id
ORDER BY b.liked DESC;
-- 注意：tb_blog 上**没有** province/city/district —— 区域是店铺的属性，
-- 靠 shop_id 关联出来。这样只有一份真相，不会出现"店改了城市、笔记没跟着改"。


-- ───────────────────────────────────────────────── 7. 收货地址（默认地址排最前）
SELECT a.id, u.nick_name AS 用户, a.name AS 收货人, a.phone,
       a.province, a.city, a.district, a.detail, a.tag AS 标签, a.is_default AS 默认
FROM tb_address a
JOIN tb_user u ON u.id = a.user_id
ORDER BY a.user_id, a.is_default DESC, a.update_time DESC;


-- ─────────────────────────────────────────── 8. 秒杀券 + 库存（VoucherOrderService 用）
SELECT v.id, v.shop_id, v.title, v.sub_title,
       v.pay_value / 100.0 AS 支付元, v.actual_value / 100.0 AS 抵面元,
       s.stock, s.begin_time, s.end_time
FROM tb_voucher v
LEFT JOIN tb_seckill_voucher s ON s.voucher_id = v.id;


-- ──────────────────────────────────────────────── 9. 用户（登录后会自动多几个）
SELECT id, phone, nick_name, LEFT(icon, 28) AS 头像, create_time
FROM tb_user ORDER BY id;


-- ────────────────────────────────────────── 10. 索引：省市区那一列建对了吗
SHOW INDEX FROM tb_shop;
-- 关键是这个：idx_shop_region (province, city, district)
-- 少一个索引，三级筛选就是全表扫；有了它才是走索引。


-- ────────────────────────────── 11. 字符集对不对（笔记标题里有 emoji）
SHOW VARIABLES LIKE 'character_set%';
SHOW VARIABLES LIKE 'collation%';
-- character_set_server 必须是 utf8mb4，否则下面的标题会显示成 ???

SELECT id, title
FROM tb_blog
WHERE id IN (4, 5, 6);
-- 应该能看到 🍷🥩💰🐎 这些字符原样显示


-- ─────────────────────────── 12. 想清空重来：重跑项目根目录的 init-mysql.bat
-- 它是 DROP + CREATE，可以放心重复执行。
-- 或者手动：
--   SET FOREIGN_KEY_CHECKS = 0;
--   TRUNCATE tb_address;  TRUNCATE tb_voucher_order;
--   TRUNCATE tb_blog;     TRUNCATE tb_follow;
--   SET FOREIGN_KEY_CHECKS = 1;
-- ⚠️ 别 TRUNCATE tb_shop / tb_user / tb_voucher —— 那是种子数据，truncate 掉
--    就得重跑 init-mysql.bat 才能拿回来。
