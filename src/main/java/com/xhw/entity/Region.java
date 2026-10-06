package com.xhw.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.io.Serializable;
import java.util.List;

/**
 * 省 / 市 两级行政区划节点（只用来解析 regions.json，不入库）。
 * <p>
 * 整棵树在应用启动时一次性读进内存（68 KB / 34 省 / 414 市 / 3233 区），
 * 之后所有"选城市"的请求都走内存，不再查库也不再读文件。
 * <p>
 * 区一级只存**名字**不存坐标：区只是用来筛选的，不需要拿它做 GEO 查询，
 * 而名字之外的字段会让这个文件从 68 KB 涨到 1 MB。
 *
 * @author 洪佳弘
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class Region implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 省 / 直辖市 / 自治区 / 特别行政区，例如「浙江省」 */
    private String name;

    /** 中心点经度 */
    private Double x;

    /** 中心点纬度 */
    private Double y;

    /** 省级节点下面挂的是市，直辖市下面挂的是它自己（合并后的城区） */
    private List<Region> cities;

    /** 市级节点下面挂的是区/县的名字列表；省级节点这一项为空 */
    private List<String> districts;
}
