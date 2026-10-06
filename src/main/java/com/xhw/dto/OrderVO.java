package com.xhw.dto;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 一条订单（给前端看的形状）。
 * <p>
 * 订单表里只有 {@code voucherId}，页面上要显示"券叫什么、哪家店的、多少钱"，
 * 所以这些都要在服务端一次join 好，不能让前端拿着 id 再逐个查。
 *
 * @author 洪佳弘
 */
@Data
public class OrderVO implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 订单 id 是 {@code RedisIdWorker} 生成的 64 位雪花号（19 位），
     * <b>必须序列化成字符串</b>。
     * <p>
     * JSON 里的数字在 JS 里是双精度浮点，安全整数上限是 2^53 ≈ 9.007e15；
     * 而订单 id 是 6.4e17 量级，{@code JSON.parse} 会把它四舍五入 ——
     * 实测 645599808689537028 会被解析成 645599808689537000（差 28 万），
     * 于是前端拿这个 id 去调接口就是"订单不存在"。
     * 同理，用户自己发出来的笔记 id 也是雪花号 someday 会有同样的问题。
     */
    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long voucherId;

    /** 券名 / 副标题 */
    private String voucherTitle;
    private String voucherSubTitle;

    private Long shopId;
    private String shopName;

    /**
     * 实付金额，单位**分**（跟库里一致，避免前端到处除 100）。
     * 页面上要显示成 47.5 元，前端除一下就行。
     */
    private Long payValue;

    /** 券面值，单位分 */
    private Long actualValue;

    /** 1 未支付 / 2 已支付 / 3 已核销 / 4 已退款 */
    private Integer status;

    /** 上面那个状态的中文，页面直接显示，省得前端再写一遍映射表 */
    private String statusText;

    /** 1 余额 / 2 微信 / 3 支付宝 / 4 花呗 */
    private Integer payType;
    private String payTypeText;

    private LocalDateTime createTime;

    /** 没支付时是 null，页面据此显示"待支付"而不显示一个 1970 年的日期 */
    private LocalDateTime payTime;

    /** 便捷字段：status == 1 时前端要给"去支付"按钮 */
    public boolean isPayable() {
        return status != null && status == 1;
    }

    /** 金额转成元，保留一位小数（47.5 而不是 47.50） */
    public BigDecimal payYuan() {
        return payValue == null ? null : BigDecimal.valueOf(payValue, 2);
    }
}
