package com.xhw.utils;

import javax.mail.*;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Properties;

/**
 * 邮件工具类。
 * <p>
 * 注意：原版本这里硬编码了一个 QQ 邮箱账号和 SMTP 授权码，属于严重的凭据泄露，
 * 已移除。现在改为完全由环境变量注入，缺少配置时静默跳过发送。
 * <p>
 * 如果你要用邮件验证码登录，设置以下环境变量即可：
 * <pre>
 * XHW_MAIL_HOST=smtp.qq.com
 * XHW_MAIL_PORT=587
 * XHW_MAIL_USER=你的QQ号@qq.com
 * XHW_MAIL_PASS=你的SMTP授权码
 * </pre>
 */
public class MailUtils {

    private static final String MAIL_HOST = System.getenv("XHW_MAIL_HOST");
    private static final String MAIL_PORT = System.getenv("XHW_MAIL_PORT");
    private static final String MAIL_USER = System.getenv("XHW_MAIL_USER");
    private static final String MAIL_PASS = System.getenv("XHW_MAIL_PASS");

    /**
     * 发送邮件验证码。未配置 SMTP 时直接返回，不抛异常。
     *
     * @param email 收件邮箱
     * @param code  验证码
     */
    public static void sendtoMail(String email, String code) {
        if (!mailConfigured()) {
            System.out.println("[MailUtils] 未配置 SMTP 环境变量，跳过邮件发送。验证码请从后端控制台日志中获取。");
            return;
        }
        try {
            // 创建Properties 类用于记录邮箱的一些属性
            Properties props = new Properties();
            // 表示SMTP发送邮件，必须进行身份验证
            props.put("mail.smtp.auth", "true");
            // 此处填写SMTP服务器
            props.put("mail.smtp.host", MAIL_HOST);
            // 端口号，QQ邮箱端口587
            props.put("mail.smtp.port", MAIL_PORT == null ? "587" : MAIL_PORT);
            // 此处填写，写信人的账号
            props.put("mail.user", MAIL_USER);
            // 此处填写16位STPM口令
            props.put("mail.password", MAIL_PASS);
            // 构建授权信息，用于进行SMTP进行身份验证
            Authenticator authenticator = new Authenticator() {
                protected PasswordAuthentication getPasswordAuthentication() {
                    return new PasswordAuthentication(props.getProperty("mail.user"), props.getProperty("mail.password"));
                }
            };
            // 使用环境属性和授权信息，创建邮件会话
            Session mailSession = Session.getInstance(props, authenticator);
            // 创建邮件消息
            MimeMessage message = new MimeMessage(mailSession);
            // 设置发件人
            InternetAddress form = new InternetAddress(props.getProperty("mail.user"));
            message.setFrom(form);
            // 设置收件人的邮箱
            InternetAddress to = new InternetAddress(email);
            message.setRecipient(MimeMessage.RecipientType.TO, to);
            // 设置邮件标题
            message.setSubject("验证码");
            // 设置邮件的内容体
            message.setContent("尊敬的用户:你好!\n注册验证码为:" + code + "(有效期为一分钟,请勿告知他人)", "text/html;charset=UTF-8");
            Transport.send(message);
        } catch (MessagingException e) {
            // 邮件发送失败不应该影响主流程，验证码已在 Redis 中
            System.out.println("[MailUtils] 邮件发送失败: " + e.getMessage());
        }
    }

    private static boolean mailConfigured() {
        return MAIL_HOST != null && MAIL_USER != null && MAIL_PASS != null;
    }

    // 用来产生一个验证码的逻辑代码
    public static String achieveCode() {  //由于数字 1 、 0 和字母 O 、l 有时分不清楚，所以，没有数字 1 、 0
        String[] beforeShuffle = new String[]{"2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F",
                "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "a",
                "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v",
                "w", "x", "y", "z"};
        List<String> list = Arrays.asList(beforeShuffle);//将String转换为List
        Collections.shuffle(list);  //因为要打乱顺序，所以才把String转为list，因为集合里面才有shuffle
        StringBuilder sb = new StringBuilder();
        for (String s : beforeShuffle) {
            sb.append(s); //将集合转化为字符串
        }
        return sb.substring(3, 8);
    }
}
