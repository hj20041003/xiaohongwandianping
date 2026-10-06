package com.xhw.dto;

import lombok.Data;

/**
 * 省 / 市 / 区三级筛选条件。
 * <p>
 * 抽成一个对象而不是往方法签名上继续加 String，是因为它要同时出现在
 * {@code /shop/of/type}、{@code /shop/of/name}、{@code /blog/hot} 三个接口上；
 * 三个都收 {province, city, district} 三个可选参数，签名会长到没法看，
 * 而且以后再加一层（比如"商圈"）就得再改三个地方。
 * <p>
 * 三个字段全部可以为空，语义是"不按这一级过滤"。
 *
 * @author 洪佳弘
 */
@Data
public class RegionQuery {

    /** 省，例如「浙江省」；空 = 不限 */
    private String province;

    /** 市，例如「杭州」；空 = 不限 */
    private String city;

    /** 区，例如「拱墅区」；空 = 不限 */
    private String district;

    /**
     * 三级都没指定 = 全国。
     * <p>
     * 调用方拿它决定"要不要按区域过滤"，比在每个地方重复写三个
     * {@code StrUtil.isNotBlank} 靠谱——那种写法总会漏掉一处。
     */
    public boolean isAll() {
        return isBlank(province) && isBlank(city) && isBlank(district);
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
