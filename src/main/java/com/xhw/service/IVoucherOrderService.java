package com.xhw.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.xhw.dto.Result;
import com.xhw.entity.VoucherOrder;
import org.jetbrains.annotations.NotNull;
import org.springframework.transaction.annotation.Transactional;

/**
 * ivoucher订单服务
 * <p>
 * 服务类
 * </p>
 *
 * @author 虎哥
 * @date 2022/10/09
 * @since 2021-12-22
 */
public interface IVoucherOrderService extends IService<VoucherOrder> {

    /**
     * 秒杀优惠券
     *
     * @param voucherId 券id
     * @return {@link Result}
     */
    Result seckillVoucher(Long voucherId);

    /**
     * 得到结果
     *
     * @param voucherId 券id
     * @return {@link Result}
     */
    Result getResult(Long voucherId);

    /**
     * 创建优惠券订单
     *
     * @param voucherOrder 券订单
     */
    @NotNull
    @Transactional(rollbackFor = Exception.class)
    void createVoucherOrder(VoucherOrder voucherOrder);

    /**
     * 我的订单（分页，按下单时间倒序）。
     * <p>
     * 券名、店名在服务端一次 join 好再返回 —— 让前端拿着 voucherId 去逐个查就是 N+1。
     *
     * @param current 页码，从 1 开始
     * @return {@link Result} data 为 ScrollResult
     */
    Result queryMyOrder(Integer current);

    /**
     * 模拟支付：把订单从"未支付"推到"已支付"。
     * <p>
     * <b>这是假的</b>：项目里没有接任何支付网关，秒杀练习历来都是这么模拟的。
     * 真实项目里这一步应该由支付回调触发，而且要**验签**。
     * <p>
     * 越权校验写在 update 的 where 条件里（id + user_id + status），
     * 所以别人的订单、已经付过的订单，都会被这一条 SQL 一起挡住。
     *
     * @param orderId 订单 id
     * @return {@link Result}
     */
    Result payMyOrder(Long orderId);
}
