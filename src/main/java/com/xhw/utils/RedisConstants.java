package com.xhw.utils;

public class RedisConstants {
    public static final String LOGIN_CODE_KEY = "login:code:";
    public static final Long LOGIN_CODE_TTL = 2L;
    public static final String LOGIN_USER_KEY = "login:token:";
    public static final Long LOGIN_USER_TTL = 30L;

    public static final Long CACHE_NULL_TTL = 2L;

    public static final Long CACHE_SHOP_TTL = 30L;
    public static final String CACHE_SHOP_KEY = "cache:shop:";

    public static final String LOCK_SHOP_KEY = "lock:shop:";
    public static final Long LOCK_SHOP_TTL = 10L;

    public static final String CACHE_TYPE_KEY = "cache:type";

    public static final String SECKILL_STOCK_KEY = "seckill:stock:";
    public static final String BLOG_LIKED_KEY = "blog:liked:";
    public static final String FEED_KEY = "feed:";
    public static final String SHOP_GEO_KEY = "shop:geo:";
    public static final String USER_SIGN_KEY = "sign:";

    public static final String SENDCODE_SENDTIME_KEY ="sms:sendtime:";

    /**
     * 消息的「上次已读时间」。
     * <p>
     * 值是一个毫秒时间戳：比它新的互动就是未读。
     * 为什么已读状态要单独存、而不像消息本身那样派生：
     * 「赞/关注/评论」这三件事的**事实**在 tb_follow / tb_blog_comments /
     * Redis ZSet 里都有，能推出来；但"我看到哪儿了"这件事在数据里**不存在**，
     * 只能自己记。存一个时间戳比给每条消息记已读标记便宜得多，
     * 代价是"标记已读"只能是全部已读（对消息中心来说够用）。
     */
    public static final String MESSAGE_READ_KEY = "msg:read:";

    public static final String ONE_LEVERLIMIT_KEY ="limit:onelevel:";

    public static final String TWO_LEVERLIMIT_KEY ="limit:twolevel:";

}
