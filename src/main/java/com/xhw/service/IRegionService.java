package com.xhw.service;

import com.xhw.dto.Result;

/**
 * 省市区行政区划服务。
 * <p>
 * 数据来自 {@code classpath:regions.json}（由 {@code _qa/_build_regions.py} 从
 * 高德开放平台的行政区划整理而来），启动时一次性读进内存。
 *
 * @author 洪佳弘
 */
public interface IRegionService {

    /**
     * 全国省-市-区三级树，并带上每个市当前有多少家门店。
     * <p>
     * 带上门店数是为了让前端能把"还没开城"的城市**明确标出来**，
     * 而不是让用户选完之后撞上一个空列表、再自己猜是哪一步出了问题。
     *
     * @return {@link Result} data 为 [{name, x, y, cities:[{name, x, y, count, districts:[...]}]}]
     */
    Result queryRegions();

    /**
     * 这个市名在区划树里存在吗。
     * <p>
     * 个人资料里的「城市」只有一个字段（不像店铺那样有省市区三列），
     * 所以只按市名查。用途是**拦住不合法的城市**：不校验的话，
     * 用户能把 city 写成任意字符串，页面上就会显示一个不存在的城市，
     * 而且按城市筛选时永远查不到东西（第 63 条里说过，这种静默空结果最难查）。
     *
     * @param city 市名，空值返回 true（表示"不填，允许"）
     * @return 存在返回 true
     */
    boolean hasCity(String city);
}
