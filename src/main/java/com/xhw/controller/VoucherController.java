package com.xhw.controller;


import com.xhw.dto.Result;
import com.xhw.entity.Voucher;
import com.xhw.service.IVoucherService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;

/**
 * <p>
 * 前端控制器
 * </p>
 *
 * @author 虎哥
 * @since 2021-12-22
 */
@RestController
@RequestMapping("/voucher")
public class VoucherController {

    /** 写接口关闭时统一返回的话术，理由见 ShopController 里同名的常量 */
    private static final String WRITE_CLOSED = "发券功能暂未开放（管理端还没做）";

    /**
     * 发券写接口总开关。默认 false，原因见 application.yaml 里
     * xhw.voucher-write-enabled 的注释：任何登录用户都能凭空发券，
     * 而"谁有权发"这个信息在库里根本不存在。
     */
    @Value("${xhw.voucher-write-enabled:false}")
    private boolean voucherWriteEnabled;

    @Resource
    private IVoucherService voucherService;

    /**
     * 新增普通券
     *
     * @param voucher 优惠券信息
     * @return 优惠券id
     */
    @PostMapping
    public Result addVoucher(@RequestBody Voucher voucher) {
        if (!voucherWriteEnabled) {
            return Result.fail(WRITE_CLOSED);
        }
        voucherService.save(voucher);
        return Result.ok(voucher.getId());
    }

     /*生成秒杀券，当前时间需要在开始时间和结束时间之中，否则前端不会展示
    {
        "shopId": 1,
            "title": "100元代金券",
            "subTitle": "周一至周日均可使用",
            "rules": "全场通用\\n无需预约\\n可无限叠加\\不兑现、不找零\\n仅限堂食",
            "payValue": 8000,
            "actualValue": 10000,
            "type": 1,
            "stock":100,
            "beginTime":"2022-10-09T00:00:00",
            "endTime":"2022-10-10T20:00:00"
    }*/

    /**
     * 新增秒杀券
     *
     * @param voucher 优惠券信息，包含秒杀信息
     * @return 优惠券id
     */
    @PostMapping("seckill")
    public Result addSeckillVoucher(@RequestBody Voucher voucher) {
        if (!voucherWriteEnabled) {
            return Result.fail(WRITE_CLOSED);
        }
        voucherService.addSeckillVoucher(voucher);
        return Result.ok(voucher.getId());
    }

    /**
     * 查询店铺的优惠券列表
     *
     * @param shopId 店铺id
     * @return 优惠券列表
     */
    @GetMapping("/list/{shopId}")
    public Result queryVoucherOfShop(@PathVariable("shopId") Long shopId) {
        return voucherService.queryVoucherOfShop(shopId);
    }
}
