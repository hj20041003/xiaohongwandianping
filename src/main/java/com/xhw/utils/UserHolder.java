package com.xhw.utils;

import com.xhw.dto.UserDTO;

/**
 * 把当前登录用户和它的 token 绑到本次请求的线程上。
 * <p>
 * 为什么要额外存 token：登录态是**缓存在 Redis 的 hash 里**的
 * （`login:token:{token}` 存着 id / nickName / icon），而这个 hash
 * 只在登录时写一次、之后每个请求都从它读。所以用户改了昵称/头像之后，
 * 如果不把那个 hash 一起刷掉，**刷新页面看到的还是旧昵称** ——
 * 得重新登录才"生效"，这是最容易被当成"改了没保存"的一类 bug。
 * 要刷 hash 就得知道 token，而 token 只出现在请求头里、服务层拿不到，
 * 所以由拦截器把它放到这里。
 *
 * @author 洪佳弘
 */
public class UserHolder {

    private static final ThreadLocal<UserDTO> tl = new ThreadLocal<>();

    /** 本次请求用的 token（拦截器从 authorization 头里取）。未登录时为 null */
    private static final ThreadLocal<String> TOKEN = new ThreadLocal<>();

    public static void saveUser(UserDTO user) {
        tl.set(user);
    }

    public static UserDTO getUser() {
        return tl.get();
    }

    public static void removeUser() {
        tl.remove();
    }

    public static void saveToken(String token) {
        TOKEN.set(token);
    }

    public static String getToken() {
        return TOKEN.get();
    }

    public static void removeToken() {
        TOKEN.remove();
    }
}
