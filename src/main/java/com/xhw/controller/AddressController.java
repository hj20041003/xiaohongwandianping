package com.xhw.controller;

import com.xhw.dto.Result;
import com.xhw.entity.Address;
import com.xhw.service.IAddressService;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;

/**
 * 收货地址簿。
 * <p>
 * 六个接口全部**要求登录**（没有加进 {@code MvcConfig} 的放行名单），
 * 而且每一个都只操作"当前登录用户自己的"地址——
 * user_id 从登录态里取，前端传什么都不作数。
 * <p>
 * ⚠️ 这个控制器里没有任何一个方法接受 {@code userId} 参数，是故意的。
 * 只要出现过一次 {@code @RequestBody} 里带着 userId 直接落库，
 * 就等于开了一个"把地址写到别人名下"的口子。
 *
 * @author 洪佳弘
 */
@RestController
@RequestMapping("/address")
public class AddressController {

    @Resource
    private IAddressService addressService;

    /**
     * 我的地址列表（默认地址排最前）
     */
    @GetMapping("/list")
    public Result list() {
        return addressService.queryMine();
    }

    /**
     * 单条地址详情（编辑页用）
     * <p>
     * 注意这个映射和 {@code /list} 长得很像，但 Spring 会优先匹配字面量路径，
     * 所以 {@code /address/list} 不会被 {@code /address/{id}} 抢走。
     * 同理，如果把 id 定义成 Long，"list" 转数字会直接 400 —— 这种坑在
     * /shop/cities 那儿已经踩过一次了。
     */
    @GetMapping("/{id}")
    public Result detail(@PathVariable("id") Long id) {
        return addressService.queryOne(id);
    }

    /**
     * 新增地址
     *
     * @return 新地址的 id
     */
    @PostMapping
    public Result save(@RequestBody Address address) {
        return addressService.saveAddress(address);
    }

    /**
     * 修改地址
     */
    @PutMapping
    public Result update(@RequestBody Address address) {
        return addressService.updateAddress(address);
    }

    /**
     * 删除地址
     */
    @DeleteMapping("/{id}")
    public Result remove(@PathVariable("id") Long id) {
        return addressService.removeAddress(id);
    }

    /**
     * 设为默认地址
     */
    @PutMapping("/{id}/default")
    public Result setDefault(@PathVariable("id") Long id) {
        return addressService.setDefault(id);
    }
}
