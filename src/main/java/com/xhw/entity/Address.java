package com.xhw.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 收货地址（地址簿）。
 * <p>
 * 原版项目没有这个概念。加它的动机很实在：这项目里到处是"店铺地址"，
 * 但那是**公开的门店资料**；用户自己的收件地址是**私有数据**，
 * 必须按 user_id 隔离，一个用户不能看到、更不能改别人的地址。
 * <p>
 * 所以这个模块除了增删改查，最重要的一条是**每一次读写都带 user_id 条件**，
 * 而不是查出来之后再判断归属——后者一旦漏判就是水平越权。
 *
 * @author 洪佳弘
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("tb_address")
public class Address implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 主键
     */
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * 归属用户。**从登录态里取，永远不信任前端传上来的这个字段**
     */
    private Long userId;

    /**
     * 收货人姓名
     */
    private String name;

    /**
     * 收货人手机号
     */
    private String phone;

    /**
     * 城市，取值同 tb_shop.city（杭州/北京/…）
     */
    private String city;

    /**
     * 省 / 直辖市，例如「浙江省」
     */
    private String province;

    /**
     * 区县，例如「拱墅区」
     */
    private String district;

    /**
     * 详细地址（区/街道/门牌）
     */
    private String detail;

    /**
     * 标签：0 家 / 1 公司 / 2 学校 / 3 其他
     */
    private Integer tag;

    /**
     * 是否默认地址：1 是，0 否
     * <p>
     * 显式写出列名，是因为 MyBatis-Plus 对 {@code isXxx} 这种命名的字段名推断
     * 有过"把 is 前缀吃掉"的历史行为，写死最稳。
     */
    @TableField("is_default")
    private Integer isDefault;

    /**
     * 创建时间
     */
    private LocalDateTime createTime;

    /**
     * 更新时间
     */
    private LocalDateTime updateTime;
}
