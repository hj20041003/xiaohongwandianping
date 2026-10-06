# -*- coding: utf-8 -*-
"""
把上游的 MySQL 建表+数据脚本转成 H2 (MODE=MySQL) 兼容版本。

用法:
    python convert_sql.py <输入.sql> <输出.sql>
"""
import re
import sys


def convert(sql: str) -> str:
    # ---- 1. 去掉 Navicat 文件头注释块 ----
    sql = re.sub(r"^/\*.*?\*/", "", sql, flags=re.S)

    # ---- 2. 去掉 SET 语句（H2 不认 utf8mb4 / FOREIGN_KEY_CHECKS）----
    sql = re.sub(r"^\s*SET\s+.*?;\s*$", "", sql, flags=re.M | re.I)

    # ---- 3. 建表语句的收尾：) ENGINE = ... ROW_FORMAT = Compact;  ->  ); ----
    # 覆盖 ENGINE / AUTO_INCREMENT / CHARACTER SET / COLLATE / ROW_FORMAT / COMMENT
    sql = re.sub(r"\)\s*ENGINE\s*=.*?;", ");", sql, flags=re.S | re.I)

    # ---- 4. 列定义层面的 MySQL 专有语法 ----
    # 4.1 反引号包裹的列名/索引名，H2 兼容模式下可保留反引号，这里统一去掉更保险
    sql = sql.replace("`", "")

    # 4.2 字符集与排序规则
    sql = re.sub(r"\s+CHARACTER\s+SET\s+\w+(\s+COLLATE\s+\w+)?", "", sql, flags=re.I)

    # 4.3 整列注释 COMMENT 'xxx'  —— 文本里可能含转义引号，需非贪婪匹配到该行行尾
    sql = re.sub(r"\s+COMMENT\s+'(?:[^'\\]|\\.|'')*'", "", sql, flags=re.I)

    # 4.4 数据类型修饰符
    sql = re.sub(r"\b(bigint|int|tinyint|smallint)\s*\(\s*\d+\s*\)", r"\1", sql, flags=re.I)  # int(11) -> int
    sql = re.sub(r"\bUNSIGNED\b", "", sql, flags=re.I)   # UNSIGNED 不被 H2 支持
    sql = re.sub(r"\bZEROFILL\b", "", sql, flags=re.I)   # ZEROFILL 不被 H2 支持
    sql = re.sub(r"\bdouble\s+precision\b", "DOUBLE", sql, flags=re.I)

    # 4.5 AUTO_INCREMENT：H2 兼容模式支持 AUTO_INCREMENT 关键字，保留即可
    #     但 MySQL 写法 "bigint NOT NULL AUTO_INCREMENT" 在 H2 下合法，无需改

    # 4.6 ON UPDATE CURRENT_TIMESTAMP —— H2 不支持
    sql = re.sub(r"\s+ON\s+UPDATE\s+CURRENT_TIMESTAMP", "", sql, flags=re.I)

    # 4.7 索引定义末尾的 USING BTREE
    sql = re.sub(r"\s+USING\s+BTREE", "", sql, flags=re.I)

    # 4.8 timestamp 类型：H2 支持 TIMESTAMP，保留
    # 4.9 MySQL 的 `datetime` 保持不变

    # ---- 5. 保留字列名 ----
    # H2 把 YEAR / MONTH / DATE 等当作保留字（内置函数名），直接作为列名会报
    # "Syntax error ... expected identifier"。
    # tb_sign 表用了 year / month / date 三个列名，而该项目签到功能走 Redis Bitmap，
    # Java 侧没有任何实体类引用 tb_sign，因此这里安全地加 sign_ 前缀重命名。
    sql = re.sub(r"(?m)^(\s*)year(\s+)year(\s)", r"\1sign_year\2int\3", sql, flags=re.I)
    sql = re.sub(r"(?m)^(\s*)month(\s+)tinyint(\s)", r"\1sign_month\2tinyint\3", sql, flags=re.I)
    sql = re.sub(r"(?m)^(\s*)date(\s+)date(\s)", r"\1sign_date\2date\3", sql, flags=re.I)

    # ---- 6. INSERT 语句 ----
    # H2 兼容模式能接受普通 INSERT INTO ... VALUES (...), (...);
    # 需要处理的是 MySQL 特有的转义序列
    #   \"  -> H2 同样支持 \' 与 '' 两种；MySQL 脚本里的 \" 在字符串内需转义为 \\"
    # 6.1 反斜杠转义的引号 \"  -> 双写反斜杠
    sql = sql.replace('\\"', '\\\\"')

    # ---- 7. 清理多余空行 ----
    sql = re.sub(r"\n{3,}", "\n\n", sql)

    # ---- 8. 补种子数据 ----
    # 原脚本里 tb_seckill_voucher 一张记录都没有（tb_voucher 也只有普通券），
    # 导致 /voucher-order/seckill/{id} 没有可用的券，秒杀功能无法演示。
    # 这里补一张 type=1 的秒杀券 + 对应的库存记录（stock=100，时间覆盖当前）。
    if "INSERT INTO tb_seckill_voucher" not in sql:
        if "INSERT INTO tb_voucher VALUES (2," not in sql:
            sql = sql.replace(
                "INSERT INTO tb_voucher VALUES (1, 1,",
                "INSERT INTO tb_voucher VALUES (2, 1, '100元代金券（秒杀）', '周一至周五均可使用', "
                "'秒杀专享，每个用户限购 1 张', 8000, 10000, 1, 1, "
                "'2022-01-04 09:42:39', '2022-01-04 09:43:31');\n"
                "INSERT INTO tb_voucher VALUES (1, 1,",
                1,
            )
        sql = sql.replace(
            "-- Records of tb_seckill_voucher\n-- ----------------------------",
            "-- Records of tb_seckill_voucher\n-- ----------------------------\n"
            "INSERT INTO tb_seckill_voucher VALUES (2, 100, '2022-01-03 09:42:39', "
            "'2022-01-03 09:42:39', '2030-01-03 09:42:39', '2022-01-03 09:42:39');",
            1,
        )

    return sql.strip() + "\n"


def main():
    if len(sys.argv) != 3:
        print("用法: python convert_sql.py <输入.sql> <输出.sql>")
        sys.exit(1)

    src, dst = sys.argv[1], sys.argv[2]
    with open(src, "r", encoding="utf-8") as f:
        raw = f.read()

    out = convert(raw)
    with open(dst, "w", encoding="utf-8") as f:
        f.write(out)

    # 统计
    print(f"转换完成: {src} -> {dst}")
    print(f"  CREATE TABLE: {len(re.findall(r'CREATE TABLE', out, re.I))}")
    print(f"  INSERT INTO:  {len(re.findall(r'INSERT INTO', out, re.I))}")
    print(f"  残留 ENGINE:  {len(re.findall(r'ENGINE', out, re.I))}")
    print(f"  残留 UNSIGNED:{len(re.findall(r'UNSIGNED', out, re.I))}")
    print(f"  残留 COMMENT: {len(re.findall(r'COMMENT', out, re.I))}")


if __name__ == "__main__":
    main()
