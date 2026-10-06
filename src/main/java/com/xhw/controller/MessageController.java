package com.xhw.controller;

import com.xhw.dto.Result;
import com.xhw.service.IMessageService;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;

/**
 * 消息中心。
 * <p>
 * 三个接口都要登录（没加进 {@code MvcConfig} 的放行名单），因为它们全是"我的"数据。
 * 唯一例外是 {@link #unread()}：它在没登录时返回 0 而不是失败，
 * 因为底部导航的小红点会**在每个页面**都问一次，未登录时弹一排错误提示很吵。
 *
 * @author 洪佳弘
 */
@RestController
@RequestMapping("/message")
public class MessageController {

    @Resource
    private IMessageService messageService;

    /**
     * 消息列表：赞了我 / 关注了我 / 评论了我，合并后按时间倒序
     *
     * @return {list, total, unread}
     */
    @GetMapping("/list")
    public Result list(@RequestParam(value = "current", defaultValue = "1") Integer current) {
        return messageService.list(current);
    }

    /**
     * 未读条数（底部导航的小红点）
     */
    @GetMapping("/unread")
    public Result unread() {
        return messageService.unread();
    }

    /**
     * 全部标为已读
     */
    @PostMapping("/read")
    public Result markRead() {
        return messageService.markRead();
    }
}
