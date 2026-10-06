package com.xhw.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.xhw.dto.Result;
import com.xhw.entity.Address;

/**
 * <p>
 * 收货地址服务类
 * </p>
 *
 * @author 洪佳弘
 */
public interface IAddressService extends IService<Address> {

    /**
     * 查询当前登录用户的全部地址，默认地址排最前
     *
     * @return {@link Result} data 为 Address 列表
     */
    Result queryMine();

    /**
     * 查询当前用户的一条地址
     *
     * @param id 地址 id
     * @return {@link Result}
     */
    Result queryOne(Long id);

    /**
     * 新增地址。用户的第一条地址会自动成为默认地址。
     *
     * @param address 地址（userId 由登录态覆盖，前端传什么都不作数）
     * @return {@link Result} data 为新地址 id
     */
    Result saveAddress(Address address);

    /**
     * 修改地址
     *
     * @param address 地址
     * @return {@link Result}
     */
    Result updateAddress(Address address);

    /**
     * 删除地址。删掉的若是默认地址，会自动从剩下的里补一个上来。
     *
     * @param id 地址 id
     * @return {@link Result}
     */
    Result removeAddress(Long id);

    /**
     * 把指定地址设为默认
     *
     * @param id 地址 id
     * @return {@link Result}
     */
    Result setDefault(Long id);
}
