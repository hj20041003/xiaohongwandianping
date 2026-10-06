package com.xhw.controller;


import com.xhw.dto.Result;
import com.xhw.service.IVoucherOrderService;
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
@RequestMapping("/voucher-order")
public class VoucherOrderController {
    @Resource
    private IVoucherOrderService voucherOrderService;

    @PostMapping("seckill/{id}")
    public Result seckillVoucher(@PathVariable("id") Long voucherId) {
        return voucherOrderService.seckillVoucher(voucherId);
    }

    /**
     * 我的订单（分页）
     * <p>
     * 券名、店名已经在服务端 join 好，前端拿到就能直接显示。
     */
    @GetMapping("/my")
    public Result queryMyOrder(@RequestParam(value = "current", defaultValue = "1") Integer current) {
        return voucherOrderService.queryMyOrder(current);
    }

    /**
     * 模拟支付：把「待支付」推到「已支付」
     * <p>
     * 没有接真实支付网关，秒杀练习历来都是这么模拟的。
     * 别人的订单 / 已支付的订单都会被服务层的 where 条件挡掉。
     */
    @PostMapping("/{id}/pay")
    public Result payMyOrder(@PathVariable("id") Long orderId) {
        return voucherOrderService.payMyOrder(orderId);
    }
}
