package com.xhw.utils;

/**
 * @author 虎哥
 */
public abstract class RegexPatterns {
    /**
     * 手机号正则。
     *
     * <p><b>原版（虎哥）写的是 2019 年前后的号段白名单：</b>
     * {@code ^1([38][0-9]|4[579]|5[0-3,5-9]|6[6]|7[0135678]|9[89])\d{8}$}
     * 它会把一批**现在真实存在**的号段判成非法：19 开头只放行了 198 / 199，
     * 于是 190 / 191 / 192 / 193 / 195 / 196 / 197 全被拒；同理还有
     * 160 / 162 / 165 / 167、172 / 174。用户拿这些号登录会一直卡在
     * "手机号格式错误"，而且看不出哪里错了。</p>
     *
     * <p>换成通行的 11 位写法。**必须和前端 {@code login.html} 里的
     * {@code PHONE_RE} 保持一致** —— 两边规则不一样会造成最难受的一种情况：
     * 前端校验通过、请求发出去，后端才回一句"手机号格式错误"，
     * 用户完全不知道是哪儿不对（这个坑真实踩过）。</p>
     *
     * <p>注：这里只做"像不像手机号"的形状校验。某个号段到底有没有放号，
     * 以短信网关为准，本地用正则穷举没有意义。</p>
     */
    public static final String PHONE_REGEX = "^1[3-9]\\d{9}$";
    /**
     * 邮箱正则
     */
    public static final String EMAIL_REGEX = "^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\\.[a-zA-Z0-9_-]+)+$";
    /**
     * 密码正则。4~32位的字母、数字、下划线
     */
    public static final String PASSWORD_REGEX = "^\\w{4,32}$";
    /**
     * 验证码正则, 6位数字或字母
     */
    public static final String VERIFY_CODE_REGEX = "^[a-zA-Z\\d]{6}$";

}
